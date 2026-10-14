/**
 * Les destinataires d'une affectation de fiche, vus par le prof
 * ==============================================================
 *
 * L'aperçu « vue élève » et le corrigé de classe d'après la copie d'un élève
 * (D6) prennent la copie d'UN élève : il doit être destinataire de
 * l'affectation.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/worksheets/assignment-recipients');

/**
 * Cet élève est-il destinataire de l'affectation ? Nommément désigné, ou
 * membre ACTIF d'une classe visée. Lecture faite par le PROF (aperçu « vue
 * élève », corrigé de classe d'après la copie d'un élève) : il ne peut
 * prendre la copie que d'un élève à qui il a distribué la fiche.
 *
 * Une panne lève un 500 : un refus dû à la base ne doit pas se confondre avec
 * un refus mérité.
 */
export async function isStudentOfAssignment(
	supabase: SupabaseClient<Database>,
	assignmentId: string,
	studentId: string
): Promise<boolean> {
	const { data: individualAccess, error: individualAccessError } = await supabase
		.from('worksheet_assignment_students')
		.select('id')
		.eq('assignment_id', assignmentId)
		.eq('student_id', studentId)
		.maybeSingle();

	if (individualAccessError) {
		logger.error('Contrôle d’accès impossible :', individualAccessError);
		throw error(500, 'Impossible de vérifier l’accès');
	}
	if (individualAccess) return true;

	const { data: assignedClasses, error: assignedClassesError } = await supabase
		.from('worksheet_assignment_classes')
		.select('class_id')
		.eq('assignment_id', assignmentId);

	if (assignedClassesError) {
		logger.error('Contrôle d’accès impossible :', assignedClassesError);
		throw error(500, 'Impossible de vérifier l’accès');
	}
	if (!assignedClasses || assignedClasses.length === 0) return false;

	const { data: membership, error: membershipError } = await supabase
		.from('class_members')
		.select('id')
		.eq('student_id', studentId)
		.eq('status', 'active')
		.in(
			'class_id',
			assignedClasses.map((ac) => ac.class_id)
		)
		.limit(1)
		.maybeSingle();

	if (membershipError) {
		logger.error('Contrôle d’accès impossible :', membershipError);
		throw error(500, 'Impossible de vérifier l’accès');
	}
	return !!membership;
}
