/**
 * Ce que la ligne « Variations » montre VRAIMENT à l'écran.
 *
 * ⚠️ Le défaut relevé par David était un défaut d'écran, pas de données : le
 * bloc texte du moteur s'affichait au-dessus du tableau et redisait presque
 * tout. Un test serveur ne peut pas voir ça — il faut monter le composant.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import CalculView from '$lib/components/atelier/CalculView.svelte';

let monte: Record<string, unknown> | null = null;
let cible: HTMLDivElement | null = null;

afterEach(() => {
	if (monte !== null) unmount(monte);
	cible?.remove();
	monte = null;
	cible = null;
});

function afficherVariations(definition: string): HTMLElement {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition });
	const desk = new CalcDesk(atelier);
	desk.runFromPanel('variations', 'f');

	cible = document.createElement('div');
	document.body.appendChild(cible);
	monte = mount(CalculView, { target: cible, props: { desk } });
	return cible;
}

describe('la ligne ne répète plus le tableau', () => {
	it('les six doublons ont disparu de l’écran', () => {
		const texte = afficherVariations('x^2 - 3x + 2').textContent ?? '';

		// Exactement ce que montrait la capture, au-dessus du tableau.
		expect(texte).not.toContain('Domaine');
		expect(texte).not.toContain('Points critiques');
		expect(texte).not.toContain('Signe de');
		expect(texte).not.toContain('Extrema');
		expect(texte).not.toContain('Limites aux bornes');
		expect(texte).not.toContain('Derivee');
	});

	it('le tableau, lui, est toujours là', () => {
		const racine = afficherVariations('x^2 - 3x + 2');

		expect(racine.querySelectorAll('table').length).toBeGreaterThan(0);
		expect(racine.innerHTML).not.toContain('ML__error');
	});

	it('la dérivée reste lisible en tête', () => {
		const racine = afficherVariations('x^2 - 3x + 2');

		// Rendue en mathématiques : le texte brut `f'(x) = 2 x - 3` ne doit PAS
		// apparaître tel quel, c'est MathLive qui le compose.
		expect(racine.querySelector('.math')).not.toBeNull();
	});
});

describe('sans tableau, le bloc reste', () => {
	it('une fonction à asymptote garde le texte du moteur', () => {
		const texte = afficherVariations('1/x').textContent ?? '';

		// ⚠️ Là, le bloc EST la réponse : le supprimer laisserait la ligne vide.
		expect(texte).toContain('Domaine');
	});
});
