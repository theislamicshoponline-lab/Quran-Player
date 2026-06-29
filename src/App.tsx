/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Surah, Ayah, Bookmark, DownloadState, DownloadedSurah } from './types';
import { fetchSurahs, fetchSurahDetail, downloadSurah, RECITERS, TRANSLATIONS } from './utils/quranApi';
import { getAllDownloadedSurahs, deleteDownloadedSurah, getAudioBlob } from './utils/db';
import SurahList from './components/SurahList';
import SurahDetail from './components/SurahDetail';
import AudioPlayer from './components/AudioPlayer';
import BookmarksTab from './components/BookmarksTab';
import SettingsPanel from './components/SettingsPanel';
import { BookOpen, Bookmark as BookmarkIcon, Download, Settings, RefreshCw, AlertTriangle, HelpCircle, PlayCircle, Trash2, Sun, Moon, Book } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'surahs' | 'read' | 'bookmarks' | 'downloads' | 'settings'>('surahs');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [selectedSurahAyahs, setSelectedSurahAyahs] = useState<Ayah[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Theme selection
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_theme');
    return saved !== 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.remove('light');
    } else {
      root.classList.add('light');
    }
  }, [isDarkMode]);

  // Prevent any browser layout shifting / upward scrolling on tab or view changes
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTo?.(0, 0);
  }, [activeTab, selectedSurah]);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('quran_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Quran Metadata lists
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [isLoadingSurahs, setIsLoadingSurahs] = useState(true);
  const [downloadedSurahs, setDownloadedSurahs] = useState<DownloadedSurah[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // User Settings Preference
  const [reciterId, setReciterId] = useState<string>('ar.alafasy');
  const [translationId, setTranslationId] = useState<string>('en.sahih');

  // Active audio player state
  const [activeAudioSurah, setActiveAudioSurah] = useState<Surah | null>(null);
  const [activeAyahIndex, setActiveAyahIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [repeatMode, setRepeatMode] = useState<'none' | 'ayah' | 'surah'>('none');

  const [playTranslation, setPlayTranslation] = useState<boolean>(() => {
    const saved = localStorage.getItem('quran_pref_play_translation');
    return saved === 'true';
  });
  const [isPlayingTranslation, setIsPlayingTranslation] = useState<boolean>(false);

  const [arabicFontSize, setArabicFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('quran_pref_arabic_font_size');
    return saved ? parseInt(saved, 10) : 32;
  });

  const [translationFontSize, setTranslationFontSize] = useState<number>(() => {
    const saved = localStorage.getItem('quran_pref_translation_font_size');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [arabicLineSpacing, setArabicLineSpacing] = useState<number>(() => {
    const saved = localStorage.getItem('quran_pref_arabic_line_spacing');
    return saved ? parseFloat(saved) : 2.2;
  });

  // Download state map (key: surahNumber)
  const [downloadStates, setDownloadStates] = useState<{ [key: number]: DownloadState }>({});
  
  // Bulk download state for downloading the entire Quran of the selected Qari
  const [bulkDownloadState, setBulkDownloadState] = useState<{
    isActive: boolean;
    currentSurahNumber: number;
    currentSurahName: string;
    progress: number;
    downloadedCount: number;
    totalCount: number;
  } | null>(null);

  const bulkDownloadCancelRef = useRef<boolean>(false);

  // Custom dialogs/confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<{
    surahNumber: number;
    reciterId: string;
    translationId: string;
    totalAyahs: number;
    surahName: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio HTML5 reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Prefetch and seamless gapless playback references
  const prefetchedAyahAudioRef = useRef<{
    surahNumber: number;
    ayahIndex: number;
    url: string;
  } | null>(null);
  const preloadAudioObjRef = useRef<HTMLAudioElement | null>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Computed: set of downloaded Surah numbers for fast lookup
  const downloadedSurahIds = React.useMemo(() => {
    return new Set(
      downloadedSurahs
        .filter((d) => d.reciterId === reciterId && d.translationId === translationId)
        .map((d) => d.surahNumber)
    );
  }, [downloadedSurahs, reciterId, translationId]);

  // Load initial surahs list, downloads, and bookmarks
  useEffect(() => {
    async function init() {
      try {
        setIsLoadingSurahs(true);
        const data = await fetchSurahs();
        setSurahs(data);
      } catch (err) {
        console.error('Failed to fetch surah list:', err);
      } finally {
        setIsLoadingSurahs(false);
      }

      // Load downloads
      await refreshDownloadsList();

      // Load bookmarks
      const savedBookmarks = localStorage.getItem('quran_bookmarks');
      if (savedBookmarks) {
        setBookmarks(JSON.parse(savedBookmarks));
      }

      // Load settings
      const savedReciter = localStorage.getItem('quran_pref_reciter');
      if (savedReciter) setReciterId(savedReciter);

      const savedTrans = localStorage.getItem('quran_pref_translation');
      if (savedTrans) setTranslationId(savedTrans);
    }
    init();
  }, []);

  // Save bookmarks to local storage
  const saveBookmarksList = (updated: Bookmark[]) => {
    setBookmarks(updated);
    localStorage.setItem('quran_bookmarks', JSON.stringify(updated));
  };

  const refreshDownloadsList = async () => {
    try {
      const list = await getAllDownloadedSurahs();
      setDownloadedSurahs(list);
    } catch (err) {
      console.error('Failed to fetch downloads list:', err);
    }
  };

  // Fetch Surah Details when selecting a surah
  const loadSurahDetails = async (surah: Surah) => {
    setIsLoadingDetail(true);
    setErrorMessage(null);
    try {
      const detail = await fetchSurahDetail(surah.number, reciterId, translationId);
      setSelectedSurahAyahs(detail.ayahs);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load Quran verses.');
      setSelectedSurahAyahs([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleSelectSurah = (surah: Surah) => {
    setSelectedSurah(surah);
    loadSurahDetails(surah);
  };

  const handleSelectAndPlayAyah = async (surahNumber: number, ayahNumberInSurah: number) => {
    const foundSurah = surahs.find((s) => s.number === surahNumber);
    if (!foundSurah) return;

    setActiveTab('surahs');
    setSelectedSurah(foundSurah);
    setReciterId('ar.alafasy');
    localStorage.setItem('quran_pref_reciter', 'ar.alafasy');

    setIsLoadingDetail(true);
    setErrorMessage(null);
    try {
      const detail = await fetchSurahDetail(surahNumber, 'ar.alafasy', translationId);
      setSelectedSurahAyahs(detail.ayahs);

      const targetIndex = detail.ayahs.findIndex((a) => a.numberInSurah === ayahNumberInSurah);
      if (targetIndex !== -1) {
        setTimeout(() => {
          playAyahAt(foundSurah, targetIndex, true, detail.ayahs);
        }, 100);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load Quran verses.');
      setSelectedSurahAyahs([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Handle setting updates
  const handleSelectReciter = (id: string) => {
    setReciterId(id);
    localStorage.setItem('quran_pref_reciter', id);
  };

  const handleSelectTranslation = (id: string) => {
    setTranslationId(id);
    localStorage.setItem('quran_pref_translation', id);
  };

  const handleTogglePlayTranslation = (enabled: boolean) => {
    setPlayTranslation(enabled);
    localStorage.setItem('quran_pref_play_translation', enabled ? 'true' : 'false');
    if (!enabled && isPlayingTranslation) {
      setIsPlayingTranslation(false);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (activeAudioSurah && activeAyahIndex !== null) {
        playAyahAt(activeAudioSurah, activeAyahIndex, true);
      }
    }
  };

  const handleChangeArabicFontSize = (size: number) => {
    setArabicFontSize(size);
    localStorage.setItem('quran_pref_arabic_font_size', size.toString());
  };

  const handleChangeTranslationFontSize = (size: number) => {
    setTranslationFontSize(size);
    localStorage.setItem('quran_pref_translation_font_size', size.toString());
  };

  const handleChangeArabicLineSpacing = (spacing: number) => {
    setArabicLineSpacing(spacing);
    localStorage.setItem('quran_pref_arabic_line_spacing', spacing.toString());
  };

  // Reload surah if preferences change
  useEffect(() => {
    if (selectedSurah) {
      loadSurahDetails(selectedSurah);
    }
  }, [reciterId, translationId, selectedSurah?.number]);

  // Sync download states on load with Completed state
  useEffect(() => {
    const states: { [key: number]: DownloadState } = {};
    downloadedSurahs.forEach((dl) => {
      states[dl.surahNumber] = {
        surahNumber: dl.surahNumber,
        progress: 100,
        status: 'completed',
        reciterId: dl.reciterId,
      };
    });
    setDownloadStates((prev) => ({ ...prev, ...states }));
  }, [downloadedSurahs]);

  // Prefetch and caching helper functions
  const prefetchAyah = async (surah: Surah, index: number, ayah: Ayah) => {
    if (
      prefetchedAyahAudioRef.current &&
      prefetchedAyahAudioRef.current.surahNumber === surah.number &&
      prefetchedAyahAudioRef.current.ayahIndex === index
    ) {
      return;
    }

    let srcUrl = ayah.audio;
    if (srcUrl && srcUrl.startsWith('http://')) {
      srcUrl = srcUrl.replace('http://', 'https://');
    }

    const isDownloaded = downloadedSurahIds.has(surah.number);
    if (isDownloaded) {
      try {
        const blob = await getAudioBlob(reciterId, surah.number, ayah.numberInSurah);
        if (blob) {
          srcUrl = URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('Could not retrieve offline blob for prefetch', err);
      }
    }

    if (srcUrl) {
      prefetchedAyahAudioRef.current = {
        surahNumber: surah.number,
        ayahIndex: index,
        url: srcUrl,
      };

      try {
        const preloadAudio = new Audio();
        preloadAudio.src = srcUrl;
        preloadAudio.preload = 'auto';
        preloadAudio.load();
        preloadAudioObjRef.current = preloadAudio;
      } catch (e) {
        console.warn('Failed to trigger browser preload:', e);
      }
    }
  };

  const prefetchNextAyah = async (surah: Surah, currentIndex: number, ayahsOverride?: Ayah[]) => {
    const currentAyahsList = ayahsOverride || selectedSurahAyahs;
    const nextIndex = currentIndex + 1;
    if (nextIndex >= currentAyahsList.length) {
      if (repeatMode === 'surah') {
        const nextAyah = currentAyahsList[0];
        if (nextAyah) {
          await prefetchAyah(surah, 0, nextAyah);
        }
      }
      return;
    }

    const nextAyah = currentAyahsList[nextIndex];
    if (nextAyah) {
      await prefetchAyah(surah, nextIndex, nextAyah);
    }
  };

  // Translation audio and speech synthesis helpers
  const getTranslationAudioUrl = (surahNumber: number, ayahNumberInSurah: number, translationId: string, globalAyahNumber: number) => {
    let audioEditionId = '';
    if (translationId.startsWith('ur.')) {
      audioEditionId = 'ur.khan';
    } else if (translationId.startsWith('en.')) {
      audioEditionId = 'en.walk';
    } else if (translationId.startsWith('fr.')) {
      audioEditionId = 'fr.leclerc';
    } else if (translationId.startsWith('zh.')) {
      audioEditionId = 'zh.chinese';
    } else if (translationId.startsWith('ru.')) {
      audioEditionId = 'ru.kuliev-audio';
    } else if (translationId.startsWith('kk.')) {
      audioEditionId = 'kk.khalifahaltai-audio';
    }

    if (audioEditionId) {
      const bitrate = audioEditionId === 'ur.khan' ? '64' : '192';
      return `https://cdn.islamic.network/quran/audio/${bitrate}/${audioEditionId}/${globalAyahNumber}.mp3`;
    }
    return '';
  };

  const speakTranslation = (text: string, langCode: string, onEnd: () => void) => {
    if (!('speechSynthesis' in window)) {
      onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[()\[\]]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);

    let voiceLang = 'en-US';
    if (langCode.startsWith('ur')) voiceLang = 'ur-PK';
    else if (langCode.startsWith('id')) voiceLang = 'id-ID';
    else if (langCode.startsWith('fr')) voiceLang = 'fr-FR';
    else if (langCode.startsWith('tr')) voiceLang = 'tr-TR';
    else if (langCode.startsWith('zh')) voiceLang = 'zh-CN';
    else if (langCode.startsWith('ru')) voiceLang = 'ru-RU';
    else if (langCode.startsWith('kk')) voiceLang = 'kk-KZ';

    utterance.lang = voiceLang;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(voiceLang.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      onEnd();
    };

    utterance.onerror = () => {
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  const playTranslationForAyah = async (surah: Surah, index: number) => {
    if (!audioRef.current || !selectedSurahAyahs[index]) return;

    const ayah = selectedSurahAyahs[index];
    const transAudioUrl = getTranslationAudioUrl(surah.number, ayah.numberInSurah, translationId, ayah.number);

    if (transAudioUrl) {
      setIsPlayingTranslation(true);
      audioRef.current.src = transAudioUrl;
      audioRef.current.playbackRate = playbackSpeed;
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error playing translation audio:', err);
        playTranslationTTS(ayah);
      }
    } else {
      playTranslationTTS(ayah);
    }
  };

  const playTranslationTTS = (ayah: Ayah) => {
    setIsPlayingTranslation(true);
    setIsPlaying(true);
    speakTranslation(ayah.translationText, translationId, () => {
      onTranslationEnded();
    });
  };

  const onTranslationEnded = () => {
    setIsPlayingTranslation(false);
    if (repeatMode === 'ayah') {
      if (activeAudioSurah && activeAyahIndex !== null) {
        playAyahAt(activeAudioSurah, activeAyahIndex, true);
      }
    } else {
      handleNextAyah();
    }
  };

  // Audio Playback Engine
  const playAyahAt = async (surah: Surah, index: number, autoStart: boolean = true, ayahsOverride?: Ayah[]) => {
    const currentAyahsList = ayahsOverride || selectedSurahAyahs;
    if (!audioRef.current || !currentAyahsList[index]) return;

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTranslation(false);

    const ayah = currentAyahsList[index];
    setActiveAudioSurah(surah);
    setActiveAyahIndex(index);

    let srcUrl = '';

    // Check if we have a prefetched URL for this exact surah and ayah index
    if (
      prefetchedAyahAudioRef.current &&
      prefetchedAyahAudioRef.current.surahNumber === surah.number &&
      prefetchedAyahAudioRef.current.ayahIndex === index
    ) {
      srcUrl = prefetchedAyahAudioRef.current.url;
    } else {
      // Fallback if not prefetched
      const isDownloaded = downloadedSurahIds.has(surah.number);
      srcUrl = ayah.audio;
      if (srcUrl && srcUrl.startsWith('http://')) {
        srcUrl = srcUrl.replace('http://', 'https://');
      }

      if (isDownloaded) {
        // Fetch stored offline blob
        try {
          const blob = await getAudioBlob(reciterId, surah.number, ayah.numberInSurah);
          if (blob) {
            srcUrl = URL.createObjectURL(blob);
          }
        } catch (err) {
          console.warn('Could not retrieve offline blob, falling back to CDN streaming', err);
        }
      }
    }

    const oldUrl = currentObjectUrlRef.current;
    audioRef.current.src = srcUrl;
    audioRef.current.playbackRate = playbackSpeed;
    currentObjectUrlRef.current = srcUrl.startsWith('blob:') ? srcUrl : null;

    if (oldUrl && oldUrl.startsWith('blob:') && oldUrl !== srcUrl) {
      setTimeout(() => {
        try {
          URL.revokeObjectURL(oldUrl);
        } catch (e) {}
      }, 1000);
    }

    if (autoStart) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Error starting audio playback:', err);
        setIsPlaying(false);
      }
    }

    // Trigger prefetch for the next ayah in the background immediately
    prefetchNextAyah(surah, index, currentAyahsList);
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    // Check if the current translation doesn't have an audio file (using TTS)
    const transAudioUrl = (activeAudioSurah && activeAyahIndex !== null && selectedSurahAyahs[activeAyahIndex])
      ? getTranslationAudioUrl(activeAudioSurah.number, selectedSurahAyahs[activeAyahIndex].numberInSurah, translationId, selectedSurahAyahs[activeAyahIndex].number)
      : '';
    const isUsingTTS = isPlayingTranslation && !transAudioUrl;

    if (isPlaying) {
      if (isUsingTTS) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      } else {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (isUsingTTS) {
        if (activeAudioSurah && activeAyahIndex !== null && selectedSurahAyahs[activeAyahIndex]) {
          playTranslationTTS(selectedSurahAyahs[activeAyahIndex]);
        }
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Error resuming playback:', err);
        });
      }
    }
  };

  const handleNextAyah = () => {
    if (activeAyahIndex === null || !activeAudioSurah || selectedSurahAyahs.length === 0) return;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTranslation(false);

    const nextIndex = activeAyahIndex + 1;
    if (nextIndex < selectedSurahAyahs.length) {
      playAyahAt(activeAudioSurah, nextIndex, true);
    } else {
      // Last verse of Surah
      if (repeatMode === 'surah') {
        playAyahAt(activeAudioSurah, 0, true);
      } else {
        setIsPlaying(false);
        setActiveAyahIndex(null);
      }
    }
  };

  const handlePrevAyah = () => {
    if (activeAyahIndex === null || !activeAudioSurah) return;
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTranslation(false);

    const prevIndex = activeAyahIndex - 1;
    if (prevIndex >= 0) {
      playAyahAt(activeAudioSurah, prevIndex, true);
    } else {
      // Loop or restart first ayah
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleClosePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTranslation(false);
    setIsPlaying(false);
    setActiveAudioSurah(null);
    setActiveAyahIndex(null);

    // Clean up prefetch resources
    prefetchedAyahAudioRef.current = null;
    preloadAudioObjRef.current = null;
    if (currentObjectUrlRef.current && currentObjectUrlRef.current.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(currentObjectUrlRef.current);
      } catch (e) {}
    }
    currentObjectUrlRef.current = null;
  };

  // Hook Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (isPlayingTranslation) {
        onTranslationEnded();
      } else {
        if (playTranslation) {
          if (activeAudioSurah && activeAyahIndex !== null) {
            playTranslationForAyah(activeAudioSurah, activeAyahIndex);
          } else {
            handleNextAyah();
          }
        } else {
          if (repeatMode === 'ayah') {
            audio.currentTime = 0;
            audio.play().catch((err) => console.error(err));
          } else {
            handleNextAyah();
          }
        }
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onDurationChange = () => {
      setDuration(audio.duration || 0);
    };

    const onError = (e: any) => {
      console.error('Audio element error:', e);
      setIsPlaying(false);
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('error', onError);
    };
  }, [activeAyahIndex, activeAudioSurah, selectedSurahAyahs, repeatMode, playbackSpeed, isPlayingTranslation, playTranslation, translationId]);

  // Bookmarking implementation
  const isBookmarked = (ayahNumber: number) => {
    if (!selectedSurah) return false;
    return bookmarks.some(
      (b) => b.surahNumber === selectedSurah.number && b.ayahNumber === ayahNumber
    );
  };

  const handleToggleBookmark = (ayahNumber: number) => {
    if (!selectedSurah) return;

    const exists = isBookmarked(ayahNumber);
    let updated: Bookmark[];

    if (exists) {
      updated = bookmarks.filter(
        (b) => !(b.surahNumber === selectedSurah.number && b.ayahNumber === ayahNumber)
      );
    } else {
      const newBookmark: Bookmark = {
        surahNumber: selectedSurah.number,
        ayahNumber,
        surahName: selectedSurah.name,
        englishName: selectedSurah.englishName,
        timestamp: Date.now(),
      };
      updated = [...bookmarks, newBookmark];
    }
    saveBookmarksList(updated);
  };

  const handleRemoveBookmark = (surahNumber: number, ayahNumber?: number) => {
    const updated = bookmarks.filter(
      (b) => !(b.surahNumber === surahNumber && b.ayahNumber === ayahNumber)
    );
    saveBookmarksList(updated);
  };

  const handleSelectBookmark = (bookmark: Bookmark) => {
    // Locate the Surah
    const found = surahs.find((s) => s.number === bookmark.surahNumber);
    if (found) {
      setSelectedSurah(found);
      loadSurahDetails(found).then(() => {
        // Find index of the bookmarked verse
        if (bookmark.ayahNumber) {
          // If we have verses loaded, find and play
          const index = bookmark.ayahNumber - 1; // 1-indexed conversion
          setTimeout(() => {
            playAyahAt(found, index, true);
          }, 350);
        }
      });
    }
  };

  // Download management
  const handleDownloadSurah = async (surahNumber: number) => {
    setDownloadStates((prev) => ({
      ...prev,
      [surahNumber]: {
        surahNumber,
        progress: 0,
        status: 'downloading',
        reciterId,
      },
    }));

    try {
      await downloadSurah(surahNumber, reciterId, translationId, (progress) => {
        setDownloadStates((prev) => ({
          ...prev,
          [surahNumber]: {
            ...prev[surahNumber],
            progress,
            status: progress === 100 ? 'completed' : 'downloading',
          },
        }));
      });

      await refreshDownloadsList();
    } catch (err) {
      console.error('Offline download failed:', err);
      setDownloadStates((prev) => ({
        ...prev,
        [surahNumber]: {
          surahNumber,
          progress: 0,
          status: 'error',
        },
      }));
    }
  };

  const handleDeleteDownload = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteDownloadedSurah(
        deleteConfirm.surahNumber,
        deleteConfirm.reciterId,
        deleteConfirm.translationId,
        deleteConfirm.totalAyahs
      );

      // Reset state
      setDownloadStates((prev) => {
        const next = { ...prev };
        delete next[deleteConfirm.surahNumber];
        return next;
      });

      await refreshDownloadsList();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete offline files failed:', err);
    }
  };

  const handlePlayDownloaded = (sNum: number, rId: string, tId: string) => {
    const found = surahs.find((s) => s.number === sNum);
    if (found) {
      setSelectedSurah(found);
      loadSurahDetails(found).then(() => {
        setTimeout(() => {
          playAyahAt(found, 0, true);
        }, 350);
      });
    }
  };

  const handleStartBulkDownload = async () => {
    if (isLoadingSurahs || surahs.length === 0) return;
    
    bulkDownloadCancelRef.current = false;
    
    // Find the first surah that is NOT downloaded for the current reciterId and translationId
    let startIndex = -1;
    for (let i = 0; i < surahs.length; i++) {
      const isDl = downloadedSurahs.some(
        (dl) => dl.surahNumber === surahs[i].number && dl.reciterId === reciterId && dl.translationId === translationId
      );
      if (!isDl) {
        startIndex = i;
        break;
      }
    }
    
    // If all are already downloaded
    if (startIndex === -1) {
      setErrorMessage("All chapters are already downloaded for the selected reciter.");
      return;
    }
    
    const countSaved = downloadedSurahs.filter(
      (dl) => dl.reciterId === reciterId && dl.translationId === translationId
    ).length;

    setBulkDownloadState({
      isActive: true,
      currentSurahNumber: surahs[startIndex].number,
      currentSurahName: surahs[startIndex].englishName,
      progress: 0,
      downloadedCount: countSaved,
      totalCount: surahs.length,
    });

    // Run the loop in a non-blocking timeout
    setTimeout(() => {
      runBulkDownloadLoop(startIndex);
    }, 100);
  };

  const runBulkDownloadLoop = async (startIndex: number) => {
    let index = startIndex;
    
    while (index < surahs.length) {
      if (bulkDownloadCancelRef.current) {
        break;
      }
      
      const surah = surahs[index];
      
      // Check if already downloaded for the CURRENT settings
      const isAlreadyDownloaded = downloadedSurahs.some(
        (dl) => dl.surahNumber === surah.number && dl.reciterId === reciterId && dl.translationId === translationId
      );
      
      if (isAlreadyDownloaded) {
        index++;
        continue;
      }
      
      const countSaved = downloadedSurahs.filter(
        (dl) => dl.reciterId === reciterId && dl.translationId === translationId
      ).length;

      // Update bulk progress state for current surah
      setBulkDownloadState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          isActive: true,
          currentSurahNumber: surah.number,
          currentSurahName: surah.englishName,
          progress: 0,
          downloadedCount: countSaved,
        };
      });
      
      // Set individual download state to downloading
      setDownloadStates((prev) => ({
        ...prev,
        [surah.number]: {
          surahNumber: surah.number,
          progress: 0,
          status: 'downloading',
          reciterId,
        },
      }));
      
      try {
        await downloadSurah(surah.number, reciterId, translationId, (progress) => {
          if (bulkDownloadCancelRef.current) return;
          
          setBulkDownloadState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              progress,
            };
          });
          
          setDownloadStates((prev) => ({
            ...prev,
            [surah.number]: {
              ...prev[surah.number],
              progress,
              status: progress === 100 ? 'completed' : 'downloading',
            },
          }));
        });
        
        // Refresh downloaded list from DB
        const freshList = await getAllDownloadedSurahs();
        setDownloadedSurahs(freshList);
        
        index++;
      } catch (err) {
        console.error(`Bulk download failed for Surah ${surah.number}:`, err);
        
        setDownloadStates((prev) => ({
          ...prev,
          [surah.number]: {
            surahNumber: surah.number,
            progress: 0,
            status: 'error',
          },
        }));
        
        // Wait 2s and move on
        await new Promise((resolve) => setTimeout(resolve, 2000));
        index++;
      }
    }
    
    // Clear bulk download state when completely finished
    setBulkDownloadState(null);
    const finalFreshList = await getAllDownloadedSurahs();
    setDownloadedSurahs(finalFreshList);
  };

  const handleCancelBulkDownload = () => {
    bulkDownloadCancelRef.current = true;
    setBulkDownloadState(null);
  };

  // Dynamic names
  const activeReciterName = RECITERS.find((r) => r.id === reciterId)?.englishName || reciterId;
  const activeTranslationName = TRANSLATIONS.find((t) => t.id === translationId)?.englishName || translationId;

  return (
    <div className="w-full min-h-screen bg-bg-outer flex items-center justify-center p-0 md:p-6 font-sans relative overflow-hidden transition-colors duration-300">
      {/* Hidden Audio Player */}
      <audio ref={audioRef} />

      {/* Main Responsive Layout Wrapper (Designed as an Android Mockup) */}
      <div className="w-full max-w-md h-[100dvh] md:h-[780px] bg-bg-app md:rounded-[40px] md:shadow-2xl border-0 md:border-[10px] md:border-bg-input relative flex flex-col overflow-hidden z-10 transition-colors duration-300">
        {/* Atmospheric Background Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[320px] h-[320px] bg-emerald-950/45 rounded-full blur-[90px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[320px] h-[320px] bg-emerald-900/10 rounded-full blur-[90px] pointer-events-none z-0"></div>

        {/* Status Area / Screen Header */}
        <div className="bg-bg-header/95 text-text-primary px-6 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-3 md:px-8 md:pt-6 md:pb-3 flex justify-between items-center text-xs font-bold tracking-wider select-none shrink-0 border-b border-emerald-900/30 z-10 transition-colors duration-300">
          <div className="flex items-center space-x-1">
            <span className="text-[10px] bg-emerald-950/40 border border-emerald-500/20 text-emerald-400 py-0.5 px-2 rounded font-extrabold uppercase tracking-widest">
              AL-QURAN
            </span>
          </div>
          <div className="flex items-center space-x-2.5">
            <div className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider">
              {downloadedSurahIds.size > 0 ? 'Offline Playback Enabled' : 'Select Mode'}
            </div>
            <button
              onClick={toggleTheme}
              className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 active:scale-95 transition-all cursor-pointer flex items-center justify-center border border-emerald-500/20"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Dynamic Pages Render */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {selectedSurah ? (
              /* Detail View */
              <motion.div
                key="detail-panel"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.22 }}
                className="absolute inset-0 z-10"
              >
                <SurahDetail
                  surah={selectedSurah}
                  ayahs={selectedSurahAyahs}
                  isLoading={isLoadingDetail}
                  activeAyahIndex={activeAudioSurah?.number === selectedSurah.number ? activeAyahIndex : null}
                  isPlaying={isPlaying}
                  downloadState={downloadStates[selectedSurah.number] || { surahNumber: selectedSurah.number, progress: 0, status: 'idle' }}
                  isBookmarked={isBookmarked}
                  onToggleBookmark={handleToggleBookmark}
                  onPlayAyah={(idx) => playAyahAt(selectedSurah, idx, true)}
                  onPlayAll={() => playAyahAt(selectedSurah, 0, true)}
                  onPause={handlePlayPause}
                  onBack={() => setSelectedSurah(null)}
                  onDownload={() => handleDownloadSurah(selectedSurah.number)}
                  onDeleteDownload={() =>
                    setDeleteConfirm({
                      surahNumber: selectedSurah.number,
                      reciterId,
                      translationId,
                      totalAyahs: selectedSurahAyahs.length,
                      surahName: selectedSurah.englishName,
                    })
                  }
                  reciterName={activeReciterName}
                  translationName={activeTranslationName}
                  translationId={translationId}
                  arabicFontSize={arabicFontSize}
                  translationFontSize={translationFontSize}
                  arabicLineSpacing={arabicLineSpacing}
                  initialViewMode={activeTab === 'read' ? '15lines' : 'translation'}
                />
              </motion.div>
            ) : (
              /* Tabbed Directory View */
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {activeTab === 'surahs' && (
                  <div className="flex flex-col h-full">
                    {/* Brand Banner */}
                    <div className="bg-bg-header/60 backdrop-blur-md border-b border-emerald-900/30 text-text-primary px-6 py-5 md:px-8 flex justify-between items-center relative overflow-hidden select-none shrink-0 transition-colors duration-300">
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-2 text-emerald-500">
                         <svg viewBox="0 0 100 100" className="w-20 h-20 fill-none stroke-emerald-500 stroke-[0.35]">
                           <circle cx="50" cy="50" r="45" />
                           <circle cx="50" cy="50" r="35" />
                         </svg>
                      </div>
                      <div className="relative z-10">
                        <h1 className="font-serif text-2xl font-bold tracking-wide text-emerald-400">
                          القرآن الكريم
                        </h1>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                          Noble Quran Recitation
                        </p>
                      </div>
                    </div>

                    {/* Surahs Explorer */}
                    {isLoadingSurahs ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-700 mb-3"></div>
                        <p className="text-stone-500 text-xs font-semibold">Loading Chapters list...</p>
                      </div>
                    ) : (
                      <SurahList
                        surahs={surahs}
                        downloadedSurahIds={downloadedSurahIds}
                        onSelectSurah={handleSelectSurah}
                        activeSurahNumber={activeAudioSurah?.number}
                        onVoiceSearchSelectAyah={handleSelectAndPlayAyah}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'read' && (
                  <div className="flex flex-col h-full">
                    {/* Brand Banner */}
                    <div className="bg-bg-header/60 backdrop-blur-md border-b border-emerald-900/30 text-text-primary px-6 py-5 md:px-8 flex justify-between items-center relative overflow-hidden select-none shrink-0 transition-colors duration-300">
                      <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-y-2 text-emerald-500">
                         <svg viewBox="0 0 100 100" className="w-20 h-20 fill-none stroke-emerald-500 stroke-[0.35]">
                           <circle cx="50" cy="50" r="45" />
                           <circle cx="50" cy="50" r="35" />
                         </svg>
                      </div>
                      <div className="relative z-10">
                        <h1 className="font-serif text-2xl font-bold tracking-wide text-emerald-400">
                          القرآن الكريم
                        </h1>
                        <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                          Read Quran (15-Line Mushaf)
                        </p>
                      </div>
                    </div>

                    {/* Surahs Explorer */}
                    {isLoadingSurahs ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-700 mb-3"></div>
                        <p className="text-stone-500 text-xs font-semibold">Loading Chapters list...</p>
                      </div>
                    ) : (
                      <SurahList
                        surahs={surahs}
                        downloadedSurahIds={downloadedSurahIds}
                        onSelectSurah={handleSelectSurah}
                        activeSurahNumber={activeAudioSurah?.number}
                        onVoiceSearchSelectAyah={handleSelectAndPlayAyah}
                      />
                    )}
                  </div>
                )}

                {activeTab === 'bookmarks' && (
                  <BookmarksTab
                    bookmarks={bookmarks}
                    onSelectBookmark={handleSelectBookmark}
                    onRemoveBookmark={handleRemoveBookmark}
                  />
                )}

                {activeTab === 'downloads' && (
                  <div className="flex flex-col h-full bg-bg-app overflow-y-auto px-4 py-4 pb-28 space-y-4 text-text-primary transition-colors duration-300">
                    <div className="bg-bg-card border border-emerald-900/30 rounded-2xl p-4.5 transition-colors duration-300">
                      <div className="flex items-center space-x-3">
                        <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                          <Download className="w-5 h-5" />
                        </span>
                        <div>
                          <h2 className="text-sm font-bold text-emerald-100">Saved Chapters</h2>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Read and listen offline without cellular data usage.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bulk Download Manager for selected reciter */}
                    <div className="bg-bg-card border border-emerald-900/30 rounded-2xl p-4.5 relative overflow-hidden transition-colors duration-300">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-3">
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-0.5 px-2 rounded-md font-extrabold uppercase tracking-widest">
                            Full Quran Download
                          </span>
                          <h3 className="text-sm font-bold text-emerald-100 mt-2">
                            Download Entire Quran
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                            Save all 114 chapters for <span className="text-emerald-400 font-semibold">{activeReciterName}</span> to listen offline.
                          </p>
                          <div className="mt-2 text-xs font-bold text-emerald-300">
                            Saved: {downloadedSurahs.filter((dl) => dl.reciterId === reciterId && dl.translationId === translationId).length} / 114 Chapters
                          </div>
                        </div>

                        {bulkDownloadState?.isActive ? (
                          <button
                            id="bulk-dl-cancel-btn"
                            onClick={handleCancelBulkDownload}
                            className="shrink-0 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl active:scale-95 transition-all text-xs font-bold"
                          >
                            Stop
                          </button>
                        ) : (
                          downloadedSurahs.filter((dl) => dl.reciterId === reciterId && dl.translationId === translationId).length === 114 ? (
                            <span className="shrink-0 p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-extrabold">
                              Completed
                            </span>
                          ) : (
                            <button
                              id="bulk-dl-start-btn"
                              onClick={handleStartBulkDownload}
                              className="shrink-0 p-2 bg-emerald-500 hover:bg-emerald-400 text-[#080A09] rounded-xl active:scale-95 transition-all font-bold flex items-center space-x-1"
                              disabled={isLoadingSurahs}
                            >
                              <Download className="w-4 h-4" />
                              <span className="text-xs">Save All</span>
                            </button>
                          )
                        )}
                      </div>

                      {bulkDownloadState?.isActive && (
                        <div className="mt-4 pt-3 border-t border-emerald-900/20">
                          <div className="flex justify-between items-center text-[10px] mb-1.5 font-bold uppercase tracking-wider text-emerald-400">
                            <span className="truncate max-w-[200px]">
                              Downloading: {bulkDownloadState.currentSurahNumber}. {bulkDownloadState.currentSurahName}
                            </span>
                            <span>{bulkDownloadState.progress}%</span>
                          </div>
                          {/* Visual progress bar wrapper */}
                          <div className="w-full h-1.5 bg-emerald-950/55 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                              style={{ width: `${bulkDownloadState.progress}%` }}
                            ></div>
                          </div>
                          {/* Overall count progress */}
                          <div className="mt-1 flex justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>Chapter {bulkDownloadState.currentSurahNumber} of 114</span>
                            <span>{Math.round((bulkDownloadState.downloadedCount / 114) * 100)}% overall</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {downloadedSurahs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-bg-card border border-emerald-900/20 rounded-2xl p-6 transition-colors duration-300">
                        <Download className="w-10 h-10 text-emerald-900/30 mb-2" />
                        <p className="text-xs font-semibold text-slate-350">No Offline Files</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] leading-relaxed">
                          Browse chapters and select "Save Offline" on any Surah's verse sheet.
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        {downloadedSurahs.map((dl) => (
                          <div
                            key={`${dl.surahNumber}_${dl.reciterId}`}
                            className="bg-bg-card border border-emerald-900/20 hover:border-emerald-500/40 hover:bg-bg-active rounded-2xl p-3.5 flex items-center justify-between text-slate-300 transition-all duration-300"
                          >
                            <div 
                              className="flex items-center space-x-3.5 min-w-0 flex-1 cursor-pointer"
                              onClick={() => handlePlayDownloaded(dl.surahNumber, dl.reciterId, dl.translationId)}
                            >
                              <div className="w-9 h-9 bg-emerald-950 border border-emerald-500/20 flex items-center justify-center rounded-xl shrink-0">
                                <span className="font-serif text-sm text-emerald-450">📖</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-emerald-100 tracking-tight truncate">
                                  {dl.surahMetadata.englishName}
                                </span>
                                <span className="text-[10px] text-slate-400 mt-0.5 truncate font-semibold">
                                  {dl.surahMetadata.englishNameTranslation} • {dl.ayahs.length} Verses
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 shrink-0 ml-3">
                              <button
                                id={`play-dl-page-${dl.surahNumber}`}
                                onClick={() => handlePlayDownloaded(dl.surahNumber, dl.reciterId, dl.translationId)}
                                className="p-2 bg-emerald-500 text-[#080A09] rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                              >
                                <PlayCircle className="w-4 h-4 fill-[#080A09] text-[#080A09]" />
                              </button>
                              <button
                                id={`delete-dl-page-${dl.surahNumber}`}
                                onClick={() =>
                                  setDeleteConfirm({
                                    surahNumber: dl.surahNumber,
                                    reciterId: dl.reciterId,
                                    translationId: dl.translationId,
                                    totalAyahs: dl.ayahs.length,
                                    surahName: dl.surahMetadata.englishName,
                                  })
                                }
                                className="p-2 bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl active:scale-95 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'settings' && (
                  <SettingsPanel
                    currentReciterId={reciterId}
                    onSelectReciter={handleSelectReciter}
                    currentTranslationId={translationId}
                    onSelectTranslation={handleSelectTranslation}
                    downloadedSurahs={downloadedSurahs}
                    onPlayDownloaded={handlePlayDownloaded}
                    onDeleteDownloaded={(sNum, rId, tId, total) => {
                      const dl = downloadedSurahs.find((d) => d.surahNumber === sNum);
                      setDeleteConfirm({
                        surahNumber: sNum,
                        reciterId: rId,
                        translationId: tId,
                        totalAyahs: total,
                        surahName: dl ? dl.surahMetadata.englishName : 'Selected Surah',
                      });
                    }}
                    playTranslation={playTranslation}
                    onTogglePlayTranslation={handleTogglePlayTranslation}
                    arabicFontSize={arabicFontSize}
                    onChangeArabicFontSize={handleChangeArabicFontSize}
                    translationFontSize={translationFontSize}
                    onChangeTranslationFontSize={handleChangeTranslationFontSize}
                    arabicLineSpacing={arabicLineSpacing}
                    onChangeArabicLineSpacing={handleChangeArabicLineSpacing}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Persistent Bottom Audio Player Container */}
        {activeAudioSurah && activeAyahIndex !== null && selectedSurahAyahs[activeAyahIndex] && (
          <AudioPlayer
            surah={activeAudioSurah}
            ayah={selectedSurahAyahs[activeAyahIndex]}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onNext={handleNextAyah}
            onPrev={handlePrevAyah}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            playbackSpeed={playbackSpeed}
            onSpeedChange={handleSpeedChange}
            repeatMode={repeatMode}
            onRepeatChange={setRepeatMode}
            reciterName={activeReciterName}
            isOffline={downloadedSurahIds.has(activeAudioSurah.number)}
            onClose={handleClosePlayer}
            playTranslation={playTranslation}
            onTogglePlayTranslation={handleTogglePlayTranslation}
            isPlayingTranslation={isPlayingTranslation}
            translationId={translationId}
          />
        )}

        {/* Global Bottom Tab Navigation */}
        {!selectedSurah && (
          <div className="bg-bg-header/95 backdrop-blur-md border-t border-emerald-900/30 p-2.5 flex justify-around items-center absolute bottom-0 left-0 right-0 z-30 select-none shadow-[0_-10px_40px_rgba(0,0,0,0.55)] transition-colors duration-300">
            <button
              id="tab-btn-surahs"
              onClick={() => setActiveTab('surahs')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                activeTab === 'surahs' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-500/80'
              }`}
            >
              <BookOpen className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 tracking-wider uppercase font-semibold">Quran</span>
            </button>

            <button
              id="tab-btn-read"
              onClick={() => setActiveTab('read')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                activeTab === 'read' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-500/80'
              }`}
            >
              <Book className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 tracking-wider uppercase font-semibold">Read Quran</span>
            </button>

            <button
              id="tab-btn-bookmarks"
              onClick={() => setActiveTab('bookmarks')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                activeTab === 'bookmarks' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-500/80'
              }`}
            >
              <BookmarkIcon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 tracking-wider uppercase font-semibold">Bookmarks</span>
            </button>

            <button
              id="tab-btn-downloads"
              onClick={() => setActiveTab('downloads')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                activeTab === 'downloads' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-500/80'
              }`}
            >
              <Download className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 tracking-wider uppercase font-semibold">Saved</span>
            </button>

            <button
              id="tab-btn-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center py-1 px-3 rounded-2xl transition-all ${
                activeTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-500 hover:text-emerald-500/80'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className="text-[10px] mt-1 tracking-wider uppercase font-semibold">Settings</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <div className="absolute inset-0 bg-bg-outer/85 backdrop-blur-sm flex items-center justify-center p-4 z-55 transition-colors duration-300">
              <motion.div
                initial={{ scale: 0.93, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.93, opacity: 0 }}
                className="bg-bg-card border border-emerald-900/40 rounded-3xl p-5 w-full max-w-xs shadow-2xl text-center shadow-emerald-950/50 text-text-primary transition-colors duration-300"
              >
                <div className="w-12 h-12 bg-red-950/40 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-3.5">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-sm text-emerald-100">Remove Offline Download?</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Are you sure you want to delete the audio and translation files for <strong>{deleteConfirm.surahName}</strong> from your device storage?
                </p>
                <div className="flex space-x-2.5 mt-5">
                  <button
                    id="cancel-delete-btn"
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 bg-bg-input hover:bg-bg-active border border-emerald-900/30 text-slate-300 active:scale-98 rounded-xl text-xs font-bold transition-all transition-colors duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-delete-btn"
                    onClick={handleDeleteDownload}
                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 active:scale-98 rounded-xl text-white text-xs font-bold transition-all shadow-md shadow-red-950/20"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Toast/Error Message Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 bg-stone-900 border border-stone-800 rounded-2xl p-3 flex items-start space-x-3 text-white z-50 shadow-2xl"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold leading-normal">{errorMessage}</p>
                <button
                  id="close-error-toast"
                  onClick={() => setErrorMessage(null)}
                  className="text-[10px] text-amber-400 font-bold hover:underline mt-1"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
