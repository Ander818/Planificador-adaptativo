// Service Worker for Khoros PWA with Browser Notification API & Proactive Background Reminders
const CACHE_NAME = 'khoros-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/manifest.json'
];

const DB_NAME = 'khoros_pwa_db';
const DB_VERSION = 1;
const STORE_REMINDERS = 'reminders';

// Active in-memory timers for the current Service Worker lifecycle
const activeTimers = new Map();

// Helper to open IndexedDB inside Service Worker
function openRemindersDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_REMINDERS)) {
        db.createObjectStore(STORE_REMINDERS, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save reminders to IndexedDB
async function persistReminders(reminders) {
  try {
    const db = await openRemindersDB();
    const tx = db.transaction(STORE_REMINDERS, 'readwrite');
    const store = tx.objectStore(STORE_REMINDERS);
    // Clear old reminders and store active ones
    await new Promise((res, rej) => {
      const clearReq = store.clear();
      clearReq.onsuccess = res;
      clearReq.onerror = rej;
    });
    for (const reminder of reminders) {
      store.put(reminder);
    }
  } catch (err) {
    console.warn('[SW] Failed to persist reminders in IndexedDB:', err);
  }
}

// Get all stored reminders from IndexedDB
async function getPersistedReminders() {
  try {
    const db = await openRemindersDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_REMINDERS, 'readonly');
      const store = tx.objectStore(STORE_REMINDERS);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

// Delete reminder from IndexedDB
async function removePersistedReminder(id) {
  try {
    const db = await openRemindersDB();
    const tx = db.transaction(STORE_REMINDERS, 'readwrite');
    tx.objectStore(STORE_REMINDERS).delete(id);
  } catch (err) {
    console.warn('[SW] Failed to delete reminder from IndexedDB:', err);
  }
}

// Display native system notification via Service Worker Registration
async function showTaskNotification(reminder) {
  if (!self.registration || !self.registration.showNotification) return;

  const title = reminder.title || 'Recordatorio de Tarea';
  const options = {
    body: reminder.body || 'Tu tarea programada está próxima a iniciar.',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'task-' + (reminder.taskId || reminder.id),
    renotify: true,
    requireInteraction: true,
    data: {
      taskId: reminder.taskId,
      triggerAt: reminder.triggerAt,
      url: '/?taskId=' + (reminder.taskId || ''),
    },
    actions: [
      { action: 'view', title: 'Ver Tarea' },
      { action: 'snooze_5', title: 'Posponer 5m' },
    ],
  };

  try {
    await self.registration.showNotification(title, options);
    // Remove from IndexedDB once fired
    await removePersistedReminder(reminder.id);
  } catch (err) {
    console.warn('[SW] showNotification error:', err);
  }
}

// Check due reminders and schedule timers
async function scheduleReminderTimers(reminders) {
  // Clear existing active timers
  activeTimers.forEach((timerId) => clearTimeout(timerId));
  activeTimers.clear();

  const now = Date.now();

  for (const reminder of reminders) {
    const delay = reminder.triggerAt - now;

    if (delay <= 0 && delay > -3 * 60 * 1000) {
      // Due right now or within recent 3 minutes
      await showTaskNotification(reminder);
    } else if (delay > 0) {
      // Schedule timer if within reasonable timeout window (up to 24h)
      if (delay < 86400000) {
        const timerId = setTimeout(async () => {
          await showTaskNotification(reminder);
          activeTimers.delete(reminder.id);
        }, delay);
        activeTimers.set(reminder.id, timerId);
      }
    }
  }
}

// Check pending reminders from IndexedDB (e.g. on SW wakeup / sync)
async function checkPendingReminders() {
  const reminders = await getPersistedReminders();
  if (reminders.length > 0) {
    await scheduleReminderTimers(reminders);
  }
}

// Service Worker Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Failed to precache some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Service Worker Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(async () => {
      await self.clients.claim();
      // On wake-up / activation, check persisted reminders
      await checkPendingReminders();
    })
  );
});

// Service Worker Message Handling
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, reminders, reminder, title, options } = event.data;

  if (type === 'SCHEDULE_REMINDERS' && Array.isArray(reminders)) {
    event.waitUntil((async () => {
      await persistReminders(reminders);
      await scheduleReminderTimers(reminders);
    })());
  }

  if (type === 'SHOW_NOTIFICATION' && title) {
    event.waitUntil(
      self.registration.showNotification(title, {
        icon: '/pwa-192x192.png',
        badge: '/icon.svg',
        vibrate: [200, 100, 200],
        ...options,
      })
    );
  }

  if (type === 'CANCEL_REMINDER' && reminder?.id) {
    if (activeTimers.has(reminder.id)) {
      clearTimeout(activeTimers.get(reminder.id));
      activeTimers.delete(reminder.id);
    }
    event.waitUntil(removePersistedReminder(reminder.id));
  }
});

// Service Worker Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const data = event.notification.data || {};
  const taskId = data.taskId;

  if (action === 'snooze_5' && taskId) {
    // Postpone reminder by 5 minutes
    event.waitUntil((async () => {
      const snoozeReminder = {
        id: `${taskId}_snooze_${Date.now()}`,
        taskId: taskId,
        title: `⏰ [Pospuesto] ${event.notification.title.replace(/^⏰\s*(Recordatorio:\s*)?/, '')}`,
        body: 'Tarea pospuesta 5 minutos.',
        triggerAt: Date.now() + 5 * 60 * 1000,
      };
      const reminders = await getPersistedReminders();
      reminders.push(snoozeReminder);
      await persistReminders(reminders);
      await scheduleReminderTimers(reminders);
    })());
    return;
  }

  // Default click or 'view' action: focus existing app window or open a new one
  const targetUrl = data.url || (taskId ? `/?taskId=${taskId}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'OPEN_TASK',
            taskId: taskId,
          });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync & Periodic Background Sync listeners (if supported by browser)
self.addEventListener('sync', (event) => {
  if (event.tag === 'check-reminders' || event.tag === 'khoros-sync') {
    event.waitUntil(checkPendingReminders());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkPendingReminders());
  }
});

// Web Push listener for proactive push notifications
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Recordatorio de Khoros';
  const options = {
    body: data.body || 'Tienes un evento o tarea próxima a comenzar.',
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Cache Fetch Interceptor
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.protocol.startsWith('chrome-extension')) return;

  // Cache-First strategy for static assets
  if (
    url.origin === location.origin && (
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.ico') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.includes('/assets/')
    ) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Network-First with cache fallback for navigation and code
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || (await caches.match('/'));
        }
        return new Response('Offline: Content unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain' })
        });
      })
  );
});
