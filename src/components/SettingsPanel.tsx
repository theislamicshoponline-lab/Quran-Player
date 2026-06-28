/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Reciter, TranslationEdition, DownloadedSurah } from '../types';
import { RECITERS, TRANSLATIONS } from '../utils/quranApi';
import { 
  Settings, User, Languages, Database, CloudLightning, 
  Trash2, Play, Volume2, Info, ExternalLink, ShieldCheck,
  MapPin, Sparkles, ChevronDown, ChevronUp, Music, Pause,
  Type, Minus, Plus
} from 'lucide-react';

interface SettingsPanelProps {
  currentReciterId: string;
  onSelectReciter: (id: string) => void;
  currentTranslationId: string;
  onSelectTranslation: (id: string) => void;
  downloadedSurahs: DownloadedSurah[];
  onPlayDownloaded: (surahNumber: number, reciterId: string, translationId: string) => void;
  onDeleteDownloaded: (surahNumber: number, reciterId: string, translationId: string, totalAyahs: number) => void;
  playTranslation: boolean;
  onTogglePlayTranslation: (enabled: boolean) => void;
  arabicFontSize: number;
  onChangeArabicFontSize: (size: number) => void;
  translationFontSize: number;
  onChangeTranslationFontSize: (size: number) => void;
  arabicLineSpacing: number;
  onChangeArabicLineSpacing: (spacing: number) => void;
}

export default function SettingsPanel({
  currentReciterId,
  onSelectReciter,
  currentTranslationId,
  onSelectTranslation,
  downloadedSurahs,
  onPlayDownloaded,
  onDeleteDownloaded,
  playTranslation,
  onTogglePlayTranslation,
  arabicFontSize,
  onChangeArabicFontSize,
  translationFontSize,
  onChangeTranslationFontSize,
  arabicLineSpacing,
  onChangeArabicLineSpacing,
}: SettingsPanelProps) {
  const [expandedReciterId, setExpandedReciterId] = useState<string | null>(null);
  const [sampleAudio, setSampleAudio] = useState<HTMLAudioElement | null>(null);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (sampleAudio) {
        sampleAudio.pause();
      }
    };
  }, [sampleAudio]);

  const toggleExpandReciter = (reciterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedReciterId(expandedReciterId === reciterId ? null : reciterId);
  };

  const playSample = (reciterId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingSampleId === reciterId) {
      if (sampleAudio) {
        sampleAudio.pause();
      }
      setPlayingSampleId(null);
    } else {
      if (sampleAudio) {
        sampleAudio.pause();
      }
      // Al-Fatihah Ayah 1 (Bismillah) audio URL
      const audioUrl = `https://cdn.alquran.cloud/media/audio/ayah/${reciterId}/1`;
      const audio = new Audio(audioUrl);
      audio.play().catch(err => console.error("Error playing sample:", err));
      setSampleAudio(audio);
      setPlayingSampleId(reciterId);
      audio.onended = () => {
        setPlayingSampleId(null);
      };
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-app overflow-y-auto px-4 py-4 pb-28 space-y-5 text-text-primary transition-colors duration-300">
      {/* App Badge / Intro */}
      <div className="bg-gradient-to-br from-emerald-950 to-bg-card text-text-primary rounded-2xl p-5 border border-emerald-900/30 relative overflow-hidden transition-colors duration-300">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none translate-x-4 -translate-y-4 text-emerald-500">
          <span className="font-serif text-8xl">🕌</span>
        </div>
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-sm font-bold tracking-wide text-emerald-100">App Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Personalize your listening experience by selecting recitation sounds and translations. 
            Downloaded chapters will work 100% offline.
          </p>
        </div>
      </div>

      {/* Reciter Selector Section */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-500 flex items-center space-x-1.5 px-1">
          <User className="w-3.5 h-3.5" />
          <span>Select Reciter</span>
        </h3>
        <div className="grid grid-cols-1 gap-2.5">
          {RECITERS.map((reciter) => {
            const isSelected = reciter.id === currentReciterId;
            const isExpanded = expandedReciterId === reciter.id;
            const isPlayingSample = playingSampleId === reciter.id;

            return (
              <div
                key={reciter.id}
                className={`rounded-2xl border transition-all overflow-hidden duration-300 ${
                  isSelected
                    ? 'bg-bg-active border-emerald-500/40 shadow-xl shadow-emerald-950/40'
                    : 'bg-bg-card border-emerald-900/20 hover:border-emerald-500/20'
                }`}
              >
                {/* Header click selects reciter */}
                <div
                  onClick={() => onSelectReciter(reciter.id)}
                  className="w-full flex items-center justify-between p-3.5 cursor-pointer select-none"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    {/* Selected state indicator dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
                    }`} />
                    <div className="flex flex-col min-w-0">
                      <span className={`text-sm font-semibold tracking-tight ${
                        isSelected ? 'text-emerald-400' : 'text-slate-200'
                      }`}>
                        {reciter.englishName}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {reciter.style || 'Murattal'} Recitation
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`font-serif text-base hidden sm:inline ${
                      isSelected ? 'text-emerald-300' : 'text-slate-400'
                    }`}>
                      {reciter.name}
                    </span>

                    {/* Toggle Profile Button */}
                    <button
                      onClick={(e) => toggleExpandReciter(reciter.id, e)}
                      className={`p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/20 transition-colors`}
                      title="View Profile and Recitation Sample"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Profile & Bio Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-emerald-900/20 bg-bg-header/60 text-xs text-slate-300 space-y-3 transition-colors duration-300">
                    {/* Origin & Audio Sample Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-bg-input/80 p-2.5 rounded-xl border border-emerald-950 transition-colors duration-300">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-semibold text-[11px]">Origin:</span>
                        <span className="text-slate-200 text-[11px] font-medium">{reciter.origin || 'N/A'}</span>
                      </div>
                      
                      {/* Audio Sample Button */}
                      <button
                        onClick={(e) => playSample(reciter.id, e)}
                        className={`flex items-center space-x-1.5 py-1 px-2.5 rounded-lg text-[10px] font-bold transition-all border ${
                          isPlayingSample
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 animate-pulse shadow-md shadow-emerald-500/20'
                            : 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                        }`}
                      >
                        {isPlayingSample ? (
                          <>
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Stop Sample</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Recitation Sample</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Biography */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1 text-emerald-500/90 font-bold tracking-wider text-[10px] uppercase">
                        <User className="w-3 h-3" />
                        <span>Biography</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {reciter.bio}
                      </p>
                    </div>

                    {/* Recitation Style description */}
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center space-x-1 text-emerald-500/90 font-bold tracking-wider text-[10px] uppercase">
                        <Sparkles className="w-3 h-3" />
                        <span>Recitation Style</span>
                      </div>
                      <p className="text-slate-400 leading-relaxed text-[11px] italic font-serif">
                        "{reciter.styleSample}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Options Section */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-500 flex items-center space-x-1.5 px-1">
          <Volume2 className="w-3.5 h-3.5" />
          <span>Playback Options</span>
        </h3>
        <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4 flex items-center justify-between transition-colors duration-300">
          <div className="flex-1 pr-3">
            <span className="text-sm font-semibold text-emerald-100 block">
              Recite Translation Audio
            </span>
            <span className="text-[11px] text-slate-400 mt-1 block leading-relaxed">
              Play selected translation immediately after each Arabic verse recitation. (Uses pre-recorded audio where available, otherwise utilizes high-quality Speech Synthesis).
            </span>
          </div>
          <button
            id="toggle-play-translation-btn"
            onClick={() => onTogglePlayTranslation(!playTranslation)}
            className={`w-12 h-6.5 rounded-full p-1 transition-all duration-300 relative shrink-0 ${
              playTranslation ? 'bg-emerald-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-4.5 h-4.5 bg-white rounded-full shadow-md transition-all duration-300 transform ${
                playTranslation ? 'translate-x-5.5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Typography & Sizing Section */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-500 flex items-center space-x-1.5 px-1">
          <Type className="w-3.5 h-3.5" />
          <span>Text & Typography</span>
        </h3>
        <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4.5 space-y-4 transition-colors duration-300">
          {/* Arabic Font Size Control */}
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-3">
              <span className="text-sm font-semibold text-emerald-100 block">
                Arabic Font Size
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Adjust size of the sacred Arabic script text.
              </span>
            </div>
            <div className="flex items-center space-x-3 bg-bg-input border border-emerald-900/30 rounded-xl p-1 shrink-0 transition-colors duration-300">
              <button
                id="dec-arabic-font-btn"
                onClick={() => onChangeArabicFontSize(Math.max(20, arabicFontSize - 2))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={arabicFontSize <= 20}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-emerald-300 min-w-10 text-center">
                {arabicFontSize}px
              </span>
              <button
                id="inc-arabic-font-btn"
                onClick={() => onChangeArabicFontSize(Math.min(60, arabicFontSize + 2))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={arabicFontSize >= 60}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Arabic Line Spacing Control */}
          <div className="flex items-center justify-between border-t border-emerald-950/60 pt-4">
            <div className="flex-1 pr-3">
              <span className="text-sm font-semibold text-emerald-100 block">
                Arabic Line Spacing
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Adjust the vertical spacing between lines of Arabic text.
              </span>
            </div>
            <div className="flex items-center space-x-3 bg-bg-input border border-emerald-900/30 rounded-xl p-1 shrink-0 transition-colors duration-300">
              <button
                id="dec-arabic-spacing-btn"
                onClick={() => onChangeArabicLineSpacing(Math.max(1.4, Math.round((arabicLineSpacing - 0.2) * 10) / 10))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={arabicLineSpacing <= 1.4}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-emerald-300 min-w-10 text-center">
                {arabicLineSpacing.toFixed(1)}x
              </span>
              <button
                id="inc-arabic-spacing-btn"
                onClick={() => onChangeArabicLineSpacing(Math.min(4.0, Math.round((arabicLineSpacing + 0.2) * 10) / 10))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={arabicLineSpacing >= 4.0}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Translation Font Size Control */}
          <div className="flex items-center justify-between border-t border-emerald-950/60 pt-4">
            <div className="flex-1 pr-3">
              <span className="text-sm font-semibold text-emerald-100 block">
                Translation Font Size
              </span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Adjust text size of the active translation of meanings.
              </span>
            </div>
            <div className="flex items-center space-x-3 bg-bg-input border border-emerald-900/30 rounded-xl p-1 shrink-0 transition-colors duration-300">
              <button
                id="dec-translation-font-btn"
                onClick={() => onChangeTranslationFontSize(Math.max(11, translationFontSize - 1))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={translationFontSize <= 11}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-emerald-300 min-w-10 text-center">
                {translationFontSize}px
              </span>
              <button
                id="inc-translation-font-btn"
                onClick={() => onChangeTranslationFontSize(Math.min(26, translationFontSize + 1))}
                className="p-1.5 text-slate-400 hover:text-emerald-400 active:scale-90 transition-all disabled:opacity-30"
                disabled={translationFontSize >= 26}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Translation Selector Section */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-500 flex items-center space-x-1.5 px-1">
          <Languages className="w-3.5 h-3.5" />
          <span>Multilingual Translation</span>
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {TRANSLATIONS.map((trans) => {
            const isSelected = trans.id === currentTranslationId;
            return (
              <button
                key={trans.id}
                id={`translation-select-${trans.id}`}
                onClick={() => onSelectTranslation(trans.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all duration-300 ${
                  isSelected
                    ? 'bg-bg-active border-emerald-500/40 text-text-primary shadow-xl shadow-emerald-950/40'
                    : 'bg-bg-card border-emerald-900/20 text-slate-300 hover:border-emerald-500/30'
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-semibold tracking-tight ${
                    isSelected ? 'text-emerald-400' : 'text-slate-200'
                  }`}>
                    {trans.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {trans.language} Language Edition
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                  {trans.id.split('.')[0].toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage & Offline Management Section */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase font-bold tracking-widest text-emerald-500 flex items-center space-x-1.5 px-1">
          <Database className="w-3.5 h-3.5" />
          <span>Offline Downloads ({downloadedSurahs.length})</span>
        </h3>
        
        {downloadedSurahs.length === 0 ? (
          <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4 text-center text-slate-500 text-xs py-6 flex flex-col items-center transition-colors duration-300">
            <CloudLightning className="w-8 h-8 text-emerald-900/30 mb-1.5" />
            <p className="font-semibold text-slate-350">No Offline Files Found</p>
            <p className="text-slate-500 mt-0.5 max-w-[200px] leading-relaxed">
              Open any Surah and click "Save Offline" to download verses and recitation audio.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {downloadedSurahs.map((download) => (
              <div
                key={`${download.surahNumber}_${download.reciterId}`}
                className="bg-bg-card border border-emerald-900/20 rounded-2xl p-3 flex items-center justify-between text-slate-300 transition-colors duration-300"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="font-bold text-xs text-emerald-100 truncate">
                    {download.surahMetadata.englishName} ({download.surahMetadata.number})
                  </span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5 font-medium">
                    {RECITERS.find((r) => r.id === download.reciterId)?.englishName || download.reciterId}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    id={`play-offline-${download.surahNumber}`}
                    onClick={() => onPlayDownloaded(download.surahNumber, download.reciterId, download.translationId)}
                    className="p-1.5 bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                    title="Play downloaded surah"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                  </button>
                  <button
                    id={`delete-offline-${download.surahNumber}`}
                    onClick={() => onDeleteDownloaded(download.surahNumber, download.reciterId, download.translationId, download.ayahs.length)}
                    className="p-1.5 bg-red-950/40 border border-red-500/20 text-red-400 hover:bg-bg-active rounded-xl active:scale-95 transition-all"
                    title="Delete downloaded surah"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* App Info Footer */}
      <div className="bg-bg-card border border-emerald-900/20 rounded-2xl p-4 space-y-3 transition-colors duration-300">
        <div className="flex items-center space-x-2 text-emerald-100 border-b border-emerald-900/20 pb-2">
          <Info className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          <span className="font-bold text-xs">About Quran Player</span>
        </div>
        <div className="space-y-2 text-[11px] text-slate-400 leading-relaxed font-medium">
          <p>
            Quran Player features an integrated audio and text caching system, enabling completely offline translation reading and audio playback.
          </p>
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-xs pt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Secure offline client storage</span>
          </div>
        </div>
      </div>
    </div>
  );
}
