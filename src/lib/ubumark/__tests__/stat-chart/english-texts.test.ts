/**
 * Q121-Q124 (2026-10-03) : dans un document anglais, TOUS les textes que
 * produit un bloc statistique sont en anglais — visibles et lus par le lecteur
 * d'écran, à l'écran (scène) et dans le PDF (Typst). Vocabulaire scolaire
 * anglais (Q122) : *frequency* = effectif, *relative frequency* = fréquence.
 *
 * Le filet : chaque genre de bloc, avec ses options, construit en anglais ; on
 * parcourt toutes les chaînes produites et on y cherche des mots français. Un
 * texte ajouté sans traduction fait échouer ce test.
 */

import { describe, it, expect } from 'vitest';
import { parseStatChartContent } from '../../parser/stat-chart-parser';
import { buildStatChartScene, type BarScene } from '../../utils/stat-chart-scene';
import { generateStatChartTypst } from '../../generators/stat-chart-typst';
import type { StatChartKind } from '../../types/stat-chart';

// =============================================================================
// Helpers
// =============================================================================

/** Mots français qui ne doivent apparaître dans aucun texte produit en anglais */
// `\p{L}` et le drapeau `u` : sans eux, `\b` ignore les lettres accentuées et
// « Écart », « Étendue », « Probabilité » passaient inaperçus (revue)
const FRENCH =
	/(?<!\p{L})(Effectifs?|Fréquences?|cumulée|Moyennes?|Médiane|Classe|Écart|Étendue|Diagramme|Histogramme|Polygone|Tableau|carreaux?|Loi|tirages?|graine|Série|indisponible|échantillons?|espérance|croissantes|décroissantes|large|haut|moins|Comparaison|Probabilité|Nombre|observée|case|compléter|lignes|colonnes|définie|selon|premiers?|entre)(?!\p{L})/iu;

/** Valeurs internes, jamais affichées : le genre, le sens, les couleurs, le mode */
const INTERNAL_KEYS = new Set(['kind', 'direction', 'mode', 'color', 'secondColor', 'hatchColor']);

/** Toutes les chaînes AFFICHÉES ou LUES d'une scène, en profondeur */
function strings(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(strings);
	if (value !== null && typeof value === 'object') {
		return Object.entries(value)
			.filter(([key]) => !INTERNAL_KEYS.has(key))
			.flatMap(([, v]) => strings(v));
	}
	return [];
}

/** Le Typst sans ses commentaires (`// barre`), jamais imprimés */
const printed = (typst: string) =>
	typst
		.split('\n')
		.filter((line) => !/^\s*\/\//.test(line))
		.join('\n');

/** Blocs d'auteur en anglais : catégories et noms SANS mot français */
const BLOCKS: [string, StatChartKind, string][] = [
	[
		'barres, tous les indicateurs',
		'barres',
		'1 = 3\n2 = 5\n4 = 2\nindicateurs: effectif ; moyenne ; médiane ; quartiles ; écart interquartile ; étendue ; écart type\nvaleurs: oui'
	],
	['barres, données et série', 'barres', 'données: 1 ; 2 ; 2 ; 5\nsérie: triée'],
	[
		'barres à deux séries',
		'barres',
		'données Boys: 1 ; 2 ; 2\ndonnées Girls: 2 ; 3\nindicateurs: effectif ; moyenne ; médiane ; quartiles ; écart interquartile ; étendue ; écart type\nsérie: affichée'
	],
	['circulaire', 'circulaire', 'Bus = 3\nBike = 5'],
	[
		'histogramme',
		'histogramme',
		'[0 ; 10[ = 4\n[10 ; 20[ = 6\nindicateurs: effectif ; moyenne ; médiane ; classe médiane'
	],
	['histogramme à carreaux', 'histogramme', '[0 ; 10[ = 4\n[10 ; 30[ = 6\nvaleurs: oui'],
	[
		'deux histogrammes',
		'histogramme',
		'classes: 0 ; 10 ; 20\ndonnées A: 1 ; 12\ndonnées B: 3\nindicateurs: effectif ; moyenne ; médiane ; classe médiane'
	],
	[
		'polygone',
		'frequences-cumulees',
		'[0 ; 10[ = 4\n[10 ; 20[ = 6\nlecture: quartiles\nindicateurs: médiane'
	],
	[
		'polygone décroissant',
		'frequences-cumulees',
		'[0 ; 10[ = 4\n[10 ; 20[ = 6\nsens: décroissantes'
	],
	[
		'deux polygones',
		'frequences-cumulees',
		'classes: 0 ; 10 ; 20\ndonnées A: 1 ; 12\ndonnées B: 3\nlecture: médiane'
	],
	[
		'tableau croisé',
		'tableau-croise',
		'lignes: Yes ; No\ncolonnes: A ; B\nYes = 1 ; ?\nNo = 3 ; 4\nmasquer: Total/Total'
	],
	['loi', 'loi', 'X = 1 ; 2\nP = 1/2 ; ?'],
	[
		'loi binomiale',
		'loi',
		'X ~ B(10 ; 0,3)\nindicateurs: espérance ; variance ; écart type\nprobabilités: P(X ⩽ 4)\nmasquer: 2'
	],
	['loi binomiale, grand n', 'loi', 'X ~ B(100 ; 0,5)\nprobabilités: P(40 ⩽ X ⩽ 60)'],
	['simulation, tirages', 'simulation', 'X = 1 ; 2\nP = 1/2 ; 1/2\ntirages: 20'],
	[
		'tableau d’effectifs',
		'effectifs',
		'données: 1 ; 2 ; 2 ; 5\nlignes: effectifs ; fréquences ; effectifs cumulés ; fréquences cumulées\nsens: décroissantes'
	],
	['tableau d’effectifs en classes', 'effectifs', '[0 ; 10[ = 4\n[10 ; 20[ = 6'],
	['simulation, moyenne', 'simulation', 'X = 1 ; 2\nP = 1/2 ; 1/2\nmode: moyenne'],
	[
		'simulation, échantillons',
		'simulation',
		'X = 1 ; 2\nP = 1/2 ; 1/2\nmode: échantillons\néchantillons: 20\ntaille: 10'
	]
];

// =============================================================================
// Tests
// =============================================================================

describe('Q124 — un document anglais ne reçoit aucun texte français', () => {
	it.each(BLOCKS)('%s : scène et Typst', (_name, kind, source) => {
		const node = parseStatChartContent(kind, source);
		expect(node.spec, JSON.stringify(node.errors)).not.toBeNull();
		const scene = buildStatChartScene(node.spec!, { locale: 'en' });
		const typst = generateStatChartTypst(node, { language: 'en' });

		const offending = [...strings(scene), printed(typst)].filter((text) => FRENCH.test(text));
		expect(offending, offending.map((t) => t.match(FRENCH)?.[0]).join(', ')).toEqual([]);
	});

	it('un bloc indisponible : le cadre du PDF en anglais', () => {
		expect(
			generateStatChartTypst(parseStatChartContent('barres', 'x'), { language: 'en' })
		).toContain('Figure unavailable');
	});
});

describe('le filet lui-même', () => {
	it('repère les mots qui commencent ou finissent par une lettre accentuée', () => {
		for (const text of ['Écart type = 3', 'Étendue = 2', 'Probabilité', '10 échantillons sur 20']) {
			expect(FRENCH.test(text), text).toBe(true);
		}
		expect(FRENCH.test('Standard deviation = 3')).toBe(false);
	});
});

describe('typographie anglaise', () => {
	it('pas d’espace avant « : » ni avant « % » ; titre du polygone dans l’ordre anglais', () => {
		const pie = buildStatChartScene(
			parseStatChartContent('circulaire', 'Bus = 3\nBike = 5').spec!,
			{
				locale: 'en'
			}
		);
		const polygon = buildStatChartScene(
			parseStatChartContent('frequences-cumulees', '[0 ; 10[ = 4\n[10 ; 20[ = 6').spec!,
			{ locale: 'en' }
		);

		expect(pie.description).toMatch(/^Pie chart: /);
		expect(pie.description).toContain('37.5%');
		expect(pie.description).not.toContain(' %');
		expect(polygon.description).toMatch(/^Increasing cumulative relative frequency polygon: /);
	});

	it('le français garde « : » et « % » avec espace', () => {
		const pie = buildStatChartScene(parseStatChartContent('circulaire', 'Bus = 3\nVélo = 5').spec!);
		expect(pie.description).toMatch(/^Diagramme circulaire : /);
		expect(pie.description).toContain('37,5 %');
	});
});

describe('Q122 — le vocabulaire scolaire anglais', () => {
	const bars = (source: string) =>
		buildStatChartScene(parseStatChartContent('barres', source).spec!, {
			locale: 'en'
		}) as BarScene;

	it('effectif = frequency, fréquence = relative frequency', () => {
		expect(bars('1 = 3\n2 = 5').axisTitles.y).toBe('Frequency');
		expect(bars('1 = 30 %\n2 = 70 %').axisTitles.y).toBe('Relative frequency (%)');
		expect(bars('1 = 3\n2 = 5\nindicateurs: effectif').indicators).toEqual(['Total frequency: 8']);
	});

	it('le français ne change pas', () => {
		expect(
			buildStatChartScene(parseStatChartContent('barres', '1 = 3\nindicateurs: effectif').spec!)
				.indicators
		).toEqual(['Effectif total : 3']);
	});
});
