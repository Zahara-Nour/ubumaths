/**
 * Teacher Buddies Page - Server Load
 * ====================================
 *
 * Loads buddy data for all students in the teacher's classes.
 * Provides aggregated stats and per-student details.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';

export interface ClassBuddyData {
	classId: string;
	className: string;
	students: StudentBuddyInfo[];
	stats: {
		total: number;
		withBuddy: number;
		avgLevel: number;
		avgStreak: number;
		palotinDistribution: Record<string, number>;
	};
}

export interface StudentBuddyInfo {
	studentId: string;
	fullName: string;
	palotinType: string | null;
	level: number;
	xp: number;
	currentStreak: number;
	longestStreak: number;
	lastActivityDate: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Get teacher's classes
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('teacher_id', user.id)
		.eq('is_active', true)
		.order('name');

	if (classesError || !classes) {
		console.error('[buddies] Error fetching classes:', classesError);
		return { classesData: [] };
	}

	const classesData: ClassBuddyData[] = [];

	for (const cls of classes) {
		// Get students with their buddy data
		const { data: members, error: membersError } = await supabase
			.from('class_members')
			.select(
				`
				student_id,
				profiles:student_id (
					full_name,
					firstname,
					lastname
				),
				student_buddies:student_id (
					palotin_type,
					xp,
					level,
					current_streak,
					longest_streak,
					last_activity_date
				)
			`
			)
			.eq('class_id', cls.id)
			.eq('status', 'active');

		if (membersError) {
			console.error(`[buddies] Error fetching members for class ${cls.id}:`, membersError);
			continue;
		}

		const students: StudentBuddyInfo[] = (members || []).map((m) => {
			const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
			const buddy = Array.isArray(m.student_buddies) ? m.student_buddies[0] : m.student_buddies;
			return {
				studentId: m.student_id,
				fullName:
					profile?.full_name ||
					`${profile?.firstname || ''} ${profile?.lastname || ''}`.trim() ||
					'Inconnu',
				palotinType: buddy?.palotin_type ?? null,
				level: buddy?.level ?? 0,
				xp: buddy?.xp ?? 0,
				currentStreak: buddy?.current_streak ?? 0,
				longestStreak: buddy?.longest_streak ?? 0,
				lastActivityDate: buddy?.last_activity_date ?? null
			};
		});

		const withBuddy = students.filter((s) => s.palotinType !== null);
		const palotinDistribution: Record<string, number> = { giron: 0, pile: 0, cotice: 0 };
		for (const s of withBuddy) {
			if (s.palotinType) palotinDistribution[s.palotinType]++;
		}

		classesData.push({
			classId: cls.id,
			className: cls.name,
			students,
			stats: {
				total: students.length,
				withBuddy: withBuddy.length,
				avgLevel:
					withBuddy.length > 0
						? Math.round((withBuddy.reduce((sum, s) => sum + s.level, 0) / withBuddy.length) * 10) /
							10
						: 0,
				avgStreak:
					withBuddy.length > 0
						? Math.round(
								(withBuddy.reduce((sum, s) => sum + s.currentStreak, 0) / withBuddy.length) * 10
							) / 10
						: 0,
				palotinDistribution
			}
		});
	}

	return { classesData };
};
