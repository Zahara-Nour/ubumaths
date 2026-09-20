/**
 * Une seule forme normale pour `sin²(x)`, quelle que soit l'écriture.
 *
 * Bug du relevé du 2026-09-20 (§6.4) : l'AST a deux formes pour une fonction
 * élevée à une puissance — `function` avec `power` (`\sin^2(x)`, `sin^2(x)`)
 * et `superscript(function, 2)` (`\sin(x)^2`, `sin(x)^2`). `normalize` les
 * hachait différemment (`F:sin(V(x))^N(2)` contre `F:sin(V(x))^2`), donc
 * `areEquivalent(\sin^2(x), \sin(x)^2)` était faux, et les règles de motif
 * écrites sur la première forme ne voyaient jamais la seconde.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { normalize } from '../normalize';
import { preprocess } from '../rules';
import { hashNormalForm } from '../hash';
import { denormalize } from '../denormalize';
import type { MathNode } from '../../types';

const hash = (node: MathNode) => hashNormalForm(normalize(preprocess(node)));

describe('sin²(x) — les deux écritures ont le même hash', () => {
	it('\\sin^2(x) et \\sin(x)^2 (LaTeX)', () => {
		expect(hash(parseLatex('\\sin^2(x)'))).toBe(hash(parseLatex('\\sin(x)^2')));
	});

	it('\\sin^2 x et \\sin(x)^2 (LaTeX sans parenthèses)', () => {
		expect(hash(parseLatex('\\sin^2 x'))).toBe(hash(parseLatex('\\sin(x)^2')));
	});

	it('sin^2(x) et sin(x)^2 (syntaxe maison)', () => {
		expect(hash(parseCustom('sin^2(x)'))).toBe(hash(parseCustom('sin(x)^2')));
	});

	it('LaTeX \\sin^2(x) et maison sin(x)^2', () => {
		expect(hash(parseLatex('\\sin^2(x)'))).toBe(hash(parseCustom('sin(x)^2')));
	});
});

describe('sin²(x) — areEquivalent', () => {
	it('\\sin^2(x) ≡ \\sin(x)^2', () => {
		expect(areEquivalent(parseLatex('\\sin^2(x)'), parseLatex('\\sin(x)^2'))).toBe(true);
	});

	it('\\sin^2(x)+\\cos^2(x) ≡ sin(x)^2+cos(x)^2', () => {
		expect(
			areEquivalent(parseLatex('\\sin^2(x)+\\cos^2(x)'), parseCustom('sin(x)^2+cos(x)^2'))
		).toBe(true);
	});

	it('\\sin^2(x) ≢ \\sin^3(x)', () => {
		expect(areEquivalent(parseLatex('\\sin^2(x)'), parseLatex('\\sin^3(x)'))).toBe(false);
	});
});

describe('sin²(x) — l’exposant est porté par le facteur (il se combine)', () => {
	it('\\sin^2(x)\\cdot\\sin(x) ≡ \\sin(x)^3', () => {
		expect(areEquivalent(parseLatex('\\sin^2(x)\\cdot\\sin(x)'), parseLatex('\\sin(x)^3'))).toBe(
			true
		);
	});

	it('\\frac{\\sin^2(x)}{\\sin(x)} ≡ \\sin(x)', () => {
		expect(areEquivalent(parseLatex('\\frac{\\sin^2(x)}{\\sin(x)}'), parseLatex('\\sin(x)'))).toBe(
			true
		);
	});

	it('après normalize → denormalize, \\sin^2(x) ressort en superscript', () => {
		const out = denormalize(normalize(preprocess(parseLatex('\\sin^2(x)'))));
		expect(out.type).toBe('superscript');
		if (out.type !== 'superscript') return;
		expect(out.base).toEqual(expect.objectContaining({ type: 'function', name: 'sin' }));
		expect(out.base).not.toHaveProperty('power');
	});
});
