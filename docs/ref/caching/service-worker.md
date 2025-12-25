# Service Worker Caching

Technical documentation for the Service Worker CDN caching layer.

**Location**: `static/service-worker.js`

---

## Overview

The Service Worker provides cache-first caching for large CDN resources that rarely change, specifically targeting:

- **Pyodide** (~11MB) - Python runtime compiled to WebAssembly
- **Typst WASM** - Document typesetting engine
- **Plotly.js** - Graphing library

This caching layer eliminates re-downloading these large resources on every visit, reducing Python playground load time from ~15 seconds to ~1 second on subsequent visits.

---

## Configuration

```javascript
// Cache name (increment version to invalidate)
const CACHE_NAME = 'pyodide-cache-v2';

// Hosts eligible for caching
const CACHEABLE_HOSTS = ['cdn.jsdelivr.net', 'cdn.plot.ly'];
```

### Cached Resources

| Resource       | Host             | Size  | Purpose                 |
| -------------- | ---------------- | ----- | ----------------------- |
| Pyodide WASM   | cdn.jsdelivr.net | ~11MB | Python runtime          |
| Pyodide stdlib | cdn.jsdelivr.net | ~10MB | Python standard library |
| Typst WASM     | cdn.jsdelivr.net | ~5MB  | Document typesetting    |
| Plotly.js      | cdn.plot.ly      | ~3MB  | Interactive graphing    |

---

## Caching Strategy

### Cache-First Pattern

```
Request → Check Cache → [HIT] → Return Cached Response
                     ↓
                   [MISS] → Fetch from Network → Cache Response → Return
```

### Implementation

```javascript
self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Only handle cacheable CDN hosts
	if (!CACHEABLE_HOSTS.includes(url.host)) {
		return; // Let browser handle normally
	}

	// Only cache GET requests
	if (event.request.method !== 'GET') {
		return;
	}

	event.respondWith(
		caches.open(CACHE_NAME).then(async (cache) => {
			// Try cache first (ignoreVary for Accept-Encoding compatibility)
			const cached = await cache.match(event.request, { ignoreVary: true });
			if (cached) {
				console.log('[SW] Cache hit:', url.pathname);
				return cached;
			}

			// Fetch and cache
			console.log('[SW] Cache miss, fetching:', url.pathname);
			const response = await fetch(event.request);
			if (response.ok) {
				cache.put(event.request, response.clone());
			}
			return response;
		})
	);
});
```

### Key Design Decisions

| Decision           | Rationale                                                           |
| ------------------ | ------------------------------------------------------------------- |
| `ignoreVary: true` | Matches responses regardless of `Accept-Encoding` header variations |
| `response.clone()` | Response body can only be consumed once; clone before caching       |
| GET-only caching   | Only idempotent requests should be cached                           |
| Host allowlist     | Prevents caching sensitive first-party data                         |

---

## Lifecycle Events

### Install

```javascript
self.addEventListener('install', () => {
	self.skipWaiting(); // Activate immediately without waiting
});
```

- `skipWaiting()` ensures new Service Worker versions activate immediately
- No pre-caching (lazy caching on first use instead)

### Activate

```javascript
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
```

- Cleans up old cache versions (e.g., `pyodide-cache-v1`)
- `clients.claim()` takes control of open tabs immediately

---

## Cache Invalidation

### Version Bump

To invalidate all cached resources:

```javascript
// Change from:
const CACHE_NAME = 'pyodide-cache-v2';

// To:
const CACHE_NAME = 'pyodide-cache-v3';
```

The `activate` event handler automatically deletes old caches.

### Manual Invalidation

Users can clear cache via browser DevTools:

- Application → Storage → Clear site data
- Application → Cache Storage → Delete `pyodide-cache-v2`

### Automatic Invalidation Triggers

- Service Worker file changes → New SW registered → Activate event cleans old cache
- Cache name version change → Old cache deleted on activation

---

## Registration

The Service Worker is registered in the app entry point:

```typescript
// src/app.html or layout
if ('serviceWorker' in navigator) {
	navigator.serviceWorker.register('/service-worker.js');
}
```

---

## Debugging

### Console Logs

```
[SW] Cache hit: /npm/pyodide@0.24.1/pyodide.mjs
[SW] Cache miss, fetching: /npm/pyodide@0.24.1/pyodide.asm.wasm
[SW] Fetch failed: https://cdn.jsdelivr.net/... TypeError: Failed to fetch
```

### DevTools

1. **Application → Service Workers**

   - View registration status
   - Force update
   - Unregister for testing

2. **Application → Cache Storage**

   - Inspect cached entries
   - Delete individual entries
   - View cache size

3. **Network Panel**
   - Filter by "Service Worker" to see handled requests
   - `(ServiceWorker)` indicator shows cached responses

---

## Performance Impact

| Metric                     | Without Cache | With Cache | Improvement        |
| -------------------------- | ------------- | ---------- | ------------------ |
| Pyodide load (first visit) | ~15s          | ~15s       | -                  |
| Pyodide load (subsequent)  | ~15s          | <1s        | **>90% faster**    |
| Total cached size          | -             | ~30MB      | One-time download  |
| Network requests           | Many          | 0 (cached) | **100% reduction** |

---

## Limitations

1. **No TTL**: Cache persists indefinitely until version bump
2. **No Precaching**: Resources cached lazily on first use
3. **CDN-Only**: First-party resources not cached by SW
4. **Same-Origin Requirement**: Service Worker scope limited to origin

---

## Security Considerations

1. **HTTPS Required**: Service Workers only work over HTTPS (or localhost)
2. **Host Allowlist**: Only specific CDN hosts are cached, preventing accidental caching of sensitive data
3. **No Credential Caching**: CDN resources don't include authentication headers
4. **Versioned URLs**: CDN URLs include version numbers, ensuring cache correctness

---

## Future Improvements

See [Improvements](improvements.md#service-worker-improvements) for recommended enhancements:

- Precaching critical resources
- Cache size management
- Stale-while-revalidate for faster updates
- Background sync for offline support
