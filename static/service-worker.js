/**
 * Service Worker for Pyodide and CDN caching
 *
 * Caches files from:
 * - cdn.jsdelivr.net (Pyodide, Typst WASM)
 * - cdn.plot.ly (Plotly.js)
 *
 * Strategy: Cache-first for CDN resources
 * This dramatically improves reload times for the Python playground.
 */

const CACHE_NAME = 'pyodide-cache-v2';

// Hosts to cache (CDNs with versioned URLs)
const CACHEABLE_HOSTS = ['cdn.jsdelivr.net', 'cdn.plot.ly'];

// Install: skip waiting to activate immediately
self.addEventListener('install', () => {
	self.skipWaiting();
});

// Activate: clean up old caches and claim clients
self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
			)
			.then(() => self.clients.claim())
	);
});

// Fetch: cache-first for CDN resources
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Only handle cacheable CDN hosts
	if (!CACHEABLE_HOSTS.includes(url.host)) {
		return;
	}

	// Only cache GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			// Try cache first (ignoreVary to match regardless of Accept-Encoding etc.)
			const cached = await cache.match(event.request, { ignoreVary: true });
			if (cached) {
				console.log('[SW] Cache hit:', url.pathname);
				return cached;
			}

			// Fetch from network and cache the response
			console.log('[SW] Cache miss, fetching:', url.pathname);
			try {
				const response = await fetch(event.request);
				if (response.ok) {
					// Clone response before caching (response can only be used once)
					cache.put(event.request, response.clone());
				}
				return response;
			} catch (error) {
				// Network failed and no cache - return error
				console.error('[SW] Fetch failed:', url.href, error);
				throw error;
			}
		})
	);
});
