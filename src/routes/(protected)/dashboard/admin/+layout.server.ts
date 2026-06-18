/**
 * Admin section guard
 * ===================
 *
 * Section-level gate for `/dashboard/admin/*`. With server-side admin elevation
 * (Pattern 2) the rule is explicit:
 *
 *   - unauthenticated            → /auth/login
 *   - active admin elevation     → allowed (parallel admin state)
 *   - real admin account         → allowed (a true admin never needs to elevate)
 *   - teacher (not elevated)     → redirected to the elevation screen, carrying
 *                                  the requested path so they land back here once
 *                                  elevated
 *   - anyone else (students, …)  → 403
 *
 * Most child pages additionally self-gate with `requireAdmin`; a non-elevated
 * teacher fails those, but a handful (`friendships`, `users`) legitimately allow
 * the teacher too — so the redirect here is the floor, not a hard admin wall.
 *
 * SECURITY: the returned `adminElevation` is intentionally minimal — only
 * `{ active, expiresAt }`. The admin user id and the elevation token are NEVER
 * sent to the client.
 *
 * @module routes/(protected)/dashboard/admin/+layout.server
 */

import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Pages under /dashboard/admin that legitimately allow the (single) teacher, not
// just admins — they self-gate at teacher+admin. A non-elevated teacher must NOT
// be bounced to the elevation screen for these. Keep in sync with the Phase 3
// teacher-allowed exclusions (api/admin counterparts: users, pending approvals).
const TEACHER_ALLOWED_PREFIXES = ['/dashboard/admin/friendships', '/dashboard/admin/users'];

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/login');
	}

	if (locals.adminElevation?.active || locals.profile?.role === 'admin') {
		// Active elevation or a real admin login → full admin-section access.
	} else if (locals.profile?.role === 'teacher') {
		const teacherAllowed = TEACHER_ALLOWED_PREFIXES.some(
			(p) => url.pathname === p || url.pathname.startsWith(`${p}/`)
		);
		if (!teacherAllowed) {
			// Admin-only page → send the teacher to the step-up screen, preserving
			// the destination so they land back here once elevated.
			throw redirect(303, `/dashboard/elevate?redirect=${encodeURIComponent(url.pathname)}`);
		}
		// Teacher-allowed page (friendships/users) → let the teacher through.
	} else {
		// Students and any other role have no business here.
		throw error(403, "Accès réservé à l'administration");
	}

	// Expose ONLY the minimal, non-sensitive elevation state to the client.
	return {
		adminElevation: locals.adminElevation
			? { active: locals.adminElevation.active, expiresAt: locals.adminElevation.expiresAt }
			: null
	};
};
