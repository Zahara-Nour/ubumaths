/**
 * Class Hydration Helper
 * ======================
 *
 * Centralized helper for hydrating the teacherCache when a class is selected.
 *
 * ARCHITECTURE:
 * -------------
 * - Accepts currentPeriodId as parameter (from server layout)
 * - Loads students with rewards for the selected class
 * - Loads warnings via cache API (auto-fetches from API if needed)
 * - Hydrates all relevant caches (Cache 1, 2A, 2B)
 *
 * USAGE:
 * ------
 * ```typescript
 * import { hydrateClassData } from '$lib/stores/classHydration';
 *
 * // In $effect when selectedClassId changes
 * $effect(() => {
 *   if (selectedClassId && supabase) {
 *     hydrateClassData(selectedClassId, supabase, currentPeriodId);
 *   }
 * });
 * ```
 *
 * CACHES HYDRATED:
 * ----------------
 * - Cache 1: Student basic info (name, avatar, etc.)
 * - Cache 2A: Rewards (gidouilles + VIP cards)
 * - Cache 2B: Warnings (for current period only)
 *
 * NOTE: Cache 3 (ClassInfo) and Cache 4 (SchoolInfo) are NOT hydrated here
 * as they are less critical and can auto-fetch when needed.
 */

import { teacherCache } from './teacherDashboardCache.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { StudentVipCards } from '$lib/types/vip-card';

/**
 * Student data with rewards (for hydrating Cache 1 and 2A)
 */
interface StudentWithRewards {
	id: string;
	firstname: string | null;
	lastname: string | null;
	full_name: string | null;
	avatar_url: string | null;
	role: string | null;
	gender: string | null;
	is_test: boolean;
	gidouilles: number;
	vip_cards: StudentVipCards;
}

/**
 * Hydrate all cache data for a selected class
 *
 * Loads and hydrates: students, rewards, and optionally warnings
 *
 * @param classId - The class ID to hydrate
 * @param supabase - Supabase client instance
 * @param currentPeriodId - Optional current period ID (for warnings hydration)
 *
 * @example
 * await hydrateClassData('class-123', supabase, 'period-456');
 */
export async function hydrateClassData(
	classId: string,
	supabase: SupabaseClient<Database>,
	currentPeriodId?: string | null
): Promise<void> {
	try {
		console.log(`[classHydration] 🔄 Starting hydration for class ${classId}`);

		if (!currentPeriodId) {
			console.warn('[classHydration] ⚠️  No current period provided, skipping warnings');
		}

		// 2. Load students with rewards from database
		const students = await fetchClassStudentsWithRewards(classId, supabase);

		if (students.length === 0) {
			console.log(`[classHydration] ℹ️  No students found for class ${classId}`);
			return;
		}

		// 3. Hydrate Cache 1 (students - basic info)
		teacherCache.hydrateStudents(
			classId,
			students.map((s) => ({
				id: s.id,
				firstname: s.firstname || '',
				lastname: s.lastname,
				full_name: s.full_name,
				avatar_url: s.avatar_url,
				role: s.role,
				gender: s.gender,
				is_test: s.is_test
			}))
		);

		// 4. Hydrate Cache 2A (rewards - gidouilles + VIP cards)
		teacherCache.hydrateRewards(classId, students);

		// 5. Load warnings for current period (using cache API)
		// getStudentWarnings auto-fetches from API if cache miss/expired
		if (currentPeriodId) {
			await teacherCache.getStudentWarnings(classId, currentPeriodId);
			console.log(`[classHydration] ✅ Loaded warnings (period: ${currentPeriodId})`);
		}

		console.log(
			`[classHydration] ✅ Successfully hydrated all caches for class ${classId} (${students.length} students)`
		);
	} catch (error) {
		console.error('[classHydration] ❌ Error hydrating class data:', error);
		// Don't throw - allow partial hydration to succeed
	}
}

/**
 * Fetch students with rewards for a specific class
 *
 * Loads basic student info + gidouilles + VIP cards
 * Used to hydrate Cache 1 (students) and Cache 2A (rewards)
 *
 * @param classId - The class ID
 * @param supabase - Supabase client instance
 * @returns Promise resolving to array of students with rewards
 */
async function fetchClassStudentsWithRewards(
	classId: string,
	supabase: SupabaseClient<Database>
): Promise<StudentWithRewards[]> {
	const { data, error } = await supabase
		.from('class_members')
		.select(
			`
			profiles!inner (
				id,
				firstname,
				lastname,
				full_name,
				avatar_url,
				role,
				gender,
				is_test,
				gidouilles,
				vip_cards
			)
		`
		)
		.eq('class_id', classId);

	if (error) {
		console.error('[fetchClassStudentsWithRewards] Error:', error);
		throw new Error(`Failed to fetch students for class ${classId}: ${error.message}`);
	}

	// Transform the nested structure to flat array
	return (
		data?.map((member) => {
			const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
			if (!profile) return null;

			return {
				id: profile.id,
				firstname: profile.firstname || null,
				lastname: profile.lastname || null,
				full_name: profile.full_name || null,
				avatar_url: profile.avatar_url || null,
				role: profile.role || null,
				gender: profile.gender || null,
				is_test: profile.is_test || false,
				gidouilles: profile.gidouilles || 0,
				vip_cards: (profile.vip_cards as StudentVipCards) || {}
			};
		})
			.filter((s): s is StudentWithRewards => s !== null) || []
	);
}

