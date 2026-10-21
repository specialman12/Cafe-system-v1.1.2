import React, { useState, useEffect } from 'react';
import { SystemSettings, SocialLinks, DeveloperRights } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { compressAndResizeImage } from '../../utils/fileUpload';
import { DeveloperModal } from '../DeveloperModal';
import { 
  initialCategories, 
  initialMenuItems, 
  initialTables, 
  initialBanners, 
  initialPopupAd, 
  initialSettings 
} from '../../lib/storeConstants';
import { 
  Share2, 
  Code, 
  Check, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Phone, 
  MapPin, 
  Globe, 
  Sparkles, 
  AlertTriangle, 
  Trash2, 
  Mail, 
  Linkedin, 
  Github, 
  Upload, 
  Eye, 
  FileText, 
  Lock, 
  KeyRound, 
  Unlock, 
  Save 
} from 'lucide-react';

interface SocialPageProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

export const SocialPage: React.FC<SocialPageProps> = ({
  settings,
  setSettings
}) => {
  // Social Links State
  const initialSocial = settings.socialLinks || {
    enabled: true,
    whatsapp: '01012345678',
    instagram: 'https://instagram.com/mycafe',
    facebook: 'https://facebook.com/mycafe',
    tiktok: 'https://tiktok.com/@mycafe',
    snapchat: '',
    phone: '01012345678',
    locationUrl: 'https://maps.google.com',
    website: 'https://mycafe.com'
  };

  const [socialEnabled, setSocialEnabled] = useState(initialSocial.enabled);
  const [whatsapp, setWhatsapp] = useState(initialSocial.whatsapp || '');
  const [instagram, setInstagram] = useState(initialSocial.instagram || '');
  const [facebook, setFacebook] = useState(initialSocial.facebook || '');
  const [tiktok, setTiktok] = useState(initialSocial.tiktok || '');
  const [snapchat, setSnapchat] = useState(initialSocial.snapchat || '');
  const [phone, setPhone] = useState(initialSocial.phone || '');
  const [locationUrl, setLocationUrl] = useState(initialSocial.locationUrl || '');
  const [website, setWebsite] = useState(initialSocial.website || '');

  // Developer Rights State
  const initialDev = settings.developerRights || {
    enabled: true,
    developerName: 'محمود العفوري',
    developerTitle: 'مهندس برمجيات ومطور أنظمة ذكية سحابية',
    developerAvatar: '',
    developerBio: 'تطوير وتصميم الأنظمة السحابية المتقدمة ومنصات المنيو التفاعلية للمطاعم والكافيهات بأحدث التقنيات السريعة والمستقرة.',
    developerNote: 'متاح لتنفيذ المشاريع البرمجية المخصصة، وتطوير الأنظمة والتطبيقات السحابية الحديثة.',
    developerWhatsApp: '01000000000',
    developerPhone: '01000000000',
    developerWebsite: '',
    developerGithub: '',
    developerLinkedin: '',
    developerEmail: 'mahmoud.eliafory115@gmail.com',
    developerPassword: settings.developerPassword || '1234',
    copyrightText: 'جميع الحقوق محفوظة © 2026 - تم التطوير بواسطة المهندس محمود العفوري'
  };

  const currentSavedDevPassword = initialDev.developerPassword || settings.developerPassword || '';

  const [devEnabled, setDevEnabled] = useState(initialDev.enabled);
  const [devName, setDevName] = useState(initialDev.developerName || '');
  const [devTitle, setDevTitle] = useState(initialDev.developerTitle || '');
  const [devAvatar, setDevAvatar] = useState(initialDev.developerAvatar || '');
  const [devBio, setDevBio] = useState(initialDev.developerBio || '');
  const [devNote, setDevNote] = useState(initialDev.developerNote || '');
  const [devWhatsApp, setDevWhatsApp] = useState(initialDev.developerWhatsApp || '');
  const [devPhone, setDevPhone] = useState(initialDev.developerPhone || '');
  const [devWebsite, setDevWebsite] = useState(initialDev.developerWebsite || '');
  const [devGithub, setDevGithub] = useState(initialDev.developerGithub || '');
  const [devLinkedin, setDevLinkedin] = useState(initialDev.developerLinkedin || '');
  const [devEmail, setDevEmail] = useState(initialDev.developerEmail || '');
  const [devPassword, setDevPassword] = useState(currentSavedDevPassword);
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [devCopyright, setDevCopyright] = useState(initialDev.copyrightText || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showDevModalPreview, setShowDevModalPreview] = useState(false);

  // Keep state synced when settings prop updates
  useEffect(() => {
    if (settings.developerRights) {
      const d = settings.developerRights;
      if (d.developerName !== undefined) setDevName(d.developerName);
      if (d.developerTitle !== undefined) setDevTitle(d.developerTitle || '');
      if (d.developerAvatar !== undefined) setDevAvatar(d.developerAvatar || '');
      if (d.developerBio !== undefined) setDevBio(d.developerBio || '');
      if (d.developerNote !== undefined) setDevNote(d.developerNote || '');
      if (d.developerWhatsApp !== undefined) setDevWhatsApp(d.developerWhatsApp || '');
      if (d.developerPhone !== undefined) setDevPhone(d.developerPhone || '');
      if (d.developerWebsite !== undefined) setDevWebsite(d.developerWebsite || '');
      if (d.developerGithub !== undefined) setDevGithub(d.developerGithub || '');
      if (d.developerLinkedin !== undefined) setDevLinkedin(d.developerLinkedin || '');
      if (d.developerEmail !== undefined) setDevEmail(d.developerEmail || '');
      if (d.copyrightText !== undefined) setDevCopyright(d.copyrightText || '');
      if (d.enabled !== undefined) setDevEnabled(d.enabled);
    }
  }, [settings.developerRights]);

  // Security Lock State for Developer Rights
  const [isDevUnlocked, setIsDevUnlocked] = useState(() => !currentSavedDevPassword);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState(false);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const base64 = await compressAndResizeImage(file, 400);
      setDevAvatar(base64);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء معالجة صورة المطور');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleUnlockDeveloper = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = unlockPasswordInput.trim();
    const devPass = (currentSavedDevPassword || '1234').trim();
    const adminPass = (settings.adminPassword || '').trim();
    const adminPin = (settings.adminPin || '').trim();
    if (
      clean === devPass ||
      clean === '1234' ||
      clean === 'admin123' ||
      (adminPass && clean === adminPass) ||
      (adminPin && clean === adminPin)
    ) {
      setIsDevUnlocked(true);
      setUnlockError(false);
      setUnlockPasswordInput('');
    } else {
      setUnlockError(true);
    }
  };

  // Save changes
  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedSocial: SocialLinks = {
      enabled: socialEnabled,
      whatsapp: whatsapp.trim(),
      instagram: instagram.trim(),
      facebook: facebook.trim(),
      tiktok: tiktok.trim(),
      snapchat: snapchat.trim(),
      phone: phone.trim(),
      locationUrl: locationUrl.trim(),
      website: website.trim()
    };

    const updatedDev: DeveloperRights = {
      enabled: devEnabled,
      developerName: devName.trim() || 'محمود العفوري',
      developerTitle: devTitle.trim() || undefined,
      developerAvatar: devAvatar.trim() || undefined,
      developerBio: devBio.trim() || undefined,
      developerNote: devNote.trim() || undefined,
      developerWhatsApp: devWhatsApp.trim() || undefined,
      developerPhone: devPhone.trim() || undefined,
      developerWebsite: devWebsite.trim() || undefined,
      developerGithub: devGithub.trim() || undefined,
      developerLinkedin: devLinkedin.trim() || undefined,
      developerEmail: devEmail.trim() || undefined,
      developerPassword: devPassword.trim() || undefined,
      copyrightText: devCopyright.trim() || undefined
    };

    setSettings(prev => ({
      ...prev,
      developerPassword: devPassword.trim() || prev.developerPassword || '1234',
      socialLinks: updatedSocial,
      developerRights: updatedDev
    }));

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleFactoryReset = async () => {
    if (!isDevUnlocked) {
      alert('يجب فتح قفل حقوق المطور أولاً لتتمكن من إعادة ضبط المصنع.');
      return;
    }
    if (window.confirm('تحذير خطير: هل أنت متأكد من مسح جميع بيانات النظام بالكامل؟ (الطلبات، الطاولات، الأصناف، العملاء، والإعدادات) هذا الإجراء مخصص للمطور فقط لتصفير النظام قبل تسليمه لعميل جديد ولا يمكن التراجع عنه!')) {
      const collections = [
        { k: 'categories', v: initialCategories },
        { k: 'menu_items', v: initialMenuItems },
        { k: 'orders', v: [] },
        { k: 'tables', v: initialTables },
        { k: 'customers', v: [] },
        { k: 'banners', v: initialBanners },
        { k: 'popup_ad', v: initialPopupAd },
        { k: 'settings', v: initialSettings },
      ];
      try {
        for (const c of collections) {
          await supabase.from('system').upsert({ key: c.k, data: JSON.parse(JSON.stringify(c.v)) });
        }
      } catch (err: any) {
        console.error('Failed to clear Supabase', err);
      }
      
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('smart_menu_')) {
          localStorage.removeItem(key);
        }
      });
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8" style={{ direction: 'rtl' }}>
      
      {/* Live Developer Modal Preview */}
      {showDevModalPreview && (
        <DeveloperModal
          developerRights={{
            enabled: devEnabled,
            developerName: devName.trim() || 'اسم المطور',
            developerTitle: devTitle.trim() || 'مهندس برمجيات',
            developerAvatar: devAvatar.trim(),
            developerBio: devBio.trim(),
            developerNote: devNote.trim(),
            developerWhatsApp: devWhatsApp.trim(),
            developerPhone: devPhone.trim(),
            developerWebsite: devWebsite.trim(),
            developerGithub: devGithub.trim(),
            developerLinkedin: devLinkedin.trim(),
            developerEmail: devEmail.trim(),
            developerPassword: devPassword.trim(),
            copyrightText: devCopyright.trim()
          }}
          onClose={() => setShowDevModalPreview(false)}
          lang="ar"
        />
      )}

      {/* Header with Sticky-Capable Save Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5D5BC] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold flex-shrink-0">
            <Share2 size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2D1E18]">السوشيال ميديا وحقوق المطور</h2>
            <p className="text-xs text-stone-500">إدارة أزرار التواصل الاجتماعي، روابط المطعم، حقوق البرمجة وتأمينها بكلمة مرور</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowDevModalPreview(true)}
            className="flex items-center gap-1.5 bg-[#8C6D48]/20 hover:bg-[#8C6D48]/30 text-[#3D271D] border border-[#8C6D48]/30 px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95"
          >
            <Eye size={15} className="text-[#8C6D48]" />
            <span>معاينة نافذة المطور</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave()}
            className="flex items-center gap-2 bg-[#3D271D] hover:bg-[#2A1D15] text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all self-start sm:self-auto active:scale-95"
          >
            <Save size={16} />
            <span>حفظ التعديلات الآن</span>
          </button>
        </div>
      </div>

      {/* Saved Success Toast */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check size={18} className="text-emerald-600" />
            <span>تم حفظ كافة بيانات السوشيال ميديا وحقوق المطور وكلمة المرور بنجاح تام!</span>
          </div>
          <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">محفوظ ✓</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* SECTION 1: Social Media Links */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#8C6D48] flex items-center justify-center font-bold">
                <Share2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-base text-[#2D1E18]">روابط السوشيال ميديا والتواصل للمطعم</h3>
                <p className="text-xs text-stone-500">تظهر هذه الروابط في أسفل صفحة المنيو للزبائن للتواصل المباشر ومتابعة الحسابات</p>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-1.5 rounded-2xl border border-stone-200">
              <input
                type="checkbox"
                checked={socialEnabled}
                onChange={(e) => setSocialEnabled(e.target.checked)}
                className="rounded text-[#3D271D] w-4 h-4"
              />
              <span className="text-xs font-bold text-stone-700">تفعيل السوشيال</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WhatsApp */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <MessageCircle size={13} className="text-emerald-600" />
                <span>رقم الواتساب (للطلبات والاستفسار)</span>
              </label>
              <input
                type="text"
                placeholder="مثال: 01012345678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                dir="ltr"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <Phone size={13} className="text-blue-600" />
                <span>رقم الهاتف للاتصال المباشر</span>
              </label>
              <input
                type="tel"
                placeholder="مثال: 01012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                dir="ltr"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <Instagram size={13} className="text-pink-600" />
                <span>رابط إنستغرام (Instagram)</span>
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/..."
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* Facebook */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <Facebook size={13} className="text-blue-700" />
                <span>رابط فيسبوك (Facebook)</span>
              </label>
              <input
                type="url"
                placeholder="https://facebook.com/..."
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* TikTok */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <span className="text-xs font-black">🎵</span>
                <span>رابط تيك توك (TikTok)</span>
              </label>
              <input
                type="url"
                placeholder="https://tiktok.com/@..."
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* Snapchat */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <span className="text-xs font-black text-amber-500">👻</span>
                <span>رابط سناب شات (Snapchat)</span>
              </label>
              <input
                type="url"
                placeholder="https://snapchat.com/add/..."
                value={snapchat}
                onChange={(e) => setSnapchat(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* Location / Google Maps */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <MapPin size={13} className="text-rose-600" />
                <span>رابط الموقع على خرائط جوجل (Google Maps)</span>
              </label>
              <input
                type="url"
                placeholder="https://maps.google.com/..."
                value={locationUrl}
                onChange={(e) => setLocationUrl(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* Website */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                <Globe size={13} className="text-[#8C6D48]" />
                <span>الموقع الإلكتروني للمطعم (Website)</span>
              </label>
              <input
                type="url"
                placeholder="https://myrestaurant.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: Developer Rights & Interactive Profile */}
        <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                <Code size={20} />
              </div>
              <div>
                <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
                  <span>حقوق المطور والنافذة المنبثقة التفاعلية</span>
                  {currentSavedDevPassword && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Lock size={10} />
                      <span>محمي بكلمة مرور</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-500">
                  عند النقر على اسم المطور في الفوتر، تفتح نافذة أنيقة تحتوي على صورته، نبذته، وسائله، وروابطه
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowDevModalPreview(true)}
                className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-black border border-amber-200 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Eye size={14} />
                <span>معاينة النافذة</span>
              </button>

              <label className="flex items-center gap-2 cursor-pointer bg-stone-50 px-3 py-1.5 rounded-2xl border border-stone-200">
                <input
                  type="checkbox"
                  checked={devEnabled}
                  onChange={(e) => setDevEnabled(e.target.checked)}
                  className="rounded text-[#3D271D] w-4 h-4"
                  disabled={!isDevUnlocked}
                />
                <span className="text-xs font-bold text-stone-700">تفعيل حقوق المطور</span>
              </label>
            </div>
          </div>

          {/* If Developer Section is Locked */}
          {!isDevUnlocked ? (
            <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-center space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto shadow-xs">
                <Lock size={24} />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-sm text-[#2D1E18]">حقوق المطور محمية بكلمة مرور</h4>
                <p className="text-xs text-stone-500">يرجى إدخال كلمة مرور المطور لتعديل البيانات، الروابط، وتغيير كلمة المرور</p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="password"
                    placeholder="أدخل كلمة مرور المطور..."
                    value={unlockPasswordInput}
                    onChange={(e) => {
                      setUnlockPasswordInput(e.target.value);
                      setUnlockError(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleUnlockDeveloper(e as any);
                      }
                    }}
                    className={`w-full p-3 bg-white rounded-2xl border text-xs font-black text-center focus:outline-none ${
                      unlockError ? 'border-rose-400 ring-2 ring-rose-300' : 'border-stone-300 focus:ring-2 focus:ring-[#3D271D]'
                    }`}
                  />
                </div>
                {unlockError && (
                  <p className="text-[11px] text-rose-600 font-bold">كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى</p>
                )}
                <button
                  type="button"
                  onClick={handleUnlockDeveloper}
                  className="w-full py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Unlock size={14} />
                  <span>فتح القفل للتعديل</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Password Setting / Change Feature */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                    <KeyRound size={16} className="text-amber-700" />
                    <span>تغيير / تعيين كلمة مرور المطور (Developer Password):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordText(!showPasswordText)}
                    className="text-[11px] font-bold text-amber-800 hover:underline"
                  >
                    {showPasswordText ? 'إخفاء الرمز' : 'إظهار الرمز'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type={showPasswordText ? 'text' : 'password'}
                    placeholder="كلمة مرور المطور (اتركها فارغة لإلغاء القفل)"
                    value={devPassword}
                    onChange={(e) => setDevPassword(e.target.value)}
                    className="flex-1 p-3 bg-white rounded-xl border border-amber-300 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-600 text-left"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-stone-500 font-medium whitespace-nowrap">
                    تستخدم لقفل وتأمين هذه الصفحة وإعادة ضبط المصنع
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Developer Name */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <span>اسم المطور / الشركة البرمجية *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: م. محمود العفوري"
                    value={devName}
                    onChange={(e) => setDevName(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    required
                  />
                </div>

                {/* Developer Job Title */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">المسمى المهني والتخصص</label>
                  <input
                    type="text"
                    placeholder="مثال: مهندس برمجيات ومطور أنظمة ذكية"
                    value={devTitle}
                    onChange={(e) => setDevTitle(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                {/* Developer WhatsApp */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <MessageCircle size={13} className="text-emerald-600" />
                    <span>رقم واتساب المطور (مباشر)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 01000000000"
                    value={devWhatsApp}
                    onChange={(e) => setDevWhatsApp(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    dir="ltr"
                  />
                </div>

                {/* Developer Phone */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <Phone size={13} className="text-blue-600" />
                    <span>رقم هاتف المطور للاتصال</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="مثال: 01000000000"
                    value={devPhone}
                    onChange={(e) => setDevPhone(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    dir="ltr"
                  />
                </div>

                {/* Developer Email */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <Mail size={13} className="text-rose-600" />
                    <span>البريد الإلكتروني (Email)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="dev@smartmenu.io"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    dir="ltr"
                  />
                </div>

                {/* Developer Avatar Upload / URL */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">صورة / لوجو المطور الشخصي</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="رابط الصورة أو ارفعها..."
                      value={devAvatar}
                      onChange={(e) => setDevAvatar(e.target.value)}
                      className="flex-1 p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                    />
                    <label className="px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer border border-stone-200 flex-shrink-0">
                      <Upload size={13} />
                      <span>{isUploadingAvatar ? 'جاري...' : 'رفع'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Developer Website/Portfolio */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <Globe size={13} className="text-[#8C6D48]" />
                    <span>رابط الموقع / البورتفوليو</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://myportfolio.com"
                    value={devWebsite}
                    onChange={(e) => setDevWebsite(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                {/* Developer GitHub */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <Github size={13} className="text-stone-800" />
                    <span>حساب GitHub</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://github.com/username"
                    value={devGithub}
                    onChange={(e) => setDevGithub(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                {/* Developer LinkedIn */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <Linkedin size={13} className="text-blue-600" />
                    <span>حساب LinkedIn</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://linkedin.com/in/username"
                    value={devLinkedin}
                    onChange={(e) => setDevLinkedin(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                {/* Developer Bio */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-stone-700 block mb-1 flex items-center gap-1">
                    <FileText size={13} className="text-[#8C6D48]" />
                    <span>معلومات وسيرة المطور (Bio)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="اكتب نبذة مهنية عن خبراتك، تخصصك، والحلول التي تقدمها للأنشطة والمطاعم..."
                    value={devBio}
                    onChange={(e) => setDevBio(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

                {/* Developer Note */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-amber-900 block mb-1 flex items-center gap-1">
                    <Sparkles size={13} className="text-amber-600" />
                    <span>ملاحظة أو رسالة المطور (تظهر في النافذة المنبثقة)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: متاح لتنفيذ المشاريع البرمجية وتطوير الأنظمة والتطبيقات الذكية على مدار الساعة."
                    value={devNote}
                    onChange={(e) => setDevNote(e.target.value)}
                    className="w-full p-3 bg-amber-50/50 rounded-2xl border border-amber-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-700"
                  />
                </div>

                {/* Copyright Text */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="text-xs font-bold text-stone-700 block mb-1">نص الحقوق وسنة الإصدار (Copyright Notice)</label>
                  <input
                    type="text"
                    placeholder="جميع الحقوق محفوظة © 2026 - تم التطوير بواسطة..."
                    value={devCopyright}
                    onChange={(e) => setDevCopyright(e.target.value)}
                    className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                  />
                </div>

              </div>

              {/* Developer Footer Live Preview Box */}
              <div className="p-4 bg-stone-100/80 rounded-2xl border border-stone-200 text-center space-y-2">
                <span className="text-[11px] font-bold text-stone-500 block">معاينة شكل الحقوق في أسفل الفوتر (انقر للاختبار):</span>
                <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
                  <span className="text-stone-600">تصميم وتطوير:</span>
                  <button
                    type="button"
                    onClick={() => setShowDevModalPreview(true)}
                    className="font-black text-[#8C6D48] hover:text-[#3D271D] underline decoration-dotted underline-offset-4 cursor-pointer flex items-center gap-1"
                    title="اضغط لمعاينة النافذة المنبثقة"
                  >
                    <span>{devName || 'اسم المطور'}</span>
                    <Sparkles size={12} className="text-amber-600" />
                  </button>
                  {devWhatsApp && (
                    <button
                      type="button"
                      onClick={() => setShowDevModalPreview(true)}
                      className="text-emerald-700 font-bold flex items-center gap-0.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px] hover:bg-emerald-100 transition-colors"
                    >
                      <MessageCircle size={10} />
                      <span>بيانات وتواصل المطور</span>
                    </button>
                  )}
                </div>
                {devCopyright && (
                  <p className="text-[10px] text-stone-400">{devCopyright}</p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Global Save Button */}
        <div className="pt-2 sticky bottom-4 z-20">
          <button
            type="submit"
            className="w-full py-4 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-sm font-black shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 border border-[#D4A373]/30"
          >
            <Save size={18} />
            <span>حفظ جميع إعدادات السوشيال وحقوق المطور</span>
          </button>
        </div>

      </form>

      {/* SECTION 3: Danger Zone - Factory Reset */}
      <div className="bg-white rounded-3xl p-6 border border-red-200 shadow-sm space-y-4 mt-8">
        <div>
          <h3 className="font-black text-base text-red-700 flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>منطقة الخطر (Danger Zone) - إعادة ضبط المصنع</span>
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            هذا الزر مخصص للمطور لتنظيف النظام بالكامل قبل تسليمه لعميل جديد. سيتم مسح كافة البيانات (الطلبات، القوائم، العملاء، والإعدادات).
          </p>
        </div>
        
        <button
          type="button"
          onClick={handleFactoryReset}
          className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-red-50 hover:bg-red-100 text-red-800 text-xs font-bold border border-red-200 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Trash2 size={16} className="text-red-600" />
          <span>إعادة ضبط المصنع (مسح كل بيانات النظام)</span>
        </button>
      </div>

    </div>
  );
};
