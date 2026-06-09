/**
 * Student Competence Math — detail
 * ================================
 *
 * Vue détail d'une compétence math : niveau du socle + transparence du
 * verdict (validated_observables + missing_for_next) + observables groupés
 * par sous-dimension A/B/C/D avec leur état acquis/non.
 *
 * Spec : docs/wip/skills-referentiel-design.md §6.1ter + §8
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { requireRole } from '$lib/server/middleware/auth';
import type {
	MathCompetenceCode,
	MathCompetenceLevel,
	MissingForNext,
	SubdimensionLetter,
	ValidatedObservables
} from '$lib/types/skills';

export interface ObservableState {
	skill_id: string;
	observable_code: string;
	name: string;
	is_acquis: boolean;
	count_plus: number;
	count_minus: number;
}

export interface SubdimensionWithObservables {
	letter: SubdimensionLetter;
	name: string;
	observables: ObservableState[];
}

export interface CompetenceDetailData {
	id: string;
	code: MathCompetenceCode;
	name: string;
	gloss_for_student: string;
	niveau: MathCompetenceLevel;
	validated_observables: ValidatedObservables;
	missing_for_next: MissingForNext;
	task_count: number;
	subdimensions: SubdimensionWithObservables[];
}

const VALID_CODES: MathCompetenceCode[] = [
	'chercher',
	'calculer',
	'raisonner',
	'communiquer',
	'modeliser',
	'representer'
];

export const load: PageServerLoad = async ({ locals, params }): Promise<CompetenceDetailData> => {
	const { user } = await requireRole(locals, 'student');

	const code = params.code as MathCompetenceCode;
	if (!VALID_CODES.includes(code)) throw error(404, 'Compétence inconnue');

	// 1. Compétence + sous-dimensions + observables
	const { data: comp, error: cErr } = await locals.supabase
		.from('math_competences')
		.select(
			`
				id, code, name, gloss_for_student,
				subdimensions:math_competence_subdimensions (
					letter, name, display_order,
					skills (id, observable_code, name, display_order)
				)
			`
		)
		.eq('code', code)
		.maybeSingle();

	if (cErr) throw error(500, `Erreur compétence : ${cErr.message}`);
	if (!comp) throw error(404, 'Compétence introuvable');

	// 2. État observables (consolidé) de l'élève
	const allSkillIds: string[] = [];
	for (const sd of comp.subdimensions ?? []) {
		for (const sk of sd.skills ?? []) {
			allSkillIds.push(sk.id);
		}
	}

	const { data: obsState } = await locals.supabase
		.from('student_observable_state')
		.select('skill_id, is_acquis, count_plus, count_minus')
		.eq('student_id', user.id)
		.in('skill_id', allSkillIds);

	const stateBySkill = new Map<
		string,
		{ is_acquis: boolean; count_plus: number; count_minus: number }
	>();
	for (const s of obsState ?? []) {
		if (s.skill_id) {
			stateBySkill.set(s.skill_id, {
				is_acquis: s.is_acquis ?? false,
				count_plus: s.count_plus ?? 0,
				count_minus: s.count_minus ?? 0
			});
		}
	}

	// 3. Verdict
	const { data: level } = await locals.supabase
		.from('student_competence_level')
		.select('niveau, validated_observables, missing_for_next, task_count')
		.eq('student_id', user.id)
		.eq('math_competence_id', comp.id)
		.maybeSingle();

	const subdimensions: SubdimensionWithObservables[] = (comp.subdimensions ?? [])
		.slice()
		.sort((a, b) => a.display_order - b.display_order)
		.map((sd) => ({
			letter: sd.letter as SubdimensionLetter,
			name: sd.name,
			observables: (sd.skills ?? [])
				.slice()
				.sort((a, b) => a.display_order - b.display_order)
				.map((sk) => {
					const st = stateBySkill.get(sk.id);
					return {
						skill_id: sk.id,
						observable_code: sk.observable_code ?? '?',
						name: sk.name,
						is_acquis: st?.is_acquis ?? false,
						count_plus: st?.count_plus ?? 0,
						count_minus: st?.count_minus ?? 0
					};
				})
		}));

	return {
		id: comp.id,
		code: comp.code as MathCompetenceCode,
		name: comp.name,
		gloss_for_student: comp.gloss_for_student,
		niveau: (level?.niveau as MathCompetenceLevel) ?? 'insuffisante',
		validated_observables: (level?.validated_observables ?? []) as ValidatedObservables,
		missing_for_next: (level?.missing_for_next ?? []) as MissingForNext,
		task_count: level?.task_count ?? 0,
		subdimensions
	};
};
