/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Surah, Ayah } from '../types';
import { 
  Play, Pause, SkipForward, SkipBack, Repeat, Repeat1, 
  ChevronUp, ChevronDown, Volume2, Info, CheckCircle2, Sliders, PlayCircle, X, Languages 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AudioPlayerProps {
  surah: Surah | null;
  ayah: Ayah | null;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  repeatMode: 'none' | 'ayah' | 'surah';
  onRepeatChange: (mode: 'none' | 'ayah' | 'surah') => void;
  reciterName: string;
  isOffline: boolean;
  onClose?: () => void;
  playTranslation: boolean;
  onTogglePlayTranslation: (enabled: boolean) => void;
  isPlayingTranslation: boolean;
  translationId: string;
}

export default function AudioPlayer({
  surah,
  ayah,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  currentTime,
  duration,
  onSeek,
  playbackSpeed,
  onSpeedChange,
  repeatMode,
  onRepeatChange,
  reciterName,
  isOffline,
  onClose,
  playTranslation,
  onTogglePlayTranslation,
  isPlayingTranslation,
  translationId,
}: AudioPlayerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!surah || !ayah) return null;

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSeek(parseFloat(e.target.value));
  };

  const speedOptions = [0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="absolute bottom-14 left-0 right-0 z-40 px-4 pb-3">
      {/* Container */}
      <motion.div
        layout
        className="w-full bg-bg-card border border-emerald-900/40 text-white rounded-3xl shadow-2xl overflow-hidden shadow-emerald-950/20 transition-colors duration-300"
        style={{
          height: isExpanded ? 'calc(100vh - 120px)' : '72px',
          maxHeight: isExpanded ? '520px' : '72px',
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            /* COLLAPSED MINI PLAYER */
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col justify-between"
            >
              <div 
                className="flex items-center justify-between p-3 cursor-pointer"
                onClick={() => setIsExpanded(true)}
              >
                {/* Info */}
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-11 h-11 shrink-0 bg-emerald-950 border border-emerald-500/20 flex items-center justify-center rounded-2xl relative overflow-hidden">
                    <span className="font-serif text-lg">📖</span>
                    {isOffline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-bg-card flex items-center justify-center transition-colors duration-300">
                        <span className="text-[7px] text-white">✔</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-sm tracking-tight truncate text-emerald-50">
                      {surah.englishName} ({surah.number}:{ayah.numberInSurah})
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {isPlayingTranslation ? (
                        <span className="text-emerald-400 font-semibold animate-pulse">
                          Reciting Translation {translationId.startsWith('ur.') ? '(Urdu Audio)' : translationId.startsWith('en.') ? '(English Audio)' : ''}
                        </span>
                      ) : (
                        `${reciterName} • ${isOffline ? 'Offline' : 'Online'}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Control buttons */}
                <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    id="mini-prev-button"
                    onClick={onPrev}
                    className="p-1.5 hover:bg-emerald-950 active:scale-90 rounded-full text-slate-300"
                  >
                    <SkipBack className="w-4.5 h-4.5" />
                  </button>

                  <button
                    id="mini-play-button"
                    onClick={onPlayPause}
                    className="p-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 rounded-2xl text-[#080A09] shadow-md shadow-emerald-500/10"
                  >
                    {isPlaying ? (
                      <Pause className="w-4.5 h-4.5 fill-[#080A09]" />
                    ) : (
                      <Play className="w-4.5 h-4.5 fill-[#080A09] ml-0.5" />
                    )}
                  </button>

                  <button
                    id="mini-next-button"
                    onClick={onNext}
                    className="p-1.5 hover:bg-emerald-950 active:scale-90 rounded-full text-slate-300"
                  >
                    <SkipForward className="w-4.5 h-4.5" />
                  </button>

                  <button
                    id="mini-expand-button"
                    onClick={() => setIsExpanded(true)}
                    className="p-1.5 hover:bg-emerald-950 rounded-full text-slate-400 pl-1"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>

                  <button
                    id="mini-close-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onClose) onClose();
                    }}
                    className="p-1.5 hover:bg-emerald-950 hover:text-red-400 rounded-full text-slate-400 transition-colors"
                    title="Dismiss Player"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>

              {/* Collapsed top timeline progress */}
              <div className="w-full h-1 bg-bg-input transition-colors duration-300">
                <div
                  className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                  style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
                ></div>
              </div>
            </motion.div>
          ) : (
            /* EXPANDED FULL PLAYER */
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col justify-between p-5"
            >
              {/* Header: Collapse button, Title */}
              <div className="flex items-center justify-between border-b border-emerald-900/20 pb-3">
                <button
                  id="expanded-collapse-button"
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 bg-bg-input border border-emerald-900/30 rounded-full hover:bg-bg-active transition-all text-slate-300 duration-300"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
                
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    Now Reciting
                  </span>
                  <h3 className="font-bold text-sm text-emerald-100">{surah.englishName}</h3>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="hidden sm:block">
                    {isOffline ? (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
                        OFFLINE
                      </span>
                    ) : (
                      <span className="text-[9px] bg-sky-500/10 text-sky-400 font-bold px-1.5 py-0.5 rounded border border-sky-500/20">
                        ONLINE
                      </span>
                    )}
                  </div>
                  <button
                    id="expanded-close-button"
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                    className="p-1.5 bg-bg-input border border-emerald-900/30 rounded-full hover:bg-bg-active hover:text-red-400 transition-all text-slate-300 duration-300"
                    title="Dismiss Player"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Arabic display (Beautiful central visual container) */}
              <div className="flex-1 flex flex-col justify-center items-center py-4 px-2 my-1 text-center bg-bg-app rounded-3xl border border-emerald-900/40 shadow-inner overflow-y-auto max-h-[160px] transition-colors duration-300">
                <p className="font-serif text-2xl text-emerald-300 leading-loose select-all text-center">
                  {ayah.text}
                </p>
                <p className="text-slate-400 text-xs mt-2 italic px-3 line-clamp-3 select-all">
                  "{ayah.translationText}"
                </p>
              </div>

              {/* Player Metadata (Surah detail, active verse, reciter) */}
              <div className="text-center mt-2">
                <p className="font-semibold text-emerald-100 text-base">
                  Verse {surah.number}:{ayah.numberInSurah}
                </p>
                <p className="text-xs text-slate-450 mt-0.5">
                  {isPlayingTranslation ? (
                    <span className="text-emerald-400 font-semibold animate-pulse">
                      Playing Translation {translationId.startsWith('ur.') ? '(Urdu Audio: Shamshad Ali Khan)' : translationId.startsWith('en.') ? '(English Audio: Ibrahim Walk)' : ''}
                    </span>
                  ) : (
                    <>
                      Recited by <span className="text-emerald-400 font-medium">{reciterName}</span>
                    </>
                  )}
                </p>
              </div>

              {/* Progress Bar & Seek Controls */}
              <div className="space-y-1.5 mt-3">
                <input
                  id="expanded-seek-slider"
                  type="range"
                  min="0"
                  max={duration || 100}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSliderChange}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
                />
                <div className="flex justify-between text-[11px] text-slate-450 font-medium px-0.5">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Core Control Buttons */}
              <div className="flex items-center justify-between mt-3 px-2">
                {/* Repeat & Translation Buttons */}
                <div className="flex items-center space-x-1.5">
                  <button
                    id="expanded-repeat-button"
                    onClick={() => {
                      const modes: ('none' | 'ayah' | 'surah')[] = ['none', 'ayah', 'surah'];
                      const nextIndex = (modes.indexOf(repeatMode) + 1) % modes.length;
                      onRepeatChange(modes[nextIndex]);
                    }}
                    className={`p-2 rounded-2xl relative transition-all active:scale-90 ${
                      repeatMode !== 'none' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Repeat: ${repeatMode}`}
                  >
                    {repeatMode === 'ayah' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                    {repeatMode !== 'none' && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-[#080A09]">
                        {repeatMode === 'ayah' ? '1' : 'S'}
                      </span>
                    )}
                  </button>

                  <button
                    id="expanded-play-translation-button"
                    onClick={() => onTogglePlayTranslation(!playTranslation)}
                    className={`p-2 rounded-2xl relative transition-all active:scale-90 border ${
                      playTranslation
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-transparent border-transparent text-slate-400 hover:text-white'
                    }`}
                    title={playTranslation ? "Recite Translation: ON" : "Recite Translation: OFF"}
                  >
                    <Languages className="w-5 h-5" />
                    {playTranslation && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[6px] font-bold text-slate-950">
                        ✓
                      </span>
                    )}
                  </button>
                </div>

                {/* Back / Next Center Panel */}
                <div className="flex items-center space-x-4">
                  <button
                    id="expanded-prev-button"
                    onClick={onPrev}
                    className="p-3 bg-bg-input hover:bg-bg-active active:scale-90 rounded-2xl text-slate-200 transition-all border border-emerald-900/30 duration-300"
                  >
                    <SkipBack className="w-5 h-5" />
                  </button>

                  <button
                    id="expanded-play-button"
                    onClick={onPlayPause}
                    className="p-4 bg-emerald-500 hover:bg-emerald-400 active:scale-95 rounded-3xl text-slate-950 shadow-lg shadow-emerald-500/20 transition-all duration-300"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-slate-950" />
                    ) : (
                      <Play className="w-6 h-6 fill-slate-950 ml-0.5" />
                    )}
                  </button>

                  <button
                    id="expanded-next-button"
                    onClick={onNext}
                    className="p-3 bg-bg-input hover:bg-bg-active active:scale-90 rounded-2xl text-slate-200 transition-all border border-emerald-900/30 duration-300"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                </div>

                {/* Playback Speed Controller */}
                <div className="relative group">
                  <button
                    id="expanded-speed-button"
                    className="p-2.5 rounded-2xl bg-bg-input hover:bg-bg-active text-slate-300 font-semibold text-xs border border-emerald-900/30 flex items-center space-x-1 duration-300"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{playbackSpeed}x</span>
                  </button>
                  {/* Hover tooltip menu */}
                  <div className="absolute right-0 bottom-full mb-2 bg-bg-card border border-emerald-900/30 rounded-2xl shadow-xl py-1.5 px-1 flex flex-col space-y-0.5 z-50 transition-colors duration-300">
                    {speedOptions.map((speed) => (
                      <button
                        key={speed}
                        id={`speed-option-${speed}`}
                        onClick={() => onSpeedChange(speed)}
                        className={`px-3 py-1 text-left text-xs rounded-lg transition-all ${
                          playbackSpeed === speed
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-emerald-900/20'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
