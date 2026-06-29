import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  BookOpen, 
  Download, 
  Search, 
  RefreshCw, 
  Eye, 
  Loader2, 
  FileText, 
  File, 
  Music, 
  CheckCircle, 
  AlertCircle,
  X,
  BookMarked,
  Info,
  ExternalLink,
  Settings,
  HelpCircle
} from 'lucide-react';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  isFallback?: boolean;
  url?: string; // only for fallback books
}

// Beautiful classic Islamic books as default/fallback
const FALLBACK_BOOKS: DriveFile[] = [
  {
    id: "fb-quran",
    name: "The Holy Qur'an (Arabic-English Translation).pdf",
    mimeType: "application/pdf",
    size: "8245100",
    isFallback: true,
    url: "https://ia800707.us.archive.org/27/items/TheHolyQuranTranslationByAbdullahYusufAli/The-Holy-Quran-Translation-by-Abdullah-Yusuf-Ali.pdf"
  },
  {
    id: "fb-bukhari",
    name: "Sahih al-Bukhari (English Translation - Condensed).pdf",
    mimeType: "application/pdf",
    size: "4532100",
    isFallback: true,
    url: "https://ia800902.us.archive.org/17/items/SahihAlBukhari_201509/Sahih-al-Bukhari.pdf"
  },
  {
    id: "fb-salihin",
    name: "Riyad as-Salihin (The Meadows of the Righteous).pdf",
    mimeType: "application/pdf",
    size: "3892000",
    isFallback: true,
    url: "https://ia801905.us.archive.org/12/items/RiyadAsSalihinTheMeadowsOfTheRighteous/Riyad-as-Salihin-The-Meadows-of-the-Righteous.pdf"
  }
];

export default function BooksTab() {
  const [configStatus, setConfigStatus] = useState<{ hasApiKey: boolean; hasFolderId: boolean } | null>(null);
  const [isFetchingFiles, setIsFetchingFiles] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'books' | 'audio'>('all');
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadStatus, setDownloadStatus] = useState<Record<string, 'idle' | 'downloading' | 'completed' | 'error'>>({});
  const [readingFile, setReadingFile] = useState<{ file: DriveFile; url: string } | null>(null);
  const [playingAudio, setPlayingAudio] = useState<{ file: DriveFile; url: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    fetchConfigAndFiles();
  }, []);

  const fetchConfigAndFiles = async () => {
    setIsFetchingFiles(true);
    setErrorMsg(null);
    try {
      // 1. Fetch config status
      const configRes = await fetch('/api/config-status');
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfigStatus(configData);
        if (!configData.hasApiKey || !configData.hasFolderId) {
          setShowGuide(true);
        }
      }

      // 2. Fetch files from Drive proxy
      const booksRes = await fetch('/api/books');
      if (booksRes.ok) {
        const booksData = await booksRes.json();
        if (booksData.error === "MISSING_CONFIG") {
          // No environment variables configured yet, load fallback books
          setFiles(FALLBACK_BOOKS);
        } else if (booksData.success) {
          if (booksData.files && booksData.files.length > 0) {
            setFiles(booksData.files);
          } else {
            // Configured but empty, load fallback books so user sees something beautiful
            setFiles(FALLBACK_BOOKS);
          }
        } else {
          setFiles(FALLBACK_BOOKS);
          if (booksData.message) {
            setErrorMsg(booksData.message);
          }
        }
      } else {
        setFiles(FALLBACK_BOOKS);
      }
    } catch (err: any) {
      console.error("Error fetching library files:", err);
      setFiles(FALLBACK_BOOKS);
      setErrorMsg("Unable to sync Google Drive. Showing default curated Islamic bookshelf.");
    } finally {
      setIsFetchingFiles(false);
    }
  };

  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return 'Unknown size';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownload = async (file: DriveFile) => {
    // For fallback books, download directly from source
    if (file.isFallback && file.url) {
      const a = document.createElement('a');
      a.href = file.url;
      a.target = '_blank';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // For Google Drive proxy books
    try {
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'downloading' }));
      setDownloadProgress(prev => ({ ...prev, [file.id]: 0 }));

      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/books/download/${file.id}`);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setDownloadProgress(prev => ({ ...prev, [file.id]: percent }));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setDownloadStatus(prev => ({ ...prev, [file.id]: 'completed' }));
          const blobUrl = URL.createObjectURL(xhr.response);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } else {
          setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
          alert(`Download failed: Status ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
        alert('Network error while downloading.');
      };

      xhr.send();
    } catch (err) {
      console.error("Download error:", err);
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
    }
  };

  const handleRead = async (file: DriveFile) => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf';
    const isAudio = file.mimeType.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3') || file.name.toLowerCase().endsWith('.m4a');

    if (!isPdf && !isAudio) {
      alert(`EPUB books cannot be read directly in the browser. Please download the file to read it in your preferred Ebook reader.`);
      return;
    }

    // If fallback, use its direct URL
    if (file.isFallback && file.url) {
      if (isPdf) {
        setReadingFile({ file, url: file.url });
      } else {
        setPlayingAudio({ file, url: file.url });
      }
      return;
    }

    // If Drive proxy, fetch the blob and create a local URL to render
    try {
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'downloading' }));
      setDownloadProgress(prev => ({ ...prev, [file.id]: 0 }));

      const xhr = new XMLHttpRequest();
      xhr.open('GET', `/api/books/download/${file.id}`);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setDownloadProgress(prev => ({ ...prev, [file.id]: percent }));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          setDownloadStatus(prev => ({ ...prev, [file.id]: 'completed' }));
          const blobUrl = URL.createObjectURL(xhr.response);
          if (isPdf) {
            setReadingFile({ file, url: blobUrl });
          } else {
            setPlayingAudio({ file, url: blobUrl });
          }
        } else {
          setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
          alert(`Could not stream file: Status ${xhr.status}`);
        }
      };

      xhr.onerror = () => {
        setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
        alert('Network error while streaming.');
      };

      xhr.send();
    } catch (err) {
      console.error("Read stream error:", err);
      setDownloadStatus(prev => ({ ...prev, [file.id]: 'error' }));
    }
  };

  const closeReader = () => {
    if (readingFile) {
      if (readingFile.url.startsWith('blob:')) {
        URL.revokeObjectURL(readingFile.url);
      }
      setReadingFile(null);
    }
  };

  const closeAudio = () => {
    if (playingAudio) {
      if (playingAudio.url.startsWith('blob:')) {
        URL.revokeObjectURL(playingAudio.url);
      }
      setPlayingAudio(null);
    }
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterType === 'all') return matchesSearch;

    const isPdf = file.mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isEpub = file.mimeType === 'application/epub+zip' || file.name.toLowerCase().endsWith('.epub');
    const isAudio = file.mimeType.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3') || file.name.toLowerCase().endsWith('.m4a');

    if (filterType === 'books') return matchesSearch && (isPdf || isEpub);
    if (filterType === 'audio') return matchesSearch && isAudio;

    return matchesSearch;
  });

  const getFileIcon = (file: DriveFile) => {
    const name = file.name.toLowerCase();
    if (file.mimeType === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText className="w-8 h-8 text-rose-400" />;
    }
    if (file.mimeType === 'application/epub+zip' || name.endsWith('.epub')) {
      return <Book className="w-8 h-8 text-sky-400" />;
    }
    if (file.mimeType.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.m4a')) {
      return <Music className="w-8 h-8 text-purple-400" />;
    }
    return <File className="w-8 h-8 text-slate-400" />;
  };

  const getFormatLabel = (file: DriveFile) => {
    const name = file.name.toLowerCase();
    if (file.mimeType === 'application/pdf' || name.endsWith('.pdf')) return 'PDF';
    if (file.mimeType === 'application/epub+zip' || name.endsWith('.epub')) return 'EPUB';
    if (file.mimeType.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.m4a')) return 'AUDIO';
    return 'BOOK';
  };

  const isConfigured = configStatus?.hasApiKey && configStatus?.hasFolderId;

  return (
    <div className="w-full h-full flex flex-col bg-bg-app text-text-primary transition-colors duration-300">
      {/* Title Header */}
      <div className="bg-bg-header border-b border-emerald-900/10 p-4 shrink-0 transition-colors duration-300">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <div>
            <span className="text-[10px] font-bold text-emerald-500 tracking-wider uppercase block">Islamic Library</span>
            <h2 className="text-lg font-extrabold text-emerald-100 tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              My Library
            </h2>
          </div>
          <button
            id="btn-refresh-books"
            onClick={fetchConfigAndFiles}
            disabled={isFetchingFiles}
            className="text-xs bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 border border-emerald-500/20 rounded-xl text-emerald-300 font-bold py-2 px-3.5 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFiles ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-4xl mx-auto w-full pb-24">
        {/* Help & Guide Toggle Bar */}
        <div className="mb-5 flex items-center justify-between bg-bg-card border border-emerald-900/10 rounded-2xl px-4 py-3 transition-colors duration-300">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-emerald-100">Need help linking your own files?</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Stream audio files (.mp3, .m4a) and view books (.pdf, .epub) directly from your Google Drive.</p>
            </div>
          </div>
          <button
            id="btn-toggle-setup-guide"
            onClick={() => setShowGuide(prev => !prev)}
            className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-95 text-emerald-300 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer border border-emerald-500/20 whitespace-nowrap"
          >
            {showGuide ? 'Hide Guide' : 'Show Guide'}
          </button>
        </div>

        {/* Beautiful Collapsible Step-by-Step Guide */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mb-6 overflow-hidden bg-emerald-950/20 border border-emerald-500/10 rounded-2xl"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-950">
                  <Info className="w-4.5 h-4.5 text-emerald-400" />
                  <h4 className="text-xs font-extrabold text-emerald-100 uppercase tracking-wider">Step-by-Step Google Drive Connection Guide</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Step 1: Obtain folder ID */}
                  <div className="bg-stone-950/50 p-3.5 rounded-xl border border-emerald-950/50">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-md uppercase">Step 1</span>
                    <h5 className="font-bold text-emerald-100 mt-2">Get your Google Drive Folder ID</h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Create or open your folder in Google Drive. Look at your browser's address bar. The URL looks like:
                    </p>
                    <div className="mt-1.5 p-2 bg-black/60 rounded-lg text-[10px] font-mono text-slate-400 break-all select-all border border-emerald-950">
                      https://drive.google.com/drive/folders/<span className="text-emerald-400 font-bold">1LG4P4LjXMg3iBza2K3QDihzyehlT9Hxv</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5">
                      The long string of letters and numbers after <strong className="font-mono text-emerald-400">/folders/</strong> is your <strong className="text-emerald-300">Folder ID</strong> (e.g., <strong className="font-mono text-emerald-400">1LG4P4LjXMg3iBza2K3QDihzyehlT9Hxv</strong>). Copy this ID.
                    </p>
                  </div>

                  {/* Step 2: Share folder */}
                  <div className="bg-stone-950/50 p-3.5 rounded-xl border border-emerald-950/50">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-md uppercase">Step 2</span>
                    <h5 className="font-bold text-emerald-100 mt-2">Share folder as Public (CRITICAL)</h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Because the library queries files securely using a Google Developer Key, <strong>the folder must be shared publicly:</strong>
                    </p>
                    <ul className="list-disc list-inside text-[10px] text-slate-400 mt-1.5 space-y-1">
                      <li>Right-click the folder in Google Drive and click <strong className="text-emerald-300">Share</strong>.</li>
                      <li>Under <strong>General access</strong>, change from <strong>"Restricted"</strong> to <strong className="text-emerald-300">"Anyone with the link"</strong>.</li>
                      <li>Ensure the role is set to <strong className="text-emerald-300">"Viewer"</strong>.</li>
                      <li>Click <strong>Done</strong>.</li>
                    </ul>
                  </div>

                  {/* Step 3: Secrets Configuration */}
                  <div className="bg-stone-950/50 p-3.5 rounded-xl border border-emerald-950/50">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-md uppercase">Step 3</span>
                    <h5 className="font-bold text-emerald-100 mt-2">Configure Secrets in AI Studio</h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Go to your AI Studio project's <strong>Settings &rarr; Secrets / Environment Variables</strong> and verify:
                    </p>
                    <ul className="list-none text-[10px] font-mono text-slate-300 mt-2 space-y-1 bg-black/40 p-2 rounded-lg border border-emerald-950">
                      <li><strong className="text-emerald-400">GDRIVE_FOLDER_ID</strong> = <span className="text-emerald-200">1LG4P4LjXMg3iBza2K3QDihzyehlT9Hxv</span></li>
                      <li><strong className="text-emerald-400">GOOGLE_API_KEY</strong> = <span className="text-slate-500">Your Google Developer API Key</span></li>
                    </ul>
                  </div>

                  {/* Step 4: Scan and Refresh */}
                  <div className="bg-stone-950/50 p-3.5 rounded-xl border border-emerald-950/50">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-extrabold px-2 py-0.5 rounded-md uppercase">Step 4</span>
                    <h5 className="font-bold text-emerald-100 mt-2">Refreshing & Supported Files</h5>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      After saving secrets, click the <strong className="text-emerald-400">"Refresh"</strong> button in the header.
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                      The application will automatically scan the folder and all its subfolders, fetching:
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-md font-bold">📚 PDFs & EPUBs</span>
                      <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-500/10 px-2 py-0.5 rounded-md font-bold">🎵 MP3s & M4As</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="book-search-input"
                type="text"
                placeholder="Search bookshelf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-card border border-emerald-900/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-text-primary focus:outline-none focus:border-emerald-500/50 placeholder-slate-500 transition-all duration-300"
              />
            </div>

            {/* Filters */}
            <div className="flex bg-bg-card border border-emerald-900/10 p-1 rounded-2xl gap-0.5 transition-colors duration-300">
              {(['all', 'books', 'audio'] as const).map((type) => (
                <button
                  key={type}
                  id={`filter-btn-${type}`}
                  onClick={() => setFilterType(type)}
                  className={`text-[10px] font-bold px-4 py-1.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer ${
                    filterType === type 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type === 'all' ? 'All' : type === 'books' ? 'Books' : 'Audio'}
                </button>
              ))}
            </div>
          </div>

          {/* Errors if any */}
          {errorMsg && (
            <div className="bg-red-950/20 border border-red-500/20 text-red-400 rounded-2xl p-3.5 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button 
                id="btn-dismiss-books-error"
                onClick={() => setErrorMsg(null)}
                className="text-[10px] text-red-300 underline font-bold hover:text-red-100"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Books Shelf Listing */}
          {isFetchingFiles ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-xs text-slate-400 font-medium">Scanning Google Drive for Islamic books...</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-bg-card border border-emerald-900/10 rounded-3xl p-8 text-center max-w-md mx-auto my-4 transition-colors duration-300">
              <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-900/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              
              <h4 className="text-sm font-extrabold text-emerald-100">No books match search query</h4>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Try modifying your search query or switching filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredFiles.map((file) => {
                const progress = downloadProgress[file.id] || 0;
                const status = downloadStatus[file.id] || 'idle';
                const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.mimeType === 'application/pdf';
                const isAudio = file.mimeType.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3') || file.name.toLowerCase().endsWith('.m4a');
                const isEpub = file.name.toLowerCase().endsWith('.epub') || file.mimeType === 'application/epub+zip';

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-bg-card border border-emerald-900/10 hover:border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-md hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-emerald-950/20 border border-emerald-900/10 rounded-xl shrink-0 mt-0.5">
                        {getFileIcon(file)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-emerald-100 truncate pr-1" title={file.name}>
                          {file.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded tracking-wider uppercase ${
                            isPdf ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                            isEpub ? 'bg-sky-500/10 text-sky-400 border border-sky-500/10' :
                            isAudio ? 'bg-purple-500/10 text-purple-400 border border-purple-500/10' :
                            'bg-slate-500/10 text-slate-400 border border-slate-500/10'
                          }`}>
                            {getFormatLabel(file)}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">{formatBytes(file.size)}</span>
                          {file.isFallback && (
                            <span className="text-[9px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-1.5 rounded font-extrabold tracking-wider">PRELOADED</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Download progress bar */}
                    {status === 'downloading' && (
                      <div className="w-full space-y-1 bg-emerald-950/10 p-2 rounded-xl border border-emerald-900/10">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                            Streaming document...
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 border-t border-emerald-900/10 pt-3 mt-1 shrink-0">
                      {/* Direct Download Action */}
                      <button
                        id={`download-btn-${file.id}`}
                        onClick={() => handleDownload(file)}
                        disabled={status === 'downloading'}
                        className="flex-1 text-[10px] bg-bg-input hover:bg-bg-active border border-emerald-900/20 text-slate-300 font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
                        Download
                      </button>

                      {/* Read/Play Action */}
                      {(isPdf || isAudio) && (
                        <button
                          id={`read-btn-${file.id}`}
                          onClick={() => handleRead(file)}
                          disabled={status === 'downloading'}
                          className="flex-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98 disabled:opacity-50 shadow-md shadow-emerald-950/25"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {isAudio ? 'Listen' : 'Read Now'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* PDF Full-screen Reader Modal */}
      <AnimatePresence>
        {readingFile && (
          <div className="fixed inset-0 bg-stone-950/95 flex flex-col z-100 overflow-hidden">
            <div className="bg-bg-header p-3.5 border-b border-emerald-900/20 flex items-center justify-between shadow-md">
              <div className="min-w-0 pr-4">
                <span className="text-[9px] font-bold text-emerald-500 tracking-wider uppercase block">In-App Document Reader</span>
                <h3 className="text-xs font-bold text-emerald-100 truncate max-w-sm sm:max-w-lg" title={readingFile.file.name}>
                  {readingFile.file.name}
                </h3>
              </div>
              <button
                id="close-pdf-reader-btn"
                onClick={closeReader}
                className="bg-emerald-950/50 hover:bg-emerald-900/30 border border-emerald-500/20 text-slate-300 p-1.5 rounded-full hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-stone-900 relative">
              <iframe 
                id="pdf-reader-iframe"
                src={`${readingFile.url}#toolbar=1`}
                className="w-full h-full border-0 bg-stone-900"
                title={readingFile.file.name}
              />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Audio Full-Screen / Mini Player Modal */}
      <AnimatePresence>
        {playingAudio && (
          <div className="fixed inset-0 bg-stone-950/95 flex flex-col justify-center items-center p-6 z-100 overflow-hidden">
            <button
              id="close-audio-player-btn"
              onClick={closeAudio}
              className="absolute top-6 right-6 bg-emerald-950/50 hover:bg-emerald-900/30 border border-emerald-500/20 text-slate-300 p-2.5 rounded-full hover:text-white transition-all z-110"
            >
              <X className="w-5 h-5" />
            </button>
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-bg-card border border-emerald-900/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-6"
            >
              <div className="w-24 h-24 bg-purple-950/20 border-2 border-purple-500/20 text-purple-400 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                <Music className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-purple-400 tracking-wider uppercase block">Audio Book Player</span>
                <h3 className="text-sm font-extrabold text-emerald-100 max-w-xs mx-auto line-clamp-2">
                  {playingAudio.file.name}
                </h3>
                <p className="text-xs text-slate-500">{formatBytes(playingAudio.file.size)}</p>
              </div>

              <audio 
                id="audio-book-native-player"
                src={playingAudio.url} 
                controls 
                autoPlay
                className="w-full max-w-xs mt-4 outline-none filter hue-rotate-15 saturate-125"
              />
              
              <p className="text-[10px] text-slate-500 max-w-xs">
                Playing file stream. Close when done to release system memory.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
