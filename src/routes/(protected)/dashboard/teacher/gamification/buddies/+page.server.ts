/**
 * Teacher Buddies Page - Server Load
 * ====================================
 *
 * Loads buddy data for all students in the teacher's classes.
 * Provides aggregated stats and per-student details.
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '#lib/server/middleware/auth.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { displayedConstance, utcDay } from '#lib/utils/buddy-constance.ts';
import {
	fetchClassMembersWithBuddies,
	type ClassMemberWithBuddy
} from '#lib/server/buddy-class.ts';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/gamification/buddies/+page.server'
);

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
	/** Constance Royale affichée (semaines tenues d'affilée ; 0 si perdue ou ancienne série) */
	currentStreak: number;
	longestStreak: number;
	lastActivityDate: string | null;
}

export const load: PageServerLoad = async ({ locals }) => {
	await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	// Get teacher's classes
	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('is_active', true)
		.order('name');

	if (classesError || !classes) {
		logger.error('[buddies] Error fetching classes:', classesError);
		return { classesData: [] };
	}

	const classesData: ClassBuddyData[] = [];
	const today = utcDay();

	for (const cls of classes) {
		// Élèves et Palotins de la classe : une panne saute la classe, comme avant
		let members: ClassMemberWithBuddy[];
		try {
			members = await fetchClassMembersWithBuddies(supabase, cls.id);
		} catch (membersError) {
			logger.error(`[buddies] Error fetching members for class ${cls.id}:`, membersError);
			continue;
		}

		const students: StudentBuddyInfo[] = members.map((m) => {
			const profile = m.profiles;
			const buddy = m.student_buddies;
			return {
				studentId: m.student_id,
				fullName:
					profile?.full_name ||
					`${profile?.firstname || ''} ${profile?.lastname || ''}`.trim() ||
					'Inconnu',
				palotinType: buddy?.palotin_type ?? null,
				level: buddy?.level ?? 0,
				xp: buddy?.xp ?? 0,
				// Comme l'élève la voit : 0 pour une Constance perdue pas encore remise
				// à zéro, ou pour une ancienne série en jours
				currentStreak: buddy ? displayedConstance(buddy, today) : 0,
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
