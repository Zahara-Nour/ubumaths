/**
 * Student Dashboard Layout (Server)
 * ==================================
 *
 * Pre-loads student data server-side and returns it for cache hydration.
 *
 * HYDRATION STRATEGY:
 * This layout fetches data on the server (single database query) and passes
 * it to the client. The client layout (+layout.svelte) then hydrates the
 * studentCache with this data, avoiding redundant API calls.
 *
 * WORKFLOW:
 * 1. Server: Fetch profile + classes from database
 * 2. Server: Fetch rewards (gidouilles + VIP cards) from database
 * 3. Server: Return both as layout data
 * 4. Client: Hydrate studentCache with server data
 * 5. Child pages: Access cached data instantly (no API calls)
 *
 * DATA LOADED:
 * - Student profile (id, email, name, avatar, etc.)
 * - Class memberships (classes student is enrolled in)
 * - Rewards (gidouilles balance + VIP cards)
 *
 * PERFORMANCE:
 * - 2 database queries on server (profile + rewards)
 * - 0 API calls on client (data already available)
 * - Instant page loads for student dashboard
 *
 * ERROR HANDLING:
 * - Non-critical failures (memberships, rewards) don't crash the page
 * - Returns minimal data to ensure dashboard remains functional
 */

import type { LayoutServerLoad } from './$types';
import type { StudentProfile, ClassMembership, StudentRewards } from '$lib/types/student-cache';
import type { StudentVipCards } from '$lib/types/vip-card';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user, profile, supabaseServer } = await locals.safeGetSession();

	// Must be logged in as student
	if (!user || !profile || profile.role !== 'student') {
		throw error(403, 'Access denied');
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
			console.error('[Layout] Error fetching class memberships:', membershipError);
			// Non-critical - continue with empty classes
		}

		// Transform to ClassMembership[]
		const classes: ClassMembership[] = (memberships || [])
			.filter((m) => m.classes)
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

		// Fetch student rewards
		const { data: rewardsData, error: rewardsError } = await supabaseServer
			.from('profiles')
			.select('gidouilles, vip_cards')
			.eq('id', user.id)
			.single();

		if (rewardsError) {
			console.error('[Layout] Error fetching rewards:', rewardsError);
			// Non-critical - continue with default rewards
		}

		// Parse VIP cards
		let vipCards: StudentVipCards = {};
		if (rewardsData?.vip_cards) {
			try {
				vipCards = rewardsData.vip_cards as StudentVipCards;
			} catch {
				vipCards = {};
			}
		}

		const rewards: StudentRewards = {
			gidouilles: rewardsData?.gidouilles || 0,
			vip_cards: vipCards
		};

		// Return data for cache hydration on client
		// The +layout.svelte will call studentCache.hydrateProfile() and hydrateRewards()
		return {
			studentProfile,
			rewards
		};
	} catch (err) {
		console.error('[Layout] Unexpected error loading student dashboard:', err);
		// Return minimal data to prevent crashes
		return {
			studentProfile: {
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
				classes: []
			},
			rewards: {
				gidouilles: 0,
				vip_cards: {}
			}
		};
	}
};
