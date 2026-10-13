/**
 * Délimiteurs \left … \right dans le PDF (relevé par David sur /test-font, 2026-10-13).
 *
 * `\left\{ … \right\}` devenait `brace.l … brace.r`, et les crochets d'un intervalle
 * `bracket.l`/`bracket.r` : des symboles que Typst ne fait PAS grandir (seuls les
 * délimiteurs tapés tels quels, comme `(`, le sont). `S = {-π/4 ; π/4}` gardait des
 * accolades de la taille d'une lettre autour de deux fractions, dans toutes les fiches.
 * `lr(…)` les fait grandir ; dans ses arguments, `;` sépare des lignes et `,` des
 * arguments : ils deviennent `semi` et `","` (essais compilés le 2026-10-13).
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToTypstMath } from '../typst-generator';

/** Contenu direct du premier `lr(…)`, sans ce qui est imbriqué dans ses parenthèses */
function lrTopLevel(typst: string): string {
	const start = typst.indexOf('lr(');
	if (start === -1) return '';
	let depth = 0;
	let out = '';
	for (let i = start + 3; i < typst.length; i++) {
		const char = typst[i];
		if (char === '(') depth++;
		else if (char === ')') {
			if (depth === 0) return out;
			depth--;
		} else if (depth === 0) out += char;
	}
	return out;
}

describe('\\left\\{ … \\right\\} : accolades qui grandissent', () => {
	it('ensemble de deux fractions : lr(brace.l … brace.r)', () => {
		const out = convertLatexToTypstMath(
			'S=\\left\\{-\\dfrac{\\pi}{4}~;~\\dfrac{\\pi}{4}\\right\\}'
		);
		expect(out).toMatch(/lr\(\s*brace\.l .* brace\.r\s*\)/);
	});

	it("le « ; » de l'ensemble devient semi (sinon Typst lit une matrice)", () => {
		const out = convertLatexToTypstMath('S = \\left\\{ 1 \\,;\\, 2 \\right\\}');
		expect(lrTopLevel(out)).not.toContain(';');
		expect(lrTopLevel(out)).toContain('semi');
	});

	it('\\left\\lbrace … \\right\\rbrace aussi', () => {
		expect(convertLatexToTypstMath('\\left\\lbrace x \\right\\rbrace')).toMatch(
			/^lr\(\s*brace\.l\s+x\s+brace\.r\s*\)$/
		);
	});

	it('virgule décimale dans l\'ensemble : "," (une virgule nue séparerait deux arguments)', () => {
		const out = convertLatexToTypstMath('\\left\\{ -1{,}5 \\,;\\, 2{,}5 \\right\\}');
		expect(lrTopLevel(out)).not.toMatch(/(?<!")[,](?!")/);
		expect(out).toContain('1","5');
	});

	it('\\{ … \\} sans \\left reste à sa taille, comme en LaTeX', () => {
		expect(convertLatexToTypstMath('\\{ x \\}')).not.toContain('lr(');
	});
});

describe('\\left[ … \\right] et intervalles à la française : crochets qui grandissent', () => {
	it(']-∞ ; -2-√19/2] : lr(bracket.r … bracket.r)', () => {
		const out = convertLatexToTypstMath('\\left]-\\infty~;~-2-\\dfrac{\\sqrt{19}}{2}\\right]');
		expect(out).toMatch(/lr\(\s*bracket\.r .* bracket\.r\s*\)/);
		expect(lrTopLevel(out)).not.toContain(';');
	});

	it('[0 ; 1[ : lr(bracket.l … bracket.l)', () => {
		const out = convertLatexToTypstMath('\\left[0;\\dfrac{1}{2}\\right[');
		expect(out).toMatch(/lr\(\s*bracket\.l .* bracket\.l\s*\)/);
	});

	it('[a, b] : la virgule de premier niveau protégée, celles de frac intactes', () => {
		const out = convertLatexToTypstMath('\\left[a, \\frac{1}{2}\\right]');
		expect(lrTopLevel(out)).not.toMatch(/(?<!")[,](?!")/);
		expect(out).toContain('frac(1, 2)');
	});

	it('crochets sans \\left : inchangés', () => {
		expect(convertLatexToTypstMath(']-\\infty~;~1[')).toBe('bracket.r -infinity semi 1 bracket.l');
	});
});
