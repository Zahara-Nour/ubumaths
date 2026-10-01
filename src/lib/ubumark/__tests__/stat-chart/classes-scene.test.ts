/**
 * Histogramme, polygone des fréquences cumulées, ligne d'indicateurs — scène
 * pure, partagée par l'écran et le PDF.
 *
 * Spécification validée par David le 2026-10-01 (lot 3). Série du programme :
 * [0 ; 10[ 12, [10 ; 20[ 18, [20 ; 40[ 10 (effectif total 40).
 */

import { describe, it, expect, vi } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type BarScene,
	type CumulativeScene,
	type HistogramScene
} from '../../utils/stat-chart-scene';
import * as classesModule from '$lib/statistics/classes';
import type { StatChartKind } from '../../types/stat-chart';

vi.mock('$lib/statistics/classes', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/statistics/classes')>();
	return {
		...original,
		summarizeClasses: vi.fn(original.summarizeClasses),
		estimateClassQuantile: vi.fn(original.estimateClassQuantile)
	};
});

// =============================================================================
// Helpers
// =============================================================================

function sceneOf(kind: StatChartKind, source: string) {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return buildStatChartScene(node.spec);
}

const histogram = (source: string) => sceneOf('histogramme', source) as HistogramScene;
const cumulative = (source: string) => sceneOf('frequences-cumulees', source) as CumulativeScene;

const TRAJETS = '[0 ; 10[ = 12\n[10 ; 20[ = 18\n[20 ; 40[ = 10';
const EGALES = '[0 ; 10[ = 4\n[10 ; 20[ = 8\n[20 ; 30[ = 5';

// =============================================================================
// Histogramme
// =============================================================================

describe('histogramme, amplitudes égales', () => {
	it('un rectangle par classe, de hauteur l’effectif, sur un axe gradué', () => {
		const scene = histogram(EGALES);

		expect(scene.mode).toBe('axe');
		expect(scene.rects.map((r) => [r.lower, r.upper, r.height])).toEqual([
			[0, 10, 4],
			[10, 20, 8],
			[20, 30, 5]
		]);
		scene.ticks.forEach((t) => expect(Number.isInteger(t.value)).toBe(true));
		expect(scene.carreau).toBeNull();
		expect(scene.axisTitles.y).toBe('Effectif');
	});

	it('graduations horizontales aux bornes des classes', () => {
		expect(histogram(EGALES).xTicks.map((t) => t.label)).toEqual(['0', '10', '20', '30']);
	});

	it('description : les effectifs, lisibles sur l’axe', () => {
		expect(histogram(EGALES).description).toBe(
			'Histogramme : [0 ; 10[ 4, [10 ; 20[ 8, [20 ; 30[ 5.'
		);
	});
});

describe('histogramme, amplitudes inégales', () => {
	it('quadrillage : un carreau de 10 de large, valeur automatique 2', () => {
		const scene = histogram(TRAJETS);

		expect(scene.mode).toBe('carreaux');
		expect(scene.carreau).toEqual({ width: 10, value: 2, legend: '1 carreau = 2' });
		expect(scene.rects.map((r) => r.height)).toEqual([6, 9, 2.5]);
	});

	it('légende de l’auteur : valeur et mot', () => {
		const scene = histogram(`légende: 1 carreau = 3 élèves\n${TRAJETS}`);

		expect(scene.carreau?.legend).toBe('1 carreau = 3 élèves');
		expect(scene.rects[0].height).toBeCloseTo(4, 10);
		expect(scene.rects[2].height).toBeCloseTo(5 / 3, 10);
	});

	it('invariant : l’aire de chaque rectangle est proportionnelle à son effectif', () => {
		const scene = histogram(TRAJETS);
		const ratios = scene.rects.map((r, i) => ((r.upper - r.lower) * r.height) / [12, 18, 10][i]);

		ratios.forEach((ratio) => expect(ratio).toBeCloseTo(ratios[0], 10));
	});

	it('quadrillage aux multiples du carreau, sur toute la hauteur', () => {
		const scene = histogram(TRAJETS);

		expect(scene.grid.xs).toEqual([0, 10, 20, 30, 40]);
		expect(scene.grid.ys[0]).toBe(0);
		expect(scene.grid.ys[scene.grid.ys.length - 1]).toBeGreaterThanOrEqual(9);
	});

	it('description : dimensions en carreaux, pas les effectifs (Q30)', () => {
		const description = histogram(TRAJETS).description;

		expect(description).toBe(
			'Histogramme : [0 ; 10[ : 1 carreau de large, 6 de haut ; [10 ; 20[ : 1 carreau de large, 9 de haut ; [20 ; 40[ : 2 carreaux de large, 2,5 de haut ; 1 carreau = 2.'
		);
		expect(description).not.toContain('12');
	});

	it('valeurs: oui : les effectifs dans les rectangles et dans la description', () => {
		const scene = histogram(`valeurs: oui\n${TRAJETS}`);

		expect(scene.rects.map((r) => r.valueLabel)).toEqual(['12', '18', '10']);
		expect(scene.description).toContain('[0 ; 10[ : 12');
	});
});

// =============================================================================
// Polygone des fréquences cumulées
// =============================================================================

describe('polygone des fréquences cumulées', () => {
	it('croissantes : points aux bornes droites, depuis (première borne ; 0 %)', () => {
		const points = cumulative(TRAJETS).points;

		expect(points.map((p) => p.x)).toEqual([0, 10, 20, 40]);
		[0, 30, 75, 100].forEach((y, i) => expect(points[i].y).toBeCloseTo(y, 10));
	});

	it('décroissantes : points aux bornes gauches, jusqu’à (dernière borne ; 0 %)', () => {
		const points = cumulative(`sens: décroissantes\n${TRAJETS}`).points;

		expect(points.map((p) => p.x)).toEqual([0, 10, 20, 40]);
		[100, 70, 25, 0].forEach((y, i) => expect(points[i].y).toBeCloseTo(y, 10));
	});

	it('axe vertical en %, de 0 à 100, de 10 en 10', () => {
		const scene = cumulative(TRAJETS);

		expect(scene.ticks.map((t) => t.value)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
		expect(scene.axisTitles.y).toBe('Fréquence cumulée (%)');
	});

	it('lecture: médiane — un segment à 50 %, « Me ≈ 14,44 »', () => {
		const [reading] = cumulative(`lecture: médiane\n${TRAJETS}`).readings;

		expect(reading.percent).toBe(50);
		expect(reading.x).toBeCloseTo(130 / 9, 10);
		expect(reading.text).toBe('Me ≈ 14,44');
	});

	it('lecture: quartiles — Q1, Me, Q3, « = » quand la valeur est exacte', () => {
		const readings = cumulative(`lecture: quartiles\n${TRAJETS}`).readings;

		expect(readings.map((r) => r.text)).toEqual(['Q1 ≈ 8,33', 'Me ≈ 14,44', 'Q3 = 20']);
	});

	it('décroissantes : Q1 se lit à 75 %, Q3 à 25 %', () => {
		const readings = cumulative(`sens: décroissantes\nlecture: quartiles\n${TRAJETS}`).readings;

		expect(readings.map((r) => [r.text, r.percent])).toEqual([
			['Q1 ≈ 8,33', 75],
			['Me ≈ 14,44', 50],
			['Q3 = 20', 25]
		]);
	});

	// Audit a11y : « Me » est prononcé « mé » par les lecteurs d'écran
	it('la description dit « Médiane » en toutes lettres, l’écran garde « Me »', () => {
		const scene = cumulative(`lecture: médiane\n${TRAJETS}`);

		expect(scene.readings[0].text).toBe('Me ≈ 14,44');
		expect(scene.description).toContain('Médiane ≈ 14,44');
		expect(scene.description).not.toContain('Me ≈');
	});

	it('pas de lecture par défaut', () => {
		expect(cumulative(TRAJETS).readings).toEqual([]);
	});

	it('description : les points du polygone', () => {
		expect(cumulative(TRAJETS).description).toBe(
			'Polygone des fréquences cumulées croissantes : 0 % en 0, 30 % en 10, 75 % en 20, 100 % en 40.'
		);
	});

	it('les estimations viennent du module statistique', () => {
		vi.mocked(classesModule.estimateClassQuantile).mockClear();

		cumulative(`lecture: médiane\n${TRAJETS}`);

		expect(classesModule.estimateClassQuantile).toHaveBeenCalled();
	});
});

// =============================================================================
// Indicateurs
// =============================================================================

describe('ligne d’indicateurs', () => {
	it('série en classes', () => {
		const scene = histogram(
			`indicateurs: effectif ; moyenne ; classe médiane ; médiane\n${TRAJETS}`
		);

		expect(scene.indicators).toEqual([
			'Effectif total : 40',
			'Moyenne = 15,75',
			'Classe médiane : [10 ; 20[',
			'Médiane ≈ 14,44'
		]);
	});

	it('barres numériques', () => {
		const scene = sceneOf(
			'barres',
			'indicateurs: effectif ; moyenne ; médiane ; quartiles ; écart interquartile ; étendue ; écart type\n0 = 5\n1 = 8\n2 = 4\n3 = 2\n4 = 1'
		) as BarScene;

		expect(scene.indicators).toEqual([
			'Effectif total : 20',
			'Moyenne = 1,3',
			'Médiane = 1',
			'Q1 = 0',
			'Q3 = 2',
			'Écart interquartile = 2',
			'Étendue = 4',
			'Écart type = 1,1'
		]);
	});

	it('arrondi à 2 décimales signalé par « ≈ »', () => {
		const scene = sceneOf('barres', 'indicateurs: moyenne\n0 = 1\n1 = 1\n1,5 = 1') as BarScene;

		expect(scene.indicators).toEqual(['Moyenne ≈ 0,83']);
	});

	it('sans indicateurs : une liste vide', () => {
		expect(histogram(TRAJETS).indicators).toEqual([]);
	});

	// Affichés en texte sous la figure, ils sont lus par le lecteur d'écran à
	// leur place : les répéter dans <desc> les ferait annoncer deux fois
	it('la description accessible ne les répète pas', () => {
		const scene = histogram(`indicateurs: moyenne\n${TRAJETS}`);

		expect(scene.description).not.toContain('Moyenne');
	});

	it('séries en classes : calculées par le module statistique', () => {
		vi.mocked(classesModule.summarizeClasses).mockClear();

		histogram(`indicateurs: moyenne\n${TRAJETS}`);

		expect(classesModule.summarizeClasses).toHaveBeenCalled();
	});
});
