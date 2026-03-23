const CACHE_NAME = 'haber-pro-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// 1. Kurulum Aşaması: Çekirdek dosyaları telefonun/bilgisayarın hafızasına kaydet
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Dosyalar önbelleğe alınıyor...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
});

// 2. Aktivasyon Aşaması: Eğer uygulamanın yeni versiyonunu yayınlarsan eski önbelleği temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Eski önbellek siliniyor:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch (Ağ İsteği) Aşaması: İnternet kopsa bile siteyi önbellekten yükle
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Eğer dosya önbellekte varsa onu ver, yoksa internetten (ağdan) çek
        return response || fetch(event.request);
      })
  );
});
