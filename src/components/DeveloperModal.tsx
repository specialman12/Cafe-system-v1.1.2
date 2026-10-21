import React, { useState } from 'react';
import { DeveloperRights } from '../types';
import { 
  X, 
  Code, 
  MessageCircle, 
  Phone, 
  Globe, 
  Mail, 
  Linkedin, 
  Github, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ShieldCheck,
  HeartHandshake
} from 'lucide-react';

interface DeveloperModalProps {
  developerRights?: DeveloperRights;
  onClose: () => void;
  lang?: 'ar' | 'en';
}

export const DeveloperModal: React.FC<DeveloperModalProps> = ({
  developerRights,
  onClose,
  lang = 'ar'
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const dev: DeveloperRights = {
    enabled: developerRights?.enabled ?? true,
    developerName: developerRights?.developerName?.trim() || 'محمود العفوري',
    developerTitle: developerRights?.developerTitle?.trim() || 'مهندس برمجيات ومطور أنظمة ذكية سحابية',
    developerAvatar: developerRights?.developerAvatar?.trim() || '',
    developerBio: developerRights?.developerBio?.trim() || 'تطوير وتصميم الأنظمة السحابية المتقدمة ومنصات المنيو التفاعلية للمطاعم والكافيهات بأحدث التقنيات السريعة والمستقرة.',
    developerNote: developerRights?.developerNote?.trim() || 'متاح لتنفيذ المشاريع البرمجية المخصصة، وتطوير الأنظمة والتطبيقات السحابية الحديثة.',
    developerWhatsApp: developerRights?.developerWhatsApp?.trim() || '01000000000',
    developerPhone: developerRights?.developerPhone?.trim() || developerRights?.developerWhatsApp?.trim() || '01000000000',
    developerWebsite: developerRights?.developerWebsite?.trim() || '',
    developerGithub: developerRights?.developerGithub?.trim() || '',
    developerLinkedin: developerRights?.developerLinkedin?.trim() || '',
    developerEmail: developerRights?.developerEmail?.trim() || 'mahmoud.eliafory115@gmail.com',
    copyrightText: developerRights?.copyrightText?.trim() || 'جميع الحقوق محفوظة © 2026 - تم التطوير بواسطة المهندس محمود العفوري'
  };

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const cleanPhone = (phone?: string) => phone ? phone.replace(/\D/g, '') : '';

  const isAr = lang === 'ar';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      style={{ direction: isAr ? 'rtl' : 'ltr' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#fffdfa] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#D4A373]/40 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header Banner with Premium Gradient */}
        <div className="relative bg-gradient-to-r from-[#2A1D15] via-[#3D271D] to-[#1F1713] p-6 text-white text-center flex flex-col items-center">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 sm:top-5 sm:left-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 flex items-center justify-center transition-colors border border-white/10"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={16} />
          </button>

          {/* Developer Photo / Avatar */}
          <div className="relative mb-3">
            {dev.developerAvatar ? (
              <img
                src={dev.developerAvatar}
                alt={dev.developerName}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-[#D4A373] shadow-xl bg-stone-900"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-[#8C6D48] to-[#D4A373] flex items-center justify-center text-white border-2 border-[#D4A373] shadow-xl">
                <Code size={36} className="text-white drop-shadow-md" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-[#2A1D15] shadow-xs" title="Verified Developer">
              <ShieldCheck size={14} />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-lg sm:text-xl text-[#FDFBF7] flex items-center justify-center gap-1.5">
              <span>{dev.developerName || (isAr ? 'مطور النظام' : 'System Developer')}</span>
              <Sparkles size={16} className="text-[#D4A373]" />
            </h3>
            {dev.developerTitle && (
              <p className="text-xs sm:text-sm font-semibold text-[#D4A373] max-w-xs mx-auto">
                {dev.developerTitle}
              </p>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-stone-700">
          
          {/* Bio / Description */}
          {dev.developerBio && (
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 leading-relaxed text-stone-700">
              <p className="font-medium">{dev.developerBio}</p>
            </div>
          )}

          {/* Contact & Social Links Grid */}
          <div className="space-y-2">
            <h4 className="font-black text-xs text-[#3D271D] uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake size={14} className="text-[#8C6D48]" />
              <span>{isAr ? 'روابط التواصل والملفات المهنية' : 'Contact & Professional Links'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              
              {/* WhatsApp Button */}
              {dev.developerWhatsApp && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 hover:bg-emerald-50 border border-emerald-200 rounded-2xl transition-colors">
                  <a
                    href={`https://wa.me/${cleanPhone(dev.developerWhatsApp)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-bold text-emerald-800 flex-1 truncate"
                  >
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <MessageCircle size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-emerald-600 font-semibold">{isAr ? 'واتساب' : 'WhatsApp'}</div>
                      <div className="text-xs font-black truncate" dir="ltr">{dev.developerWhatsApp}</div>
                    </div>
                  </a>
                  <button
                    onClick={() => copyToClipboard(dev.developerWhatsApp!, 'whatsapp')}
                    className="p-1.5 text-emerald-700 hover:bg-emerald-200/60 rounded-lg transition-colors ml-1"
                    title={isAr ? 'نسخ الرقم' : 'Copy'}
                  >
                    {copiedKey === 'whatsapp' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                  </button>
                </div>
              )}

              {/* Phone Call */}
              {dev.developerPhone && (
                <div className="flex items-center justify-between p-2.5 bg-amber-50/70 hover:bg-amber-50 border border-amber-200 rounded-2xl transition-colors">
                  <a
                    href={`tel:${dev.developerPhone}`}
                    className="flex items-center gap-2 font-bold text-amber-900 flex-1 truncate"
                  >
                    <div className="w-7 h-7 rounded-xl bg-amber-700 text-white flex items-center justify-center flex-shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-amber-700 font-semibold">{isAr ? 'اتصال هاتف' : 'Phone'}</div>
                      <div className="text-xs font-black truncate" dir="ltr">{dev.developerPhone}</div>
                    </div>
                  </a>
                  <button
                    onClick={() => copyToClipboard(dev.developerPhone!, 'phone')}
                    className="p-1.5 text-amber-800 hover:bg-amber-200/60 rounded-lg transition-colors ml-1"
                    title={isAr ? 'نسخ الرقم' : 'Copy'}
                  >
                    {copiedKey === 'phone' ? <Check size={13} className="text-amber-800" /> : <Copy size={13} />}
                  </button>
                </div>
              )}

              {/* Email */}
              {dev.developerEmail && (
                <div className="flex items-center justify-between p-2.5 bg-sky-50/70 hover:bg-sky-50 border border-sky-200 rounded-2xl transition-colors">
                  <a
                    href={`mailto:${dev.developerEmail}`}
                    className="flex items-center gap-2 font-bold text-sky-900 flex-1 truncate"
                  >
                    <div className="w-7 h-7 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0">
                      <Mail size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-sky-600 font-semibold">{isAr ? 'البريد الإلكتروني' : 'Email'}</div>
                      <div className="text-xs font-black truncate" dir="ltr">{dev.developerEmail}</div>
                    </div>
                  </a>
                  <button
                    onClick={() => copyToClipboard(dev.developerEmail!, 'email')}
                    className="p-1.5 text-sky-800 hover:bg-sky-200/60 rounded-lg transition-colors ml-1"
                    title={isAr ? 'نسخ الإيميل' : 'Copy'}
                  >
                    {copiedKey === 'email' ? <Check size={13} className="text-sky-800" /> : <Copy size={13} />}
                  </button>
                </div>
              )}

              {/* Website / Portfolio */}
              {dev.developerWebsite && (
                <a
                  href={dev.developerWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 bg-stone-100/80 hover:bg-stone-100 border border-stone-200 rounded-2xl transition-colors text-stone-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-xl bg-[#3D271D] text-white flex items-center justify-center flex-shrink-0">
                      <Globe size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-stone-500 font-semibold">{isAr ? 'الموقع / البورتفوليو' : 'Portfolio / Website'}</div>
                      <div className="text-xs font-black truncate" dir="ltr">
                        {dev.developerWebsite.replace(/^https?:\/\//, '')}
                      </div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-stone-500 mr-1 flex-shrink-0" />
                </a>
              )}

              {/* LinkedIn */}
              {dev.developerLinkedin && (
                <a
                  href={dev.developerLinkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 bg-blue-50/70 hover:bg-blue-50 border border-blue-200 rounded-2xl transition-colors text-blue-900"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                      <Linkedin size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-blue-600 font-semibold">LinkedIn</div>
                      <div className="text-xs font-black truncate">{isAr ? 'الملف الشخصي' : 'Profile'}</div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-blue-500 mr-1 flex-shrink-0" />
                </a>
              )}

              {/* GitHub */}
              {dev.developerGithub && (
                <a
                  href={dev.developerGithub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-2xl transition-colors text-slate-900"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                      <Github size={14} />
                    </div>
                    <div className="truncate">
                      <div className="text-[10px] text-slate-600 font-semibold">GitHub</div>
                      <div className="text-xs font-black truncate">{isAr ? 'المشاريع والمستودعات' : 'Repositories'}</div>
                    </div>
                  </div>
                  <ExternalLink size={13} className="text-slate-500 mr-1 flex-shrink-0" />
                </a>
              )}

            </div>
          </div>

          {/* Personal Developer Note */}
          {dev.developerNote && (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-2xl text-amber-950 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <Sparkles size={13} className="text-amber-600" />
                <span>{isAr ? 'ملاحظة المطور:' : 'Developer Note:'}</span>
              </div>
              <p className="text-stone-700">{dev.developerNote}</p>
            </div>
          )}

          {/* Copyright & Info Footer */}
          <div className="pt-2 border-t border-stone-200/80 text-center space-y-1 text-[11px] text-stone-500">
            <p className="font-bold">{dev.copyrightText || 'جميع الحقوق محفوظة © 2026'}</p>
            <p className="text-[10px] text-stone-400">Smart Menu & Cloud Ordering Solution</p>
          </div>

        </div>

        {/* Modal Bottom Close Action */}
        <div className="p-4 bg-stone-100 border-t border-stone-200/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] text-white font-bold text-xs shadow-md transition-all active:scale-95"
          >
            {isAr ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};
