/**
 * Les curseurs — lot 4 du passage de `/grapheur` par l'atelier.
 *
 * Phase 0 `docs/wip/atelier-grapheur-phase0.md` §4 (K1 à K3, E1, L1). Solde la
 * dette n° 2 du chantier : `build()` recréait le curseur à chaque modification
 * de la définition, et les bornes réglées par l'élève s'effaçaient.
 *
 * Mesuré avant d'écrire : `a = 0,5` est lu 0,5 (`f(x) = a·x` vaut `0.5*x`) —
 * le curseur écrit donc la valeur avec la virgule.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { expressionOf } from '../engine';
import { actionsFor } from '../actions';
import { mergeInto } from '../merge';
import { isValue } from '../types';

// =============================================================================
// Décor
// =============================================================================

function withA(definition = '2'): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'a', definition }, 'text');
	atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
	return atelier;
}

function sliderOf(atelier: Atelier, name = 'a') {
	const object = atelier.get(name);
	if (!object || !isValue(object)) throw new Error(`${name} n'est pas une valeur`);
	return object.slider;
}

function expression(atelier: Atelier, name: string) {
	const result = expressionOf(atelier, name);
	return result.ok ? result.expression : undefined;
}

// =============================================================================
// K1 / E1 : régler les bornes et le pas
// =============================================================================

describe('régler le curseur', () => {
	it('change les bornes et le pas', () => {
		const atelier = withA();

		const result = atelier.setSlider('a', { min: 0, max: 5, step: 0.5 });

		expect(result.ok).toBe(true);
		expect(sliderOf(atelier)).toEqual({ min: 0, max: 5, step: 0.5 });
	});

	it('compte comme une modification (la sauvegarde l’écoute)', () => {
		const atelier = withA();
		const before = atelier.revision;

		atelier.setSlider('a', { max: 20 });

		expect(atelier.revision).toBeGreaterThan(before);
	});

	// E1
	it.each([
		['un minimum supérieur au maximum', { min: 5, max: 1 }],
		['des bornes égales', { min: 3, max: 3 }],
		['un pas nul', { step: 0 }],
		['un pas négatif', { step: -1 }],
		['un pas plus grand que l’intervalle', { step: 50 }],
		['une borne infinie', { max: Infinity }],
		['une borne au-delà de 1e9', { min: -1e10 }]
	])('refuse %s, et garde l’ancien réglage', (_, patch) => {
		const atelier = withA();
		const before = sliderOf(atelier);

		const result = atelier.setSlider('a', patch);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).not.toBe('');
		expect(sliderOf(atelier)).toEqual(before);
	});

	// D4 : une grandeur n'a pas de curseur
	it('refuse sur une grandeur, et sur ce qui n’est pas une valeur', () => {
		const atelier = withA();
		atelier.create({ kind: 'value', name: 'd', definition: '12[km]' }, 'url');

		expect(atelier.setSlider('d', { max: 5 }).ok).toBe(false);
		expect(atelier.setSlider('f', { max: 5 }).ok).toBe(false);
		expect(atelier.setSlider('z', { max: 5 }).ok).toBe(false);
	});
});

// =============================================================================
// K2 : bouger le curseur
// =============================================================================

describe('bouger le curseur', () => {
	it('change la valeur, et les fonctions qui la citent suivent', () => {
		const atelier = withA('2');

		const result = atelier.slideTo('a', 2.5);

		expect(result.ok).toBe(true);
		expect(atelier.get('a')?.definition).toBe('2,5');
		expect(expression(atelier, 'f')).toBe('2.5*x');
	});

	it('arrondit au pas : pas de 0,30000000000000004', () => {
		const atelier = withA();

		atelier.slideTo('a', 0.1 + 0.2);

		expect(atelier.get('a')?.definition).toBe('0,3');
	});

	it('reste dans les bornes', () => {
		const atelier = withA();

		atelier.slideTo('a', 42);

		expect(atelier.get('a')?.definition).toBe('10');
	});

	// Écrire un nombre sur `a = b + 1` effacerait la formule de l'élève
	it('refuse sur une valeur calculée', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'b', definition: '1' }, 'text');
		atelier.create({ kind: 'value', name: 'a', definition: 'b+1' }, 'text');

		expect(atelier.slideTo('a', 3).ok).toBe(false);
		expect(atelier.get('a')?.definition).toBe('b+1');
	});
});

// =============================================================================
// K3, L1 : la définition change, le curseur reste
// =============================================================================

describe('le curseur survit à la définition', () => {
	// K3 : la dette n° 2
	it('modifier la valeur garde les bornes réglées', () => {
		const atelier = withA();
		atelier.setSlider('a', { min: 0, max: 5, step: 0.5 });

		atelier.update('a', '3', 'text');

		expect(sliderOf(atelier)).toEqual({ min: 0, max: 5, step: 0.5 });
	});

	// L1
	it('une valeur tapée hors des bornes les élargit', () => {
		const atelier = withA();

		atelier.update('a', '25', 'text');

		expect(sliderOf(atelier)).toMatchObject({ min: -10, max: 25 });
	});

	it('vers le bas aussi', () => {
		const atelier = withA();

		atelier.update('a', '-40', 'text');

		expect(sliderOf(atelier)).toMatchObject({ min: -40, max: 10 });
	});
});

// =============================================================================
// Rangement, lien, fusion
// =============================================================================

describe('le curseur se range', () => {
	it('se range et se relit', () => {
		const atelier = withA();
		atelier.setSlider('a', { min: 0, max: 5, step: 0.5 });

		const fresh = new Atelier();
		fresh.restore(atelier.serialize());

		expect(sliderOf(fresh)).toEqual({ min: 0, max: 5, step: 0.5 });
	});

	it('ne coûte rien quand il garde ses réglages par défaut', () => {
		const atelier = withA();

		const stored = atelier.serialize().objects.find((o) => o.name === 'a');

		expect(stored).not.toHaveProperty('slider');
	});

	it('suit sa valeur dans une fusion', () => {
		const source = withA();
		source.setSlider('a', { min: 0, max: 5, step: 0.5 });
		const target = new Atelier();

		mergeInto(target, source.serialize());

		expect(sliderOf(target)).toEqual({ min: 0, max: 5, step: 0.5 });
	});
});

// =============================================================================
// Le bouton « Régler le curseur » cède la place au curseur de la carte
// =============================================================================

describe('l’action', () => {
	it('« Régler le curseur » n’est plus un bouton : le curseur est dans la carte', () => {
		const atelier = withA();

		const ids = actionsFor(atelier.get('a')!, atelier).map((a) => a.id);

		expect(ids).not.toContain('slider');
	});
});
