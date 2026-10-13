/**
 * « On sort le signe − » partout (décision de David du 2026-10-13).
 *
 * Le même geste avait deux rédactions selon l'écriture de l'intégrande :
 * `\frac{-1}{x+1}` (étape `reveal-derivative`) disait « On sort le signe − »,
 * mais `-\frac{1}{x+1}`, `-e^x`, `-(x+1)^3` (étape `extract-constant`)
 * disaient « On sort la constante −1 » avec ∫ (−1) f(x) dx dans le calcul.
 * Désormais : « On sort le signe $-$ » et ∫ (−f(x)) dx = −∫ f(x) dx, sans
 * $(-1)$ ni $-1 \times$, au lycée comme au supérieur, en résumé comme en
 * détaillé. Les autres constantes ($-3$, $\frac12$) gardent « On sort la
 * constante k ».
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationRenderer } from '..';

// =============================================================================
// Décor
// =============================================================================

type Level = 'lycee' | 'superieur';

function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

function render(latex: string, level: Level, verbosity: Verbosity): RenderedStep[] {
	const result = generatePedagogicalIntegrationSteps(parseLatex(latex), { level });
	return flatten(
		new PedagogicalIntegrationRenderer().renderAll(result.steps, {
			schoolLevel: level,
			verbosity
		})
	);
}

/** L'étape qui sort la constante (ou le signe) : `extract-constant` ou `reveal-derivative` */
function constantStep(steps: readonly RenderedStep[]): RenderedStep {
	const step = steps.find((s) => s.rule === 'extract-constant' || s.rule === 'reveal-derivative');
	if (!step) throw new Error('aucune étape qui sort une constante');
	return step;
}

/** Tout le texte d'une suite d'étapes : titres, explications, calculs */
function allText(steps: readonly RenderedStep[]): string {
	return steps
		.map((s) => [s.title, s.explanation ?? '', s.expressionLatex ?? ''].join('\n'))
		.join('\n');
}

const LEVELS: readonly Level[] = ['lycee', 'superieur'];
const VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

// =============================================================================
// Le signe − : un seul titre, un seul calcul
// =============================================================================

describe('k = −1 : « On sort le signe $-$ », quelle que soit l’écriture', () => {
	const SIGN_CASES = ['-\\frac{1}{x+1}', '-e^x', '-(x+1)^3', '-\\cos x', '\\frac{-1}{x}'];

	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			it.each(SIGN_CASES)(`%s (${level}, ${verbosity})`, (latex) => {
				const steps = render(latex, level, verbosity);
				expect(constantStep(steps).title).toBe('On sort le signe $-$');
				// Ni « constante −1 », ni (−1), ni −1 × nulle part
				const text = allText(steps);
				expect(text).not.toContain('constante $-1$');
				expect(text).not.toContain('\\left( -1 \\right)');
				expect(text).not.toContain('-1 \\times');
			});
		}
	}

	it.each(SIGN_CASES)('%s : l’explication écrit ∫ (−f) dx = −∫ f dx', (latex) => {
		const step = constantStep(render(latex, 'lycee', 'detailed'));
		expect(step.explanation).toMatch(/^Le signe \$-\$ sort de l'intégrale : \$\\int /);
		// Le membre de droite commence par le seul signe
		expect(step.explanation).toContain('= -\\int ');
		// Jamais `\int -` : l'intégrande négatif va entre parenthèses
		expect(step.explanation).not.toContain('\\int -');
	});

	it('`-e^x` détaillé : ∫ (−f(x)) dx = −∫ f(x) dx', () => {
		const step = constantStep(render('-e^x', 'lycee', 'detailed'));
		expect(step.explanation).toBe(
			"Le signe $-$ sort de l'intégrale : $\\int \\left( -f(x) \\right)\\,dx = -\\int f(x)\\,dx$."
		);
	});

	it('`\\frac{-1}{x}` après la réécriture : « Avec le signe $-$ sorti »', () => {
		const steps = render('\\frac{-1}{x}', 'lycee', 'detailed');
		const composite = steps.find((s) => s.rule === 'apply-composite-ln');
		expect(composite?.explanation).toContain("Avec le signe $-$ sorti de l'intégrale");
	});
});

// =============================================================================
// Les autres constantes : inchangées
// =============================================================================

describe('k ≠ −1 : « On sort la constante k » inchangé', () => {
	it.each([
		['-3e^x', 'On sort la constante $-3$', '-3 \\int f(x)'],
		['\\frac12 x^2', 'On sort la constante $\\dfrac{1}{2}$', '\\dfrac{1}{2} \\int f(x)']
	])('%s', (latex, title, rhs) => {
		const step = constantStep(render(latex, 'lycee', 'detailed'));
		expect(step.title).toBe(title);
		expect(step.explanation).toContain('Une constante multiplicative sort de');
		expect(step.explanation).toContain(rhs);
	});

	it('`-3e^x` au supérieur : la formule ∫ cf dx = c ∫ f dx reste', () => {
		const step = constantStep(render('-3e^x', 'superieur', 'summarized'));
		expect(step.title).toBe('$\\int cf\\,dx = c\\int f\\,dx$');
	});
});

// =============================================================================
// Intégrales définies : la valeur reste juste
// =============================================================================

describe('intégrales définies avec le signe sorti : valeur juste', () => {
	it.each([
		['-e^x', '0', '1', 1 - Math.E],
		['-\\cos x', '0', '\\frac{\\pi}{2}', -1],
		['-(x+1)^3', '0', '1', -(16 - 1) / 4],
		['-\\frac{1}{x+1}', '0', '1', -Math.log(2)]
	])('∫ %s de %s à %s', (latex, lower, upper, expected) => {
		const result = generatePedagogicalIntegrationSteps(parseLatex(latex), {
			level: 'lycee',
			definite: { lower: parseLatex(lower), upper: parseLatex(upper) }
		});
		expect(result.value).toBeDefined();
		expect(compile(result.value!)({})).toBeCloseTo(expected, 9);
		const steps = flatten(
			new PedagogicalIntegrationRenderer().renderAll(result.steps, {
				schoolLevel: 'lycee',
				verbosity: 'detailed'
			})
		);
		expect(constantStep(steps).title).toBe('On sort le signe $-$');
	});
});
