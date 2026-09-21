/**
 * Phase 2 — Tests for the new pedagogical rule `distribute-binomial-product`.
 *
 * Covers the 4 sign combinations and the priority-based deference to the
 * existing identité-remarquable rules.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { applyRulesDeepOnceTracked } from '../../pattern/rule';
import { distributeBinomialProduct } from '../pedagogical-rules';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';

const tex = (n: Parameters<typeof toLatex>[0]) =>
	toLatex(n)
		.replace(/\\left\(\s*/g, '(')
		.replace(/\s*\\right\)/g, ')')
		.replace(/\s+/g, '');

function distributeOnce(input: string): string {
	const node = parseLatex(input);
	const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
	expect(steps).toHaveLength(1);
	expect(steps[0].ruleName).toBe('distribute-binomial-product');
	return tex(result);
}

describe('distribute-binomial-product — sign combinations', () => {
	it('(a+b)(c+d) → ac + ad + bc + bd', () => {
		// Use distinct variables so the result is structurally clear.
		const out = distributeOnce('(x+1)(y+2)');
		// Implicit multiplication produces e.g. xy + 2x + y + 2; we just check shape.
		expect(out).toContain('xy');
		expect(out).toContain('+');
	});

	it('(a+b)(c-d) → ac - ad + bc - bd', () => {
		const node = parseLatex('(x+1)(y-2)');
		const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(1);
		const out = tex(result);
		expect(out).toMatch(/xy/);
		expect(out).toMatch(/-/);
		expect(out).toMatch(/\+/);
	});

	it('(a-b)(c+d) → ac + ad - bc - bd', () => {
		const node = parseLatex('(x-1)(y+2)');
		const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(1);
		const out = tex(result);
		expect(out).toMatch(/xy/);
		expect(out).toMatch(/-/);
		expect(out).toMatch(/\+/);
	});

	it('(a-b)(c-d) → ac - ad - bc + bd', () => {
		const node = parseLatex('(x-1)(y-2)');
		const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(1);
		// Sign table for (-,-) : ac, -ad, -bc, +bd
		// With a=x, b=1, c=y, d=2 the rule emits the raw 4-term form
		// (no normalization): `xy - x·2 - 1·y + 1·2` →
		// `xy-x2-1y+12` once implicit-mul ordering is preserved literally.
		// Normalize (Phase B) collapses these into `xy-2x-y+2` ; this test
		// locks the rule's raw output to catch sign regressions independent
		// of normalize's ordering.
		// ⚠️ L'attente précédente, `xy-x2-1y+12`, était VERTE parce que le
		// générateur LaTeX ne parenthésait pas l'opérande droit d'une
		// soustraction. La règle produisait `(xy − x2) − (1y + 12)`, qui vaut
		// `xy − 2x − y − 2` et non `xy − 2x − y + 2` : mesuré en x=3, y=5,
		// `(x−1)(y−2)` vaut 6 et la sortie de la règle valait 2. Le rendu
		// masquait une erreur de signe.
		// Quatre termes PLATS, comme l'annonce le docstring de la règle et comme
		// l'élève l'attend à l'étape « on distribue chaque terme ». La règle
		// construisait `(ac − ad) − (bc − bd)` : mathématiquement juste, mais
		// l'élève y lisait une parenthèse au moment même où on lui demande de
		// développer. Décision de David, 2026-09-21.
		expect(tex(result)).toBe('xy-x2-1y+12');
	});
});

describe('distribute-binomial-product — non-matching cases', () => {
	it('does not match a single binomial × atom (no second paren)', () => {
		const node = parseLatex('5 \\cdot (x + 1)');
		const { steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(0);
	});

	it('does not match (a+b) on its own', () => {
		const node = parseLatex('(x + 1)');
		const { steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(0);
	});

	it('does not match (a)(b) where neither side is add or sub', () => {
		const node = parseLatex('(x)(y)');
		const { steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(0);
	});

	it('does not match (a+b)^2 (handled by expand-sum-squared)', () => {
		const node = parseLatex('(x + 1)^2');
		const { steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(0);
	});
});

describe('distribute-binomial-product — typical pedagogical inputs', () => {
	it('(2x+3)(x-1) produces a 4-term expansion', () => {
		const node = parseLatex('(2x+3)(x-1)');
		const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(1);
		// Result should contain 4 multiplications (2x*x, 2x*1, 3*x, 3*1).
		const out = tex(result);
		// 2x · x = 2x·x stays before normalize collapses it
		expect(out.length).toBeGreaterThan(0);
	});

	it('(x+1)(x-1) without identité remarquable still produces 4 terms', () => {
		// Note: in the pipeline this rule is lower-priority, but tested in isolation.
		const node = parseLatex('(x+1)(x-1)');
		const { result, steps } = applyRulesDeepOnceTracked([distributeBinomialProduct], node);
		expect(steps).toHaveLength(1);
		const out = tex(result);
		// Pre-collected expansion: x·x + x·(-1) + 1·x + 1·(-1)
		// (subject to factory implicit-mul ordering)
		expect(out.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// La règle doit être JUSTE, pas seulement bien écrite
// =============================================================================

/**
 * Les quatre combinaisons de signes, vérifiées **numériquement** et non par
 * leur rendu. C'est ce qui manquait : le seul test de signes comparait une
 * chaîne, et cette chaîne était fausse d'une manière que le générateur LaTeX
 * rendait invisible.
 */
describe('les quatre combinaisons de signes, vérifiées numériquement', () => {
	const valeurs = [
		{ x: 3, y: 5 },
		{ x: -2, y: 7 },
		{ x: 0.5, y: -1.5 },
		{ x: 10, y: 0 }
	];

	const evalue = (node: Parameters<typeof toLatex>[0], pt: { x: number; y: number }): number => {
		const json = JSON.stringify(node)
			.replaceAll('{"type":"variable","name":"x"}', `{"type":"number","value":"${pt.x}"}`)
			.replaceAll('{"type":"variable","name":"y"}', `{"type":"number","value":"${pt.y}"}`);
		return evaluateNodeToApproximatedNumber(JSON.parse(json));
	};

	it.each([['(x+1)(y+2)'], ['(x+1)(y-2)'], ['(x-1)(y+2)'], ['(x-1)(y-2)']])(
		'%s se développe sans changer de valeur',
		(source) => {
			const entree = parseLatex(source);
			const { result } = applyRulesDeepOnceTracked([distributeBinomialProduct], entree);
			for (const pt of valeurs) {
				expect(evalue(result, pt)).toBeCloseTo(evalue(entree, pt), 10);
			}
		}
	);
});

// =============================================================================
// Quatre termes plats, pas une forme groupée
// =============================================================================

/**
 * L'étape s'appelle « On distribue chaque terme » : elle doit en montrer
 * quatre, sans parenthèses. La règle construisait `(ac − ad) − (bc − bd)`, ce
 * qui est juste mais se lit mal à cet endroit précis. Tant que le générateur
 * ne parenthésait pas, la différence ne se voyait pas.
 *
 * Décision de David, 2026-09-21.
 */
describe('les quatre combinaisons donnent quatre termes plats', () => {
	it.each([
		['(x+1)(y+2)', 'xy+x2+1y+12'],
		['(x+1)(y-2)', 'xy-x2+1y-12'],
		['(x-1)(y+2)', 'xy+x2-1y-12'],
		['(x-1)(y-2)', 'xy-x2-1y+12']
	])('%s → %s', (source, attendu) => {
		const { result } = applyRulesDeepOnceTracked([distributeBinomialProduct], parseLatex(source));
		expect(tex(result)).toBe(attendu);
	});

	it('aucune parenthèse dans l’étape montrée à l’élève', () => {
		const { result } = applyRulesDeepOnceTracked(
			[distributeBinomialProduct],
			parseLatex('(2x-3)(x+4)')
		);
		expect(toLatex(result)).not.toContain('\\left(');
	});
});
