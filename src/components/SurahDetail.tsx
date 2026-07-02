/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Surah, Ayah, DownloadState } from '../types';
import { 
  ArrowLeft, Play, Pause, Bookmark as BookmarkIcon, 
  BookmarkCheck, CloudDownload, Trash2, Globe, CheckCircle2, RefreshCw,
  BookOpen, Sliders, Type, ChevronLeft, ChevronRight, Eye, ListFilter,
  Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SurahDetailProps {
  surah: Surah;
  ayahs: Ayah[];
  isLoading: boolean;
  activeAyahIndex: number | null;
  isPlaying: boolean;
  downloadState: DownloadState;
  isBookmarked: (ayahNumber: number) => boolean;
  onToggleBookmark: (ayahNumber: number) => void;
  onPlayAyah: (index: number) => void;
  onPlayAll: () => void;
  onPause: () => void;
  onBack: () => void;
  onDownload: () => void;
  onDeleteDownload: () => void;
  reciterName: string;
  translationName: string;
  arabicFontSize: number;
  translationFontSize: number;
  arabicLineSpacing: number;
  initialViewMode?: 'translation' | '15lines';
  translationId?: string;
  isFullScreen?: boolean;
  onToggleFullScreen?: (val: boolean) => void;
}

export default function SurahDetail({
  surah,
  ayahs,
  isLoading,
  activeAyahIndex,
  isPlaying,
  downloadState,
  isBookmarked,
  onToggleBookmark,
  onPlayAyah,
  onPlayAll,
  onPause,
  onBack,
  onDownload,
  onDeleteDownload,
  reciterName,
  translationName,
  arabicFontSize,
  translationFontSize,
  arabicLineSpacing,
  initialViewMode,
  translationId = '',
  isFullScreen = false,
  onToggleFullScreen,
}: SurahDetailProps) {
  const ayahRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Tab View Mode: traditional scroll with translations vs immersive 15-line page
  const [viewMode, setViewMode] = useState<'translation' | '15lines'>(() => {
    if (initialViewMode) return initialViewMode;
    const saved = localStorage.getItem('quran_reader_view_mode');
    return (saved as 'translation' | '15lines') || 'translation';
  });

  // Sync with prop changes
  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode, surah.number]);

  // 15-Lines Font Mode: Standard Arabic vs Indo-Pak (Noorehuda Style)
  const [quranFontMode, setQuranFontMode] = useState<'arabic' | 'indopak'>(() => {
    const saved = localStorage.getItem('quran_reader_font_mode');
    return (saved as 'arabic' | 'indopak') || 'arabic';
  });

  // Custom configuration for the 15-line reader
  const [readerFontSize, setReaderFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('quran_reader_font_size');
    return saved ? parseInt(saved, 10) : 26;
  });

  const [wordsPerLine, setWordsPerLine] = useState<number>(() => {
    const saved = localStorage.getItem('quran_reader_words_per_line');
    return saved ? parseInt(saved, 10) : 8;
  });

  const [currentPage, setCurrentPage] = useState<number>(0);

  const [enableSwipeToTurn, setEnableSwipeToTurn] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_reader_swipe_to_turn');
    return saved === null ? true : saved === 'true';
  });

  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Persistence hooks
  useEffect(() => {
    localStorage.setItem('quran_reader_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('quran_reader_swipe_to_turn', enableSwipeToTurn.toString());
  }, [enableSwipeToTurn]);

  useEffect(() => {
    localStorage.setItem('quran_reader_font_mode', quranFontMode);
  }, [quranFontMode]);

  useEffect(() => {
    localStorage.setItem('quran_reader_font_size', readerFontSize.toString());
  }, [readerFontSize]);

  useEffect(() => {
    localStorage.setItem('quran_reader_words_per_line', wordsPerLine.toString());
  }, [wordsPerLine]);

  // Reset page when Surah changes
  useEffect(() => {
    setCurrentPage(0);
  }, [surah.number]);

  // Convert English digits to beautiful Arabic numerals
  const getArabicNumber = (num: number): string => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num
      .toString()
      .split('')
      .map(digit => {
        const parsed = parseInt(digit, 10);
        return isNaN(parsed) ? digit : arabicDigits[parsed];
      })
      .join('');
  };

  // Build the list of words & ayah boundaries
  const parseWords = () => {
    const list: Array<{ text: string; ayahIndex: number; isMarker: boolean; ayahNumber?: number }> = [];
    ayahs.forEach((ayah, index) => {
      const words = ayah.text.split(/\s+/).filter(Boolean);
      words.forEach(w => {
        list.push({ text: w, ayahIndex: index, isMarker: false });
      });
      // Append standard Quranic ayah end marker (with brackets swapped to render in correct order)
      list.push({
        text: `﴾${getArabicNumber(ayah.numberInSurah)}﴿`,
        ayahIndex: index,
        isMarker: true,
        ayahNumber: ayah.numberInSurah
      });
    });
    return list;
  };

  const words = parseWords();

  // Group continuous word tokens into lines of exactly `wordsPerLine` length
  const lines: Array<Array<{ text: string; ayahIndex: number; isMarker: boolean; ayahNumber?: number }>> = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine));
  }

  // Group lines into pages of exactly 15 lines
  const pages: Array<Array<Array<{ text: string; ayahIndex: number; isMarker: boolean; ayahNumber?: number }>>> = [];
  for (let i = 0; i < lines.length; i += 15) {
    pages.push(lines.slice(i, i + 15));
  }

  const pagesLength = pages.length;
  const currentPageClamped = Math.min(Math.max(0, currentPage), Math.max(0, pagesLength - 1));
  const activePage = pages[currentPageClamped] || [];

  // Guarantee exactly 15 line rows for flawless book page aesthetics
  const paddedPage = [...activePage];
  while (paddedPage.length < 15) {
    paddedPage.push([]);
  }

  // Auto-flip 15-line reader pages when active audio ayah transitions
  useEffect(() => {
    if (activeAyahIndex !== null && viewMode === '15lines' && pagesLength > 0) {
      const activePageIdx = pages.findIndex(page => 
        page.some(line => 
          line.some(word => word.ayahIndex === activeAyahIndex)
        )
      );
      if (activePageIdx !== -1 && activePageIdx !== currentPageClamped) {
        setCurrentPage(activePageIdx);
      }
    }
  }, [activeAyahIndex, viewMode, pagesLength]);

  // Arrow key navigation for book flipping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewMode !== '15lines' || pagesLength <= 1) return;
      if (e.key === 'ArrowLeft') {
        // Next page is to the left in RTL
        handleNextPage();
      } else if (e.key === 'ArrowRight') {
        // Previous page is to the right in RTL
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, currentPageClamped, pagesLength]);

  // Page turning actions
  const handlePrevPage = () => {
    if (currentPageClamped > 0) {
      setCurrentPage(currentPageClamped - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPageClamped < pagesLength - 1) {
      setCurrentPage(currentPageClamped + 1);
    }
  };

  // Touch Swiping Handlers for 15-line view
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipeToTurn) return;
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchEndX(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipeToTurn) return;
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!enableSwipeToTurn || touchStartX === null || touchEndX === null) return;
    const diffX = touchStartX - touchEndX;
    const minSwipeDistance = 50;

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        handleNextPage();
      } else {
        handlePrevPage();
      }
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  // Traditional scrolling view scroll-to-active-ayah handler
  useEffect(() => {
    if (viewMode === 'translation' && activeAyahIndex !== null && ayahs[activeAyahIndex]) {
      const activeAyahNumber = ayahs[activeAyahIndex].numberInSurah;
      const ref = ayahRefs.current[activeAyahNumber];
      if (ref) {
        ref.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeAyahIndex, ayahs, viewMode]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-bg-app py-12 transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-emerald-200 font-medium animate-pulse">Loading Ayahs & Audio Links...</p>
        <p className="text-slate-500 text-xs mt-1">Fetching texts and audio playlists</p>
      </div>
    );
  }

  const isCompleted = downloadState.status === 'completed';
  const isDownloading = downloadState.status === 'downloading';

  return (
    <div className="flex flex-col h-full bg-bg-app text-text-primary transition-colors duration-300 relative">
      
      {/* Immersive/FullScreen Floating Exit Button and Header Bar */}
      {isFullScreen && (
        <div className="absolute top-4 left-4 right-4 z-30 flex justify-between items-center pointer-events-none">
          <button
            id="exit-fullscreen-btn"
            onClick={() => onToggleFullScreen?.(false)}
            className="pointer-events-auto flex items-center space-x-1.5 px-3.5 py-2 bg-slate-950/85 hover:bg-slate-900 border border-emerald-500/20 text-emerald-400 font-bold rounded-full text-xs shadow-xl backdrop-blur-md transition-all active:scale-95"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Exit Full Screen</span>
          </button>
          <div className="pointer-events-auto flex items-center space-x-1.5 bg-slate-950/85 border border-emerald-500/20 text-emerald-300 font-serif text-xs font-medium px-4 py-2 rounded-full shadow-xl backdrop-blur-md">
            {surah.englishName} ({surah.name})
          </div>
        </div>
      )}

      {/* Detail Header */}
      {!isFullScreen && (
        <div className="bg-bg-header/80 backdrop-blur-md border-b border-emerald-900/30 px-6 py-4 md:px-8 sticky top-0 z-20 shadow-md transition-colors duration-300">
          <div className="flex items-center justify-between">
            <button
              id="detail-back-button"
              onClick={onBack}
              className="p-2 bg-bg-input border border-emerald-900/30 rounded-full text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all duration-300"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center flex-1 px-3">
              <h1 className="font-bold text-base leading-tight tracking-wide text-emerald-100">{surah.englishName}</h1>
              <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">
                {surah.englishNameTranslation} • {surah.revelationType}
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              {/* Full Screen Reading Mode Toggle */}
              <button
                id="header-fullscreen-button"
                onClick={() => onToggleFullScreen?.(true)}
                className="p-1.5 bg-bg-input border border-emerald-900/30 rounded-full text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all duration-300"
                title="Full Screen Reading Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              {/* Play / Pause Toggle */}
              <div className="w-9 h-9 flex items-center justify-center">
                {isPlaying && activeAyahIndex !== null ? (
                  <button
                    id="header-pause-button"
                    onClick={onPause}
                    className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/20 active:scale-95 transition-all"
                  >
                    <Pause className="w-4 h-4 fill-emerald-400" />
                  </button>
                ) : (
                  <button
                    id="header-play-button"
                    onClick={onPlayAll}
                    className="p-2 bg-emerald-500 text-slate-950 rounded-full hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* View Mode Switcher Tab Bar */}
          <div className="flex justify-center bg-bg-input border border-emerald-900/20 rounded-xl p-1 max-w-xs mx-auto mt-4 text-[10px] font-bold uppercase tracking-wider transition-colors duration-300">
            <button 
              id="view-mode-translation-btn"
              onClick={() => setViewMode('translation')} 
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center space-x-1 ${viewMode === 'translation' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <ListFilter className="w-3.5 h-3.5 shrink-0" />
              <span>Translation</span>
            </button>
            <button 
              id="view-mode-15lines-btn"
              onClick={() => setViewMode('15lines')} 
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all flex items-center justify-center space-x-1 ${viewMode === '15lines' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Read Quran</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary Workspace Scroll Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isFullScreen ? 'pt-20 pb-12' : 'pb-32'}`}>

        {/* Dynamic Reader Modes */}
        {viewMode === 'translation' ? (
          /* ================= MODE A: TRANSLATION (SCROLL LIST) ================= */
          <>
            {/* Decorated Banner Card */}
            {!isFullScreen && (
              <div className="bg-bg-card rounded-2xl p-4 border border-emerald-900/30 text-center relative overflow-hidden transition-colors duration-300">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-8 translate-y-8 text-emerald-500">
                   <svg viewBox="0 0 100 100" className="w-32 h-32 fill-none stroke-emerald-500 stroke-[0.25]">
                     <circle cx="50" cy="50" r="45" />
                     <circle cx="50" cy="50" r="35" />
                   </svg>
                </div>

                <div className="font-serif text-3xl font-medium tracking-wide mb-1 text-emerald-400">
                  {surah.name}
                </div>
                
                <div className="text-xs text-slate-400 font-medium">
                  Reciter: <span className="text-emerald-300 font-semibold">{reciterName}</span>
                </div>

                <div className="mt-3.5 flex justify-center">
                  <button
                    id="banner-fullscreen-button"
                    onClick={() => onToggleFullScreen?.(true)}
                    className="flex items-center space-x-1.5 py-1.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all font-bold text-xs border border-emerald-500/20 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Full Screen Reading</span>
                  </button>
                </div>

                {surah.number !== 1 && surah.number !== 9 && (
                  <div className="font-serif text-2xl font-normal text-emerald-100 mt-3 select-none leading-relaxed">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </div>
                )}

                {/* Offline / Save Area */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-emerald-900/30 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-slate-400">
                      {isCompleted ? 'Saved Offline' : 'Online Streaming'}
                    </span>
                  </div>

                  {isCompleted ? (
                    <button
                      id="delete-download-button"
                      onClick={onDeleteDownload}
                      className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-red-900/30 active:scale-95 transition-all font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Offline</span>
                    </button>
                  ) : isDownloading ? (
                    <div className="flex items-center space-x-2 text-emerald-400">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span className="font-semibold">Downloading {downloadState.progress}%</span>
                    </div>
                  ) : (
                    <button
                      id="download-offline-button"
                      onClick={onDownload}
                      className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 active:scale-95 transition-all shadow-sm"
                    >
                      <CloudDownload className="w-3.5 h-3.5" />
                      <span>Save Offline</span>
                    </button>
                  )}
                </div>

                {isDownloading && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-input">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${downloadState.progress}%` }}
                    ></div>
                  </div>
                )}
              </div>
            )}

            {/* Ayah Cards */}
            <div className="space-y-4">
              {ayahs.map((ayah, index) => {
                const isActive = activeAyahIndex === index;
                const bookmarked = isBookmarked(ayah.numberInSurah);

                return (
                  <div
                    key={ayah.number}
                    ref={(el) => {
                      ayahRefs.current[ayah.numberInSurah] = el;
                    }}
                    id={`ayah-card-${ayah.numberInSurah}`}
                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                      isActive
                        ? 'bg-bg-active border-emerald-500/40 shadow-xl shadow-emerald-950/40'
                        : 'bg-bg-card border-emerald-900/20 hover:border-emerald-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-900/20">
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        {surah.number}:{ayah.numberInSurah}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          id={`bookmark-ayah-${ayah.numberInSurah}`}
                          onClick={() => onToggleBookmark(ayah.numberInSurah)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-90 transition-all"
                        >
                          {bookmarked ? (
                            <BookmarkCheck className="w-4.5 h-4.5 text-emerald-400 fill-emerald-400/20" />
                          ) : (
                            <BookmarkIcon className="w-4.5 h-4.5 text-slate-500" />
                          )}
                        </button>

                        <button
                          id={`play-ayah-${ayah.numberInSurah}`}
                          onClick={() => onPlayAyah(index)}
                          className={`p-1.5 rounded-xl transition-all active:scale-90 ${
                            isActive && isPlaying
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-bg-input border border-emerald-900/10 hover:bg-emerald-500/10 text-slate-300'
                          }`}
                        >
                          {isActive && isPlaying ? (
                            <Pause className="w-4.5 h-4.5 fill-emerald-400" />
                          ) : (
                            <Play className="w-4.5 h-4.5 fill-slate-300 ml-0.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="py-5 select-all text-right">
                      <p 
                        className="font-serif font-normal text-text-primary tracking-wide"
                        style={{ 
                          fontSize: `${arabicFontSize}px`, 
                          lineHeight: arabicLineSpacing 
                        }}
                      >
                        {ayah.text}
                      </p>
                    </div>

                    {translationId !== 'none' && (
                      <div 
                        className="pt-3 text-slate-400 select-all border-t border-emerald-900/10 leading-relaxed"
                        style={{ fontSize: `${translationFontSize}px` }}
                      >
                        <p>{ayah.translationText || 'Translation unavailable'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* ================= MODE B: 15-LINE QURAN PAGE VIEW ================= */
          <div className="space-y-4">
            
            {/* 15-Line Configuration Bar */}
            {!isFullScreen && (
              <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4 space-y-3.5 transition-colors duration-300">
                {/* Font selection: Arabic QPC Uthmani Hafs vs Indo-Pak AlQalam Quran */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-200 block uppercase tracking-wider">Select Quran Script Font</span>
                    <span className="text-[10px] text-slate-500 block">Choose your preferred writing style</span>
                  </div>
                  <div className="flex bg-bg-input p-0.5 rounded-xl border border-emerald-900/20 shrink-0 select-none">
                    <button
                      id="font-switch-arabic"
                      onClick={() => setQuranFontMode('arabic')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        quranFontMode === 'arabic'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Hafs Font
                    </button>
                    <button
                      id="font-switch-indopak"
                      onClick={() => setQuranFontMode('indopak')}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        quranFontMode === 'indopak'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Qalam Font
                    </button>
                  </div>
                </div>

                {/* Swipe to Turn Page option toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/10 pb-3">
                  <div>
                    <span className="text-xs font-bold text-emerald-200 block uppercase tracking-wider">Swipe to Turn Page</span>
                    <span className="text-[10px] text-slate-500 block">Swipe left or right on mobile to change pages</span>
                  </div>
                  <div className="flex bg-bg-input p-0.5 rounded-xl border border-emerald-900/20 shrink-0 select-none">
                    <button
                      id="swipe-toggle-enabled"
                      onClick={() => setEnableSwipeToTurn(true)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        enableSwipeToTurn
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Enabled
                    </button>
                    <button
                      id="swipe-toggle-disabled"
                      onClick={() => setEnableSwipeToTurn(false)}
                      className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all ${
                        !enableSwipeToTurn
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Disabled
                    </button>
                  </div>
                </div>

                {/* Adjust text metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-0.5">
                  {/* Font Size Adjuster */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Type className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold">Font Size</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-bg-input border border-emerald-900/30 rounded-lg p-0.5">
                      <button
                        onClick={() => setReaderFontSize(Math.max(16, readerFontSize - 2))}
                        className="px-2 py-0.5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded text-sm font-bold active:scale-95"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-emerald-200 px-1">{readerFontSize}px</span>
                      <button
                        onClick={() => setReaderFontSize(Math.min(48, readerFontSize + 2))}
                        className="px-2 py-0.5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded text-sm font-bold active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Density: Words Per Line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-slate-400">
                      <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold">Words Per Line</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-bg-input border border-emerald-900/30 rounded-lg p-0.5">
                      <button
                        onClick={() => {
                          setWordsPerLine(Math.max(5, wordsPerLine - 1));
                          setCurrentPage(0); // reset page to avoid out of bounds
                        }}
                        className="px-2 py-0.5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded text-sm font-bold active:scale-95"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-emerald-200 px-1">{wordsPerLine} words</span>
                      <button
                        onClick={() => {
                          setWordsPerLine(Math.min(12, wordsPerLine + 1));
                          setCurrentPage(0); // reset page to avoid out of bounds
                        }}
                        className="px-2 py-0.5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 rounded text-sm font-bold active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Immersive 15-Line Mushaf Page */}
            <div className="relative">
              {/* Keyboard tips indicator */}
              <div className="hidden sm:flex justify-center text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1 select-none">
                💡 Tip: Use Left/Right Arrow Keys to turn pages
              </div>

              {/* Book Frame */}
              <div 
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className="bg-bg-card border-4 border-emerald-900/30 rounded-3xl p-6 shadow-2xl overflow-hidden transition-all duration-300 relative min-h-[580px] flex flex-col justify-between"
              >
                
                {/* Decorative Islamic geometric corners */}
                <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-emerald-500/20 rounded-tl"></div>
                <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-emerald-500/20 rounded-tr"></div>
                <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-emerald-500/20 rounded-bl"></div>
                <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-emerald-500/20 rounded-br"></div>

                {/* Page Top Header */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-emerald-900/10 pb-1.5 mb-4 select-none">
                  <span className="text-emerald-400/80">{surah.englishName}</span>
                  <span className="font-serif text-xs text-emerald-300 font-medium">{surah.name}</span>
                  <span>{surah.revelationType}</span>
                </div>

                {/* The 15 Lines Text Body Container */}
                <div className="flex-1 flex flex-col justify-between space-y-1.5 relative select-all">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentPageClamped}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -15 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col justify-between space-y-1"
                    >
                      {paddedPage.map((line, lIdx) => (
                        <div 
                          key={lIdx}
                          className="flex flex-row-reverse justify-center items-center flex-wrap py-2 border-b border-emerald-900/10 dark:border-emerald-500/5 last:border-0 min-h-[32px]"
                        >
                          {line.length > 0 ? (
                            line.map((word, wIdx) => {
                              const isHighlighted = activeAyahIndex === word.ayahIndex;
                              return (
                                <span 
                                  key={wIdx}
                                  onClick={() => onPlayAyah(word.ayahIndex)}
                                  className={`cursor-pointer mx-1 select-all tracking-wide text-center transition-all duration-200 select-none ${
                                    quranFontMode === 'indopak' 
                                      ? 'font-indopak font-bold tracking-wider' 
                                      : 'font-serif'
                                  } ${
                                    word.isMarker 
                                      ? 'text-emerald-500 mx-1.5 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/20 hover:bg-emerald-500/20' 
                                      : isHighlighted 
                                        ? 'text-emerald-300 font-extrabold underline decoration-emerald-500/50 scale-102 bg-emerald-500/10 px-0.5 rounded' 
                                        : 'text-text-primary hover:text-emerald-400 hover:scale-105'
                                  }`}
                                  style={{ 
                                    fontSize: `${readerFontSize}px`,
                                    fontWeight: quranFontMode === 'indopak' ? '700' : '400',
                                    // Custom features specifically calibrated to make Scheherazade New render with Noorehuda style ligatures & diacritics
                                    fontFeatureSettings: quranFontMode === 'indopak' ? '"cv01" on, "cv02" on, "cv03" on, "cv04" on' : 'normal'
                                  }}
                                  title={word.isMarker ? `Ayah ${word.ayahNumber}` : 'Click to listen'}
                                >
                                  {word.text}
                                </span>
                              );
                            })
                          ) : (
                            /* Ruled lines for empty pad spaces to maintain gorgeous balance */
                            <span className="h-4 w-full block"></span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Page Bottom Footer with Indicator */}
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-500 border-t border-emerald-900/10 pt-2.5 mt-4 select-none">
                  <div className="w-12"></div>
                  <div className="text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full">
                    Page {currentPageClamped + 1} of {Math.max(1, pagesLength)}
                  </div>
                  <div className="text-right text-[8px] text-slate-600 truncate max-w-[100px]">
                    {surah.numberOfAyahs} Verses
                  </div>
                </div>

              </div>

              {/* Book Page turning floating side chevrons */}
              {pagesLength > 1 && (
                <>
                  {/* Left chevron button: Next page (RTL flips pages to the left!) */}
                  {currentPageClamped < pagesLength - 1 && (
                    <button
                      onClick={handleNextPage}
                      className="absolute left-[-16px] top-1/2 -translate-y-1/2 p-3.5 bg-emerald-500 text-slate-950 rounded-full hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-950/40 z-10 border border-emerald-300/30"
                      title="Next Page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  {/* Right chevron button: Previous page (RTL flips pages to the right!) */}
                  {currentPageClamped > 0 && (
                    <button
                      onClick={handlePrevPage}
                      className="absolute right-[-16px] top-1/2 -translate-y-1/2 p-3.5 bg-emerald-500 text-slate-950 rounded-full hover:bg-emerald-400 active:scale-95 transition-all shadow-xl shadow-emerald-950/40 z-10 border border-emerald-300/30"
                      title="Previous Page"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Immersive Audio Banner control while reading */}
            {!isFullScreen && (
              <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4 flex items-center justify-between text-xs transition-colors duration-300">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />
                  <span className="text-slate-400 font-medium">
                    {isPlaying ? 'Currently Reciting...' : 'Immersive Memorizer'}
                  </span>
                </div>
                <div className="flex space-x-2">
                  <button
                    id="immersive-reader-fullscreen"
                    onClick={() => onToggleFullScreen?.(true)}
                    className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all font-bold rounded-xl border border-emerald-500/20 flex items-center space-x-1 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Full Screen</span>
                  </button>
                  <button
                    id="immersive-reader-play-all"
                    onClick={isPlaying ? onPause : onPlayAll}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-emerald-500/10"
                  >
                    {isPlaying ? 'Pause Audio' : 'Play Surah'}
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
