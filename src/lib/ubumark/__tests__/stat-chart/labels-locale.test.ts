/**
 * Q110 (2026-10-03) : une catégorie qui est un nombre, ou une classe, s'AFFICHE
 * selon la langue du document — séparateur décimal, vrai signe moins — comme
 * le tableau d'une loi. Les données et les indicateurs ne changent pas.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene, type PieScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import type { StatChartKind } from '../../types/stat-chart';

function sceneOf(source: string, kind: StatChartKind, locale: 'fr' | 'en') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(JSON.stringify(node.errors));
	return buildStatChartScene(node.spec, { locale });
}

const barLabels = (source: string, locale: 'fr' | 'en') =>
	(sceneOf(source, 'barres', locale) as BarScene).bars.map((b) => b.label);

describe('Q110 — catégories numériques selon la langue', () => {
	it('barres venues de `données:` : 9,5 / 9.5, vrai signe moins', () => {
		expect(barLabels('données: −3 ; 9,5 ; 12', 'fr')).toEqual(['−3', '9,5', '12']);
		expect(barLabels('données: −3 ; 9,5 ; 12', 'en')).toEqual(['−3', '9.5', '12']);
	});

	it('barres écrites à la main : `-2 = 1`, `2.5 = 3`, fractions gardées', () => {
		expect(barLabels('-2 = 1\n2.5 = 3\n1/2 = 4', 'fr')).toEqual(['−2', '2,5', '1/2']);
		expect(barLabels('-2 = 1\n2,5 = 3', 'en')).toEqual(['−2', '2.5']);
	});

	it('un mot reste tel quel, trait d’union compris', () => {
		expect(barLabels('A-B = 1\nVélo = 2', 'en')).toEqual(['A-B', 'Vélo']);
	});

	it('diagramme circulaire : la légende', () => {
		const pie = sceneOf('2,5 = 1\n-1 = 1', 'circulaire', 'en') as PieScene;
		expect(pie.legend.map((l) => l.label)).toEqual(['2.5', '−1']);
	});

	it('classes : classe médiane et description selon la langue', () => {
		const scene = sceneOf(
			'[-5 ; 2,5[ = 3\n[2,5 ; 10[ = 1\nindicateurs: classe médiane',
			'histogramme',
			'en'
		);
		expect(scene.indicators).toEqual(['Classe médiane : [−5 ; 2.5[']);
		expect(scene.description).toContain('[2.5 ; 10[');
	});

	it('indicateurs inchangés : calculés sur les données, pas sur l’affichage', () => {
		expect(sceneOf('données: 9,5 ; −3\nindicateurs: moyenne', 'barres', 'en').indicators).toEqual([
			'Moyenne = 3.25'
		]);
	});

	it('PDF : les mêmes noms qu’à l’écran', () => {
		const typst = generateStatChartTypst(parseStatChartContent('barres', 'données: −3 ; 9,5'), {
			language: 'en'
		});
		expect(typst).toContain('[#"9.5"]');
		expect(typst).toContain('[#"−3"]');
		expect(typst).not.toContain('[#"9,5"]');
	});
});
