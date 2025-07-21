self.addEventListener('install', function(e) {
    e.waitUntil(
      caches.open('medicine-donation-cache').then(function(cache) {
        return cache.addAll([
          '/',
          '/index.html',
          '/manifest.json',
          '/style.css',
          '/logo192.png',
          '/logo512.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', function(e) {
    e.respondWith(
      caches.match(e.request).then(function(response) {
        return response || fetch(e.request);
      })
    );
  });
  