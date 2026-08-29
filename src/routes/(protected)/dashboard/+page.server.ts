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
import { getStudentWorkInbox } from '$lib/server/student-inbox';
import type { StudentWorkInbox } from '$lib/types/student-inbox';

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

	// Resolve school_id: use profile.school_id, or for students fallback to their class's school
	let schoolId = profile.school_id;
	if (!schoolId && profile.role === 'student') {
		const { data: membership } = await supabase
			.from('class_members')
			.select('classes(school_id)')
			.eq('student_id', profile.id)
			.limit(1)
			.maybeSingle();
		schoolId = (membership?.classes as unknown as { school_id: string | null })?.school_id ?? null;
	}

	if ((profile.role === 'teacher' || profile.role === 'student') && schoolId) {
		// Fetch current school year for academic periods
		const { data: schoolYearData } = await supabase
			.from('school_years')
			.select('id')
			.eq('school_id', schoolId)
			.order('start_date', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (schoolYearData) {
			const { data: periods } = await supabase
				.from('academic_periods')
				.select('id, name, start_date, end_date, school_year_id, period_order, type, color')
				.eq('school_year_id', schoolYearData.id)
				.order('start_date', { ascending: false });

			academicPeriods = (periods || []) as typeof academicPeriods;
		}
	}

	// Default competences summary (overwritten for students below)
	let competencesSummary: {
		objectives: {
			mastery: number;
			atteint: number;
			en_cours: number;
			total: number;
			remediation: number;
		};
		competences: {
			tres_bonne: number;
			satisfaisante: number;
			fragile: number;
			insuffisante: number;
			with_data: number;
			total: number;
		};
	} | null = null;

	if (profile.role === 'student') {
		// Execute queries in parallel for better performance
		const [riddleCount, exercisesData, achievementsData, inbox, objectivesState, competenceLevels] =
			await Promise.all([
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
					.order('unlocked_at', { ascending: false }),
				// Fetch unified work inbox (aggregates all 4 assignment sources)
				getStudentWorkInbox(supabase, profile.id),
				// Phase 6 widget — état des objectifs (points de programme acquis)
				supabase
					.from('student_point_state_v')
					.select(
						'point_id, is_acquired, needs_remediation, curriculum_points!inner(objective_id, rang)'
					)
					.eq('student_id', profile.id),
				// Phase 6 widget — niveaux des 6 compétences math (famille B)
				supabase
					.from('student_competence_level')
					.select('math_competence_id, niveau, task_count')
					.eq('student_id', profile.id)
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

		// Phase 6 — Agréger les états en stats par objectif (niveau atteint = max rang acquis)
		type StateRow = {
			point_id: string | null;
			is_acquired: boolean | null;
			needs_remediation: boolean | null;
			curriculum_points:
				| { objective_id: string; rang: number | null }
				| { objective_id: string; rang: number | null }[]
				| null;
		};
		const rangMaxByObjective = new Map<string, number>();
		const remediationObjectives = new Set<string>();
		for (const row of (objectivesState.data ?? []) as StateRow[]) {
			const sk = Array.isArray(row.curriculum_points)
				? row.curriculum_points[0]
				: row.curriculum_points;
			const objId = sk?.objective_id;
			if (!objId) continue;
			if (row.is_acquired) {
				const r = sk?.rang ?? 0;
				const cur = rangMaxByObjective.get(objId) ?? 0;
				if (r > cur) rangMaxByObjective.set(objId, r);
			}
			if (row.needs_remediation) {
				remediationObjectives.add(objId);
			}
		}

		// Le total d'objectifs 6ᵉ pour la barre de progression
		const TOTAL_OBJECTIVES_6E = 18;
		let mastery = 0,
			atteint = 0,
			en_cours = 0;
		for (const rang of rangMaxByObjective.values()) {
			if (rang === 4) mastery += 1;
			else if (rang === 3) atteint += 1;
			else if (rang >= 1) en_cours += 1;
		}

		// Phase 6 — Agréger les niveaux par compétence math
		let tres_bonne = 0,
			satisfaisante = 0,
			fragile = 0,
			insuffisante = 0,
			with_data = 0;
		for (const row of competenceLevels.data ?? []) {
			if (!row.niveau) continue;
			with_data += 1;
			if (row.niveau === 'tres_bonne') tres_bonne += 1;
			else if (row.niveau === 'satisfaisante') satisfaisante += 1;
			else if (row.niveau === 'fragile') fragile += 1;
			else insuffisante += 1;
		}

		competencesSummary = {
			objectives: {
				mastery,
				atteint,
				en_cours,
				total: TOTAL_OBJECTIVES_6E,
				remediation: remediationObjectives.size
			},
			competences: {
				tres_bonne,
				satisfaisante,
				fragile,
				insuffisante,
				with_data,
				total: 6
			}
		};

		// Return profile to the client component
		// +page.svelte will use profile.role to render the correct dashboard
		return {
			profile,
			riddlesSolved,
			recentExercises,
			academicPeriods,
			minesweeperAchievements,
			achievementStats,
			inbox,
			competencesSummary
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
		achievementStats: null,
		inbox: null as StudentWorkInbox | null
	};
};
