/**
 * Tests de preuve du registre des écarts (docs/ecarts/registre.md), domaine
 * utilitaires (statistiques).
 *
 * Chaque test affirme le comportement ATTENDU d'un écart encore ouvert : il est
 * rouge tant que l'écart est vrai. Le nom de chaque `describe` porte l'identifiant
 * de l'écart, que le registre retient par `› L114`.
 *
 * Les tests nommés « témoin » sont verts aujourd'hui : ils montrent que le même
 * geste marche sur un cas voisin, donc que le rouge vient bien de l'écart.
 */

import { describe, expect, it } from 'vitest';

import { parseStatChartContent } from '#lib/ubumark/parser/stat-chart-parser.ts';
import { buildStatChartScene } from '#lib/ubumark/utils/stat-chart-scene.ts';

describe('L114 : pourcentage d’un secteur de camembert au demi-dixième', () => {
	/** Le pourcentage affiché en légende pour le premier secteur d'un camembert `a` / `b`. */
	function firstPercent(a: number, b: number): string {
		const parsed = parseStatChartContent('circulaire', `Bus = ${a}\nVélo = ${b}`);
		if (!parsed.spec) throw new Error('camembert non lu');
		const scene = buildStatChartScene(parsed.spec);
		if (scene.kind !== 'circulaire') throw new Error(`scène inattendue : ${scene.kind}`);
		const found = /(\d+(?:,\d+)?)\s*%/.exec(scene.legend[0].text);
		if (!found) throw new Error(`aucun pourcentage dans « ${scene.legend[0].text} »`);
		return found[1];
	}

	it('témoin : 1 sur 8 s’affiche 12,5 %', () => {
		expect(firstPercent(1, 7)).toBe('12,5');
	});

	it('témoin : 23 sur 81 (28,395… %) s’affiche 28,4 %', () => {
		expect(firstPercent(23, 58)).toBe('28,4');
	});

	// 23/80 = 28,75 % exactement. Aujourd'hui : « 28,7 » (100 × 23 / 80 vaut
	// 28,749999999999996 en flottant).
	it('23 sur 80 (28,75 %) s’affiche 28,8 %', () => {
		expect(firstPercent(23, 57)).toBe('28,8');
	});

	it('41 sur 80 (51,25 %) s’affiche 51,3 %', () => {
		expect(firstPercent(41, 39)).toBe('51,3');
	});
});
