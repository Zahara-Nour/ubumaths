/**
 * Deux séries dans l'histogramme et le polygone (v2, lot 5 PR c, Q115-Q118).
 *
 * Spécification validée par David le 2026-10-03 : deux histogrammes l'un
 * au-dessus de l'autre (mêmes classes, même échelle, le second hachuré) ; deux
 * polygones sur les mêmes axes (le second en pointillés) ; pas de mode
 * carreaux avec deux séries.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import {
	buildStatChartScene,
	type CumulativeScene,
	type HistogramScene
} from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { describeList } from '$lib/statistics/describe';
import { formatApproxValue } from '$lib/statistics/format';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

const A = [12, 3, 17, 5, 9, 14, 0, 19];
const B = [9, 14, 11, 16, 13];
const BLOCK = `classes: 0 ; 5 ; 10 ; 15 ; 20\ndonnées 2de A: ${A.join(' ; ')}\ndonnées 2de B: ${B.join(' ; ')}`;

function specOf(source: string, kind: StatChartKind = 'histogramme') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string, kind: StatChartKind = 'histogramme') {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

const histogramOf = (source: string) => buildStatChartScene(specOf(source)) as HistogramScene;
const polygonOf = (source: string) =>
	buildStatChartScene(specOf(source, 'frequences-cumulees')) as CumulativeScene;

const v = (x: number) => formatApproxValue(x, 'fr').replace(/^= /, '');

// =============================================================================
// Analyse
// =============================================================================

describe('deux séries en classes — rangement', () => {
	it('chaque série rangée dans les MÊMES classes', () => {
		const spec = specOf(BLOCK);

		expect(spec.data.map((d) => d.label)).toEqual([
			'[0 ; 5[',
			'[5 ; 10[',
			'[10 ; 15[',
			'[15 ; 20['
		]);
		expect(spec.twoSeries?.names).toEqual(['2de A', '2de B']);
		expect(spec.twoSeries?.counts).toEqual([
			[2, 2, 2, 2],
			[0, 1, 3, 1]
		]);
	});

	it('le polygone range de même', () => {
		expect(specOf(BLOCK, 'frequences-cumulees').twoSeries?.counts).toEqual([
			[2, 2, 2, 2],
			[0, 1, 3, 1]
		]);
	});
});

// =============================================================================
// Histogrammes
// =============================================================================

describe('deux histogrammes l’un au-dessus de l’autre', () => {
	it('le nom de chaque série, le second hachuré, la même échelle verticale', () => {
		const scene = histogramOf(BLOCK);
		const second = scene.second!;

		expect(scene.seriesName).toBe('2de A');
		expect(second.seriesName).toBe('2de B');
		expect(second.hatched).toBe(true);
		expect(scene.hatched ?? false).toBe(false);
		expect(second.yMax).toBe(scene.yMax);
		expect(second.ticks).toEqual(scene.ticks);
		expect(second.xMin).toBe(scene.xMin);
		expect(second.xMax).toBe(scene.xMax);
	});

	it('effectifs totaux différents : fréquences en % au dixième (Q116)', () => {
		const scene = histogramOf(BLOCK);

		expect(scene.axisTitles.y).toBe('Fréquence (%)');
		expect(scene.rects.map((r) => r.height)).toEqual([25, 25, 25, 25]);
		expect(scene.second!.rects.map((r) => r.height)).toEqual([0, 20, 60, 20]);
	});

	it('`afficher: effectifs` force les effectifs', () => {
		const scene = histogramOf(`${BLOCK}\nafficher: effectifs`);

		expect(scene.axisTitles.y).toBe('Effectif');
		expect(scene.second!.rects.map((r) => r.height)).toEqual([0, 1, 3, 1]);
	});

	it('le titre de l’auteur en tête, une seule fois', () => {
		const scene = histogramOf(`titre: Notes\n${BLOCK}`);

		expect(scene.title).toBe('Notes');
		expect(scene.second!.title).toBeNull();
	});

	it('`indicateurs:` : un tableau, moyenne et médiane exactes, classe médiane (Q109)', () => {
		const scene = histogramOf(`${BLOCK}\nindicateurs: moyenne ; médiane ; classe médiane`);
		const [a, b] = [describeList(A)!, describeList(B)!];

		expect(scene.indicators).toEqual([]);
		expect(scene.indicatorTable!.columns).toEqual(['2de A', '2de B']);
		expect(scene.indicatorTable!.rows.map((r) => [r.header, ...r.cells])).toEqual([
			['Moyenne', v(a.mean), v(b.mean)],
			['Médiane', v(a.median), v(b.median)],
			['Classe médiane', '[10 ; 15[', '[10 ; 15[']
		]);
	});
});

// =============================================================================
// Polygones
// =============================================================================

describe('deux polygones sur les mêmes axes', () => {
	it('le second en pointillés, dans une autre teinte ; une légende', () => {
		const scene = polygonOf(BLOCK);

		expect(scene.legend).toEqual(['2de A', '2de B']);
		expect(scene.second!.color).toBe('orange');
		expect(scene.points.map((p) => p.y)).toEqual([0, 25, 50, 75, 100]);
		expect(scene.second!.points.map((p) => p.y)).toEqual([0, 0, 20, 80, 100]);
	});

	it('`lecture: médiane` sur les deux polygones', () => {
		const scene = polygonOf(`${BLOCK}\nlecture: médiane`);

		expect(scene.readings).toHaveLength(1);
		expect(scene.second!.readings).toHaveLength(1);
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('deux séries en classes — Typst', () => {
	it('histogrammes : deux canevas, les noms, des hachures', () => {
		const typst = generateStatChartTypst(parseStatChartContent('histogramme', BLOCK));

		expect(typst).not.toContain('Figure indisponible');
		expect(typst.match(/cetz\.canvas/g)).toHaveLength(2);
		expect(typst).toContain('"2de A"');
		expect(typst).toContain('"2de B"');
		expect(typst).toContain('tiling(');
	});

	it('polygones : un seul canevas, le second en pointillés, une légende', () => {
		const typst = generateStatChartTypst(parseStatChartContent('frequences-cumulees', BLOCK));

		expect(typst.match(/cetz\.canvas/g)).toHaveLength(1);
		expect(typst).toContain('dash: "dashed"');
		expect(typst).toContain('"2de B"');
	});

	it('une seule série : rien ne change', () => {
		const typst = generateStatChartTypst(
			parseStatChartContent('histogramme', 'classes: 0 ; 5 ; 10\ndonnées: 1 ; 6')
		);
		expect(typst.match(/cetz\.canvas/g)).toHaveLength(1);
		expect(typst).not.toContain('tiling(');
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('deux séries en classes — erreurs situées', () => {
	it('une valeur hors des classes nomme sa série', () => {
		expect(errorOf('classes: 0 ; 5 ; 10\ndonnées A: 1\ndonnées B: 3 ; 12')).toBe(
			'Ligne 3 : B : 12 sort des classes : la dernière est [5 ; 10[ (ajouter une borne, par exemple 15)'
		);
	});

	it('pas de mode carreaux : ni `légende:`, ni classes d’amplitudes différentes', () => {
		expect(errorOf(`${BLOCK}\nlégende: 1 carreau = 1 élève`)).toBe(
			'Ligne 4 : une seule série en mode carreaux'
		);
		expect(errorOf('classes: 0 ; 5 ; 20\ndonnées A: 1\ndonnées B: 6')).toBe(
			'Ligne 1 : deux séries : des classes de même amplitude (pas de mode carreaux)'
		);
	});

	it('sans `classes:` ; une seule série nommée', () => {
		expect(errorOf('données A: 1\ndonnées B: 2')).toBe(
			'Ligne 1 : données : écrire aussi les classes (classes: 0 ; 5 ; 10)'
		);
		expect(errorOf('classes: 0 ; 5\ndonnées A: 1')).toBe(
			'Ligne 2 : écrire deux séries nommées : données A: … et données B: …'
		);
	});
});
