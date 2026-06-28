/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Surah, Ayah, Reciter, TranslationEdition, DownloadedSurah } from '../types';
import { getDownloadedSurah, saveDownloadedSurah, saveAudioBlob } from './db';

export const RECITERS: Reciter[] = [
  {
    id: 'ar.alafasy',
    name: 'مشاري راشد العفاسي',
    englishName: 'Mishary Rashid Alafasy',
    style: 'Murattal',
    origin: 'Kuwait',
    bio: 'Mishary bin Rashid Alafasy is a world-renowned Qari, Imam, and nasheed artist from Kuwait. He studied at the Islamic University of Madinah\'s College of the Quran, specializing in the ten readings and translations of the holy book.',
    styleSample: 'Warm, melodic, highly emotional, and deeply resonance-oriented. His precise vocal control, clear enunciation, and soothing pace make his recitation exceptionally easy to follow and memorize.'
  },
  {
    id: 'ar.abdurrahmaansudais',
    name: 'عبد الرحمن السديس',
    englishName: 'Abdurrahman Al-Sudais',
    style: 'Murattal',
    origin: 'Saudi Arabia (Riyadh/Makkah)',
    bio: 'Sheikh Abdul Rahman Ibn Abdul Aziz al-Sudais is the chief imam and khateeb of the Grand Mosque (Masjid al-Haram) in Makkah. He holds a PhD in Islamic Sharia and was named the Islamic Personality of the Year in 2005.',
    styleSample: 'Majestic, high-energy, rapid, and deeply passionate. His commanding voice and distinct emotional crescendos carry an incredible spiritual intensity that has resonated globally for decades.'
  },
  {
    id: 'ar.mahermuaiqly',
    name: 'ماهر المعيقلي',
    englishName: 'Maher Al-Muaiqly',
    style: 'Murattal',
    origin: 'Saudi Arabia (Madinah/Makkah)',
    bio: 'Sheikh Maher bin Hamad Al-Muaiqly is a prominent imam of Masjid al-Haram in Makkah. Originally a mathematics teacher, he pursued higher academic studies in Islamic Jurisprudence (Fiqh) and earned his doctorate in Sharia.',
    styleSample: 'Calm, soothing, extremely clear, and rhythmically precise. His gentle tones and stable tempo bring an atmosphere of absolute tranquility, serenity, and emotional focus to the listener.'
  },
  {
    id: 'ar.saadghamidi',
    name: 'سعد الغامدي',
    englishName: 'Saad Al-Ghamdi',
    style: 'Murattal',
    origin: 'Saudi Arabia (Dammam)',
    bio: 'Sheikh Saad Al-Ghamdi is a highly respected Quran reciter and theologian. He served as Imam in several historic mosques across the Eastern Province of Saudi Arabia and led prayers as a guest Imam at Al-Masjid an-Nabawi in Madinah.',
    styleSample: 'Smooth, moderate-paced, highly harmonious, and fluid. His comforting timbre and steady cadence are perfect for continuous listening and spiritual contemplation over long periods.'
  },
  {
    id: 'ar.shaatree',
    name: 'أبو بكر الشاطري',
    englishName: 'Abu Bakr Al-Shatri',
    style: 'Murattal',
    origin: 'Saudi Arabia (Jeddah)',
    bio: 'Sheikh Abu Bakr Ibn Mohamed Al-Shatri is a prominent Saudi reciter and Imam of Al-Furqan Mosque in Jeddah. He graduated in Holy Quran Studies and is recognized for his unique, heartfelt recitation that evokes deep reflection.',
    styleSample: 'Soulful, deeply emotional, resonant, and slow-paced. His distinct cadence features a touching, breathy undertone that evokes deep contemplation, humility, and awe in the listener.'
  },
];

export const TRANSLATIONS: TranslationEdition[] = [
  { id: 'en.sahih', name: 'Sahih International', language: 'English', englishName: 'English' },
  { id: 'ur.jalandhry', name: 'Fateh Muhammad Jalandhry', language: 'Urdu', englishName: 'Urdu' },
  { id: 'ur.junagarhi', name: 'Muhammad Junagarhi', language: 'Urdu', englishName: 'Urdu (Junagarhi)' },
  { id: 'id.indonesian', name: 'Bahasa Indonesia', language: 'Indonesian', englishName: 'Indonesian' },
  { id: 'fr.hamidullah', name: 'Muhammad Hamidullah', language: 'French', englishName: 'French' },
  { id: 'tr.diyanet', name: 'Diyanet Isleri', language: 'Turkish', englishName: 'Turkish' },
];

const LOCAL_STORAGE_SURAH_LIST = 'quran_surah_list_cache';

export async function fetchSurahs(): Promise<Surah[]> {
  try {
    const response = await fetch('https://api.alquran.cloud/v1/surah');
    if (!response.ok) throw new Error('API server returned error status');
    
    const result = await response.json();
    if (result.code === 200 && Array.isArray(result.data)) {
      localStorage.setItem(LOCAL_STORAGE_SURAH_LIST, JSON.stringify(result.data));
      return result.data as Surah[];
    }
    throw new Error('Invalid response structure');
  } catch (error) {
    console.warn('Network request for surahs failed, trying local storage cache', error);
    const cached = localStorage.getItem(LOCAL_STORAGE_SURAH_LIST);
    if (cached) {
      return JSON.parse(cached) as Surah[];
    }
    // Return a subset of standard Surahs in case of absolute failure so the app doesn't crash
    return [
      { number: 1, name: "سُورَةُ الْفَاتِحَةِ", englishName: "Al-Fatihah", englishNameTranslation: "The Opening", numberOfAyahs: 7, revelationType: "Meccan" },
      { number: 112, name: "سُورَةُ الإِخْلَاصِ", englishName: "Al-Ikhlas", englishNameTranslation: "The Sincerity", numberOfAyahs: 4, revelationType: "Meccan" },
      { number: 113, name: "سُورَةُ الْفَلَقِ", englishName: "Al-Falaq", englishNameTranslation: "The Daybreak", numberOfAyahs: 5, revelationType: "Meccan" },
      { number: 114, name: "سُورَةُ النَّاسِ", englishName: "An-Nas", englishNameTranslation: "Mankind", numberOfAyahs: 6, revelationType: "Meccan" }
    ];
  }
}

function padZero(num: number, size: number): string {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

export async function fetchSurahDetail(
  surahNumber: number,
  reciterId: string,
  translationId: string
): Promise<{ surahMetadata: Surah; ayahs: Ayah[]; isOffline: boolean }> {
  // 1. Try local IndexedDB first
  const offlineData = await getDownloadedSurah(surahNumber, reciterId, translationId);
  if (offlineData) {
    return {
      surahMetadata: offlineData.surahMetadata,
      ayahs: offlineData.ayahs,
      isOffline: true
    };
  }

  // 2. Fetch from APIs
  try {
    const apiReciterId = reciterId === 'ar.saadghamidi' ? 'ar.alafasy' : reciterId;
    const [arabicRes, translationRes] = await Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${apiReciterId}`),
      fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/${translationId}`)
    ]);

    if (!arabicRes.ok || !translationRes.ok) {
      throw new Error('Failed to fetch from one of the API endpoints');
    }

    const arabicData = await arabicRes.json();
    const translationData = await translationRes.json();

    if (arabicData.code !== 200 || translationData.code !== 200) {
      throw new Error('API reported non-200 code');
    }

    const metadata: Surah = {
      number: arabicData.data.number,
      name: arabicData.data.name,
      englishName: arabicData.data.englishName,
      englishNameTranslation: arabicData.data.englishNameTranslation,
      numberOfAyahs: arabicData.data.numberOfAyahs,
      revelationType: arabicData.data.revelationType
    };

    const arabicAyahs = arabicData.data.ayahs;
    const translationAyahs = translationData.data.ayahs;

    const mergedAyahs: Ayah[] = arabicAyahs.map((arAyah: any, index: number) => {
      const transAyah = translationAyahs[index];
      let audioUrl = arAyah.audio;

      if (reciterId === 'ar.saadghamidi') {
        const zeroPaddedSurah = padZero(surahNumber, 3);
        const zeroPaddedAyah = padZero(arAyah.numberInSurah, 3);
        audioUrl = `https://everyayah.com/data/Ghamadi_40kbps/${zeroPaddedSurah}${zeroPaddedAyah}.mp3`;
      } else if (audioUrl && audioUrl.startsWith('http://')) {
        audioUrl = audioUrl.replace('http://', 'https://');
      }

      return {
        number: arAyah.number,
        audio: audioUrl,
        text: arAyah.text,
        numberInSurah: arAyah.numberInSurah,
        translationText: transAyah ? transAyah.text : ''
      };
    });

    return {
      surahMetadata: metadata,
      ayahs: mergedAyahs,
      isOffline: false
    };
  } catch (error) {
    console.error('Failed to fetch surah online', error);
    throw new Error('This Surah content is not available offline. Please check your internet connection.');
  }
}

// Function to download a surah for offline usage
export async function downloadSurah(
  surahNumber: number,
  reciterId: string,
  translationId: string,
  onProgress: (progress: number) => void
): Promise<void> {
  // Get surah detail online
  const detail = await fetchSurahDetail(surahNumber, reciterId, translationId);
  const totalAyahs = detail.ayahs.length;

  onProgress(5); // Started metadata processing

  const ayahsWithLocalUrl: Ayah[] = [];

  // Download audio blobs ayah by ayah
  for (let i = 0; i < totalAyahs; i++) {
    const ayah = detail.ayahs[i];
    
    try {
      // Fetch audio file
      const response = await fetch(ayah.audio);
      if (!response.ok) {
        throw new Error(`Failed to download audio for Ayah ${ayah.numberInSurah}`);
      }
      const audioBlob = await response.blob();
      
      // Save raw audio blob in IndexedDB
      await saveAudioBlob(reciterId, surahNumber, ayah.numberInSurah, audioBlob);
      
      ayahsWithLocalUrl.push(ayah);
    } catch (err) {
      console.error(`Error downloading audio for ayah ${ayah.numberInSurah}`, err);
      throw new Error(`Connection error during audio download for Ayah ${ayah.numberInSurah}`);
    }

    const progressValue = Math.floor(5 + ((i + 1) / totalAyahs) * 90);
    onProgress(progressValue);
  }

  // Save full text & metadata in IndexedDB
  const downloaded: DownloadedSurah = {
    surahNumber,
    reciterId,
    translationId,
    surahMetadata: detail.surahMetadata,
    ayahs: ayahsWithLocalUrl,
    downloadedAt: Date.now()
  };

  await saveDownloadedSurah(downloaded);
  onProgress(100);
}

export interface TafsirSource {
  id: string;
  name: string;
  language: string;
  scholar: string;
}

export const TAFSIR_SOURCES: TafsirSource[] = [
  { id: 'en.ibnkathir', name: 'Tafsir Ibn Kathir', language: 'English', scholar: 'Ibn Kathir (d. 1373 CE)' },
  { id: 'ar.jalalayn', name: 'Tafsir Al-Jalalayn', language: 'Arabic', scholar: 'Jalal al-Din al-Mahalli & al-Suyuti' },
  { id: 'ar.muyassar', name: 'Tafsir Al-Muyassar', language: 'Arabic', scholar: 'King Fahd Glorious Quran Complex' },
];

export async function fetchTafsirText(
  surahNumber: number,
  ayahNumber: number,
  sourceId: string
): Promise<string> {
  try {
    if (sourceId === 'en.ibnkathir') {
      const response = await fetch(`https://api.quran.com/api/v4/tafsirs/169/by_ayah/${surahNumber}:${ayahNumber}`);
      if (!response.ok) throw new Error('Failed to fetch from Quran.com API');
      const data = await response.json();
      if (data.tafsir && data.tafsir.text) {
        return data.tafsir.text;
      }
      throw new Error('Tafsir text not found in response');
    } else {
      // Alquran.cloud Tafsirs
      const response = await fetch(`https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/${sourceId}`);
      if (!response.ok) throw new Error('Failed to fetch from Alquran.cloud API');
      const data = await response.json();
      if (data.code === 200 && data.data && data.data.text) {
        return data.data.text;
      }
      throw new Error('Tafsir text not found in response');
    }
  } catch (error) {
    console.error('Error fetching Tafsir:', error);
    throw new Error('Could not load Tafsir. Please check your internet connection and try again.');
  }
}

export function parseQuranRef(text: string, surahs: Surah[]): { surahNumber: number; ayahNumber: number } | null {
  if (!text) return null;

  // Normalize text
  let s = text.toLowerCase().trim();

  // Replace eastern arabic numerals (٠-٩) with western arabic numerals (0-9)
  const easternDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    s = s.replace(easternDigits[i], i.toString());
  }

  // Replace English number words with digits
  const numberMap: { [key: string]: number } = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'sixty': 60,
    'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
  };

  // Replace Arabic/Urdu number words with digits
  const arabicNumberMap: { [key: string]: number } = {
    'واحد': 1, 'اثنين': 2, 'ثلاثة': 3, 'اربعة': 4, 'خمسة': 5, 'ستة': 6, 'سبعة': 7, 'ثمانية': 8, 'تسعة': 9, 'عشرة': 10,
    'ایک': 1, 'دو': 2, 'تین': 3, 'چار': 4, 'پانچ': 5, 'چھ': 6, 'سات': 7, 'آٹھ': 8, 'نو': 9, 'دس': 10,
    'ek': 1, 'teen': 3, 'chaar': 4, 'paanch': 5, 'chey': 6, 'saat': 7, 'aath': 8, 'nau': 9, 'das': 10
  };

  Object.keys(numberMap).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    s = s.replace(regex, numberMap[word].toString());
  });

  Object.keys(arabicNumberMap).forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    s = s.replace(regex, arabicNumberMap[word].toString());
  });

  // Urdu/Arabic term replacements to English terms to facilitate parsing
  s = s.replace(/(آیت نمبر|آیت|ayat|verse|ayah|ayat|aya|v)\s*(\d+)/g, 'verse $2');
  s = s.replace(/(سورہ نمبر|سورہ|surah|chapter|sura|surat|ch)\s*(\d+)/g, 'surah $2');

  // Common spoken/typed text replacements for phonetic matches
  s = s.replace(/\byaseen\b/g, 'ya-sin');
  s = s.replace(/\byasin\b/g, 'ya-sin');
  s = s.replace(/\bfatiha\b/g, 'fatihah');
  s = s.replace(/\bfateha\b/g, 'fatihah');
  s = s.replace(/\bbaqara\b/g, 'baqarah');
  s = s.replace(/\brehman\b/g, 'rahman');
  s = s.replace(/\bwaqia\b/g, 'waqiah');
  s = s.replace(/\bmulkh\b/g, 'mulk');
  s = s.replace(/\bsajda\b/g, 'sajdah');
  s = s.replace(/\bnisaa\b/g, 'nisa');
  s = s.replace(/\bmaida\b/g, 'maidah');
  s = s.replace(/\bkaff\b/g, 'kahf');
  s = s.replace(/\bkhahf\b/g, 'kahf');
  s = s.replace(/\bikhlaas\b/g, 'ikhlas');

  // 1. Check for explicit Surah Number AND Ayah Number keywords
  const explicitSurahMatch = s.match(/(?:surah|chapter|sura|surat|ch)\s*(\d+)/i);
  const explicitVerseMatch = s.match(/(?:verse|ayah|ayat|aya|v)\s*(\d+)/i);

  if (explicitSurahMatch && explicitVerseMatch) {
    const sNum = parseInt(explicitSurahMatch[1], 10);
    const aNum = parseInt(explicitVerseMatch[1], 10);
    const matched = surahs.find(surah => surah.number === sNum);
    if (matched) {
      const safeAyah = Math.min(Math.max(1, aNum), matched.numberOfAyahs);
      return { surahNumber: sNum, ayahNumber: safeAyah };
    }
  }

  // 2. Find all numbers in the normalized string
  const numbers = s.match(/\d+/g) || [];

  // Helper to strip prefixes for matching
  const cleanStringForMatch = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9أ-ي]/g, '')
      .replace(/^(al|an|ar|at|ash|az|ad|as|adh)/, '');
  };

  let detectedSurah: Surah | null = null;
  let matchedByName = false;
  let highestMatchLength = 0;

  const cleanSpoken = cleanStringForMatch(s);

  // 1. Try matching by Surah name
  for (const surah of surahs) {
    const cleanEngName = cleanStringForMatch(surah.englishName);
    const cleanEngTranslation = cleanStringForMatch(surah.englishNameTranslation);
    const cleanArabicName = surah.name.replace(/[^أ-ي]/g, '');

    if (cleanSpoken.includes(cleanEngName) && cleanEngName.length > 2) {
      if (cleanEngName.length > highestMatchLength) {
        detectedSurah = surah;
        highestMatchLength = cleanEngName.length;
        matchedByName = true;
      }
    } else if (cleanSpoken.includes(cleanEngTranslation) && cleanEngTranslation.length > 2) {
      if (cleanEngTranslation.length > highestMatchLength) {
        detectedSurah = surah;
        highestMatchLength = cleanEngTranslation.length;
        matchedByName = true;
      }
    } else if (cleanSpoken.includes(cleanArabicName) && cleanArabicName.length > 1) {
      if (cleanArabicName.length > highestMatchLength) {
        detectedSurah = surah;
        highestMatchLength = cleanArabicName.length;
        matchedByName = true;
      }
    }
  }

  // 3. If no name matches, check if we have a "surah [number]" pattern
  if (!detectedSurah && explicitSurahMatch) {
    const sNum = parseInt(explicitSurahMatch[1], 10);
    const matched = surahs.find(surah => surah.number === sNum);
    if (matched) {
      detectedSurah = matched;
      matchedByName = false;
    }
  }

  // 4. Determine Ayah Number
  if (detectedSurah) {
    let ayahNum = 1;

    // If we have an explicit "verse/ayah [number]" match, use it!
    if (explicitVerseMatch) {
      const parsed = parseInt(explicitVerseMatch[1], 10);
      if (parsed > 0 && parsed <= detectedSurah.numberOfAyahs) {
        ayahNum = parsed;
        return { surahNumber: detectedSurah.number, ayahNumber: ayahNum };
      }
    }

    if (numbers.length > 0) {
      const surahNumStr = detectedSurah.number.toString();

      if (matchedByName) {
        // Since we matched by NAME, any number in the text is likely the ayah number!
        const nonSurahNumbers = numbers.filter(n => n !== surahNumStr);
        if (nonSurahNumbers.length > 0) {
          const parsed = parseInt(nonSurahNumbers[nonSurahNumbers.length - 1], 10);
          if (parsed > 0 && parsed <= detectedSurah.numberOfAyahs) {
            ayahNum = parsed;
          }
        } else {
          // If the only number is the same as the surah number (e.g. "baqarah 2")
          // Since it's matched by name, "2" is the ayah number!
          const parsed = parseInt(numbers[numbers.length - 1], 10);
          if (parsed > 0 && parsed <= detectedSurah.numberOfAyahs) {
            ayahNum = parsed;
          }
        }
      } else {
        // Matched by surah number (e.g. "surah 2 20" or "surah 2")
        const nonSurahNumbers = numbers.filter(n => n !== surahNumStr);
        if (nonSurahNumbers.length > 0) {
          const parsed = parseInt(nonSurahNumbers[0], 10);
          if (parsed > 0 && parsed <= detectedSurah.numberOfAyahs) {
            ayahNum = parsed;
          }
        } else if (numbers.length > 1) {
          const parsed = parseInt(numbers[1], 10);
          if (parsed > 0 && parsed <= detectedSurah.numberOfAyahs) {
            ayahNum = parsed;
          }
        }
      }
    }

    return { surahNumber: detectedSurah.number, ayahNumber: ayahNum };
  }

  // 5. Fallback: Check for patterns like "2:255" or "2 255" anywhere in the text
  if (numbers.length >= 2) {
    const sNum = parseInt(numbers[0], 10);
    const aNum = parseInt(numbers[1], 10);
    const matched = surahs.find(surah => surah.number === sNum);
    if (matched && aNum > 0 && aNum <= matched.numberOfAyahs) {
      return { surahNumber: sNum, ayahNumber: aNum };
    }
  } else if (numbers.length === 1) {
    const sNum = parseInt(numbers[0], 10);
    const matched = surahs.find(surah => surah.number === sNum);
    if (matched) {
      return { surahNumber: sNum, ayahNumber: 1 };
    }
  }

  return null;
}

