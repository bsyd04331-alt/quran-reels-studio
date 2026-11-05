export interface QuranSurahPreset {
  id: string;
  name: string;
  nameEnglish: string;
  number: number;
  ayahs: QuranAyahPreset[];
}

export interface QuranAyahPreset {
  surahNumber: number;
  ayahNumber: number;
  arabicText: string;
  translationEn: string;
  translationFr?: string;
  reciterNote?: string;
}

export interface SurahMeta {
  number: number;
  name: string;
  englishName: string;
  ayahsCount: number;
  revelationType: 'مكية' | 'مدنية';
}

export interface ReciterOption {
  id: string;
  name: string;
  letter: string;
  subtext: string;
  audioServerSlug?: string;
  serverUrl?: string;
  category?: 'classic' | 'modern' | 'haramain' | 'warsh_qalon';
}

export type IslamicFrameStyle = 'classic_gold' | 'andalusian_arch' | 'royal_geometric' | 'minimal_chic';

export type ReelTheme = 'emerald_gold' | 'midnight_star' | 'desert_amber' | 'serene_dawn' | 'deep_noir';

export type TextAnimationType = 'fade' | 'slide_up' | 'glow_pulse' | 'subtle_zoom';

export type QuranFontFamily = 'amiri' | 'scheherazade' | 'uthmani_naskh' | 'hafs';

export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export type TranslationLanguage = 'en' | 'fr';

export type BackgroundCategory = 
  | 'all' 
  | 'nature' 
  | 'masjids' 
  | 'islamic_landmarks'
  | 'mountains_forests'
  | 'skies_stars'
  | 'rivers_oceans'
  | 'deserts_dunes';

export interface CuratedBackgroundItem {
  id: string;
  title: string;
  category: 'nature' | 'masjids' | 'islamic_landmarks' | 'mountains_forests' | 'skies_stars' | 'rivers_oceans' | 'deserts_dunes';
  url: string;
  thumbnail?: string;
  tags?: string[];
  themeColor?: string;
  sourceType?: 'curated_art' | 'dynamic_vector' | 'pro_render';
}

export interface ReelConfig {
  surahName: string;
  ayahText: string;
  ayahTranslation: string;
  translationLang: TranslationLanguage;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  reciter: string;
  reciterId: string;
  theme: ReelTheme;
  textAnimation: TextAnimationType;
  showTranslation: boolean;
  
  // Identity Toggles
  showReciterName: boolean;
  showSurahBadge: boolean;
  showAudioWave: boolean;

  // Audio Loop & Frames
  isAudioLoop: boolean;
  frameStyle: IslamicFrameStyle;

  // Typography Controls
  fontFamily: QuranFontFamily;
  fontSize: number; // in pixels base

  // Aspect Ratio
  aspectRatio: AspectRatioType;

  // Background
  backgroundType: 'preset_curated' | 'ai_generated' | 'gallery_selected' | 'uploaded';
  customBackgroundMediaId?: string;
  customBackgroundBase64?: string;
  customBackgroundMimeType?: string;
  videoDuration: number;
}

export type ReelTheme = 'emerald_gold' | 'midnight_star' | 'desert_amber' | 'serene_dawn' | 'deep_noir';

export type TextAnimationType = 'fade' | 'slide_up' | 'glow_pulse' | 'subtle_zoom';

export type QuranFontFamily = 'amiri' | 'scheherazade' | 'uthmani_naskh' | 'hafs';

export type AspectRatioType = '9:16' | '16:9' | '1:1' | '4:5';

export type TranslationLanguage = 'en' | 'fr';

export type BackgroundCategory = 
  | 'all' 
  | 'nature' 
  | 'masjids' 
  | 'islamic_landmarks'
  | 'mountains_forests'
  | 'skies_stars'
  | 'rivers_oceans'
  | 'deserts_dunes';

export interface CuratedBackgroundItem {
  id: string;
  title: string;
  category: 'nature' | 'masjids' | 'islamic_landmarks' | 'mountains_forests' | 'skies_stars' | 'rivers_oceans' | 'deserts_dunes';
  url: string;
  thumbnail?: string;
  tags?: string[];
  themeColor?: string;
  sourceType?: 'curated_art' | 'dynamic_vector' | 'pro_render';
}

export interface ReelConfig {
  surahName: string;
  ayahText: string;
  ayahTranslation: string;
  translationLang: TranslationLanguage;
  surahNumber: number;
  fromAyah: number;
  toAyah: number;
  reciter: string;
  reciterId: string;
  theme: ReelTheme;
  textAnimation: TextAnimationType;
  showTranslation: boolean;
  
  // Identity Toggles
  showReciterName: boolean;
  showSurahBadge: boolean;
  showAudioWave: boolean;

  // Typography Controls
  fontFamily: QuranFontFamily;
  fontSize: number; // in pixels base

  // Aspect Ratio
  aspectRatio: AspectRatioType;

  // Background
  backgroundType: 'preset_curated' | 'ai_generated' | 'gallery_selected' | 'uploaded';
  customBackgroundMediaId?: string;
  customBackgroundBase64?: string;
  customBackgroundMimeType?: string;
  videoDuration: number;
}