# HTTP Response Caching

Technical documentation for HTTP Cache-Control headers used in API responses.

---

## Overview

UbuMaths uses HTTP caching headers to enable browser and CDN caching of specific API responses. This reduces server load and improves response times for cacheable resources.

---

## Cached Endpoints

### 1. OpenAPI Specification

**Location**: `src/routes/api/openapi.json/+server.ts`

```typescript
return json(openApiSpec, {
	headers: {
		'Content-Type': 'application/json',
		'Cache-Control': 'public, max-age=3600' // 1 hour
	}
});
```

| Header          | Value                  | Meaning                                   |
| --------------- | ---------------------- | ----------------------------------------- |
| `Cache-Control` | `public, max-age=3600` | Cacheable by browsers and CDNs for 1 hour |

**Rationale**: OpenAPI spec is static and changes only on deployments. Public caching reduces documentation page load times.

---

### 2. Document Downloads

**Location**: `src/routes/api/documents/[id]/+server.ts`

```typescript
return new Response(binaryData, {
	headers: {
		'Content-Type': contentType,
		'Content-Disposition': `attachment; filename="${filename}"`,
		'Cache-Control': 'private, max-age=3600' // 1 hour
	}
});
```

| Header          | Value                   | Meaning                         |
| --------------- | ----------------------- | ------------------------------- |
| `Cache-Control` | `private, max-age=3600` | Browser-only caching for 1 hour |

**Rationale**:

- `private` prevents CDN caching (documents may be access-controlled)
- 1-hour TTL balances freshness with performance
- Documents from Supabase Storage (PDFs, images for chapters)

---

## Cache-Control Directives Reference

### Common Directives Used

| Directive   | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `public`    | Response can be cached by browsers, CDNs, and proxies |
| `private`   | Response can only be cached by the end-user's browser |
| `max-age=N` | Response is fresh for N seconds                       |
| `no-cache`  | Must revalidate with server before using cached copy  |
| `no-store`  | Response must never be cached                         |

### Directive Selection Guide

```
Is the response user-specific or access-controlled?
├── YES → Use 'private'
│   ├── Document downloads → 'private, max-age=3600'
│   └── User settings → 'private, max-age=300'
│
└── NO → Use 'public'
    ├── Static API specs → 'public, max-age=3600'
    ├── Public assets → 'public, max-age=86400'
    └── CDN resources → 'public, max-age=31536000, immutable'
```

---

## Endpoints Without Caching

Most API endpoints do not set Cache-Control headers, defaulting to browser behavior (no caching for dynamic content). This includes:

| Endpoint Pattern | Reason                                              |
| ---------------- | --------------------------------------------------- |
| `/api/auth/*`    | Security-sensitive, always fresh                    |
| `/api/classes/*` | User-specific data, managed by client cache         |
| `/api/rewards/*` | Frequently mutated, optimistic UI handles freshness |
| `/api/teacher/*` | User-specific, client-side caching preferred        |
| `/api/student/*` | User-specific, client-side caching preferred        |

---

## SvelteKit Data Loading

SvelteKit's load functions use `depends()` and `invalidate()` for cache management:

```typescript
// +layout.ts
export const load: LayoutLoad = async ({ data, depends }) => {
  depends('supabase:auth'); // Register dependency
  return { ... };
};

// Somewhere else - trigger reload
import { invalidate } from '$app/navigation';
invalidate('supabase:auth');
```

### Dependency Keys Used

| Key               | Triggers Reload When         |
| ----------------- | ---------------------------- |
| `supabase:auth`   | Auth state changes           |
| `teacher:classes` | Teacher's class list changes |

---

## Vercel Edge Caching

When deployed to Vercel, additional caching headers are respected:

```typescript
// For edge-cacheable responses
return json(data, {
	headers: {
		'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
	}
});
```

| Directive                      | Meaning                                       |
| ------------------------------ | --------------------------------------------- |
| `s-maxage=3600`                | CDN caches for 1 hour                         |
| `stale-while-revalidate=86400` | Serve stale while fetching fresh for 24 hours |

**Note**: Currently not implemented; listed for future consideration.

---

## Browser Cache Behavior

### Caching Conditions

Browsers cache responses when:

1. Status code is cacheable (200, 301, 302, 304, etc.)
2. `Cache-Control` doesn't include `no-store`
3. Method is GET or HEAD

### Cache Invalidation

Browsers invalidate cache when:

1. `max-age` expires
2. User performs hard refresh (Ctrl+Shift+R)
3. User clears browser cache
4. Response includes `Cache-Control: no-cache`

---

## Debugging

### DevTools Network Panel

1. Enable "Disable cache" checkbox for testing
2. Check "Size" column:
   - `(from disk cache)` - Cached response used
   - `(from memory cache)` - Recently accessed, in RAM
   - Actual size - Fresh network request

### Response Headers

Look for caching headers in response:

```http
HTTP/1.1 200 OK
Cache-Control: public, max-age=3600
Age: 1234
X-Cache: HIT
```

---

## Best Practices

### When to Add Caching

```
✅ DO cache:
- Static API documentation
- Infrequently changing configuration
- Public, non-personalized content
- Large binary files (with versioned URLs)

❌ DON'T cache:
- Authentication endpoints
- User-specific data without 'private'
- Frequently mutated resources
- Sensitive information
```

### Cache Header Template

```typescript
// Static public resource
headers: { 'Cache-Control': 'public, max-age=3600' }

// User-specific resource
headers: { 'Cache-Control': 'private, max-age=300' }

// Never cache
headers: { 'Cache-Control': 'no-store' }

// Revalidate every time
headers: { 'Cache-Control': 'no-cache' }
```

---

## Related Documentation

- [Service Worker Caching](service-worker.md) - CDN resource caching
- [Client Stores](client-stores.md) - Application-level caching
- [Improvements](improvements.md#http-caching-improvements) - Recommended enhancements
