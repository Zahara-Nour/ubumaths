/**
 * Garde-fou de performance du recalcul (chantier perf du 2026-10-19).
 *
 * Mesuré sur Mac mini M6 (node) après le chantier : un cran du curseur `a` sur la
 * figure de 24 objets coûte ~3 ms (médiane), contre 36 ms avant. La borne de temps
 * est TRÈS large (50 ms) pour ne pas trembler en CI (runners 2-3× plus lents,
 * shards en concurrence) : elle n'attrape qu'un retour à l'ancien coût (36 ms en
 * local, ~100 ms en CI). Le vrai garde-fou est le compteur, indépendant de la
 * machine : un cran ne relit que les définitions dont il a besoin.
 */

import { describe, it, expect } from 'vitest';
import { perfStats } from '../perf-switches';
import { figure24 } from './fixtures/figure-24';
import { astOf } from '../parse';

function median(values: number[]): number {
	const sorted = [...values].sort((x, y) => x - y);
	return sorted[Math.floor(sorted.length / 2)];
}

describe('un cran de curseur sur la figure de 24 objets', () => {
	it('se recalcule en moins de 50 ms (médiane de 20 crans ; ~3 ms mesurés sur M6)', () => {
		const atelier = figure24();
		atelier.setSlider('a', { min: 0, max: 1, step: 0.01 });
		for (let i = 0; i < 5; i++) atelier.slideTo('a', 0.2 + i * 0.01);
		const times: number[] = [];
		for (let i = 0; i < 20; i++) {
			const start = performance.now();
			atelier.slideTo('a', 0.3 + i * 0.01);
			times.push(performance.now() - start);
		}
		expect(median(times)).toBeLessThan(50);
		expect(atelier.get('M')?.status).toBe('ok');
	});

	// Mesuré : 5 808 définitions liées par cran sans les raccourcis (chaque coordonnée
	// relisait les 24 définitions, mesures comprises), 3 avec. Borne large : 50.
	it('ne relit pas toutes les définitions pour chaque coordonnée citée', () => {
		const atelier = figure24();
		atelier.setSlider('a', { min: 0, max: 1, step: 0.01 });
		atelier.slideTo('a', 0.2);
		perfStats.boundDefinitions = 0;
		atelier.slideTo('a', 0.21);
		expect(perfStats.boundDefinitions).toBeLessThan(50);
	});

	// Le mémo des lectures rend un arbre PARTAGÉ : gelé en développement et en test,
	// toute écriture dans un arbre lu jette au lieu d'abîmer le mémo en silence
	it('une lecture mise en mémo est partagée, et gelée en test', () => {
		const first = astOf('2x + 1', 'text');
		expect(astOf('2x + 1', 'text')).toBe(first);
		expect(Object.isFrozen(first)).toBe(true);
	});
});
