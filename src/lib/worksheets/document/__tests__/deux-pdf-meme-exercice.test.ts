/**
 * PDF du prof et PDF de l'élève : le même exercice (ADR 0028, lot 1)
 * ==================================================================
 *
 * Les deux générateurs passent par le même rendu d'exercice. Les écarts qui
 * existaient entre eux (titre en formule, langue, numérotation, « pt / pts »
 * de `documentLabels` pour toutes les mises en page,
 * opérateurs à limites, « Autres exercices », correction non écrite,
 * « afficher les points ») sont corrigés des deux côtés.
 */
import { describe, it, expect } from 'vitest';
import { generateWorksheetTypst } from '$lib/typst/generators/worksheet-generator';
import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
import { DEFAULT_TEMPLATES } from '$lib/typst/templates/default-templates';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

// ============================================================================
// FIXTURES : une même fiche, vue par le prof et par l'élève
// ============================================================================

interface FixtureExercise {
	title: string | null;
	statement: string;
	solution: string;
	answers?: string;
	points: number | null;
	section_id: string | null;
	position: number;
}

const SECTIONS = [
	{ id: 's2', title: 'Approfondir', instructions: null, position: 2 },
	{ id: 's1', title: 'Échauffement', instructions: 'Sans calculatrice.', position: 1 }
];

const EXERCISES: FixtureExercise[] = [
	{
		title: 'Dériver $f(x)=x^2$',
		statement: 'ENONCE1',
		solution: 'CORRIGE1',
		answers: 'REPONSE1',
		points: 2,
		section_id: 's2',
		position: 3
	},
	{
		title: 'Premier',
		statement: 'ENONCE2',
		solution: 'CORRIGE2',
		points: 1,
		section_id: 's1',
		position: 1
	},
	{
		title: 'Hors section',
		statement: 'ENONCE3',
		solution: '',
		answers: '',
		points: 3,
		section_id: null,
		position: 4
	}
];

function teacherInput(config: WorksheetConfig, exercises = EXERCISES, sections = SECTIONS) {
	const worksheet = {
		id: 'w',
		title: 'Fiche',
		description: null,
		type: 'worksheet',
		config,
		template_id: null,
		estimated_duration_minutes: null,
		total_points: null
	} as unknown as WorksheetRow;
	const instance: InstanceData = {
		exercises: exercises.map((e, i) => ({
			exercise_id: `ex-${i}`,
			position: e.position,
			section_id: e.section_id,
			parameters: {},
			statement: e.statement,
			solution: e.solution,
			answers: e.answers,
			title: e.title,
			points: e.points,
			custom_instructions: null
		})),
		sections: sections.length > 0 ? sections : undefined
	};
	return { worksheet, instance, config };
}

function studentView(
	config: WorksheetConfig,
	exercises = EXERCISES,
	sections = SECTIONS,
	visible = true
): StudentWorksheetView {
	return {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Fiche',
		language: config.language,
		correction_detail: config.correction_detail,
		numbering_style: config.numbering_style,
		show_points: config.show_points === true,
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: null,
		read_only: false,
		sections,
		exercises: exercises.map((e, i) => ({
			id: `we-${i}`,
			exercise_id: `ex-${i}`,
			position: e.position,
			points: e.points,
			custom_instructions: null,
			statement: e.statement,
			correction: visible ? e.solution || null : null,
			correction_visible: visible,
			answers: visible ? e.answers || null : null,
			section_id: e.section_id,
			title: e.title,
			is_essential: false
		}))
	};
}

function template(content: string): WorksheetTemplateRow {
	return {
		id: 't',
		name: 't',
		description: null,
		template_content: content,
		placeholders: [],
		created_by: 'prof',
		created_at: '',
		updated_at: ''
	};
}

const BADGE_TEMPLATE = DEFAULT_TEMPLATES.find((t) =>
	t.template_content.includes('{{exercises_badge}}')
);
const HEADING_TEMPLATE = DEFAULT_TEMPLATES.find((t) =>
	t.template_content.includes('{{exercises}}')
);

/** Les mises en page du prof : sans gabarit (« Fiche élève », D7), gabarit « Exercice N », gabarit à pastilles */
const TEACHER_LAYOUTS: Array<[string, WorksheetTemplateRow | null]> = [
	['sans gabarit', null],
	['gabarit « Exercice N »', template(HEADING_TEMPLATE!.template_content)],
	['gabarit à pastilles', template(BADGE_TEMPLATE!.template_content)]
];

const BASE_CONFIG: WorksheetConfig = { show_points: true, numbering_style: 'numeric' };

function teacher(
	mode: 'worksheet' | 'answers' | 'correction',
	config: WorksheetConfig = BASE_CONFIG,
	tpl: WorksheetTemplateRow | null = null,
	exercises = EXERCISES,
	sections = SECTIONS
): string {
	return generateWorksheetTypst({
		...teacherInput(config, exercises, sections),
		mode,
		template: tpl,
		correctionFonts: false
	});
}

function student(
	ending: 'none' | 'answers' | 'correction',
	config: WorksheetConfig = BASE_CONFIG,
	exercises = EXERCISES,
	sections = SECTIONS,
	visible = true,
	styleId: string | null = null
): string {
	// Lot 4b : le PDF de l'élève prend le gabarit du style de la fiche
	return generateStudentWorksheetTypst(
		{ ...studentView(config, exercises, sections, visible), style_id: styleId },
		ending,
		{ correctionFonts: false }
	);
}

// ============================================================================
// TITRE AVEC FORMULE
// ============================================================================

describe('titre d’exercice avec formule', () => {
	it.each(TEACHER_LAYOUTS)('prof (%s) : la formule du titre est rendue', (_n, tpl) => {
		const typst = teacher('worksheet', BASE_CONFIG, tpl);
		expect(typst).toContain('Dériver $');
		expect(typst).not.toContain('\\$f(x)');
	});

	it('élève : la formule du titre est rendue (inchangé)', () => {
		const typst = student('none');
		expect(typst).toContain('Dériver $');
		expect(typst).not.toContain('\\$f(x)');
	});
});

// ============================================================================
// LANGUE ET OPÉRATEURS À LIMITES (setup du prof)
// ============================================================================

describe('setup du prof', () => {
	it('fiche anglaise : lang "en"', () => {
		const typst = teacher('worksheet', { ...BASE_CONFIG, language: 'en' });
		expect(typst).toContain('lang: "en"');
		expect(typst).not.toContain('lang: "fr"');
	});

	it('fiche française : lang "fr" (inchangé)', () => {
		expect(teacher('worksheet')).toContain('lang: "fr"');
	});

	it.each(TEACHER_LAYOUTS)(
		'∑ et lim ont leurs bornes dessous (%s), comme dans le PDF élève',
		(_n, tpl) => {
			const typst = teacher('worksheet', BASE_CONFIG, tpl);
			for (const rule of [
				'#show math.sum: math.limits',
				'#let lim = math.op("lim", limits: true)',
				'#let max = math.op("max", limits: true)'
			]) {
				expect(typst).toContain(rule);
				expect(student('none')).toContain(rule);
			}
		}
	);
});

// ============================================================================
// NUMÉROTATION ET ORDRE
// ============================================================================

/** Les numéros des pastilles, dans l'ordre du document */
function badgeNumbers(typst: string): string[] {
	return [...typst.matchAll(/#text\(fill: white, weight: "bold"\)\[([^\]]+)\]/g)].map((m) => m[1]);
}

/** Les énoncés, dans l'ordre du document */
function statementOrder(typst: string): string[] {
	return [...typst.matchAll(/ENONCE\d/g)].map((m) => m[0]);
}

describe('ordre et numérotation', () => {
	const roman: WorksheetConfig = { ...BASE_CONFIG, numbering_style: 'roman' };

	it('élève : numérotation romaine, comme le prof', () => {
		const prof = teacher('worksheet', roman, template(BADGE_TEMPLATE!.template_content));
		const eleve = student('none', roman);
		expect(badgeNumbers(eleve)).toEqual(['I', 'II', 'III']);
		expect(badgeNumbers(eleve)).toEqual(badgeNumbers(prof));
	});

	it('même ordre des deux côtés : sections dans leur ordre, hors section à la fin', () => {
		const prof = teacher('worksheet', roman);
		const eleve = student('none', roman);
		expect(statementOrder(prof)).toEqual(['ENONCE2', 'ENONCE1', 'ENONCE3']);
		expect(statementOrder(eleve)).toEqual(statementOrder(prof));
	});

	it('prof : l’ordre tiré au sort (exercise_order) prime', () => {
		const input = teacherInput(BASE_CONFIG, EXERCISES, []);
		input.instance.exercise_order = [2, 0, 1];
		const typst = generateWorksheetTypst({ ...input, mode: 'worksheet' });
		expect(statementOrder(typst)).toEqual(['ENONCE3', 'ENONCE1', 'ENONCE2']);
	});
});

// ============================================================================
// POINTS
// ============================================================================

describe('points', () => {
	it('prof : « 1 pt », « 2 pts » (documentLabels, plus « pts » en dur)', () => {
		// Gabarit « Exercice N » : la case de la fiche décide (« Fiche élève » n'imprime aucun point)
		for (const language of ['fr', 'en'] as const) {
			const typst = teacher(
				'worksheet',
				{ ...BASE_CONFIG, language },
				template(HEADING_TEMPLATE!.template_content)
			);
			expect(typst).toContain(')[1 pt]');
			expect(typst).toContain(')[2 pts]');
			expect(typst).not.toContain('#pts pts');
		}
	});

	// Lot 4b : le PDF de l'élève suit le style, comme celui du prof (D8) :
	// « Fiche élève » n'imprime aucun point, un style à points suit la case
	it('élève, style à points : « pt » / « pts », les mots du prof', () => {
		const typst = student('none', BASE_CONFIG, EXERCISES, SECTIONS, true, HEADING_TEMPLATE!.id);
		expect(typst).toContain(')[2 pts]');
		expect(typst).toContain(')[1 pt]');
		expect(typst).not.toMatch(/\d points?\]/);
	});

	it('élève, fiche anglaise : les mots anglais du prof', () => {
		const typst = student(
			'none',
			{ ...BASE_CONFIG, language: 'en' },
			EXERCISES,
			SECTIONS,
			true,
			HEADING_TEMPLATE!.id
		);
		expect(typst).toContain(')[2 pts]');
	});

	it('élève, « Fiche élève » : aucun point (D8)', () => {
		expect(student('none')).not.toMatch(/\[\d pts?\]/);
	});

	it('« afficher les points » décoché : masqués des deux côtés', () => {
		const hidden: WorksheetConfig = { ...BASE_CONFIG, show_points: false };
		expect(student('none', hidden)).not.toMatch(/\[\d pts?\]/);
		for (const [, tpl] of TEACHER_LAYOUTS) {
			const typst = teacher('worksheet', hidden, tpl);
			expect(typst).not.toMatch(/\d pts?\]/);
			expect(typst).not.toMatch(/points-badge\(\[/);
		}
	});
});

// ============================================================================
// D4 : « AUTRES EXERCICES » ET CORRECTION NON ÉCRITE
// ============================================================================

describe('exercice hors section après des sections : « Autres exercices »', () => {
	it.each(TEACHER_LAYOUTS)('prof (%s)', (_n, tpl) => {
		const typst = teacher('worksheet', BASE_CONFIG, tpl);
		const others = typst.indexOf('Autres exercices');
		expect(others).toBeGreaterThan(typst.indexOf('ENONCE1'));
		expect(others).toBeLessThan(typst.indexOf('ENONCE3'));
	});

	it('prof, fiche anglaise : « Other exercises »', () => {
		expect(teacher('worksheet', { ...BASE_CONFIG, language: 'en' })).toContain('Other exercises');
	});

	it('élève', () => {
		const typst = student('none');
		const others = typst.indexOf('Autres exercices');
		expect(others).toBeGreaterThan(typst.indexOf('ENONCE1'));
		expect(others).toBeLessThan(typst.indexOf('ENONCE3'));
	});

	it('fiche sans section : pas de titre « Autres exercices »', () => {
		expect(teacher('worksheet', BASE_CONFIG, null, EXERCISES, [])).not.toContain(
			'Autres exercices'
		);
		expect(student('none', BASE_CONFIG, EXERCISES, [])).not.toContain('Autres exercices');
	});
});

describe('correction non écrite : « Exercice N : correction non écrite »', () => {
	it.each(TEACHER_LAYOUTS)('prof, corrigé (%s)', (_n, tpl) => {
		const typst = teacher('correction', BASE_CONFIG, tpl);
		expect(typst).toContain('#emph[Correction non écrite.]');
	});

	it('prof, réponses : ni réponses ni corrigé → correction non écrite', () => {
		const typst = teacher('answers');
		expect(typst).toContain('#emph[Correction non écrite.]');
		// L'exercice 2 a un corrigé : le renvoi au corrigé reste juste
		expect(typst).toContain('#emph[Réponses non rédigées : voir le corrigé.]');
	});

	it('élève, corrigé : l’exercice n’est plus omis', () => {
		const typst = student('correction');
		// La partie corrigé vient après le dernier énoncé
		const part = typst.slice(typst.indexOf('ENONCE3'));
		expect(part).toContain('#emph[Correction non écrite.]');
		expect(part).toContain('Hors section');
	});

	it('élève, réponses : ni réponses ni corrigé → correction non écrite', () => {
		const typst = student('answers');
		expect(typst.slice(typst.indexOf('ENONCE3'))).toContain('#emph[Correction non écrite.]');
	});

	it('fiche anglaise : en anglais', () => {
		const en: WorksheetConfig = { ...BASE_CONFIG, language: 'en' };
		expect(teacher('correction', en)).toContain('#emph[Solution not written.]');
		expect(student('correction', en)).toContain('#emph[Solution not written.]');
	});
});

// ============================================================================
// GARDE : CORRECTIONS NON VISIBLES
// ============================================================================

describe('corrections non visibles pour l’élève', () => {
	it.each(['none', 'answers', 'correction'] as const)(
		'jamais dans son PDF (%s), pas même « non écrite »',
		(ending) => {
			const typst = student(ending, BASE_CONFIG, EXERCISES, SECTIONS, false);
			expect(typst).not.toMatch(/CORRIGE\d|REPONSE\d/);
			expect(typst).not.toContain('Correction non écrite');
		}
	);

	it('une correction transmise par erreur avec correction_visible faux reste hors du PDF', () => {
		const view = studentView(BASE_CONFIG);
		view.exercises[0].correction_visible = false;
		const typst = generateStudentWorksheetTypst(view, 'correction');
		expect(typst).not.toContain('CORRIGE1');
		expect(typst).toContain('CORRIGE2');
	});
});

// ============================================================================
// TITRE : MÊMES FONCTIONS DÉCLARÉES ET MÊME SENS DE AB QUE L'ÉNONCÉ
// ============================================================================

describe('titre d’exercice : fonctions déclarées et sens de AB de l’exercice', () => {
	const withTitle = (
		title: string,
		generic_functions: string[] | null,
		statement = "Calculer ~C'(x)~."
	) => {
		const input = teacherInput(BASE_CONFIG, [EXERCISES[1]], []);
		input.instance.exercises[0] = {
			...input.instance.exercises[0],
			title,
			statement,
			generic_functions
		};
		const view = studentView(BASE_CONFIG, [EXERCISES[1]], []);
		view.exercises[0] = {
			...view.exercises[0],
			title,
			statement,
			generic_functions
		};
		return { input, view };
	};

	it.each(TEACHER_LAYOUTS)('prof (%s) : `~C’(x)~` sans erreur, comme l’énoncé', (_n, tpl) => {
		const { input } = withTitle("Coût marginal ~C'(x)~", ['C']);
		const typst = generateWorksheetTypst({ ...input, mode: 'worksheet', template: tpl });
		expect(typst).not.toContain('Unexpected token');
		// Le titre rend la formule comme l'énoncé
		expect(typst).toContain("Coût marginal $C'( x )$");
		expect(typst).toContain("Calculer $C'( x )$");
	});

	it('élève : `~C’(x)~` sans erreur, comme l’énoncé', () => {
		const { view } = withTitle("Coût marginal ~C'(x)~", ['C']);
		const typst = generateStudentWorksheetTypst(view, 'correction');
		expect(typst).not.toContain('Unexpected token');
		expect(typst).toContain("Coût marginal $C'( x )$");
	});

	it('sens de AB : le titre suit le sens de l’exercice, comme l’énoncé', () => {
		const formulas = (capitalPairs: 'length' | 'product') => {
			const { input } = withTitle("Le segment ~A'B'C~", null, "Calculer ~A'B'C~.");
			input.instance.exercises[0].capital_pairs = capitalPairs;
			const typst = generateWorksheetTypst({ ...input, mode: 'worksheet' });
			return {
				title: typst.match(/Le segment (\$[^$]*\$)/)?.[1],
				statement: typst.match(/Calculer (\$[^$]*\$)/)?.[1]
			};
		};
		const length = formulas('length');
		const product = formulas('product');
		expect(length.title).toBeDefined();
		expect(product.title).toBeDefined();
		// Chaque sens : le titre comme l'énoncé
		expect(length.title).toBe(length.statement);
		expect(product.title).toBe(product.statement);
		// Et les deux sens s'impriment différemment
		expect(length.title).not.toBe(product.title);
	});

	it('titre sans maths : texte simple', () => {
		const { input } = withTitle('Coût marginal', ['C']);
		const typst = generateWorksheetTypst({ ...input, mode: 'worksheet' });
		expect(typst).toContain('#text(weight: "bold")[Coût marginal]');
	});
});
