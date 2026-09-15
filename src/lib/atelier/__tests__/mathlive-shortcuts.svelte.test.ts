/**
 * Ce que MathLive produit vraiment — la mesure derrière la décision D10.
 *
 * L'atelier lit du LaTeX quand la définition vient d'un champ de maths, et
 * passe par la détection quand elle vient d'ailleurs. Ces deux faits le
 * justifient, et un changement de version de MathLive les ferait rougir.
 *
 * Tourne dans un vrai navigateur (projet vitest « client »).
 */

import { describe, it, expect } from 'vitest';

describe('MathLive — ce qui justifie D10', () => {
	it('convertit les noms de fonctions en commandes LaTeX à la frappe', async () => {
		const { MathfieldElement } = await import('mathlive');
		const mf = new MathfieldElement();
		document.body.appendChild(mf);

		// Les raccourcis intégrés : taper « sin » écrit « \sin ». C'est ce qui
		// rend la lecture LaTeX sûre pour tout ce qui sort d'un champ de maths.
		const shortcuts = mf.inlineShortcuts as Record<string, unknown>;
		expect(shortcuts?.sin).toBe('\\sin');
		expect(shortcuts?.cos).toBe('\\cos');
		expect(shortcuts?.ln).toBe('\\ln');

		mf.remove();
	});

	it('ne normalise PAS une valeur injectée — d’où la normalisation au collage', async () => {
		const { MathfieldElement } = await import('mathlive');
		const mf = new MathfieldElement();
		document.body.appendChild(mf);

		// Un collage n'est pas de la frappe : les raccourcis ne s'appliquent pas.
		// « sin » resterait trois lettres italiques, lues « s·i·n » par le parseur.
		mf.setValue('sin(x)', { format: 'latex' });
		expect(mf.getValue('latex')).not.toContain('\\sin');

		mf.remove();
	});
});
