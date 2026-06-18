/**
 * Admin section guard
 * ===================
 *
 * Section-level gate for `/dashboard/admin/*`: students never get in. It does
 * NOT require admin, because the section is mixed — most pages are admin-only
 * (they self-gate with `requireAdmin`, which a non-elevated teacher fails), but
 * a few (`friendships`, `users`) legitimately allow the teacher too. So the
 * layout only enforces the least-restrictive common denominator (teacher OR
 * admin); each page refines from there.
 *
 * @module routes/(protected)/dashboard/admin/+layout.server
 */

import { requireRoles } from '$lib/server/middleware/auth';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	return {};
};
