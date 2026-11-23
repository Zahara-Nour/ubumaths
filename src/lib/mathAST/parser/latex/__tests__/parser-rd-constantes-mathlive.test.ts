/**
 * L21 (docs/wip/ecarts-a-trier.md) : le parseur rd lit `\imaginaryI` et
 * `\exponentialE` (écrits par MathLive) comme le parseur pratt, au lieu de
 * lever « Unknown command ».
 *
 * Chaque cas compare l'arbre rendu par rd à celui de pratt (la référence).
 */

import { describe, it, expect } from 'vitest';
import { parseLatexSafe } from '../../index';

describe('parseur rd : \\imaginaryI et \\exponentialE, comme pratt', () => {
	it.each([
		'\\imaginaryI',
		'\\exponentialE',
		'3\\imaginaryI',
		'2+5\\imaginaryI',
		'x\\imaginaryI',
		'\\exponentialE^x',
		'3\\exponentialE^{2x}',
		'4x\\exponentialE^{-x}',
		'\\textcolor{red}{\\exponentialE}'
	])('%s', (input) => {
		const rd = parseLatexSafe(input, { parser: 'rd' });
		const pratt = parseLatexSafe(input);
		expect(pratt.errors).toEqual([]);
		expect(rd.errors).toEqual([]);
		expect(rd.ast).toEqual(pratt.ast);
	});
});
