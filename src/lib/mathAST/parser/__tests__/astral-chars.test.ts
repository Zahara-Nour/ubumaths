/**
 * Caractères hors du plan de base (𝔻 = U+1D53B) : deux unités de code UTF-16.
 *
 * Les tokenizers lisaient une unité de code à la fois : `$𝔻$` devenait deux « lettres »
 * (moitiés de paire de substitution), réécrites `\ud835 \udd3b`, deux caractères cassés
 * dans l'énoncé comme dans le corrigé (relevé sur la logique 1re SPE, 2026-10-03).
 */

import { describe, it, expect } from 'vitest';
import { parseCustomSafe, parseLatexSafe, toLatex } from '$lib/mathAST';

const roundTrip = (parse: typeof parseCustomSafe, input: string) => {
	const result = parse(input);
	if (!result.ast) throw new Error(`analyse impossible : ${input}`);
	return toLatex(result.ast, { preserveHoles: true });
};

describe.each([
	['parseur maison', parseCustomSafe],
	['parseur LaTeX', parseLatexSafe]
])('%s : un caractère hors BMP reste entier', (_name, parse) => {
	it.each(['𝔻', 'ℝ', 'ℕ'])('%s', (symbol) => {
		expect(roundTrip(parse, symbol)).toBe(symbol);
	});

	it('aucune moitié de paire de substitution isolée', () => {
		const out = roundTrip(parse, '𝔻');
		expect(out).not.toMatch(/[\uD800-\uDFFF](?![\uDC00-\uDFFF])/u);
		expect([...out]).toEqual(['𝔻']);
	});
});

describe('parseur LaTeX : 𝔻 dans une formule', () => {
	it('x\\in 𝔻', () => {
		expect(roundTrip(parseLatexSafe, 'x\\in 𝔻')).toBe('x \\in 𝔻');
	});
});
