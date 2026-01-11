/**
 * VIP Cards Collection Page - Redirect
 * =====================================
 *
 * This page has been moved to /dashboard/student/inventory.
 * This redirect ensures old bookmarks and links continue to work.
 */

import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	redirect(301, '/dashboard/student/inventory');
};
