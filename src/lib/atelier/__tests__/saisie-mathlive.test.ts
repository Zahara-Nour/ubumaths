/**
 * Ce que la carte reçoit de MathLive — lot 2a du passage de `/grapheur` par
 * l'atelier (phase 0 §1 C5–C6, §2 D7).
 *
 * Mesuré le 2026-10-04 dans Chromium, frappe réelle (`userEvent.keyboard`) :
 *   f'(x)+1   → f^{\prime}\left(x\right)+1
 *   sin(x)    → \sin\left(x\right)
 *   a*x       → a\cdot x
 * Ces formes sont du LaTeX lu en provenance 'keyboard'. Avant ce lot, la
 * première était REFUSÉE : `f'` se lisait au clavier de Calcul, pas dans la carte.
 */

import { describe, it, expect } from 'vitest';
import { parseDefinition, referencesOf, astOf } from '../parse';

describe('saisie MathLive dans la carte', () => {
	it('lit la dérivée telle que MathLive l’écrit', () => {
		const definition = 'f^{\\prime}\\left(x\\right)+1';

		expect(parseDefinition('function', definition, 'keyboard', ['f']).error).toBeUndefined();
		expect(referencesOf(definition, 'keyboard', ['f'])).toEqual([{ name: 'f', as: 'function' }]);
	});

	it('lit la dérivée seconde', () => {
		const ast = astOf('f^{\\prime\\prime}\\left(x\\right)', 'keyboard', ['f']);

		expect(ast).toMatchObject({ type: 'function', name: 'f', derivativeOrder: 2 });
	});

	it('lit aussi la forme sans accolades', () => {
		const ast = astOf('f^\\prime(x)', 'keyboard', ['f']);

		expect(ast).toMatchObject({ type: 'function', name: 'f', derivativeOrder: 1 });
	});

	// En mode texte, l'atelier déclare ses noms de fonctions au parseur ; en
	// LaTeX, il ne le faisait pas : `k(x)` se lisait k·x dans la carte
	it('reconnaît une fonction de l’atelier hors des noms par défaut', () => {
		expect(referencesOf('k\\left(x\\right)+1', 'keyboard', ['k'])).toEqual([
			{ name: 'k', as: 'function' }
		]);
	});

	it('une puissance ordinaire reste une puissance', () => {
		const ast = astOf('x^{2}', 'keyboard', ['f']);

		expect(ast?.type).toBe('superscript');
	});
});
