import React, { useState, useRef, useEffect } from 'react';
import { Flow } from 'flow-sdk';
import { ReelConfig, ReciterOption, SurahMeta, AspectRatioType, QuranFontFamily, TranslationLanguage, IslamicFrameStyle } from './types';
import { PRESET_SURAHS, RECITERS_123, ALL_114_SURAHS, ASPECT_RATIOS_CONFIG, QURAN_FONTS, CURATED_BACKGROUNDS, NATURE_PROMPTS } from './constants';
import { ReelPreviewCard } from './components/ReelPreviewCard';
import { AboutModal } from './components/AboutModal';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { RecitersLibraryModal } from './components/RecitersLibraryModal';
import { AllSurahsModal } from './components/AllSurahsModal';
import { BackgroundsLibraryModal } from './components/BackgroundsLibraryModal';
import { renderReelToCanvas } from './services/canvasRenderer';
import { getReciterAudioUrl } from './services/audioService';

export function App() {
  const [config, setConfig] = useState<ReelConfig>({
    surahName: 'سورة الفاتحة',
    ayahText: PRESET_SURAHS[0].ayahs[0].arabicText,
    ayahTranslation: PRESET_SURAHS[0].ayahs[0].translationEn,
    translationLang: 'en',
    surahNumber: 1,
    fromAyah: 1,
    toAyah: 4,
    reciter: RECITERS_123[0].name,
    reciterId: RECITERS_123[0].id,
    theme: 'emerald_gold',
    textAnimation: 'glow_pulse',
    showTranslation: true,
    showReciterName: true,
    showSurahBadge: true,
    showAudioWave: true,
    isAudioLoop: false,
    frameStyle: 'classic_gold',
    fontFamily: 'amiri',
    fontSize: 24,
    aspectRatio: '9:16',
    backgroundType: 'preset_curated',
    videoDuration: 6,
  });

  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'typography' | 'aspect' | 'background' | 'generate'>('content');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(CURATED_BACKGROUNDS[0].url);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  
  // Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isRecitersModalOpen, setIsRecitersModalOpen] = useState(false);
  const [isAllSurahsModalOpen, setIsAllSurahsModalOpen] = useState(false);
  const [isBgLibraryModalOpen, setIsBgLibraryModalOpen] = useState(false);

  // Audio Playback State
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generation & Status states
  const [isAiGeneratingBg, setIsAiGeneratingBg] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideoBlobUrl, setGeneratedVideoBlobUrl] = useState<string | null>(null);
  const [customBgPrompt, setCustomBgPrompt] = useState(NATURE_PROMPTS[0]);
  const [videoPromptText, setVideoPromptText] = useState('Smooth tranquil drone camera motion pushing forward with spiritual reverence, cinematic 4k lighting');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export states
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done' | 'error'>('idle');
  const [gallerySaveState, setGallerySaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentReciterObj = RECITERS_123.find(r => r.id === config.reciterId) || RECITERS_123[0];
  const currentSurahMeta = ALL_114_SURAHS.find(s => s.number === config.surahNumber) || ALL_114_SURAHS[0];

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => setAudioTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration || 0);
      setAudioError(null);
    };
    const handleEnded = () => {
      if (config.isAudioLoop) {
        audio.currentTime = 0;
        audio.play();
      } else {
        setIsPlayingAudio(false);
        setIsPlayingPreview(false);
        setAudioTime(0);
      }
    };
    const handleError = () => {
      setAudioError('تنبيه: جاري التبديل للمخدم الاحتياطي للقارئ...');
      setIsPlayingAudio(false);
      setIsPlayingPreview(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [config.isAudioLoop]);

  useEffect(() => {
    if (!audioRef.current) return;
    const url = getReciterAudioUrl(currentReciterObj.audioServerSlug, config.surahNumber);
    const wasPlaying = isPlayingAudio;
    
    audioRef.current.src = url;
    audioRef.current.load();
    setAudioTime(0);
    setAudioError(null);

    if (wasPlaying) {
      audioRef.current.play().catch(() => {
        setIsPlayingAudio(false);
      });
    }
  }, [currentReciterObj.audioServerSlug, config.surahNumber]);

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlayingAudio(true);
          setIsPlayingPreview(true);
          setAudioError(null);
        })
        .catch(() => {
          setAudioError('تعذر بدء التشغيل المباشر، يرجى اختيار قارئ بديل.');
          setIsPlayingAudio(false);
        });
    }
  };

  const handleSeekAudio = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setAudioTime(time);
  };

  const handleSelectAyahPreset = (surahIdx: number, ayahIdx: number) => {
    const surah = PRESET_SURAHS[surahIdx];
    const ayah = surah.ayahs[ayahIdx];
    const trans = config.translationLang === 'fr' ? (ayah.translationFr || ayah.translationEn) : ayah.translationEn;
    setConfig(prev => ({
      ...prev,
      surahName: surah.name,
      surahNumber: surah.number,
      ayahText: ayah.arabicText,
      ayahTranslation: trans,
      fromAyah: ayah.ayahNumber,
      toAyah: ayah.ayahNumber,
    }));
  };

  const handleToggleLanguage = (lang: TranslationLanguage) => {
    const currentPreset = PRESET_SURAHS.find(s => s.number === config.surahNumber);
    const matchedAyah = currentPreset?.ayahs.find(a => a.ayahNumber === config.fromAyah);

    let newTranslation = config.ayahTranslation;
    if (matchedAyah) {
      newTranslation = lang === 'fr' ? (matchedAyah.translationFr || matchedAyah.translationEn) : matchedAyah.translationEn;
    }

    setConfig(prev => ({
      ...prev,
      translationLang: lang,
      ayahTranslation: newTranslation,
    }));
  };

  const handleSelectReciter = (reciter: ReciterOption) => {
    setConfig(prev => ({
      ...prev,
      reciter: reciter.name,
      reciterId: reciter.id,
    }));
    setStatusMessage(`تم اختيار القارئ: ${reciter.name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSelectSurahMeta = (surah: SurahMeta) => {
    setConfig(prev => ({
      ...prev,
      surahName: `سورة ${surah.name}`,
      surahNumber: surah.number,
      fromAyah: 1,
      toAyah: Math.min(5, surah.ayahsCount),
    }));
    setStatusMessage(`تم اختيار: سورة ${surah.name} (عدد آياتها ${surah.ayahsCount})`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const resultDataUrl = uploadEvent.target?.result as string;
      setBackgroundUrl(resultDataUrl);
      setConfig(prev => ({ ...prev, backgroundType: 'uploaded' }));
      setStatusMessage('تم رفع صورتك بنجاح كخلفية للتصميم!');
      setTimeout(() => setStatusMessage(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAiBackground = async () => {
    setErrorMessage(null);
    setIsAiGeneratingBg(true);
    setStatusMessage('جاري توليد خلفية طبيعية فائقة الدقة بالذكاء الاصطناعي (Nano Banana Pro)...');

    const aspectMap: Record<AspectRatioType, string> = {
      '9:16': '9:16',
      '16:9': '16:9',
      '1:1': '1:1',
      '4:5': '3:4',
    };

    try {
      const result = await Flow.generate.image({
        prompt: `${customBgPrompt}, spiritual reverence, serene, majestic atmospheric, no text, no characters`,
        modelDisplayName: '🍌 Nano Banana Pro',
        aspectRatio: aspectMap[config.aspectRatio] || '9:16',
      });

      const url = `data:${result.mimeType};base64,${result.base64}`;
      setBackgroundUrl(url);
      setStatusMessage('تم توليد الخلفية بنجاح!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'تعذر توليد الخلفية بالذكاء الاصطناعي');
    } finally {
      setIsAiGeneratingBg(false);
    }
  };

  const handleDownloadCard = async () => {
    if (!canvasRef.current) return;
    setDownloadState('downloading');
    setErrorMessage(null);

    try {
      const base64 = await renderReelToCanvas(canvasRef.current, config, backgroundUrl);
      await Flow.download({
        base64,
        mimeType: 'image/png',
        filename: `quran_card_${config.surahNumber}_${config.fromAyah}_${config.toAyah}.png`,
      });
      setDownloadState('done');
      setTimeout(() => setDownloadState('idle'), 2000);
    } catch (err) {
      setDownloadState('error');
      setErrorMessage(err instanceof Error ? err.message : 'فشل تنزيل تصميم الريل');
      setTimeout(() => setDownloadState('idle'), 3000);
    }
  };

  const handleSaveToGallery = async () => {
    if (!canvasRef.current) return;
    setGallerySaveState('saving');
    setErrorMessage(null);

    try {
      const base64 = await renderReelToCanvas(canvasRef.current, config, backgroundUrl);
      await Flow.save({
        base64,
        mimeType: 'image/png',
        name: `ريلز ${config.surahName} (الآيات ${config.fromAyah}-${config.toAyah})`,
      });
      setGallerySaveState('saved');
      setTimeout(() => setGallerySaveState('idle'), 2500);
    } catch (err) {
      setGallerySaveState('error');
      setErrorMessage(err instanceof Error ? err.message : 'فشل الحفظ في المعرض');
      setTimeout(() => setGallerySaveState('idle'), 3000);
    }
  };

  const handleGenerateVideoReel = async () => {
    if (!canvasRef.current) return;
    setErrorMessage(null);
    setIsGeneratingVideo(true);
    setStatusMessage('جاري تصيير بطاقة الريلز وتحويلها إلى مقطع فيديو سينمائي متحرك (Omni 1.1 Flash)... قد يستغرق ذلك دقيقة.');

    try {
      const base64 = await renderReelToCanvas(canvasRef.current, config, backgroundUrl);

      const uploadRes = await Flow.upload({
        base64,
        mimeType: 'image/png',
        name: `Reel_Frame_${Date.now()}`,
      });

      const videoResult = await Flow.generate.video({
        prompt: `${videoPromptText}, smooth subtle camera motion, peaceful atmospheric, spiritual reverence`,
        firstFrameImageMediaId: uploadRes.mediaId,
        modelDisplayName: 'Omni 1.1 Flash',
        aspectRatio: config.aspectRatio === '16:9' ? '16:9' : '9:16',
        durationSeconds: config.videoDuration,
        resolution: '720p',
      });

      const bytes = Uint8Array.from(atob(videoResult.base64), c => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: videoResult.mimeType });
      const blobUrl = URL.createObjectURL(blob);
      setGeneratedVideoBlobUrl(blobUrl);
      setStatusMessage('تم إنشاء فيديو الريلز القرآني بنجاح! تم حفظه تلقائياً في معرض الوسائط.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء توليد الفيديو. يرجى المحاولة مجدداً.');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-amber-500/20 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="material-symbols-outlined text-slate-950 text-[24px]">auto_stories</span>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-amber-300">استوديو ريلز وشورتس القرآن الكريم</h1>
              <p className="text-[11px] text-slate-400">
                متصفح دقيق للآيات (من X إلى Y) • ترجمة EN/FR • مكتبة خلفيات 1500+ • 4 أبعاد فيديو
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBgLibraryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-xs font-semibold border border-teal-500/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">wallpaper</span>
              <span className="hidden sm:inline">مكتبة الـ 1500+ خلفية</span>
            </button>

            <button
              onClick={() => setIsRecitersModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">library_music</span>
              <span className="hidden sm:inline">الـ 123 قارئاً</span>
            </button>

            <button
              onClick={() => setIsAboutOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">info</span>
              <span>عن الأداة</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-5 flex flex-col items-center space-y-4">
          <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[17px]">visibility</span>
                شاشة المعاينة الفورية (Live Video Preview)
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                {config.aspectRatio}
              </span>
            </div>

            <ReelPreviewCard
              config={config}
              canvasRef={canvasRef}
              isPlayingPreview={isPlayingPreview}
              onTogglePlay={() => {
                const next = !isPlayingPreview;
                setIsPlayingPreview(next);
                if (next && !isPlayingAudio) {
                  handleToggleAudio();
                } else if (!next && isPlayingAudio) {
                  handleToggleAudio();
                }
              }}
              backgroundUrl={backgroundUrl}
            />

            <div className="grid grid-cols-2 gap-2 mt-5">
              <button
                onClick={handleDownloadCard}
                disabled={downloadState === 'downloading'}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] text-amber-400">download</span>
                <span>
                  {downloadState === 'downloading'
                    ? 'جاري التنزيل...'
                    : downloadState === 'done'
                    ? 'تم التنزيل ✓'
                    : 'تنزيل كصورة عالية الدقة'}
                </span>
              </button>

              <button
                onClick={handleSaveToGallery}
                disabled={gallerySaveState === 'saving'}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-60 active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px] text-teal-400">photo_library</span>
                <span>
                  {gallerySaveState === 'saving'
                    ? 'جاري الحفظ...'
                    : gallerySaveState === 'saved'
                    ? 'تم الحفظ بالمعرض ✓'
                    : 'حفظ بالمعرض'}
                </span>
              </button>
            </div>
          </div>

          <div className="w-full">
            <AudioPlayerBar
              currentReciter={currentReciterObj}
              isPlaying={isPlayingAudio}
              onTogglePlay={handleToggleAudio}
              audioTime={audioTime}
              audioDuration={audioDuration}
              onSeek={handleSeekAudio}
              audioError={audioError}
              onSelectReciterModal={() => setIsRecitersModalOpen(true)}
              surahNumber={config.surahNumber}
              surahName={config.surahName}
              isAudioLoop={config.isAudioLoop}
              onToggleLoop={() => setConfig(prev => ({ ...prev, isAudioLoop: !prev.isAudioLoop }))}
            />
          </div>

          {generatedVideoBlobUrl && (
            <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-xl animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">movie</span>
                  فيديو الريل المعتمد للنشر
                </span>
                <span className="text-[10px] text-slate-400">تم الحفظ التلقائي في المعرض</span>
              </div>
              <video
                src={generatedVideoBlobUrl}
                controls
                autoPlay
                loop
                className="w-full rounded-xl border border-slate-700 aspect-[9/16] object-cover bg-black"
              />
            </div>
          )}
        </section>

        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-2xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'content'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">menu_book</span>
              <span>السورة والآيات</span>
            </button>

            <button
              onClick={() => setActiveTab('aspect')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'aspect'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">aspect_ratio</span>
              <span>أبعاد الفيديو</span>
            </button>

            <button
              onClick={() => setActiveTab('typography')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'typography'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">format_size</span>
              <span>الخطوط والأطر</span>
            </button>

            <button
              onClick={() => setActiveTab('background')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'background'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">wallpaper</span>
              <span>الخلفيات (1500+)</span>
            </button>

            <button
              onClick={() => setActiveTab('generate')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'generate'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span className="material-symbols-outlined text-[17px]">videocam</span>
              <span>توليد فيديو</span>
            </button>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{statusMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-400 text-[16px]">bookmark</span>
                  نماذج سريعة لمقاطع شائعة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PRESET_SURAHS.map((surah, sIdx) => (
                    <button
                      key={surah.id}
                      onClick={() => handleSelectAyahPreset(sIdx, 0)}
                      className={`p-2.5 rounded-xl border text-right transition-all text-xs ${
                        config.surahName === surah.name
                          ? 'bg-amber-500/15 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-semibold">{surah.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {surah.ayahs[0].arabicText.slice(0, 24)}...
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">tune</span>
                    متصفح القرآن الحر: تحديد السورة والآيات بدقة
                  </span>
                  <button
                    onClick={() => setIsAllSurahsModalOpen(true)}
                    className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
                  >
                    <span>فهرس السور الـ 114</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">اختر السورة:</label>
                    <select
                      value={config.surahNumber}
                      onChange={(e) => {
                        const num = Number(e.target.value);
                        const match = ALL_114_SURAHS.find(s => s.number === num);
                        if (match) handleSelectSurahMeta(match);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                    >
                      {ALL_114_SURAHS.map(s => (
                        <option key={s.number} value={s.number}>
                          {s.number}. سورة {s.name} ({s.ayahsCount} آية)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">من آية (X):</label>
                    <input
                      type="number"
                      min={1}
                      max={currentSurahMeta.ayahsCount}
                      value={config.fromAyah}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(Number(e.target.value) || 1, currentSurahMeta.ayahsCount));
                        setConfig(prev => ({
                          ...prev,
                          fromAyah: val,
                          toAyah: Math.max(val, prev.toAyah),
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-center text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">إلى آية (Y):</label>
                    <input
                      type="number"
                      min={config.fromAyah}
                      max={currentSurahMeta.ayahsCount}
                      value={config.toAyah}
                      onChange={(e) => {
                        const val = Math.max(config.fromAyah, Math.min(Number(e.target.value) || config.fromAyah, currentSurahMeta.ayahsCount));
                        setConfig(prev => ({ ...prev, toAyah: val }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-center text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  تم تحديد: <span className="text-amber-300 font-bold">{config.surahName}</span> (من آية {config.fromAyah} إلى آية {config.toAyah}) لتحديد المقطع الصوتي بدقة.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  نص الآيات المختارة (بالتشكيل الكامل):
                </label>
                <textarea
                  rows={3}
                  value={config.ayahText}
                  onChange={e => setConfig(prev => ({ ...prev, ayahText: e.target.value }))}
                  dir="rtl"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400 font-serif leading-relaxed"
                  placeholder="أدخل نص الآيات الكريمة..."
                />
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200">
                      <input
                        type="checkbox"
                        checked={config.showTranslation}
                        onChange={e => setConfig(prev => ({ ...prev, showTranslation: e.target.checked }))}
                        className="rounded accent-amber-500 w-4 h-4"
                      />
                      <span>تفعيل الترجمة المدمجة أسفل الآيات</span>
                    </label>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                    <button
                      onClick={() => handleToggleLanguage('en')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        config.translationLang === 'en'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الإنجليزية (English)
                    </button>
                    <button
                      onClick={() => handleToggleLanguage('fr')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        config.translationLang === 'fr'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      الفرنسية (Français)
                    </button>
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={config.ayahTranslation}
                  onChange={e => setConfig(prev => ({ ...prev, ayahTranslation: e.target.value }))}
                  dir="ltr"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  placeholder={config.translationLang === 'fr' ? 'Traduction en français des versets...' : 'English verse meaning and translation...'}
                />
              </div>
            </div>
          )}

          {activeTab === 'aspect' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">aspect_ratio</span>
                  خيارات أبعاد الفيديو (Aspect Ratios)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  اختر النسبة الملائمة للمنصة التي ترغب بنشر المقطع عليها:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ASPECT_RATIOS_CONFIG.map(ratio => {
                  const isSelected = config.aspectRatio === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio.id as AspectRatioType }))}
                      className={`p-4 rounded-2xl border text-right transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 text-white'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[22px]">{ratio.icon}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-amber-200">{ratio.label}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">{ratio.sub}</p>
                        </div>
                      </div>

                      {isSelected && (
                        <span className="material-symbols-outlined text-amber-400 text-[20px]">
                          check_circle
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5">
              <div>
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">font_download</span>
                  التحكم بالخطوط والأطر الزخرفية
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  تنسيق نمط الخط القرآني وتأطير المشهد بأشكال هندسية إسلامية:
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">نوع الخط القرآني:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {QURAN_FONTS.map(font => {
                    const isSelected = config.fontFamily === font.id;
                    return (
                      <button
                        key={font.id}
                        onClick={() => setConfig(prev => ({ ...prev, fontFamily: font.id as QuranFontFamily }))}
                        className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400 text-white font-bold'
                            : 'bg-slate-950 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <span className="text-xs" style={{ fontFamily: font.family }}>{font.name}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-amber-400 text-[18px]">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 block">نمط الإطار الزخرفي الإسلامي:</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'classic_gold', label: 'الذهبي الكلاسيكي' },
                    { id: 'andalusian_arch', label: 'القوس الأندلسي' },
                    { id: 'royal_geometric', label: 'المضلع الملكي' },
                    { id: 'minimal_chic', label: 'بسيط وهادئ' },
                  ].map(frame => (
                    <button
                      key={frame.id}
                      onClick={() => setConfig(prev => ({ ...prev, frameStyle: frame.id as IslamicFrameStyle }))}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        config.frameStyle === frame.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {frame.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">حجم الخط (Font Size):</span>
                  <span className="text-amber-400 font-mono font-bold">{config.fontSize}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">صغير</span>
                  <input
                    type="range"
                    min={16}
                    max={42}
                    value={config.fontSize}
                    onChange={e => setConfig(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                    className="flex-1 accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                  />
                  <span className="text-[11px] text-slate-500">كبير</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px]">badge</span>
                  إظهار وإخفاء عناصر الهوية:
                </span>

                <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                  <span>إظهار اسم القارئ على الفيديو</span>
                  <input
                    type="checkbox"
                    checked={config.showReciterName}
                    onChange={e => setConfig(prev => ({ ...prev, showReciterName: e.target.checked }))}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                  <span>إظهار اسم السورة ورقم الآية</span>
                  <input
                    type="checkbox"
                    checked={config.showSurahBadge}
                    onChange={e => setConfig(prev => ({ ...prev, showSurahBadge: e.target.checked }))}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300 hover:text-white">
                  <span>الموجات الصوتية الحيّة (Audio Wave)</span>
                  <input
                    type="checkbox"
                    checked={config.showAudioWave}
                    onChange={e => setConfig(prev => ({ ...prev, showAudioWave: e.target.checked }))}
                    className="rounded accent-amber-500 w-4 h-4"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'background' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">wallpaper</span>
                    مكتبة الخلفيات الشاملة (1500+ صورة ورفع الصور)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    اختر من المكتبة المصنفة، أو ارفع صورتك الخاصة مباشرة:
                  </p>
                </div>
                <button
                  onClick={() => setIsBgLibraryModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  <span>تصفح الـ 1500+</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">رفع صورة خاصة من جهازك</p>
                  <p className="text-[11px] text-slate-400">تدعم رفع الصور الشخصية، أو تصوير المسجد النبوي والأقصى</p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLocalFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    <span>رفع صورة من الجهاز</span>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-300 block mb-2">نماذج مختارة من مكتبة الصور:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CURATED_BACKGROUNDS.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setBackgroundUrl(item.url);
                        setConfig(prev => ({ ...prev, backgroundType: 'preset_curated' }));
                      }}
                      className="group relative rounded-xl overflow-hidden border border-slate-800 hover:border-teal-400 aspect-[9/16] text-right"
                    >
                      <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[10px] text-white font-bold line-clamp-1">{item.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <label className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px]">auto_awesome</span>
                  توليد خلفية بالذكاء الاصطناعي (Nano Banana Pro):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customBgPrompt}
                    onChange={e => setCustomBgPrompt(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-400"
                    placeholder="اكتب وصف المشهد بالإنجليزية أو العربية..."
                  />
                  <button
                    onClick={handleGenerateAiBackground}
                    disabled={isAiGeneratingBg}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-xs text-white flex items-center gap-1.5 disabled:opacity-50 transition-all shadow-md active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isAiGeneratingBg ? 'sync' : 'sparkles'}
                    </span>
                    <span>{isAiGeneratingBg ? 'جاري التوليد...' : 'توليد'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'generate' && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5">
              <div className="flex items-start gap-3 bg-gradient-to-r from-amber-500/10 to-teal-500/10 p-3.5 rounded-2xl border border-amber-500/20">
                <span className="material-symbols-outlined text-amber-400 text-[24px]">videocam</span>
                <div>
                  <h3 className="text-xs font-bold text-amber-300">تحويل التصميم إلى فيديو ريلز سينمائي (Omni 1.1 Flash)</h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    يتم تحريك المشهد دراماتيكياً ليتناسق مع التلاوة والتصميم القرآني مع حفظ الفيديو تلقائياً بالمعرض.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-1.5 block">
                  توجيه حركة الكاميرا والجو العام (Video Prompt):
                </label>
                <textarea
                  rows={2}
                  value={videoPromptText}
                  onChange={e => setVideoPromptText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed font-sans"
                  placeholder="وصف حركة الكاميرا (دفع بطيء، تحليق هادئ، إضاءة ذهبية متغيرة)..."
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 mb-2 block">مدة الفيديو:</label>
                <div className="grid grid-cols-4 gap-2">
                  {[4, 6, 8, 10].map(duration => (
                    <button
                      key={duration}
                      onClick={() => setConfig(prev => ({ ...prev, videoDuration: duration }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        config.videoDuration === duration
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {duration} ثوانٍ
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleGenerateVideoReel}
                  disabled={isGeneratingVideo}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/25 transition-all disabled:opacity-50 active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {isGeneratingVideo ? 'hourglass_top' : 'movie_filter'}
                  </span>
                  <span>
                    {isGeneratingVideo
                      ? 'جاري إنتاج فيديو الريل بالذكاء الاصطناعي...'
                      : 'توليد فيديو الريل القرآني الآن'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <RecitersLibraryModal
        isOpen={isRecitersModalOpen}
        onClose={() => setIsRecitersModalOpen(false)}
        selectedReciterId={config.reciterId}
        onSelectReciter={handleSelectReciter}
        activeSurahName={config.surahName}
      />

      <AllSurahsModal
        isOpen={isAllSurahsModalOpen}
        onClose={() => setIsAllSurahsModalOpen(false)}
        selectedSurahNumber={config.surahNumber}
        onSelectSurah={handleSelectSurahMeta}
      />

      <BackgroundsLibraryModal
        isOpen={isBgLibraryModalOpen}
        onClose={() => setIsBgLibraryModalOpen(false)}
        onSelectBackground={(item) => {
          setBackgroundUrl(item.url);
          setConfig(prev => ({ ...prev, backgroundType: 'preset_curated' }));
          setStatusMessage(`تم اختيار الخلفية: ${item.title}`);
          setTimeout(() => setStatusMessage(null), 3000);
        }}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}