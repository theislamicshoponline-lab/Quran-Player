import express from "express";
import path from "path";
import https from "https";
import http from "http";
import { URL } from "url";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Express JSON parser
  app.use(express.json());

  // API Route: Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Server is healthy." });
  });

  // API Route: Audio streaming proxy to bypass quranicaudio.com CORS/Referer block
  app.get("/api/proxy-audio", (req, res) => {
    const audioUrl = req.query.url as string;
    if (!audioUrl) {
      res.status(400).send("Missing url parameter");
      return;
    }

    let isAuthorized = false;
    try {
      const u = new URL(audioUrl);
      isAuthorized = u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      isAuthorized = false;
    }

    if (!isAuthorized) {
      console.warn(`[Proxy] Blocked request for unauthorized domain: ${audioUrl}`);
      res.status(403).send("Forbidden domain");
      return;
    }

    console.log(`[Proxy] Request received for: ${audioUrl} | Range: ${req.headers.range || "none"}`);

    let activeProxyReq: any = null;
    let activeProxyRes: any = null;
    let isFinished = false;

    const cleanup = () => {
      if (isFinished) return;
      isFinished = true;
      if (activeProxyReq) {
        try {
          activeProxyReq.destroy();
        } catch (e) {}
      }
      if (activeProxyRes) {
        try {
          activeProxyRes.destroy();
        } catch (e) {}
      }
    };

    res.on("close", () => {
      cleanup();
    });

    res.on("finish", () => {
      cleanup();
    });

    const proxyRequest = (targetUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        console.error(`[Proxy] Too many redirects for: ${audioUrl}`);
        if (!res.headersSent) {
          res.status(500).send("Too many redirects");
        }
        cleanup();
        return;
      }

      try {
        const parsedUrl = new URL(targetUrl);
        const client = parsedUrl.protocol === "https:" ? https : http;

        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        };

        if (targetUrl.includes("quranicaudio.com")) {
          headers["Referer"] = "https://quranicaudio.com/";
        } else if (targetUrl.includes("archive.org")) {
          headers["Referer"] = "https://archive.org/";
        }

        if (req.headers.range) {
          headers["Range"] = req.headers.range;
        }

        const options: any = {
          headers,
        };
        if (parsedUrl.protocol === "https:") {
          options.rejectUnauthorized = false;
        }

        activeProxyReq = client.get(parsedUrl, options, (proxyRes) => {
          activeProxyRes = proxyRes;
          const statusCode = proxyRes.statusCode || 200;

          // If it's a redirect, follow it internally
          if (statusCode >= 300 && statusCode < 400 && proxyRes.headers.location) {
            let nextUrl = proxyRes.headers.location;
            if (!nextUrl.startsWith("http://") && !nextUrl.startsWith("https://")) {
              nextUrl = new URL(nextUrl, targetUrl).href;
            }
            console.log(`[Proxy] Redirecting to: ${nextUrl} (Depth: ${redirectCount})`);
            proxyRes.resume(); // Consume the redirect response stream to release the socket
            proxyRequest(nextUrl, redirectCount + 1);
            return;
          }

          console.log(`[Proxy] Backend responded with: ${statusCode} for: ${targetUrl}`);

          let contentType = proxyRes.headers["content-type"] || "audio/mpeg";
          if (
            contentType === "application/octet-stream" ||
            contentType === "binary/octet-stream" ||
            targetUrl.toLowerCase().includes(".mp3")
          ) {
            contentType = "audio/mpeg";
          }

          // Send headers of final response back to client
          const resHeaders: Record<string, string> = {
            "Content-Type": contentType,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Range",
            "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
          };

          if (proxyRes.headers["content-length"]) {
            resHeaders["Content-Length"] = proxyRes.headers["content-length"] as string;
          }
          if (proxyRes.headers["content-range"]) {
            resHeaders["Content-Range"] = proxyRes.headers["content-range"] as string;
          }

          res.writeHead(statusCode, resHeaders);
          proxyRes.pipe(res);
        });

        activeProxyReq.on("error", (err: any) => {
          console.error(`[Proxy] Error fetching ${targetUrl}:`, err);
          if (!res.headersSent) {
            res.status(500).send("Error fetching audio");
          }
          cleanup();
        });
      } catch (err) {
        console.error(`[Proxy] Parsing/Request error for ${targetUrl}:`, err);
        if (!res.headersSent) {
          res.status(500).send("Invalid audio URL or request failure");
        }
        cleanup();
      }
    };

    proxyRequest(audioUrl);
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
