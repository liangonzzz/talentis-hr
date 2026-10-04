// Tipos mínimos del Service Worker (evita mezclar la librería "webworker" con "dom" en tu tsconfig)
interface SWEvent extends Event {
  waitUntil(promesa: Promise<unknown>): void;
}

interface SWFetchEvent extends SWEvent {
  request: Request;
  respondWith(respuesta: Promise<Response> | Response): void;
}

interface SWScope {
  location: Location;
  clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(tipo: 'install' | 'activate', listener: (evento: SWEvent) => void): void;
  addEventListener(tipo: 'fetch', listener: (evento: SWFetchEvent) => void): void;
}

const sw = self as unknown as SWScope;

const CACHE = 'talentis-v1';
const PRECACHE: string[] = ['/', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];

// Instalación: guarda en caché los archivos básicos
sw.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => sw.skipWaiting())
  );
});

// Activación: borra cachés de versiones anteriores
sw.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => sw.clients.claim())
  );
});

// Peticiones: caché primero, y se actualiza en segundo plano
sw.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  // Las llamadas a la API siempre van directo a la red
  if (url.origin === sw.location.origin && url.pathname.startsWith('/api')) return;

  evento.respondWith(
    caches.match(peticion).then((guardada) => {
      const red = fetch(peticion)
        .then((respuesta) => {
          if (respuesta && (respuesta.ok || respuesta.type === 'opaque')) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(async () => {
          if (guardada) return guardada;
          if (peticion.mode === 'navigate') {
            const inicio = await caches.match('/');
            if (inicio) return inicio;
          }
          return Response.error();
        });
      return guardada ?? red;
    })
  );
});

export {};