/**
 * GET /api/student/profile
 * =========================
 *
 * Returns the logged-in student's profile with class memberships.
 *
 * AUTH: Student only (must be logged in)
 *
 * CACHING:
 * - Called automatically by studentCache.getProfile() on cache miss
 * - Can also be hydrated from +layout.server.ts to avoid this API call
 * - Cache TTL: 2 hours (profile data changes infrequently)
 *
 * RESPONSE:
 * {
 *   profile: {
 *     id: string,
 *     email: string,
 *     firstname: string,
 *     lastname: string | null,
 *     full_name: string | null,
 *     avatar_url: string | null,
 *     gender: string | null,
 *     grade: string | null,
 *     is_test: boolean,
 *     school_id: string | null,
 *     classes: ClassMembership[]
 *   }
 * }
 *
 * USAGE:
 * ```typescript
 * // Auto-fetch via cache
 * const profile = await studentCache.getProfile();
 *
 * // Direct API call (not recommended)
 * const response = await fetch('/api/student/profile');
 * const { profile } = await response.json();
 * ```
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { StudentProfile, ClassMembership } from '$lib/types/student-cache';

export const GET: RequestHandler = async ({ locals }) => {
	const { user, profile, supabaseServer } = await locals.safeGetSession();

	// Auth check: Must be logged in
	if (!user || !profile) {
		throw error(401, 'Authentication required');
	}

	// Auth check: Must be a student
	if (profile.role !== 'student') {
		throw error(403, 'This endpoint is only accessible to students');
	}

	try {
		// Fetch class memberships with class and teacher details
		const { data: memberships, error: membershipError } = await supabaseServer
			.from('class_members')
			.select(
				`
				class_id,
				joined_at,
				classes:class_id (
					id,
					name,
					is_active,
					teacher:teacher_id (
						id,
						full_name
					)
				)
			`
			)
			.eq('student_id', user.id)
			.order('joined_at', { ascending: false });

		if (membershipError) {
			console.error('[API] Error fetching class memberships:', membershipError);
			throw error(500, 'Failed to fetch class memberships');
		}

		// Transform database response to ClassMembership[]
		const classes: ClassMembership[] = (memberships || [])
			.filter((m) => m.classes) // Filter out null classes
			.map((m) => ({
				class_id: m.class_id,
				class_name: m.classes.name,
				teacher_name: m.classes.teacher?.full_name || 'Unknown Teacher',
				teacher_id: m.classes.teacher?.id || '',
				joined_at: m.joined_at,
				is_active: m.classes.is_active
			}));

		// Build student profile
		const studentProfile: StudentProfile = {
			id: profile.id,
			email: profile.email,
			firstname: profile.firstname,
			lastname: profile.lastname,
			full_name: profile.full_name,
			avatar_url: profile.avatar_url,
			gender: profile.gender,
			grade: profile.grade,
			is_test: profile.is_test,
			school_id: profile.school_id,
			classes
		};

		return json({ profile: studentProfile });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/profile:', err);
		throw error(500, 'An unexpected error occurred');
	}
};
