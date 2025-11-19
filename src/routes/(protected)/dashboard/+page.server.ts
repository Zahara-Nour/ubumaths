/**
 * Dashboard Main Page Server Load Function
 * ==========================================
 *
 * This is the server load function for the /dashboard route.
 * It inherits authentication and profile data from the parent layout.
 *
 * ROLE-BASED DASHBOARD PATTERN:
 * ------------------------------
 * This page doesn't enforce specific roles - instead, it passes the profile
 * to the client component (+page.svelte), which renders different dashboard
 * views based on the user's role:
 *
 * - role === 'student'  → Renders StudentDashboard.svelte
 * - role === 'teacher'  → Renders TeacherDashboard.svelte
 * - role === 'admin'    → Renders AdminDashboard.svelte
 *
 * AUTHENTICATION:
 * ---------------
 * Access control is handled by the parent layout (+layout.server.ts).
 * By the time this function runs, we're guaranteed:
 * - User is authenticated (redirected to /login if not)
 * - Profile exists in the database
 * - Profile contains a valid role
 *
 * DATA INHERITANCE:
 * -----------------
 * We use `await parent()` to get data from +layout.server.ts.
 * This is efficient because:
 * - No duplicate database queries
 * - Profile is already fetched and verified
 * - SvelteKit automatically deduplicates parent() calls
 *
 * WHY NOT ENFORCE ROLE HERE:
 * --------------------------
 * We could use `requireRole(profile, ['student', 'teacher', 'admin'])`,
 * but that's redundant since all three roles should access /dashboard.
 * Instead, we let the client component handle role-based rendering.
 *
 * For routes that SHOULD restrict by role (e.g., /dashboard/admin),
 * those would use requireRole() in their +page.server.ts.
 */

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Get profile from locals (loaded in hooks.server.ts)
	// This contains the user's role which determines the dashboard view
	const { profile, supabase } = locals;

	// TypeScript safety: profile is guaranteed by (protected) layout
	if (!profile) {
		throw new Error('Profile missing - this should never happen after auth check');
	}

	// For teachers, fetch academic periods (needed for StudentQuickActionsTable)
	let academicPeriods: Array<{
		id: string;
		name: string;
		start_date: string;
		end_date: string;
		school_year_id: string;
		period_order: number;
		type: string;
		color: string;
	}> = [];

	// For students, fetch additional stats for rewards block and recent exercises
	let riddlesSolved = 0;
	let recentExercises: Array<{
		id: string;
		title: string | null;
		tags: string[] | null;
		difficulty: string | null;
		distribution_mode: string | null;
		exercise_assignments?: Array<{
			id: string;
			optional_deadline: string | null;
			notes: string | null;
			assigned_at: string;
		}> | null;
		exercise_completions?: Array<{
			completed_at: string | null;
			last_viewed_at: string;
			view_count: number;
		}> | null;
	}> = [];

	if (profile.role === 'teacher' && profile.school_id) {
		// Fetch academic periods for the teacher's school
		// Used by StudentQuickActionsTable to determine current period for warnings
		// Strategy: Get current school year first, then fetch its periods
		const { data: schoolYear } = await supabase
			.from('school_years')
			.select('id')
			.eq('school_id', profile.school_id)
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (schoolYear) {
			const { data: periods } = await supabase
				.from('academic_periods')
				.select('id, name, start_date, end_date, school_year_id, period_order, type, color')
				.eq('school_year_id', schoolYear.id)
				.order('start_date', { ascending: false });

			academicPeriods = (periods || []) as typeof academicPeriods;
		}
	}

	if (profile.role === 'student') {
		// Execute queries in parallel for better performance
		const [riddleCount, exercisesData, achievementsData] = await Promise.all([
			// Get count of successfully solved riddles
			supabase
				.from('riddle_attempts')
				.select('*', { count: 'exact', head: true })
				.eq('student_id', profile.id)
				.eq('is_correct', true),
			// Get recent assigned exercises (up to 5, sorted by deadline)
			supabase
				.from('exercises')
				.select(
					`
				id,
				title,
				tags,
				difficulty,
				distribution_mode,
				exercise_assignments!inner(
					id,
					optional_deadline,
					notes,
					assigned_at
				),
				exercise_completions(
					completed_at,
					last_viewed_at
				)
			`
				)
				.or(
					`exercise_assignments.student_id.eq.${profile.id},exercise_assignments.assigned_to_type.eq.public`
				)
				.eq('exercise_assignments.is_active', true)
				.limit(5)
				.order('exercise_assignments.optional_deadline', { ascending: true, nullsFirst: false }),
			// Get student Minesweeper achievements
			supabase
				.from('student_achievements')
				.select(
					`
					id,
					achievement_id,
					unlocked_at,
					game_achievements (
						id,
						name,
						description,
						icon,
						difficulty,
						game_id
					)
				`
				)
				.eq('student_id', profile.id)
				.order('unlocked_at', { ascending: false })
		]);

		riddlesSolved = riddleCount.count || 0;
		recentExercises = (exercisesData.data || []) as typeof recentExercises;

		// Transform and flatten achievements data
		type AchievementRow = {
			id: string;
			achievement_id: string;
			unlocked_at: string;
			game_achievements: {
				id: string;
				name: string;
				description: string;
				icon: string;
				difficulty: string | null;
				game_id: string;
			};
		};

		const minesweeperAchievements =
			(achievementsData.data as AchievementRow[] | null)?.map((a) => ({
				id: a.id,
				achievement_id: a.achievement_id,
				name: a.game_achievements.name,
				description: a.game_achievements.description,
				icon: a.game_achievements.icon,
				difficulty: a.game_achievements.difficulty,
				unlocked_at: a.unlocked_at,
				game_id: a.game_achievements.game_id
			})) || [];

		// Calculate achievement stats
		const totalUnlocked = minesweeperAchievements.length;
		const totalPossible = 10; // Total number of Minesweeper achievements

		const achievementStats = {
			total_unlocked: totalUnlocked,
			total_possible: totalPossible,
			progress_percentage: totalPossible > 0 ? Math.round((totalUnlocked / totalPossible) * 100) : 0
		};

		// Return profile to the client component
		// +page.svelte will use profile.role to render the correct dashboard
		return {
			profile,
			riddlesSolved,
			recentExercises,
			academicPeriods,
			minesweeperAchievements,
			achievementStats
		};
	}

	// Return profile to the client component (for non-student roles)
	// +page.svelte will use profile.role to render the correct dashboard
	return {
		profile,
		riddlesSolved,
		recentExercises,
		academicPeriods,
		minesweeperAchievements: null,
		achievementStats: null
	};
};
