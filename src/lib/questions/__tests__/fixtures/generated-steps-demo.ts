/**
 * Mode B Generated Steps — Demo Fixtures
 * =======================================
 *
 * Four end-to-end demo templates illustrating Mode B :
 *
 * 1. **`additionGroupingDemo`** — CM2 arithmetic with grouping
 *    (`{{a}} + {{b}} * {{c}} + {{d}} * {{e}}`) ; the pedagogical-arithmetic
 *    pipeline emits a primaire walkthrough.
 *
 * 2. **`linearEquationDemo`** — 4e linear equation (`{{a}} * x + {{b}} = {{c}}`)
 *    ; the pedagogical-solve/linear pipeline emits the college-level resolution.
 *
 * 3. **`differentiatePolynomialDemo`** — 1ère spécialité maths polynomial
 *    (`x^3 + {{a}} * x^2 + {{b}} * x + {{c}}`) ; the pedagogical-differentiation
 *    pipeline emits a lycee walkthrough using `sum`, `linear-coefficient`,
 *    `power-natural`.
 *
 * 4. **`differentiateCompositionDemo`** — Terminale spécialité composition
 *    (`sin({{a}} * x)`) ; the pedagogical-differentiation pipeline emits the
 *    chain rule via `sin` + inner `linear-coefficient`.
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

/**
 * Demo question : `f(x) = x^3 + 2x^2 + 5x + 7` for 1ère spécialité maths.
 *
 * Mode B declares a `differentiate` correction with a polynomial expression.
 * The pipeline emits a `sum` top step with two `linear-coefficient` and one
 * `power-natural` sub-derivations (silent for the constant term).
 */
export const differentiatePolynomialDemo: QuestionTemplate = {
	id: 'demo-differentiate-1ere',
	title: 'Dérivée polynomiale (1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				"Calcule $f'(x) = ?$ avec $f(x) = x^3 + {{a}}x^2 + {{b}}x + {{c}}$"
			),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '7' }
			],
			blanks: [{ expectedAnswer: '3*x^2 + 2*{{a}}*x + {{b}}' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'differentiate',
					expression: 'x^3 + {{a}}*x^2 + {{b}}*x + {{c}}',
					variable: 'x',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Analyse',
	domain: 'Dérivation',
	subdomain: 'Polynômes',
	level: 1
};

/**
 * Demo question : `x² − 5x + 6 = 0` for Terminale spécialité maths.
 *
 * Mode B declares a `quadratic-equation` correction. The pipeline emits the
 * lycée-level resolution : identify a, b, c → compute Δ = 1 → discriminant
 * positive → apply formula → simplify → S = {2 ; 3}.
 */
export const quadraticEquationDemo: QuestionTemplate = {
	id: 'demo-quadratic-tle',
	title: 'Équation du second degré (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $x^2 - {{b}}x + {{c}} = 0$. $S = ?$'
			),
			variables: [
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '6' }
			],
			blanks: [{ expectedAnswer: '\\{2 ; 3\\}' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'quadratic-equation',
					equation: 'x^2-{{b}}*x+{{c}}=0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Algèbre',
	domain: 'Équations',
	subdomain: 'Second degré',
	level: 2
};

/**
 * Demo question : `−2x ≥ 6` for collège (4e).
 *
 * Mode B declares a `linear-inequality` correction. The pipeline emits the
 * college-level resolution with the **règle clé** : dividing by a negative
 * coefficient flips the operator (≥ becomes ≤). Solution : x ≤ −3.
 */
export const linearInequalityFlipDemo: QuestionTemplate = {
	id: 'demo-linear-inequality-flip-college',
	title: 'Inéquation avec coefficient négatif (4e)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Résous ${{a}}x \\geq {{b}}$ : $?$'),
			variables: [
				{ name: 'a', expression: '-2' },
				{ name: 'b', expression: '6' }
			],
			blanks: [{ expectedAnswer: 'x \\leq -3' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo ! Attention au changement de sens.') },
				generatedSteps: {
					kind: 'linear-inequality',
					inequality: '{{a}}*x>={{b}}',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['4'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Linéaires',
	level: 2
};

/**
 * Demo question : `2x + 1 < x + 5` for collège (4e).
 *
 * Mode B declares a `linear-inequality` correction with x on both sides
 * (no flip). Solution : x < 4.
 */
export const linearInequalityTwoSidesDemo: QuestionTemplate = {
	id: 'demo-linear-inequality-twosides-college',
	title: 'Inéquation avec x des deux côtés (4e)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Résous ${{a}}x + {{b}} < x + {{c}}$ : $?$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '1' },
				{ name: 'c', expression: '5' }
			],
			blanks: [{ expectedAnswer: 'x < 4' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'linear-inequality',
					inequality: '{{a}}*x+{{b}}<x+{{c}}',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['4'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Linéaires',
	level: 1
};

/**
 * Demo question : `x² − 5x + 6 < 0` for 1ère spécialité maths.
 *
 * Mode B declares a `quadratic-inequality` correction. The pipeline emits the
 * lycée-level resolution : identify a, b, c → compute Δ = 1 → discriminant
 * positive → apply formula → simplify roots {2, 3} → sign table → S = ]2 ; 3[.
 */
export const quadraticInequalityClassicDemo: QuestionTemplate = {
	id: 'demo-quadratic-inequality-classic-1ere',
	title: 'Inéquation du second degré (Δ > 0, 1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $x^2 - {{b}}x + {{c}} < 0$. $S = ?$'
			),
			variables: [
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '6' }
			],
			blanks: [{ expectedAnswer: ']2 ; 3[' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'quadratic-inequality',
					inequality: 'x^2-{{b}}*x+{{c}}<0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Second degré',
	level: 2
};

/**
 * Demo question : `−x² + 5x − 6 > 0` for 1ère spécialité maths (a < 0).
 *
 * Mode B declares a `quadratic-inequality` correction. With a < 0, the sign
 * table is inverted, so the strict inequality `> 0` selects the interior
 * between the roots : S = ]2 ; 3[.
 */
export const quadraticInequalityNegativeADemo: QuestionTemplate = {
	id: 'demo-quadratic-inequality-negativea-1ere',
	title: 'Inéquation du second degré avec a < 0 (1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $-x^2 + {{b}}x - {{c}} > 0$. $S = ?$'
			),
			variables: [
				{ name: 'b', expression: '5' },
				{ name: 'c', expression: '6' }
			],
			blanks: [{ expectedAnswer: ']2 ; 3[' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo ! Attention à $a < 0$.') },
				generatedSteps: {
					kind: 'quadratic-inequality',
					inequality: '-x^2+{{b}}*x-{{c}}>0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Second degré',
	level: 3
};

/**
 * Demo question : `f(x) = sin(2x)` for Terminale spécialité maths.
 *
 * Mode B declares a `differentiate` correction with a composition. The
 * pipeline emits a `sin` step with a `linear-coefficient` sub-step (chain
 * rule integrated).
 */
export const differentiateCompositionDemo: QuestionTemplate = {
	id: 'demo-differentiate-tle',
	title: 'Dérivée par composition (Terminale spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown("Calcule $f'(x) = ?$ avec $f(x) = \\sin({{a}}x)$"),
			variables: [{ name: 'a', expression: '3' }],
			blanks: [{ expectedAnswer: '{{a}}*\\cos({{a}}*x)' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'differentiate',
					expression: 'sin({{a}}*x)',
					variable: 'x',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Dérivation',
	subdomain: 'Composition',
	level: 2
};
