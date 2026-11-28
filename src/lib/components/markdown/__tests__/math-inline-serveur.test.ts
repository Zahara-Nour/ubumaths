/**
 * Une formule découpée, rendue par le serveur.
 *
 * `convertLatexToSpeakableText` (MathLive) lit `window.MathfieldElement` : appelée
 * au rendu serveur, elle lève, et la page entière part en erreur 500
 * (`/aide-ecriture/blocs/ranger` au chargement direct, 2026-11-24). La lecture de
 * la formule entière n'est donc calculée que dans le navigateur.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import MathInline from '../nodes/MathInline.svelte';

// Lieu étroit (étapes à ranger) : les formules s'y découpent
vi.mock('../content-breakable-math', () => ({
	readBreakableMath: () => () => true
}));

describe('MathInline — rendu serveur d’une formule découpée', () => {
	it('rend les morceaux sans lever', () => {
		const { body } = render(MathInline, {
			props: { expression: 'a+b=c+d', syntax: 'latex' }
		});

		expect(body).toContain('inline-math-pieces');
		expect(body.match(/<math-span/g)?.length).toBeGreaterThan(1);
	});
});
