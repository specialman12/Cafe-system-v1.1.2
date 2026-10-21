import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Banner } from '../types';
import { ChevronRight, ChevronLeft, Sparkles, Tag, Layers, Ticket, Clock, ArrowLeft, ArrowRight } from 'lucide-react';
import { isBannerActiveNow, getBannerScheduleDescription } from '../utils/scheduleUtils';
import { autoTranslateArabicToEnglish } from '../utils/translation';

interface SpecialOffersCarouselProps {
  banners: Banner[];
  isEnabled?: boolean;
  currency?: string;
  language?: 'ar' | 'en';
  onBannerClick?: (banner: Banner) => void;
}

export const SpecialOffersCarousel: React.FC<SpecialOffersCarouselProps> = ({
  banners = [],
  isEnabled = true,
  currency = 'ج.م',
  language = 'ar',
  onBannerClick
}) => {
  if (isEnabled === false) return null;

  const isEn = language === 'en';

  // Real-time ticking state to auto-hide expired offers without reload
  const [nowTick, setNowTick] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Filter banners strictly by active flag AND current scheduled time
  const activeBanners = useMemo(() => {
    const checkDate = new Date(nowTick);
    return (banners || []).filter(b => isBannerActiveNow(b, checkDate));
  }, [banners, nowTick]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Keep index within range if activeBanners length changes
  useEffect(() => {
    if (currentIndex >= activeBanners.length) {
      setCurrentIndex(0);
    }
  }, [activeBanners.length, currentIndex]);

  // Auto-play effect with pause on hover
  useEffect(() => {
    if (activeBanners.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeBanners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeBanners.length, isPaused]);

  if (activeBanners.length === 0) return null;

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % activeBanners.length);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + activeBanners.length) % activeBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    // In RTL, dragging left means moving to next, dragging right means moving to prev
    if (diff > 40) {
      handleNext();
    } else if (diff < -40) {
      handlePrev();
    }
    touchStartX.current = null;
  };

  const currentBanner = activeBanners[currentIndex] || activeBanners[0];

  const handleBannerClickAction = () => {
    if (onBannerClick && currentBanner) {
      onBannerClick(currentBanner);
    }
  };

  return (
    <div 
      className="relative rounded-3xl overflow-hidden shadow-2xl border border-[#e0cbaf]/90 bg-stone-950 group select-none transition-all duration-300 min-h-[180px] sm:min-h-[230px] md:min-h-[260px] flex flex-col justify-end cursor-pointer"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleBannerClickAction}
    >
      {/* Banner Background Image with Crossfade */}
      {activeBanners.map((banner, index) => (
        <div
          key={banner.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            index === currentIndex ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={banner.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80'}
            alt={banner.title || 'عرض خاص'}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=1200&q=80'; }}
            className="w-full h-full object-cover opacity-65 scale-105 group-hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/25" />
        </div>
      ))}

      {/* Slide Content Overlay */}
      <div className="relative z-10 p-4 sm:p-6 md:p-7 flex flex-col justify-between h-full min-h-[180px] sm:min-h-[230px] md:min-h-[260px]">
        {/* Top bar with Badges, Meal Time Tag, and Counter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-[#D4A373] text-[#2A1D15] text-[11px] sm:text-xs font-black px-3 py-1 rounded-full shadow-lg backdrop-blur-sm">
              <Sparkles size={14} className="text-[#2A1D15] animate-spin" style={{ animationDuration: '6s' }} />
              <span>
                {isEn 
                  ? autoTranslateArabicToEnglish(currentBanner.badgeText || currentBanner.badge || 'Special Offer') 
                  : (currentBanner.badgeText || currentBanner.badge || 'عرض خاص ومميز')}
              </span>
            </span>

            {/* Meal Time Tag */}
            {currentBanner.mealTime && currentBanner.mealTime !== 'all' && (
              <span className="inline-flex items-center gap-1 bg-indigo-950/80 border border-indigo-400/40 text-indigo-200 text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full shadow-md backdrop-blur-md">
                <Clock size={12} className="text-indigo-300" />
                <span>
                  {currentBanner.mealTime === 'breakfast' && (isEn ? '🌅 Breakfast Offer' : '🌅 فترة الفطور')}
                  {currentBanner.mealTime === 'lunch' && (isEn ? '☀️ Lunch Offer' : '☀️ فترة الغداء')}
                  {currentBanner.mealTime === 'dinner' && (isEn ? '🌙 Dinner Offer' : '🌙 فترة العشاء')}
                  {currentBanner.mealTime === 'late_night' && (isEn ? '🌃 Late Night Offer' : '🌃 سهر وليالي')}
                </span>
              </span>
            )}
          </div>

          {activeBanners.length > 1 && (
            <div className="bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black text-amber-200 shadow-sm">
              {currentIndex + 1} / {activeBanners.length}
            </div>
          )}
        </div>

        {/* Middle / Bottom Content */}
        <div className="space-y-1.5 py-2 my-auto">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white drop-shadow-xl leading-tight tracking-tight">
            {isEn ? autoTranslateArabicToEnglish(currentBanner.title || '') : currentBanner.title}
          </h2>
          {currentBanner.subtitle && (
            <p className="text-xs sm:text-sm text-stone-100 max-w-2xl line-clamp-2 leading-snug drop-shadow-md font-medium">
              {isEn ? autoTranslateArabicToEnglish(currentBanner.subtitle) : currentBanner.subtitle}
            </p>
          )}

          {/* Action Callout Button */}
          {(currentBanner.linkType === 'category' || currentBanner.linkType === 'coupon') && (
            <div className="pt-1">
              {currentBanner.linkType === 'category' && currentBanner.targetCategoryId && (
                <button 
                  type="button" 
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-[11px] sm:text-xs px-4 py-1.5 rounded-full shadow-xl transition-all group-hover:scale-105 active:scale-95"
                >
                  <Layers size={14} />
                  <span>{isEn ? 'Browse Category Now' : 'تصفح هذا القسم الآن'}</span>
                  {isEn ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                </button>
              )}

              {currentBanner.linkType === 'coupon' && (
                <button 
                  type="button" 
                  className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-[11px] sm:text-xs px-4 py-1.5 rounded-full shadow-xl transition-all group-hover:scale-105 active:scale-95"
                >
                  <Ticket size={14} />
                  <span>{isEn ? `Apply Promo Code (${currentBanner.targetCouponCode || 'SPECIAL'})` : `تطبيق كود الخصم (${currentBanner.targetCouponCode || 'عرض خاص'})`}</span>
                  {isEn ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Bottom indicators and navigation */}
        <div className="pt-2 flex items-center justify-between">
          {/* Slide Indicator Dots */}
          {activeBanners.length > 1 ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {activeBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex 
                      ? 'w-8 bg-[#D4A373] shadow-md' 
                      : 'w-2.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          ) : <div />}

          {/* Navigation Arrows for Multiple Banners */}
          {activeBanners.length > 1 && (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/25 hover:bg-white/45 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border border-white/30 shadow-md"
                title="العرض السابق"
                aria-label="Previous slide"
              >
                <ChevronRight size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/25 hover:bg-white/45 text-white flex items-center justify-center backdrop-blur-md transition-all active:scale-90 border border-white/30 shadow-md"
                title="العرض التالي"
                aria-label="Next slide"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
