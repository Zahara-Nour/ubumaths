/**
 * Détection de format : le signe du produit tapé tel quel (`·`, `⋅`, `×`).
 *
 * ⚠️ Relevé par le chantier registre-reference (2026-11-03) : `2·x + 3·x`
 * tombait dans le repli LaTeX, dont le parseur lit `·` comme une lettre —
 * `.dériver 2·x^2` répondait `4x·` au registre. Le parseur maison le lit `*`
 * (décision de David, 2026-10-20), comme l'Atelier.
 */

import { describe, it, expect } from 'vitest';
import { detectInputFormat } from '../core/input-detector';
import { WebReplEngine } from '../web/web-repl-engine';

describe('detectInputFormat — signe du produit', () => {
	it.each(['2·x+3·x', '(1/2)^x·(1/2)', '3⋅x', '3×4'])('%s : syntaxe maison', (input) => {
		expect(detectInputFormat(input).format).toBe('custom');
	});

	it('une commande LaTeX l’emporte toujours (`\\frac{1}{2}×x`)', () => {
		expect(detectInputFormat('\\frac{1}{2}×x').format).toBe('latex');
	});

	it.each([
		['.diff 2·x^2', '4 x'],
		['.simplify 2·x+3·x', '5 x'],
		['.simplify (1/2)^x·(1/2)', '\\left( \\dfrac{1}{2} \\right)^{x + 1}']
	])('le registre lit %s comme un produit', (line, expected) => {
		expect(new WebReplEngine().execute(line).answer).toBe(expected);
	});
});
