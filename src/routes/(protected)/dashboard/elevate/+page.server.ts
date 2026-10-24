/**
 * Admin elevation page — server load
 * ==================================
 *
 * Resolves a SAFE post-elevation redirect target from the `?redirect=` query
 * param. The parent `(protected)` layout already guarantees the caller is an
 * authenticated teacher/admin, so this load only sanitises the redirect to
 * prevent an open-redirect: the target MUST be an internal path under
 * `/dashboard/admin` or `/dev` (`$lib/server/elevation-redirect`). Anything else (absolute URL, protocol-relative `//evil`,
 * a path outside the admin section, or a missing param) falls back to the admin
 * home. The validated path is returned to the page and used by `goto()` after a
 * successful elevation.
 *
 * @module routes/(protected)/dashboard/elevate/+page.server
 */

import { safeElevationRedirect } from '$lib/server/elevation-redirect';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const redirect = safeElevationRedirect(url.searchParams.get('redirect'));
	return { redirect };
};
