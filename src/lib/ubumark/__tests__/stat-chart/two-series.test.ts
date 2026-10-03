/**
 * Barres à deux séries (v2, lot 5 PR b, Q115-Q118) : `données Garçons: …` et
 * `données Filles: …` donnent des barres groupées, la seconde série hachurée,
 * et un tableau d'indicateurs (une colonne par série) sous la figure.
 *
 * Spécification validée par David le 2026-10-03.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import { describeList } from '$lib/statistics/describe';
import { formatApproxValue } from '$lib/statistics/format';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

const BOYS = [12, 15, 12, 9];
const GIRLS = [14, 12, 15];
const BLOCK = `données Garçons: ${BOYS.join(' ; ')}\ndonnées Filles: ${GIRLS.join(' ; ')}`;

function specOf(source: string, kind: StatChartKind = 'barres') {
	const node = parseStatChartContent(kind, source);
	if (node.spec === null) throw new Error(`erreurs inattendues : ${JSON.stringify(node.errors)}`);
	return node.spec;
}

function errorOf(source: string, kind: StatChartKind = 'barres') {
	const node = parseStatChartContent(kind, source);
	expect(node.spec, 'le bloc devait être en erreur').toBeNull();
	return node.errors[0].message;
}

const sceneOf = (source: string, locale: 'fr' | 'en' = 'fr') =>
	buildStatChartScene(specOf(source), { locale }) as BarScene;

/** Hauteurs des barres, série par série, dans l'ordre des valeurs */
const heights = (scene: BarScene) =>
	[0, 1].map((s) => scene.bars.filter((b) => (b.series ?? 0) === s).map((b) => b.value));

// =============================================================================
// Analyse et scène
// =============================================================================

describe('deux séries — barres groupées', () => {
	it('les valeurs des deux séries réunies, croissantes ; une barre de hauteur 0 si absente', () => {
		const scene = sceneOf(`${BLOCK}\nafficher: effectifs`);

		expect(scene.labels.map((l) => l.text)).toEqual(['9', '12', '14', '15']);
		expect(heights(scene)).toEqual([
			[1, 2, 0, 1],
			[0, 1, 1, 1]
		]);
		expect(scene.legend).toEqual(['Garçons', 'Filles']);
	});

	it('deux barres côte à côte par valeur, la seconde marquée série 2', () => {
		const scene = sceneOf(BLOCK);
		const [a, b] = scene.bars.filter((bar) => Math.floor(bar.left) === 0);

		expect(a.series ?? 0).toBe(0);
		expect(b.series).toBe(1);
		expect(a.right).toBeCloseTo(b.left);
		expect(scene.labels[0].center).toBeCloseTo((a.left + b.right) / 2);
	});

	it('effectifs totaux différents : fréquences en % au dixième (Q116)', () => {
		const scene = sceneOf(BLOCK);

		expect(scene.axisTitles.y).toBe('Fréquence (%)');
		// Garçons : 9 → 1 sur 4 = 25 % ; Filles : 14 → 1 sur 3 = 33,3 %
		expect(heights(scene)[0][0]).toBeCloseTo(25);
		expect(scene.bars.filter((b) => b.series === 1).map((b) => b.valueLabel)).toEqual([
			'0 %',
			'33,3 %',
			'33,3 %',
			'33,3 %'
		]);
	});

	it('effectifs totaux égaux : effectifs ; `afficher:` force le choix', () => {
		const equal = 'données A: 1 ; 2\ndonnées B: 2 ; 2';
		expect(sceneOf(equal).axisTitles.y).toBe('Effectif');
		expect(sceneOf(`${equal}\nafficher: fréquences`).axisTitles.y).toBe('Fréquence (%)');
		expect(sceneOf(`${BLOCK}\nafficher: effectifs`).axisTitles.y).toBe('Effectif');
	});

	it('des mots : ordre d’apparition, première série puis seconde', () => {
		const scene = sceneOf('données 6A: Bus ; Vélo ; Bus\ndonnées 6B: Train ; bus');

		expect(scene.labels.map((l) => l.text)).toEqual(['Bus', 'Vélo', 'Train']);
	});

	it('plusieurs lignes pour une même série ; options `titre`, `valeurs`', () => {
		const spec = specOf('titre: Notes\ndonnées A: 1 ; 2\ndonnées B: 3\ndonnées A: 3\nvaleurs: oui');

		expect(spec.title).toBe('Notes');
		expect(spec.showValues).toBe(true);
		expect(spec.twoSeries?.names).toEqual(['A', 'B']);
		expect(spec.twoSeries?.counts).toEqual([
			[1, 1, 1],
			[0, 0, 1]
		]);
	});
});

// =============================================================================
// Indicateurs, série
// =============================================================================

describe('deux séries — indicateurs et série', () => {
	it('`indicateurs:` : un tableau sous la figure, une colonne par série, ceux demandés', () => {
		const scene = sceneOf(`${BLOCK}\nindicateurs: moyenne ; médiane ; quartiles`);
		const table = scene.indicatorTable!;
		const v = (x: number) => formatApproxValue(x, 'fr').replace(/^= /, '');
		const [a, b] = [describeList(BOYS)!, describeList(GIRLS)!];

		expect(scene.indicators).toEqual([]);
		expect(table.columns).toEqual(['Garçons', 'Filles']);
		expect(table.rows.map((r) => [r.header, ...r.cells])).toEqual([
			['Moyenne', v(a.mean), v(b.mean)],
			['Médiane', v(a.median), v(b.median)],
			['Q1', v(a.q1), v(b.q1)],
			['Q3', v(a.q3), v(b.q3)]
		]);
	});

	it('sans `indicateurs:` : pas de tableau ; des mots refusent les indicateurs', () => {
		expect(sceneOf(BLOCK).indicatorTable).toBeNull();
		expect(errorOf('données A: x ; y\ndonnées B: x\nindicateurs: moyenne')).toMatch(
			/toutes les catégories doivent être des nombres/
		);
	});

	it('`série:` : une ligne par série', () => {
		expect(sceneOf(`${BLOCK}\nsérie: affichée`).series).toBe(
			'Garçons : 12 ; 15 ; 12 ; 9\nFilles : 14 ; 12 ; 15'
		);
		expect(sceneOf(`${BLOCK}\nsérie: triée`).series).toBe(
			'Garçons : 9 ; 12 ; 12 ; 15\nFilles : 12 ; 14 ; 15'
		);
	});

	it('une série seule (cas existant) : inchangé', () => {
		expect(sceneOf('données: 1 ; 2\nsérie: affichée').series).toBe('Série : 1 ; 2');
		expect(sceneOf('données: 1 ; 2').legend).toBeNull();
	});
});

// =============================================================================
// PDF
// =============================================================================

describe('deux séries — Typst', () => {
	it('la seconde série hachurée, une légende, les mêmes hauteurs, le tableau', () => {
		const source = `${BLOCK}\nafficher: effectifs\nindicateurs: moyenne`;
		const typst = generateStatChartTypst(parseStatChartContent('barres', source));
		const scene = sceneOf(source);

		expect(typst).not.toContain('Figure indisponible');
		expect(typst).toContain('tiling(');
		expect(typst).toContain('"Garçons"');
		expect(typst).toContain('"Filles"');
		expect(typst.match(/\/\/ barre\n/g)).toHaveLength(scene.bars.length);
		// Hauteurs : le haut de chaque rectangle, proportionnel à la valeur de la scène
		const tops = [
			...typst.matchAll(/\/\/ barre\n {2}rect\(\([\d.]+, 0\), \([\d.]+, ([\d.]+)\)/g)
		].map((m) => Number(m[1]));
		const tallest = scene.bars.reduce(
			(best, bar, i) => (bar.value > scene.bars[best].value ? i : best),
			0
		);
		scene.bars.forEach((bar, i) => {
			expect(tops[i] / tops[tallest]).toBeCloseTo(bar.value / scene.bars[tallest].value, 2);
		});
		expect(typst).toContain('#table(');
		expect(typst).toContain(`"${scene.indicatorTable!.rows[0].cells[0]}"`);
	});

	it('`couleur: orange` : la seconde série passe en bleu, l’inverse sinon', () => {
		expect(sceneOf(`${BLOCK}\ncouleur: orange`).secondColor).toBe('bleu');
		expect(sceneOf(BLOCK).secondColor).toBe('orange');
		expect(sceneOf(`${BLOCK}\ncouleur: vert`).secondColor).toBe('orange');
	});

	it('un bloc à une série reste sans hachures', () => {
		expect(generateStatChartTypst(parseStatChartContent('barres', 'données: 1 ; 2'))).not.toContain(
			'tiling('
		);
	});
});

// =============================================================================
// Erreurs
// =============================================================================

describe('deux séries — erreurs situées', () => {
	it('une seule série nommée, ou avec `données:` sans nom', () => {
		const message = 'écrire deux séries nommées : données A: … et données B: …';
		expect(errorOf('données A: 1 ; 2')).toBe(`Ligne 1 : ${message}`);
		expect(errorOf('données: 1\ndonnées A: 1 ; 2')).toBe(`Ligne 2 : ${message}`);
	});

	it('un nom de série vide', () => {
		expect(errorOf('données  : 1 ; 2\ndonnées B: 3')).toBe(
			'Ligne 1 : nom de série vide (écrire données A: …)'
		);
	});

	it('une troisième série', () => {
		expect(errorOf('données A: 1\ndonnées B: 2\ndonnées C: 3')).toBe(
			'Ligne 3 : au plus deux séries'
		);
	});

	it('deux noms qui ne diffèrent que par la casse', () => {
		expect(errorOf('données Filles: 1\ndonnées filles: 2')).toBe(
			'Ligne 2 : deux séries de même nom (« Filles » et « filles »)'
		);
	});

	it('nom trop long ; trop de valeurs différentes (15 au plus)', () => {
		expect(errorOf(`données ${'x'.repeat(41)}: 1\ndonnées B: 2`)).toMatch(
			/^Ligne 1 : nom de série trop long/
		);
		const values = (from: number) => Array.from({ length: 8 }, (_, i) => from + i).join(' ; ');
		expect(errorOf(`données A: ${values(0)}\ndonnées B: ${values(8)}`)).toBe(
			'Ligne 1 : données : 16 valeurs différentes, au plus 15 (deux barres chacune)'
		);
	});

	it('mélange avec des lignes « catégorie = effectif »', () => {
		expect(errorOf('données A: 1\ndonnées B: 2\nC = 3')).toBe(
			'Ligne 3 : soit les données, soit les effectifs (catégorie = effectif), pas les deux'
		);
	});

	it('diagramme circulaire, histogramme, polygone', () => {
		expect(errorOf('données A: 1\ndonnées B: 2', 'circulaire')).toBe(
			'Ligne 1 : une seule série par diagramme circulaire'
		);
		expect(errorOf('classes: 0 ; 5\ndonnées A: 1\ndonnées B: 2', 'histogramme')).toBe(
			'Ligne 2 : deux séries : arrive bientôt pour les séries en classes'
		);
	});

	it('`afficher:` : effectifs ou fréquences, et seulement avec deux séries', () => {
		expect(errorOf(`${BLOCK}\nafficher: fréquences par ligne`)).toBe(
			'Ligne 3 : afficher : effectifs ou fréquences'
		);
		expect(errorOf('données: 1 ; 2\nafficher: fréquences')).toBe(
			'Ligne 2 : afficher : seulement avec deux séries'
		);
	});
});
