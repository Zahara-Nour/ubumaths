/**
 * `.variations` sur les fonctions de lycée qui ont des VALEURS INTERDITES.
 *
 * ⚠️ Mesuré sur main (2026-10-09) : `.variations 1/(2x-1)` annonçait
 * « ]-inf ; +inf[ : - (f decroissante) » — f décroissante sur ℝ, alors que
 * f(0) = −1 < f(1) = 1. Les deux intervalles ]−∞ ; 1/2[ et ]1/2 ; +∞[, de
 * même sens, étaient FUSIONNÉS par-dessus la valeur interdite. Un point exclu
 * du domaine coupe l'étude comme un point critique.
 *
 * Et le rendu : du texte de terminal (`{-2}/{(2x-1)^2}`, `-inf`,
 * « decroissante ») — désormais de l'écriture mathématique, comme
 * `.intégrer` et `.résoudre`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, runAction, type CalcSession, type CalcResult } from '../calcul';
import { computeVariations } from '$lib/mathAST/variations';
import { parseLatex } from '$lib/mathAST/parser';
import { variationValueLatex } from '$lib/mathAST/variations/latex';
import type { MathNode } from '$lib/mathAST/types';

// =============================================================================
// Outils
// =============================================================================

function bound(value: MathNode): string {
	if (value.type === 'infinity') return value.sign === 'negative' ? '-oo' : '+oo';
	// L'écriture du tableau et des étapes (`1 / 2` brut → `\dfrac{1}{2}`)
	return variationValueLatex(value);
}

/** Les intervalles d'étude (points isolés retirés), avec leur sens. */
function senses(expression: string): string[] {
	const result = computeVariations(parseLatex(expression), { variable: 'x' });
	return result.monotonicIntervals
		.filter((m) => bound(m.interval.lower.value) !== bound(m.interval.upper.value))
		.map((m) => {
			const open = m.interval.lower.type === 'open' ? ']' : '[';
			const close = m.interval.upper.type === 'open' ? '[' : ']';
			return `${open}${bound(m.interval.lower.value)};${bound(m.interval.upper.value)}${close} ${m.monotonicity}`;
		});
}

function extremaOf(expression: string): string[] {
	const result = computeVariations(parseLatex(expression), { variable: 'x' });
	return result.extrema.map((e) => `${e.type.split('_')[1]} f(${bound(e.x)})=${bound(e.y)}`);
}

function session(): CalcSession {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

function run(input: string): Extract<CalcResult, { kind: 'commande' }> {
	const outcome = runInput(session(), input);
	expect(outcome).toMatchObject({ kind: 'commande' });
	if (outcome.kind !== 'commande') throw new Error('pas une commande');
	return outcome;
}

/** Tout le LaTeX d'une ligne : la réponse et ses étapes. */
function allLatex(outcome: { latex?: string; steps?: readonly { expressionLatex?: string }[] }) {
	return [outcome.latex ?? '', ...(outcome.steps ?? []).map((s) => s.expressionLatex ?? '')].join(
		'\n'
	);
}

/** `inf` écrit en toutes lettres (`-inf`), pas le `\infty` de LaTeX */
const BARE_INF = /(^|[^\\])inf/;

// =============================================================================
// Le moteur : les valeurs interdites coupent l'étude
// =============================================================================

describe('computeVariations : une valeur interdite coupe les intervalles', () => {
	it.each([
		['\\frac{1}{2x-1}', [']-oo;\\dfrac{1}{2}[ decreasing', ']\\dfrac{1}{2};+oo[ decreasing']],
		['\\frac{1}{x}', [']-oo;0[ decreasing', ']0;+oo[ decreasing']],
		['x^{-\\frac{1}{3}}', [']-oo;0[ decreasing', ']0;+oo[ decreasing']],
		['\\frac{x+1}{x-2}', [']-oo;2[ decreasing', ']2;+oo[ decreasing']],
		[
			'\\frac{1}{x^2-1}',
			[']-oo;-1[ increasing', ']-1;0[ increasing', ']0;1[ decreasing', ']1;+oo[ decreasing']
		],
		[
			'x+\\frac{1}{x}',
			[']-oo;-1[ increasing', ']-1;0[ decreasing', ']0;1[ decreasing', ']1;+oo[ increasing']
		],
		['\\frac{\\ln(x)}{x}', [']0;\\exponentialE[ increasing', ']\\exponentialE;+oo[ decreasing']]
	])('%s', (expression, expected) => {
		expect(senses(expression)).toEqual(expected);
	});

	it('jamais un sens sur ℝ entier quand le domaine ne l’est pas', () => {
		for (const expression of ['\\frac{1}{2x-1}', '\\frac{1}{x}', '\\frac{x+1}{x-2}']) {
			expect(senses(expression)).not.toContain(']-oo;+oo[ decreasing');
		}
	});

	it('pas d’extremum pour 1/(2x-1) ni 1/x', () => {
		expect(extremaOf('\\frac{1}{2x-1}')).toEqual([]);
		expect(extremaOf('\\frac{1}{x}')).toEqual([]);
	});

	it('x + 1/x : maximum local en −1, minimum local en 1', () => {
		expect(extremaOf('x+\\frac{1}{x}')).toEqual(['maximum f(-1)=-2', 'minimum f(1)=2']);
	});

	it('une fonction continue sur ℝ garde ses intervalles fusionnés (x³)', () => {
		expect(senses('x^3')).toEqual([']-oo;0[ increasing', ']0;+oo[ increasing']);
	});
});

// =============================================================================
// Le rendu dans Calcul
// =============================================================================

describe('.variations 1/(2x-1) dans Calcul : écriture mathématique', () => {
	it('la dérivée en fraction, pas `{-2}/{…}`', () => {
		const outcome = run('.variations 1/(2x-1)');
		expect(outcome.latex).toMatch(/^f'\(x\) = /);
		expect(outcome.latex).toContain('\\dfrac');
		expect(outcome.latex).not.toContain('}/{');
	});

	it('domaine ℝ privé de 1/2', () => {
		const latex = allLatex(run('.variations 1/(2x-1)'));
		expect(latex).toContain('\\mathbb{R} \\setminus \\left\\{ \\dfrac{1}{2} \\right\\}');
	});

	it('deux intervalles, décroissante sur chacun — jamais sur ℝ', () => {
		const latex = allLatex(run('.variations 1/(2x-1)'));
		expect(latex).toContain(']-\\infty ; \\dfrac{1}{2}[');
		expect(latex).toContain(']\\dfrac{1}{2} ; +\\infty[');
		expect(latex).toContain('\\text{décroissante}');
		expect(latex).not.toContain(']-\\infty ; +\\infty[');
	});

	it('les limites de part et d’autre de 1/2', () => {
		const latex = allLatex(run('.variations 1/(2x-1)'));
		expect(latex).toContain('\\lim_{x \\to \\frac{1}{2}^{-}} f(x) = -\\infty');
		expect(latex).toContain('\\lim_{x \\to \\frac{1}{2}^{+}} f(x) = +\\infty');
	});

	it('aucun `inf` en toutes lettres, aucune accolade maison', () => {
		const outcome = run('.variations 1/(2x-1)');
		expect(allLatex(outcome)).not.toMatch(BARE_INF);
		expect(allLatex(outcome)).not.toContain('}/{');
	});

	it('le texte est en français correct', () => {
		const { output } = run('.variations 1/(2x-1)');
		expect(output).toContain('décroissante');
		expect(output).toContain('+∞');
		expect(output).not.toContain('decroissante');
		expect(output).not.toMatch(BARE_INF);
		expect(output).not.toContain('Derivee');
	});

	it('x + 1/x : croissante et décroissante, extremums dits', () => {
		const latex = allLatex(run('.variations x+1/x'));
		expect(latex).toContain('\\text{croissante}');
		expect(latex).toContain('\\text{décroissante}');
		expect(latex).toContain('\\text{maximum local}');
		expect(latex).toContain('f(-1) = -2');
		expect(latex).toContain('f(1) = 2');
	});

	it('x² − 3x + 1 sur ℝ : le tableau de variations dessiné', () => {
		const outcome = run('.variations x^2-3x+1');
		expect(outcome.table).toBeDefined();
		expect(allLatex(outcome)).toContain('\\mathbb{R}');
	});
});

describe('le bouton « Variations » dit la même chose que la commande', () => {
	it('f(x) = 1/(2x-1) : LaTeX et étapes, jamais le texte du terminal seul', () => {
		const s = session();
		runInput(s, 'f(x) = 1/(2x-1)');
		const outcome = runAction(s, 'variations', 'f');
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		const latex = allLatex(outcome);
		expect(latex).toContain(']-\\infty ; \\dfrac{1}{2}[');
		expect(latex).toContain(']\\dfrac{1}{2} ; +\\infty[');
		expect(latex).not.toMatch(BARE_INF);
	});
});

describe('le tableau de variations dessine les valeurs interdites', () => {
	it.each(['.variations 1/(2x-1)', '.variations x+1/x', '.variations (x+1)/(x-2)'])(
		'%s : un tableau',
		(input) => {
			expect(run(input).table).toBeDefined();
		}
	);
});

describe('limites en ±∞ : pas de côté', () => {
	it('`x \\to -\\infty`, jamais `-\\infty^{+}`', () => {
		const latex = allLatex(run('.variations 1/(2x-1)'));
		expect(latex).toContain('\\lim_{x \\to -\\infty} f(x) = 0');
		expect(latex).not.toContain('\\infty^{');
	});
});

describe('virgule décimale', () => {
	it('`.variations 1/(x-0.5)` : 0{,}5 dans le LaTeX', () => {
		const latex = allLatex(run('.variations 1/(x-0.5)'));
		expect(latex).not.toMatch(/\d\.\d/);
	});
});

// =============================================================================
// Revue : f′ réduite, intervalles du signe, texte lisible
// =============================================================================

describe('f′ affichée réduite : son signe se lit', () => {
	it.each([
		['.variations (x+1)/(x-2)', /^f'\(x\) = \\dfrac\{-3\}\{\\left\( x - 2 \\right\)\^2\}$/],
		['.variations (x^2+1)/x', /^f'\(x\) = \\dfrac\{x\^2 - 1\}\{x\^2\}$/],
		[
			'.variations x^2/(x-1)',
			/^f'\(x\) = \\dfrac\{(x\^2 - 2 x|x \\left\( x - 2 \\right\))\}\{\\left\( x - 1 \\right\)\^2\}$/
		]
	])('%s', (input, expected) => {
		expect(run(input).latex).toMatch(expected);
	});

	it('le bouton aussi', () => {
		const s = session();
		runInput(s, 'g(x) = x^2/(x-1)');
		const outcome = runAction(s, 'variations', 'g');
		expect(outcome.ok && outcome.latex).toMatch(
			/^g'\(x\) = \\dfrac\{(x\^2 - 2 x|x \\left\( x - 2 \\right\))\}/
		);
	});
});

describe('√(x²−1) : f′ n’existe pas en ±1', () => {
	it('le signe de f′ sur des intervalles ouverts, les variations jusqu’à la borne', () => {
		const latex = allLatex(run('.variations sqrt(x^2-1)'));
		expect(latex).toContain("\\text{sur } ]-\\infty ; -1[ \\text{, } f'(x) < 0");
		expect(latex).toContain("\\text{sur } ]1 ; +\\infty[ \\text{, } f'(x) > 0");
		expect(latex).toContain('\\text{décroissante} \\text{ sur } ]-\\infty ; -1]');
		expect(latex).toContain('\\text{croissante} \\text{ sur } [1 ; +\\infty[');
		expect(latex).not.toContain("-1] \\text{, } f'(x)");
	});
});

describe('le texte de la ligne : notation lisible', () => {
	it("`f'(x) = -2/(2x-1)^2`, sans accolades", () => {
		const { output } = run('.variations 1/(2x-1)');
		expect(output).toContain("f'(x) = -2/(2x-1)^2");
		// Les accolades d'ensemble (ℝ \ {1/2}) restent ; celles de la notation maison, non
		expect(output).not.toContain('}/{');
		expect(output).not.toContain('{-2}');
	});

	it('la dérivée du texte est réduite aussi', () => {
		expect(run('.variations x^2/(x-1)').output).toMatch(/f'\(x\) = \(x\^2-2x\)\/\(x-1\)\^2/);
	});
});
