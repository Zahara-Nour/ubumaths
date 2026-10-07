/**
 * `cbrt(x)` est la racine cubique : un nœud `sqrt` d'indice 3, exactement
 * comme `sqrt[3](x)`.
 *
 * Avant (mesuré le 2026-10-07 dans l'atelier) : `cbrt` n'était pas dans la
 * table des fonctions du tokeniseur, et `cbrt(x)` se lisait c·b·r·t·x — la
 * dérivée affichait « b c r t », sans aucune erreur.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom } from '../index';
import { toLatex } from '../../../latex-generator';
import { hashMathNode } from '../../../normal';

describe('cbrt(x) = racine cubique', () => {
	it('se lit comme sqrt[3](x)', () => {
		expect(hashMathNode(parseCustom('cbrt(x)'))).toBe(hashMathNode(parseCustom('sqrt[3](x)')));
	});

	it('rend \\sqrt[3]{…} en LaTeX', () => {
		expect(toLatex(parseCustom('2cbrt(3x+1)'))).toBe('2 \\sqrt[3]{3 x + 1}');
	});

	it('n’est pas un produit de lettres', () => {
		expect(JSON.stringify(parseCustom('cbrt(x)'))).not.toContain('"name":"c"');
	});
});
