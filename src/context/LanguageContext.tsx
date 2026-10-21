import React, { createContext, useContext, useState, useEffect } from 'react';

export type SupportedLanguage = 'ar' | 'en';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  toggleLanguage: () => void;
  isEn: boolean;
  isAr: boolean;
  t: (arText: string, enText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  toggleLanguage: () => {},
  isEn: false,
  isAr: true,
  t: (arText) => arText,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('smart_menu_language');
      if (saved === 'en' || saved === 'ar') return saved;
    } catch (e) {}
    return 'ar';
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('smart_menu_language', lang);
    } catch (e) {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const isEn = language === 'en';
  const isAr = language === 'ar';

  const t = (arText: string, enText?: string) => {
    if (isEn && enText) return enText;
    return arText;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, isEn, isAr, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
export default LanguageContext;
