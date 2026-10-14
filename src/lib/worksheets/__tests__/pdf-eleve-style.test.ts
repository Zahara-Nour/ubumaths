/**
 * Le PDF de l'élève suit le style de la fiche (ADR 0028, lot 4b)
 * ==============================================================
 *
 * Spécification validée par David (2026-10-14) : le PDF de l'élève passe par
 * le générateur unique, avec le gabarit du style retenu (`style_id`, sinon
 * `template_id`, sinon « Fiche élève ») ; les corrections que l'élève n'a pas
 * le droit de voir n'y sont jamais, quel que soit le style ; style inconnu →
 * « Fiche élève », sans erreur. Ce que seul l'élève reçoit (consignes de
 * l'affectation, ★ des exercices indispensables, avertissement de la copie
 * individuelle) reste imprimé, dans tous les styles.
 */
import { describe, expect, it } from 'vitest';
import { generateStudentWorksheetTypst } from '../student-worksheet-typst';
import { DEFAULT_STYLE_ID, resolveTemplate } from '$lib/typst/templates/styles';
import { DEFAULT_TEMPLATE_IDS } from '$lib/typst/templates/default-templates';
import type { StudentWorksheetView, WorksheetTemplateRow } from '$lib/types/worksheets';

const STANDARD = DEFAULT_TEMPLATE_IDS.standard;
const PROF_STYLE = '6f1c2a4e-0000-4000-8000-00000000abcd';

function view(overrides: Partial<StudentWorksheetView> = {}): StudentWorksheetView {
	return {
		assignment_id: 'a-1',
		worksheet_id: 'w-1',
		title: 'Fractions',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: null,
		read_only: false,
		sections: [],
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Simplifier',
				position: 1,
				section_id: null,
				points: 3,
				is_essential: false,
				custom_instructions: null,
				statement: 'ENONCE-VISIBLE',
				correction: 'CORRECTION-VISIBLE',
				answers: 'REPONSE-VISIBLE',
				correction_visible: true
			},
			{
				id: 'we-2',
				exercise_id: 'ex-2',
				title: 'Comparer',
				position: 2,
				section_id: null,
				points: 2,
				is_essential: false,
				custom_instructions: null,
				statement: 'ENONCE-DEUX',
				// Arrivé par erreur : la correction n'est pas visible
				correction: 'CORRECTION-SECRETE',
				answers: 'REPONSE-SECRETE',
				correction_visible: false
			}
		],
		...overrides
	} as StudentWorksheetView;
}

function profTemplate(content: string): WorksheetTemplateRow {
	return {
		id: PROF_STYLE,
		name: 'Mes contrôles',
		description: null,
		template_content: content,
		placeholders: [],
		created_by: 'prof',
		style_id: PROF_STYLE,
		created_at: '',
		updated_at: ''
	};
}

/** Une ligne propre au gabarit « fiche » du style, absente de « Fiche élève » */
function signature(styleId: string): string {
	const own = resolveTemplate(styleId, 'worksheet').content.split('\n');
	const fallback = new Set(resolveTemplate(DEFAULT_STYLE_ID, 'worksheet').content.split('\n'));
	const line = own.find((l) => l.trim().length > 20 && !fallback.has(l));
	if (!line) throw new Error(`aucune ligne propre au style ${styleId}`);
	return line;
}

/** Une ligne propre à « Fiche élève » (son code commun), absente de « Standard » */
function studentStyleSignature(): string {
	const own = resolveTemplate(DEFAULT_STYLE_ID, 'worksheet').content.split('\n');
	const other = new Set(resolveTemplate(STANDARD, 'worksheet').content.split('\n'));
	const line = own.find((l) => l.trim().length > 20 && !other.has(l));
	if (!line) throw new Error('aucune ligne propre à « Fiche élève »');
	return line;
}

describe('le style du PDF de l’élève', () => {
	it('fiche sans style : « Fiche élève »', () => {
		expect(generateStudentWorksheetTypst(view(), 'none')).toContain(studentStyleSignature());
	});

	it('fiche en « Standard » : la fiche Standard', () => {
		const typst = generateStudentWorksheetTypst(view({ style_id: STANDARD }), 'none');
		expect(typst).toContain(signature(STANDARD));
		expect(typst).not.toContain(studentStyleSignature());
	});

	it('fiche d’avant le lot 3 : `template_id` désigne le style', () => {
		const typst = generateStudentWorksheetTypst(view({ template_id: STANDARD }), 'none');
		expect(typst).toContain(signature(STANDARD));
	});

	it('style du prof : sa mise en page', () => {
		const typst = generateStudentWorksheetTypst(
			view({ style_id: PROF_STYLE, template: profTemplate('// GABARIT-DU-PROF\n{{exercises}}') }),
			'none'
		);
		expect(typst).toContain('GABARIT-DU-PROF');
		expect(typst).toContain('ENONCE-VISIBLE');
	});

	it('style inconnu ou mise en page absente : « Fiche élève », sans erreur', () => {
		expect(generateStudentWorksheetTypst(view({ style_id: PROF_STYLE }), 'none')).toContain(
			studentStyleSignature()
		);
	});

	it('style de Chiphre : une mise en page reçue avec la fiche est ignorée', () => {
		const typst = generateStudentWorksheetTypst(
			view({ style_id: STANDARD, template: profTemplate('// COPIE-EN-BASE\n{{exercises}}') }),
			'none'
		);
		expect(typst).not.toContain('COPIE-EN-BASE');
		expect(typst).toContain(signature(STANDARD));
	});
});

describe('les corrections de l’élève', () => {
	for (const style of [null, STANDARD]) {
		for (const ending of ['answers', 'correction'] as const) {
			it(`${style ? 'Standard' : 'Fiche élève'}, ${ending} : les visibles, jamais les autres`, () => {
				const typst = generateStudentWorksheetTypst(view({ style_id: style }), ending);
				expect(typst).toContain(ending === 'answers' ? 'REPONSE-VISIBLE' : 'CORRECTION-VISIBLE');
				expect(typst).not.toContain('CORRECTION-SECRETE');
				expect(typst).not.toContain('REPONSE-SECRETE');
				// Pas d'en-tête vide pour l'exercice sans correction visible
				expect(typst.split('Comparer')).toHaveLength(2);
			});
		}
	}

	it('sans partie de fin : aucune correction', () => {
		const typst = generateStudentWorksheetTypst(view(), 'none');
		expect(typst).not.toContain('CORRECTION-VISIBLE');
		expect(typst).not.toContain('REPONSE-VISIBLE');
	});
});

describe('ce que seul l’élève reçoit, dans tous les styles', () => {
	for (const style of [null, STANDARD]) {
		const name = style ? 'Standard' : 'Fiche élève';

		it(`${name} : les consignes de l’affectation`, () => {
			const typst = generateStudentWorksheetTypst(
				view({ style_id: style, instructions: 'CONSIGNE-AFFECTATION' }),
				'none'
			);
			expect(typst).toContain('CONSIGNE-AFFECTATION');
		});

		it(`${name} : les consignes une seule fois`, () => {
			const typst = generateStudentWorksheetTypst(
				view({ style_id: style, instructions: 'CONSIGNE-AFFECTATION' }),
				'none'
			);
			expect(typst.split('CONSIGNE-AFFECTATION')).toHaveLength(2);
		});

		it(`${name} : l’étoile des exercices indispensables et sa légende`, () => {
			const v = view({ style_id: style });
			v.exercises[0].is_essential = true;
			const typst = generateStudentWorksheetTypst(v, 'none');
			expect(typst.split('★').length).toBeGreaterThanOrEqual(3);
		});

		it(`${name} : l’avertissement de la copie individuelle (vue prof)`, () => {
			const typst = generateStudentWorksheetTypst(view({ style_id: style }), 'none', {
				individualCopyNotice: true
			});
			expect(typst).toContain('Chaque élève a sa propre version');
		});
	}
});

describe('le cartouche du gabarit, comme le PDF du prof', () => {
	const EXAM = DEFAULT_TEMPLATE_IDS.exam;

	it('durée et total de la fiche imprimés', () => {
		const typst = generateStudentWorksheetTypst(
			view({ style_id: EXAM, show_points: true, total_points: 20, estimated_duration_minutes: 55 }),
			'none'
		);
		expect(typst).toContain('55');
		expect(typst).toContain('20');
	});

	it('date décochée par le prof : pas de date', () => {
		const shown = generateStudentWorksheetTypst(view({ style_id: STANDARD }), 'none');
		const hidden = generateStudentWorksheetTypst(
			view({ style_id: STANDARD, show_date: false }),
			'none'
		);
		const year = String(new Date().getFullYear());
		expect(shown).toContain(year);
		expect(hidden).not.toContain(year);
	});
});

describe('avec corrigé : les énoncés gardent le style de la fiche (David, 2026-10-14)', () => {
	for (const ending of ['answers', 'correction'] as const) {
		it(`Standard, ${ending} : énoncés en Standard, puis la partie de fin et son bandeau`, () => {
			const typst = generateStudentWorksheetTypst(view({ style_id: STANDARD }), ending);
			expect(typst).toContain(signature(STANDARD));
			expect(typst).not.toContain(studentStyleSignature());
			const end = typst.slice(typst.indexOf('#pagebreak()'));
			expect(end).toContain(ending === 'answers' ? '[RÉPONSES]' : '[CORRECTION]');
			expect(end).toContain(ending === 'answers' ? 'REPONSE-VISIBLE' : 'CORRECTION-VISIBLE');
		});
	}

	it('style du prof, corrigé : sa mise en page, puis le corrigé', () => {
		const typst = generateStudentWorksheetTypst(
			view({ style_id: PROF_STYLE, template: profTemplate('// GABARIT-DU-PROF\n{{exercises}}') }),
			'correction'
		);
		expect(typst).toContain('GABARIT-DU-PROF');
		expect(typst.slice(typst.indexOf('#pagebreak()'))).toContain('CORRECTION-VISIBLE');
	});
});
