import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Send,
  RefreshCw,
  Power,
  Users,
  ChefHat,
  Receipt,
  Sparkles,
  Info
} from 'lucide-react';
import { SystemSettings } from '../../types';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeAdminPush,
  sendTestAdminPush,
  sendTestClientPush
} from '../../lib/pushNotifications';

interface PushNotificationsSettingsProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
}

export const PushNotificationsSettings: React.FC<PushNotificationsSettingsProps> = ({
  settings,
  setSettings
}) => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isTestingAdmin, setIsTestingAdmin] = useState(false);
  const [isTestingClient, setIsTestingClient] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<{
    adminDevicesCount: number;
    clientDevicesCount: number;
    vapidConfigured: boolean;
  }>({
    adminDevicesCount: 0,
    clientDevicesCount: 0,
    vapidConfigured: false
  });
  const [loadingStatus, setLoadingStatus] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    setPermission(getNotificationPermission());
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch('/api/push/status');
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (e) {
      console.warn('Failed to fetch push status:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubscribeCurrentDevice = async () => {
    setIsSubscribing(true);
    setTestResult(null);
    try {
      const res = await subscribeAdminPush();
      if (res.success) {
        setPermission('granted');
        setTestResult('تم ربط هذا الجهاز بنجاح! ستصلك إشعارات الطلبات وشاشة هاتفك مقفلة.');
        await fetchStatus();
      } else {
        setTestResult(`فشل التفعيل: ${res.error || 'يرجى التحقق من أذونات المتصفح'}`);
      }
    } catch (err: any) {
      setTestResult(`حدث خطأ: ${err?.message || err}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleSendAdminTest = async () => {
    setIsTestingAdmin(true);
    setTestResult(null);
    try {
      const res = await sendTestAdminPush();
      if (res.success) {
        setTestResult(`✓ تم إرسال إشعار تجريبي إلى (${res.count || 1}) جهاز أدمن! تفقد شاشة هاتفك المقفلة.`);
      } else {
        setTestResult(`فشل إرسال الإشعار: ${res.error || 'تأكد من ربط هاتفك أولاً'}`);
      }
    } catch (err: any) {
      setTestResult(`حدث خطأ: ${err?.message}`);
    } finally {
      setIsTestingAdmin(false);
    }
  };

  const handleSendClientTest = async () => {
    setIsTestingClient(true);
    setTestResult(null);
    try {
      const res = await sendTestClientPush(1);
      if (res.success) {
        setTestResult(`✓ تم إرسال إشعار تجريبي للعميل (طاولة 1)! تفقد شاشة الهاتف.`);
      } else {
        setTestResult(`فشل إرسال إشعار العميل: ${res.error}`);
      }
    } catch (err: any) {
      setTestResult(`حدث خطأ: ${err?.message}`);
    } finally {
      setIsTestingClient(false);
    }
  };

  const updateSetting = (key: keyof SystemSettings, val: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#E5D5BC] shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#F0E6D8] pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0 shadow-sm">
            <BellRing size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base text-[#2D1E18]">
                إشعارات الهاتف وشاشة القفل (Push Notifications)
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                settings.pushNotificationsEnabled !== false
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}>
                {settings.pushNotificationsEnabled !== false ? 'مفعلة بالكامل 🟢' : 'معطلة ⚪'}
              </span>
            </div>
            <p className="text-xs text-[#7A614A] mt-0.5 font-medium">
              تصلك الإشعارات برنة واهتزاز على هاتفك حتى وشاشة الهاتف مقفلة بالكامل كأي تطبيق أندرويد أو آيفون محترف.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => updateSetting('pushNotificationsEnabled', !(settings.pushNotificationsEnabled !== false))}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-sm ${
              settings.pushNotificationsEnabled !== false
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
            }`}
          >
            <Power size={15} />
            <span>{settings.pushNotificationsEnabled !== false ? 'تعطيل الإشعارات' : 'تفعيل الإشعارات'}</span>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADBCC] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Smartphone size={20} />
          </div>
          <div>
            <p className="text-[11px] text-[#8C6D48] font-bold">هواتف الأدمن المسجلة</p>
            <p className="text-base font-black text-[#2D1E18]">{statusData.adminDevicesCount} جهاز</p>
          </div>
        </div>

        <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADBCC] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[11px] text-[#8C6D48] font-bold">هواتف العملاء المتصلة</p>
            <p className="text-base font-black text-[#2D1E18]">{statusData.clientDevicesCount} جهاز</p>
          </div>
        </div>

        <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#EADBCC] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] text-[#8C6D48] font-bold">حالة إذن هذا المتصفح</p>
            <p className="text-xs font-black text-[#2D1E18]">
              {permission === 'granted' ? 'مسموح 🟢' : permission === 'denied' ? 'محظور 🔴' : 'بانتظار الإذن 🟡'}
            </p>
          </div>
        </div>
      </div>

      {/* Device Registration & Quick Test Actions */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-black text-sm text-[#2D1E18] flex items-center gap-2">
              <Sparkles size={16} className="text-amber-600" />
              ربط هاتفك الحالي لتلقي إشعارات الطلبات على شاشة القفل
            </h4>
            <p className="text-xs text-[#7A614A] mt-1">
              اضغط على الزر أدناه لمنح الإذن وتسجيل هاتفك في سيرفر التنبيهات الفورية المشفرة.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleSubscribeCurrentDevice}
              disabled={isSubscribing}
              className="px-4 py-2 rounded-xl bg-[#3D271D] hover:bg-[#2A1D15] text-white text-xs font-black flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Smartphone size={14} />
              <span>{isSubscribing ? 'جاري الربط...' : 'ربط هذا الجهاز الآن'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendAdminTest}
              disabled={isTestingAdmin}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              title="أرسل إشعاراً واقفل هاتفك لتجربة التنبيه"
            >
              <Send size={13} />
              <span>{isTestingAdmin ? 'جاري الإرسال...' : 'تجربة إشعار الأدمن'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendClientTest}
              disabled={isTestingClient}
              className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Users size={13} />
              <span>{isTestingClient ? 'جاري الإرسال...' : 'تجربة إشعار العميل'}</span>
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`p-3 rounded-xl text-xs font-bold border flex items-center gap-2 ${
            testResult.includes('✓') || testResult.includes('بنجاح')
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <Info size={16} className="shrink-0" />
            <span>{testResult}</span>
          </div>
        )}
      </div>

      {/* Control Toggles: Admin & Client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Admin Controls */}
        <div className="border border-[#E5D5BC] rounded-2xl p-4 bg-[#FCFBF9] space-y-3">
          <div className="flex items-center gap-2 border-b border-[#EEDBCA] pb-2 text-[#3D271D]">
            <ChefHat size={18} className="text-amber-700" />
            <h4 className="font-black text-sm">إشعارات هاتف الأدمن (شاشة مقفلة)</h4>
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-amber-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار عند وصول طلب جديد
            </span>
            <input
              type="checkbox"
              checked={settings.pushAdminNewOrder !== false}
              onChange={e => updateSetting('pushAdminNewOrder', e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-amber-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار عند طلب الحساب / الشيك
            </span>
            <input
              type="checkbox"
              checked={settings.pushAdminBillRequest !== false}
              onChange={e => updateSetting('pushAdminBillRequest', e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-amber-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار عند استدعاء الويتر من الطاولة
            </span>
            <input
              type="checkbox"
              checked={settings.pushAdminWaiterCall !== false}
              onChange={e => updateSetting('pushAdminWaiterCall', e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
            />
          </label>
        </div>

        {/* Client Controls */}
        <div className="border border-[#E5D5BC] rounded-2xl p-4 bg-[#FCFBF9] space-y-3">
          <div className="flex items-center gap-2 border-b border-[#EEDBCA] pb-2 text-[#3D271D]">
            <Receipt size={18} className="text-sky-700" />
            <h4 className="font-black text-sm">إشعارات هاتف العميل (شاشة مقفلة)</h4>
          </div>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-sky-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار المرحلة 1 (استلام وبدء التحضير بالمطبخ)
            </span>
            <input
              type="checkbox"
              checked={settings.pushClientOrderStatus !== false}
              onChange={e => updateSetting('pushClientOrderStatus', e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-sky-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار المرحلة 2 (تجهيز وتسليم الطلب للطاولة)
            </span>
            <input
              type="checkbox"
              checked={settings.pushClientOrderStatus !== false}
              onChange={e => updateSetting('pushClientOrderStatus', e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#EADBCC] cursor-pointer hover:bg-sky-50/40 transition-colors">
            <span className="text-xs font-bold text-[#2D1E18]">
              إشعار تسوية الحساب وإتمام الدفع
            </span>
            <input
              type="checkbox"
              checked={settings.pushClientBillSettled !== false}
              onChange={e => updateSetting('pushClientBillSettled', e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
            />
          </label>
        </div>
      </div>

      {/* Device Instructions for iPhone and Android */}
      <div className="bg-[#FAF7F2] p-4 rounded-2xl border border-[#EADBCC] text-xs text-[#6A5039] space-y-2">
        <p className="font-black text-[#2D1E18] flex items-center gap-1.5">
          <Info size={14} className="text-amber-700" />
          كيف تعمل الإشعارات وشاشة الهاتف مقفلة؟
        </p>
        <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
          <li>
            <strong>على هواتف أندرويد (Android / Chrome / Samsung):</strong> تعمل فورياً بمجرد الضغط على زر "سماح بالاشعارات" حتى لو أغلقت الشاشة تماماً.
          </li>
          <li>
            <strong>على هواتف آيفون (iPhone iOS 16.4+):</strong> تتطلب سياسة أبل إضافة الموقع للشاشة الرئيسية أولاً (زر المشاركة <span className="font-bold">Share</span> ثم <span className="font-bold">Add to Home Screen</span>)، وبعدها تفتح التطبيق وتضغط "سماح بالإشعارات" وستصلك الإشعارات وشاشتك مقفلة ورنة على ساعة Apple Watch.
          </li>
        </ul>
      </div>
    </div>
  );
};
