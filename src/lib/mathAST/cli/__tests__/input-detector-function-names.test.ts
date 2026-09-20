/**
 * Détection de format : noms de fonction collés à un nombre ou suivis de `^`.
 *
 * Bug du relevé du 2026-09-20 (§6.2) : `2sqrt(2)` était envoyé au parseur
 * LaTeX, qui le lisait `2·s·q·r·t·(2)`. La regex de détection exigeait une
 * frontière de mot avant le nom de fonction et une parenthèse juste après.
 */

import { describe, it, expect } from 'vitest';
import { detectInputFormat } from '../core/input-detector';
import { parse } from '../core/pipeline';

describe('detectInputFormat — noms de fonction sans backslash', () => {
	it.each([
		'2sqrt(2)',
		'2sin(x)',
		'xsin(x)',
		'3ln(x)',
		'2exp(x)',
		'sin^2(x)',
		'cos^2(x)+sin^2(x)',
		'2sqrt(2)+1'
	])('%s est de la syntaxe maison', (input) => {
		const result = detectInputFormat(input);
		expect(result.format).toBe('custom');
		expect(result.confidence).toBeGreaterThan(0.8);
	});

	it('un nom de fonction avec backslash reste du LaTeX', () => {
		expect(detectInputFormat('2\\sqrt{2}').format).toBe('latex');
		expect(detectInputFormat('\\sin^2(x)').format).toBe('latex');
	});
});

describe('parse — 2sqrt(2) est 2 × √2, pas cinq variables', () => {
	it('2sqrt(2) donne une multiplication dont le facteur droit est la fonction sqrt', () => {
		const { ast, errors } = parse('2sqrt(2)');
		expect(errors).toHaveLength(0);
		expect(ast?.type).toBe('multiplication');
		if (ast?.type !== 'multiplication') return;
		expect(ast.left).toEqual(expect.objectContaining({ type: 'number', value: '2' }));
		expect(ast.right).toEqual(expect.objectContaining({ type: 'function', name: 'sqrt' }));
	});

	it('sin^2(x) donne la fonction sin élevée au carré', () => {
		const { ast } = parse('sin^2(x)');
		// Forme produite par le parseur maison pour `f^n(x)` : nœud function avec power
		expect(ast).toEqual(
			expect.objectContaining({
				type: 'function',
				name: 'sin',
				power: expect.objectContaining({ type: 'number', value: '2' })
			})
		);
	});
});
