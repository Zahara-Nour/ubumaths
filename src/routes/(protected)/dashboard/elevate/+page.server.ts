/**
 * Admin elevation page — server load
 * ==================================
 *
 * Resolves a SAFE post-elevation redirect target from the `?redirect=` query
 * param. The parent `(protected)` layout already guarantees the caller is an
 * authenticated teacher/admin, so this load only sanitises the redirect to
 * prevent an open-redirect: the target MUST be an internal path under
 * `/dashboard/admin`. Anything else (absolute URL, protocol-relative `//evil`,
 * a path outside the admin section, or a missing param) falls back to the admin
 * home. The validated path is returned to the page and used by `goto()` after a
 * successful elevation.
 *
 * @module routes/(protected)/dashboard/elevate/+page.server
 */

import type { PageServerLoad } from './$types';

/** Default landing once elevated. */
const DEFAULT_REDIRECT = '/dashboard/admin';

/**
 * Validate an internal redirect target. Accepts only same-origin paths that
 * live under `/dashboard/admin` (the elevation-gated section). Rejects absolute
 * URLs and protocol-relative paths (`//host`) which could leak the user
 * off-site.
 */
function safeRedirect(raw: string | null): string {
	if (!raw) return DEFAULT_REDIRECT;
	// Must be a root-relative path, but NOT protocol-relative ("//evil.com").
	if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_REDIRECT;
	// Must stay inside the admin section: exactly /dashboard/admin or a subpath.
	if (raw !== '/dashboard/admin' && !raw.startsWith('/dashboard/admin/')) {
		return DEFAULT_REDIRECT;
	}
	return raw;
}

export const load: PageServerLoad = async ({ url }) => {
	const redirect = safeRedirect(url.searchParams.get('redirect'));
	return { redirect };
};
