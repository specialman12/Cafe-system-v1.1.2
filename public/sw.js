// Service Worker for Push Notifications & Background Sync
// Handles notifications on locked phone screen & background events

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received from Server Web Push API
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'نظام المنيو الذكي',
        body: event.data.text() || 'لديك إشعار جديد'
      };
    }
  }

  const title = data.title || 'نظام المنيو الذكي';
  const options = {
    body: data.body || 'إشعار جديد من المطعم',
    icon: data.icon || '/icon.svg',
    badge: data.badge || '/icon.svg',
    // Strong vibration pattern for mobile phones when locked in pocket:
    // Buzz 350ms, pause 150ms, buzz 350ms, pause 150ms, buzz 400ms
    vibrate: data.vibrate || [350, 150, 350, 150, 400],
    data: data.data || { url: '/' },
    tag: data.tag || `notification-${Date.now()}`,
    renotify: true,
    requireInteraction: true, // Keep on screen until acknowledged
    silent: false,
    dir: 'rtl',
    lang: 'ar'
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification clicked by User on Lock Screen or Notification Center
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const targetUrl = (event.notification.data && event.notification.data.url) 
    ? event.notification.data.url 
    : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open with this app
      for (const client of windowClients) {
        if ('focus' in client) {
          if (client.url !== targetUrl && 'navigate' in client) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // If no window is currently open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Support direct messages from the window to test background notifications
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'إشعار تجريبي', {
      body: options?.body || 'هذا إشعار تجريبي يعمل وشاشة الهاتف مقفلة',
      icon: options?.icon || '/icon.svg',
      badge: options?.badge || '/icon.svg',
      vibrate: options?.vibrate || [350, 150, 350, 150, 400],
      requireInteraction: true,
      tag: 'test-push-notification',
      ...options
    });
  }
});
