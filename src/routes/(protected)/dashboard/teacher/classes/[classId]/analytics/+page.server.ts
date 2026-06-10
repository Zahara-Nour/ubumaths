/**
 * Analytics page — load class header + verify ownership.
 *
 * Les widgets fetchent leurs données via les endpoints `/api/teacher/...`
 * en client-side (lazy). On charge ici juste le nom de la classe pour le header.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';

export const load: PageServerLoad = async ({ params, locals }) => {
	const classId = params.classId;
	if (!/^[0-9a-f-]{36}$/i.test(classId)) {
		throw error(400, 'classId invalide');
	}

	const { classRow } = await requireTeacherOfClass(locals, classId);

	const { data: memberRows } = await locals.supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, first_name, last_name)')
		.eq('class_id', classId)
		.eq('status', 'active');

	type MemberRow = {
		student_id: string;
		profiles: { id: string; first_name: string | null; last_name: string | null } | null;
	};
	const students = ((memberRows ?? []) as unknown as MemberRow[])
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name:
				[m.profiles!.first_name, m.profiles!.last_name]
					.filter((x): x is string => !!x?.trim())
					.join(' ') || 'Élève sans nom'
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	const { data: themeRows } = await locals.supabase
		.from('skill_themes')
		.select('id, name, bo_reference')
		.order('display_order', { ascending: true });

	const themes = (themeRows ?? [])
		.filter((t) => t.bo_reference)
		.map((t) => ({ name: t.name, bo_reference: t.bo_reference as string }));

	// Compteur des flags anti-fraud non-résolus pour le badge de l'onglet Surveillance.
	let unresolvedFlagsCount = 0;
	const studentIds = students.map((s) => s.id);
	if (studentIds.length > 0) {
		const { count } = await locals.supabase
			.from('srs_anti_fraud_flags')
			.select('id', { count: 'exact', head: true })
			.in('student_id', studentIds)
			.eq('resolved', false);
		unresolvedFlagsCount = count ?? 0;
	}

	return {
		classId,
		className: classRow.name,
		grade: classRow.grade,
		students,
		themes,
		unresolvedFlagsCount
	};
};
