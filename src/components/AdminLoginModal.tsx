import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  KeyRound, 
  Hash, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  X, 
  LogIn,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  savedUsername?: string;
  savedPassword?: string;
  savedPin?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  savedUsername = 'admin',
  savedPassword = 'admin123',
  savedPin = '1234'
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCredentialsHint, setShowCredentialsHint] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let localCreds: any = null;
    try {
      const stored = localStorage.getItem('smart_menu_admin_creds');
      if (stored) localCreds = JSON.parse(stored);
    } catch (e) {}

    const validUsername = savedUsername || localCreds?.username || 'admin';
    const validPassword = savedPassword || localCreds?.password || 'admin123';
    const validPin = savedPin || localCreds?.pin || '1234';

    if (username.trim() !== validUsername) {
      setErrorMsg('اسم المستخدم غير صحيح');
      return;
    }

    if (password !== validPassword) {
      setErrorMsg('كلمة المرور غير صحيحة');
      return;
    }

    if (pin.trim() !== validPin) {
      setErrorMsg('رمز الحماية (PIN) غير صحيح');
      return;
    }

    // Success
    try {
      localStorage.setItem('smart_menu_admin_session', 'true');
    } catch (e) {}

    setUsername('');
    setPassword('');
    setPin('');
    setErrorMsg(null);
    onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl border border-stone-200 overflow-hidden"
        style={{ direction: 'rtl' }}
      >
        {/* Top Luxury Banner */}
        <div className="bg-gradient-to-r from-[#2A1D15] via-[#3D271D] to-[#2A1D15] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#D4A373]/20 border border-[#D4A373]/30 flex items-center justify-center text-[#D4A373]">
              <ShieldCheck size={26} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">تسجيل دخول الإدارة</h3>
              <p className="text-xs text-stone-300 mt-0.5">نظام الحماية الثلاثي المشدد</p>
            </div>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
              <AlertCircle size={16} className="flex-shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <User size={14} className="text-[#8C6D48]" />
              <span>اسم المستخدم</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D] text-[#2D1E18]"
                required
              />
            </div>
          </div>

          {/* 2. Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <KeyRound size={14} className="text-[#8C6D48]" />
              <span>كلمة المرور</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 pl-11 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3D271D] text-[#2D1E18]"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-stone-400 hover:text-stone-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* 3. Security PIN Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <Hash size={14} className="text-[#8C6D48]" />
              <span>رمز الحماية (PIN)</span>
            </label>
            <input
              type="password"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="رمز PIN السري (مثال: 1234)"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#3D271D] text-[#2D1E18]"
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3.5 mt-2 rounded-2xl bg-[#3D271D] hover:bg-[#2A1D15] active:scale-98 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn size={18} />
            <span>تسجيل الدخول والتحقق</span>
          </button>

          {/* Hint Dropdown Toggle */}
          <div className="pt-2 border-t border-stone-100 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowCredentialsHint(!showCredentialsHint)}
              className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-bold"
            >
              <HelpCircle size={13} />
              <span>عرض بيانات الدخول الافتراضية للنظام</span>
            </button>

            {showCredentialsHint && (
              <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 w-full space-y-1 font-medium text-right animate-in fade-in duration-150">
                <p className="font-bold flex items-center gap-1 text-amber-950">
                  <ShieldAlert size={13} />
                  <span>البيانات الافتراضية المحددة مسبقاً:</span>
                </p>
                <p>اسم المستخدم: <span className="font-mono font-bold">{savedUsername || 'admin'}</span></p>
                <p>كلمة المرور: <span className="font-mono font-bold">{savedPassword || 'admin123'}</span></p>
                <p>رمز PIN: <span className="font-mono font-bold">{savedPin || '1234'}</span></p>
                <p className="text-[10px] text-amber-700 pt-0.5">يمكنك تغيير أي من هذه البيانات في أي وقت من إعدادات لوحة الإدارة.</p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
