/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bookmark } from '../types';
import { Bookmark as BookmarkIcon, Play, Trash2, Heart, HeartOff, Compass } from 'lucide-react';
import { motion } from 'motion/react';

interface BookmarksTabProps {
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onRemoveBookmark: (surahNumber: number, ayahNumber?: number) => void;
}

export default function BookmarksTab({
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
}: BookmarksTabProps) {
  return (
    <div className="flex flex-col h-full bg-bg-app overflow-y-auto px-4 py-4 pb-28 space-y-4 text-text-primary transition-colors duration-300">
      {/* Intro Header */}
      <div className="bg-bg-card border border-emerald-900/30 rounded-2xl p-4.5 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <BookmarkIcon className="w-5 h-5 fill-emerald-500/20" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-100">Bookmarked Verses</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Quick access to your saved ayah references and memorizations.
            </p>
          </div>
        </div>
      </div>

      {/* Bookmarks List */}
      {bookmarks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 bg-bg-card border border-emerald-900/20 rounded-2xl p-6 transition-colors duration-300">
          <Heart className="w-10 h-10 text-emerald-900/30 mb-2" />
          <p className="text-xs font-semibold text-slate-350">No Bookmarks Saved Yet</p>
          <p className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] leading-relaxed">
            While viewing any Surah, click the bookmark icon next to a verse to save it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {bookmarks.map((bookmark, idx) => (
            <motion.div
              key={`${bookmark.surahNumber}_${bookmark.ayahNumber || 'surah'}_${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="bg-bg-card border border-emerald-900/20 hover:border-emerald-500/40 rounded-2xl p-3.5 flex items-center justify-between text-slate-300 transition-all hover:bg-bg-active duration-300"
            >
              {/* Left Details */}
              <div 
                className="flex items-center space-x-3.5 min-w-0 flex-1 cursor-pointer"
                onClick={() => onSelectBookmark(bookmark)}
              >
                {/* Visual marker */}
                <div className="w-9 h-9 bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center rounded-xl shrink-0">
                  <span className="font-serif text-sm">📖</span>
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm text-emerald-100 tracking-tight truncate">
                    {bookmark.englishName}
                  </span>
                  <span className="text-[11px] text-slate-400 font-semibold mt-0.5">
                    {bookmark.ayahNumber ? `Verse ${bookmark.surahNumber}:${bookmark.ayahNumber}` : 'Full Surah'}
                  </span>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center space-x-1.5 shrink-0 ml-3">
                <button
                  id={`play-bookmark-${bookmark.surahNumber}-${bookmark.ayahNumber || 'all'}`}
                  onClick={() => onSelectBookmark(bookmark)}
                  className="p-2 bg-emerald-500 text-slate-950 rounded-xl hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                  title="View and Play Verse"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                </button>
                <button
                  id={`remove-bookmark-${bookmark.surahNumber}-${bookmark.ayahNumber || 'all'}`}
                  onClick={() => onRemoveBookmark(bookmark.surahNumber, bookmark.ayahNumber)}
                  className="p-2 bg-slate-800/40 border border-slate-700/40 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl active:scale-95 transition-all"
                  title="Remove Bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
