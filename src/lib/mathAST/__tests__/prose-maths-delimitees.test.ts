/**
 * Prose des étapes pédagogiques : les maths entre `$…$` (V25)
 *
 * `GeneratedStepsCorrection` rend titres et explications avec `InlineMarkdown`
 * (ubumark) : une formule entre `$…$` s'affiche en maths, le reste en texte.
 * Avant V25, l'intégration et la dérivation injectaient du LaTeX brut dans la
 * prose (`On met \exponentialE^{3 x} en facteur.`), affiché tel quel.
 *
 * Garde-fou sur un panel réaliste, aux niveaux où chaque pipeline s'emploie :
 * - les `$` sont appariés ;
 * - jamais `$$` (ubumark y lit une formule en bloc) ;
 * - hors des `$…$`, aucun `\`, `^`, `_`, `{`, `}` (LaTeX), `*` (italique
 *   Markdown d'ubumark) ni `~` (formule en syntaxe maison).
 *
 * Le panel couvre les 11 pipelines que `generateCorrection` appelle, plus la
 * valeur absolue (que seul l'atelier emploie pour l'instant)
 * (arithmétique, premier et second degré, inéquations du premier et du second
 * degré, rationnelles, dérivation, intégration, simplification, limites,
 * domaine), à chaque niveau accepté : listes ci-dessous et cas de démo des
 * modules. L'intention `developper` est vérifiée sur ce qu'elle MONTRE : la
 * rédaction d'`explainExpansion` (option B du 2026-10-14), pas la trace du
 * pipeline. Les limites, plus strictes depuis le 2026-10-14 : hors des `$…$`,
 * aucune maths en Unicode (`+∞`, `x²`, `0⁺`, `−`, `×`), ni `lim`, `=` ou `0/0`
 * — toute formule de leur prose passe en LaTeX entre `$…$`.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../parser';
import type { RelationNode } from '../types';
import type { RenderedStep, SchoolLevel } from '../common/step-renderer-base';
import {
	generatePedagogicalIntegrationSteps,
	PedagogicalIntegrationRenderer
} from '../pedagogical-integration';
import { generatePedagogicalDifferentiationSteps } from '../pedagogical-differentiation/pipeline';
import { PedagogicalDifferentiationRenderer } from '../pedagogical-differentiation/renderer';
import { withTidyStep } from '../pedagogical-differentiation/tidy-step';
import { generateLinearEquationSteps } from '../pedagogical-solve/linear';
import { generateLinearInequalitySteps } from '../pedagogical-solve/linear-inequality';
import { LinearEquationRenderer } from '../pedagogical-solve/linear-renderer';
import { generateQuadraticEquationSteps } from '../pedagogical-solve/quadratic';
import { generateQuadraticInequalitySteps } from '../pedagogical-solve/quadratic-inequality';
import { generateRationalInequalitySteps } from '../pedagogical-solve/rational-inequality';
import { QuadraticEquationRenderer } from '../pedagogical-solve/quadratic-renderer';
import { generateAbsoluteValueEquationSteps } from '../pedagogical-solve/absolute-value';
import { AbsoluteValueEquationRenderer } from '../pedagogical-solve/absolute-value-renderer';
import { ALL_CATEGORIES as LINEAR_DEMOS } from '../pedagogical-solve/demo-equations';
import { ALL_CATEGORIES_QUADRATIC as QUADRATIC_DEMOS } from '../pedagogical-solve/demo-equations-quadratic';
import { generatePedagogicalArithmeticSteps } from '../pedagogical-arithmetic/pipeline';
import { PedagogicalArithmeticRenderer } from '../pedagogical-arithmetic/renderer';
import { ALL_CATEGORIES as ARITHMETIC_DEMOS } from '../pedagogical-arithmetic/demo-cases';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import { PedagogicalSimplifyRenderer } from '../pedagogical-simplify/renderer';
import { ALL_DEMO_CATEGORIES as SIMPLIFY_DEMOS } from '../pedagogical-simplify/demo-cases';
import { explainExpansion } from '../pedagogical-simplify/expand-explained';
import { dispatchPedagogicalLimit, PedagogicalLimitRenderer } from '../pedagogical-limits';
import { ALL_CATEGORIES as LIMIT_DEMOS } from '../pedagogical-limits/demo-cases';
import { dispatchPedagogicalDomain, PedagogicalDomainRenderer } from '../pedagogical-domain';
import { ALL_CATEGORIES as DOMAIN_DEMOS } from '../pedagogical-domain/demo-cases';
import { ALL_CATEGORIES as DERIVATIVE_DEMOS } from '../pedagogical-differentiation/demo-cases';
import { ALL_CATEGORIES_INTEGRATION as INTEGRATION_DEMOS } from '../pedagogical-integration/demo-cases';

// =============================================================================
// Types
// =============================================================================

interface Text {
	readonly where: string;
	readonly text: string;
}

interface DescribedStep {
	readonly description: string;
	readonly subSteps?: readonly DescribedStep[];
}

// =============================================================================
// Constantes
// =============================================================================

const INTEGRANDS: ReadonlyArray<readonly [string, { lower: string; upper: string }?]> = [
	['3x^2'],
	['4x^3-2x+5'],
	['\\dfrac{1}{2}x^2+3x'],
	['5'],
	['3e^x'],
	['e^{2x}'],
	['4e^{2x+1}'],
	['e^{-3x}'],
	['\\dfrac{2}{x}'],
	['\\dfrac{3}{2x+1}'],
	['\\dfrac{2x}{x^2+1}'],
	['\\cos(x)'],
	['3\\sin(2x)'],
	['\\cos(3x+1)'],
	['x^{-2}'],
	['xe^x'],
	['2xe^{3x}'],
	['x\\ln(x)'],
	['\\ln(x)'],
	['x\\cos(x)'],
	['\\dfrac{1}{x(x+1)}'],
	['\\dfrac{3}{(x-1)(x+2)}'],
	['\\dfrac{2x+1}{x^2+x}'],
	['\\dfrac{5}{(2x+1)(x-3)}'],
	['2xe^{x^2}'],
	['3x^2', { lower: '0', upper: '2' }],
	['e^{2x}', { lower: '0', upper: '1' }],
	['\\dfrac{2}{x}', { lower: '1', upper: 'e' }],
	['\\cos(x)', { lower: '0', upper: '\\dfrac{\\pi}{2}' }],
	['xe^x', { lower: '0', upper: '1' }],
	['\\dfrac{1}{4}x^3', { lower: '-1', upper: '2' }]
];

const DERIVATIVES: readonly string[] = [
	'3x^2+2x',
	'4x^3-5x',
	'-2x^2',
	'7-3x',
	'e^{3x+1}',
	'\\dfrac{2x+1}{x-3}',
	'\\dfrac{3}{x^2+1}',
	'x\\ln(x)',
	'\\sqrt{2x+1}',
	'\\cos(3x)',
	'2\\sin(x^2)',
	'\\tan(2x)',
	'\\ln(3x^2+1)',
	'(2x+1)^5',
	'2^x',
	'x^x',
	'\\arctan(2x)',
	'\\dfrac{1}{2}x^4'
];

const LINEAR: readonly string[] = [
	'3x+5=2x-7',
	'\\dfrac{2}{3}x+1=5',
	'-4x+3=11',
	'5x-2=\\dfrac{1}{2}',
	'2x+\\dfrac{3}{4}=x-1',
	// V38 : coefficient fonction d'une constante
	'x\\ln 2=1'
];

const INEQUALITIES: readonly string[] = [
	'-\\dfrac{2}{3}x+1<5',
	'3x-2\\geq x+4',
	'-2x+5>1',
	// V38 : coefficient négatif fonction d'une constante (cos 2, ln 2 − 1)
	'x\\cos 2>1',
	'x\\ln 2-x>1'
];

const QUADRATIC_INEQUALITIES: readonly string[] = [
	'x^2-5x+6<0',
	'2x^2-3x-2\\geq0',
	'-x^2+4>0',
	'x^2+x+1>0',
	'\\dfrac{1}{2}x^2-2\\leq0',
	'3x^2-2x<0'
];

const RATIONAL_INEQUALITIES: readonly string[] = [
	'\\dfrac{2x+1}{x^2-4}<0',
	'\\dfrac{x-1}{x+3}\\geq0',
	'\\dfrac{3}{2x-1}>0',
	'\\dfrac{x^2-1}{x}\\leq0',
	// V38
	'\\frac{1}{x\\ln 2}>1'
];

const QUADRATIC_EQUATIONS: readonly string[] = [
	'2x^2-3x+1=0',
	'x^2+2x+5=0',
	'3x^2-12=0',
	'4x^2-4x+1=0'
];

/** Valeur absolue (2026-10-13) : chaque forme de la rédaction, dont l'isolement */
const ABSOLUTE_VALUE_EQUATIONS: readonly string[] = [
	'\\left|2x+1\\right|=5',
	'\\left|x\\right|=0',
	'\\left|x\\right|=-2',
	'\\left|x\\right|=\\pi',
	'\\left|x\\right|=1-\\sqrt{2}',
	'3\\left|x-1\\right|=6',
	'5-\\left|x\\right|=2',
	'\\left|x-1\\right|=\\left|x+3\\right|',
	'\\left|x-1\\right|=\\left|1-x\\right|'
];

/**
 * Développer (option B, 2026-10-14) : la rédaction que voient l'atelier et les
 * corrections, dont des titres à maths entre `$…$` (`eˣ`, lettres indicées,
 * fraction en facteur)
 */
const EXPANSIONS: readonly string[] = [
	'(2x-1)(x+3)',
	'3(x-2)-(x+1)',
	'(3x-1)^2-(x+2)^2',
	'(x+1)^3',
	'-2(x-4)',
	'(a-2b)^2',
	'(x_1+x_2)^2',
	'e^x(x+1)',
	'\\dfrac{x}{2}(x+1)',
	'(0.5x+1)^2'
];

const LIMITS: ReadonlyArray<readonly [string, string, ('left' | 'right')?]> = [
	['1/x', '0', 'left'],
	['1/x', '0', 'right'],
	['1/x', '0'],
	['1/(x-2)', '2'],
	['e^x/x', '+\\infty'],
	['x*e^(-x)', '+\\infty'],
	['e^(1/x)', '0', 'right'],
	['ln(x)', '0'],
	['(x+1)/(x+1)', '-1'],
	['(2x+1)/(x-3)', '3', 'right'],
	['(3x^2+1)/(2x^2-5)', '\\infty'],
	['(x^2-4)/(x-2)', '2']
];

const DOMAINS: readonly string[] = [
	'\\dfrac{1}{x-2}',
	'\\dfrac{3}{2x+1}',
	'\\sqrt{3-x}',
	'\\ln(2x+1)'
];

const ALL_LEVELS: readonly SchoolLevel[] = ['primaire', 'college', 'lycee', 'superieur'];
const UPPER_LEVELS = ['lycee', 'superieur'] as const;

/**
 * Maths écrites hors des `$…$` dans la prose des limites : Unicode (`+∞`, `x²`,
 * `0⁺`, `−`, `×`, `≤`, `ℓ`), `lim`, `=`, ou une fraction `0/0` en ligne.
 */
const UNICODE_MATH = /[∞⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻×·−→≤≥√πℓ∼≠⇒]|\blim\b|=|\d\s*\/\s*\d/;

/** Ce qui, en tête de texte, ouvre un bloc ubumark (liste, titre, citation, tableau) */
const BLOCK_START = /^\s*(([-+*]|\d+[.)])(\s|$)|[>#|])/;

/** Les erreurs de refus (« pas implémenté », hors programme) : comptées, pas des fuites */
const refusals: string[] = [];

// =============================================================================
// Fonctions
// =============================================================================

/** Les textes rendus (titres, explications), sous-étapes comprises */
function renderedTexts(where: string, steps: readonly RenderedStep[]): Text[] {
	return steps.flatMap((step) => [
		{ where: `${where} titre`, text: step.title },
		...(step.explanation ? [{ where: `${where} explication`, text: step.explanation }] : []),
		...renderedTexts(where, step.subSteps ?? [])
	]);
}

/** Les descriptions enregistrées par le pipeline (repli du titre) */
function descriptions(where: string, steps: readonly DescribedStep[]): Text[] {
	return steps.flatMap((step) => [
		{ where: `${where} description`, text: step.description },
		...descriptions(where, step.subSteps ?? [])
	]);
}

/**
 * Ce qui cloche dans un texte : `$` impairs, `$$` (bloc pour ubumark), LaTeX,
 * `*` (italique) ou `~` (maths en syntaxe maison) hors des maths
 */
function defects(text: string): string | null {
	if (text.includes('$$')) return '`$$` (deux formules collées)';
	const dollars = text.split('$').length - 1;
	if (dollars % 2 !== 0) return '`$` non appariés';
	const prose = text.replace(/\$[^$]*\$/g, ' ');
	const leaked = prose.match(/[\\^_{}*~`]/);
	if (leaked) return `« ${leaked[0]} » hors des $…$`;
	// En tête de texte, ubumark ouvrirait une liste, un titre ou une citation
	return BLOCK_START.test(text) ? 'début lu comme un bloc Markdown' : null;
}

function integrationTexts(): Text[] {
	const renderer = new PedagogicalIntegrationRenderer();
	const texts: Text[] = [];
	for (const [latex, bounds] of INTEGRANDS) {
		for (const level of ['lycee', 'superieur'] as const) {
			const result = generatePedagogicalIntegrationSteps(parseLatex(latex), {
				level,
				verbosity: 'detailed',
				definite: bounds
					? { lower: parseLatex(bounds.lower), upper: parseLatex(bounds.upper) }
					: undefined
			});
			const where = `∫ ${latex}${bounds ? ` [${bounds.lower} ; ${bounds.upper}]` : ''} (${level})`;
			texts.push(
				...renderedTexts(
					where,
					renderer.renderAll(result.steps, { schoolLevel: level, verbosity: 'detailed' })
				),
				...descriptions(where, result.steps)
			);
		}
	}
	return texts;
}

function derivativeTexts(): Text[] {
	const renderer = new PedagogicalDifferentiationRenderer();
	const texts: Text[] = [];
	for (const latex of DERIVATIVES) {
		for (const schoolLevel of ['lycee', 'superieur'] as const) {
			const result = generatePedagogicalDifferentiationSteps(parseLatex(latex), {
				variable: 'x',
				schoolLevel,
				verbosity: 'detailed'
			});
			const rendered = renderer.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' });
			const where = `(${latex})' (${schoolLevel})`;
			texts.push(
				...renderedTexts(where, withTidyStep(rendered, result.derivative, parseLatex(latex)).steps),
				...descriptions(where, result.steps)
			);
		}
	}
	return texts;
}

function linearTexts(): Text[] {
	const renderer = new LinearEquationRenderer();
	const texts: Text[] = [];
	const levels: readonly Exclude<SchoolLevel, 'primaire'>[] = ['college', 'lycee', 'superieur'];
	for (const level of levels) {
		for (const latex of LINEAR) {
			const steps = generateLinearEquationSteps(parseLatex(latex) as RelationNode, { level });
			const where = `${latex} (${level})`;
			texts.push(
				...renderedTexts(
					where,
					renderer.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
				),
				...descriptions(where, steps)
			);
		}
		for (const latex of INEQUALITIES) {
			const steps = generateLinearInequalitySteps(parseLatex(latex) as RelationNode, { level });
			const where = `${latex} (${level})`;
			texts.push(
				...renderedTexts(
					where,
					renderer.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
				),
				...descriptions(where, steps)
			);
		}
	}
	return texts;
}

/** Exécute un cas ; un refus du pipeline n'est pas une fuite de prose */
function attempt(where: string, run: () => Text[]): Text[] {
	try {
		return run();
	} catch (error) {
		refusals.push(`${where} : ${error instanceof Error ? error.message : String(error)}`);
		return [];
	}
}

function equationTexts(
	where: string,
	steps: Parameters<QuadraticEquationRenderer['renderAll']>[0],
	level: SchoolLevel
): Text[] {
	const renderer = new QuadraticEquationRenderer();
	return [
		...renderedTexts(
			where,
			renderer.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
		),
		...descriptions(where, steps)
	];
}

function absoluteValueTexts(): Text[] {
	const renderer = new AbsoluteValueEquationRenderer();
	const texts: Text[] = [];
	for (const level of ['college', 'lycee', 'superieur'] as const) {
		for (const latex of ABSOLUTE_VALUE_EQUATIONS) {
			const steps = generateAbsoluteValueEquationSteps(parseLatex(latex) as RelationNode, {
				level
			});
			const where = `${latex} (${level})`;
			texts.push(
				...renderedTexts(
					where,
					renderer.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
				),
				...descriptions(where, steps)
			);
		}
	}
	return texts;
}

function secondDegreeTexts(): Text[] {
	const texts: Text[] = [];
	const equations = [
		...QUADRATIC_EQUATIONS.map((latex) => ({
			label: latex,
			node: parseLatex(latex) as RelationNode
		})),
		...QUADRATIC_DEMOS.flatMap((c) => c.cases.map((d) => ({ label: d.label, node: d.equation })))
	];
	for (const level of UPPER_LEVELS) {
		for (const { label, node } of equations) {
			const where = `${label} (${level})`;
			texts.push(
				...attempt(where, () =>
					equationTexts(where, generateQuadraticEquationSteps(node, { level }), level)
				)
			);
		}
		for (const latex of QUADRATIC_INEQUALITIES) {
			const where = `${latex} (${level})`;
			const node = parseLatex(latex) as RelationNode;
			texts.push(
				...attempt(where, () =>
					equationTexts(where, generateQuadraticInequalitySteps(node, { level }), level)
				)
			);
		}
		for (const latex of RATIONAL_INEQUALITIES) {
			const where = `${latex} (${level})`;
			const node = parseLatex(latex) as RelationNode;
			texts.push(
				...attempt(where, () =>
					equationTexts(where, generateRationalInequalitySteps(node, { level }), level)
				)
			);
		}
	}
	return texts;
}

function arithmeticTexts(): Text[] {
	const renderer = new PedagogicalArithmeticRenderer();
	const texts: Text[] = [];
	for (const testCase of ARITHMETIC_DEMOS.flatMap((c) => c.cases)) {
		for (const schoolLevel of testCase.schoolLevels ?? ALL_LEVELS) {
			const where = `${testCase.label} (${schoolLevel})`;
			texts.push(
				...attempt(where, () => {
					const result = generatePedagogicalArithmeticSteps(testCase.expression, {
						schoolLevel,
						target: testCase.target,
						verbosity: 'detailed'
					});
					return [
						...renderedTexts(
							where,
							renderer.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' })
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
	}
	return texts;
}

/** Développer : les deux versions rendues de la rédaction, et ses descriptions */
function expansionTexts(where: string, latex: string, schoolLevel: SchoolLevel): Text[] {
	const explained = explainExpansion(parseLatex(latex), { schoolLevel });
	if (explained.kind !== 'expanded' || explained.steps === null) return [];
	const { raw, detailed, summarized } = explained.steps;
	return [
		...renderedTexts(where, detailed),
		...renderedTexts(`${where} résumé`, summarized),
		...descriptions(where, [...raw.steps, ...raw.summary])
	];
}

function simplifyTexts(): Text[] {
	const renderer = new PedagogicalSimplifyRenderer();
	const texts: Text[] = [];
	for (const latex of EXPANSIONS) {
		for (const schoolLevel of ['college', 'lycee'] as const) {
			const where = `${latex} [developper] (${schoolLevel})`;
			texts.push(...attempt(where, () => expansionTexts(where, latex, schoolLevel)));
		}
	}
	for (const testCase of SIMPLIFY_DEMOS.flatMap((c) => c.cases)) {
		for (const schoolLevel of testCase.schoolLevels ?? (['college', 'lycee'] as const)) {
			const where = `${testCase.label} [${testCase.intent}] (${schoolLevel})`;
			if (testCase.intent === 'developper') {
				texts.push(...attempt(where, () => expansionTexts(where, testCase.latex, schoolLevel)));
				continue;
			}
			texts.push(
				...attempt(where, () => {
					const result = generatePedagogicalSimplifySteps(parseLatex(testCase.latex), {
						intent: testCase.intent,
						schoolLevel,
						verbosity: 'detailed'
					});
					return [
						...renderedTexts(
							where,
							renderer.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' })
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
	}
	return texts;
}

function limitTexts(): Text[] {
	const renderer = new PedagogicalLimitRenderer();
	const cases = [
		...LIMITS.map(([expression, approach, direction]) => ({ expression, approach, direction })),
		...LIMIT_DEMOS.flatMap((c) => c.cases)
	];
	const texts: Text[] = [];
	for (const testCase of cases) {
		for (const schoolLevel of UPPER_LEVELS) {
			const where = `lim ${testCase.expression} → ${testCase.approach} (${schoolLevel})`;
			texts.push(
				...attempt(where, () => {
					const result = dispatchPedagogicalLimit({
						expression: testCase.expression,
						variable: 'x',
						approach: testCase.approach,
						direction: testCase.direction,
						schoolLevel,
						verbosity: 'detailed'
					});
					return [
						...renderedTexts(
							where,
							renderer.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' })
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
	}
	return texts;
}

function domainTexts(): Text[] {
	const renderer = new PedagogicalDomainRenderer();
	const expressions = [
		...DOMAINS,
		...DOMAIN_DEMOS.flatMap((c) => c.cases.map((d) => d.expression))
	];
	const texts: Text[] = [];
	for (const expression of expressions) {
		for (const schoolLevel of UPPER_LEVELS) {
			const where = `D(${expression}) (${schoolLevel})`;
			texts.push(
				...attempt(where, () => {
					const result = dispatchPedagogicalDomain({
						expression,
						variable: 'x',
						schoolLevel,
						verbosity: 'detailed'
					});
					return [
						...renderedTexts(
							where,
							renderer.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' })
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
	}
	return texts;
}

/** Les cas de démo de la dérivation, de l'intégration et du premier degré, en plus des listes */
function demoTexts(): Text[] {
	const derivatives = new PedagogicalDifferentiationRenderer();
	const integrals = new PedagogicalIntegrationRenderer();
	const linear = new LinearEquationRenderer();
	const texts: Text[] = [];
	for (const schoolLevel of UPPER_LEVELS) {
		for (const testCase of DERIVATIVE_DEMOS.flatMap((c) => c.cases)) {
			const where = `(${testCase.latex})' (${schoolLevel})`;
			texts.push(
				...attempt(where, () => {
					const result = generatePedagogicalDifferentiationSteps(parseLatex(testCase.latex), {
						variable: testCase.variable ?? 'x',
						schoolLevel,
						verbosity: 'detailed'
					});
					const rendered = derivatives.renderAll(result.steps, {
						schoolLevel,
						verbosity: 'detailed'
					});
					return [
						...renderedTexts(
							where,
							withTidyStep(rendered, result.derivative, parseLatex(testCase.latex)).steps
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
		for (const testCase of INTEGRATION_DEMOS.flatMap((c) => c.cases)) {
			const where = `∫ ${testCase.latex} (${schoolLevel})`;
			texts.push(
				...attempt(where, () => {
					const result = generatePedagogicalIntegrationSteps(parseLatex(testCase.latex), {
						level: schoolLevel,
						variable: testCase.variable,
						verbosity: 'detailed',
						definite: testCase.definite
							? {
									lower: parseLatex(testCase.definite.lower),
									upper: parseLatex(testCase.definite.upper)
								}
							: undefined
					});
					return [
						...renderedTexts(
							where,
							integrals.renderAll(result.steps, { schoolLevel, verbosity: 'detailed' })
						),
						...descriptions(where, result.steps)
					];
				})
			);
		}
	}
	for (const level of ['college', 'lycee', 'superieur'] as const) {
		for (const testCase of LINEAR_DEMOS.flatMap((c) => c.cases)) {
			const where = `${testCase.label} (${level})`;
			texts.push(
				...attempt(where, () => {
					const steps = generateLinearEquationSteps(testCase.equation, { level });
					return [
						...renderedTexts(
							where,
							linear.renderAll(steps, { schoolLevel: level, verbosity: 'detailed' })
						),
						...descriptions(where, steps)
					];
				})
			);
		}
	}
	return texts;
}

function failures(
	texts: readonly Text[],
	check: (text: string) => string | null = defects
): string[] {
	return texts.flatMap(({ where, text }) => {
		const defect = check(text);
		return defect ? [`${where} : ${defect} — ${text}`] : [];
	});
}

/** Limites : en plus, aucune maths en Unicode hors des `$…$` */
function limitDefects(text: string): string | null {
	const defect = defects(text);
	if (defect) return defect;
	const leaked = text.replace(/\$[^$]*\$/g, ' ').match(UNICODE_MATH);
	return leaked ? `« ${leaked[0]} » hors des $…$ (maths en clair)` : null;
}

// =============================================================================
// Tests
// =============================================================================

describe('prose des étapes : les maths entre $…$ (V25)', () => {
	it('le détecteur voit le LaTeX brut, les $ impairs et l’italique', () => {
		expect(defects('On met \\exponentialE^{3 x} en facteur.')).not.toBeNull();
		expect(defects('On met $\\exponentialE^{3 x}$ en facteur.')).toBeNull();
		expect(defects('On pose $u = x et dv = 1.')).toBe('`$` non appariés');
		expect(defects('Forme u’·eᵘ')).toBeNull();
		expect(defects('S = { 6 }')).not.toBeNull();
		expect(defects('3 * 4')).not.toBeNull();
		expect(defects('environ ~3~')).not.toBeNull();
		expect(defects('$u = x$$v = 1$')).not.toBeNull();
		expect(defects('On écrit `x^2`')).not.toBeNull();
		expect(defects('+ 3 : on ajoute')).not.toBeNull();
		expect(defects('+')).not.toBeNull();
		expect(defects('+(-)→-')).toBeNull();
		expect(defects('$+ C$')).toBeNull();
	});

	it('le panel est réaliste (il produit des textes à vérifier)', () => {
		expect(integrationTexts().length).toBeGreaterThan(300);
		expect(derivativeTexts().length).toBeGreaterThan(100);
		expect(linearTexts().length).toBeGreaterThan(100);
		expect(secondDegreeTexts().length).toBeGreaterThan(200);
		expect(absoluteValueTexts().length).toBeGreaterThan(100);
		expect(arithmeticTexts().length).toBeGreaterThan(200);
		expect(simplifyTexts().length).toBeGreaterThan(100);
		expect(limitTexts().length).toBeGreaterThan(100);
		expect(domainTexts().length).toBeGreaterThan(50);
		expect(demoTexts().length).toBeGreaterThan(300);
	});

	it('intégration : primitives et intégrales définies, lycée et supérieur', () => {
		expect(failures(integrationTexts())).toEqual([]);
	});

	it('dérivation : lycée et supérieur', () => {
		expect(failures(derivativeTexts())).toEqual([]);
	});

	it('premier degré : équations et inéquations, collège, lycée, supérieur', () => {
		expect(failures(linearTexts())).toEqual([]);
	});

	it('second degré : équations, inéquations du second degré et rationnelles', () => {
		expect(failures(secondDegreeTexts())).toEqual([]);
	});

	it('valeur absolue : |u| = c, isolement, |u| = |v|, collège, lycée, supérieur', () => {
		expect(failures(absoluteValueTexts())).toEqual([]);
	});

	it('arithmétique : les cas de démo, à chaque niveau', () => {
		expect(failures(arithmeticTexts())).toEqual([]);
	});

	it('simplification : les cas de démo', () => {
		expect(failures(simplifyTexts())).toEqual([]);
	});

	it('développer : le panel produit des titres à maths entre $…$', () => {
		const titles = simplifyTexts()
			.filter(({ where }) => where.includes('[developper]') && where.endsWith('titre'))
			.map(({ text }) => text);

		expect(titles).toContain('On distribue $\\exponentialE^x$');
		expect(titles).toContain('On reconnaît (a + b)² = a² + 2ab + b², avec a = $x_1$ et b = $x_2$');
	});

	it('le détecteur des limites voit les maths en Unicode', () => {
		expect(limitDefects('La limite vaut +∞')).not.toBeNull();
		expect(limitDefects('Forme indéterminée 0/0 reconnue')).not.toBeNull();
		expect(limitDefects('Limite : lim(1/x) = −∞ quand x tend vers 0⁻')).not.toBeNull();
		expect(limitDefects('Simplification par x²')).not.toBeNull();
		expect(limitDefects('La limite vaut $+\\infty$')).toBeNull();
		expect(limitDefects('Comparaison gauche/droite')).toBeNull();
	});

	it('limites : lycée et supérieur, aucune maths hors des $…$', () => {
		expect(failures(limitTexts(), limitDefects)).toEqual([]);
	});

	it('domaine de définition : lycée et supérieur', () => {
		expect(failures(domainTexts())).toEqual([]);
	});

	it('cas de démo de la dérivation, de l’intégration et du premier degré', () => {
		expect(failures(demoTexts())).toEqual([]);
	});
});
