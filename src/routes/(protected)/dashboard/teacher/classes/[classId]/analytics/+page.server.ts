/**
 * Analytics page — load class header + verify access (role-based: teacher only).
 *
 * Les widgets fetchent leurs données via les endpoints `/api/teacher/...`
 * en client-side (lazy). On charge ici juste le nom de la classe pour le header.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { getProgrammeTree } from '$lib/server/programme-tree';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger(
	'(protected)/dashboard/teacher/classes/[classId]/analytics/+page.server'
);

export const load: PageServerLoad = async ({ params, locals }) => {
	const classId = params.classId;
	if (!/^[0-9a-f-]{36}$/i.test(classId)) {
		throw error(400, 'classId invalide');
	}

	const { classRow } = await requireTeacherOfClass(locals, classId);

	const { data: memberRows, error: memberRowsError } = await locals.supabase
		.from('class_members')
		.select('student_id, profiles!class_members_student_id_fkey(id, firstname, lastname)')
		.eq('class_id', classId)
		.eq('status', 'active');

	// Cette liste borne la portée du classement. Vidée par une panne, elle
	// affiche un classement amputé sans le dire.
	if (memberRowsError) {
		logger.error('Périmètre illisible :', memberRowsError);
		throw error(500, 'Impossible de déterminer le périmètre');
	}

	type MemberRow = {
		student_id: string;
		profiles: { id: string; firstname: string | null; lastname: string | null } | null;
	};
	const students = ((memberRows ?? []) as unknown as MemberRow[])
		.filter((m) => m.profiles)
		.map((m) => ({
			id: m.student_id,
			display_name:
				[m.profiles!.firstname, m.profiles!.lastname]
					.filter((x): x is string => !!x?.trim())
					.join(' ') || 'Élève sans nom'
		}))
		.sort((a, b) => a.display_name.localeCompare(b.display_name, 'fr'));

	// Sélecteur de la courbe de rétention : les branches du programme du niveau
	// de la classe, dans l'ordre de l'arbre. Classe sans niveau → aucune.
	let branches: { id: string; name: string }[] = [];
	if (classRow.grade) {
		try {
			const tree = await getProgrammeTree(locals.supabase, classRow.grade);
			branches = tree.map((b) => ({ id: b.id, name: b.name }));
		} catch (e) {
			logger.error('Lecture impossible :', e);
			throw error(500, 'Impossible de charger les données');
		}
	}

	// Compteur des flags anti-fraud non-résolus pour le badge de l'onglet Surveillance.
	// null = compteur illisible : le badge le dit, au lieu d'afficher un 0 rassurant.
	let unresolvedFlagsCount: number | null = 0;
	const studentIds = students.map((s) => s.id);
	if (studentIds.length > 0) {
		const { count, error: flagsCountError } = await locals.supabase
			.from('srs_anti_fraud_flags')
			.select('id', { count: 'exact', head: true })
			.in('student_id', studentIds)
			.eq('resolved', false);
		if (flagsCountError) {
			logger.error('Compteur de signalements illisible :', flagsCountError);
			unresolvedFlagsCount = null;
		} else {
			unresolvedFlagsCount = count ?? 0;
		}
	}

	return {
		classId,
		className: classRow.name,
		grade: classRow.grade,
		students,
		branches,
		unresolvedFlagsCount
	};
};
