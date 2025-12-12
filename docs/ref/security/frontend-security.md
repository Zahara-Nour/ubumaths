# Frontend Security

## Overview

This document covers client-side security measures: XSS prevention, CSRF protection, Content Security Policy, and secure data handling.

---

## Content Security Policy (CSP)

### Current Configuration

```typescript
// src/hooks.server.ts
response.headers.set(
	'Content-Security-Policy',
	[
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://cdn.plot.ly https://unpkg.com",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com",
		"img-src 'self' data: blob: https://*.supabase.co https://*.googleusercontent.com https://unpkg.com",
		"connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://cdn.plot.ly https://*.googleapis.com",
		"worker-src 'self' blob:",
		"frame-ancestors 'self'",
		"object-src 'none'",
		"base-uri 'self'"
	].join('; ')
);
```

### Directive Breakdown

| Directive         | Value                          | Purpose                                   |
| ----------------- | ------------------------------ | ----------------------------------------- |
| `default-src`     | `'self'`                       | Fallback for undefined directives         |
| `script-src`      | `'self' 'unsafe-inline'`       | Allow inline scripts (Svelte requirement) |
| `style-src`       | `'self' 'unsafe-inline'`       | Allow inline styles (Tailwind)            |
| `img-src`         | `'self' data: blob:`           | Images from same origin + data URIs       |
| `font-src`        | `'self' data:`                 | Fonts from same origin                    |
| `connect-src`     | `'self' https://*.supabase.co` | API connections                           |
| `frame-ancestors` | `'self'`                       | Prevents clickjacking                     |
| `object-src`      | `'none'`                       | Blocks plugins (Flash, etc.)              |
| `base-uri`        | `'self'`                       | Prevents base tag injection               |

### Why `'unsafe-inline'` and `'unsafe-eval'`?

- **`'unsafe-inline'`**: Svelte and Tailwind require inline scripts/styles. Future improvement: nonce-based CSP when SvelteKit adds support.
- **`'unsafe-eval'`**: Required for Typst.js compiler which uses `new Function()` internally for WebAssembly compilation. This is limited to trusted CDN sources only.

---

## XSS Prevention

### Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ User Input  │───>│  DOMPurify  │───>│ Safe HTML   │
└─────────────┘    │ Sanitize    │    │ (rendered)  │
                   └─────────────┘    └─────────────┘
```

### Server-Side Sanitization

```typescript
// src/lib/server/sanitization.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
        ALLOWED_ATTR: ['href', 'target', 'rel'],
        ALLOW_DATA_ATTR: false
    });
}

// For math content (allows more tags)
export function sanitizeMathContent(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'sub', 'sup', 'span', 'math', ...],
        ALLOWED_ATTR: ['class', 'style'],
        ALLOW_DATA_ATTR: false
    });
}
```

### Client-Side Sanitization

```typescript
// src/lib/utils/sanitize.ts
import DOMPurify from 'dompurify';

export function sanitize(html: string): string {
	return DOMPurify.sanitize(html);
}
```

### Usage in Components

```svelte
<script>
	import { sanitize } from '$lib/utils/sanitize';

	let { content } = $props();
</script>

<!-- Safe: sanitized before rendering -->
{@html sanitize(content)}

<!-- NEVER do this -->
{@html content}
```

### When to Sanitize

| Context                                 | Action                 |
| --------------------------------------- | ---------------------- |
| User-generated HTML                     | Always sanitize        |
| Database content displayed with `@html` | Always sanitize        |
| Trusted static content                  | No sanitization needed |
| Text content (no `@html`)               | Svelte auto-escapes    |

---

## CSRF Protection

### Mechanism

```typescript
// src/hooks.server.ts
const isStateChangingRequest = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method);

if (isStateChangingRequest) {
	const origin = event.request.headers.get('origin');
	const host = event.request.headers.get('host');

	if (!origin || !host || new URL(origin).host !== host) {
		if (origin !== null) {
			throw error(403, 'Invalid origin');
		}
	}
}
```

### How It Works

1. Browser sends `Origin` header with cross-origin requests
2. Server compares `Origin` with `Host`
3. Mismatch = CSRF attempt blocked

### Why Origin Check?

| Scenario            | Origin                     | Host               | Result   |
| ------------------- | -------------------------- | ------------------ | -------- |
| Same-origin request | `https://app.ubumaths.com` | `app.ubumaths.com` | ✅ Allow |
| Cross-origin attack | `https://evil.com`         | `app.ubumaths.com` | ❌ Block |
| Server-to-server    | `null`                     | `app.ubumaths.com` | ✅ Allow |

---

## Secure Headers

### All Security Headers

```typescript
// src/hooks.server.ts
response.headers.set('X-Frame-Options', 'SAMEORIGIN');
response.headers.set('X-Content-Type-Options', 'nosniff');
response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

// Production only
if (!dev) {
	response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}
```

### Header Purposes

| Header                      | Value                             | Purpose                       |
| --------------------------- | --------------------------------- | ----------------------------- |
| `X-Frame-Options`           | `SAMEORIGIN`                      | Clickjacking protection       |
| `X-Content-Type-Options`    | `nosniff`                         | MIME type sniffing prevention |
| `Referrer-Policy`           | `strict-origin-when-cross-origin` | Referrer leakage prevention   |
| `Permissions-Policy`        | `camera=(), microphone=()`        | Feature restriction           |
| `Strict-Transport-Security` | `max-age=31536000`                | HTTPS enforcement             |

---

## Sensitive Data Handling

### What NOT to Store Client-Side

| Data Type          | LocalStorage | SessionStorage | Cookie      |
| ------------------ | ------------ | -------------- | ----------- |
| Auth tokens        | ❌           | ❌             | HttpOnly ✅ |
| User passwords     | ❌           | ❌             | ❌          |
| API keys           | ❌           | ❌             | ❌          |
| PII (emails, etc.) | ⚠️ Temporary | ⚠️ Temporary   | ❌          |

### Safe Local Storage Usage

```typescript
// OK: Non-sensitive preferences
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'fr');

// OK: Temporary display data (already public)
sessionStorage.setItem('lastViewedExercise', exerciseId);

// NEVER: Sensitive data
localStorage.setItem('authToken', token); // WRONG
localStorage.setItem('userEmail', email); // WRONG
```

### Form Data Security

```svelte
<script>
	let password = $state('');

	async function handleSubmit() {
		// Send over HTTPS
		await fetch('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify({ password }),
			headers: { 'Content-Type': 'application/json' }
		});

		// Clear sensitive data
		password = '';
	}
</script>

<form onsubmit={handleSubmit}>
	<input type="password" bind:value={password} autocomplete="current-password" />
</form>
```

---

## Error Handling

### Client-Side Error Monitoring

```typescript
// src/lib/utils/errorMonitoring.ts
class ErrorMonitor {
	private errorCount = 0;
	private readonly MAX_ERRORS_PER_MINUTE = 10;

	reportError(error: Error, context?: object) {
		// Rate limiting
		if (this.errorCount >= this.MAX_ERRORS_PER_MINUTE) {
			return;
		}
		this.errorCount++;

		// Sanitize error before sending
		const sanitizedError = {
			message: error.message,
			stack: error.stack?.substring(0, 1000),
			url: window.location.pathname, // No query params
			timestamp: new Date().toISOString()
		};

		fetch('/api/errors/log', {
			method: 'POST',
			body: JSON.stringify(sanitizedError)
		});
	}
}
```

### What NOT to Log

```typescript
// WRONG: Logs sensitive data
console.error('Login failed for user:', email, 'with password:', password);

// CORRECT: Generic message
console.error('Login failed');
```

---

## Third-Party Scripts

### Current Third-Party Scripts

| Script           | Purpose       | Security          |
| ---------------- | ------------- | ----------------- |
| Google Analytics | Analytics     | CSP restricted    |
| Supabase JS      | Database/Auth | Direct connection |

### Adding New Third-Party Scripts

1. Add domain to CSP `script-src`
2. Add domain to CSP `connect-src` if API calls needed
3. Use Subresource Integrity (SRI) when available:

```html
<script
	src="https://example.com/script.js"
	integrity="sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC"
	crossorigin="anonymous"
></script>
```

---

## URL Security

### Safe URL Handling

```typescript
// Validate URLs before redirect
function safeRedirect(url: string): string {
	// Only allow relative URLs
	if (url.startsWith('/') && !url.startsWith('//')) {
		return url;
	}

	// Or same-origin absolute URLs
	try {
		const parsed = new URL(url, window.location.origin);
		if (parsed.origin === window.location.origin) {
			return url;
		}
	} catch {
		// Invalid URL
	}

	return '/'; // Default to home
}
```

### URL Parameter Sanitization

```svelte
<script>
	import { page } from '$app/stores';

	// Don't trust URL params for display
	let searchQuery = $derived($page.url.searchParams.get('q')?.substring(0, 100) ?? '');
</script>

<!-- Safe: Svelte escapes text -->
<p>Searching for: {searchQuery}</p>

<!-- UNSAFE: Don't use @html with URL params -->
<p>{@html searchQuery}</p>
```

---

## Component Security Patterns

### Props Validation

```svelte
<script lang="ts">
	interface Props {
		userId: string;
		content?: string;
	}

	let { userId, content = '' }: Props = $props();

	// Validate props
	$effect(() => {
		if (!/^[0-9a-f-]{36}$/.test(userId)) {
			throw new Error('Invalid userId');
		}
	});
</script>
```

### Event Handler Security

```svelte
<script>
	function handleClick(event: MouseEvent) {
		// Don't follow links with javascript:
		const target = event.target as HTMLElement;
		const href = target.closest('a')?.href;

		if (href?.startsWith('javascript:')) {
			event.preventDefault();
			return;
		}
	}
</script>

<div onclick={handleClick}>
	{@html sanitizedContent}
</div>
```

---

## Security Checklist

For every new component/page:

- [ ] User input is validated before use
- [ ] `@html` only used with sanitized content
- [ ] No sensitive data in client-side storage
- [ ] External URLs validated before redirect
- [ ] Error messages don't expose internals
- [ ] Form inputs have appropriate `autocomplete` attributes
- [ ] Third-party scripts added to CSP if needed
