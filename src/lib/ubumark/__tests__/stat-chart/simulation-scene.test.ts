/**
 * Scènes des simulations de l'atelier (outils statistiques v2, PR (c),
 * Q80-Q82, 2026-10-02) — même scène commune que les diagrammes des blocs.
 *
 * - Q81 : la moyenne des tirages selon n, avec la droite y = E(X) ;
 * - Q82 : l'histogramme des moyennes d'échantillons, classes alignées sur μ,
 *   d'amplitude la moitié de 2σ/√n ; l'intervalle μ ± 2σ/√n mis en valeur.
 */

import { describe, it, expect } from 'vitest';
import {
	RUNNING_MEAN_MAX_POINTS,
	buildRunningMeanScene,
	buildSampleMeansScene
} from '../../utils/simulation-scene';

describe('Q82 — histogramme des moyennes d’échantillons', () => {
	const mu = 3.5;
	const margin = 0.34;
	const means = [3.1, 3.3, 3.45, 3.5, 3.52, 3.6, 3.7, 3.83, 3.9, 4.0];

	it('classes de même amplitude margin/2, alignées sur μ : μ ± margin sont des bornes', () => {
		const scene = buildSampleMeansScene(means, mu, margin, 'fr');
		const bounds = scene.rects.flatMap((r) => [r.lower, r.upper]);

		for (const r of scene.rects) expect(r.upper - r.lower).toBeCloseTo(margin / 2, 9);
		expect(bounds.some((b) => Math.abs(b - (mu - margin)) < 1e-9)).toBe(true);
		expect(bounds.some((b) => Math.abs(b - (mu + margin)) < 1e-9)).toBe(true);
	});

	it('toutes les moyennes sont comptées, chacune une fois', () => {
		const scene = buildSampleMeansScene(means, mu, margin, 'fr');

		expect(scene.rects.reduce((total, r) => total + r.height, 0)).toBe(means.length);
	});

	it('les classes dans [μ − margin ; μ + margin] sont mises en valeur, pas les autres', () => {
		const scene = buildSampleMeansScene(means, mu, margin, 'fr');

		for (const r of scene.rects) {
			const inside = r.lower >= mu - margin - 1e-9 && r.upper <= mu + margin + 1e-9;
			expect(r.highlighted, `[${r.lower} ; ${r.upper}[`).toBe(inside);
		}
	});

	// Revue : une moyenne PILE sur μ + 2σ/√n tombait dans une classe grisée,
	// alors que le texte la comptait « à moins de la marge »
	it('moyennes pile sur μ − margin et μ + margin : dans des classes EN COULEUR', () => {
		const scene = buildSampleMeansScene(
			[mu - margin, mu, mu + margin, mu + 2 * margin],
			mu,
			margin,
			'fr'
		);
		const colored = scene.rects.filter((r) => r.highlighted).reduce((t, r) => t + r.height, 0);

		expect(colored).toBe(3);
	});

	it('σ = 0 (une seule valeur) : une seule classe, mise en valeur', () => {
		const scene = buildSampleMeansScene([2, 2, 2], 2, 0, 'fr');

		expect(scene.rects).toHaveLength(1);
		expect(scene.rects[0]).toMatchObject({ height: 3, highlighted: true });
	});

	it('un titre accessible et une description', () => {
		const scene = buildSampleMeansScene(means, mu, margin, 'fr');

		expect(scene.accessibleTitle).toBe('Histogramme');
		expect(scene.description).toMatch(/moyennes/);
		expect(scene.axisTitles.x).toBe('Moyenne de l’échantillon');
	});
});

describe('Q81 — moyenne des tirages selon n', () => {
	const means = Array.from({ length: 5000 }, (_, i) => 0.5 + 0.4 / (i + 1));

	it(`au plus ${RUNNING_MEAN_MAX_POINTS} points, le dernier tirage compris`, () => {
		const scene = buildRunningMeanScene(means, 0.5, '1/2', 'fr');

		expect(scene.points.length).toBeLessThanOrEqual(RUNNING_MEAN_MAX_POINTS);
		expect(scene.points[0]).toEqual({ x: 1, y: means[0] });
		expect(scene.points.at(-1)).toEqual({ x: 5000, y: means[4999] });
	});

	it('peu de tirages : tous les points', () => {
		const scene = buildRunningMeanScene([1, 0.5, 2 / 3], 0.5, '1/2', 'fr');

		expect(scene.points).toHaveLength(3);
	});

	it('la droite de l’espérance, dans le cadre ; le cadre contient la courbe', () => {
		const scene = buildRunningMeanScene(means, 0.5, '1/2', 'fr');

		expect(scene.reference).toEqual({ value: 0.5, label: 'espérance 1/2' });
		expect(scene.yMin).toBeLessThanOrEqual(Math.min(0.5, ...means));
		expect(scene.yMax).toBeGreaterThanOrEqual(Math.max(0.5, ...means));
		expect(scene.xMin).toBe(1);
		expect(scene.xMax).toBe(5000);
	});

	it('un seul tirage : un cadre valide (xMax > xMin), un point', () => {
		const scene = buildRunningMeanScene([1], 0.5, '1/2', 'fr');

		expect(scene.xMax).toBeGreaterThan(scene.xMin);
		expect(scene.points).toEqual([{ x: 1, y: 1 }]);
		expect(scene.description).toBe('Moyenne du premier tirage : 1, pour une espérance de 1/2.');
	});

	it('moyennes négatives : le cadre descend sous 0', () => {
		const scene = buildRunningMeanScene([-3, -2, -2.5], -2, '−2', 'fr');

		expect(scene.yMin).toBeLessThanOrEqual(-3);
	});

	it('un titre accessible et une description qui dit où va la courbe', () => {
		const scene = buildRunningMeanScene(means, 0.5, '1/2', 'fr');

		expect(scene.kind).toBe('moyenne-selon-n');
		expect(scene.accessibleTitle).toBe('Moyenne des tirages selon leur nombre');
		expect(scene.description).toBe(
			'Moyenne des 5 000 premiers tirages : elle passe de 0,9 à 0,5, pour une espérance de 1/2.'
		);
	});
});
