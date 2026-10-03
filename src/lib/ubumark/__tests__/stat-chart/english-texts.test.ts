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
const FRENCH =
	/\b(Effectifs?|Fréquences?|cumulée|Moyennes?|Médiane|Classe|Écart|Étendue|Diagramme|Histogramme|Polygone|Tableau|carreaux?|Loi|tirages?|graine|Série|indisponible|échantillons?|espérance|croissantes|décroissantes|large|haut|moins|Comparaison|Probabilité|Nombre|observée|case|compléter|lignes|colonnes|définie|selon|premiers?|entre)\b/i;

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
	['simulation, tirages', 'simulation', 'X = 1 ; 2\nP = 1/2 ; 1/2\ntirages: 20'],
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
