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
 * Les limites restent en Unicode (`formatPowerShort`), hors de ce panel.
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
	'2x+\\dfrac{3}{4}=x-1'
];

const INEQUALITIES: readonly string[] = ['-\\dfrac{2}{3}x+1<5', '3x-2\\geq x+4', '-2x+5>1'];

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
	const leaked = prose.match(/[\\^_{}*~]/);
	return leaked ? `« ${leaked[0]} » hors des $…$` : null;
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
				...renderedTexts(where, withTidyStep(rendered, result.derivative).steps),
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

function failures(texts: readonly Text[]): string[] {
	return texts.flatMap(({ where, text }) => {
		const defect = defects(text);
		return defect ? [`${where} : ${defect} — ${text}`] : [];
	});
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
	});

	it('le panel est réaliste (il produit des textes à vérifier)', () => {
		expect(integrationTexts().length).toBeGreaterThan(300);
		expect(derivativeTexts().length).toBeGreaterThan(100);
		expect(linearTexts().length).toBeGreaterThan(100);
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
});
