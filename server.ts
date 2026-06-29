import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON parser
  app.use(express.json());

  // API Route: Check configurations status
  app.get("/api/config-status", (req, res) => {
    res.json({
      hasApiKey: !!process.env.GOOGLE_API_KEY,
      hasFolderId: !!(process.env.GDRIVE_FOLDER_ID || "1LG4P4LjXMg3iBza2K3QDihzyehlT9Hxv"),
    });
  });

  // API Route: List books from specified Google Drive folder
  app.get("/api/books", async (req, res) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    const rawFolderId = process.env.GDRIVE_FOLDER_ID || "1LG4P4LjXMg3iBza2K3QDihzyehlT9Hxv";

    if (!apiKey || !rawFolderId) {
      return res.json({
        error: "MISSING_CONFIG",
        message: "Google API Key is not configured in environment variables.",
        files: []
      });
    }

    // Helper to extract clean folder ID from a potential full Google Drive folder URL
    const extractFolderId = (input: string): string => {
      if (!input) return "";
      const trimmed = input.trim();
      // Match folder ID from typical URL patterns (e.g., .../folders/123ab_cd...)
      const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      if (folderMatch && folderMatch[1]) {
        return folderMatch[1];
      }
      return trimmed;
    };

    const folderId = extractFolderId(rawFolderId);
    console.log(`Querying Google Drive with folderId: "${folderId}" (Raw input was: "${rawFolderId}")`);

    try {
      // 1. Fetch subfolders to support organization, limiting to 20 folders to prevent query overflow
      const getAllSubfolderIds = async (rootId: string, key: string): Promise<string[]> => {
        const folderIds = [rootId];
        try {
          const q = `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
          const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=30&key=${key}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (data.files && data.files.length > 0) {
              for (const f of data.files) {
                if (f.id && !folderIds.includes(f.id)) {
                  folderIds.push(f.id);
                }
              }
            }
          }
        } catch (err) {
          console.error("Non-blocking subfolder scan error:", err);
        }
        return folderIds;
      };

      let parentIds = [folderId];
      try {
        parentIds = await getAllSubfolderIds(folderId, apiKey);
        console.log(`Scanning folder hierarchy (found ${parentIds.length} folders including root).`);
      } catch (err) {
        console.warn("Unable to fetch subfolders, continuing with root only:", err);
      }

      // 2. Build parents clause: ( 'id1' in parents or 'id2' in parents ... )
      const parentsClause = parentIds.map(id => `'${id}' in parents`).join(" or ");

      // Query to fetch all files within the specified folders
      const q = `(${parentsClause}) and trashed = false`;
      const fields = "files(id, name, mimeType, size, createdTime)";
      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&pageSize=1000&key=${apiKey}`;

      let response = await fetch(url);
      
      // FALLBACK: If the recursive or complex query fails, automatically try querying the root folder directly
      if (!response.ok) {
        const errorText = await response.text();
        console.warn("Complex Google Drive query failed, retrying with root folder only. Original error:", errorText);
        
        const fallbackQ = `'${folderId}' in parents and trashed = false`;
        const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fallbackQ)}&fields=${encodeURIComponent(fields)}&pageSize=1000&key=${apiKey}`;
        response = await fetch(fallbackUrl);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Drive API Error:", errorText);
        
        let customMessage = `Failed to fetch from Google Drive: ${response.statusText}`;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error && errJson.error.message) {
            customMessage = `Google Drive API Error: ${errJson.error.message}`;
          }
        } catch (e) {}

        return res.status(response.status).json({
          error: "API_ERROR",
          message: customMessage
        });
      }

      const data = await response.json();
      const rawFiles = data.files || [];

      // Filter in JS to only include PDF, EPUB, and audio files
      const allowedExtensions = ['.pdf', '.epub', '.mp3', '.m4a', '.wav', '.ogg', '.aac'];
      const allowedMimeTypes = [
        'application/pdf', 
        'application/epub+zip'
      ];

      const filteredFiles = rawFiles.filter((file: any) => {
        const name = (file.name || "").toLowerCase();
        const mime = (file.mimeType || "").toLowerCase();
        
        const hasAllowedExtension = allowedExtensions.some(ext => name.endsWith(ext));
        const isAudioMime = mime.startsWith('audio/');
        const hasAllowedMimeType = allowedMimeTypes.some(type => mime === type);
        
        return hasAllowedExtension || isAudioMime || hasAllowedMimeType;
      });

      console.log(`Retrieved ${rawFiles.length} raw files. Filtered down to ${filteredFiles.length} books and audio files.`);

      res.json({
        success: true,
        files: filteredFiles
      });
    } catch (error: any) {
      console.error("Error in /api/books:", error);
      res.status(500).json({
        error: "SERVER_ERROR",
        message: error.message || "An internal error occurred."
      });
    }
  });

  // API Route: Proxy Download/Stream from Google Drive securely
  app.get("/api/books/download/:fileId", async (req, res) => {
    const { fileId } = req.params;
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(400).json({ error: "Google API Key is not configured." });
    }

    try {
      // Fetch file metadata to get name and mimeType
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size&key=${apiKey}`;
      const metaRes = await fetch(metaUrl);
      if (!metaRes.ok) {
        return res.status(metaRes.status).json({ error: "Failed to fetch file metadata from Google Drive" });
      }
      const metadata = await metaRes.json();

      // Set headers for file attachment/stream
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(metadata.name)}"`);
      res.setHeader("Content-Type", metadata.mimeType || "application/octet-stream");
      if (metadata.size) {
        res.setHeader("Content-Length", metadata.size);
      }

      // Fetch actual file stream from Google Drive
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
      const fileRes = await fetch(downloadUrl);
      if (!fileRes.ok) {
        return res.status(fileRes.status).json({ error: "Failed to download file from Google Drive" });
      }

      // Pipe / stream chunks
      if (fileRes.body) {
        const reader = fileRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      } else {
        res.status(500).json({ error: "No file content stream available" });
      }
    } catch (error: any) {
      console.error("Error proxying book stream:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Failed to download book." });
      }
    }
  });

  // Vite middleware for development or static server for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
