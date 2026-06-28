/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DownloadedSurah } from '../types';

const DB_NAME = 'quran_audio_offline_db';
const DB_VERSION = 1;

const STORE_SURAHS = 'downloaded_surahs';
const STORE_AUDIO = 'audio_blobs';

export function initDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store for surahs metadata & translation
      if (!db.objectStoreNames.contains(STORE_SURAHS)) {
        db.createObjectStore(STORE_SURAHS, { keyPath: 'id' });
      }

      // Create object store for audio blobs
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO, { keyPath: 'id' });
      }
    };
  });
}

// Key generators
const getSurahKey = (surahNumber: number, reciterId: string, translationId: string) => {
  return `${surahNumber}_${reciterId}_${translationId}`;
};

const getAudioKey = (reciterId: string, surahNumber: number, ayahNumber: number) => {
  return `${reciterId}_${surahNumber}_${ayahNumber}`;
};

export async function saveDownloadedSurah(surah: DownloadedSurah): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SURAHS, 'readwrite');
    const store = transaction.objectStore(STORE_SURAHS);
    
    const id = getSurahKey(surah.surahNumber, surah.reciterId, surah.translationId);
    const request = store.put({
      id,
      ...surah
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save downloaded surah'));
  });
}

export async function getDownloadedSurah(
  surahNumber: number,
  reciterId: string,
  translationId: string
): Promise<DownloadedSurah | null> {
  const db = await initDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_SURAHS, 'readonly');
    const store = transaction.objectStore(STORE_SURAHS);
    
    const id = getSurahKey(surahNumber, reciterId, translationId);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function getAllDownloadedSurahs(): Promise<DownloadedSurah[]> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_SURAHS, 'readonly');
    const store = transaction.objectStore(STORE_SURAHS);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };
    request.onerror = () => {
      reject(new Error('Failed to fetch downloaded surahs'));
    };
  });
}

export async function saveAudioBlob(
  reciterId: string,
  surahNumber: number,
  ayahNumber: number,
  blob: Blob
): Promise<void> {
  const db = await initDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_AUDIO, 'readwrite');
    const store = transaction.objectStore(STORE_AUDIO);
    
    const id = getAudioKey(reciterId, surahNumber, ayahNumber);
    const request = store.put({
      id,
      blob,
      reciterId,
      surahNumber,
      ayahNumber,
      createdAt: Date.now()
    });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save audio blob'));
  });
}

export async function getAudioBlob(
  reciterId: string,
  surahNumber: number,
  ayahNumber: number
): Promise<Blob | null> {
  const db = await initDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_AUDIO, 'readonly');
    const store = transaction.objectStore(STORE_AUDIO);
    
    const id = getAudioKey(reciterId, surahNumber, ayahNumber);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result?.blob || null);
    };
    request.onerror = () => {
      resolve(null);
    };
  });
}

export async function deleteDownloadedSurah(
  surahNumber: number,
  reciterId: string,
  translationId: string,
  numberOfAyahs: number
): Promise<void> {
  const db = await initDb();
  
  // 1. Delete surah metadata & text
  const deleteSurahPromise = new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_SURAHS, 'readwrite');
    const store = transaction.objectStore(STORE_SURAHS);
    const id = getSurahKey(surahNumber, reciterId, translationId);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete downloaded surah record'));
  });

  // 2. Delete all audio blobs for this Surah and Reciter
  const deleteAudioPromises = [];
  const audioTransaction = db.transaction(STORE_AUDIO, 'readwrite');
  const audioStore = audioTransaction.objectStore(STORE_AUDIO);
  
  for (let i = 1; i <= numberOfAyahs; i++) {
    const id = getAudioKey(reciterId, surahNumber, i);
    deleteAudioPromises.push(
      new Promise<void>((resolve) => {
        const req = audioStore.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve(); // Ignore individual failures
      })
    );
  }

  await Promise.all([deleteSurahPromise, ...deleteAudioPromises]);
}
