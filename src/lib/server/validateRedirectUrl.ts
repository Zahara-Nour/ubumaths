/**
 * Validates redirect URLs to prevent open redirect attacks.
 *
 * Allows:
 * - relative paths starting with a single `/` (but NOT protocol-relative `//`)
 * - same-origin absolute URLs
 *
 * Everything else (external origins, malformed URLs, `javascript:` schemes, …)
 * falls back to `/`.
 *
 * Shared by the auth callbacks — Google OAuth `/auth/callback` and the email
 * confirmation `/auth/confirm` — so redirect validation stays consistent across
 * both entry points.
 */
export function validateRedirectUrl(url: string, origin: string): string {
	// Allow relative URLs, but reject protocol-relative ones like //evil.com.
	// SECURITY (finding L4): also reject any `\` — browsers normalize `\`→`/` in
	// Location, so `/\evil.com` resolves to `//evil.com` (open redirect).
	if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) {
		return url;
	}

	// Allow same-origin absolute URLs only
	try {
		const parsed = new URL(url);
		const originUrl = new URL(origin);
		if (parsed.origin === originUrl.origin) {
			return url;
		}
	} catch {
		// Invalid URL → fall through to the safe default
	}

	return '/';
}
