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
 * Demo question : `(x − 1)/(x − 3) < 0` for 1ère spécialité maths (palier 3).
 *
 * Mode B declares a `rational-inequality` correction. The pipeline emits the
 * lycée-level resolution : identify P/Q → domaine → racines/zéros → tableau de
 * signes combiné → S = ]1 ; 3[.
 */
export const rationalInequalitySimpleDemo: QuestionTemplate = {
	id: 'demo-rational-inequality-simple-1ere',
	title: 'Inéquation rationnelle simple (1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $\\dfrac{x - {{a}}}{x - {{b}}} < 0$. $S = ?$'
			),
			variables: [
				{ name: 'a', expression: '1' },
				{ name: 'b', expression: '3' }
			],
			blanks: [{ expectedAnswer: ']1 ; 3[' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent ! Tableau de signes au point.') },
				generatedSteps: {
					kind: 'rational-inequality',
					inequality: '(x-{{a}})/(x-{{b}})<0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Rationnelles',
	level: 3
};

/**
 * Demo question : `x/(x² − 1) ≥ 0` for Terminale spécialité maths (palier 3).
 *
 * Plus complexe : numérateur de degré 1, dénominateur de degré 2 (deux zéros à
 * exclure). Solution : `]−1 ; 0] ∪ ]1 ; +∞[`.
 */
export const rationalInequalityQuadDenomDemo: QuestionTemplate = {
	id: 'demo-rational-inequality-quaddenom-tle',
	title: 'Inéquation rationnelle avec dénominateur du 2nd degré (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $\\dfrac{x}{x^2 - 1} \\geq 0$. $S = ?$'
			),
			blanks: [{ expectedAnswer: ']-1 ; 0] \\cup ]1 ; +\\infty[' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo ! Attention aux valeurs interdites.') },
				generatedSteps: {
					kind: 'rational-inequality',
					inequality: 'x/(x^2 - 1) >= 0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Rationnelles',
	level: 4
};

/**
 * Demo question : `1/x + 1/(x − 1) < 0` for 1ère spécialité maths (palier 3 V2).
 *
 * Mode B declares a `rational-inequality` correction with a multi-fraction
 * input. The pipeline emits a `combine-fractions` step before the standard
 * rational pipeline, showing the « réduction au même dénominateur » work :
 * `1/x + 1/(x-1) = (x-1)/(x²-x) + x/(x²-x) = (2x-1)/(x²-x)`. Then standard
 * sign-table analysis. Solution : `]−∞ ; 0[ ∪ ]1/2 ; 1[`.
 */
export const rationalInequalityMultiFracDemo: QuestionTemplate = {
	id: 'demo-rational-inequality-multifrac-1ere',
	title: 'Inéquation rationnelle multi-fractions (1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Résous dans $\\mathbb{R}$ : $\\dfrac{1}{x} + \\dfrac{1}{x - 1} < 0$. $S = ?$'
			),
			blanks: [{ expectedAnswer: ']-\\infty ; 0[ \\cup ]1/2 ; 1[' }],
			correction: {
				feedback: {
					correct: templateMarkdown('Bravo ! Étape clé : réduction au même dénominateur.')
				},
				generatedSteps: {
					kind: 'rational-inequality',
					inequality: '1/x + 1/(x - 1) < 0',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Algèbre',
	domain: 'Inéquations',
	subdomain: 'Rationnelles',
	level: 4
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

/**
 * Demo question : « Calculer une primitive de `f(x) = 3x² + 2x + 1` » for
 * Terminale spécialité maths.
 *
 * Mode B declares an `integrate` correction (indefinite). The pipeline emits
 * a `apply-linearity-sum` top step with three power-rule / constant-rule
 * sub-derivations, plus the trailing `add-constant`.
 */
export const integrateIndefiniteDemo: QuestionTemplate = {
	id: 'demo-integrate-indefinite-tle',
	title: 'Primitive d’un polynôme (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Détermine une primitive de $f(x) = 3x^2 + {{b}}x + {{c}}$ : $F(x) = ?$'
			),
			variables: [
				{ name: 'b', expression: '2' },
				{ name: 'c', expression: '1' }
			],
			blanks: [{ expectedAnswer: 'x^3 + x^2 + x' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo ! N’oublie pas le « + C ».') },
				generatedSteps: {
					kind: 'integrate',
					expression: '3*x^2 + {{b}}*x + {{c}}',
					variable: 'x',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Intégration',
	subdomain: 'Primitives',
	level: 1
};

/**
 * Demo question : « Calculer $\int_0^1 e^x \, dx$ » for Terminale spécialité.
 *
 * Mode B declares an `integrate` correction with definite bounds. The pipeline
 * emits the fundamental-theorem trio: identify-definite-integral →
 * apply-known-primitive (e^x) → apply-fundamental-theorem → substitute-bounds
 * → simplify-bounds-result. Antiderivative = e^x ; value = e − 1.
 */
export const integrateDefiniteDemo: QuestionTemplate = {
	id: 'demo-integrate-definite-tle',
	title: 'Intégrale définie : exponentielle (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Calcule $\\displaystyle \\int_{{{a}}}^{{{b}}} e^x \\, dx = ?$'),
			variables: [
				{ name: 'a', expression: '0' },
				{ name: 'b', expression: '1' }
			],
			blanks: [{ expectedAnswer: 'e - 1' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'integrate',
					expression: 'e^x',
					variable: 'x',
					definite: { lower: '{{a}}', upper: '{{b}}' },
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Intégration',
	subdomain: 'Intégrales définies',
	level: 2
};

/**
 * Demo question : « Développe et réduis $(x+{{a}})(x-{{a}})$. » for collège.
 *
 * Mode B declares a `simplify` correction with `intent: 'developper'`. The
 * pipeline recognises the conjugate identity and emits one
 * `product-to-diff-squares` step ; normalize then settles the canonical form.
 */
export const simplifyDistributionDemo: QuestionTemplate = {
	id: 'demo-simplify-distribution-college',
	title: 'Développer un produit conjugué (4e)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Développe et réduis $(x+{{a}})(x-{{a}}) = ?$'),
			variables: [{ name: 'a', expression: '3' }],
			blanks: [{ expectedAnswer: 'x^2 - {{eval:a*a}}' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent — c’est l’identité a²−b² !') },
				generatedSteps: {
					kind: 'simplify',
					expression: '(x+{{a}})(x-{{a}})',
					intent: 'developper',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['4'],
	theme: 'Calcul littéral',
	domain: 'Identités remarquables',
	level: 1
};

/**
 * Demo question : « Simplifie $\\sin^2(x) + \\cos^2(x)$. » for lycée 1ère.
 *
 * Mode B declares a `simplify` correction with `intent: 'reduire'`. The
 * pipeline applies the Pythagorean identity in a single step.
 */
export const simplifyTrigDemo: QuestionTemplate = {
	id: 'demo-simplify-trig-lycee',
	title: 'Identité de Pythagore (1ère)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Simplifie $\\sin^2(x) + \\cos^2(x) = ?$'),
			variables: [],
			blanks: [{ expectedAnswer: '1' }],
			correction: {
				feedback: {
					correct: templateMarkdown('C’est l’identité fondamentale de la trigonométrie.')
				},
				generatedSteps: {
					kind: 'simplify',
					// `parseCustomSafe` (used by correction-generator) accepts the
					// `sin^2(x)` shorthand which yields a `FunctionNode` with
					// `power: 2`, the form the pythagorean pattern matches. The
					// statement above uses LaTeX `\sin^2(x)` for the human view.
					expression: 'sin^2(x) + cos^2(x)',
					intent: 'reduire',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Trigonométrie',
	domain: 'Identités trigonométriques',
	level: 1
};

/**
 * Demo question : `2 + 3 × 4 = ?` for primaire (CM2), variant of
 * `additionGroupingDemo` using `kind: 'arithmetic-from-blank'`.
 *
 * The arithmetic expression is declared once in the statement via the
 * `{{expression1}}` placeholder (rewritten as `<<expr:expression1>>` by
 * `insertExpressionMarkers`), and the correction simply references it by
 * `expressionName: 'expression1'`. No duplicate authoring of the expression on
 * the correction side — the runtime looks up `instance.expressions[].value`.
 */
export const arithmeticFromBlankDemo: QuestionTemplate = {
	id: 'demo-arithmetic-from-blank-primaire',
	title: 'Calcul avec expression nommée (CM2)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('Calcule ${{expression1}} = ?$'),
			variables: [
				{ name: 'a', expression: '2' },
				{ name: 'b', expression: '3' },
				{ name: 'c', expression: '4' },
				{ name: 'expression1', expression: '{{a}}+{{b}}*{{c}}' }
			],
			blanks: [{ expectedAnswer: '{{eval:a+b*c}}' }],
			correction: {
				feedback: { correct: templateMarkdown('Excellent !') },
				generatedSteps: {
					kind: 'arithmetic-from-blank',
					expressionName: 'expression1',
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
 * Demo question : limite (x²−4)/(x−2) quand x → 2 (Tle spé maths).
 *
 * Cas iconique de Tle spé : forme indéterminée 0/0 → factorisation par
 * (x − 2) → simplification → substitution directe → 4. Le pipeline
 * `pedagogical-limits` émet `detect-indeterminate-form` + parent
 * `simplify-common-factor` avec sous-étapes `factor-numerator` /
 * `factor-denominator` + `apply-direct-substitution` + `conclude`.
 */
export const limitFactorisationDemo: QuestionTemplate = {
	id: 'demo-limit-factorisation-lycee',
	title: 'Limite par factorisation (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown('$\\displaystyle\\lim_{x \\to 2} \\dfrac{x^2 - 4}{x - 2} = ?$'),
			variables: [{ name: 'a', expression: '4' }],
			blanks: [{ expectedAnswer: '4' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'limit',
					expression: '(x^2-{{a}})/(x-2)',
					approach: '2',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Limites',
	level: 1
};

/**
 * Demo question : limite (3x²−x)/(x²+1) quand x → +∞ (Tle spé maths).
 *
 * Étude du comportement à l'infini : ratio des coefficients dominants
 * (numérateur et dénominateur de même degré 2) → 3/1 = 3.
 */
export const limitInfinityDemo: QuestionTemplate = {
	id: 'demo-limit-infinity-lycee',
	title: "Limite à l'infini par dominance (Tle spé)",
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'$\\displaystyle\\lim_{x \\to +\\infty} \\dfrac{3x^2 - x}{x^2 + 1} = ?$'
			),
			variables: [{ name: 'k', expression: '3' }],
			blanks: [{ expectedAnswer: '3' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'limit',
					expression: '({{k}}*x^2-x)/(x^2+1)',
					approach: '\\infty',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Limites',
	level: 1
};

/**
 * Demo question : domaine de définition de √x / (x − 1) (1ère spé maths).
 *
 * Composition d'une racine carrée et d'une division : émet 3 steps
 * (sqrt_constraint, division_constraint, intersection).
 */
export const domainSqrtFractionDemo: QuestionTemplate = {
	id: 'demo-domain-sqrt-fraction-lycee',
	title: 'Domaine de définition √x / (x − 1) (1ère spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Déterminer le domaine de définition de $f(x) = \\dfrac{\\sqrt{x}}{x - 1}$. $D_f = ?$'
			),
			variables: [],
			blanks: [{ expectedAnswer: '[0;1[ \\cup ]1;+\\infty[' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'domain',
					expression: '\\dfrac{\\sqrt{x}}{x - 1}',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['1_SPE'],
	theme: 'Analyse',
	domain: 'Fonctions',
	level: 1
};

/**
 * Demo question : domaine de définition de arcsin(2x) (Tle spé maths).
 *
 * Contrainte de l'arc sinus : -1 ≤ 2x ≤ 1 → x ∈ [-1/2 ; 1/2].
 */
export const domainArcsinDemo: QuestionTemplate = {
	id: 'demo-domain-arcsin-lycee',
	title: 'Domaine de définition arcsin(2x) (Tle spé)',
	status: 'published',
	variations: [
		{
			statement: templateMarkdown(
				'Déterminer le domaine de définition de $f(x) = \\arcsin(2x)$. $D_f = ?$'
			),
			variables: [],
			blanks: [{ expectedAnswer: '[-1/2;1/2]' }],
			correction: {
				feedback: { correct: templateMarkdown('Bravo !') },
				generatedSteps: {
					kind: 'domain',
					expression: '\\arcsin(2x)',
					options: { schoolLevel: 'auto' }
				}
			}
		}
	],
	grades: ['T_SPE'],
	theme: 'Analyse',
	domain: 'Fonctions',
	level: 1
};
