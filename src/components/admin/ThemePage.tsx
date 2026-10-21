import React, { useState } from 'react';
import { SystemSettings, ThemeSettings } from '../../types';
import { 
  Palette, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Coffee, 
  ShoppingBag, 
  CheckCircle2, 
  Eye, 
  Layers
} from 'lucide-react';

interface ThemePageProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

interface PresetTheme {
  id: string;
  name: string;
  desc: string;
  colors: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    cardBgColor: string;
    textColor: string;
  };
}

const PRESET_THEMES: PresetTheme[] = [
  {
    id: 'classic-cafe',
    name: 'كلاسيك كافيه بني وذهبي دافئ',
    desc: 'الهوية الأصلية للكافيهات والمطاعم الراقية',
    colors: {
      primaryColor: '#3D271D',
      accentColor: '#D4A373',
      backgroundColor: '#FAF7F2',
      cardBgColor: '#FFFFFF',
      textColor: '#2D1E18'
    }
  },
  {
    id: 'royal-gold',
    name: 'فحم ملكي وذهب عيار 24',
    desc: 'تصميم فخم داكن يعطي انطباع النخبة والفخامة',
    colors: {
      primaryColor: '#1F1E1C',
      accentColor: '#E5A93C',
      backgroundColor: '#F7F5F0',
      cardBgColor: '#FFFFFF',
      textColor: '#1A1A1A'
    }
  },
  {
    id: 'luxury-emerald',
    name: 'زمردي طبيعي وأخضر فاخر',
    desc: 'مناسب للكافيهات العصرية، المأكولات الصحية والأطباق الطازجة',
    colors: {
      primaryColor: '#064E3B',
      accentColor: '#10B981',
      backgroundColor: '#F0FDF4',
      cardBgColor: '#FFFFFF',
      textColor: '#064E3B'
    }
  },
  {
    id: 'midnight-navy',
    name: 'أزرق كحلي عصري (مودرن)',
    desc: 'طابع شبابي حديث وراقي لمقاهي الجيل الجديد',
    colors: {
      primaryColor: '#0F172A',
      accentColor: '#38BDF8',
      backgroundColor: '#F8FAFC',
      cardBgColor: '#FFFFFF',
      textColor: '#0F172A'
    }
  },
  {
    id: 'burgundy-amber',
    name: 'برغندي مخملي وأمبر دافئ',
    desc: 'أجواء عشاء دافئة ومطاعم المشاوي والستيك هاوس الفاخرة',
    colors: {
      primaryColor: '#4A0404',
      accentColor: '#F59E0B',
      backgroundColor: '#FFFBEB',
      cardBgColor: '#FFFFFF',
      textColor: '#380202'
    }
  },
  {
    id: 'sunset-orange',
    name: 'غروب شمس برتقالي حيوي',
    desc: 'طاقة عالية ومظهر مشهي وجذاب للبرجر والبيتزا والوجبات السريعة',
    colors: {
      primaryColor: '#7C2D12',
      accentColor: '#F97316',
      backgroundColor: '#FFF7ED',
      cardBgColor: '#FFFFFF',
      textColor: '#431407'
    }
  }
];

export const ThemePage: React.FC<ThemePageProps> = ({
  settings,
  setSettings
}) => {
  const currentTheme = settings.themeSettings || PRESET_THEMES[0].colors;

  const [primaryColor, setPrimaryColor] = useState(currentTheme.primaryColor || '#3D271D');
  const [accentColor, setAccentColor] = useState(currentTheme.accentColor || '#D4A373');
  const [backgroundColor, setBackgroundColor] = useState(currentTheme.backgroundColor || '#FAF7F2');
  const [cardBgColor, setCardBgColor] = useState(currentTheme.cardBgColor || '#FFFFFF');
  const [textColor, setTextColor] = useState(currentTheme.textColor || '#2D1E18');
  
  // Splash Screen States
  const [splashEnabled, setSplashEnabled] = useState(settings.splashScreenEnabled !== false);
  const [splashDuration, setSplashDuration] = useState(settings.splashDuration || 2);
  const [splashStyle, setSplashStyle] = useState<'dark-luxury' | 'light-clean' | 'emerald-botanical' | 'sunset-modern'>((settings.splashStyle as any) || 'dark-luxury');
  const [splashSubtitle, setSplashSubtitle] = useState(settings.splashSubtitle || 'نكهة أصيلة، جودة استثنائية، وخدمة سريعة لطاولتك مباشرة');
  const [splashLogoUrl, setSplashLogoUrl] = useState(settings.splashLogoUrl || '');

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSplashSettings = () => {
    setSettings(prev => ({
      ...prev,
      splashScreenEnabled: splashEnabled,
      splashDuration: Number(splashDuration) || 2,
      splashStyle,
      splashSubtitle: splashSubtitle.trim(),
      splashLogoUrl: splashLogoUrl.trim()
    }));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Apply a preset
  const handleApplyPreset = (preset: PresetTheme) => {
    setPrimaryColor(preset.colors.primaryColor);
    setAccentColor(preset.colors.accentColor);
    setBackgroundColor(preset.colors.backgroundColor);
    setCardBgColor(preset.colors.cardBgColor);
    setTextColor(preset.colors.textColor);

    const updated: ThemeSettings = {
      preset: preset.id,
      ...preset.colors
    };

    setSettings(prev => ({
      ...prev,
      themeSettings: updated
    }));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Save custom colors
  const handleSaveCustomColors = () => {
    const updated: ThemeSettings = {
      preset: 'custom',
      primaryColor,
      accentColor,
      backgroundColor,
      cardBgColor,
      textColor
    };

    setSettings(prev => ({
      ...prev,
      themeSettings: updated
    }));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Reset to default
  const handleResetDefaults = () => {
    handleApplyPreset(PRESET_THEMES[0]);
  };

  return (
    <div className="space-y-8" style={{ direction: 'rtl' }}>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5D5BC] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold flex-shrink-0">
            <Palette size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2D1E18]">المظهر وتخصيص الألوان بالكامل</h2>
            <p className="text-xs text-stone-500">تغيير هوية وألوان كل جزء في قائمة الطعام لتناسب علامة الكافيه أو المطعم</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-all border border-stone-200"
          >
            <RotateCcw size={14} />
            <span>استعادة الألوان الأصلية</span>
          </button>

          <button
            onClick={handleSaveCustomColors}
            className="flex items-center gap-1.5 bg-[#3D271D] hover:bg-[#2A1D15] text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <Check size={16} />
            <span>حفظ الألوان وتطبيقها الآن</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>تم حفظ لوحة الألوان الجديدة وتطبيقها فوراً على قائمة الطعام للمستخدمين!</span>
        </div>
      )}

      {/* SECTION 1: Ready-Made Preset Palettes */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
            <Sparkles size={18} className="text-[#8C6D48]" />
            <span>سمات ألوان جاهزة بنقرة واحدة (Presets)</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">اختر تركيبة ألوان متناسقة ومجربة بنقرة زر واحدة</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_THEMES.map((preset) => {
            const isSelected = settings.themeSettings?.preset === preset.id || 
              (settings.themeSettings?.primaryColor === preset.colors.primaryColor && settings.themeSettings?.accentColor === preset.colors.accentColor);

            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all hover:scale-101 flex flex-col justify-between ${
                  isSelected 
                    ? 'border-[#3D271D] bg-amber-50/40 shadow-md' 
                    : 'border-stone-200 bg-stone-50 hover:bg-white hover:border-stone-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="font-black text-xs text-[#2D1E18]">{preset.name}</h4>
                    {isSelected && (
                      <span className="bg-[#3D271D] text-white text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Check size={10} />
                        <span>مفعل</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mb-3">{preset.desc}</p>
                </div>

                {/* Swatches preview */}
                <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
                  <div 
                    className="w-7 h-7 rounded-xl shadow-xs border border-white" 
                    style={{ backgroundColor: preset.colors.primaryColor }}
                    title="اللون الأساسي"
                  />
                  <div 
                    className="w-7 h-7 rounded-xl shadow-xs border border-white" 
                    style={{ backgroundColor: preset.colors.accentColor }}
                    title="اللون التمييزي"
                  />
                  <div 
                    className="w-7 h-7 rounded-xl shadow-xs border border-stone-300" 
                    style={{ backgroundColor: preset.colors.backgroundColor }}
                    title="لون الخلفية"
                  />
                  <div 
                    className="w-7 h-7 rounded-xl shadow-xs border border-stone-300" 
                    style={{ backgroundColor: preset.colors.cardBgColor }}
                    title="لون الكرت"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 1.5: Splash Screen & Loading Page Customization */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-5">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
              <Sparkles size={18} className="text-[#8C6D48]" />
              <span>تخصيص صفحة التحميل والترحيب (Splash Screen)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">تحكم في تفعيل صفحة البداية، مدة عرضها، الثيم الفني، والنص الترحيبي والشعار</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              checked={splashEnabled}
              onChange={(e) => setSplashEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            <span className="mr-3 text-xs font-bold text-stone-700">{splashEnabled ? 'مفعلة' : 'معطلة'}</span>
          </label>
        </div>

        {splashEnabled && (
          <div className="space-y-5 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">مدة ظهور صفحة التحميل (بالثواني)</label>
                <select
                  value={splashDuration}
                  onChange={(e) => setSplashDuration(Number(e.target.value))}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-bold text-stone-800 focus:outline-none focus:border-[#3D271D]"
                >
                  <option value={1}>1 ثانية (سريع جداً)</option>
                  <option value={2}>2 ثانية (موصى به)</option>
                  <option value={3}>3 ثوانٍ</option>
                  <option value={4}>4 ثوانٍ</option>
                  <option value={5}>5 ثوانٍ (طويل)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">رابط الشعار المخصص للترحيب (اختياري)</label>
                <input
                  type="text"
                  value={splashLogoUrl}
                  onChange={(e) => setSplashLogoUrl(e.target.value)}
                  placeholder="https://... رابط صورة الشعار"
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-[#3D271D]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">النص الترحيبي / السلوجان في صفحة التحميل</label>
              <input
                type="text"
                value={splashSubtitle}
                onChange={(e) => setSplashSubtitle(e.target.value)}
                placeholder="نكهة أصيلة، جودة استثنائية..."
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 focus:outline-none focus:border-[#3D271D]"
              />
            </div>

            {/* Visual Styles / Templates */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-2">اختر شكل وثيم صفحة التحميل (Templates)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { id: 'dark-luxury', name: 'داكن ملكي فاخر', desc: 'بني داكن مع وهج ذهبي راقي', bg: 'bg-[#1A0F09] text-amber-300' },
                  { id: 'light-clean', name: 'مشرق بسيط وأنيق', desc: 'خلفية فاتحة وناعمة', bg: 'bg-[#FAF7F2] text-[#3D271D] border border-stone-200' },
                  { id: 'emerald-botanical', name: 'أخضر زمردي طبيعي', desc: 'أخضر نباتي منعش وفاخر', bg: 'bg-[#064E3B] text-emerald-200' },
                  { id: 'sunset-modern', name: 'برغندي وبرتقالي عصري', desc: 'أجواء دافئة وحيوية', bg: 'bg-[#4A0404] text-amber-200' }
                ].map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setSplashStyle(st.id as any)}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      splashStyle === st.id 
                        ? 'border-[#3D271D] ring-2 ring-[#3D271D]/20 shadow-md bg-amber-50/30' 
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50'
                    }`}
                  >
                    <div className={`w-full h-10 rounded-xl mb-2 flex items-center justify-center font-bold text-xs shadow-inner ${st.bg}`}>
                      شكل {st.name.split(' ')[0]}
                    </div>
                    <h5 className="font-black text-xs text-stone-900">{st.name}</h5>
                    <p className="text-[10px] text-stone-500 mt-0.5">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveSplashSettings}
                className="py-3 px-6 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <Check size={16} />
                <span>حفظ إعدادات صفحة التحميل وتطبيقها</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: Custom Color Pickers & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Custom Pickers Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
              <Palette size={18} className="text-[#8C6D48]" />
              <span>تخصيص الألوان يدوياً (Custom Pickers)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">يمكنك اختيار أي كود لوني بدقة بالضغط على المربع اللوني أو كتابة الكود</p>
          </div>

          <div className="space-y-4">
            
            {/* 1. Primary Color */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">اللون الأساسي (Primary Color)</span>
                <span className="text-[11px] text-stone-500">يستخدم في الأزرار الرئيسية، الهيدر، والعناوين</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-24 p-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-center uppercase"
                />
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* 2. Accent Color */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">اللون التمييزي (Accent Color)</span>
                <span className="text-[11px] text-stone-500">للشارات، الأسعار المميزة، والخطوط الذهبية</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-24 p-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-center uppercase"
                />
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* 3. Background Color */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">لون خلفية صفحة المنيو (Background)</span>
                <span className="text-[11px] text-stone-500">لون الأرضية العامة للمنيو للزبائن</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-24 p-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-center uppercase"
                />
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* 4. Card Background Color */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">لون كروت الأصناف (Card Background)</span>
                <span className="text-[11px] text-stone-500">لون بطاقات المشروبات والمأكولات</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cardBgColor}
                  onChange={(e) => setCardBgColor(e.target.value)}
                  className="w-24 p-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-center uppercase"
                />
                <input
                  type="color"
                  value={cardBgColor}
                  onChange={(e) => setCardBgColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

            {/* 5. Text Color */}
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-stone-800 block">لون النصوص الرئيسي (Text Color)</span>
                <span className="text-[11px] text-stone-500">لون الخط والعناوين وأسماء الأصناف</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-24 p-2 bg-white border border-stone-300 rounded-xl text-xs font-mono font-bold text-center uppercase"
                />
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-xl border border-stone-300 cursor-pointer p-0.5"
                />
              </div>
            </div>

          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveCustomColors}
              className="w-full py-3 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Check size={16} />
              <span>تطبيق الألوان المخصصة الآن</span>
            </button>
          </div>
        </div>

        {/* Live Interactive Preview */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-4 sticky top-28">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <h3 className="font-black text-sm text-[#2D1E18] flex items-center gap-1.5">
              <Eye size={16} className="text-[#8C6D48]" />
              <span>معاينة حية وفورية للألوان</span>
            </h3>
            <span className="text-[10px] text-stone-400 font-bold">تحديث لحظي</span>
          </div>

          {/* Simulated Mobile Screen Container */}
          <div 
            className="p-5 rounded-3xl border shadow-inner transition-colors duration-300"
            style={{ backgroundColor: backgroundColor, color: textColor }}
          >
            {/* Header snippet */}
            <div 
              className="p-3.5 rounded-2xl text-white shadow-sm flex items-center justify-between mb-4"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex items-center gap-2">
                <Coffee size={18} />
                <span className="font-black text-xs">{settings.systemName || 'كافيه ومطعم'}</span>
              </div>
              <span 
                className="text-[10px] font-black px-2 py-0.5 rounded-full text-black shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                طاولة (5)
              </span>
            </div>

            {/* Simulated MenuItem Card */}
            <div 
              className="rounded-2xl p-3.5 shadow-sm border border-black/5 space-y-3 transition-colors duration-300"
              style={{ backgroundColor: cardBgColor }}
            >
              <div className="relative h-28 w-full rounded-xl overflow-hidden bg-stone-800">
                <img 
                  src="https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=400&q=80" 
                  alt="Coffee Sample" 
                  className="w-full h-full object-cover"
                />
                <span 
                  className="absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full text-black shadow"
                  style={{ backgroundColor: accentColor }}
                >
                  الأكثر طلباً ⭐
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-xs" style={{ color: textColor }}>كابتشينو كراميل فاخر</h5>
                  <span className="font-black text-xs font-mono" style={{ color: primaryColor }}>
                    65 {settings.currencySymbol || 'ج.م'}
                  </span>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">قهوة إسبريسو غنية مع حليب مبخر وصوص كراميل ذهبي طازج.</p>
              </div>

              <button
                type="button"
                className="w-full py-2 rounded-xl font-bold text-xs text-white shadow-xs flex items-center justify-center gap-1.5 transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                <ShoppingBag size={13} />
                <span>إضافة إلى الطلب</span>
              </button>
            </div>

            {/* Simulated Footer snippet */}
            <div className="mt-4 pt-3 border-t border-black/10 text-center text-[10px] text-stone-500">
              <span>{settings.systemName} &bull; تصميم المنيو الذكي</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
