/**
 * Mathoux des élèves, par classe (vue du professeur)
 * ==================================================
 *
 * Une carte par classe active ; par élève, « 7 Mathoux, dont 2 grands matous »,
 * lus dans la MÉMOIRE seule (`loadMathouxCountsByStudent`) : le calcul complet
 * coûterait une quarantaine de requêtes par élève. Les siestes et le détail sont
 * sur la Chatterie de l'élève (`/dashboard/teacher/students/[id]/chatterie`).
 *
 * Aucune entrée client. Lu au client du prof (RLS). Une lecture en échec rend
 * `unavailable` : des zéros se liraient « aucun Mathou ».
 *
 * Phase 0 : docs/wip/mathoux-prof-progress.md · doc : docs/systeme/mathoux.md
 */

import type { PageServerLoad } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import { loadMathouxCountsByStudent } from '$lib/server/mathoux/teacher';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/gamification/mathoux/+page.server'
);

export interface StudentMathouxRow {
	studentId: string;
	fullName: string;
	born: number;
	grandMatous: number;
}

export interface ClassMathouxData {
	classId: string;
	className: string;
	students: StudentMathouxRow[];
}

export const load: PageServerLoad = async ({ locals }) => {
	await requireRole(locals, 'teacher');
	const supabase = locals.supabase;

	const { data: classes, error: classesError } = await supabase
		.from('classes')
		.select('id, name')
		.eq('is_active', true)
		.order('name');
	if (classesError) {
		logger.error('Classes illisibles :', classesError);
		return { classesData: [], unavailable: true };
	}
	if (!classes || classes.length === 0) return { classesData: [], unavailable: false };

	const { data: members, error: membersError } = await supabase
		.from('class_members')
		.select('class_id, student_id, profiles:student_id (full_name, firstname, lastname)')
		.in(
			'class_id',
			classes.map((c) => c.id)
		)
		.eq('status', 'active');
	if (membersError) {
		logger.error('Élèves illisibles :', membersError);
		return { classesData: [], unavailable: true };
	}

	let counts: Awaited<ReturnType<typeof loadMathouxCountsByStudent>>;
	try {
		counts = await loadMathouxCountsByStudent(supabase, [
			...new Set((members ?? []).map((m) => m.student_id))
		]);
	} catch (err) {
		logger.error('Mathoux illisibles :', err);
		return { classesData: [], unavailable: true };
	}

	const classesData: ClassMathouxData[] = classes.map((cls) => ({
		classId: cls.id,
		className: cls.name,
		students: (members ?? [])
			.filter((m) => m.class_id === cls.id)
			.map((m) => {
				const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
				const entry = counts.get(m.student_id) ?? { born: 0, grandMatous: 0 };
				return {
					studentId: m.student_id,
					fullName:
						profile?.full_name ||
						`${profile?.firstname || ''} ${profile?.lastname || ''}`.trim() ||
						'Inconnu',
					born: entry.born,
					grandMatous: entry.grandMatous
				};
			})
			.sort((a, b) => a.fullName.localeCompare(b.fullName, 'fr'))
	}));

	return { classesData, unavailable: false };
};
