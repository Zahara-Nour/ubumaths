/**
 * Corrigés : l'allure de la fiche (retours de David sur le rendu, D6)
 * ==================================================================
 *
 * - Corrigé et Réponses (gabarits du style « Fiche élève », ADR 0028 lot 2) :
 *   deux colonnes et numéros en carré coloré (habillage `badge` du rendu
 *   commun), bandeau et avertissement en tête, pleine largeur. Fiche sans
 *   gabarit : la fiche du style par défaut, « Fiche élève » (D7).
 * - Corrigé de classe d'une affectation individualisée (et aperçu vue prof
 *   individualisé) : ni numéro ni carré, le titre seul ; sans titre,
 *   « Exercice sans titre » (« Untitled exercise »).
 */
import { describe, expect, it } from 'vitest';
import { generateWorksheetTypst } from '../worksheet-generator';
import { DEFAULT_TEMPLATES } from '../../templates/default-templates';
import { exerciseBadge } from '../../worksheet-palette';
import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

const NOTICE = 'Chaque élève a sa propre version : consulte ta correction personnelle.';
const TWO_COLUMNS = /columns(\(|:\s*)2/;

const WORKSHEET = {
	id: 'w-1',
	title: 'Fiche test',
	description: null,
	type: 'worksheet',
	config: {},
	template_id: null,
	estimated_duration_minutes: null,
	total_points: null
} as unknown as WorksheetRow;

const INSTANCE: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Dériver un polynôme',
			position: 1,
			parameters: {},
			statement: 'ENONCE1',
			solution: 'CORRECTION1'
		},
		{
			exercise_id: 'ex-2',
			title: null,
			position: 2,
			parameters: {},
			statement: 'ENONCE2',
			solution: 'CORRECTION2'
		}
	]
};

function template(content: string): WorksheetTemplateRow {
	return {
		id: 't',
		name: 'T',
		description: null,
		template_content: content,
		placeholders: [],
		created_by: 'prof',
		created_at: '',
		updated_at: ''
	} as WorksheetTemplateRow;
}

function teacher(
	mode: 'worksheet' | 'answers' | 'correction',
	options: { notice?: boolean; config?: WorksheetConfig; templateContent?: string } = {}
): string {
	return generateWorksheetTypst({
		worksheet: WORKSHEET,
		instance: INSTANCE,
		config: options.config ?? {},
		mode,
		template: options.templateContent ? template(options.templateContent) : null,
		individualCopyNotice: options.notice
	});
}

const LAYOUTS: Array<[string, string | undefined]> = [
	['sans modèle', undefined],
	...DEFAULT_TEMPLATES.map((t): [string, string] => [t.name, t.template_content])
];

describe('corrigés : l’allure de la fiche', () => {
	it.each(['correction', 'answers'] as const)(
		'%s : deux colonnes, numéros en carré coloré, plus « Exercice N : »',
		(mode) => {
			const typst = teacher(mode);
			expect(typst).toMatch(TWO_COLUMNS);
			expect(typst).toContain(exerciseBadge('1'));
			expect(typst).toContain(exerciseBadge('2'));
			expect(typst).not.toMatch(/Exercice 1 :/);
			expect(typst).toContain('Dériver un polynôme');
		}
	);

	it('bandeau et avertissement en tête, pleine largeur (au-dessus des colonnes)', () => {
		const typst = teacher('correction', { notice: true });
		// `scope: "parent"` : le bloc flotte au-dessus des deux colonnes de la page
		const fullWidthAt = typst.indexOf('scope: "parent"');
		expect(fullWidthAt).toBeGreaterThan(-1);
		expect(typst.indexOf('CORRECTION]')).toBeGreaterThan(fullWidthAt);
		expect(typst.indexOf(NOTICE)).toBeGreaterThan(typst.indexOf('CORRECTION]'));
		expect(typst.indexOf(NOTICE)).toBeLessThan(typst.indexOf('Dériver un polynôme'));
	});

	it('fiche sans gabarit : celle de « Fiche élève », deux colonnes, numéros en carré (D7)', () => {
		const typst = teacher('worksheet');
		expect(typst).toMatch(TWO_COLUMNS);
		expect(typst).toContain(exerciseBadge('1'));
		expect(typst).not.toMatch(/Exercice 1 :/);
	});
});

describe('corrigé de classe individualisé : le titre seul', () => {
	it.each(LAYOUTS)('« %s » : ni numéro ni carré, titres seuls', (_name, content) => {
		const typst = teacher('correction', { notice: true, templateContent: content });
		expect(typst).not.toContain(exerciseBadge('1'));
		expect(typst).not.toContain(exerciseBadge('2'));
		expect(typst).not.toMatch(/Exercice [12]\b/);
		expect(typst).toContain('Dériver un polynôme');
		expect(typst).toContain('Exercice sans titre');
	});

	it('fiche en anglais : « Untitled exercise »', () => {
		const typst = teacher('correction', { notice: true, config: { language: 'en' } });
		expect(typst).toContain('Untitled exercise');
		expect(typst).not.toMatch(/Exercise [12]\b/);
	});

	it('affectation commune : numéros en carré, comme la fiche', () => {
		expect(teacher('correction')).toContain(exerciseBadge('1'));
	});
});

describe('PDF de l’aperçu vue prof (générateur élève)', () => {
	const view = {
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		language: 'fr',
		instructions: null,
		show_corrections: true,
		sections: [],
		exercises: INSTANCE.exercises.map((e, i) => ({
			id: `we-${i + 1}`,
			exercise_id: e.exercise_id,
			title: e.title,
			position: e.position,
			section_id: null,
			points: null,
			is_essential: false,
			custom_instructions: null,
			statement: e.statement,
			correction: e.solution,
			correction_visible: true
		}))
	} as unknown as StudentWorksheetView;

	it('individualisé : deux colonnes, ni numéro ni carré, titre seul ou « Exercice sans titre »', () => {
		const typst = generateStudentWorksheetTypst(view, 'correction', { individualCopyNotice: true });
		expect(typst).toMatch(TWO_COLUMNS);
		expect(typst).not.toContain(exerciseBadge('1'));
		expect(typst).not.toContain(exerciseBadge('2'));
		expect(typst).toContain('Dériver un polynôme');
		expect(typst).toContain('Exercice sans titre');
	});

	it('commun : numéros en carré, comme avant', () => {
		const typst = generateStudentWorksheetTypst(view, 'correction');
		expect(typst).toMatch(TWO_COLUMNS);
		expect(typst).toContain(exerciseBadge('1'));
		expect(typst).not.toContain('Exercice sans titre');
	});
});
