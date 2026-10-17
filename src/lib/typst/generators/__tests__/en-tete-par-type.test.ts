/**
 * L'en-tête du PDF selon le type de fiche (ADR 0030, lot 1)
 *
 * Pour chaque type, ce que l'en-tête imprime ET n'imprime pas (nom, classe,
 * date à remplir, date de rendu, points, calculatrice, durée), en français et
 * en anglais, dans le style « Fiche élève » (par défaut) et le style
 * « Standard ». Le type l'emporte sur le style pour les points ; le corrigé
 * est toujours détaillé ; le cadre de réponse suit « réponses sur le sujet ».
 */
import { describe, it, expect } from 'vitest';
import { WorksheetGenerator } from '../worksheet-generator';
import { DEFAULT_TEMPLATE_IDS } from '../../templates/default-templates';
import { generateStudentWorksheetTypst } from '$lib/worksheets/student-worksheet-typst';
import type {
	InstanceData,
	StudentWorksheetView,
	WorksheetConfig,
	WorksheetRow,
	WorksheetType
} from '$lib/types/worksheets';
import type { ContentLocale } from '$lib/types/locale';

// =============================================================================
// Décor
// =============================================================================

const STYLES = [
	{ name: 'Fiche élève', id: null },
	{ name: 'Standard', id: DEFAULT_TEMPLATE_IDS.standard }
] as const;

function worksheetRow(
	type: WorksheetType,
	config: WorksheetConfig,
	styleId: string | null
): WorksheetRow {
	return {
		id: 'w',
		title: 'Équations',
		description: null,
		translations: null,
		type,
		config,
		status: 'published',
		version: 1,
		published_at: null,
		archived_at: null,
		template_id: null,
		style_id: styleId,
		estimated_duration_minutes: 55,
		total_points: null,
		grades: [],
		tags: [],
		created_by: 'u',
		school_id: null,
		created_at: '2026-10-15',
		updated_at: '2026-10-15'
	} as unknown as WorksheetRow;
}

const instance: InstanceData = {
	exercises: [
		{
			exercise_id: 'ex-1',
			title: 'Équation',
			position: 1,
			parameters: {},
			statement: 'Résoudre $2x+3=7$.',
			solution: 'On obtient $x=2$.',
			points: 3
		},
		{
			exercise_id: 'ex-2',
			title: 'Produit',
			position: 2,
			parameters: {},
			statement: 'Calculer $3 times 4$.',
			solution: '12',
			points: 4
		}
	]
} as InstanceData;

function teacherSheet(
	type: WorksheetType,
	config: WorksheetConfig,
	styleId: string | null,
	mode: 'worksheet' | 'answers' | 'correction' = 'worksheet'
): string {
	const generator = new WorksheetGenerator(config, undefined, { mode });
	return generator.generate({ worksheet: worksheetRow(type, config, styleId), instance })
		.typstContent;
}

/** Les mots de l'en-tête, dans la langue du document */
const WORDS: Record<
	ContentLocale,
	{
		name: string;
		class: string;
		date: string;
		dueDate: string;
		dueDateValue: string;
		calculatorForbidden: string;
		calculatorAllowed: string;
		duration: string;
		total: string;
	}
> = {
	fr: {
		name: '*Nom :*',
		class: '*Classe :*',
		date: '*Date :*',
		dueDate: '*À rendre pour le :*',
		dueDateValue: '12 novembre 2026',
		calculatorForbidden: 'La calculatrice est interdite.',
		calculatorAllowed: 'La calculatrice est autorisée.',
		duration: '*Durée :* 55',
		total: '*Total :* 7'
	},
	en: {
		name: '*Surname :*',
		class: '*Class :*',
		date: '*Date :*',
		dueDate: '*Due by :*',
		dueDateValue: 'November 12, 2026',
		calculatorForbidden: 'Calculators are not allowed.',
		calculatorAllowed: 'Calculators are allowed.',
		duration: '*Duration :* 55',
		total: '*Total :* 7'
	}
};

/** Points de l'exercice 1, dans sa pastille */
const EXERCISE_POINTS = '[3 pts]';

/** Le cadre de réponse unique (avant le lot 3) */
const ANSWER_BOX = 'dash: "dashed"';

// =============================================================================
// Ce que chaque type imprime
// =============================================================================

describe.each(STYLES)('style « $name »', ({ id: styleId }) => {
	describe.each(['fr', 'en'] as const)('langue %s', (locale) => {
		const words = WORDS[locale];
		const base: WorksheetConfig = { language: locale };

		it("fiche d'exercices : le titre seul, même avec des options d'un autre type", () => {
			const typst = teacherSheet(
				'worksheet',
				{
					...base,
					show_points: true,
					calculator: 'forbidden',
					answers_on_sheet: true,
					due_date: '2026-11-12'
				},
				styleId
			);
			expect(typst).toContain('Équations');
			for (const absent of [
				words.name,
				words.class,
				words.date,
				words.dueDate,
				words.calculatorForbidden,
				words.duration,
				words.total,
				EXERCISE_POINTS,
				ANSWER_BOX
			]) {
				expect(typst).not.toContain(absent);
			}
		});

		it("fiche d'exercices, option « Nom de l'élève » : le nom, sans classe ni date", () => {
			const typst = teacherSheet('worksheet', { ...base, show_student_name: true }, styleId);
			expect(typst).toContain(words.name);
			for (const absent of [words.class, words.date, words.dueDate, EXERCISE_POINTS]) {
				expect(typst).not.toContain(absent);
			}
		});

		it('évaluation écrite avec points, calculatrice interdite, réponses sur le sujet', () => {
			const typst = teacherSheet(
				'assessment',
				{ ...base, show_points: true, calculator: 'forbidden', answers_on_sheet: true },
				styleId
			);
			for (const present of [
				'Équations',
				words.name,
				words.class,
				words.date,
				words.calculatorForbidden,
				words.total,
				EXERCISE_POINTS,
				ANSWER_BOX
			]) {
				expect(typst).toContain(present);
			}
			for (const absent of [words.dueDate, words.duration, words.calculatorAllowed]) {
				expect(typst).not.toContain(absent);
			}
		});

		it('évaluation écrite sans points ni réponses sur le sujet, calculatrice autorisée', () => {
			const typst = teacherSheet(
				'assessment',
				{ ...base, show_points: false, calculator: 'allowed' },
				styleId
			);
			expect(typst).toContain(words.name);
			expect(typst).toContain(words.calculatorAllowed);
			for (const absent of [words.total, EXERCISE_POINTS, ANSWER_BOX, words.calculatorForbidden]) {
				expect(typst).not.toContain(absent);
			}
		});

		it('devoir maison : nom, classe, date de rendu ; rien d’autre', () => {
			const typst = teacherSheet(
				'homework',
				{ ...base, due_date: '2026-11-12', show_points: true, calculator: 'forbidden' },
				styleId
			);
			for (const present of [words.name, words.class, words.dueDate, words.dueDateValue]) {
				expect(typst).toContain(present);
			}
			for (const absent of [
				words.date,
				words.calculatorForbidden,
				words.duration,
				words.total,
				EXERCISE_POINTS,
				ANSWER_BOX
			]) {
				expect(typst).not.toContain(absent);
			}
		});

		it('examen blanc : points TOUJOURS (même décochés), durée, calculatrice', () => {
			const typst = teacherSheet(
				'exam',
				{ ...base, show_points: false, calculator: 'forbidden' },
				styleId
			);
			for (const present of [
				words.name,
				words.class,
				words.date,
				words.calculatorForbidden,
				words.duration,
				words.total,
				EXERCISE_POINTS
			]) {
				expect(typst).toContain(present);
			}
			for (const absent of [words.dueDate, ANSWER_BOX]) {
				expect(typst).not.toContain(absent);
			}
		});

		it('examen blanc, réponses sur le sujet : le cadre de réponse', () => {
			const typst = teacherSheet('exam', { ...base, answers_on_sheet: true }, styleId);
			expect(typst).toContain(ANSWER_BOX);
		});
	});
});

// =============================================================================
// Le type l'emporte sur le style ; le corrigé est toujours détaillé
// =============================================================================

describe('le type l’emporte', () => {
	it('« Fiche élève » imprime les points d’une évaluation écrite (ADR 0028 D8 remplacé)', () => {
		const typst = teacherSheet('assessment', { show_points: true }, null);
		expect(typst).toContain(EXERCISE_POINTS);
		expect(typst).toContain(WORDS.fr.total);
	});

	it('« Standard » n’imprime aucun point sur une fiche d’exercices', () => {
		const typst = teacherSheet('worksheet', { show_points: true }, DEFAULT_TEMPLATE_IDS.standard);
		expect(typst).not.toContain(EXERCISE_POINTS);
		expect(typst).not.toContain(WORDS.fr.total);
	});

	it('corrigé toujours détaillé, même si la config dit « concise »', () => {
		const solution = '> [!méthode] On isole la variable.\n\nOn obtient $x=2$.';
		// Ancienne clé, encore en base : plus lue
		const legacy = { correction_detail: 'concise' } as WorksheetConfig;
		const generator = new WorksheetGenerator(legacy, undefined, {
			mode: 'correction'
		});
		const typst = generator.generate({
			worksheet: worksheetRow('worksheet', legacy, null),
			instance: {
				exercises: [{ ...instance.exercises[0], solution }]
			} as InstanceData
		}).typstContent;
		expect(typst).toContain('isole');
	});
});

// =============================================================================
// PDF de l'élève : la même règle
// =============================================================================

function studentView(overrides: Partial<StudentWorksheetView>): StudentWorksheetView {
	return {
		assignment_id: 'a',
		worksheet_id: 'w',
		title: 'Équations',
		description: null,
		type: 'worksheet',
		instructions: null,
		available_from: null,
		closes_at: null,
		show_corrections: true,
		class_name: '4e B',
		read_only: false,
		sections: [],
		estimated_duration_minutes: 55,
		exercises: [
			{
				id: 'we-1',
				exercise_id: 'ex-1',
				title: 'Équation',
				position: 1,
				section_id: null,
				points: 3,
				is_essential: false,
				custom_instructions: null,
				statement: 'Résoudre $2x+3=7$.',
				correction: '> [!méthode] On isole la variable.\n\nOn obtient $x=2$.',
				correction_visible: true
			}
		],
		...overrides
	} as unknown as StudentWorksheetView;
}

describe('PDF de l’élève : même en-tête que celui du prof', () => {
	it('examen blanc : nom, classe de l’élève, date, durée, calculatrice, points', () => {
		const typst = generateStudentWorksheetTypst(
			studentView({ type: 'exam', calculator: 'forbidden' }),
			'none'
		);
		for (const present of [
			WORDS.fr.name,
			'*Classe :* #"4e B";',
			WORDS.fr.date,
			WORDS.fr.duration,
			WORDS.fr.calculatorForbidden,
			EXERCISE_POINTS
		]) {
			expect(typst).toContain(present);
		}
	});

	it('devoir maison en anglais : date de rendu, aucun point', () => {
		const typst = generateStudentWorksheetTypst(
			studentView({
				type: 'homework',
				language: 'en',
				due_date: '2026-11-12',
				show_points: true
			}),
			'none'
		);
		expect(typst).toContain(WORDS.en.dueDate);
		expect(typst).toContain(WORDS.en.dueDateValue);
		expect(typst).not.toContain(EXERCISE_POINTS);
		expect(typst).not.toContain(WORDS.en.date);
	});

	it("fiche d'exercices : ni nom ni points, corrigé détaillé", () => {
		const typst = generateStudentWorksheetTypst(studentView({ show_points: true }), 'correction');
		expect(typst).not.toContain(WORDS.fr.name);
		expect(typst).not.toContain(EXERCISE_POINTS);
		expect(typst).toContain('isole');
	});

	it("fiche d'exercices avec l'option « Nom de l'élève » : le nom seul, sans classe ni date", () => {
		const typst = generateStudentWorksheetTypst(studentView({ show_student_name: true }), 'none');
		expect(typst).toContain(WORDS.fr.name);
		expect(typst).not.toContain('*Classe :* #"4e B";');
		expect(typst).not.toContain(WORDS.fr.date);
	});
});

describe('Réponses et Corrigé : le titre seul', () => {
	const exam: WorksheetConfig = { calculator: 'forbidden' };
	for (const style of STYLES) {
		for (const mode of ['answers', 'correction'] as const) {
			it(`examen blanc, ${mode}, style ${style.name} : ni nom, ni date, ni calculatrice, ni total`, () => {
				const typst = teacherSheet('exam', exam, style.id, mode);
				expect(typst).toContain('Équations');
				for (const absent of [
					WORDS.fr.name,
					WORDS.fr.class,
					WORDS.fr.date,
					WORDS.fr.calculatorForbidden,
					WORDS.fr.duration,
					WORDS.fr.total
				]) {
					expect(typst).not.toContain(absent);
				}
			});
		}
	}

	it('devoir maison, corrigé : pas de date de rendu', () => {
		const typst = teacherSheet('homework', { due_date: '2026-11-12' }, null, 'correction');
		expect(typst).not.toContain(WORDS.fr.dueDate);
	});

	it('le sujet de l’examen garde son en-tête complet', () => {
		const typst = teacherSheet('exam', exam, null, 'worksheet');
		expect(typst).toContain(WORDS.fr.name);
		expect(typst).toContain(WORDS.fr.calculatorForbidden);
	});

	it('élève « avec corrigé » : le sujet puis le corrigé, donc l’en-tête du sujet', () => {
		const typst = generateStudentWorksheetTypst(
			studentView({ type: 'exam', calculator: 'forbidden' }),
			'correction'
		);
		expect(typst).toContain(WORDS.fr.name);
		expect(typst).toContain(WORDS.fr.calculatorForbidden);
	});
});
