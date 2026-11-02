/**
 * Vérification d'un modèle à case « figure » (bloc ```figure-a-completer) :
 * chaque tirage doit CONSTRUIRE la figure et y trouver les points de `verifier:`.
 *
 * Piège trouvé avec CP-058 (`docs/wip/geometrie-validation-progress.md` § 10) :
 * `eval:(y1 + y2)/2 + h/4` rend `\dfrac{13}{4}`, la figure ne se construit pas
 * (toute réponse de l'élève jugée fausse), et pourtant 200/200 tirages
 * « réussis » : les tirages ne regardaient pas la figure.
 */

import { describe, it, expect } from 'vitest';
import { checkTemplate, formatCheckReport } from '../check-template';
import type { QuestionTemplate } from '$lib/questions/types';
import { templateMarkdown } from '$lib/ubumark';
import { templatePublicationErrors } from '$lib/server/template-publication';

// ============================================================================
// FIXTURES
// ============================================================================

/**
 * « Trace la droite (AB) » ; `yb` = ordonnée de B, `verifier` = la vérification,
 * `extraLines` = lignes ajoutées à la figure
 */
function figureTemplate(
	yb: string,
	options: { verifier?: string; specY?: string; extraLines?: string[] } = {}
): QuestionTemplate {
	const verifier = options.verifier ?? 'droite_par A ; B';
	return {
		id: 'tmp',
		title: 'Tracer une droite',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					[
						'Trace la droite $(AB)$.',
						'',
						'```figure-a-completer',
						'fenetre: 0 ; 10 ; 0 ; 6',
						'outils: droite',
						`verifier: ${verifier}`,
						'---',
						'A = point(1, 1)',
						'B = point(8, {{yb}})',
						...(options.extraLines ?? []),
						'```'
					].join('\n')
				),
				variables: [
					{ name: 'n', expression: '2..4' },
					{ name: 'yb', expression: yb }
				]
			}
		],
		grades: ['CP'],
		theme: 'Géométrie',
		domain: 'Tracés',
		level: 1,
		testSpecs: [
			{
				description: 'la droite (AB)',
				variables: { n: '2', yb: options.specY ?? '2' },
				answers: [`droite(1;1;8;${options.specY ?? '2'})`],
				expected: { status: 'correct' }
			}
		]
	};
}

/** Le même modèle, figure retouchée (`[avant, après]`), sans spec */
function withFigure(template: QuestionTemplate, edits: [string, string][]): QuestionTemplate {
	const [variation] = template.variations;
	if (!variation?.statement) throw new Error('fixture sans énoncé');
	const statement = edits.reduce<string>(
		(text, [from, to]) => text.replace(from, to),
		variation.statement
	);
	return {
		...template,
		variations: [{ ...variation, statement: templateMarkdown(statement) }],
		testSpecs: []
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe('checkTemplate — case « figure » construite à chaque tirage', () => {
	it('figure qui se construit : importable, et le rapport compte les figures', () => {
		const report = checkTemplate(figureTemplate('n'), { instances: 10 });
		expect(report.reasons).toEqual([]);
		expect(report.passed).toBe(true);
		expect(report.figures).toEqual({ checked: 10, failures: [] });
		expect(formatCheckReport(report)).toContain('Figures construites : 10/10 tirages');
	});

	it('coordonnée en fraction LaTeX (eval:) : tirages en échec, NON importable', () => {
		// n/4 avec n = 2..4 : 1/2 et 3/4 rendent \dfrac, 4/4 rend 1
		const report = checkTemplate(figureTemplate('eval:n/4', { specY: '1' }), { instances: 10 });
		expect(report.figures.checked).toBe(10);
		expect(report.figures.failures.length).toBeGreaterThan(0);
		expect(report.figures.failures[0].errors[0]).toContain('ne se construit pas');
		expect(report.passed).toBe(false);
		expect(report.reasons.join(' ')).toContain('figure');
		expect(formatCheckReport(report)).toContain('❌');
	});

	it('point de `verifier:` sans position à certains tirages : NON importable', () => {
		// (AB) et (CD) parallèles quand n = 3 : leur intersection I n'existe pas
		const report = checkTemplate(
			figureTemplate('n', {
				verifier: 'droite_par A ; I',
				extraLines: [
					'C = point(1, 3)',
					'D = point(8, {{eval:2*n-1}})',
					'I = intersection(droite(A, B), droite(C, D))'
				]
			}),
			{ instances: 10 }
		);
		expect(report.specs.every((spec) => spec.passed)).toBe(true);
		expect(report.generation.failures).toEqual([]);
		expect(report.figures.failures.length).toBeGreaterThan(0);
		expect(report.figures.failures[0].errors[0]).toContain('le point I n’existe pas');
		expect(report.passed).toBe(false);
	});

	it('carré dont deux sommets donnés sont confondus : NON importable', () => {
		const template = withFigure(figureTemplate('n', { verifier: 'carre A ; B' }), [
			['outils: droite', 'outils: segment'],
			['B = point(8, {{yb}})', 'B = point({{eval:5-n}}, 1)']
		]);
		const report = checkTemplate(template, { instances: 10 });
		// n = 4 : B = (1, 1) = A
		expect(report.figures.failures.some((f) => f.errors[0].includes('au même endroit'))).toBe(true);
		expect(report.passed).toBe(false);
	});

	it('rectangle sans angle droit à certains tirages : NON importable', () => {
		const template = withFigure(figureTemplate('n', { verifier: 'rectangle A ; B ; C' }), [
			['outils: droite', 'outils: segment'],
			['B = point(8, {{yb}})', 'B = point(8, 1)\nC = point({{eval:n+5}}, 4)']
		]);
		const report = checkTemplate(template, { instances: 10 });
		// angle droit en B seulement si C = (8, 4), soit n = 3
		expect(report.figures.failures.some((f) => f.errors[0].includes('pas d’angle droit'))).toBe(
			true
		);
		expect(report.passed).toBe(false);
	});

	it('droite par deux points confondus à certains tirages : NON importable', () => {
		// n = 4 : B = (1, 1) = A, et toute droite par A passerait pour juste
		const template = withFigure(figureTemplate('n'), [
			['B = point(8, {{yb}})', 'B = point({{eval:5-n}}, 1)']
		]);
		const report = checkTemplate(template, { instances: 10 });
		expect(report.figures.failures.length).toBeGreaterThan(0);
		expect(report.figures.failures[0].errors[0]).toContain('A et B sont au même endroit');
		expect(report.passed).toBe(false);
	});

	it('figure mal écrite : refusée, sans faire planter la vérification', () => {
		const template = withFigure(figureTemplate('n'), [
			['B = point(8, {{yb}})', 'B = point(8, {{yb}}']
		]);
		const report = checkTemplate(template, { instances: 5 });
		expect(report.passed).toBe(false);
		expect(report.generation.failures.length + report.figures.failures.length).toBeGreaterThan(0);
	});

	it('publication : l’éditeur reçoit le détail de la figure, pas seulement le compte', () => {
		const errors = templatePublicationErrors(
			withFigure(figureTemplate('n'), [['B = point(8, {{yb}})', 'B = point({{eval:5-n}}, 1)']])
		);
		expect(errors.some((e) => /^Variation 1, tirage \d+ : .*au même endroit/.test(e))).toBe(true);
	});

	it('modèle sans case « figure » : rien à construire, rien au rapport', () => {
		const template: QuestionTemplate = {
			...figureTemplate('n'),
			variations: [
				{
					statement: templateMarkdown('Combien font $2+{{n}}$ ? $?$'),
					variables: [{ name: 'n', expression: '2..4' }],
					blanks: [{ expectedAnswer: '{{eval:2+n}}' }]
				}
			],
			testSpecs: [
				{
					description: '2+2',
					variables: { n: '2' },
					answers: ['4'],
					expected: { status: 'correct' }
				}
			]
		};
		const report = checkTemplate(template, { instances: 5 });
		expect(report.figures).toEqual({ checked: 0, failures: [] });
		expect(formatCheckReport(report)).not.toContain('Figures construites');
	});
});

/**
 * « Trace le symétrique du triangle par rapport à la droite d » (chantier
 * `controles-figure`, lot 1) : `xa` = abscisse de A ; image de A en 12 − xa
 */
function symmetryTemplate(xa: string): QuestionTemplate {
	return {
		id: 'tmp-sym',
		title: 'Tracer un symétrique',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					[
						'Trace le symétrique du triangle par rapport à la droite $d$.',
						'',
						'```figure-a-completer',
						'fenetre: 0 ; 12 ; 0 ; 8',
						'grille: 1',
						'verifier: symetrique par d',
						'---',
						'P = point(6, 0, visible=faux)',
						'Q = point(6, 8, visible=faux)',
						'd = droite(P, Q)',
						'A = point({{xa}}, 2)',
						'B = point(4, 2)',
						'C = point(4, 6)',
						'polygone(A, B, C)',
						'```'
					].join('\n')
				),
				variables: [{ name: 'xa', expression: xa }]
			}
		],
		grades: ['CM1'],
		theme: 'Géométrie',
		domain: 'Symétrie',
		level: 1,
		testSpecs: [
			{
				description: 'le symétrique',
				variables: { xa: '2' },
				answers: ['segment(10;2;8;2)|segment(8;2;8;6)|segment(8;6;10;2)'],
				expected: { status: 'correct' }
			},
			{
				description: 'la figure glissée (message : test d’écran figure-a-completer-symetrique)',
				variables: { xa: '2' },
				answers: ['segment(8;2;10;2)|segment(10;2;10;6)|segment(10;6;8;2)'],
				expected: { status: 'incorrect' }
			}
		]
	};
}

describe('checkTemplate — symétrique à tracer (`verifier: symetrique par d`)', () => {
	it('modèle juste : importable, specs jugées par le vrai juge', () => {
		const report = checkTemplate(symmetryTemplate('1..3'), { instances: 10 });
		expect(report.reasons).toEqual([]);
		expect(report.specs.every((spec) => spec.passed)).toBe(true);
		expect(report.passed).toBe(true);
	});

	it('image hors de la fenêtre à certains tirages : NON importable', () => {
		// xa = -1 : image en x = 13, hors de la fenêtre 0 ; 12
		const report = checkTemplate(symmetryTemplate('-1..2'), { instances: 20 });
		expect(report.figures.failures.some((f) => f.errors[0].includes('sort de la fenêtre'))).toBe(
			true
		);
		expect(report.passed).toBe(false);
	});
});

/** « Place le symétrique de A par rapport à d » ; `xa` = abscisse de A (axe x = 6) */
function pointTemplate(xa: string): QuestionTemplate {
	return {
		id: 'tmp',
		title: 'Placer le symétrique d’un point',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(
					[
						'Place le point $A’$, symétrique du point $A$ par rapport à la droite $d$.',
						'',
						'```figure-a-completer',
						'fenetre: 0 ; 12 ; 0 ; 8',
						'grille: 1',
						"verifier: point A' = symetrie(A, axe=d)",
						'---',
						'P = point(6, 0, visible=faux)',
						'Q = point(6, 8, visible=faux)',
						'd = droite(P, Q)',
						'A = point({{xa}}, 5)',
						'```'
					].join('\n')
				),
				variables: [{ name: 'xa', expression: xa }]
			}
		],
		grades: ['6'],
		theme: 'Géométrie',
		domain: 'Symétrie',
		level: 1,
		testSpecs: [
			{
				description: 'le symétrique',
				variables: { xa: '2' },
				answers: ['point(10;5)'],
				expected: { status: 'correct' }
			},
			{
				description: 'pas à la même distance',
				variables: { xa: '2' },
				answers: ['point(9;5)'],
				expected: { status: 'incorrect' }
			}
		]
	} as QuestionTemplate;
}

describe('checkTemplate — point à placer (`verifier: point A’ = …`)', () => {
	it('modèle juste : importable, specs jugées par le vrai juge', () => {
		const report = checkTemplate(pointTemplate('1..4'), { instances: 10 });
		expect(report.reasons).toEqual([]);
		expect(report.specs.every((spec) => spec.passed)).toBe(true);
		expect(report.passed).toBe(true);
	});

	it('A sur l’axe à certains tirages (rien à placer) : NON importable', () => {
		const report = checkTemplate(pointTemplate('4..6'), { instances: 30 });
		expect(report.figures.failures.some((f) => f.errors[0].includes('déjà dans la figure'))).toBe(
			true
		);
		expect(report.passed).toBe(false);
	});
});
