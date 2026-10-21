import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  LogIn,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Lock,
  CheckCircle2,
  Sparkles,
  Delete
} from 'lucide-react';
import { SystemSettings } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

interface AdminLoginPageProps {
  onSuccess: () => void;
  onBackToClient: () => void;
  settings: SystemSettings;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccess,
  onBackToClient,
  settings
}) => {
  // Login Mode: 'pin' (default, fast) or 'credentials' (username/password)
  const [loginMode, setLoginMode] = useState<'pin' | 'credentials'>('pin');

  // PIN state
  const [pin, setPin] = useState('');
  
  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCredentialsHint, setShowCredentialsHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const localCreds = React.useMemo(() => {
    try {
      const stored = localStorage.getItem('smart_menu_admin_creds');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }, []);

  const savedUsername = settings.adminUsername || localCreds?.username || 'admin';
  const savedPassword = settings.adminPassword || localCreds?.password || 'admin123';
  const savedPin = settings.adminPin || localCreds?.pin || '1234';

  // Handle PIN Digit Click
  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setErrorMsg(null);
      const newPin = pin + digit;
      setPin(newPin);

      // Auto-submit if PIN reaches 4 and matches
      if (newPin.length >= 4) {
        if (newPin === savedPin) {
          triggerSuccess();
        } else if (newPin.length >= savedPin.length) {
          setTimeout(() => {
            setErrorMsg('رمز الـ PIN غير صحيح، حاول مرة أخرى');
            setPin('');
          }, 200);
        }
      }
    }
  };

  const handlePinDelete = () => {
    setErrorMsg(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinClear = () => {
    setErrorMsg(null);
    setPin('');
  };

  const triggerSuccess = () => {
    setIsLoading(true);
    try {
      localStorage.setItem('smart_menu_admin_session', 'true');
    } catch (e) {}
    setTimeout(() => {
      setIsLoading(false);
      onSuccess();
    }, 250);
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (pin === savedPin) {
      triggerSuccess();
    } else {
      setErrorMsg('رمز الـ PIN غير صحيح، يرجى المحاولة مرة أخرى');
      setPin('');
    }
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      if (username.trim() !== savedUsername) {
        setErrorMsg('اسم المستخدم غير صحيح، يرجى التأكد والمحاولة مرة أخرى');
        setIsLoading(false);
        return;
      }

      if (password !== savedPassword) {
        setErrorMsg('كلمة المرور غير صحيحة، يرجى التحقق من الأحرف');
        setIsLoading(false);
        return;
      }

      try {
        localStorage.setItem('smart_menu_admin_session', 'true');
      } catch (e) {}

      setIsLoading(false);
      setUsername('');
      setPassword('');
      onSuccess();
    }, 300);
  };

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (loginMode === 'pin') {
        if (/^[0-9]$/.test(e.key)) {
          handlePinDigit(e.key);
        } else if (e.key === 'Backspace') {
          handlePinDelete();
        } else if (e.key === 'Enter') {
          handlePinSubmit();
        } else if (e.key === 'Escape') {
          handlePinClear();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loginMode, pin, savedPin]);

  const { language, toggleLanguage, isEn } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#180E09] via-[#2A1D15] to-[#120B07] text-[#FDFBF7] flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden" style={{ direction: isEn ? 'ltr' : 'rtl' }}>
      
      {/* Ambient background glow accents for modern glass look */}
      <div className="absolute top-10 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-[#D4A373]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation Bar with Glass styling */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2 relative z-10 gap-2">
        <button
          onClick={onBackToClient}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-stone-200 text-xs font-bold transition-all border border-white/15 backdrop-blur-md active:scale-95 shadow-lg"
        >
          <ArrowRight size={16} className={isEn ? 'rotate-180' : ''} />
          <span>{isEn ? 'Back to Menu' : 'الرجوع للمنيو'}</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-bold border border-amber-400/40 transition-all backdrop-blur-md"
            title={isEn ? 'Switch to Arabic' : 'تغيير للإنجليزية'}
          >
            <Languages size={14} />
            <span>{isEn ? 'العربية' : 'English'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/40 backdrop-blur-md text-xs font-bold text-amber-300 border border-amber-400/30 shadow-lg">
            <Lock size={13} className="text-amber-400" />
            <span>{isEn ? 'Admin Portal' : 'بوابة الإدارة المركزية'}</span>
          </div>
        </div>
      </div>

      {/* Main Glass Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6 relative z-10">
        
        {/* Logo & Branding */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-amber-900/40 to-black/60 border-2 border-amber-400/50 backdrop-blur-xl shadow-2xl p-1 relative">
            <img 
              src={settings.logoUrl} 
              alt={settings.systemName}
              className="w-full h-full object-cover rounded-[22px]" 
            />
            <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-[#1E130D] p-1.5 rounded-full shadow-lg border border-white/30">
              <ShieldCheck size={16} />
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-wide drop-shadow-md">
              {settings.systemName}
            </h1>
            <p className="text-xs text-amber-200/90 mt-1 font-bold flex items-center justify-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>لوحة التحكم وإدارة المطعم والكافيه</span>
            </p>
          </div>
        </div>

        {/* The Glass Container */}
        <div className="bg-[#241710]/75 backdrop-blur-2xl rounded-[32px] p-6 sm:p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)] border border-white/15 text-white relative overflow-hidden">
          
          {/* Subtle Glass Shimmer Highlight */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('pin'); setErrorMsg(null); }}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'pin'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <span>دخول سريع بكود PIN</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('credentials'); setErrorMsg(null); }}
              className={`py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 ${
                loginMode === 'credentials'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg'
                  : 'text-stone-300 hover:text-white'
              }`}
            >
              <User size={13} />
              <span>اسم المستخدم وكلمة السر</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold rounded-2xl animate-in fade-in backdrop-blur-md">
              <AlertCircle size={18} className="flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ================= MODE 1: PIN CODE NUMPAD ================= */}
          {loginMode === 'pin' && (
            <div className="space-y-6">
              
              <div className="text-center space-y-1">
                <p className="text-xs text-stone-300 font-medium">أدخل رمز الـ PIN المكوّن من 4 أرقام للدخول الفوري</p>
              </div>

              {/* PIN Visual Indicators (Dots) */}
              <div className="flex items-center justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((idx) => {
                  const isFilled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-300 ${
                        isFilled
                          ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.9)] ring-2 ring-white/60'
                          : 'bg-white/20 border border-white/25'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Glass Numpad */}
              <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-500 active:text-black border border-white/15 text-xl font-black text-white backdrop-blur-md shadow-md transition-all active:scale-95 flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}

                {/* Clear / Reset Button */}
                <button
                  type="button"
                  onClick={handlePinClear}
                  className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-rose-500/30 border border-white/10 text-xs font-black text-stone-300 backdrop-blur-md shadow-sm transition-all active:scale-95 flex items-center justify-center"
                  title="مسح الرمز"
                >
                  مسح
                </button>

                {/* Zero Digit */}
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-500 active:text-black border border-white/15 text-xl font-black text-white backdrop-blur-md shadow-md transition-all active:scale-95 flex items-center justify-center"
                >
                  0
                </button>

                {/* Backspace Button */}
                <button
                  type="button"
                  onClick={handlePinDelete}
                  className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-rose-500/30 border border-white/10 text-stone-300 hover:text-white backdrop-blur-md shadow-sm transition-all active:scale-95 flex items-center justify-center"
                  title="حذف آخر رقم"
                >
                  <Delete size={20} />
                </button>
              </div>

              {/* Enter PIN Button */}
              <button
                type="button"
                onClick={() => handlePinSubmit()}
                disabled={isLoading || pin.length === 0}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-[#1E130D] font-black text-sm shadow-[0_8px_20px_rgba(251,191,36,0.3)] transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                <LogIn size={18} />
                <span>{isLoading ? 'جاري التحقق...' : 'تأكيد الدخول'}</span>
              </button>

            </div>
          )}

          {/* ================= MODE 2: USERNAME & PASSWORD ================= */}
          {loginMode === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              
              {/* Username Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <User size={15} className="text-amber-400" />
                  <span>اسم المستخدم</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(null); }}
                  placeholder="مثال: admin"
                  className="w-full px-4 py-3.5 bg-black/40 border border-white/15 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-white shadow-inner font-medium placeholder:text-stone-500"
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                  <KeyRound size={15} className="text-amber-400" />
                  <span>كلمة المرور</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                    placeholder="أدخل كلمة المرور"
                    className="w-full px-4 py-3.5 pl-11 bg-black/40 border border-white/15 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-white shadow-inner font-medium placeholder:text-stone-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed text-[#1E130D] font-black text-sm shadow-[0_8px_20px_rgba(251,191,36,0.3)] transition-all flex items-center justify-center gap-2 border border-white/20"
              >
                <LogIn size={18} />
                <span>{isLoading ? 'جاري تسجيل الدخول...' : 'دخول لوحة التحكم'}</span>
              </button>
            </form>
          )}

          {/* Hint / Security Footer */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-stone-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 size={13} />
              اتصال آمن ومشفّر
            </span>
            <button
              type="button"
              onClick={() => setShowCredentialsHint(!showCredentialsHint)}
              className="text-amber-300 hover:underline font-bold flex items-center gap-1"
            >
              <HelpCircle size={12} />
              <span>البيانات الافتراضية؟</span>
            </button>
          </div>

          {showCredentialsHint && (
            <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-amber-400/40 text-xs text-amber-200 space-y-1.5 text-right animate-in fade-in duration-150 backdrop-blur-md">
              <p className="font-black flex items-center gap-1 text-amber-300">
                <ShieldAlert size={14} className="text-amber-400" />
                <span>البيانات الافتراضية للدخول السريع:</span>
              </p>
              <p>كود الـ PIN السريع: <span className="font-mono font-black bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/30">{savedPin}</span></p>
              <p>اسم المستخدم: <span className="font-mono font-black bg-white/10 px-2 py-0.5 rounded text-white">{savedUsername}</span></p>
              <p>كلمة المرور: <span className="font-mono font-black bg-white/10 px-2 py-0.5 rounded text-white">{savedPassword}</span></p>
              <p className="text-[10px] text-stone-400 pt-1">
                تستطيع تغيير كود الـ PIN وبيانات الأدمن في أي وقت من قسم "الإعدادات والأمان" داخل لوحة التحكم.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-stone-400 pb-2 space-y-1 relative z-10">
        <p>{settings.systemName} &bull; بوابة الدخول الآمنة</p>
        {settings.developerRights?.enabled && (
          <p className="text-[10px] text-stone-500">
            تطوير: {settings.developerRights.developerName}
          </p>
        )}
      </div>

    </div>
  );
};
