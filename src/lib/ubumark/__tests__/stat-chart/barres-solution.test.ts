/**
 * Diagramme en barres `solution: oui` : les barres à construire dessinées (V109)
 * ==============================================================================
 *
 * Le corrigé imprimé d'une série d'automatismes dessine la réponse d'un diagramme
 * à construire : `solution: oui`, avec `placer:`, sans `case:` (David, 2026-11-28 :
 * barres en vert). Échelle à choisir : la juste, la plus petite où tout rentre
 * (`adaptedScale`, la règle de la correction). Ce n'est plus un geste à faire.
 */
import { describe, expect, it } from 'vitest';

import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { findBarsToPlace, parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene } from '../../utils/stat-chart-scene';

const SPORTS = ['axes: Sport ; Effectif', 'Football = 12', 'Natation = 8', 'Danse = 7'];
const node = (...lines: string[]) =>
	parseStatChartContent('barres', [...SPORTS, ...lines].join('\n'));

describe('parseur', () => {
	it('oui : barres dessinées, plus rien à construire', () => {
		const spec = node('axe: 0 à 20, de 2 en 2', 'placer: Natation ; Danse', 'solution: oui').spec;
		expect(spec?.solvedBars).toEqual([1, 2]);
		expect(spec?.toPlace ?? null).toBeNull();
	});

	it('non : rien ne change', () => {
		const spec = node('axe: 0 à 20, de 2 en 2', 'placer: Natation', 'solution: non').spec;
		expect(spec?.solvedBars).toBeUndefined();
		expect(spec?.toPlace).toEqual([1]);
	});

	it('échelle à choisir : l’axe juste (12 → de 2 en 2, jusqu’à 20)', () => {
		const spec = node('axe: à choisir', 'placer: toutes', 'solution: oui').spec;
		expect(spec?.chooseScale ?? false).toBe(false);
		expect(spec?.axis).toEqual({ max: 20, step: 2 });
		expect(spec?.solvedBars).toEqual([0, 1, 2]);
	});

	it('sans placer:, avec une case, ou ni oui ni non : refusé', () => {
		expect(node('axe: 0 à 20', 'solution: oui').errors[0]?.message).toMatch(/placer:/);
		expect(
			node('axe: 0 à 20', 'placer: Danse', 'case: 0', 'solution: oui').errors[0]?.message
		).toMatch(/pas avec case/);
		expect(node('axe: 0 à 20', 'placer: Danse', 'solution: bof').errors[0]?.message).toMatch(
			/oui ou non/
		);
	});

	it('un diagramme dessiné n’est pas un geste à faire', () => {
		const bloc = (extra: string[]) =>
			['```barres', ...SPORTS, 'axe: 0 à 20', 'placer: Danse', ...extra, '```'].join('\n');
		expect(findBarsToPlace(bloc([]))).toHaveLength(1);
		expect(findBarsToPlace(bloc(['solution: oui']))).toHaveLength(0);
	});
});

describe('scène et PDF', () => {
	it('scène : les barres attendues marquées, aucune à construire', () => {
		const spec = node('axe: 0 à 20, de 2 en 2', 'placer: Natation ; Danse', 'solution: oui').spec!;
		const scene = buildStatChartScene(spec) as BarScene;
		expect(scene.bars.map((b) => b.solved ?? false)).toEqual([false, true, true]);
		expect(scene.bars.every((b) => !b.toPlace)).toBe(true);
	});

	it('PDF : toutes les barres, les attendues en vert', () => {
		const typst = generateStatChartTypst(
			node('axe: 0 à 20, de 2 en 2', 'placer: Natation ; Danse', 'solution: oui')
		);
		expect(typst.match(/\/\/ barre( solution)?\n/g)).toHaveLength(3);
		expect(typst.match(/\/\/ barre solution\n/g)).toHaveLength(2);
		expect(typst).toContain('rgb("#018639")');
	});

	it('PDF, échelle à choisir : l’axe numéroté, pas de ligne « Une graduation vaut »', () => {
		const typst = generateStatChartTypst(node('axe: à choisir', 'placer: toutes', 'solution: oui'));
		expect(typst).not.toContain('Une graduation vaut');
		expect(typst).toContain('[20]');
	});
});
