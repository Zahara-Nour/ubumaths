/**
 * `simplify()` sur les cas du relevé du 2026-09-20 que les 4 bugs bloquaient.
 *
 * Chaque cas est une ligne du panel de `docs/wip/simplify-reecriture-releve.md`.
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { toCustom } from '../../custom-generator';
import { tryMatch } from '../../pattern/match';
import { trigPythagoreanRules } from '../../pattern/rule-sets/trig-identities';

const latex = (s: string) => toLatex(simplify(parseLatex(s)).result);
const custom = (s: string) => toCustom(simplify(parseCustom(s)).result);

describe('bug 2 — sin²(x)+cos²(x) → 1 quelle que soit l’écriture', () => {
	it('LaTeX \\sin^2(x)+\\cos^2(x) (déjà vert avant le correctif)', () => {
		expect(latex('\\sin^2(x)+\\cos^2(x)')).toBe('1');
	});

	it('LaTeX \\sin(x)^2+\\cos(x)^2', () => {
		expect(latex('\\sin(x)^2+\\cos(x)^2')).toBe('1');
	});

	it('maison sin(x)^2+cos(x)^2', () => {
		expect(custom('sin(x)^2+cos(x)^2')).toBe('1');
	});

	it('maison cos(x)^2+sin(x)^2 (ordre inverse)', () => {
		expect(custom('cos(x)^2+sin(x)^2')).toBe('1');
	});

	// Bug distinct, hors des 4 du relevé (mesuré le 2026-09-20) : sur
	// cosh²−sinh², la règle algébrique `diff-squares-symbolic` tire AVANT
	// `hyperbolic-pythagorean` et produit (cosh+sinh)(cosh−sinh), que
	// post-normalize replie sur l'entrée. Le motif hyperbolique, lui, apparie.
	it.todo('hyperbolique : cosh(x)^2-sinh(x)^2 → 1 (masqué par diff-squares-symbolic)');

	it('le motif pythagorean apparie la forme superscript', () => {
		const rule = trigPythagoreanRules.find((r) => r.name === 'pythagorean');
		expect(rule).toBeDefined();
		// tryMatch rend `undefined` quand le motif n'apparie pas : toBeDefined, pas not.toBeNull
		expect(tryMatch(rule!.pattern, parseCustom('sin(x)^2+cos(x)^2'))).toBeDefined();
	});
});

describe('bug 1 — quotients à coefficients', () => {
	it('(2x)/(4y) → x/(2y)', () => {
		expect(custom('(2x)/(4y)')).toBe('x/(2y)');
	});

	it('(-x)/(-y) → x/y', () => {
		expect(custom('(-x)/(-y)')).toBe('x/y');
	});
});

describe('bug 4 — l’unité survit à simplify', () => {
	it('12[km] → 12[km]', () => {
		expect(custom('12[km]')).toBe('12[km]');
	});

	it('12[km]+3[km] → 15[km]', () => {
		expect(custom('12[km]+3[km]')).toBe('15[km]');
	});
});
