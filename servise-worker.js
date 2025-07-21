self.addEventListener('install', e => {
    e.waitUntil(
      caches.open('medicine-donation-cache').then(cache => {
        return cache.addAll([
          'index.html',
          'manifest.json',
          'assets/logo.png'
        ]);
      })
    );
  });
  
  self.addEventListener('fetch', e => {
    e.respondWith(
      caches.match(e.request).then(response => {
        return response || fetch(e.request);
      })
    );
  });
  