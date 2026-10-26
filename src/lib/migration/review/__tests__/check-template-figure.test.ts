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
		const template = figureTemplate('n', { verifier: 'carre A ; B' });
		const [variation] = template.variations;
		if (!variation?.statement) throw new Error('fixture sans énoncé');
		variation.statement = templateMarkdown(
			variation.statement
				.replace('outils: droite', 'outils: segment')
				.replace('B = point(8, {{yb}})', 'B = point({{eval:4-n+1}}, 1)')
		);
		template.testSpecs = [];
		const report = checkTemplate(template, { instances: 10 });
		// n = 4 : B = (1, 1) = A
		expect(report.figures.failures.some((f) => f.errors[0].includes('au même endroit'))).toBe(true);
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
