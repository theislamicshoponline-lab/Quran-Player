/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Surah } from '../types';
import { Search, Compass, BookOpen, Music, CheckCircle2, Mic, MicOff, Volume2, Sparkles, AlertCircle, X, Check, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseQuranRef } from '../utils/quranApi';

interface SurahListProps {
  surahs: Surah[];
  downloadedSurahIds: Set<number>;
  onSelectSurah: (surah: Surah) => void;
  activeSurahNumber?: number;
  onVoiceSearchSelectAyah?: (surahNumber: number, ayahNumber: number) => void;
}

export default function SurahList({
  surahs,
  downloadedSurahIds,
  onSelectSurah,
  activeSurahNumber,
  onVoiceSearchSelectAyah,
}: SurahListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Meccan' | 'Medinan'>('all');

  // Voice search state
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'ar-SA' | 'ur-PK'>('en-US');
  const [voiceResult, setVoiceResult] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'listening' | 'processing' | 'success' | 'error'>('idle');
  const [showApkTroubleshoot, setShowApkTroubleshoot] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startSpeechRecognition = () => {
    setVoiceError('');
    setVoiceResult('');
    setShowApkTroubleshoot(false);
    setVoiceStatus('listening');
    setIsListening(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatus('error');
      setVoiceError('Speech recognition is not supported in this browser. Please use Chrome or Edge, or use our simulation test scenarios below.');
      setIsListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = speechLanguage;

      rec.onstart = () => {
        setVoiceStatus('listening');
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        setVoiceResult(resultText);
        setVoiceStatus('processing');
        processVoiceSearch(resultText);
      };

      rec.onerror = (event: any) => {
        console.error('Speech error:', event.error);
        setVoiceStatus('error');
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please allow microphone access in your browser or iframe frame permissions.');
        } else {
          setVoiceError(`Voice detection failed: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err: any) {
      console.error('Speech initialization error:', err);
      setVoiceStatus('error');
      setVoiceError('Could not launch speech recognition client.');
      setIsListening(false);
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setVoiceStatus('idle');
  };

  const processVoiceSearch = (text: string) => {
    if (!onVoiceSearchSelectAyah) return;
    const result = parseQuranRef(text, surahs);
    if (result) {
      setVoiceStatus('success');
      const matchedSurah = surahs.find(s => s.number === result.surahNumber);
      setVoiceResult(`"${text}" → Found ${matchedSurah?.englishName} Ayah ${result.ayahNumber}`);
      setTimeout(() => {
        onVoiceSearchSelectAyah(result.surahNumber, result.ayahNumber);
        setShowVoiceModal(false);
        setVoiceStatus('idle');
      }, 1500);
    } else {
      setVoiceStatus('error');
      setVoiceError(`Could not pinpoint verse from: "${text}". Try saying "Surah Fatihah Verse 5" or "Surah 2 Verse 255"`);
    }
  };

  const filteredSurahs = useMemo(() => {
    if (!searchQuery.trim()) {
      return surahs.filter(surah => filterType === 'all' || surah.revelationType === filterType);
    }

    const lowerQuery = searchQuery.toLowerCase().trim();

    // 1. Strip all numbers and surah/verse keywords to get the pure name query for spelling matches
    let nameQueryOnly = lowerQuery
      .replace(/(?:surah|sura|surat|chapter|ch|سورة|سورہ|آیت|ayat|verse|ayah|v)\s*/gi, '')
      .replace(/\d+/g, '') // remove numbers
      .replace(/[^a-z0-9أ-ي]/g, '') // remove punctuation/whitespace
      .trim();

    // Phonetic normalization for search matching
    nameQueryOnly = nameQueryOnly
      .replace(/yasin/g, 'yaseen')
      .replace(/yaseen/g, 'yasin')
      .replace(/baqara\b/g, 'baqarah')
      .replace(/fatiha\b/g, 'fatihah')
      .replace(/rehman\b/g, 'rahman')
      .replace(/mulkh\b/g, 'mulk')
      .replace(/sajda\b/g, 'sajdah');

    // 2. Extract first number in the query
    const numberQuery = lowerQuery.match(/\d+/);
    const firstNumStr = numberQuery ? numberQuery[0] : '';

    return surahs.filter((surah) => {
      const cleanEngName = surah.englishName.toLowerCase().replace(/[^a-z0-9أ-ي]/g, '');
      const cleanEngTranslation = surah.englishNameTranslation.toLowerCase().replace(/[^a-z0-9أ-ي]/g, '');
      const cleanArabicName = surah.name.replace(/[^أ-ي]/g, '');

      let matchesSearch = false;

      if (nameQueryOnly.length > 0) {
        matchesSearch =
          cleanEngName.includes(nameQueryOnly) ||
          cleanEngTranslation.includes(nameQueryOnly) ||
          cleanArabicName.includes(nameQueryOnly);
      } else if (firstNumStr) {
        // If query is a pure number or reference, match the surah number
        matchesSearch = surah.number.toString() === firstNumStr;
      } else {
        // Fallback standard matching
        matchesSearch =
          surah.englishName.toLowerCase().includes(lowerQuery) ||
          surah.englishNameTranslation.toLowerCase().includes(lowerQuery) ||
          surah.number.toString() === lowerQuery;
      }

      const matchesFilter = filterType === 'all' || surah.revelationType === filterType;

      return matchesSearch && matchesFilter;
    });
  }, [surahs, searchQuery, filterType]);

  return (
    <div className="flex flex-col h-full bg-bg-app text-text-primary relative transition-colors duration-300">
      {/* Voice Modal Overlay */}
      {showVoiceModal && (
        <div className="absolute inset-0 bg-bg-app/98 backdrop-blur-lg z-50 flex flex-col p-5 text-text-primary transition-colors duration-300">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-emerald-900/20 shrink-0">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Quranic Speech Search</span>
            </div>
            <button
              onClick={() => {
                stopSpeechRecognition();
                setShowVoiceModal(false);
              }}
              className="p-1.5 rounded-full hover:bg-emerald-950/40 text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Voice Display Area */}
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center space-y-6">
            <div className="relative flex items-center justify-center">
              {/* Pulsing visual circles */}
              {isListening && (
                <>
                  <div className="absolute w-24 h-24 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
                  <div className="absolute w-32 h-32 rounded-full bg-emerald-500/10 animate-pulse" />
                </>
              )}

              <button
                onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
                className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                  isListening
                    ? 'bg-emerald-500 border-emerald-400 text-[#080A09] shadow-lg shadow-emerald-500/30'
                    : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                }`}
              >
                <Mic className="w-8 h-8" />
              </button>
            </div>

            {/* Listening States */}
            <div className="space-y-1.5 max-w-[280px]">
              {voiceStatus === 'idle' && (
                <>
                  <h3 className="text-sm font-semibold text-slate-250">Tap microphone to search</h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Say any Chapter and Verse (e.g. "Surah Al-Fatihah, Verse 5" or "112 2")
                  </p>
                </>
              )}
              {voiceStatus === 'listening' && (
                <>
                  <h3 className="text-sm font-semibold text-emerald-450 animate-pulse">Listening...</h3>
                  <p className="text-xs text-slate-400 font-serif italic">
                    "Say a surah name or chapter number..."
                  </p>
                </>
              )}
              {voiceStatus === 'processing' && (
                <>
                  <h3 className="text-sm font-semibold text-emerald-400">Searching verse indexes...</h3>
                  <div className="flex justify-center mt-1">
                    <span className="flex space-x-1.5">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </>
              )}
              {voiceStatus === 'success' && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verse Found</span>
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium leading-relaxed">{voiceResult}</p>
                </div>
              )}
              {voiceStatus === 'error' && (
                <div className="bg-red-950/20 border border-red-500/25 rounded-xl p-3 space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center justify-center space-x-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Mic Blocked / Error</span>
                  </h3>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{voiceError}</p>
                  
                  {/* Troubleshooting toggle for APKs */}
                  <div className="pt-1.5 border-t border-red-500/10 text-left">
                    <button
                      onClick={() => setShowApkTroubleshoot(!showApkTroubleshoot)}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer focus:outline-none flex items-center justify-between w-full"
                    >
                      <span>Using an Android APK? Click here</span>
                      <span>{showApkTroubleshoot ? '▲ Hide' : '▼ Show Fix'}</span>
                    </button>
                    
                    {showApkTroubleshoot && (
                      <div className="mt-2 p-2.5 bg-[#0b0e0c] rounded-lg border border-emerald-900/30 space-y-2 max-h-[180px] overflow-y-auto no-scrollbar">
                        <p className="text-[10px] font-semibold text-emerald-200">
                          Why does this happen?
                        </p>
                        <p className="text-[9.5px] text-slate-400 leading-relaxed">
                          Android WebViews block standard web page microphone access by default, even if standard Chrome permits it.
                        </p>
                        <p className="text-[10px] font-semibold text-emerald-200">
                          To fix this in your APK wrapper:
                        </p>
                        <ol className="list-decimal list-inside text-[9.5px] text-slate-400 space-y-1 leading-relaxed">
                          <li>
                            <strong className="text-slate-300">Add Manifest Permission:</strong>
                            <span className="block pl-3 text-[9px] font-mono text-emerald-400 select-all overflow-x-auto bg-black/40 p-1 rounded mt-0.5 whitespace-pre">
                              {`<uses-permission android:name="android.permission.RECORD_AUDIO" />`}
                            </span>
                          </li>
                          <li>
                            <strong className="text-slate-300">Grant Permission in Custom WebView:</strong>
                            <p className="pl-3 mt-0.5">Your Android Java/Kotlin code must intercept and auto-grant permission requests. Add this to your WebChromeClient definition:</p>
                            <pre className="block text-[8.5px] font-mono text-emerald-400 select-all overflow-x-auto bg-black/40 p-1.5 rounded mt-0.5 leading-tight">
{`webView.setWebChromeClient(new WebChromeClient() {
  @Override
  public void onPermissionRequest(PermissionRequest request) {
    request.grant(request.getResources());
  }
});`}
                            </pre>
                          </li>
                          <li>
                            <strong className="text-slate-300">If using Capacitor/Cordova:</strong>
                            <span className="block mt-0.5">Ensure the Microphone plugin is added so that native OS level popup appears to prompt user.</span>
                          </li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Language Selection Toggle */}
            <div className="flex items-center space-x-1.5 bg-bg-input border border-emerald-900/30 p-1 rounded-full shrink-0 transition-colors duration-300">
              <button
                onClick={() => setSpeechLanguage('en-US')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  speechLanguage === 'en-US'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setSpeechLanguage('ar-SA')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  speechLanguage === 'ar-SA'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                العربية
              </button>
              <button
                onClick={() => setSpeechLanguage('ur-PK')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  speechLanguage === 'ur-PK'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                اردو (Urdu)
              </button>
            </div>
          </div>

          {/* Voice Suggestions / Simulated Input Section */}
          <div className="border-t border-emerald-900/20 pt-4 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">
                Interactive Voice Simulations
              </span>
              <span className="text-[9px] text-slate-500 font-medium">Click to search</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left">
              <button
                onClick={() => processVoiceSearch("Surah Baqara Ayat 20")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5">Al-Baqarah (2:20)</div>
                <p className="truncate">"Surah Baqara Ayat 20"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("Surah Al-Fatihah, Verse 5")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5">Al-Fatihah</div>
                <p className="truncate">"Al-Fatihah Verse 5"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("Surah Al-Baqarah, Verse 255")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5">Ayat al-Kursi</div>
                <p className="truncate">"Al-Baqarah 255"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("سورة الإخلاص الآية ٢")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 text-right font-serif duration-300"
              >
                <div className="font-sans font-semibold text-emerald-400 text-[10px] uppercase mb-0.5 text-left">Al-Ikhlas (Ar)</div>
                <p className="truncate">"سورة الإخلاص الآية ٢"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("سورہ الفاتحہ آیت ۵")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 text-right duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5 text-left">Al-Fatihah (Ur)</div>
                <p className="truncate">"سورہ الفاتحہ آیت ۵"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("Surah Yasin")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5">Ya-Sin (Full)</div>
                <p className="truncate">"Surah Yasin"</p>
              </button>

              <button
                onClick={() => processVoiceSearch("Chapter 112, Verse 2")}
                className="p-2.5 bg-bg-card border border-emerald-900/20 rounded-xl hover:border-emerald-500/30 hover:bg-bg-input text-xs transition-all text-slate-300 duration-300"
              >
                <div className="font-semibold text-emerald-400 text-[10px] uppercase mb-0.5">Chapter-Verse</div>
                <p className="truncate">"112 2"</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Header */}
      <div className="p-4 bg-bg-header/80 backdrop-blur-md border-b border-emerald-900/30 sticky top-0 z-10 transition-colors duration-300">
        <div className="relative flex items-center">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-emerald-600">
            <Search className="w-4.5 h-4.5" id="surah-search-icon" />
          </span>
          <input
            id="surah-search-input"
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-bg-input hover:bg-bg-active border border-emerald-900/40 rounded-full text-text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm duration-300"
            placeholder="Search Surah (e.g. Al-Fatihah, 112)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-2 mt-3 overflow-x-auto pb-1 no-scrollbar">
          <button
            id="filter-all"
            onClick={() => setFilterType('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
              filterType === 'all'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-bg-input text-text-secondary border border-emerald-900/20 hover:bg-bg-active'
            }`}
          >
            All Surahs
          </button>
          <button
            id="filter-meccan"
            onClick={() => setFilterType('Meccan')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
              filterType === 'Meccan'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-bg-input text-text-secondary border border-emerald-900/20 hover:bg-bg-active'
            }`}
          >
            Meccan
          </button>
          <button
            id="filter-medinan"
            onClick={() => setFilterType('Medinan')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
              filterType === 'Medinan'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-bg-input text-text-secondary border border-emerald-900/20 hover:bg-bg-active'
            }`}
          >
            Medinan
          </button>
        </div>
      </div>

      {/* Surahs List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-28">
        {/* If search query parses to a specific verse, show a "Go to Verse" card! */}
        {searchQuery.trim().length > 0 && (() => {
          const parsed = parseQuranRef(searchQuery, surahs);
          if (parsed) {
            const matchedSurah = surahs.find(s => s.number === parsed.surahNumber);
            if (matchedSurah) {
              return (
                <motion.button
                  key="search-jump-card"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    if (onVoiceSearchSelectAyah) {
                      onVoiceSearchSelectAyah(parsed.surahNumber, parsed.ayahNumber);
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-2xl text-left bg-gradient-to-r from-emerald-950/60 to-teal-950/60 border border-emerald-500/40 text-text-primary hover:bg-emerald-900/30 transition-all shadow-md mb-2 cursor-pointer"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                      <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">Jump & Recite Verse</span>
                      <span className="font-semibold text-sm text-slate-100">
                        {matchedSurah.englishName} ({parsed.surahNumber}:{parsed.ayahNumber})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 bg-emerald-500 text-[#080A09] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/20">
                    <Play className="w-3 h-3 fill-current" />
                    <span>GO NOW</span>
                  </div>
                </motion.button>
              );
            }
          }
          return null;
        })()}

        {filteredSurahs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-emerald-900/40 mb-2" id="empty-surah-icon" />
            <p className="text-sm font-medium">No Surahs found matching "{searchQuery}"</p>
          </div>
        ) : (
          filteredSurahs.map((surah) => {
            const isDownloaded = downloadedSurahIds.has(surah.number);
            const isActive = activeSurahNumber === surah.number;

            return (
              <motion.button
                key={surah.number}
                id={`surah-row-${surah.number}`}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectSurah(surah)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl text-left border transition-all relative overflow-hidden group duration-300 ${
                  isActive
                    ? 'bg-bg-active border-emerald-500/40 text-text-primary shadow-xl shadow-emerald-950/40'
                    : 'bg-bg-card border-emerald-900/30 text-text-primary hover:bg-bg-active/80 hover:border-emerald-700/40'
                }`}
              >
                {/* Active vertical bar indicator */}
                {isActive && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                )}

                {/* Left Side: Number, Name, Metadata */}
                <div className="flex items-center space-x-3.5 relative z-10">
                  {/* Surah Number Avatar */}
                  <div className={`relative flex items-center justify-center w-11 h-11 shrink-0 font-bold text-xs rounded-full border transition-all ${
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-400 group-hover:bg-emerald-900/30 group-hover:text-emerald-400'
                  }`}>
                    <span className="relative z-10">{surah.number}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className={`font-semibold text-sm tracking-wide ${
                      isActive ? 'text-emerald-100' : 'text-slate-100'
                    }`}>
                      {surah.englishName}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5 tracking-tight font-medium uppercase">
                      {surah.englishNameTranslation} • {surah.numberOfAyahs} Verses
                    </span>
                  </div>
                </div>

                {/* Right Side: Arabic Name & Revelations Info */}
                <div className="flex items-center space-x-2.5 text-right relative z-10">
                  <div className="flex flex-col items-end">
                    <span className={`font-serif text-xl font-medium leading-normal ${
                      isActive ? 'text-emerald-400' : 'text-slate-300 group-hover:text-emerald-400'
                    }`}>
                      {surah.name}
                    </span>
                    <div className="flex items-center mt-0.5 space-x-1.5">
                      {isDownloaded && (
                        <span className="flex items-center text-[9px] text-emerald-300 font-semibold bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase">
                          Offline
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        {surah.revelationType}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
