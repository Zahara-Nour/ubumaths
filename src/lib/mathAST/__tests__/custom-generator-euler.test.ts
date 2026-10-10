/**
 * `toCustom` écrit la constante d'Euler `e`, que `parseCustom` relit comme Euler.
 *
 * Avant : `\euler`, que ni le parseur custom ni l'atelier ne lisaient
 * (« Unknown command: \euler »). Piège de la lettre : `2e-3` (2·e − 3) se
 * relirait `0.002` (notation scientifique) ; un espace devant le signe l'évite.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { parseCustom } from '../parser/custom';
import { toCustom } from '../custom-generator';
import { nodesEqual } from '../pattern/match';

describe('toCustom : la constante d’Euler s’écrit e', () => {
	it.each([
		['2e', '2e'],
		['3e^{-2x}', '3e^{-2x}'],
		['x e^{x}', 'xe^x'],
		['\\frac{e}{x}', 'e/x'],
		['2\\exponentialE-3', '2e -3'],
		['4.5\\exponentialE+1', '4.5e +1']
	])('%s s’écrit %s et se relit à l’identique', (latex, custom) => {
		const node = parseLatex(latex);
		expect(toCustom(node)).toBe(custom);
		expect(nodesEqual(parseCustom(toCustom(node)), node)).toBe(true);
	});
});
