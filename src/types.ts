/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface Ayah {
  number: number;
  audio: string;
  text: string;
  numberInSurah: number;
  translationText?: string;
}

export interface Reciter {
  id: string;
  name: string;
  englishName: string;
  style?: string;
  bio?: string;
  origin?: string;
  styleSample?: string;
}

export interface TranslationEdition {
  id: string;
  name: string;
  language: string;
  englishName: string;
}

export interface Bookmark {
  surahNumber: number;
  ayahNumber?: number; // if undefined, bookmarks the surah itself
  surahName: string;
  englishName: string;
  timestamp: number;
}

export interface DownloadState {
  surahNumber: number;
  progress: number; // 0 to 100
  status: 'idle' | 'downloading' | 'completed' | 'error';
  reciterId?: string;
}

export interface DownloadedSurah {
  surahNumber: number;
  reciterId: string;
  translationId: string;
  surahMetadata: Surah;
  ayahs: Ayah[]; // containing translationText
  downloadedAt: number;
}
