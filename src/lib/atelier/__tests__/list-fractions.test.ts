/**
 * Fractions dans les listes de l'atelier (Q45, 2026-10-02).
 *
 * Avant : `1/6` était IGNORÉ (une liste n'acceptait que des nombres en clair),
 * si bien qu'un dé ne pouvait pas y être saisi en sixièmes et que « Loi avec
 * probabilités M » refusait 0,1667 (somme 1,0002).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { isList, type ListObject } from '../types';
import { listChart } from '../chart';
import { buildStatChartScene, type BarScene } from '$lib/ubumark/utils/stat-chart-scene';

function listOf(definition: string): ListObject {
	const atelier = new Atelier();
	atelier.create({ kind: 'list', name: 'L', definition });
	const list = atelier.get('L');
	if (list === undefined || !isList(list)) throw new Error('pas de liste');
	return list;
}

describe('une liste accepte les fractions d’entiers', () => {
	it('un dé en sixièmes : 6 valeurs, aucune ignorée', () => {
		const list = listOf('1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6');

		expect(list.values).toHaveLength(6);
		expect(list.values[0]).toBeCloseTo(1 / 6, 15);
		expect(list.skipped).toBe(0);
	});

	it('fractions négatives, mêlées aux décimaux', () => {
		expect(listOf('-3/4 ; 12/5 ; 0,5').values).toEqual([-0.75, 2.4, 0.5]);
	});

	it('1/0 reste ignoré', () => {
		const list = listOf('1 ; 1/0');

		expect(list.values).toEqual([1]);
		expect(list.skipped).toBe(1);
	});

	it('seulement des fractions d’entiers : 1,5/2 et 1/2/3 sont ignorés', () => {
		expect(listOf('1,5/2 ; 1/2/3 ; 4').values).toEqual([4]);
	});

	it('le champ garde le texte saisi', () => {
		expect(listOf('1/6 ; 5/6').definition).toBe('1/6 ; 5/6');
	});
});

describe('ce que les fractions permettent', () => {
	it('« Loi avec probabilités M » sur un dé en sixièmes : E = 7/2, V = 35/12', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3 ; 4 ; 5 ; 6' });
		atelier.create({ kind: 'list', name: 'M', definition: '1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6 ; 1/6' });
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('law:M', 'L');

		expect(desk.entries[0].failed).toBe(false);
		expect(desk.entries[0].text.split('\n').slice(0, 2)).toEqual([
			'E(L) = 7/2 = 3,5',
			'V(L) = 35/12 ≈ 2,92'
		]);
	});

	// Revue : un arrondi à 2 décimales confondait 0,331 et 0,334 (« catégorie déjà
	// donnée ») et faisait calculer la moyenne sur 0,33. Une valeur qui est une
	// fraction simple sans décimal exact s'écrit en fraction ; les autres comme avant.
	it('diagramme en bâtons : 1/3 s’écrit « 1/3 », les décimaux restent exacts', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1/3 ; 1/3 ; 1 ; 0,331 ; 0,334' });
		const chart = listChart(atelier, 'L', null);

		expect(chart.ok && chart.node.spec?.data.map((d) => d.label)).toEqual([
			'0,331',
			'1/3',
			'0,334',
			'1'
		]);
	});

	it('la moyenne sous le diagramme est celle des valeurs exactes', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1/3 ; 1/3 ; 1' });
		const chart = listChart(atelier, 'L', null);
		if (!chart.ok || chart.node.spec === null) throw new Error('diagramme attendu');
		const scene = buildStatChartScene(chart.node.spec) as BarScene;

		// (1/3 + 1/3 + 1) / 3 = 5/9 ≈ 0,56 (et non 0,55 avec des 0,33)
		expect(scene.indicators).toContain('Moyenne ≈ 0,56');
	});

	it('un effectif n’est jamais arrondi : 1,004 reste refusé', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		atelier.create({ kind: 'list', name: 'M', definition: '1,004 ; 2' });

		expect(listChart(atelier, 'L', 'M').ok).toBe(false);
	});
});
