// Web Push Notifications Client Utility
// Handles Service Worker registration, push subscriptions, and locked-screen mobile alerts

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.warn('[Push] Service worker registration error:', err);
    return null;
  }
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch('/api/push/vapid-public-key');
    if (!res.ok) return null;
    const data = await res.json();
    return data.publicKey || null;
  } catch (err) {
    console.warn('[Push] Failed to fetch VAPID key:', err);
    return null;
  }
}

export async function subscribeAdminPush(deviceName?: string): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'المتصفح لا يدعم خدمة إشعارات قفل الشاشة Push' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: 'تعذر تشغيل خدمة الخلفية في المتصفح' };
    }

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, error: 'تعذر الحصول على مفتاح التشفير من السيرفر' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    const res = await fetch('/api/push/subscribe-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        deviceName: deviceName || navigator.userAgent || 'هاتف الأدمن'
      })
    });

    if (!res.ok) {
      throw new Error('فشل تسجيل الهاتف في السيرفر');
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Push Admin Subscribe Error]:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء الاشتراك بالإشعارات' };
  }
}

export async function subscribeClientPush(
  tableNumber: number,
  orderId?: string,
  customerName?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'المتصفح لا يدعم خدمة إشعارات قفل الشاشة' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات' };
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      return { success: false, error: 'تعذر تشغيل خدمة الخلفية' };
    }

    const vapidKey = await getVapidPublicKey();
    if (!vapidKey) {
      return { success: false, error: 'تعذر الحصول على مفتاح التشفير' };
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
    }

    const res = await fetch('/api/push/subscribe-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub,
        tableNumber: Number(tableNumber),
        orderId,
        customerName: customerName || 'عميل'
      })
    });

    if (!res.ok) {
      throw new Error('فشل تسجيل هاتف العميل بالسيرفر');
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Push Client Subscribe Error]:', err);
    return { success: false, error: err?.message || 'حدث خطأ أثناء تفعيل الإشعارات' };
  }
}

export async function sendTestAdminPush(): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch('/api/push/test-admin', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل إرسال الإشعار التجريبي');
    return { success: true, count: data.sentCount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل إرسال الإشعار التجريبي' };
  }
}

export async function sendTestClientPush(tableNumber: number): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const res = await fetch('/api/push/test-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'فشل إرسال إشعار العميل');
    return { success: true, count: data.sentCount };
  } catch (err: any) {
    return { success: false, error: err?.message || 'فشل إرسال إشعار العميل' };
  }
}

// Fallback in-app or direct service worker notification
export async function triggerLocalNotification(title: string, body: string, data?: any) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      options: {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        vibrate: [300, 100, 300, 100, 300],
        data
      }
    });
  } else {
    try {
      new Notification(title, {
        body,
        icon: '/icon.svg',
        badge: '/icon.svg'
      });
    } catch (e) {
      // Ignored
    }
  }
}
