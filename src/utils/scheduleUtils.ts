import { Banner } from '../types';

export interface MealPreset {
  id: 'breakfast' | 'lunch' | 'dinner' | 'late_night';
  labelAr: string;
  labelEn: string;
  startTime: string;
  endTime: string;
}

export const MEAL_PRESETS: MealPreset[] = [
  { id: 'breakfast', labelAr: 'فترة الفطور الصباحي', labelEn: 'Breakfast', startTime: '07:00', endTime: '12:00' },
  { id: 'lunch', labelAr: 'فترة الغداء', labelEn: 'Lunch', startTime: '12:00', endTime: '17:00' },
  { id: 'dinner', labelAr: 'فترة العشاء', labelEn: 'Dinner', startTime: '17:00', endTime: '23:00' },
  { id: 'late_night', labelAr: 'وجبات وسهرات الليل', labelEn: 'Late Night', startTime: '23:00', endTime: '04:00' },
];

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function isTimeInRange(currentMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Overnight span (e.g. 23:00 to 04:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

export function isBannerActiveNow(banner: Banner, date: Date = new Date()): boolean {
  if (!banner || !banner.active) return false;

  const scheduleEnabled = banner.scheduleEnabled || (banner.mealTime && banner.mealTime !== 'all');
  if (!scheduleEnabled) return true;

  let start = banner.scheduleStartTime;
  let end = banner.scheduleEndTime;

  if (banner.mealTime && banner.mealTime !== 'all' && banner.mealTime !== 'custom') {
    const preset = MEAL_PRESETS.find(p => p.id === banner.mealTime);
    if (preset) {
      start = start || preset.startTime;
      end = end || preset.endTime;
    }
  }

  if (!start || !end) return true;

  const curMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(start);
  const endMinutes = parseTimeToMinutes(end);

  const inRange = isTimeInRange(curMinutes, startMinutes, endMinutes);
  if (banner.autoHideOutsideSchedule === false) {
    return true;
  }
  return inRange;
}

export function formatTime12H(timeStr: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const hour = h || 0;
  const minute = m !== undefined ? String(m).padStart(2, '0') : '00';
  const periodAr = hour >= 12 ? 'م' : 'ص';
  const periodEn = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;

  return lang === 'en' ? `${displayHour}:${minute} ${periodEn}` : `${displayHour}:${minute} ${periodAr}`;
}

export function formatTimeRange12H(start: string, end: string, lang: 'ar' | 'en' = 'ar'): string {
  if (!start || !end) return '';
  const formattedStart = formatTime12H(start, lang);
  const formattedEnd = formatTime12H(end, lang);
  return lang === 'en' ? `${formattedStart} - ${formattedEnd}` : `من ${formattedStart} إلى ${formattedEnd}`;
}

export function getBannerScheduleDescription(banner: Banner, lang: 'ar' | 'en' = 'ar'): string {
  if (!banner.scheduleEnabled && (!banner.mealTime || banner.mealTime === 'all')) {
    return lang === 'en' ? 'Available 24/7' : 'متاح طوال اليوم';
  }

  if (banner.scheduleStartTime && banner.scheduleEndTime) {
    return formatTimeRange12H(banner.scheduleStartTime, banner.scheduleEndTime, lang);
  }

  if (banner.mealTime && banner.mealTime !== 'all' && banner.mealTime !== 'custom') {
    const preset = MEAL_PRESETS.find(p => p.id === banner.mealTime);
    if (preset) {
      return lang === 'en' ? preset.labelEn : preset.labelAr;
    }
  }

  return lang === 'en' ? 'Scheduled offer' : 'عرض بموعد محدد';
}
