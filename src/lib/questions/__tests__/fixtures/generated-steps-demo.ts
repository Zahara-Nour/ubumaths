/**
 * Mode B Generated Steps — Demo Fixtures
 * =======================================
 *
 * Two end-to-end demo templates illustrating Mode B :
 *
 * 1. **`additionGroupingDemo`** — CM2 arithmetic with grouping
 *    (`{{a}} + {{b}} * {{c}} + {{d}} * {{e}}`) ; the pedagogical-arithmetic
 *    pipeline emits a primaire walkthrough.
 *
 * 2. **`linearEquationDemo`** — 4e linear equation (`{{a}} * x + {{b}} = {{c}}`)
 *    ; the pedagogical-solve/linear pipeline emits the college-level resolution.
 *
 * Used by `generated-steps-demo.test.ts` to lock the rendered output via
 * snapshots, so any drift in the pedagogical pipelines surfaces immediately.
 *
 * @module questions/__tests__/fixtures/generated-steps-demo
 */

import type { QuestionTemplate } from '../../types';
import { templateMarkdown } from '$lib/ubumark';

/**
 * Demo question : `2 + 3 × 4 + 5 × 6 = ?` for primaire (CM2).
 *
 * Mode B declares an `arithmetic` correction. The pipeline emits
 * a `summarized` grouping step (multiplications → 12 + 30) and the final
 * addition (2 + 12 + 30 = 44). With `verbosity: 'detailed'`, an explanation
 * accompanies each step.
 */
export const additionGroupingDemo: QuestionTemplate = {
	id: 'demo-arithmetic-primaire',
	title: 'Addition avec groupement (CM2)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Calcule ${{a}} + {{b}} \\times {{c}} + {{d}} \\times {{e}} = ?$'
			),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'c', expression: '4' },
				{ name: 'd', expression: '5' },
				{ name: 'e', expression: '6' }
			],
			blanks: [{ expectedAnswer: '{{eval:a+b*c+d*e}}' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'arithmetic',
					expression: '{{a}}+{{b}}*{{c}}+{{d}}*{{e}}',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['CM2'],
	theme: 'Arithmétique',
	domain: 'Calcul mental',
	level: 1
};

/**
 * Demo question : `3x + 5 = 14` for collège (4e).
 *
 * Mode B declares a `linear-equation` correction. The pipeline emits the
 * college-level resolution : add/subtract one side, divide by coefficient,
 * read x = (14 - 5) / 3 = 3.
 */
export const linearEquationDemo: QuestionTemplate = {
	id: 'demo-linear-college',
	title: 'Équation linéaire simple (4e)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Résous ${{a}}x + {{b}} = {{c}}$ : $x = ?$'),
			variables: [
				{ name: 'a', expression: '3' },
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '14' }
			],
			blanks: [{ expectedAnswer: '{{eval:(c-b)/a}}' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'linear-equation',
					equation: '{{a}}*x+{{b}}={{c}}',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['4'],
	theme: 'Algèbre',
	domain: 'Équations',
	subdomain: 'Linéaires',
	level: 2
};
