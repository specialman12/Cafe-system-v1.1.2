import React, { useState, useRef, useEffect } from 'react';
import { Banner, PopupAd, Category, Coupon } from '../../types';
import { compressAndResizeImage } from '../../utils/fileUpload';
import { 
  MEAL_PRESETS, 
  isBannerActiveNow, 
  getBannerScheduleDescription,
  formatTime12H,
  formatTimeRange12H
} from '../../utils/scheduleUtils';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Upload, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles, 
  Image as ImageIcon,
  Tag,
  AlertCircle,
  Layers,
  Ticket,
  Clock,
  Link as LinkIcon,
  Calendar,
  Edit,
  CheckCircle2,
  XCircle,
  Timer
} from 'lucide-react';

interface AdsPageProps {
  banners: Banner[];
  setBanners: React.Dispatch<React.SetStateAction<Banner[]>>;
  popupAd: PopupAd;
  setPopupAd: React.Dispatch<React.SetStateAction<PopupAd>>;
  categories?: Category[];
  coupons?: Coupon[];
}

export const AdsPage: React.FC<AdsPageProps> = ({
  banners = [],
  setBanners,
  popupAd,
  setPopupAd,
  categories = [],
  coupons = []
}) => {
  // Modal states
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  // Banner form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formImage, setFormImage] = useState('');
  const [formLinkType, setFormLinkType] = useState<'none' | 'category' | 'coupon' | 'meal_time' | 'external'>('category');
  const [formTargetCategoryId, setFormTargetCategoryId] = useState<string>('');
  const [formTargetCouponCode, setFormTargetCouponCode] = useState<string>('');
  const [formTargetDiscountPercent, setFormTargetDiscountPercent] = useState<number>(15);
  const [formMealTime, setFormMealTime] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'late_night' | 'custom'>('all');
  const [formLinkUrl, setFormLinkUrl] = useState('');
  
  // Custom Time Scheduling Form State
  const [formScheduleEnabled, setFormScheduleEnabled] = useState(false);
  const [formScheduleStartTime, setFormScheduleStartTime] = useState('08:00');
  const [formScheduleEndTime, setFormScheduleEndTime] = useState('14:00');
  const [formAutoHideOutside, setFormAutoHideOutside] = useState(true);

  const [isUploadingBannerImg, setIsUploadingBannerImg] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  // Popup ad editing state
  const [popupTitle, setPopupTitle] = useState(popupAd?.title || 'عروض نهاية الأسبوع المميزة! 🎉');
  const [popupContent, setPopupContent] = useState(popupAd?.content || 'استمتع بخصم 20% على كافة أنواع القهوة المختصة والحلويات عند الطلب من طاولتك مباشرة.');
  const [popupImage, setPopupImage] = useState(popupAd?.image || 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=800&q=80');
  const [popupActive, setPopupActive] = useState(popupAd?.active ?? true);
  const [isUploadingPopupImg, setIsUploadingPopupImg] = useState(false);
  const [popupSavedMsg, setPopupSavedMsg] = useState(false);
  const popupFileInputRef = useRef<HTMLInputElement>(null);

  // Real-time minute tick to refresh active status badges in admin UI
  const [adminTick, setAdminTick] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setAdminTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Quick Meal Time Preset Selector Handler
  const handleSelectMealPreset = (presetId: 'all' | 'breakfast' | 'lunch' | 'dinner' | 'late_night' | 'custom') => {
    setFormMealTime(presetId);
    if (presetId === 'all') {
      setFormScheduleEnabled(false);
    } else if (presetId === 'custom') {
      setFormScheduleEnabled(true);
    } else {
      const preset = MEAL_PRESETS.find((p: any) => p.id === presetId);
      if (preset) {
        setFormScheduleEnabled(true);
        setFormScheduleStartTime(preset.startTime);
        setFormScheduleEndTime(preset.endTime);
        setFormAutoHideOutside(true);
      }
    }
  };

  // Open modal for new banner
  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setFormTitle('');
    setFormSubtitle('');
    setFormBadge('عرض خاص');
    setFormImage('');
    setFormLinkType('category');
    setFormTargetCategoryId(categories[0]?.id || '');
    setFormTargetCouponCode('');
    setFormTargetDiscountPercent(15);
    setFormMealTime('all');
    setFormScheduleEnabled(false);
    setFormScheduleStartTime('08:00');
    setFormScheduleEndTime('14:00');
    setFormAutoHideOutside(true);
    setFormLinkUrl('');
    setShowAddBannerModal(true);
  };

  // Open modal for editing banner
  const handleOpenEditModal = (banner: Banner) => {
    setEditingBanner(banner);
    setFormTitle(banner.title);
    setFormSubtitle(banner.subtitle || '');
    setFormBadge(banner.badge || banner.badgeText || '');
    setFormImage(banner.image || '');
    setFormLinkType(banner.linkType || 'category');
    setFormTargetCategoryId(banner.targetCategoryId || '');
    setFormTargetCouponCode(banner.targetCouponCode || '');
    setFormTargetDiscountPercent(banner.targetDiscountPercent || 15);
    setFormMealTime(banner.mealTime || 'all');
    setFormScheduleEnabled(Boolean(banner.scheduleEnabled || (banner.mealTime && banner.mealTime !== 'all')));
    setFormScheduleStartTime(banner.scheduleStartTime || '08:00');
    setFormScheduleEndTime(banner.scheduleEndTime || '14:00');
    setFormAutoHideOutside(banner.autoHideOutsideSchedule !== false);
    setFormLinkUrl(banner.linkUrl || '');
    setShowAddBannerModal(true);
  };

  // Handle banner image upload
  const handleBannerImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBannerImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 900);
      setFormImage(base64);
    } catch {
      alert('حدث خطأ أثناء معالجة الصورة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsUploadingBannerImg(false);
    }
  };

  // Handle popup image upload
  const handlePopupImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPopupImg(true);
    try {
      const base64 = await compressAndResizeImage(file, 800);
      setPopupImage(base64);
    } catch {
      alert('حدث خطأ أثناء معالجة الصورة.');
    } finally {
      setIsUploadingPopupImg(false);
    }
  };

  // Submit banner (Add or Update)
  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const bannerPayload: Banner = {
      id: editingBanner ? editingBanner.id : `ban-${Date.now()}`,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim() || 'عرض حصري لفترة محدودة',
      badge: formBadge.trim() || 'عرض خاص',
      badgeText: formBadge.trim() || 'عرض خاص',
      image: formImage.trim() || 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
      active: editingBanner ? editingBanner.active : true,
      linkType: formLinkType,
      targetCategoryId: formLinkType === 'category' ? formTargetCategoryId : undefined,
      targetCouponCode: formLinkType === 'coupon' ? formTargetCouponCode : undefined,
      targetDiscountPercent: formLinkType === 'coupon' ? formTargetDiscountPercent : undefined,
      mealTime: formMealTime,
      scheduleEnabled: formScheduleEnabled,
      scheduleStartTime: formScheduleEnabled ? formScheduleStartTime : undefined,
      scheduleEndTime: formScheduleEnabled ? formScheduleEndTime : undefined,
      autoHideOutsideSchedule: formScheduleEnabled ? formAutoHideOutside : false,
      linkUrl: formLinkType === 'external' ? formLinkUrl : undefined
    };

    if (editingBanner) {
      setBanners(prev => prev.map(b => b.id === editingBanner.id ? bannerPayload : b));
    } else {
      setBanners(prev => [...prev, bannerPayload]);
    }

    setShowAddBannerModal(false);
    setEditingBanner(null);
  };

  // Toggle banner active status
  const handleToggleBanner = (id: string) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, active: !b.active } : b));
  };

  // Delete banner
  const handleDeleteBanner = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      setBanners(prev => prev.filter(b => b.id !== id));
    }
  };

  // Save popup ad settings
  const handleSavePopup = () => {
    const updated: PopupAd = {
      id: popupAd?.id || 'popup-1',
      title: popupTitle.trim(),
      content: popupContent.trim(),
      image: popupImage.trim(),
      active: popupActive
    };
    setPopupAd(updated);
    setPopupSavedMsg(true);
    setTimeout(() => setPopupSavedMsg(false), 3000);
  };

  const currentDateObj = new Date(adminTick);

  return (
    <div className="space-y-8" style={{ direction: 'rtl' }}>
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#E5D5BC] shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#2D1E18]">نظام الإعلانات والجدولة الزمنية التلقائية</h2>
              <p className="text-xs text-stone-500">تحديد أوقات ظهور العروض تلقائياً (فطور / غداء / عشاء / ساعات مخصصة) مع إخفائها تلقائياً خارج أوقاتها</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-[#3D271D] hover:bg-[#2A1D15] text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all self-start sm:self-auto active:scale-95"
        >
          <Plus size={16} />
          <span>إضافة بانر عروض جديد</span>
        </button>
      </div>

      {/* SECTION 1: Active Promotional Banners */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
              <Sparkles size={18} className="text-[#8C6D48]" />
              <span>البانرات الإعلانية والجدولة الزمنية (Carousel Banners)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">تظهر أعلى قائمة الطعام وتتغير تلقائياً حسب الوقت المحدد لكل وجبة</p>
          </div>
          <span className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full">
            {banners.length} إعلانات مسجلة
          </span>
        </div>

        {banners.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-stone-200 rounded-3xl">
            <Megaphone size={40} className="mx-auto text-stone-300 mb-2" />
            <p className="font-bold text-sm text-stone-600">لا توجد إعلانات ترويجية حالياً</p>
            <p className="text-xs text-stone-400 mt-1">اضغط على زر "إضافة بانر عروض جديد" لإطلاق وتحديد أوقات عروضك!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map((banner) => {
              const isCurrentlyActiveInTime = isBannerActiveNow(banner, currentDateObj);
              const schedInfo = getBannerScheduleDescription(banner);

              return (
                <div 
                  key={banner.id}
                  className={`rounded-3xl overflow-hidden border transition-all flex flex-col justify-between ${
                    !banner.active 
                      ? 'bg-stone-100/60 border-stone-200 opacity-60' 
                      : isCurrentlyActiveInTime
                        ? 'bg-white border-emerald-300 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-stone-50 border-amber-200 shadow-xs'
                  }`}
                >
                  {/* Banner Image Preview */}
                  <div className="relative h-40 w-full bg-stone-900 overflow-hidden">
                    <img 
                      src={banner.image} 
                      alt={banner.title} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    
                    {/* Live Timing Status Badge */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                      {!banner.active ? (
                        <span className="bg-stone-800 text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow">
                          <EyeOff size={10} />
                          <span>معطل يدوياً</span>
                        </span>
                      ) : isCurrentlyActiveInTime ? (
                        <span className="bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-md animate-pulse">
                          <CheckCircle2 size={11} />
                          <span>ظاهر للزبائن الآن ✓</span>
                        </span>
                      ) : (
                        <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full backdrop-blur-md flex items-center gap-1 shadow-md">
                          <Clock size={11} />
                          <span>مخفي (خارج وقته)</span>
                        </span>
                      )}
                    </div>

                    {banner.badge && (
                      <span className="absolute top-3 right-3 bg-[#D4A373] text-[#2A1D15] text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                        {banner.badge}
                      </span>
                    )}

                    <div className="absolute bottom-2.5 right-3 left-3 text-white space-y-1">
                      <h4 className="font-black text-sm drop-shadow line-clamp-1">{banner.title}</h4>
                      {banner.subtitle && (
                        <p className="text-[11px] text-stone-200 drop-shadow line-clamp-1">{banner.subtitle}</p>
                      )}

                      {/* Linked Target & Meal Period Tags */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {banner.linkType === 'category' && banner.targetCategoryId && (
                          <span className="bg-amber-900/80 backdrop-blur-md text-amber-200 border border-amber-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Layers size={9} />
                            <span>قسم: {categories.find(c => c.id === banner.targetCategoryId)?.nameAr || 'قسم محدد'}</span>
                          </span>
                        )}

                        {banner.linkType === 'coupon' && banner.targetCouponCode && (
                          <span className="bg-emerald-900/80 backdrop-blur-md text-emerald-200 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <Ticket size={9} />
                            <span>خصم: {banner.targetCouponCode} ({banner.targetDiscountPercent || 15}%)</span>
                          </span>
                        )}

                        {/* Scheduled Time Pill */}
                        <span className={`backdrop-blur-md text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs ${
                          isCurrentlyActiveInTime 
                            ? 'bg-emerald-950/90 text-emerald-200 border border-emerald-400/40' 
                            : 'bg-stone-900/90 text-amber-200 border border-amber-400/40'
                        }`}>
                          <Timer size={9} />
                          <span>{schedInfo}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Controls */}
                  <div className="p-3.5 flex items-center justify-between bg-white border-t border-stone-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBanner(banner.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                          banner.active 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                        }`}
                      >
                        {banner.active ? <Eye size={13} /> : <EyeOff size={13} />}
                        <span>{banner.active ? 'مفعل' : 'معطل'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(banner)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors"
                        title="تعديل تفاصيل وأوقات العرض"
                      >
                        <Edit size={13} />
                        <span>تعديل الأوقات</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="حذف الإعلان"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Welcome Popup Ad Settings */}
      <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-black text-base text-[#2D1E18] flex items-center gap-2">
              <Tag size={18} className="text-[#8C6D48]" />
              <span>إعلان النافذة الترحيبية المنبثقة (Welcome Popup Ad)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">نافذة تظهر تلقائياً للعميل فور مسح الباركود وفتح المنيو</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPopupActive(!popupActive)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-2xl text-xs font-black transition-all ${
                popupActive 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'bg-stone-200 text-stone-600'
              }`}
            >
              {popupActive ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{popupActive ? 'مفعلة وتظهر للزبائن' : 'معطلة حالياً'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Edit Form */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">عنوان النافذة الترحيبية</label>
              <input 
                type="text"
                value={popupTitle}
                onChange={(e) => setPopupTitle(e.target.value)}
                placeholder="مثال: خصم خاص 20% اليوم! 🎉"
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">نص وتفاصيل العرض</label>
              <textarea 
                rows={3}
                value={popupContent}
                onChange={(e) => setPopupContent(e.target.value)}
                placeholder="تفاصيل العرض الترويجي..."
                className="w-full p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
              />
            </div>

            {/* Image upload / url */}
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">صورة النافذة الترويجية</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={popupImage}
                  onChange={(e) => setPopupImage(e.target.value)}
                  placeholder="رابط الصورة أو ارفع من جهازك..."
                  className="flex-1 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none"
                />
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={popupFileInputRef}
                  onChange={handlePopupImgUpload}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => popupFileInputRef.current?.click()}
                  disabled={isUploadingPopupImg}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#3D271D] text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Upload size={13} />
                  <span>{isUploadingPopupImg ? 'جاري...' : 'رفع صورة'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleSavePopup}
                className="px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <Check size={15} />
                <span>حفظ إعدادات النافذة الترويجية</span>
              </button>

              {popupSavedMsg && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200 animate-in fade-in">
                  تم حفظ النافذة بنجاح!
                </span>
              )}
            </div>
          </div>

          {/* Live Customer Preview */}
          <div className="bg-stone-100/70 p-5 rounded-3xl border border-stone-200 space-y-2">
            <span className="text-[11px] font-bold text-stone-500 block text-center">
              معاينة حية لشكل النافذة كما يراها الزبون على هاتفه:
            </span>

            <div className="max-w-xs mx-auto bg-white rounded-3xl overflow-hidden shadow-xl border border-[#D4A373]">
              <div className="relative h-40 w-full bg-stone-900">
                <img 
                  src={popupImage || 'https://images.unsplash.com/photo-1509785307050-d4066910ec1e?auto=format&fit=crop&w=600&q=80'} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              </div>

              <div className="p-4 space-y-2 text-center">
                <h4 className="font-black text-sm text-[#2D1E18]">{popupTitle || 'عنوان العرض'}</h4>
                <p className="text-[11px] text-stone-600 leading-relaxed">{popupContent || 'تفاصيل العرض الترويجي...'}</p>
                <button
                  type="button"
                  className="w-full mt-2 py-2 rounded-xl bg-[#3D271D] text-white font-bold text-[11px] shadow"
                >
                  تصفح المنيو الآن
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add or Edit Banner */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl border border-[#E5D5BC] space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-black text-lg text-[#2D1E18] flex items-center gap-2">
                <Sparkles size={18} className="text-amber-600" />
                <span>{editingBanner ? 'تعديل بيانات وأوقات البانر' : 'إضافة بانر عروض جديد مع جدولة الأوقات'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddBannerModal(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">عنوان الإعلان الرئيسي</label>
                <input 
                  type="text"
                  required
                  placeholder="مثال: كومبو الإفطار الصباحي ☕🥐"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">الوصف المختصر</label>
                <input 
                  type="text"
                  placeholder="كرواسون طازج + كابتشينو بـ 75 ج.م فقط"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">شارة العرض (Badge)</label>
                <input 
                  type="text"
                  placeholder="مثال: خصم 25% أو حصري للصباح"
                  value={formBadge}
                  onChange={(e) => setFormBadge(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                />
              </div>

              {/* ⏰ TIME SCHEDULING SECTION (The core requested feature) */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-800" />
                    <div>
                      <h4 className="font-black text-xs text-amber-950">تحديد أوقات ظهور واختفاء العرض تلقائياً</h4>
                      <p className="text-[10px] text-amber-800">يظهر العرض في الساعات المحددة ويختفي تماماً خارجها</p>
                    </div>
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={formScheduleEnabled}
                      onChange={(e) => {
                        setFormScheduleEnabled(e.target.checked);
                        if (!e.target.checked) setFormMealTime('all');
                      }}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-[#2D1E18]">تفعيل الوقت</span>
                  </label>
                </div>

                {/* Preset Meal Buttons */}
                <div>
                  <label className="text-[11px] font-bold text-stone-700 block mb-1.5">اختر فترة الوجبة السريعة:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('all')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'all' && !formScheduleEnabled
                          ? 'bg-[#3D271D] text-white border-[#3D271D] shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      🕒 طوال اليوم
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('breakfast')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'breakfast'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      🌅 فطور ({formatTime12H('06:00')} إلى {formatTime12H('12:00')})
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('lunch')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'lunch'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      ☀️ غداء ({formatTime12H('12:00')} إلى {formatTime12H('18:00')})
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('dinner')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'dinner'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      🌙 عشاء ({formatTime12H('18:00')} إلى {formatTime12H('23:59')})
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('late_night')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'late_night'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      🌃 سهرة ({formatTime12H('23:59')} إلى {formatTime12H('06:00')})
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectMealPreset('custom')}
                      className={`p-2 rounded-xl text-xs font-bold transition-all border text-center ${
                        formMealTime === 'custom' || (formScheduleEnabled && !['breakfast', 'lunch', 'dinner', 'late_night'].includes(formMealTime))
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-amber-100/50'
                      }`}
                    >
                      ⏱️ ساعات مخصصة
                    </button>
                  </div>
                </div>

                {/* Custom Time Pickers */}
                {formScheduleEnabled && (
                  <div className="pt-2 border-t border-amber-200/80 space-y-2.5 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-black text-amber-950 block mb-1">من الساعة (بداية الظهور):</label>
                        <input 
                          type="time"
                          value={formScheduleStartTime}
                          onChange={(e) => setFormScheduleStartTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-amber-300 text-xs font-black text-center focus:outline-none"
                        />
                        <span className="text-[10px] text-amber-800 font-bold block text-center mt-0.5">
                          {formatTime12H(formScheduleStartTime)}
                        </span>
                      </div>

                      <div>
                        <label className="text-[11px] font-black text-amber-950 block mb-1">إلى الساعة (نهاية الظهور):</label>
                        <input 
                          type="time"
                          value={formScheduleEndTime}
                          onChange={(e) => setFormScheduleEndTime(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-amber-300 text-xs font-black text-center focus:outline-none"
                        />
                        <span className="text-[10px] text-amber-800 font-bold block text-center mt-0.5">
                          {formatTime12H(formScheduleEndTime)}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-amber-100/70 rounded-xl text-[11px] font-black text-amber-900 flex items-center justify-center gap-1.5 border border-amber-300/60">
                      <Clock size={13} />
                      <span>فترة ظهور العرض: من {formatTime12H(formScheduleStartTime)} حتى {formatTime12H(formScheduleEndTime)}</span>
                    </div>

                    <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-amber-200 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={formAutoHideOutside}
                        onChange={(e) => setFormAutoHideOutside(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[11px] font-bold text-stone-800">
                        إخفاء البانر تلقائياً تماماً من المنيو خارج هذه الساعات
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* Link Type & Association Controls */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">نوع التوجيه عند ضغط الزبون</label>
                <select
                  value={formLinkType}
                  onChange={(e) => setFormLinkType(e.target.value as any)}
                  className="w-full p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#3D271D]"
                >
                  <option value="category">📁 ربط بقسم محدد من المنيو (يفتح القسم مباشرة)</option>
                  <option value="coupon">🏷️ ربط بكوبون / خصم خاص (يطبق الكود)</option>
                  <option value="none">👁️ عرض فقط بدون تحويل</option>
                </select>
              </div>

              {/* Dynamic Target Input based on LinkType */}
              {formLinkType === 'category' && (
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">اختر القسم المراد التحويل إليه</label>
                  <select
                    value={formTargetCategoryId}
                    onChange={(e) => setFormTargetCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold focus:outline-none"
                  >
                    <option value="">-- اختر القسم --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nameAr} {c.nameEn ? `(${c.nameEn})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formLinkType === 'coupon' && (
                <div className="space-y-2 p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <div>
                    <label className="text-[11px] font-bold text-emerald-900 block mb-1">كود الخصم المرتبط بالبانر</label>
                    <input 
                      type="text"
                      placeholder="مثال: BREAKFAST20 أو COFFEE15"
                      value={formTargetCouponCode}
                      onChange={(e) => setFormTargetCouponCode(e.target.value.toUpperCase())}
                      className="w-full p-2 bg-white rounded-xl border border-emerald-300 text-xs font-black focus:outline-none uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-emerald-900 block mb-1">نسبة الخصم (%)</label>
                    <input 
                      type="number"
                      min="1"
                      max="100"
                      value={formTargetDiscountPercent}
                      onChange={(e) => setFormTargetDiscountPercent(Number(e.target.value) || 10)}
                      className="w-full p-2 bg-white rounded-xl border border-emerald-300 text-xs font-bold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Image upload / URL */}
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">صورة البانر</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="text"
                    placeholder="رابط صورة أو اضغط زر الرفع..."
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="flex-1 p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-xs focus:outline-none"
                  />
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={bannerFileInputRef}
                    onChange={handleBannerImgUpload}
                    className="hidden" 
                  />
                  <button
                    type="button"
                    onClick={() => bannerFileInputRef.current?.click()}
                    disabled={isUploadingBannerImg}
                    className="px-3.5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#3D271D] text-xs font-bold flex items-center gap-1"
                  >
                    <Upload size={13} />
                    <span>{isUploadingBannerImg ? 'جاري...' : 'رفع صورة'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-bold shadow"
                >
                  {editingBanner ? 'حفظ التعديلات' : 'نشر البانر في المنيو'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
