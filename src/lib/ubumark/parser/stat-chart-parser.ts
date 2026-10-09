/**
 * Blocs statistiques — analyse du texte
 * =====================================
 *
 * ```barres
 * titre: Sport préféré des élèves de 6e B
 * axes: Sport ; Effectif
 * Football = 12
 * Natation = {{n}}
 * Danse = 7
 * valeurs: oui
 * ```
 *
 * ```histogramme
 * [0 ; 10[ = 12
 * [10 ; 20[ = 18
 * [20 ; 40[ = 10
 * légende: 1 carreau = 2 élèves
 * indicateurs: moyenne ; médiane
 * ```
 *
 * Grammaire (Q8 du 2026-10-01) : `clé: valeur` est une option, `catégorie =
 * effectif` une donnée. Une option CONNUE l'emporte (`titre: Score = 3` est un
 * titre) ; une clé inconnue suivie de « = » est un nom de catégorie
 * (`Sport: Foot = 3`). Histogramme et polygone : la catégorie est une classe
 * `[a ; b[`, et seulement elle (Q29).
 *
 * Nombres : virgule ou point décimal (Q9, la virgule n'y sépare jamais rien) ;
 * effectifs entiers ≥ 0, OU pourcentages (`35 %`), jamais mélangés (Q10).
 *
 * Les variables de modèle (`{{n}}`) sont remplacées AVANT l'analyse. Une
 * erreur ne fait pas disparaître le bloc : le nœud est rendu avec ses messages
 * situés (n° de ligne) et sans diagramme (Q48).
 *
 * @module ubumark/parser/stat-chart-parser
 */

import { bodyOpensParagraph } from './block-closure';
import {
	CLASS_CHART_KINDS,
	CROSS_TABLE_DISPLAYS,
	type CrossTableData,
	type CrossTableDisplay,
	type DensityQuery,
	type LawData,
	type LawIndicator,
	type LawThreshold,
	SCATTER_INDICATORS,
	type ScatterData,
	type ScatterIndicator,
	SERIES_MODES,
	type SeriesMode,
	FREQUENCY_TABLE_ROWS,
	type FrequencyTableRow,
	SIMULATION_MODES,
	type SimulationData,
	type SimulationMode,
	CLASS_INDICATORS,
	STAT_CHART_DIRECTIONS,
	STAT_CHART_INDICATORS,
	STAT_CHART_KINDS,
	STAT_CHART_LABELS,
	STAT_CHART_LIMITS,
	STAT_CHART_READINGS,
	type StatChartBlockRange,
	type StatChartDatum,
	type StatChartDirection,
	type StatChartIndicator,
	type StatChartIssue,
	type StatChartKind,
	type StatChartLabels,
	type StatChartNode,
	type StatChartReading,
	type StatChartSpec,
	type StatChartUnit,
	type QueryInterval
} from '../types/stat-chart';
import { COURBE_COLORS, COURBE_SIZES, type CourbeColor, type CourbeSize } from '../types/courbe';
import { resolveNamedColor } from '$lib/theme/named-colors';
import { summarizeClasses } from '$lib/statistics/classes';
import { crossTable } from '$lib/statistics/cross-table';
import { Fraction } from '$lib/statistics/fraction';
import { randomVariable } from '$lib/statistics/random-variable';
import { readListValue } from '$lib/statistics/read-value';
import { invalidValueReason, readExactValue } from '$lib/statistics/bivariate';
import {
	changeDomainProblem,
	readVariableChange,
	VARIABLE_CHANGE_LIST,
	type VariableChange
} from '$lib/statistics/variable-change';
import { BINOMIAL_MAX_N } from '$lib/statistics/binomial';
import { GEOMETRIC_MAX_K } from '$lib/statistics/geometric';
import { UNIFORM_MAX_VALUES } from '$lib/statistics/uniform';
import { carreauGrid, usesCarreaux } from '../utils/stat-chart-carreaux';

// ============================================================================
// TYPES
// ============================================================================

interface Options {
	title: string | null;
	axes: { x: string | null; y: string | null };
	description: string | null;
	size: CourbeSize;
	showValues: boolean;
	color: CourbeColor;
	labels: StatChartLabels;
	areaLegend: { value: number; unit: string | null } | null;
	direction: StatChartDirection;
	reading: StatChartReading;
	indicators: StatChartIndicator[];
	rows: string[] | null;
	columns: string[] | null;
	showTotals: boolean;
	display: CrossTableDisplay;
	masked: { row: string; column: string; line: number }[];
	corner: string | null;
	lawIndicators: LawIndicator[];
	/** Valeurs écrites dans `masquer:` d'une loi, vérifiées une fois tout lu */
	lawMasked: string[];
	simulationMode: SimulationMode;
	draws: number;
	seed: number;
	samples: number;
	sampleSize: number;
	/** Bornes de `classes:`, telles qu'écrites (série brute en classes, Q104) */
	classBounds: string[] | null;
	seriesMode: SeriesMode | null;
	/** `afficher:` d'un diagramme en barres à deux séries (Q116) */
	barDisplay: 'effectifs' | 'fréquences' | null;
	/** Bloc ```effectifs : `lignes:` (Q128) et `fréquences: décimales` */
	tableRows: FrequencyTableRow[] | null;
	decimalFrequencies: boolean | null;
	/** `masquer:` d'un tableau d'effectifs, tel qu'écrit */
	tableMasked: string | null;
	/** Loi binomiale : `arrondi:` (décimales) et `probabilités:` tel qu'écrit */
	places: number | null;
	binomialQueries: string | null;
	/** Loi binomiale : `diagramme:`, `intervalle:` (niveau), `seuil:` tel qu'écrit */
	binomialChart: boolean;
	binomialLevel: Fraction | null;
	binomialThreshold: string | null;
	/** Loi géométrique : `jusqu'à:` (dernière valeur du tableau) */
	upTo: number | null;
	/** Loi à densité : `répartition: oui`, `aire:` tel qu'écrit */
	cdf: boolean;
	areaQuery: string | null;
	/** `classes: N` d'une simulation de loi à densité (manche 14) */
	simulationClasses: number | null;
}

/** Une série nommée (`données Garçons: …`), lue ligne par ligne */
interface NamedSeries {
	name: string;
	entries: { text: string; line: number }[];
}

/** Une ligne `X = …` ou `P = …` d'une loi, avant le contrôle d'ensemble */
interface LawLine {
	texts: (string | null)[];
	line: number;
}

/** Une loi nommée (`X ~ G(0,2)`, manches 13-14), paramètres tels qu'écrits */
type NamedLawLine =
	| { family: 'geometric'; name: string; p: string; line: number }
	| { family: 'uniform'; name: string; a: string; b: string; line: number }
	| { family: 'uniform-density'; name: string; a: string; b: string; line: number }
	| { family: 'exponential'; name: string; lambda: string; line: number }
	| { family: 'normal'; name: string; mu: string; variance: string; line: number }
	| null;

/** Une ligne de données d'un tableau croisé, avant le contrôle d'ensemble */
interface TableRow {
	name: string;
	values: (number | null)[];
	line: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BLOCK_START_REGEX =
	/^```(barres|circulaire|histogramme|frequences-cumulees|tableau-croise|loi|simulation|effectifs|nuage)\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `titre: …` — clé en lettres (accents compris), puis deux-points */
// Apostrophe permise : `jusqu'à:` (loi géométrique, manche 13)
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ'’]+)\s*:\s*(.*)$/;

/** `12`, `12,5`, `-3`, `35 %`, `12.5%` */
const NUMBER_REGEX = /^(-?\d+(?:[.,]\d+)?)\s*(%?)$/;

/** Un nombre seul, signe et décimales permis (bornes, catégories numériques) */
const PLAIN_NUMBER = '-?\\d+(?:[.,]\\d+)?';
const PLAIN_NUMBER_REGEX = new RegExp(`^${PLAIN_NUMBER}$`);

/** `[0 ; 10[`, `[0;10[`, `[-2,5 ; 0[` */
const CLASS_REGEX = new RegExp(`^\\[\\s*(${PLAIN_NUMBER})\\s*;\\s*(${PLAIN_NUMBER})\\s*\\[$`);

/** `1 carreau = 2 élèves`, `1 carreau = 2,5` */
const AREA_LEGEND_REGEX = /^1\s*carreaux?\s*=\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i;

/** Clés, sans accent ni majuscule */
const OPTION_KEYS = [
	'titre',
	'axes',
	'description',
	'taille',
	'valeurs',
	'couleur',
	'etiquettes',
	'legende',
	'sens',
	'lecture',
	'indicateurs',
	'lignes',
	'colonnes',
	'totaux',
	'afficher',
	'masquer',
	'coin',
	'mode',
	'tirages',
	'graine',
	'echantillons',
	'classes',
	'serie',
	'frequences',
	'arrondi',
	'probabilites',
	'diagramme',
	'intervalle',
	'seuil',
	'jusqua',
	'repartition',
	'aire'
] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

/** Options réservées à certains blocs ; absente = tous */
/** Diagrammes dessinés (tout sauf le tableau croisé) */
const FIGURE_KINDS: readonly StatChartKind[] = [
	'barres',
	'circulaire',
	'histogramme',
	'frequences-cumulees'
];

const OPTION_KINDS: Partial<Record<OptionKey, readonly StatChartKind[]>> = {
	// Un <table> n'a ni taille de figure ni description d'image (revue du lot 4)
	// Une simulation y lit la taille d'un échantillon (mode `échantillons`)
	taille: [...FIGURE_KINDS, 'simulation'],
	description: FIGURE_KINDS,
	axes: ['barres', 'histogramme', 'frequences-cumulees'],
	valeurs: ['barres', 'histogramme'],
	couleur: ['barres', 'histogramme', 'frequences-cumulees'],
	etiquettes: ['circulaire'],
	legende: ['histogramme'],
	sens: ['frequences-cumulees', 'effectifs'],
	lecture: ['frequences-cumulees'],
	indicateurs: ['barres', 'histogramme', 'frequences-cumulees', 'loi', 'effectifs'],
	lignes: ['tableau-croise', 'effectifs'],
	colonnes: ['tableau-croise'],
	totaux: ['tableau-croise', 'effectifs'],
	afficher: ['tableau-croise', 'barres', 'histogramme'],
	masquer: ['tableau-croise', 'loi', 'effectifs'],
	coin: ['tableau-croise'],
	mode: ['simulation'],
	tirages: ['simulation'],
	graine: ['simulation'],
	echantillons: ['simulation'],
	// Simulation d'une loi à densité : un NOMBRE de classes (manche 14)
	classes: ['histogramme', 'frequences-cumulees', 'effectifs', 'simulation'],
	frequences: ['effectifs'],
	arrondi: ['loi'],
	probabilites: ['loi'],
	diagramme: ['loi'],
	intervalle: ['loi'],
	seuil: ['loi'],
	jusqua: ['loi', 'simulation'],
	repartition: ['loi'],
	aire: ['loi'],
	serie: ['barres', 'circulaire', 'histogramme', 'frequences-cumulees']
};

/** Options dont l'auteur écrit l'accent */
const OPTION_SPELLING: Partial<Record<OptionKey, string>> = {
	etiquettes: 'étiquettes',
	legende: 'légende',
	echantillons: 'échantillons',
	serie: 'série',
	frequences: 'fréquences',
	probabilites: 'probabilités',
	jusqua: "jusqu'à",
	repartition: 'répartition'
};

const KIND_NAME: Record<StatChartKind, string> = {
	barres: 'diagrammes en barres',
	circulaire: 'diagrammes circulaires',
	histogramme: 'histogrammes',
	'frequences-cumulees': 'polygones des fréquences cumulées',
	'tableau-croise': 'tableaux croisés',
	loi: 'lois de variables aléatoires',
	simulation: 'simulations',
	effectifs: 'tableaux d’effectifs',
	nuage: 'nuages de points'
};

/** Indicateurs d'une loi, tels que l'auteur les écrit */
const LAW_INDICATOR_NAMES: Record<LawIndicator, string> = {
	esperance: 'espérance',
	variance: 'variance',
	'ecart-type': 'écart type'
};

/** Blocs qui dépouillent une série brute (`données:`, v2 lot 4 PR a) */
const RAW_DATA_KINDS: readonly StatChartKind[] = [
	'barres',
	'circulaire',
	'histogramme',
	'frequences-cumulees',
	'effectifs'
];

/** `données Garçons: 12 ; 15` : une série nommée (le nom, puis les valeurs) */
const NAMED_SERIES_REGEX = /^donn[ée]es\s+([^:]+?)\s*:\s*(.*)$/i;

/** `X ~ B(10 ; 0,3)` ou `X suit B(10 ; 0,3)` : la variable, n, p */
// Séparateur « ; », ou « , » suivi d'une espace : la notation anglaise B(10, 0.3) (revue)
const BINOMIAL_REGEX = /^([A-Z])\s*(?:~|suit)\s*B\s*\(\s*(.+?)\s*(?:;|,\s+)\s*(.+?)\s*\)$/;

const BINOMIAL_ALONE = 'une loi binomiale se donne seule : pas de ligne « X = » ni « P = »';

/** `X ~ G(0,2)`, `X suit G(1/5)` : la variable, p (manche 13) */
const GEOMETRIC_REGEX = /^([A-Z])\s*(?:~|suit)\s*G\s*\(\s*(.+?)\s*\)$/;

/** `X ~ U(1 ; 6)`, `X ~ U(1, 6)` : la variable, a, b (manche 13) */
const UNIFORM_REGEX = /^([A-Z])\s*(?:~|suit)\s*U\s*\(\s*(.+?)\s*(?:;|,\s+)\s*(.+?)\s*\)$/;

/** `X ~ U([0 ; 10])` : la loi uniforme À DENSITÉ, a et b (manche 13, PR b) */
const UNIFORM_DENSITY_REGEX =
	/^([A-Z])\s*(?:~|suit)\s*U\s*\(\s*\[\s*(.+?)\s*(?:;|,\s+)\s*(.+?)\s*\]\s*\)$/;

/** `X ~ U([…` : un crochet annonce la loi à densité, même mal fermée */
const UNIFORM_BRACKET_REGEX = /^([A-Z])\s*(?:~|suit)\s*U\s*\(\s*\[/;

/** `X ~ E(0,5)`, `X ~ Exp(0.5)` : la loi exponentielle, λ (manche 13, PR b) */
const EXPONENTIAL_REGEX = /^([A-Z])\s*(?:~|suit)\s*(?:E|Exp)\s*\(\s*(.+?)\s*\)$/;

/**
 * `X ~ N(0 ; 1)`, `X ~ N(100 ; 225)` : la loi normale, μ et σ² — la notation du
 * programme de terminale (2026-10-09) ; « , » suivi d'une espace : N(0, 1)
 */
const NORMAL_REGEX = /^([A-Z])\s*(?:~|suit)\s*N\s*\(\s*(.+?)\s*(?:;|,\s+)\s*(.+?)\s*\)$/;

const DENSITY_CDF_ONLY = 'seulement avec une loi à densité (X ~ U([a ; b]) ou E(λ))';

/** Tableau d'une loi géométrique : k = 1 à 10 par défaut, puis « … » */
const GEOMETRIC_TABLE_VALUES = 10;

const NAMED_ALONE = 'une loi G(p) ou U(a ; b) se donne seule : pas de ligne « X = » ni « P = »';

const RAW_AND_COUNTS = 'soit les données, soit les effectifs (catégorie = effectif), pas les deux';

/** Nom réservé à la ligne et à la colonne des totaux */
const TOTAL = 'Total';

/** Indicateurs, tels que l'auteur les écrit */
const INDICATOR_NAME: Record<StatChartIndicator, string> = {
	effectif: 'effectif',
	moyenne: 'moyenne',
	mediane: 'médiane',
	quartiles: 'quartiles',
	'ecart-interquartile': 'écart interquartile',
	etendue: 'étendue',
	'ecart-type': 'écart type',
	'classe-mediane': 'classe médiane'
};

/** Nuage (manche 15) : `x: 1 ; 2`, `y: …`, et les titres d'axes `nom x: …` */
const SCATTER_DATA_REGEX = /^(nom\s+)?([xy])\s*:\s*(.*)$/i;

/** Options d'un nuage (Q167-Q172), sans accent */
const SCATTER_OPTIONS = [
	'titre',
	'description',
	'taille',
	'couleur',
	'ajustement',
	'indicateurs',
	'prevoir',
	'arrondi',
	'origine',
	'nuage'
] as const;
type ScatterOptionKey = (typeof SCATTER_OPTIONS)[number];

/** Options propres au nuage, refusées ailleurs avec un message situé */
const SCATTER_ONLY_OPTIONS: readonly string[] = ['ajustement', 'prevoir', 'origine', 'nuage'];

/** Indicateurs d'un nuage, tels que l'auteur les écrit */
const SCATTER_INDICATOR_NAME: Record<ScatterIndicator, string> = {
	'point-moyen': 'point moyen',
	equation: 'équation',
	r: 'r'
};

/** `x = 4,5` ou `y = 25` dans `prévoir:` */
const PREDICTION_REGEX = /^([xy])\s*=\s*(.+)$/i;

// ============================================================================
// DÉTECTION
// ============================================================================

/** Genre du bloc qu'ouvre cette ligne, ou null. */
export function isStatChartBlockStart(line: string): StatChartKind | null {
	const match = BLOCK_START_REGEX.exec(line);
	return match ? (match[1] as StatChartKind) : null;
}

/** Ce nom de langage de bloc de code est-il un bloc statistique ? */
export function isStatChartKind(language: string | undefined): language is StatChartKind {
	return (STAT_CHART_KINDS as readonly string[]).includes(language ?? '');
}

/**
 * Ligne qui a la forme d'une ligne de CE bloc statistique : `x: …`,
 * `nom x: …` et les options du nuage seulement dans un ```nuage — sinon un
 * ```barres non fermé avalait une ligne de texte « x: … » (revue)
 */
function looksLikeStatChartLine(kind: StatChartKind, line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.includes('=')) return true;
	const kv = KEY_LINE_REGEX.exec(trimmed);
	if (kind === 'nuage') {
		if (SCATTER_DATA_REGEX.test(trimmed)) return true;
		return kv !== null && (SCATTER_OPTIONS as readonly string[]).includes(optionKeyOf(kv[1]));
	}
	return kv !== null && isOptionKey(optionKeyOf(kv[1]));
}

/**
 * Blocs statistiques d'une liste de lignes (indices inclusifs, clôtures
 * comprises).
 *
 * Bloc NON FERMÉ : il s'arrête avant sa première ligne vide ou sa première
 * ligne qui n'a pas la forme d'une ligne de bloc, pour ne pas avaler la suite
 * du document.
 */
export function findStatChartBlocks(lines: string[]): StatChartBlockRange[] {
	const blocks: StatChartBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		const kind = isStatChartBlockStart(lines[i]);
		if (kind === null) {
			i++;
			continue;
		}
		const startIndex = i;
		let j = i + 1;
		while (j < lines.length && !lines[j].startsWith('```')) j++;
		// ⚠️ Un ``` plus loin ne ferme le bloc que si TOUT ce qui les sépare a la
		// forme d'une ligne de bloc (Q25) : sinon il avalait le texte intermédiaire
		const body = lines.slice(startIndex + 1, j);
		const closes = !bodyOpensParagraph(body, (line) => looksLikeStatChartLine(kind, line));
		if (j < lines.length && BLOCK_END_REGEX.test(lines[j]) && closes) {
			blocks.push({ kind, startIndex, endIndex: j, closed: true });
			i = j + 1;
			continue;
		}
		let end = startIndex;
		for (let k = startIndex + 1; k < j; k++) {
			if (lines[k].trim() === '' || !looksLikeStatChartLine(kind, lines[k])) break;
			end = k;
		}
		blocks.push({ kind, startIndex, endIndex: end, closed: false });
		i = end + 1;
	}
	return blocks;
}

// ============================================================================
// AIDE
// ============================================================================

/** Erreur située, levée pendant l'analyse d'une ligne */
class LineError extends Error {}

function normalizeKey(raw: string): string {
	return raw.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Clé d'option : sans accent, ni majuscule, ni apostrophe (`jusqu'à` → `jusqua`) */
function optionKeyOf(raw: string): string {
	return normalizeKey(raw).replace(/['’]/g, '');
}

function isOptionKey(key: string): key is OptionKey {
	return (OPTION_KEYS as readonly string[]).includes(key);
}

function formatForMessage(value: number): string {
	return String(value).replace('.', ',');
}

function toNumber(text: string): number {
	return Number(text.replace(',', '.'));
}

/** Un nombre écrit par l'auteur : valeur et unité. */
function parseValue(raw: string): { value: number; unit: StatChartUnit } {
	const text = raw.trim();
	const match = NUMBER_REGEX.exec(text);
	if (!match) {
		throw new LineError(`« ${text} » n'est pas un nombre (écrire par exemple 12, 12,5 ou 35 %)`);
	}
	const value = toNumber(match[1]);
	const unit: StatChartUnit = match[2] === '%' ? 'pourcentages' : 'effectifs';
	if (value < 0) {
		throw new LineError(`un effectif ne peut pas être négatif (reçu ${formatForMessage(value)})`);
	}
	if (value > STAT_CHART_LIMITS.maxValue) throw new LineError('nombre trop grand (au plus 10^9)');
	if (unit === 'effectifs' && !Number.isInteger(value)) {
		throw new LineError(
			`un effectif est un nombre entier (reçu ${formatForMessage(value)}) ; pour une fréquence, écrire un pourcentage (35 %)`
		);
	}
	return { value, unit };
}

/** Une classe `[a ; b[` : bornes, et son nom récrit proprement. */
function parseClass(raw: string): { label: string; interval: { lower: number; upper: number } } {
	const match = CLASS_REGEX.exec(raw);
	if (!match) {
		throw new LineError(
			`« ${raw} » : écrire une classe sous la forme [a ; b[, par exemple [0 ; 10[`
		);
	}
	// Au-delà, le PGCD des amplitudes (quadrillage) n'est plus calculable sûrement
	if ([match[1], match[2]].some((bound) => (bound.split(/[.,]/)[1] ?? '').length > 4)) {
		throw new LineError(`« ${raw} » : au plus 4 décimales dans une borne`);
	}
	const lower = toNumber(match[1]);
	const upper = toNumber(match[2]);
	if (
		Math.abs(lower) > STAT_CHART_LIMITS.maxValue ||
		Math.abs(upper) > STAT_CHART_LIMITS.maxValue
	) {
		throw new LineError('borne trop grande (au plus 10^9 en valeur absolue)');
	}
	if (!(lower < upper)) {
		throw new LineError(`la borne gauche de ${raw} doit être inférieure à la borne droite`);
	}
	return {
		label: `[${formatForMessage(lower)} ; ${formatForMessage(upper)}[`,
		interval: { lower, upper }
	};
}

function parseText(raw: string, what: string): string {
	const text = raw.trim();
	if (text === '') throw new LineError(`${what} vide`);
	if (text.length > STAT_CHART_LIMITS.textLength) {
		throw new LineError(`${what} trop long (au plus ${STAT_CHART_LIMITS.textLength} caractères)`);
	}
	return text;
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], what: string): T {
	const wanted = normalizeKey(raw.trim());
	const match = allowed.find((candidate) => normalizeKey(candidate) === wanted);
	if (match === undefined) {
		throw new LineError(`${what} « ${raw.trim()} » inconnue (choisir : ${allowed.join(', ')})`);
	}
	return match;
}

function parseIndicators(raw: string): StatChartIndicator[] {
	const names = raw
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (names.length === 0) throw new LineError('indicateurs : aucun indicateur donné');
	return names.map((name) => {
		const key = normalizeKey(name).replace(/[\s-]+/g, '-');
		const known = STAT_CHART_INDICATORS.find((indicator) => indicator === key);
		if (known === undefined) {
			const choices = STAT_CHART_INDICATORS.map((i) => INDICATOR_NAME[i]).join(', ');
			throw new LineError(`indicateur « ${name} » inconnu (choisir : ${choices})`);
		}
		return known;
	});
}

function applyOption(kind: StatChartKind, key: OptionKey, value: string, options: Options): void {
	const allowed = OPTION_KINDS[key];
	if (allowed !== undefined && !allowed.includes(kind)) {
		// `taille:` d'une simulation est celle d'un échantillon, pas d'une figure
		const shown = key === 'taille' ? FIGURE_KINDS : allowed;
		const names = shown.map((k) => KIND_NAME[k]).join(', ');
		throw new LineError(
			`l'option « ${OPTION_SPELLING[key] ?? key} » ne s'applique pas aux ${KIND_NAME[kind]} (réservée aux ${names})`
		);
	}
	switch (key) {
		case 'titre':
			options.title = parseText(value, 'titre');
			return;
		case 'description':
			options.description = parseText(value, 'description');
			return;
		case 'axes': {
			const parts = value.split(';').map((part) => part.trim());
			if (parts.length !== 2) {
				throw new LineError('écrire « axes: titre horizontal ; titre vertical »');
			}
			options.axes = {
				x: parts[0] === '' ? null : parseText(parts[0], 'titre d’axe'),
				y: parts[1] === '' ? null : parseText(parts[1], 'titre d’axe')
			};
			return;
		}
		case 'taille':
			if (kind === 'simulation') {
				if ((COURBE_SIZES as readonly string[]).includes(normalizeKey(value.trim()))) {
					throw new LineError(
						'taille : celle d’un échantillon (mode échantillons), pas de la figure'
					);
				}
				options.sampleSize = parseWhole(
					value,
					1,
					STAT_CHART_LIMITS.simulationSamples,
					'taille : un entier entre 1 et 1 000'
				);
				return;
			}
			options.size = oneOf(value, COURBE_SIZES, 'taille');
			return;
		case 'serie': {
			const mode = SERIES_MODES.find((m) => normalizeKey(m) === normalizeKey(value.trim()));
			if (mode === undefined) throw new LineError('série : affichée, triée ou seule');
			options.seriesMode = mode;
			return;
		}
		case 'classes':
			if (kind === 'simulation') {
				const { min, max } = STAT_CHART_LIMITS.simulationClasses;
				const message = `classes : un nombre de classes, de ${min} à ${max} (pas des bornes)`;
				options.simulationClasses = parseWhole(value, min, max, message);
				return;
			}
			options.classBounds = parseClassBounds(value);
			return;
		case 'echantillons':
			options.samples = parseWhole(
				value,
				1,
				STAT_CHART_LIMITS.simulationSamples,
				'échantillons : un entier entre 1 et 1 000'
			);
			return;
		case 'couleur':
			// Synonymes anglais (`pink` → `rose`) ramenés au nom de la palette
			options.color = oneOf(resolveNamedColor(value) ?? value, COURBE_COLORS, 'couleur');
			return;
		case 'etiquettes':
			options.labels = oneOf(value, STAT_CHART_LABELS, 'étiquette');
			return;
		case 'sens':
			options.direction = oneOf(value, STAT_CHART_DIRECTIONS, 'sens');
			return;
		case 'lecture':
			options.reading = oneOf(value, STAT_CHART_READINGS, 'lecture');
			return;
		case 'indicateurs':
			if (kind === 'loi') options.lawIndicators = parseLawIndicators(value);
			else options.indicators = parseIndicators(value);
			return;
		case 'legende': {
			const match = AREA_LEGEND_REGEX.exec(value.trim());
			if (!match) throw new LineError('écrire « légende: 1 carreau = 2 élèves »');
			const area = toNumber(match[1]);
			if (!(area > 0)) throw new LineError('un carreau doit valoir plus que 0');
			const word = match[2].trim();
			if (word.length > STAT_CHART_LIMITS.labelLength) {
				throw new LineError(
					`mot de la légende trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
				);
			}
			options.areaLegend = { value: area, unit: word === '' ? null : word };
			return;
		}
		case 'valeurs':
			options.showValues = yesNo(value, 'valeurs');
			return;
		case 'totaux':
			options.showTotals = yesNo(value, 'totaux');
			return;
		case 'lignes':
			if (kind === 'effectifs') {
				options.tableRows = parseTableRows(value);
				return;
			}
			options.rows = parseNames(value, 'lignes');
			return;
		case 'arrondi':
			options.places = parseWhole(value, 1, 6, 'arrondi : un nombre de décimales de 1 à 6');
			return;
		case 'probabilites':
			options.binomialQueries = value;
			return;
		case 'diagramme':
			options.binomialChart = yesNo(value, 'diagramme');
			return;
		case 'intervalle':
			options.binomialLevel = parseLevel(value);
			return;
		case 'seuil':
			options.binomialThreshold = value.trim();
			return;
		case 'repartition':
			options.cdf = yesNo(value, 'répartition');
			return;
		case 'aire':
			options.areaQuery = value.trim();
			return;
		case 'jusqua':
			options.upTo = parseWhole(
				value,
				1,
				STAT_CHART_LIMITS.binomialTableValues,
				`jusqu'à : un entier de 1 à ${STAT_CHART_LIMITS.binomialTableValues}`
			);
			return;
		case 'frequences': {
			const written = normalizeKey(value.trim());
			if (written !== 'decimales' && written !== 'pourcentages') {
				throw new LineError('fréquences : décimales ou pourcentages');
			}
			options.decimalFrequencies = written === 'decimales';
			return;
		}
		case 'colonnes':
			options.columns = parseNames(value, 'colonnes');
			return;
		case 'afficher': {
			if (kind === 'barres' || kind === 'histogramme') {
				const shown = (['effectifs', 'fréquences'] as const).find(
					(d) => normalizeKey(d) === normalizeKey(value.trim())
				);
				if (shown === undefined) throw new LineError('afficher : effectifs ou fréquences');
				options.barDisplay = shown;
				return;
			}
			options.display = oneOf(value, CROSS_TABLE_DISPLAYS, 'affichage');
			return;
		}
		case 'coin':
			options.corner = parseText(value, 'coin');
			return;
		case 'mode':
			options.simulationMode = parseSimulationMode(value);
			return;
		case 'tirages':
			options.draws = parseWhole(
				value,
				1,
				STAT_CHART_LIMITS.simulationDraws,
				'tirages : un entier entre 1 et 10 000'
			);
			return;
		case 'graine':
			options.seed = parseWhole(
				value,
				0,
				STAT_CHART_LIMITS.simulationSeed,
				'graine : un entier entre 0 et 999 999 999'
			);
			return;
		case 'masquer':
			// Tableau d'effectifs (Q130) : résolu une fois les valeurs connues
			if (kind === 'effectifs') {
				options.tableMasked = value;
				return;
			}
			if (kind === 'loi') {
				options.lawMasked = value
					.split(';')
					.map((v) => v.trim())
					.filter((v) => v !== '');
				return;
			}
			// La ligne est connue ici ; les noms sont vérifiés une fois tout lu
			options.masked = value
				.split(';')
				.map((pair) => pair.trim())
				.filter((pair) => pair !== '')
				.map((pair) => {
					const slash = pair.lastIndexOf('/');
					if (slash <= 0 || slash === pair.length - 1) {
						throw new LineError(`« ${pair} » : écrire une case sous la forme Ligne/Colonne`);
					}
					// « total » en toutes casses désigne les totaux, comme dans `parseNames`
					const name = (raw: string) =>
						normalizeKey(raw.trim()) === normalizeKey(TOTAL) ? TOTAL : raw.trim();
					return { row: name(pair.slice(0, slash)), column: name(pair.slice(slash + 1)), line: 0 };
				});
			return;
	}
}

/** Un entier de `min` à `max` ; `10 000` s'écrit avec ses espaces */
function parseWhole(raw: string, min: number, max: number, message: string): number {
	const digits = raw.trim().replace(/[\s\u00a0\u202f]/g, '');
	if (!/^\d{1,10}$/.test(digits)) throw new LineError(message);
	const value = Number(digits);
	if (value < min || value > max) throw new LineError(message);
	return value;
}

/** `mode:` d'une simulation : `tirages`, `moyenne` ou `échantillons` (accent facultatif) */
function parseSimulationMode(raw: string): SimulationMode {
	const written = raw.trim();
	const mode = SIMULATION_MODES.find((m) => normalizeKey(m) === normalizeKey(written));
	if (mode === undefined) {
		throw new LineError(`mode « ${written} » inconnu (choisir : ${SIMULATION_MODES.join(', ')})`);
	}
	return mode;
}

/**
 * Options d'une simulation qui dépendent du mode, une fois tout lu : le mode
 * peut s'écrire après elles. Rend l'erreur située, ou null.
 */
function checkSimulationOptions(
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): StatChartIssue | null {
	const at = (line: number, message: string) => ({ message: `Ligne ${line} : ${message}`, line });
	const bySamples = options.simulationMode === 'échantillons';
	if (bySamples && optionLines.tirages !== undefined) {
		return at(
			optionLines.tirages,
			'tirages : pas en mode échantillons (écrire échantillons: et taille:)'
		);
	}
	if (!bySamples) {
		for (const key of ['echantillons', 'taille'] as const) {
			const line = optionLines[key];
			if (line !== undefined) {
				return at(line, `${OPTION_SPELLING[key] ?? key} : seulement en mode échantillons`);
			}
		}
		return null;
	}
	const total = options.samples * options.sampleSize;
	if (total > STAT_CHART_LIMITS.simulationSampleDraws) {
		const line = Math.max(optionLines.echantillons ?? 0, optionLines.taille ?? 0);
		return at(
			line,
			`échantillons × taille : au plus 100 000 tirages (ici ${String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')})`
		);
	}
	return null;
}

/**
 * Une valeur de série brute, si elle se lit comme un nombre : la lecture de
 * l'atelier (Q92 — `+3`, `1e3`, `1/2`, vrai signe moins), sinon null.
 */
function rawNumber(text: string): number | null {
	return readListValue(text);
}

/** `1/2`, `−3/4`, `+2/4` : une fraction d'entiers, écrite proprement */
const RAW_FRACTION = /^\s*([-+]?\d+)\s*\/\s*(\d+)\s*$/;

/**
 * Nom d'une catégorie numérique : la fraction telle qu'écrite (sans `+`), sinon
 * le nombre récrit (`0012` → `12`, `-0` → `0`, `12,50` → `12,5`, `1e3` →
 * `1000`), lisible par les indicateurs.
 */
function numericLabel(text: string, value: number): string {
	const fraction = RAW_FRACTION.exec(text.replaceAll('−', '-'));
	if (fraction) return `${Number(fraction[1])}/${Number(fraction[2])}`;
	const written = String(value);
	if (written.includes('e')) {
		throw new LineError(`données : « ${text} » est trop grand ou trop petit pour un diagramme`);
	}
	return written.replace('.', ',');
}

/**
 * Les valeurs d'une ligne `données:` (Q101). Un point-virgule final ne compte
 * pas ; une valeur vide ailleurs, ou des virgules en guise de séparateur
 * (`12, 15, 8`, `12, Bus`), sont refusées en montrant la correction.
 */
function parseRawEntries(text: string): string[] {
	const entries = text.split(';').map((entry) => entry.trim());
	if (entries.length > 1 && entries.at(-1) === '') entries.pop();
	if (entries.length === 1 && entries[0] === '') throw new LineError('données : aucune valeur');
	for (const entry of entries) {
		if (entry === '') throw new LineError('valeur vide (un « ; » de trop ?)');
		// `12,5` se lit : un décimal, jamais deux valeurs
		if (!entry.includes(',') || rawNumber(entry) !== null) continue;
		// `12,5, 13` : couper d'abord sur « virgule espace », pour ne pas casser 12,5
		const spaced = entry.split(/\s*,\s+/);
		const pieces = (spaced.length >= 2 ? spaced : entry.split(',')).map((p) => p.trim());
		if (pieces.length >= 2 && pieces.every((piece) => piece !== '')) {
			throw new LineError(`séparer les valeurs par des points-virgules : ${pieces.join(' ; ')}`);
		}
	}
	return entries;
}

/**
 * Dépouiller une série brute (Q103) : si toutes les valeurs se lisent comme
 * des nombres, dans l'ordre croissant (`12,5` et `12,50`, `1/2` et `0,5` ne
 * font qu'une catégorie) ; sinon modalités dans l'ordre d'apparition,
 * comparées sans la casse (et en NFC), écrites comme leur première occurrence
 * (Q85). Rend les catégories, ou l'erreur située.
 */
/** Une catégorie d'une série brute, et ses effectifs série par série */
interface RawCategory {
	label: string;
	value: number;
	count: number[];
	line: number;
}

/**
 * Regrouper des valeurs brutes en catégories (Q103) : si TOUTES se lisent comme
 * des nombres, dans l'ordre croissant (`12,5` et `12,50`, `1/2` et `0,5` ne
 * font qu'une catégorie) ; sinon modalités dans l'ordre d'apparition, comparées
 * sans la casse (et en NFC), écrites comme leur première occurrence (Q85).
 * `series` (0 par défaut) dit à quelle série chaque valeur appartient.
 */
function groupRaw(
	raw: readonly { text: string; line: number; series?: number }[],
	seriesCount = 1
): { categories: RawCategory[]; numeric: boolean } | { error: StatChartIssue } {
	const values = raw.map((entry) => rawNumber(entry.text));
	const numeric = values.every((value) => value !== null);
	const groups = new Map<string, RawCategory>();
	for (const [i, { text, line, series = 0 }] of raw.entries()) {
		// `+ 0` : -0 et 0 sont la même catégorie
		const value = numeric ? (values[i] ?? 0) + 0 : 0;
		const key = numeric ? String(value) : text.normalize('NFC').toLocaleLowerCase('fr');
		const group = groups.get(key);
		if (group) {
			group.count[series]++;
			continue;
		}
		let label = text;
		if (numeric) {
			try {
				label = numericLabel(text, value);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return { error: { message: `Ligne ${line} : ${message}`, line } };
			}
		}
		const count = new Array<number>(seriesCount).fill(0);
		count[series] = 1;
		groups.set(key, { label, value, count, line });
	}
	const categories = [...groups.values()];
	if (numeric) categories.sort((a, b) => a.value - b.value);
	return { categories, numeric };
}

/**
 * Deux séries nommées (lot 5 PR b, Q115) : leurs valeurs réunies en catégories
 * communes (au plus 15, deux barres chacune), l'effectif de chacune par série.
 */
function tallyTwoSeries(
	first: NamedSeries,
	second: NamedSeries,
	forced: 'effectifs' | 'fréquences' | null
):
	| { data: StatChartDatum[]; twoSeries: NonNullable<StatChartSpec['twoSeries']> }
	| { error: StatChartIssue } {
	for (const series of [first, second]) {
		if (series.entries.length > STAT_CHART_LIMITS.rawValues) {
			const line = series.entries[0].line;
			return {
				error: {
					message: `Ligne ${line} : données ${series.name} : au plus ${STAT_CHART_LIMITS.rawValues} valeurs (ici ${series.entries.length})`,
					line
				}
			};
		}
	}
	const grouped = groupRaw(
		[
			...first.entries.map((e) => ({ ...e, series: 0 })),
			...second.entries.map((e) => ({ ...e, series: 1 }))
		],
		2
	);
	if ('error' in grouped) return grouped;
	const { categories, numeric } = grouped;
	const firstLine = Math.min(first.entries[0].line, second.entries[0].line);
	const tooLong = categories.find((c) => c.label.length > STAT_CHART_LIMITS.labelLength);
	if (tooLong) {
		return {
			error: {
				message: `Ligne ${tooLong.line} : nom de catégorie trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`,
				line: tooLong.line
			}
		};
	}
	const max = STAT_CHART_LIMITS.twoSeriesCategories;
	if (categories.length > max) {
		return {
			error: {
				message: `Ligne ${firstLine} : données : ${categories.length} valeurs différentes, au plus ${max} (deux barres chacune)`,
				line: firstLine
			}
		};
	}
	const values = (series: NamedSeries) => series.entries.map((e) => rawNumber(e.text) ?? 0);
	return {
		data: categories.map((c) => ({
			label: c.label,
			value: c.count[0],
			interval: null,
			line: c.line
		})),
		twoSeries: {
			names: [first.name, second.name],
			counts: [categories.map((c) => c.count[0]), categories.map((c) => c.count[1])],
			display:
				forced ?? (first.entries.length === second.entries.length ? 'effectifs' : 'fréquences'),
			values: numeric ? [values(first), values(second)] : null
		}
	};
}

/**
 * Deux séries nommées dans un histogramme ou un polygone (lot 5 PR c) : chacune
 * rangée dans les MÊMES classes. Pas de mode carreaux (Q120) : ni `légende:`,
 * ni classes d'amplitudes différentes — une échelle commune n'aurait plus de sens.
 */
function tallyTwoSeriesInClasses(
	kind: StatChartKind,
	first: NamedSeries,
	second: NamedSeries,
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
):
	| { data: StatChartDatum[]; twoSeries: NonNullable<StatChartSpec['twoSeries']> }
	| { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	if (options.areaLegend !== null) {
		return at(optionLines.legende ?? 0, 'une seule série en mode carreaux');
	}
	const ranged: { data: StatChartDatum[]; values: number[] }[] = [];
	for (const series of [first, second]) {
		const outcome = tallyIntoClasses(
			kind,
			series.entries,
			options.classBounds,
			optionLines.classes ?? 0
		);
		if ('error' in outcome) {
			// La série en cause est nommée, sauf pour une faute de `classes:`
			const { message, line } = outcome.error;
			const named =
				line === (optionLines.classes ?? -1) || options.classBounds === null
					? message
					: message.replace(/^Ligne (\d+) : /, `Ligne $1 : ${series.name} : `);
			return { error: { message: named, line } };
		}
		ranged.push(outcome);
	}
	const widths = ranged[0].data.map((d) => (d.interval ? d.interval.upper - d.interval.lower : 0));
	if (widths.some((w) => Math.abs(w - widths[0]) > 1e-9 * Math.max(1, Math.abs(widths[0])))) {
		return at(
			optionLines.classes ?? 0,
			'deux séries : des classes de même amplitude (pas de mode carreaux)'
		);
	}
	const [a, b] = ranged;
	return {
		data: a.data,
		twoSeries: {
			names: [first.name, second.name],
			counts: [a.data.map((d) => d.value), b.data.map((d) => d.value)],
			display:
				options.barDisplay ??
				(first.entries.length === second.entries.length ? 'effectifs' : 'fréquences'),
			values: [a.values, b.values]
		}
	};
}

/**
 * Lignes et options d'un tableau d'effectifs, une fois tout lu (Q128) : les
 * cumuls demandent des nombres ou des classes ; `sens:` une ligne cumulée ;
 * `fréquences:` une ligne de fréquences.
 */
function checkFrequencyTable(
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>,
	seen: ReadonlySet<OptionKey>,
	data: readonly StatChartDatum[],
	classes: boolean
): { table: NonNullable<StatChartSpec['frequencyTable']> } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const rows = options.tableRows ?? ['effectifs'];
	const cumulative = rows.find((row) => row.endsWith('cumulés') || row.endsWith('cumulées'));
	// La lecture de l'atelier (Q92) : vrai signe moins, `+3`, fractions (revue)
	const values = data.map((d) => rawNumber(d.label));
	const numeric = values.every((v) => v !== null);
	if (cumulative !== undefined && !classes && !numeric) {
		return at(optionLines.lignes ?? 0, `${cumulative} : seulement pour des nombres ou des classes`);
	}
	// Un cumul suit l'ordre croissant des valeurs : écrites dans le désordre, il
	// serait faux (revue) — refusé plutôt que réordonné en silence
	if (cumulative !== undefined && !classes) {
		const unsorted = values.findIndex((v, i) => i > 0 && (v ?? 0) <= (values[i - 1] ?? 0));
		if (unsorted !== -1) {
			return at(
				data[unsorted].line,
				`${cumulative} : écrire les valeurs dans l'ordre croissant (${data[unsorted].label} après ${data[unsorted - 1].label})`
			);
		}
	}
	if (data.every((d) => d.value === 0)) {
		return at(data[0].line, 'effectif total nul : rien à dépouiller');
	}
	if (seen.has('sens') && cumulative === undefined) {
		return at(optionLines.sens ?? 0, 'sens : seulement avec une ligne cumulée');
	}
	if (options.decimalFrequencies !== null && !rows.some((row) => row.startsWith('fréquences'))) {
		return at(optionLines.frequences ?? 0, 'fréquences : seulement avec une ligne de fréquences');
	}
	// « Total » désigne la colonne des totaux : une catégorie ne peut pas s'y
	// appeler ainsi (revue, comme le tableau croisé)
	const homonym = options.showTotals
		? data.find((d) => normalizeKey(d.label.trim()) === normalizeKey(TOTAL))
		: undefined;
	if (homonym) {
		return at(
			homonym.line,
			'« Total » est réservé à la colonne des totaux : renommer cette valeur'
		);
	}
	const masked =
		options.tableMasked === null
			? []
			: resolveTableMasks(options.tableMasked, rows, data, options.showTotals);
	if (typeof masked === 'string') return at(optionLines.masquer ?? 0, masked);
	return {
		table: {
			rows,
			decimals: options.decimalFrequencies === true,
			showTotals: options.showTotals,
			direction: options.direction,
			classes,
			masked
		}
	};
}

/**
 * `masquer:` d'un tableau d'effectifs (Q130) : des lignes entières
 * (`fréquences`) ou des cases (`12/effectifs`, `Total/fréquences`,
 * `[0 ; 10[/effectifs`). Rend les cases, ou le message d'erreur.
 */
function resolveTableMasks(
	written: string,
	rows: readonly FrequencyTableRow[],
	data: readonly StatChartDatum[],
	showTotals: boolean
): { row: FrequencyTableRow; column: number | 'total' }[] | string {
	// Une classe contient un « ; » : `[0 ; 10[/effectifs` se recoud
	const pieces: string[] = [];
	for (const piece of written.split(';')) {
		const last = pieces.at(-1);
		if (last !== undefined && last.trim().startsWith('[') && !last.includes('/')) {
			pieces[pieces.length - 1] = `${last};${piece}`;
		} else pieces.push(piece);
	}
	const rowOf = (name: string): FrequencyTableRow | string => {
		const row = FREQUENCY_TABLE_ROWS.find((r) => normalizeKey(r) === normalizeKey(name.trim()));
		if (row === undefined || !rows.includes(row)) {
			return `masquer : la ligne « ${name.trim()} » n’est pas dans le tableau`;
		}
		return row;
	};
	// Aux espaces et à la casse près, comme les noms de lignes (revue)
	const squash = (text: string) =>
		text.replace(/\s+/g, '').replaceAll('−', '-').toLocaleLowerCase('fr');
	const masked: { row: FrequencyTableRow; column: number | 'total' }[] = [];
	const entries = pieces.map((p) => p.trim()).filter((p) => p !== '');
	// `masquer:` vide : la fiche partirait sans case à compléter (revue)
	if (entries.length === 0) return 'masquer : aucune case donnée';
	for (const piece of entries) {
		const slash = piece.lastIndexOf('/');
		// Une classe sans « / » : une case mal écrite, pas un nom de ligne (revue)
		if (slash === -1 && piece.startsWith('[')) {
			return 'masquer : écrire valeur/ligne, par exemple 12/effectifs';
		}
		if (slash === -1) {
			const row = rowOf(piece);
			if (!FREQUENCY_TABLE_ROWS.includes(row as FrequencyTableRow)) return row;
			const columns: (number | 'total')[] = data.map((_, i) => i);
			const cumulative = row.endsWith('cumulés') || row.endsWith('cumulées');
			if (showTotals && !cumulative) columns.push('total');
			for (const column of columns) masked.push({ row: row as FrequencyTableRow, column });
			continue;
		}
		const value = piece.slice(0, slash).trim();
		const rowName = piece.slice(slash + 1).trim();
		if (value === '' || rowName === '') {
			return 'masquer : écrire valeur/ligne, par exemple 12/effectifs';
		}
		const row = rowOf(rowName);
		if (!FREQUENCY_TABLE_ROWS.includes(row as FrequencyTableRow)) return row;
		const cumulative = row.endsWith('cumulés') || row.endsWith('cumulées');
		if (normalizeKey(value) === 'total') {
			if (!showTotals) return 'masquer : pas de colonne Total (« totaux: non »)';
			if (cumulative) return 'masquer : pas de total pour un cumul';
			masked.push({ row: row as FrequencyTableRow, column: 'total' });
			continue;
		}
		// Une valeur telle qu'écrite, aux espaces près ; un nombre, à l'écriture près
		const number = rawNumber(value);
		const column = data.findIndex(
			(d) =>
				squash(d.label) === squash(value) ||
				(number !== null && d.interval === null && rawNumber(d.label) === number)
		);
		if (column === -1) return `masquer : la valeur « ${value} » n’est pas dans le tableau`;
		masked.push({ row: row as FrequencyTableRow, column });
	}
	return masked;
}

function tallyRawData(
	kind: StatChartKind,
	raw: readonly { text: string; line: number }[],
	maxCategories: number
): { data: StatChartDatum[] } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const firstLine = raw[0].line;
	if (raw.length > STAT_CHART_LIMITS.rawValues) {
		return at(
			firstLine,
			`données : au plus ${STAT_CHART_LIMITS.rawValues} valeurs (ici ${raw.length})`
		);
	}

	const grouped = groupRaw(raw);
	if ('error' in grouped) return grouped;
	const categories = grouped.categories.map((c) => ({ ...c, count: c.count[0] }));

	const tooLong = categories.find((c) => c.label.length > STAT_CHART_LIMITS.labelLength);
	if (tooLong) {
		return at(
			tooLong.line,
			`nom de catégorie trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
		);
	}
	if (categories.length > maxCategories) {
		const shapes = kind === 'circulaire' ? 'secteurs' : kind === 'effectifs' ? 'valeurs' : 'barres';
		return at(
			firstLine,
			`données : ${categories.length} valeurs différentes, au plus ${maxCategories} ${shapes}`
		);
	}
	return {
		data: categories.map((c) => ({ label: c.label, value: c.count, interval: null, line: c.line }))
	};
}

/**
 * `classes: 0 ; 5 ; 10` (Q104) : des bornes croissantes, au moins deux, au plus
 * 20 classes. Rend les bornes telles qu'écrites (vrai signe moins récrit).
 */
function parseClassBounds(value: string): string[] {
	const bounds = value.split(';').map((bound) => bound.trim().replaceAll('−', '-'));
	if (bounds.length > 1 && bounds.at(-1) === '') bounds.pop();
	for (const bound of bounds) {
		if (!PLAIN_NUMBER_REGEX.test(bound)) {
			throw new LineError(`classes : « ${bound} » n'est pas une borne (écrire 0 ; 5 ; 10)`);
		}
	}
	for (const bound of bounds) {
		// Les contrôles de `parseClass`, mais sur la borne ÉCRITE (revue : le message
		// citait une classe « [0 ; 0,12345[ » que l'auteur n'avait pas écrite)
		if ((bound.split(/[.,]/)[1] ?? '').length > 4) {
			throw new LineError(`classes : au plus 4 décimales dans une borne (${bound})`);
		}
		if (Math.abs(toNumber(bound)) > STAT_CHART_LIMITS.maxValue) {
			throw new LineError(`classes : borne trop grande (${bound}, au plus 10^9 en valeur absolue)`);
		}
	}
	if (bounds.length < 2) {
		throw new LineError('classes : au moins deux bornes (classes: 0 ; 5 ; 10)');
	}
	for (let i = 1; i < bounds.length; i++) {
		if (!(toNumber(bounds[i - 1]) < toNumber(bounds[i]))) {
			throw new LineError(
				`classes : les bornes doivent croître (${bounds[i - 1]} puis ${bounds[i]})`
			);
		}
	}
	if (bounds.length - 1 > STAT_CHART_LIMITS.classes) {
		throw new LineError(
			`classes : au plus ${STAT_CHART_LIMITS.classes} classes (ici ${bounds.length - 1})`
		);
	}
	return bounds;
}

/** Un nombre dans un message : virgule décimale, vrai signe moins */
function spokenNumber(value: number): string {
	return formatForMessage(value).replace('-', '−');
}

/**
 * Ranger une série brute dans ses classes `[a ; b[` (Q104) : mêmes classes que
 * les lignes `[a ; b[ = effectif` (même lecture des bornes, mêmes contrôles).
 * Une valeur hors des classes, ou qui n'est pas un nombre, est refusée et
 * nommée. Rend les classes et les valeurs brutes, ou l'erreur située.
 */
function tallyIntoClasses(
	kind: StatChartKind,
	raw: readonly { text: string; line: number }[],
	bounds: readonly string[] | null,
	boundsLine: number
): { data: StatChartDatum[]; values: number[] } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	if (bounds === null) {
		return at(raw[0].line, 'données : écrire aussi les classes (classes: 0 ; 5 ; 10)');
	}
	if (raw.length > STAT_CHART_LIMITS.rawValues) {
		return at(
			raw[0].line,
			`données : au plus ${STAT_CHART_LIMITS.rawValues} valeurs (ici ${raw.length})`
		);
	}

	let classes: ReturnType<typeof parseClass>[];
	try {
		classes = bounds.slice(1).map((upper, i) => parseClass(`[${bounds[i]} ; ${upper}[`));
	} catch (error) {
		return at(boundsLine, `classes : ${error instanceof Error ? error.message : String(error)}`);
	}
	const first = classes[0];
	const last = classes[classes.length - 1];
	const counts = classes.map(() => 0);
	const values: number[] = [];
	const chart =
		kind === 'histogramme'
			? 'un histogramme'
			: kind === 'effectifs'
				? 'un tableau en classes'
				: 'un polygone';
	for (const { text, line } of raw) {
		const value = rawNumber(text);
		if (value === null) {
			return at(line, `« ${text} » n’est pas un nombre : ${chart} demande des nombres`);
		}
		if (value < first.interval.lower) {
			return at(line, `${spokenNumber(value)} sort des classes : la première est ${first.label}`);
		}
		if (value >= last.interval.upper) {
			// Arrondie aux décimales des bornes : 0,3 + 0,1 donnait 0,39999999999999997
			const decimals = Math.max(...bounds.map((b) => (b.split(/[.,]/)[1] ?? '').length));
			const next = Number((2 * last.interval.upper - last.interval.lower).toFixed(decimals));
			return at(
				line,
				`${spokenNumber(value)} sort des classes : la dernière est ${last.label} (ajouter une borne, par exemple ${spokenNumber(next)})`
			);
		}
		counts[classes.findIndex((c) => value < c.interval.upper)]++;
		values.push(value);
	}
	return {
		data: classes.map((c, i) => ({
			label: c.label,
			value: counts[i],
			interval: c.interval,
			line: boundsLine
		})),
		values
	};
}

/** `lignes: effectifs ; fréquences` d'un tableau d'effectifs (Q128), dans l'ordre écrit */
function parseTableRows(value: string): FrequencyTableRow[] {
	const rows: FrequencyTableRow[] = [];
	for (const written of value
		.split(';')
		.map((v) => v.trim())
		.filter((v) => v !== '')) {
		const row = FREQUENCY_TABLE_ROWS.find((r) => normalizeKey(r) === normalizeKey(written));
		if (row === undefined) {
			throw new LineError(
				`lignes : « ${written} » inconnue (choisir : ${FREQUENCY_TABLE_ROWS.join(', ')})`
			);
		}
		if (rows.includes(row)) throw new LineError(`lignes : « ${written} » donnée deux fois`);
		rows.push(row);
	}
	if (rows.length === 0) throw new LineError('lignes : aucune ligne donnée');
	return rows;
}

/** `intervalle: 0,95`, `95 %` ou `α = 0,05` (Q140) : le niveau 1 − α, strictement dans ]0 ; 1[ */
function parseLevel(value: string): Fraction {
	const message = 'intervalle : un niveau strictement entre 0 et 1 (0,95, 95 % ou α = 0,05)';
	const alpha = /^(?:α|alpha)\s*=\s*(.+)$/i.exec(value.trim());
	const read = Fraction.parse(alpha ? alpha[1] : value.trim());
	if (read === null) throw new LineError(message);
	// Un niveau DÉCIMAL : 2/3 s'écrivait « 0,6666…667 » avec 40 décimales (revue)
	let den = read.den;
	for (const factor of [2n, 5n]) while (den % factor === 0n) den /= factor;
	if (den !== 1n) throw new LineError(message);
	const level = alpha ? Fraction.ONE.sub(read) : read;
	if (level.isNegative() || level.equals(Fraction.ZERO) || !Fraction.ONE.greaterThan(level)) {
		throw new LineError(message);
	}
	return level;
}

function parseLawIndicators(raw: string): LawIndicator[] {
	const names = raw
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (names.length === 0) throw new LineError('indicateurs : aucun indicateur donné');
	// `indicateurs: aucun` (Q159) : aucune ligne, pas même l'E par défaut de G(p) et U(a ; b)
	if (names.some((name) => normalizeKey(name) === 'aucun')) {
		if (names.length > 1) throw new LineError('indicateurs : « aucun » s’écrit seul');
		return [];
	}
	const indicators = names.map((name) => {
		const key = normalizeKey(name).replace(/[\s-]+/g, '-');
		const known = (Object.keys(LAW_INDICATOR_NAMES) as LawIndicator[]).find((i) => i === key);
		if (known === undefined) {
			throw new LineError(
				`indicateur « ${name} » inconnu pour une loi (choisir : espérance, variance, écart type)`
			);
		}
		return known;
	});
	// Écrit deux fois : affiché une fois
	return indicators.filter((indicator, i) => indicators.indexOf(indicator) === i);
}

/**
 * Contrôles d'une loi, une fois tout lu (Q41-Q42) : le module statistique dit
 * si c'en est une (somme exacte 1, probabilités dans [0 ; 1], valeurs
 * distinctes). Rend les données, ou les erreurs.
 */
/** Lecture d'une borne de `probabilités:` : ⩽, ≤, <= ; ⩾, ≥, >= ; <, >, = */
const QUERY_OPERATORS: Record<string, '<' | '⩽' | '>' | '⩾' | '='> = {
	'<': '<',
	'⩽': '⩽',
	'≤': '⩽',
	'<=': '⩽',
	'>': '>',
	'⩾': '⩾',
	'≥': '⩾',
	'>=': '⩾',
	'=': '='
};
const OPERATOR = '(<=|>=|⩽|≤|⩾|≥|<|>|=)';
/** `seuil: P(X > k) ⩽ 0,05` : l'événement en k, la comparaison, α */
const THRESHOLD_REGEX =
	/^P\(\s*([A-Za-z])\s*(<=|>=|⩽|≤|⩾|≥|<|>)\s*k\s*\)\s*(<=|>=|⩽|≤|⩾|≥)\s*(.+)$/;
const QUERY_ONE_SIDE = new RegExp(
	`^P\\(\\s*([A-Za-z])\\s*${OPERATOR}\\s*(${PLAIN_NUMBER})\\s*\\)$`
);
const QUERY_TWO_SIDES = new RegExp(
	`^P\\(\\s*(${PLAIN_NUMBER})\\s*${OPERATOR}\\s*([A-Za-z])\\s*${OPERATOR}\\s*(${PLAIN_NUMBER})\\s*\\)$`
);

/**
 * Une ligne de `probabilités:` traduite en bornes entières P(low ⩽ X ⩽ high),
 * `low` et `high` valant par défaut les bornes de la loi (`high` infini pour
 * une loi géométrique). Rend le message d'erreur, sans « Ligne n : ».
 */
function parseQuery(
	text: string,
	name: string,
	first: number,
	last: number
): { display: string; low: number; high: number } | string {
	const one = QUERY_ONE_SIDE.exec(text);
	const two = one ? null : QUERY_TWO_SIDES.exec(text);
	const variable = one?.[1] ?? two?.[3];
	if (variable === undefined) {
		return 'probabilités : écrire P(X = 3), P(X ⩽ 4) ou P(2 ⩽ X ⩽ 5)';
	}
	if (variable !== name) {
		return `probabilités : « ${text} » parle de ${variable}, la variable est ${name}`;
	}
	const bound = (raw: string) => toNumber(raw);
	let low = first;
	let high = last;
	let display: string;
	if (one) {
		const op = QUERY_OPERATORS[one[2]];
		const k = bound(one[3]);
		if (op === '=') [low, high] = Number.isInteger(k) ? [k, k] : [1, 0];
		else if (op === '⩽') high = Math.floor(k);
		else if (op === '<') high = Math.ceil(k) - 1;
		else if (op === '⩾') low = Math.ceil(k);
		else low = Math.floor(k) + 1;
		display = `P(${variable} ${op} ${one[3]})`;
	} else {
		const [left, right] = [QUERY_OPERATORS[two![2]], QUERY_OPERATORS[two![4]]];
		if (!['<', '⩽'].includes(left) || !['<', '⩽'].includes(right)) {
			return 'probabilités : écrire P(2 ⩽ X ⩽ 5), les bornes dans l’ordre';
		}
		const a = bound(two![1]);
		const b = bound(two![5]);
		low = left === '⩽' ? Math.ceil(a) : Math.floor(a) + 1;
		high = right === '⩽' ? Math.floor(b) : Math.ceil(b) - 1;
		if (a > b) {
			return `probabilités : « ${text} » : les bornes dans l’ordre (la plus petite d’abord)`;
		}
		display = `P(${two![1]} ${left} ${variable} ${right} ${two![5]})`;
	}
	return { display, low, high };
}

/** `P(|X| ⩽ 1,96)`, `P(|X − 3| > 1)`, `P(|X + 2| < 0,5)` : centre et rayon */
const QUERY_ABSOLUTE = new RegExp(
	`^P\\(\\s*\\|\\s*([A-Za-z])\\s*(?:([-−+])\\s*(\\d+(?:[.,]\\d+)?)\\s*)?\\|\\s*${OPERATOR}\\s*(${PLAIN_NUMBER})\\s*\\)$`
);

/** Une probabilité de valeur absolue, traduite en intervalle (2026-10-09) */
interface AbsoluteQuery {
	/** `P(m − a ⩽ X ⩽ m + a)` (ou `<`), l'écriture que lisent les lois */
	inner: string;
	/** `P(|X − 3| > 1)`, vrai signe moins */
	display: string;
	/** `>`, `⩾` : l'événement contraire de l'intervalle */
	complement: boolean;
}

/** Une fraction décimale écrite pour les lois : `-1.96` */
function decimalText(value: Fraction): string {
	let places = 0;
	while (places < 40 && (value.num * 10n ** BigInt(places)) % value.den !== 0n) places++;
	const negative = value.num < 0n;
	const magnitude = ((negative ? -value.num : value.num) * 10n ** BigInt(places)) / value.den;
	const digits = magnitude.toString().padStart(places + 1, '0');
	const text = places === 0 ? digits : `${digits.slice(0, -places)}.${digits.slice(-places)}`;
	return negative ? `-${text}` : text;
}

/**
 * `P(|X − m| ⩽ a)` = P(m − a ⩽ X ⩽ m + a), `P(|X − m| > a)` = 1 − … (Tle) :
 * un `|` qui OUVRE une valeur absolue n'est pas le « sachant que »
 * (`P(X > 5 | X > 2)`). null : pas de valeur absolue ; sinon le message.
 */
function absoluteQuery(text: string, name: string): AbsoluteQuery | string | null {
	if (!/^P\(\s*\|/.test(text)) return null;
	const form = `probabilités : « ${text} » : écrire P(|${name}| ⩽ a) ou P(|${name} − m| ⩽ a), avec ⩽, <, ⩾ ou >`;
	const match = QUERY_ABSOLUTE.exec(text);
	if (!match) return form;
	const [, variable, sign, shift, written, radiusText] = match;
	const op = QUERY_OPERATORS[written];
	if (op === '=') return form;
	const radius = Fraction.parse(radiusText);
	const offset = shift === undefined ? Fraction.ZERO : Fraction.parse(shift);
	if (radius === null || offset === null) return form;
	if (radius.isNegative()) return `probabilités : « ${text} » : a est un nombre positif`;
	// |X − m| : centre m ; |X + m| : centre −m
	const center = sign === '+' ? Fraction.ZERO.sub(offset) : offset;
	// L'intervalle, ou son contraire : |X − m| > a ⟺ non (|X − m| ⩽ a) ; ⩾ ⟺ non (<)
	const inside = op === '⩽' || op === '>' ? '⩽' : '<';
	const shown = shift === undefined ? '' : ` ${sign === '+' ? '+' : '−'} ${shift}`;
	return {
		inner: `P(${decimalText(center.sub(radius))} ${inside} ${variable} ${inside} ${decimalText(center.add(radius))})`,
		display: `P(|${variable}${shown}| ${op} ${radiusText})`,
		complement: op === '>' || op === '⩾'
	};
}

/**
 * `P(A | B)` d'une loi discrète (binomiale, uniforme ; 2026-10-09) : A et B des
 * événements que lit `parseQuery` (X > a, X ⩽ b, a ⩽ X ⩽ b). `support` : les
 * valeurs de probabilité non nulle ; un B qui l'évite est refusé (P(B) = 0).
 * null : pas de « | » ; sinon la requête ou le message.
 */
function conditionalQuery(
	text: string,
	name: string,
	first: number,
	last: number,
	support: { low: number; high: number }
): QueryInterval | string | null {
	if (!text.includes('|')) return null;
	const match = /^P\(([^|]*)\|([^|]*)\)$/.exec(text);
	const form = `probabilités : « ${text} » : écrire P(${name} > a | ${name} > b), P(${name} ⩽ a | ${name} ⩾ b)…`;
	if (!match) return form;
	const event = parseQuery(`P(${match[1].trim()})`, name, first, last);
	if (typeof event === 'string') return event;
	const given = parseQuery(`P(${match[2].trim()})`, name, first, last);
	if (typeof given === 'string') return given;
	if (Math.max(given.low, support.low) > Math.min(given.high, support.high)) {
		return `probabilités : ${given.display} = 0 : la probabilité sachant cet événement n’est pas définie`;
	}
	const inner = (display: string) => display.slice(2, -1);
	return {
		display: `P(${inner(event.display)} | ${inner(given.display)})`,
		low: event.low,
		high: event.high,
		condition: { low: given.low, high: given.high }
	};
}

/** La probabilité lue sur l'intervalle, écrite et éventuellement contraire comme tapée */
function withAbsolute<T extends { display: string; complement?: boolean }>(
	query: T,
	absolute: AbsoluteQuery | null
): T {
	return absolute === null
		? query
		: { ...query, display: absolute.display, complement: absolute.complement };
}

/**
 * `seuil: P(X > k) ⩽ 0,05` (Q140 ; loi géométrique : manche 14) : l'événement,
 * la comparaison, α strictement entre 0 et 1. Rend le message d'erreur, sans
 * « Ligne n : ».
 */
function parseThreshold(written: string | null, name: string): LawThreshold | null | string {
	if (written === null) return null;
	const match = THRESHOLD_REGEX.exec(written);
	if (!match) return `seuil : écrire P(${name} > k) ⩽ 0,05`;
	if (match[1] !== name) {
		return `seuil : « P(${match[1]} ${QUERY_OPERATORS[match[2]]} k) » parle de ${match[1]}, la variable est ${name}`;
	}
	const alpha = Fraction.parse(match[4]);
	// Strictement entre 0 et 1, comme `intervalle:` : 0 ou 1 donnent un k trivial (revue)
	if (
		alpha === null ||
		alpha.isNegative() ||
		alpha.equals(Fraction.ZERO) ||
		!Fraction.ONE.greaterThan(alpha)
	) {
		return 'seuil : α est un nombre strictement entre 0 et 1';
	}
	return {
		event: QUERY_OPERATORS[match[2]] as LawThreshold['event'],
		comparison: QUERY_OPERATORS[match[3]] as LawThreshold['comparison'],
		alpha: match[4].trim()
	};
}

/**
 * Une loi binomiale `X ~ B(n ; p)` (manche 11) : n entier de 1 à 1 000, p
 * entre 0 et 1 ; `masquer:`, `indicateurs:` comme une loi écrite à la main ;
 * `probabilités:` traduites en bornes entières P(low ⩽ X ⩽ high).
 */
function checkBinomial(
	binomial: { name: string; n: string; p: string; line: number },
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): { law: LawData } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const n = /^\d+$/.test(binomial.n) ? Number(binomial.n) : NaN;
	if (!(n >= 1 && n <= BINOMIAL_MAX_N)) {
		return at(binomial.line, 'B(n ; p) : n est un entier de 1 à 1 000');
	}
	const p = Fraction.parse(binomial.p);
	// Un nombre bien écrit mais trop long : le dire, plutôt que « pas un nombre » (revue)
	if (
		p === null &&
		/^[\d\s.,/%]+$/.test(binomial.p) &&
		/\d{16}/.test(binomial.p.replace(/[\s.,]/g, ''))
	) {
		return at(binomial.line, 'B(n ; p) : p a au plus 15 chiffres');
	}
	if (p === null || p.isNegative() || p.greaterThan(Fraction.ONE)) {
		return at(binomial.line, 'B(n ; p) : p est un nombre entre 0 et 1');
	}
	// `masquer:` sans tableau à masquer (au-delà de 30 valeurs, revue)
	if (options.lawMasked.length > 0 && n + 1 > STAT_CHART_LIMITS.binomialTableValues) {
		return at(
			optionLines.masquer ?? 0,
			`masquer : pas de tableau au-delà de ${STAT_CHART_LIMITS.binomialTableValues} valeurs`
		);
	}

	const masked: number[] = [];
	for (const raw of options.lawMasked) {
		const k = /^\d+$/.test(raw) ? Number(raw) : -1;
		if (k < 0 || k > n) {
			return at(optionLines.masquer ?? 0, `masquer : la valeur « ${raw} » n'est pas dans la loi`);
		}
		if (!masked.includes(k)) masked.push(k);
	}

	const queries: QueryInterval[] = [];
	const queriesLine = optionLines.probabilites ?? 0;
	const written = (options.binomialQueries ?? '')
		.split(';')
		.map((q) => q.trim())
		.filter((q) => q !== '');
	// P(B) > 0 : B rencontre les valeurs de probabilité non nulle (p = 0 : 0 seul ; p = 1 : n seul)
	const support = p.equals(Fraction.ZERO)
		? { low: 0, high: 0 }
		: p.equals(Fraction.ONE)
			? { low: n, high: n }
			: { low: 0, high: n };
	for (const raw of written) {
		const absolute = absoluteQuery(raw, binomial.name);
		if (typeof absolute === 'string') return at(queriesLine, absolute);
		const conditional =
			absolute === null ? conditionalQuery(raw, binomial.name, 0, n, support) : null;
		if (typeof conditional === 'string') return at(queriesLine, conditional);
		if (conditional !== null) {
			queries.push(conditional);
			continue;
		}
		const query = parseQuery(absolute?.inner ?? raw, binomial.name, 0, n);
		if (typeof query === 'string') return at(queriesLine, query);
		queries.push(withAbsolute(query, absolute));
	}

	const threshold = parseThreshold(options.binomialThreshold, binomial.name);
	if (typeof threshold === 'string') return at(optionLines.seuil ?? 0, threshold);

	return {
		law: {
			variable: binomial.name,
			values: Array.from({ length: n + 1 }, (_, k) => String(k)),
			probabilities: [],
			masked,
			indicators: options.lawIndicators,
			binomial: {
				n,
				p: binomial.p,
				places: options.places ?? 3,
				queries,
				chart: options.binomialChart,
				interval: options.binomialLevel === null ? null : options.binomialLevel.toString(),
				threshold
			},
			geometric: null,
			uniform: null,
			density: null
		}
	};
}

/** `P(X > 5 | X > 2)` : la loi géométrique est sans mémoire (manche 13) */
const QUERY_CONDITIONAL = new RegExp(
	`^P\\(\\s*([A-Za-z])\\s*${OPERATOR}\\s*(${PLAIN_NUMBER})\\s*\\|\\s*([A-Za-z])\\s*${OPERATOR}\\s*(${PLAIN_NUMBER})\\s*\\)$`
);

/** Bornes d'une loi nommée, lues après coup : `masquer:` entier dans [first ; last] */
function maskedIndices(
	options: Options,
	first: number,
	last: number,
	missing: string
): number[] | string {
	const masked: number[] = [];
	for (const raw of options.lawMasked) {
		const k = /^-?\d+$/.test(raw.replace('−', '-')) ? Number(raw.replace('−', '-')) : NaN;
		if (!(k >= first && k <= last)) return `masquer : la valeur « ${raw} » ${missing}`;
		if (!masked.includes(k - first)) masked.push(k - first);
	}
	return masked;
}

/**
 * Une loi géométrique `X ~ G(p)` (manche 13) : p dans ]0 ; 1] ; tableau de 1 à
 * `jusqu'à:` (10 par défaut) ; `probabilités:` exactes jusqu'à k = 1 000, et
 * P(X > a | X > b). Une probabilité hors des valeurs de X (P(X = 0)) vaut 0,
 * avec un avertissement.
 */
function checkGeometric(
	geometric: { name: string; p: string; line: number },
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): { law: LawData; warnings: StatChartIssue[] } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const p = Fraction.parse(geometric.p);
	if (p === null || p.isNegative() || p.equals(Fraction.ZERO) || p.greaterThan(Fraction.ONE)) {
		return at(geometric.line, 'G(p) : p est un nombre strictement positif, au plus 1');
	}
	const upTo = options.upTo ?? GEOMETRIC_TABLE_VALUES;
	const masked = maskedIndices(options, 1, upTo, "n'est pas dans le tableau");
	if (typeof masked === 'string') return at(optionLines.masquer ?? 0, masked);

	const name = geometric.name;
	const queriesLine = optionLines.probabilites ?? 0;
	const queries: NonNullable<LawData['geometric']>['queries'] = [];
	const warnings: StatChartIssue[] = [];
	const written = (options.binomialQueries ?? '')
		.split(';')
		.map((q) => q.trim())
		.filter((q) => q !== '');
	for (const raw of written) {
		// `P(|X − 3| ⩽ 1)` : une valeur absolue, pas « sachant que » (2026-10-09)
		const absolute = absoluteQuery(raw, name);
		if (typeof absolute === 'string') return at(queriesLine, absolute);
		const text = absolute?.inner ?? raw;
		if (text.includes('|')) {
			const form = `probabilités : « ${text} » : écrire P(${name} > a | ${name} > b) avec a > b`;
			const conditional = QUERY_CONDITIONAL.exec(text);
			if (
				!conditional ||
				conditional[1] !== name ||
				conditional[4] !== name ||
				QUERY_OPERATORS[conditional[2]] !== '>' ||
				QUERY_OPERATORS[conditional[5]] !== '>'
			) {
				return at(queriesLine, form);
			}
			const [a, b] = [toNumber(conditional[3]), toNumber(conditional[6])];
			if (!(a > b)) return at(queriesLine, form);
			if (a > GEOMETRIC_MAX_K) {
				return at(queriesLine, `probabilités : « ${text} » : bornes au plus 1 000`);
			}
			const given = Math.floor(b) + 1;
			// G(1) : P(X > b) = 0 dès b ⩾ 1, rien à conditionner
			if (p.equals(Fraction.ONE) && given > 1) {
				return at(
					queriesLine,
					`probabilités : « ${text} » : P(${name} > ${conditional[6]}) = 0, la probabilité conditionnelle n'existe pas`
				);
			}
			queries.push({
				display: `P(${name} > ${conditional[3]} | ${name} > ${conditional[6]})`,
				low: Math.floor(a) + 1,
				high: null,
				given
			});
			continue;
		}
		const query = parseQuery(text, name, 1, Infinity);
		if (typeof query === 'string') return at(queriesLine, query);
		if (
			(query.high !== Infinity && query.high > GEOMETRIC_MAX_K) ||
			query.low > GEOMETRIC_MAX_K + 1
		) {
			return at(queriesLine, `probabilités : « ${text} » : bornes au plus 1 000`);
		}
		// P(X = 0), P(X ⩽ 0) : la borne ÉCRITE est sous 1 (P(X = 2,5) vaut 0
		// aussi, mais pour une autre raison : pas d'avertissement, revue)
		const one = QUERY_ONE_SIDE.exec(text);
		const writtenHigh = toNumber(one ? one[3] : (QUERY_TWO_SIDES.exec(text)?.[5] ?? '1'));
		if (query.high < 1 && writtenHigh < 1) {
			warnings.push({
				message: `Ligne ${queriesLine} : probabilités : « ${text} » : ${name} prend ses valeurs à partir de 1`,
				line: queriesLine
			});
		}
		queries.push(
			withAbsolute(
				{
					display: query.display,
					low: query.low,
					high: query.high === Infinity ? null : query.high,
					given: null
				},
				absolute
			)
		);
	}

	// `seuil:` (manche 14) : comme la loi binomiale, k de 0 à 1 000
	const threshold = parseThreshold(options.binomialThreshold, name);
	if (typeof threshold === 'string') return at(optionLines.seuil ?? 0, threshold);

	return {
		law: {
			variable: name,
			values: Array.from({ length: upTo }, (_, i) => String(i + 1)),
			probabilities: [],
			masked,
			// L'espérance par défaut (spécification du 2026-10-04)
			indicators: optionLines.indicateurs !== undefined ? options.lawIndicators : ['esperance'],
			binomial: null,
			geometric: {
				p: geometric.p,
				places: options.places ?? 3,
				upTo,
				queries,
				chart: options.binomialChart,
				threshold
			},
			uniform: null,
			density: null
		},
		warnings
	};
}

/**
 * Une loi uniforme `X ~ U(a ; b)` (manche 13) : a et b entiers, a < b, au plus
 * 1 000 valeurs ; le reste comme la loi binomiale.
 */
function checkUniform(
	uniform: { name: string; a: string; b: string; line: number },
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>,
	// Une simulation tire au plus 30 valeurs, une par ligne du tableau (manche 14)
	limit: { count: number; message: string } = {
		count: UNIFORM_MAX_VALUES,
		message: 'U(a ; b) : au plus 1 000 valeurs'
	}
): { law: LawData; warnings: StatChartIssue[] } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const integer = (raw: string) => {
		const text = raw.replace('−', '-');
		return /^-?\d{1,9}$/.test(text) ? Number(text) : NaN;
	};
	const [a, b] = [integer(uniform.a), integer(uniform.b)];
	if (Number.isNaN(a) || Number.isNaN(b)) {
		return at(uniform.line, 'U(a ; b) : a et b sont des entiers');
	}
	if (a > b) return at(uniform.line, 'U(a ; b) : les bornes dans l’ordre (a < b)');
	if (a === b) return at(uniform.line, 'U(a ; b) : a et b distincts (a < b)');
	const count = b - a + 1;
	if (count > limit.count) return at(uniform.line, limit.message);
	if (options.lawMasked.length > 0 && count > STAT_CHART_LIMITS.binomialTableValues) {
		return at(
			optionLines.masquer ?? 0,
			`masquer : pas de tableau au-delà de ${STAT_CHART_LIMITS.binomialTableValues} valeurs`
		);
	}
	const masked = maskedIndices(options, a, b, "n'est pas dans la loi");
	if (typeof masked === 'string') return at(optionLines.masquer ?? 0, masked);

	const queriesLine = optionLines.probabilites ?? 0;
	const queries: QueryInterval[] = [];
	const written = (options.binomialQueries ?? '')
		.split(';')
		.map((q) => q.trim())
		.filter((q) => q !== '');
	const warnings: StatChartIssue[] = [];
	for (const raw of written) {
		const absolute = absoluteQuery(raw, uniform.name);
		if (typeof absolute === 'string') return at(queriesLine, absolute);
		const text = absolute?.inner ?? raw;
		const conditional =
			absolute === null ? conditionalQuery(raw, uniform.name, a, b, { low: a, high: b }) : null;
		if (typeof conditional === 'string') return at(queriesLine, conditional);
		if (conditional !== null) {
			queries.push(conditional);
			continue;
		}
		const query = parseQuery(text, uniform.name, a, b);
		if (typeof query === 'string') return at(queriesLine, query);
		// Q158 : un événement non vide, tout entier hors de [a ; b], par ses bornes
		// ÉCRITES (P(X = 7), P(X ⩽ 0), P(X > 6)) ; P(X = 2,5) est vide pour une autre raison
		const open = parseQuery(text, uniform.name, -Infinity, Infinity);
		if (typeof open !== 'string' && open.low <= open.high && (open.high < a || open.low > b)) {
			warnings.push({
				message: `Ligne ${queriesLine} : probabilités : « ${text} » : ${uniform.name} prend ses valeurs de ${a} à ${b}`,
				line: queriesLine
			});
		}
		queries.push(withAbsolute(query, absolute));
	}

	return {
		law: {
			variable: uniform.name,
			values: Array.from({ length: count }, (_, i) => String(a + i)),
			probabilities: [],
			masked,
			indicators: optionLines.indicateurs !== undefined ? options.lawIndicators : ['esperance'],
			binomial: null,
			geometric: null,
			uniform: { a, b, places: options.places ?? 3, queries, chart: options.binomialChart },
			density: null
		},
		warnings
	};
}

/**
 * Une probabilité d'une loi à densité (PR b) : bornes TELLES QU'ÉCRITES ; les
 * contrôles de forme et de variable sont ceux de `parseQuery`.
 */
function parseDensityQuery(raw: string, name: string): DensityQuery | string {
	// `P(|X − m| ⩽ a)` : une valeur absolue, pas « sachant que » (2026-10-09)
	const absolute = absoluteQuery(raw, name);
	if (typeof absolute === 'string') return absolute;
	if (absolute !== null) {
		const inner = parseDensityQuery(absolute.inner, name);
		return typeof inner === 'string' ? inner : withAbsolute(inner, absolute);
	}
	const text = raw;
	if (text.includes('|')) {
		const form = `probabilités : « ${text} » : écrire P(${name} > a | ${name} > b) avec a > b`;
		const conditional = QUERY_CONDITIONAL.exec(text);
		const strict = (op: string) => ['>', '⩾'].includes(QUERY_OPERATORS[op]);
		if (
			!conditional ||
			conditional[1] !== name ||
			conditional[4] !== name ||
			!strict(conditional[2]) ||
			!strict(conditional[5]) ||
			!(toNumber(conditional[3]) > toNumber(conditional[6]))
		) {
			return form;
		}
		return {
			display: `P(${name} ${QUERY_OPERATORS[conditional[2]]} ${conditional[3]} | ${name} ${QUERY_OPERATORS[conditional[5]]} ${conditional[6]})`,
			low: conditional[3],
			high: null,
			given: conditional[6],
			point: false
		};
	}
	const checked = parseQuery(text, name, -Infinity, Infinity);
	if (typeof checked === 'string') return checked;
	const one = QUERY_ONE_SIDE.exec(text);
	if (one) {
		const op = QUERY_OPERATORS[one[2]];
		const x = one[3];
		return {
			display: checked.display,
			low: op === '=' || op === '>' || op === '⩾' ? x : null,
			high: op === '=' || op === '<' || op === '⩽' ? x : null,
			given: null,
			point: op === '='
		};
	}
	const two = QUERY_TWO_SIDES.exec(text)!;
	return { display: checked.display, low: two[1], high: two[5], given: null, point: false };
}

/**
 * Une loi à densité `X ~ U([a ; b])` ou `X ~ E(λ)` (manche 13, PR b) : pas de
 * tableau ; `probabilités:`, `aire:`, `répartition:` ; E par défaut. Un
 * événement hors du support, d'après ses bornes ÉCRITES, vaut 0 et avertit (Q158).
 */
function checkDensity(
	density:
		| { family: 'uniform-density'; name: string; a: string; b: string; line: number }
		| { family: 'exponential'; name: string; lambda: string; line: number }
		| { family: 'normal'; name: string; mu: string; variance: string; line: number },
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): { law: LawData; warnings: StatChartIssue[] } | { error: StatChartIssue } {
	const at = (line: number, message: string) => ({
		error: { message: `Ligne ${line} : ${message}`, line }
	});
	const name = density.name;
	let law: NonNullable<LawData['density']>['law'];
	// Support [low ; high] (high infini pour l'exponentielle) et son écriture
	let support: { low: number; high: number; text: string };
	if (density.family === 'uniform-density') {
		const a = Fraction.parse(density.a);
		const b = Fraction.parse(density.b);
		if (a === null || b === null) return at(density.line, 'U([a ; b]) : a et b sont des nombres');
		if (!b.greaterThan(a)) {
			return at(density.line, 'U([a ; b]) : les bornes dans l’ordre (a < b)');
		}
		law = { family: 'uniform', a: density.a, b: density.b };
		support = {
			low: a.toNumber(),
			high: b.toNumber(),
			text: `dans [${density.a} ; ${density.b}]`
		};
	} else if (density.family === 'normal') {
		const mu = Fraction.parse(density.mu);
		const variance = Fraction.parse(density.variance);
		if (mu === null) return at(density.line, 'N(μ ; σ²) : μ est un nombre');
		if (variance === null || variance.isNegative() || variance.equals(Fraction.ZERO)) {
			return at(density.line, 'N(μ ; σ²) : σ² est un nombre strictement positif');
		}
		// F n'a pas de formule : Φ se lit à la calculatrice
		if (options.cdf) {
			return at(
				optionLines.repartition ?? 0,
				'répartition : la loi normale n’a pas de formule pour F(x)'
			);
		}
		law = { family: 'normal', mu: density.mu, variance: density.variance };
		support = { low: -Infinity, high: Infinity, text: 'dans ℝ' };
	} else {
		const lambda = Fraction.parse(density.lambda);
		if (lambda === null || lambda.isNegative() || lambda.equals(Fraction.ZERO)) {
			return at(density.line, 'E(λ) : λ est un nombre strictement positif');
		}
		law = { family: 'exponential', lambda: density.lambda };
		support = { low: 0, high: Infinity, text: 'à partir de 0' };
	}
	if (options.lawMasked.length > 0) {
		return at(optionLines.masquer ?? 0, 'masquer : pas de tableau pour une loi à densité');
	}
	if (options.areaQuery !== null && !options.binomialChart) {
		return at(optionLines.aire ?? 0, 'aire : seulement avec diagramme: oui');
	}

	const queriesLine = optionLines.probabilites ?? 0;
	const queries: DensityQuery[] = [];
	const warnings: StatChartIssue[] = [];
	const written = (options.binomialQueries ?? '')
		.split(';')
		.map((q) => q.trim())
		.filter((q) => q !== '');
	for (const text of written) {
		const query = parseDensityQuery(text, name);
		if (typeof query === 'string') return at(queriesLine, query);
		// Loi uniforme : P(X > b) = 0 dès b ⩾ sup, rien à conditionner
		if (query.given !== null && toNumber(query.given) >= support.high) {
			return at(
				queriesLine,
				`probabilités : « ${text} » : P(${name} > ${query.given}) = 0, la probabilité conditionnelle n'existe pas`
			);
		}
		const low = query.low === null ? -Infinity : toNumber(query.low);
		const high = query.high === null ? Infinity : toNumber(query.high);
		if (high < support.low || low > support.high) {
			warnings.push({
				message: `Ligne ${queriesLine} : probabilités : « ${text} » : ${name} prend ses valeurs ${support.text}`,
				line: queriesLine
			});
		}
		queries.push(query);
	}
	let area = queries[0] ?? null;
	if (options.areaQuery !== null) {
		const chosen = parseDensityQuery(options.areaQuery, name);
		if (typeof chosen === 'string') {
			return at(
				optionLines.aire ?? 0,
				`aire : écrire P(${name} ⩽ 2), P(1 ⩽ ${name} ⩽ 3) ou P(${name} > a | ${name} > b)`
			);
		}
		area = chosen;
	}

	return {
		law: {
			variable: name,
			values: [],
			probabilities: [],
			masked: [],
			indicators: optionLines.indicateurs !== undefined ? options.lawIndicators : ['esperance'],
			binomial: null,
			geometric: null,
			uniform: null,
			density: {
				law,
				places: options.places ?? 3,
				queries,
				chart: options.binomialChart,
				area,
				cdf: options.cdf
			}
		},
		warnings
	};
}

/**
 * Une loi nommée dans un bloc ```simulation (manche 14) : les contrôles du bloc
 * ```loi (mêmes messages), puis ce que la simulation garde ; U(a ; b) tire au
 * plus 30 valeurs, une par ligne du tableau.
 */
function checkSimulatedNamedLaw(
	named: NonNullable<NamedLawLine>,
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): { simulation: SimulationData } | { error: StatChartIssue } {
	const common = {
		variable: named.name,
		probabilities: [],
		mode: options.simulationMode,
		draws: options.draws,
		seed: options.seed,
		samples: options.samples,
		sampleSize: options.sampleSize,
		binomial: null
	};
	if (named.family === 'geometric') {
		const checked = checkGeometric(named, options, optionLines);
		if ('error' in checked) return checked;
		const upTo = checked.law.geometric!.upTo;
		return {
			simulation: {
				...common,
				values: checked.law.values,
				named: { family: 'geometric', p: named.p, upTo }
			}
		};
	}
	if (named.family === 'uniform') {
		// Le tableau du mode `tirages` : une ligne par valeur, 30 au plus ; les
		// modes moyenne et échantillons gardent le plafond du bloc ```loi (revue)
		const max = STAT_CHART_LIMITS.binomialTableValues;
		const checked =
			options.simulationMode === 'tirages'
				? checkUniform(named, options, optionLines, {
						count: max,
						message: `U(a ; b) : au plus ${max} valeurs à tirer`
					})
				: checkUniform(named, options, optionLines);
		if ('error' in checked) return checked;
		const { a, b } = checked.law.uniform!;
		return {
			simulation: { ...common, values: checked.law.values, named: { family: 'uniform', a, b } }
		};
	}
	// La loi normale ne se simule pas (hors périmètre du 2026-10-09)
	if (named.family === 'normal') {
		return {
			error: {
				message: `Ligne ${named.line} : la loi normale ne se simule pas : utiliser un bloc \`\`\`loi`,
				line: named.line
			}
		};
	}
	const checked = checkDensity(named, options, optionLines);
	if ('error' in checked) return checked;
	const classes = options.simulationClasses ?? STAT_CHART_LIMITS.simulationClasses.default;
	return {
		simulation: {
			...common,
			values: [],
			named:
				named.family === 'uniform-density'
					? { family: 'uniform-density', a: named.a, b: named.b, classes }
					: { family: 'exponential', lambda: named.lambda, classes }
		}
	};
}

function checkLaw(
	variable: ({ name: string } & LawLine) | null,
	probabilities: LawLine | null,
	options: Options,
	optionLines: Partial<Record<OptionKey, number>>
): { law: LawData } | { errors: StatChartIssue[] } {
	if (variable === null) {
		return { errors: [{ message: 'Écrire les valeurs de la variable : « X = 1 ; 2 ; 3 »' }] };
	}
	if (probabilities === null) {
		return { errors: [{ message: 'Écrire les probabilités : « P = 1/2 ; 1/4 ; 1/4 »' }] };
	}
	const at = (line: number, message: string) => ({
		errors: [{ message: `Ligne ${line} : ${message}`, line }]
	});

	// Les valeurs ont été lues ligne par ligne : toutes sont des nombres
	const values = variable.texts.map((text) => Fraction.parse(text ?? '') ?? Fraction.ZERO);
	const probs = probabilities.texts.map((text) => (text === null ? null : Fraction.parse(text)));
	if (probs.length !== values.length) {
		return at(
			probabilities.line,
			`${values.length} valeur(s) pour ${probs.length} probabilité(s) : il en faut autant`
		);
	}

	const known = probs.filter((p): p is Fraction => p !== null);
	if (known.length < probs.length) {
		if (options.lawIndicators.length > 0) {
			return at(
				optionLines.indicateurs ?? 0,
				'indicateurs impossibles avec une probabilité « ? » : sa valeur est inconnue'
			);
		}
		// Revue du lot 6 : un « ? » ne dispense pas des autres contrôles, sinon une
		// fiche « trouver p » insoluble part sans alerte
		const twice = values.find((v, i) => values.findIndex((other) => other.equals(v)) !== i);
		if (twice) return at(variable.line, `la valeur « ${twice} » apparaît deux fois`);
		const outside = known.find((p) => p.isNegative() || p.greaterThan(Fraction.ONE));
		if (outside) return at(probabilities.line, `la probabilité ${outside} n'est pas entre 0 et 1`);
		const sum = known.reduce((total, p) => total.add(p), Fraction.ZERO);
		if (sum.greaterThan(Fraction.ONE)) {
			return at(probabilities.line, `les probabilités connues font ${sum}, plus que 1`);
		}
		if (sum.equals(Fraction.ONE)) {
			return at(
				probabilities.line,
				'les probabilités connues font déjà 1 : une probabilité « ? » vaudrait 0'
			);
		}
	} else {
		const outcome = randomVariable(values, known);
		if (outcome !== null && !outcome.ok) return at(probabilities.line, outcome.message);
	}

	const masked: number[] = [];
	for (const raw of options.lawMasked) {
		const wanted = Fraction.parse(raw);
		const index = wanted === null ? -1 : values.findIndex((v) => v.equals(wanted));
		if (index === -1) {
			return at(optionLines.masquer ?? 0, `masquer : la valeur « ${raw} » n'est pas dans la loi`);
		}
		if (!masked.includes(index)) masked.push(index);
	}

	return {
		law: {
			variable: variable.name,
			values: variable.texts.map((text) => text ?? ''),
			probabilities: probabilities.texts,
			masked,
			indicators: options.lawIndicators,
			binomial: null,
			geometric: null,
			uniform: null,
			density: null
		}
	};
}

function yesNo(value: string, key: string): boolean {
	const answer = normalizeKey(value.trim());
	if (answer !== 'oui' && answer !== 'non') {
		throw new LineError(`« ${key}: ${value.trim()} » : écrire oui ou non`);
	}
	return answer === 'oui';
}

/** `Fille ; Garçon` : noms distincts, ni vides ni « Total », au plus 8 (Q34) */
function parseNames(value: string, what: string): string[] {
	const names = value.split(';').map((name) => name.trim());
	if (names.some((name) => name === '')) throw new LineError(`${what} : un nom est vide`);
	if (names.length > STAT_CHART_LIMITS.tableSize) {
		throw new LineError(`${what} : au plus ${STAT_CHART_LIMITS.tableSize} noms`);
	}
	for (const [i, name] of names.entries()) {
		if (normalizeKey(name) === normalizeKey(TOTAL)) {
			throw new LineError(
				`${what} : « ${TOTAL} » est réservé à la ligne et à la colonne des totaux`
			);
		}
		if (name.length > STAT_CHART_LIMITS.labelLength) {
			throw new LineError(
				`${what} : « ${name} » trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
			);
		}
		if (name.includes('/')) {
			throw new LineError(
				`${what} : « ${name} » ne peut pas contenir « / » (séparateur de « masquer: »)`
			);
		}
		const same = names.findIndex((other) => normalizeKey(other) === normalizeKey(name));
		if (same !== i) throw new LineError(`${what} : « ${name} » donné deux fois`);
	}
	return names;
}

/**
 * Contrôles d'un tableau croisé, une fois tout lu : noms, nombre de cases,
 * cases masquées, fréquences calculables. Rend les données, ou les erreurs.
 */
function checkTable(
	options: Options,
	tableRows: readonly TableRow[],
	optionLines: Partial<Record<OptionKey, number>>
): { table: CrossTableData } | { errors: StatChartIssue[] } {
	const { rows, columns } = options;
	if (rows === null)
		return { errors: [{ message: 'Écrire les noms des lignes : « lignes: Fille ; Garçon »' }] };
	if (columns === null) {
		return {
			errors: [{ message: 'Écrire les noms des colonnes : « colonnes: Externe ; Interne »' }]
		};
	}

	const errors: StatChartIssue[] = [];
	const situated = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });
	for (const row of tableRows) {
		if (!rows.includes(row.name)) {
			situated(row.line, `ligne « ${row.name} » absente de « lignes: »`);
		} else if (row.values.length !== columns.length) {
			situated(row.line, `${columns.length} valeurs attendues, ${row.values.length} reçues`);
		}
	}
	for (const name of rows) {
		if (!tableRows.some((row) => row.name === name)) {
			situated(optionLines.lignes ?? 0, `ligne « ${name} » sans données : écrire « ${name} = … »`);
		}
	}

	const rowNames = options.showTotals ? [...rows, TOTAL] : rows;
	const columnNames = options.showTotals ? [...columns, TOTAL] : columns;
	for (const { row, column, line } of options.masked) {
		if (!options.showTotals && (row === TOTAL || column === TOTAL)) {
			situated(line, `masquer « ${row}/${column} » : pas de totaux (« totaux: non »)`);
		} else if (!rowNames.includes(row) || !columnNames.includes(column)) {
			situated(line, `masquer : case « ${row}/${column} » inconnue`);
		}
	}
	if (errors.length > 0) return { errors };

	const cells = rows.map((name) => tableRows.find((row) => row.name === name)?.values ?? []);
	if (options.display !== 'effectifs') {
		const line = optionLines.afficher ?? 0;
		if (cells.some((row) => row.some((value) => value === null))) {
			return {
				errors: [
					{
						message: `Ligne ${line} : fréquences impossibles avec une case « ? » : sa valeur est inconnue`,
						line
					}
				]
			};
		}
		// Total non nul : la règle du module statistique
		const outcome = crossTable(
			cells.map((row) => row.map((value) => value ?? 0)),
			options.display
		);
		if (outcome !== null && !outcome.ok) {
			return { errors: [{ message: `Ligne ${line} : ${outcome.message}`, line }] };
		}
	}
	return {
		table: {
			rows,
			columns,
			cells,
			showTotals: options.showTotals,
			display: options.display,
			masked: options.masked.map(({ row, column }) => ({ row, column })),
			corner: options.corner
		}
	};
}

/** Contrôles sur l'ensemble des données, une fois toutes les lignes lues. */
function checkWhole(
	kind: StatChartKind,
	data: readonly StatChartDatum[],
	unit: StatChartUnit,
	areaLegend: { value: number } | null,
	classes = CLASS_CHART_KINDS.includes(kind)
): StatChartIssue | null {
	if (data.length === 0) {
		return { message: 'Aucune donnée : écrire au moins une ligne « catégorie = effectif »' };
	}
	if (kind === 'barres' || (kind === 'effectifs' && !classes)) return null;

	const total = data.reduce((sum, datum) => sum + datum.value, 0);
	// Circulaire et séries en classes : des pourcentages forment un tout (Q22 ;
	// revue du lot 3 : 10 % + 20 % montaient quand même à 100 % sur le polygone)
	if (unit === 'pourcentages' && Math.abs(total - 100) > STAT_CHART_LIMITS.percentTolerance) {
		const rounded = Math.round(total * 10) / 10;
		return { message: `La somme des pourcentages fait ${formatForMessage(rounded)} %, pas 100 %` };
	}

	if (classes) {
		const intervals = data.map((d) => ({
			lower: d.interval?.lower ?? 0,
			upper: d.interval?.upper ?? 0,
			count: d.value
		}));
		// Classes contiguës, total non nul : la règle du module statistique
		const outcome = summarizeClasses(intervals);
		if (outcome !== null && !outcome.ok) return { message: outcome.message };
		// Quadrillage borné : la règle partagée avec la scène
		if (kind === 'histogramme' && usesCarreaux(intervals, areaLegend !== null)) {
			const grid = carreauGrid(intervals, areaLegend?.value ?? null);
			if (!grid.ok) return { message: `Histogramme : ${grid.message}` };
		}
		return null;
	}

	if (total === 0) return { message: 'Effectif total nul : aucun secteur à dessiner' };
	return null;
}

/** Les indicateurs demandés ont-ils un sens pour ces données ? (Q28) */
function checkIndicators(
	kind: StatChartKind,
	indicators: readonly StatChartIndicator[],
	data: readonly StatChartDatum[],
	unit: StatChartUnit,
	isClasses = CLASS_CHART_KINDS.includes(kind)
): string | null {
	for (const indicator of indicators) {
		const name = INDICATOR_NAME[indicator];
		if (isClasses && !CLASS_INDICATORS.includes(indicator)) {
			return `indicateur « ${name} » : non disponible pour une série en classes`;
		}
		if (!isClasses && indicator === 'classe-mediane') {
			return `indicateur « ${name} » : réservé aux séries en classes (histogramme, polygone)`;
		}
		if (indicator === 'effectif' && unit === 'pourcentages') {
			return `indicateur « ${name} » : impossible avec des pourcentages`;
		}
	}
	if (!isClasses) {
		// Un nombre, ou une fraction d'entiers (catégorie `1/3` venue de l'atelier, Q45)
		const notNumber = data.find(
			(d) => !PLAIN_NUMBER_REGEX.test(d.label) && !/^-?\d+\/\d+$/.test(d.label)
		);
		if (notNumber) {
			return `indicateurs : toutes les catégories doivent être des nombres (« ${notNumber.label} » n'en est pas un)`;
		}
	}
	return null;
}

// ============================================================================
// NUAGE DE POINTS (manche 15)
// ============================================================================

/** `indicateurs: point moyen ; équation ; r` (Q168) ; r² refusé */
function parseScatterIndicators(raw: string): ScatterIndicator[] {
	const names = raw
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (names.length === 0) throw new LineError('indicateurs : aucun indicateur donné');
	return names.map((name) => {
		const key = normalizeKey(name).replace(/\s+/g, ' ');
		// r², r^2, r2 : le programme dit r (Q168)
		if (/^r\s*(²|\^\s*2|2)$/.test(key)) {
			throw new LineError('r seulement : le coefficient de corrélation');
		}
		const known = SCATTER_INDICATORS.find(
			(indicator) => normalizeKey(SCATTER_INDICATOR_NAME[indicator]) === key
		);
		if (known === undefined) {
			const choices = SCATTER_INDICATORS.map((i) => SCATTER_INDICATOR_NAME[i]).join(', ');
			throw new LineError(`indicateur « ${name} » inconnu (choisir : ${choices})`);
		}
		return known;
	});
}

/** `prévoir: x = 4,5 ; x = 8 ; y = 25` (Q169), valeurs telles qu'écrites */
function parsePredictions(raw: string): ScatterData['predictions'] {
	const parts = raw
		.split(';')
		.map((part) => part.trim())
		.filter((part) => part !== '');
	if (parts.length === 0) throw new LineError('prévoir : écrire x = … ou y = …');
	if (parts.length > STAT_CHART_LIMITS.scatterPredictions) {
		throw new LineError(`prévoir : au plus ${STAT_CHART_LIMITS.scatterPredictions} prévisions`);
	}
	return parts.map((part) => {
		const match = PREDICTION_REGEX.exec(part);
		if (!match) throw new LineError(`prévoir : écrire x = … ou y = … (pas « ${part} »)`);
		const value = match[2].trim();
		if (readExactValue(value) === null) {
			throw new LineError(`prévoir : ${invalidValueReason(value)}`);
		}
		return { axis: match[1].toLowerCase() as 'x' | 'y', value };
	});
}

/**
 * Bloc ```nuage : `x: …` et `y: …` (lecteur de nombres commun, Q167), titres
 * d'axes, options. Les calculs (fractions) sont faits par la scène.
 */
function parseScatterContent(source: string): StatChartNode {
	const errors: StatChartIssue[] = [];
	const columns: Partial<Record<'x' | 'y', { texts: string[]; line: number }>> = {};
	const names: ScatterData['names'] = { x: null, y: null };
	const optionLines: Partial<Record<ScatterOptionKey, number>> = {};
	let title: string | null = null;
	let description: string | null = null;
	let size: CourbeSize = 'moyenne';
	let color: CourbeColor = 'bleu';
	let fit = false;
	let indicators: ScatterIndicator[] = [];
	let predictions: ScatterData['predictions'] = [];
	let places = 3;
	let origin = false;
	// `as` : affectées dans le rappel de `forEach`, que TypeScript ne suit pas
	let change = null as VariableChange | null;
	let cloud = null as 'z' | 't' | null;

	source.split('\n').forEach((rawLine, index) => {
		const line = index + 1;
		const content = rawLine.trim();
		if (content === '') return;
		try {
			const data = SCATTER_DATA_REGEX.exec(content);
			if (data) {
				const axis = data[2].toLowerCase() as 'x' | 'y';
				if (data[1] !== undefined) {
					if (names[axis] !== null) throw new LineError(`nom ${axis} déjà donné`);
					names[axis] = parseText(data[3], `nom ${axis}`);
					return;
				}
				if (columns[axis] !== undefined) throw new LineError(`ligne « ${axis}: » déjà donnée`);
				const texts = data[3].split(';').map((text) => text.trim());
				if (texts.length > STAT_CHART_LIMITS.scatterPoints.max) {
					throw new LineError(`au plus ${STAT_CHART_LIMITS.scatterPoints.max} points`);
				}
				for (const text of texts) {
					if (text === '') throw new LineError('valeur vide (un « ; » de trop ?)');
					if (readExactValue(text) === null) throw new LineError(invalidValueReason(text));
				}
				columns[axis] = { texts, line };
				return;
			}
			const kv = KEY_LINE_REGEX.exec(content);
			if (!kv) throw new LineError('écrire « x: … », « y: … » ou « option: valeur »');
			const key = optionKeyOf(kv[1]);
			if (!(SCATTER_OPTIONS as readonly string[]).includes(key)) {
				const choices = ['nom x', 'nom y', ...SCATTER_OPTIONS]
					.map((k) => (k === 'prevoir' ? 'prévoir' : k))
					.join(', ');
				throw new LineError(`option « ${kv[1]} » inconnue (options : ${choices})`);
			}
			const option = key as ScatterOptionKey;
			if (optionLines[option] !== undefined) {
				throw new LineError(`option « ${kv[1]} » déjà donnée`);
			}
			optionLines[option] = line;
			const value = kv[2];
			switch (option) {
				case 'titre':
					title = parseText(value, 'titre');
					return;
				case 'description':
					description = parseText(value, 'description');
					return;
				case 'taille':
					size = oneOf(value, COURBE_SIZES, 'taille');
					return;
				case 'couleur':
					color = oneOf(resolveNamedColor(value) ?? value, COURBE_COLORS, 'couleur');
					return;
				case 'ajustement': {
					fit = true;
					if (normalizeKey(value.trim()) === 'affine') return;
					// Changement de variable (PR b, Q170) : une des huit formes
					const found = readVariableChange(value);
					if (found === null) {
						throw new LineError(
							`ajustement : écrire « affine » ou une des formes ${VARIABLE_CHANGE_LIST}`
						);
					}
					change = found;
					return;
				}
				case 'nuage': {
					const wanted = value.trim().toLowerCase();
					if (wanted !== 'z' && wanted !== 't') {
						throw new LineError('nuage : écrire « nuage: z » ou « nuage: t »');
					}
					cloud = wanted;
					return;
				}
				case 'indicateurs':
					indicators = parseScatterIndicators(value);
					return;
				case 'prevoir':
					predictions = parsePredictions(value);
					return;
				case 'arrondi':
					places = parseWhole(value, 0, 6, 'arrondi : un nombre de décimales de 0 à 6');
					return;
				case 'origine':
					origin = yesNo(value, 'origine');
					return;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push({ message: `Ligne ${line} : ${message}`, line, content });
		}
	});

	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });
	const { x: xs, y: ys } = columns;
	if (errors.length === 0) {
		if (xs === undefined || ys === undefined) {
			fail((xs ?? ys)?.line ?? 1, 'écrire x: … et y: … (une ligne chacune)');
		} else if (xs.texts.length !== ys.texts.length) {
			fail(
				Math.max(xs.line, ys.line),
				`x et y n’ont pas le même nombre de valeurs (${xs.texts.length} et ${ys.texts.length})`
			);
		} else if (xs.texts.length < STAT_CHART_LIMITS.scatterPoints.min) {
			fail(xs.line, `au moins ${STAT_CHART_LIMITS.scatterPoints.min} points`);
		} else if (allEqual(xs.texts)) {
			fail(xs.line, 'toutes les abscisses sont égales : pas de droite y = ax + b');
		} else if (predictions.length > 0 && !fit) {
			fail(optionLines.prevoir ?? 0, 'prévoir : seulement avec ajustement: affine');
		} else if (indicators.includes('equation') && !fit) {
			fail(optionLines.indicateurs ?? 0, 'équation : demander « ajustement: affine »');
		} else if (indicators.includes('r') && allEqual(ys.texts)) {
			fail(optionLines.indicateurs ?? 0, 'r : non défini, toutes les ordonnées sont égales');
		} else if (cloud !== null && change === null) {
			fail(
				optionLines.nuage ?? 0,
				'nuage : seulement avec un changement de variable (ajustement: z = … ou t = …)'
			);
		} else if (cloud !== null && change !== null && cloud !== change.variable) {
			fail(
				optionLines.nuage ?? 0,
				`nuage : écrire « nuage: ${change.variable} » (la variable de l’ajustement)`
			);
		} else if (change !== null) {
			const column = change.on === 'y' ? ys : xs;
			const problem = changeDomainProblem(change, column.texts);
			if (problem !== null) fail(column.line, problem);
		}
	}

	const spec: StatChartSpec | null =
		errors.length === 0 && xs !== undefined && ys !== undefined
			? {
					kind: 'nuage',
					data: [],
					unit: 'effectifs',
					title,
					axes: { x: null, y: null },
					description,
					size,
					showValues: false,
					color,
					labels: 'pourcentages',
					areaLegend: null,
					direction: 'croissantes',
					reading: 'aucune',
					indicators: [],
					table: null,
					law: null,
					simulation: null,
					rawValues: null,
					frequencyTable: null,
					series: null,
					twoSeries: null,
					scatter: {
						xs: xs.texts,
						ys: ys.texts,
						names,
						fit,
						indicators,
						predictions,
						places,
						origin,
						change,
						transformedCloud: cloud !== null
					}
				}
			: null;
	return { type: 'stat-chart', kind: 'nuage', source, spec, errors, warnings: [] };
}

/** Valeurs écrites toutes égales (exactement : `2` et `2,0` aussi) */
function allEqual(texts: readonly string[]): boolean {
	const first = readExactValue(texts[0]);
	return texts.every((text) => {
		const value = readExactValue(text);
		return first !== null && value !== null && value.equals(first);
	});
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Analyser le corps d'un bloc (sans les clôtures). Rend toujours un nœud. */
export function parseStatChartContent(kind: StatChartKind, source: string): StatChartNode {
	// Deux séries x / y, pas de catégories : une grammaire à part (manche 15)
	if (kind === 'nuage') return parseScatterContent(source);
	const errors: StatChartIssue[] = [];
	const data: StatChartDatum[] = [];
	// `as` : affectée dans le rappel de `forEach`, que TypeScript ne suit pas
	// (sans lui, `unit` resterait typée `null` après la boucle)
	let unit = null as { value: StatChartUnit; line: number } | null;
	let indicatorsLine = 0;
	const optionLines: Partial<Record<OptionKey, number>> = {};
	const seenOptions = new Set<OptionKey>();
	const options: Options = {
		title: null,
		axes: { x: null, y: null },
		description: null,
		size: 'moyenne',
		showValues: false,
		color: 'bleu',
		labels: 'pourcentages',
		areaLegend: null,
		direction: 'croissantes',
		reading: 'aucune',
		indicators: [],
		rows: null,
		columns: null,
		showTotals: true,
		display: 'effectifs',
		masked: [],
		corner: null,
		lawIndicators: [],
		lawMasked: [],
		simulationMode: 'tirages',
		draws: 100,
		seed: 1,
		samples: 100,
		sampleSize: 100,
		classBounds: null,
		seriesMode: null,
		barDisplay: null,
		tableRows: null,
		decimalFrequencies: null,
		tableMasked: null,
		places: null,
		binomialQueries: null,
		binomialChart: false,
		binomialLevel: null,
		binomialThreshold: null,
		upTo: null,
		cdf: false,
		areaQuery: null,
		simulationClasses: null
	};
	let lawVariable = null as ({ name: string } & LawLine) | null;
	// `X ~ B(n ; p)` (manche 11) : la loi binomiale remplace `X =` / `P =`
	let lawBinomial = null as { name: string; n: string; p: string; line: number } | null;
	// `X ~ G(p)`, `X ~ U(a ; b)` (manche 13), dans ```loi et ```simulation (manche 14)
	let lawNamed = null as NamedLawLine;
	let lawProbabilities = null as LawLine | null;
	// Une simulation écrit sa loi comme le bloc ```loi
	const isSimulation = kind === 'simulation';
	const isLaw = kind === 'loi' || isSimulation;
	const tableRows: TableRow[] = [];
	// Série brute (`données:`), dépouillée une fois tout lu
	const raw: { text: string; line: number }[] = [];
	// Séries nommées (`données Garçons: …`, Q115), dans l'ordre d'apparition
	const named: NamedSeries[] = [];
	const isTable = kind === 'tableau-croise';
	const isClasses = CLASS_CHART_KINDS.includes(kind);
	const maxCategories = isClasses
		? STAT_CHART_LIMITS.classes
		: kind === 'barres' || kind === 'effectifs'
			? STAT_CHART_LIMITS.barCategories
			: STAT_CHART_LIMITS.pieSectors;
	// Tableau d'effectifs (Q126) : en classes si ses lignes s'écrivent [a ; b[
	let tableClasses: boolean | null = null;

	source.split('\n').forEach((rawLine, index) => {
		const line = index + 1;
		const content = rawLine.trim();
		if (content === '') return;
		try {
			const kv = KEY_LINE_REGEX.exec(content);
			const key = kv ? optionKeyOf(kv[1]) : null;
			// `prévoir: x = 2` se lisait comme la catégorie « prévoir: x » (revue)
			if (kv && key !== null && SCATTER_ONLY_OPTIONS.includes(key)) {
				throw new LineError(
					`l'option « ${kv[1]} » ne s'applique pas aux ${KIND_NAME[kind]} (réservée aux ${KIND_NAME.nuage})`
				);
			}
			const series = NAMED_SERIES_REGEX.exec(content);
			if (series) {
				if (kind === 'circulaire') throw new LineError('une seule série par diagramme circulaire');
				if (kind === 'effectifs') throw new LineError('une seule série par tableau d’effectifs');
				if (kind !== 'barres' && !CLASS_CHART_KINDS.includes(kind)) {
					throw new LineError(
						`l'option « données » ne s'applique pas aux ${KIND_NAME[kind]} (réservée aux ${RAW_DATA_KINDS.map((k) => KIND_NAME[k]).join(', ')})`
					);
				}
				if (data.length > 0) throw new LineError(RAW_AND_COUNTS);
				const name = series[1].trim();
				// `données  : 1` : des espaces seules ne font pas un nom (revue)
				if (name === '') throw new LineError('nom de série vide (écrire données A: …)');
				if (name.length > STAT_CHART_LIMITS.labelLength) {
					throw new LineError(
						`nom de série trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
					);
				}
				const same = named.find((s) => s.name === name);
				const homonym = named.find(
					(s) => s.name !== name && s.name.toLocaleLowerCase('fr') === name.toLocaleLowerCase('fr')
				);
				if (homonym) {
					throw new LineError(`deux séries de même nom (« ${homonym.name} » et « ${name} »)`);
				}
				if (!same && named.length === 2) throw new LineError('au plus deux séries');
				const entries = parseRawEntries(series[2]).map((text) => ({ text, line }));
				if (same) same.entries.push(...entries);
				else named.push({ name, entries });
				return;
			}
			if (kv && key === 'donnees') {
				if (!RAW_DATA_KINDS.includes(kind)) {
					const names = RAW_DATA_KINDS.map((k) => KIND_NAME[k]).join(', ');
					throw new LineError(
						`l'option « ${kv[1]} » ne s'applique pas aux ${KIND_NAME[kind]} (réservée aux ${names})`
					);
				}
				if (data.length > 0) throw new LineError(RAW_AND_COUNTS);
				raw.push(...parseRawEntries(kv[2]).map((text) => ({ text, line })));
				return;
			}
			if (kv && key !== null && isOptionKey(key)) {
				if (seenOptions.has(key)) throw new LineError(`option « ${kv[1]} » déjà donnée`);
				seenOptions.add(key);
				applyOption(kind, key, kv[2], options);
				if (key === 'indicateurs') indicatorsLine = line;
				optionLines[key] = line;
				if (key === 'masquer') options.masked.forEach((cell) => (cell.line = line));
				return;
			}

			// Loi binomiale : `X ~ B(10 ; 0,3)`, `X suit B(10 ; 3/10)` (pas en simulation : PR b)
			const binomial = isLaw ? BINOMIAL_REGEX.exec(content) : null;
			if (binomial) {
				if (
					lawVariable !== null ||
					lawProbabilities !== null ||
					lawBinomial !== null ||
					lawNamed !== null
				) {
					throw new LineError(BINOMIAL_ALONE);
				}
				lawBinomial = { name: binomial[1], n: binomial[2], p: binomial[3], line };
				return;
			}

			// Lois géométrique et uniforme (manche 13) : `X ~ G(0,2)`, `X ~ U(1 ; 6)` ;
			// dans une simulation aussi (manche 14)
			if (isLaw) {
				// Lois à densité (PR b) : `U([a ; b])` AVANT `U(a ; b)`, qui la lirait aussi
				const density = UNIFORM_DENSITY_REGEX.exec(content);
				const exponential = density ? null : EXPONENTIAL_REGEX.exec(content);
				const normal = density || exponential ? null : NORMAL_REGEX.exec(content);
				const geometric = density || exponential || normal ? null : GEOMETRIC_REGEX.exec(content);
				// `U([0 ; 10[`, `U([0 ; 10)` : une loi à densité mal écrite, pas la loi discrète (revue)
				if (!density && UNIFORM_BRACKET_REGEX.test(content)) {
					throw new LineError('U([a ; b]) : écrire U([0 ; 10]) avec deux nombres');
				}
				const uniform =
					density || exponential || normal || geometric ? null : UNIFORM_REGEX.exec(content);
				if (density || exponential || normal || geometric || uniform) {
					if (
						lawVariable !== null ||
						lawProbabilities !== null ||
						lawBinomial !== null ||
						lawNamed !== null
					) {
						throw new LineError(NAMED_ALONE);
					}
					if (density) {
						lawNamed = {
							family: 'uniform-density',
							name: density[1],
							a: density[2],
							b: density[3],
							line
						};
					} else if (exponential) {
						lawNamed = {
							family: 'exponential',
							name: exponential[1],
							lambda: exponential[2],
							line
						};
					} else if (normal) {
						lawNamed = {
							family: 'normal',
							name: normal[1],
							mu: normal[2],
							variance: normal[3],
							line
						};
					} else {
						lawNamed = geometric
							? { family: 'geometric', name: geometric[1], p: geometric[2], line }
							: { family: 'uniform', name: uniform![1], a: uniform![2], b: uniform![3], line };
					}
					return;
				}
			}

			const separator = content.lastIndexOf('=');
			if (separator === -1) {
				// `Vélo : 3` : un deux-points à la place du signe =
				if (kv && NUMBER_REGEX.test(kv[2].trim())) {
					throw new LineError(`écrire « ${kv[1]} = ${kv[2].trim()} » (catégorie = effectif)`);
				}
				if (kv) {
					// Seules les options de CE bloc : une coquille dans ```loi ne
					// propose plus `tirages`, refusé ensuite (revue de la PR simulation)
					const choices = OPTION_KEYS.filter((k) => OPTION_KINDS[k]?.includes(kind) ?? true)
						.map((k) => OPTION_SPELLING[k] ?? k)
						.join(', ');
					throw new LineError(`option « ${kv[1]} » inconnue (options : ${choices})`);
				}
				throw new LineError('écrire « catégorie = effectif » ou « option: valeur »');
			}

			const written = content.slice(0, separator).trim();
			if (written === '') throw new LineError('catégorie sans nom avant « = »');

			// Loi : `X = 1 ; 2 ; 3` (la variable) et `P = 1/2 ; 1/4 ; 1/4`
			if (isLaw) {
				if (lawBinomial !== null) throw new LineError(BINOMIAL_ALONE);
				if (lawNamed !== null) throw new LineError(NAMED_ALONE);
				const texts = content
					.slice(separator + 1)
					.split(';')
					.map((t) => t.trim());
				if (written === 'P') {
					if (lawProbabilities !== null) throw new LineError('ligne « P = … » déjà donnée');
					for (const text of texts) {
						if (text === '?' && isSimulation) {
							throw new LineError('une simulation demande toutes les probabilités (pas de « ? »)');
						}
						if (text !== '?' && Fraction.parse(text) === null) {
							throw new LineError(
								`« ${text} » n'est pas une probabilité (écrire 1/6, 0,25 ou 25 %)`
							);
						}
					}
					lawProbabilities = { texts: texts.map((t) => (t === '?' ? null : t)), line };
					return;
				}
				if (!/^[A-Z]$/.test(written)) {
					throw new LineError(
						`« ${written} » : nommer la variable par une lettre majuscule (X = 1 ; 2 ; 3), ou écrire « P = … »`
					);
				}
				if (lawVariable !== null) {
					throw new LineError(`une seule variable par loi (déjà : ${lawVariable.name})`);
				}
				if (texts.length > STAT_CHART_LIMITS.lawValues) {
					throw new LineError(`au plus ${STAT_CHART_LIMITS.lawValues} valeurs dans une loi`);
				}
				for (const text of texts) {
					if (text === '') throw new LineError('valeur vide (un « ; » de trop ?)');
					// Un pourcentage est une probabilité, pas une valeur de la variable
					if (text.includes('%') || Fraction.parse(text) === null) {
						throw new LineError(`« ${text} » n'est pas un nombre`);
					}
				}
				lawVariable = { name: written, texts, line };
				return;
			}

			// Tableau croisé : `Fille = 45 ; 120`, une case par colonne, `?` = inconnue
			if (isTable) {
				if (tableRows.some((row) => row.name === written)) {
					throw new LineError(`ligne « ${written} » déjà donnée`);
				}
				const values = content
					.slice(separator + 1)
					.split(';')
					.map((cell) => {
						if (cell.trim() === '?') return null;
						const parsed = parseValue(cell);
						if (unit !== null && unit.value !== parsed.unit) {
							throw new LineError(
								`effectifs et pourcentages mélangés (la ligne ${unit.line} donne des ${unit.value})`
							);
						}
						unit ??= { value: parsed.unit, line };
						return parsed.value;
					});
				tableRows.push({ name: written, values, line });
				return;
			}
			if (raw.length > 0 || named.length > 0) throw new LineError(RAW_AND_COUNTS);
			const classLine = isClasses || (kind === 'effectifs' && written.startsWith('['));
			if (kind === 'effectifs') {
				tableClasses ??= classLine;
				if (tableClasses !== classLine) {
					throw new LineError('écrire toutes les lignes en classes [a ; b[, ou aucune');
				}
			}
			const { label, interval } = classLine
				? parseClass(written)
				: { label: written, interval: null };
			if (label.length > STAT_CHART_LIMITS.labelLength) {
				throw new LineError(
					`nom de catégorie trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
				);
			}
			if (data.some((datum) => datum.label === label)) {
				throw new LineError(`catégorie « ${label} » déjà donnée`);
			}
			const limit = classLine ? STAT_CHART_LIMITS.classes : maxCategories;
			if (data.length >= limit) {
				const what = classLine ? 'classes' : 'catégories';
				throw new LineError(`au plus ${limit} ${what} dans les ${KIND_NAME[kind]}`);
			}

			const parsed = parseValue(content.slice(separator + 1));
			if (unit !== null && unit.value !== parsed.unit) {
				throw new LineError(
					`effectifs et pourcentages mélangés (la ligne ${unit.line} donne des ${unit.value})`
				);
			}
			unit ??= { value: parsed.unit, line };
			data.push({ label, value: parsed.value, interval, line });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push({ message: `Ligne ${line} : ${message}`, line, content });
		}
	});

	let twoSeries: StatChartSpec['twoSeries'] = null;
	if (errors.length === 0 && named.length > 0) {
		const line = named[0].entries[0]?.line ?? 0;
		if (named.length < 2 || raw.length > 0) {
			errors.push({
				message: `Ligne ${line} : écrire deux séries nommées : données A: … et données B: …`,
				line
			});
		} else if (isClasses) {
			const ranged = tallyTwoSeriesInClasses(kind, named[0], named[1], options, optionLines);
			if ('error' in ranged) errors.push(ranged.error);
			else {
				data.push(...ranged.data);
				twoSeries = ranged.twoSeries;
			}
		} else {
			const tallied = tallyTwoSeries(named[0], named[1], options.barDisplay);
			if ('error' in tallied) errors.push(tallied.error);
			else {
				data.push(...tallied.data);
				twoSeries = tallied.twoSeries;
			}
		}
	}
	if (errors.length === 0 && options.barDisplay !== null && twoSeries === null) {
		const line = optionLines.afficher ?? 0;
		errors.push({ message: `Ligne ${line} : afficher : seulement avec deux séries`, line });
	}

	// Classes : selon le genre, ou, pour un tableau d'effectifs, selon ses données
	const classMode =
		isClasses || (kind === 'effectifs' && (tableClasses === true || options.classBounds !== null));
	let rawValues: number[] | null = null;
	if (
		errors.length === 0 &&
		classMode &&
		options.classBounds !== null &&
		raw.length === 0 &&
		named.length === 0
	) {
		const line = optionLines.classes ?? 0;
		// Des lignes `[a ; b[ = n` donnent déjà les classes (revue)
		const message =
			tableClasses === true
				? 'classes : inutile, les lignes [a ; b[ donnent déjà les classes'
				: 'classes : seulement avec données: (sinon écrire [0 ; 5[ = effectif)';
		errors.push({ message: `Ligne ${line} : ${message}`, line });
	} else if (errors.length === 0 && raw.length > 0 && classMode) {
		const ranged = tallyIntoClasses(kind, raw, options.classBounds, optionLines.classes ?? 0);
		if ('error' in ranged) errors.push(ranged.error);
		else {
			data.push(...ranged.data);
			rawValues = ranged.values;
		}
	} else if (errors.length === 0 && raw.length > 0) {
		const tallied = tallyRawData(kind, raw, maxCategories);
		if ('error' in tallied) errors.push(tallied.error);
		else data.push(...tallied.data);
	}

	let series: StatChartSpec['series'] = null;
	if (errors.length === 0 && options.seriesMode !== null) {
		const line = optionLines.serie ?? 0;
		const sources: { name: string | null; entries: { text: string }[] }[] =
			twoSeries !== null ? named : raw.length > 0 ? [{ name: null, entries: raw }] : [];
		const read = sources.map((source) => ({
			name: source.name,
			values: source.entries.map(({ text }) => ({ text, value: rawNumber(text) }))
		}));
		if (sources.length === 0) {
			errors.push({ message: `Ligne ${line} : série : seulement avec données:`, line });
		} else if (
			options.seriesMode === 'triée' &&
			read.some((r) => r.values.some((v) => v.value === null))
		) {
			errors.push({ message: `Ligne ${line} : série : triée demande des nombres`, line });
		} else {
			// Tri stable : deux écritures d'une même valeur gardent leur ordre
			if (options.seriesMode === 'triée') {
				for (const r of read) r.values.sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
			}
			series = {
				mode: options.seriesMode,
				lines: read.map((r) => ({
					name: r.name,
					values: r.values.map((v) => ({ text: v.text, numeric: v.value !== null }))
				}))
			};
		}
	}

	const dataUnit: StatChartUnit = unit?.value ?? 'effectifs';
	let table: CrossTableData | null = null;
	let law: LawData | null = null;
	let simulation: SimulationData | null = null;
	if (errors.length === 0 && isSimulation) {
		const problem = checkSimulationOptions(options, optionLines);
		if (problem) errors.push(problem);
	}
	// `arrondi:` et `probabilités:` n'ont de sens qu'avec une loi binomiale
	// `intervalle:` : la loi binomiale seulement (manche 13) ; `seuil:` : binomiale et
	// géométrique (manche 14)
	if (errors.length === 0 && seenOptions.has('intervalle') && lawNamed !== null) {
		const line = optionLines.intervalle ?? 0;
		errors.push({
			message: `Ligne ${line} : intervalle : option réservée à la loi binomiale`,
			line
		});
	}
	if (
		errors.length === 0 &&
		seenOptions.has('seuil') &&
		lawNamed !== null &&
		lawNamed.family !== 'geometric'
	) {
		const line = optionLines.seuil ?? 0;
		errors.push({
			message: `Ligne ${line} : seuil : option réservée aux lois binomiale et géométrique`,
			line
		});
	}
	// `répartition:` et `aire:` : les lois à densité (PR b)
	const isDensity =
		lawNamed?.family === 'uniform-density' ||
		lawNamed?.family === 'exponential' ||
		lawNamed?.family === 'normal';
	for (const key of ['repartition', 'aire'] as const) {
		if (errors.length === 0 && seenOptions.has(key) && !isDensity) {
			const line = optionLines[key] ?? 0;
			errors.push({
				message: `Ligne ${line} : ${OPTION_SPELLING[key] ?? key} : ${DENSITY_CDF_ONLY}`,
				line
			});
		}
	}
	// Simulation (manche 14) : `classes:` pour l'histogramme d'une loi à densité,
	// `jusqu'à:` pour le tableau d'une loi géométrique — en mode tirages seulement
	if (errors.length === 0 && isSimulation && seenOptions.has('classes')) {
		const line = optionLines.classes ?? 0;
		if (!isDensity || options.simulationMode !== 'tirages') {
			errors.push({
				message: `Ligne ${line} : classes : seulement pour une loi à densité (U([a ; b]) ou E(λ)) en mode tirages`,
				line
			});
		}
	}
	if (
		errors.length === 0 &&
		isSimulation &&
		seenOptions.has('jusqua') &&
		lawNamed?.family === 'geometric' &&
		options.simulationMode !== 'tirages'
	) {
		const line = optionLines.jusqua ?? 0;
		errors.push({ message: `Ligne ${line} : jusqu'à : seulement en mode tirages`, line });
	}
	// `jusqu'à:` : le tableau d'une loi géométrique
	if (errors.length === 0 && seenOptions.has('jusqua') && lawNamed?.family !== 'geometric') {
		const line = optionLines.jusqua ?? 0;
		errors.push({
			message: `Ligne ${line} : jusqu'à : seulement avec une loi géométrique (X ~ G(p))`,
			line
		});
	}
	for (const key of ['probabilites', 'arrondi', 'diagramme', 'intervalle', 'seuil'] as const) {
		if (errors.length === 0 && seenOptions.has(key) && lawBinomial === null && lawNamed === null) {
			const line = optionLines[key] ?? 0;
			// `probabilités:`, `arrondi:`, `diagramme:` : les trois lois nommées (manche 13)
			const laws =
				key === 'intervalle'
					? 'une loi binomiale (X ~ B(n ; p))'
					: key === 'seuil'
						? 'une loi binomiale ou géométrique (X ~ B(n ; p) ou G(p))'
						: 'une loi binomiale, géométrique ou uniforme (X ~ B(n ; p), G(p) ou U(a ; b))';
			errors.push({
				message: `Ligne ${line} : ${OPTION_SPELLING[key] ?? key} : seulement avec ${laws}`,
				line
			});
		}
	}
	const warnings: StatChartIssue[] = [];
	if (errors.length === 0 && lawBinomial !== null && isSimulation) {
		// Simulation de B(n ; p) : au plus 30 valeurs, comme le tableau d'une loi (PR b)
		const problem = checkSimulationOptions(options, optionLines);
		const checked = checkBinomial(lawBinomial, options, optionLines);
		if (problem) errors.push(problem);
		else if ('error' in checked) errors.push(checked.error);
		// Même plafond que le tableau d'une loi : 30 valeurs, n ⩽ 29 (revue)
		else if (checked.law.binomial!.n + 1 > STAT_CHART_LIMITS.binomialTableValues) {
			errors.push({
				message: `Ligne ${lawBinomial.line} : B(n ; p) : au plus ${STAT_CHART_LIMITS.binomialTableValues} valeurs pour une simulation (n ⩽ ${STAT_CHART_LIMITS.binomialTableValues - 1})`,
				line: lawBinomial.line
			});
		} else {
			simulation = {
				variable: checked.law.variable,
				values: checked.law.values,
				probabilities: [],
				mode: options.simulationMode,
				draws: options.draws,
				seed: options.seed,
				samples: options.samples,
				sampleSize: options.sampleSize,
				binomial: { n: checked.law.binomial!.n, p: lawBinomial.p },
				named: null
			};
		}
	} else if (errors.length === 0 && lawBinomial !== null) {
		const checked = checkBinomial(lawBinomial, options, optionLines);
		if ('error' in checked) errors.push(checked.error);
		else {
			law = checked.law;
			const count = checked.law.binomial!.n + 1;
			if (count > STAT_CHART_LIMITS.binomialTableValues) {
				warnings.push({
					// Le diagramme suit le tableau : le dire s'il était demandé (revue)
					message: `Ligne ${lawBinomial.line} : ${count} valeurs : tableau non affiché (au plus ${STAT_CHART_LIMITS.binomialTableValues})${options.binomialChart ? ', diagramme non plus' : ''} ; les probabilités demandées restent données`,
					line: lawBinomial.line
				});
			}
		}
	} else if (errors.length === 0 && lawNamed !== null && isSimulation) {
		const checked = checkSimulatedNamedLaw(lawNamed, options, optionLines);
		if ('error' in checked) errors.push(checked.error);
		else simulation = checked.simulation;
	} else if (errors.length === 0 && lawNamed !== null) {
		const checked =
			lawNamed.family === 'geometric'
				? checkGeometric(lawNamed, options, optionLines)
				: lawNamed.family === 'uniform'
					? checkUniform(lawNamed, options, optionLines)
					: checkDensity(lawNamed, options, optionLines);
		if ('error' in checked) errors.push(checked.error);
		else {
			law = checked.law;
			warnings.push(...checked.warnings);
			const count = checked.law.values.length;
			if (lawNamed.family === 'uniform' && count > STAT_CHART_LIMITS.binomialTableValues) {
				warnings.push({
					message: `Ligne ${lawNamed.line} : ${count} valeurs : tableau non affiché (au plus ${STAT_CHART_LIMITS.binomialTableValues})${options.binomialChart ? ', diagramme non plus' : ''} ; les probabilités demandées restent données`,
					line: lawNamed.line
				});
			}
		}
	} else if (errors.length === 0 && isLaw) {
		const checked = checkLaw(lawVariable, lawProbabilities, options, optionLines);
		if ('errors' in checked) errors.push(...checked.errors);
		else if (isSimulation) {
			simulation = {
				variable: checked.law.variable,
				values: checked.law.values,
				// Le parseur a refusé « ? » dans une simulation
				probabilities: checked.law.probabilities.map((p) => p ?? ''),
				mode: options.simulationMode,
				draws: options.draws,
				seed: options.seed,
				samples: options.samples,
				sampleSize: options.sampleSize,
				binomial: null,
				named: null
			};
		} else law = checked.law;
	} else if (errors.length === 0 && isTable) {
		const checked = checkTable(options, tableRows, optionLines);
		if ('errors' in checked) errors.push(...checked.errors);
		else table = checked.table;
	} else if (errors.length === 0) {
		// Un tableau d'effectifs a besoin des effectifs (Q126)
		if (kind === 'effectifs' && unit?.value === 'pourcentages') {
			errors.push({
				message: `Ligne ${unit.line} : écrire des effectifs, pas des pourcentages`,
				line: unit.line
			});
		} else {
			const whole = checkWhole(kind, data, dataUnit, options.areaLegend, classMode);
			if (whole) errors.push(whole);
		}
	}
	let frequencyTable: StatChartSpec['frequencyTable'] = null;
	if (errors.length === 0 && kind === 'effectifs') {
		const checked = checkFrequencyTable(options, optionLines, seenOptions, data, classMode);
		if ('error' in checked) errors.push(checked.error);
		else frequencyTable = checked.table;
	}
	if (errors.length === 0 && options.indicators.length > 0) {
		const problem = checkIndicators(kind, options.indicators, data, dataUnit, classMode);
		if (problem) {
			errors.push({ message: `Ligne ${indicatorsLine} : ${problem}`, line: indicatorsLine });
		}
	}

	const spec: StatChartSpec | null =
		errors.length === 0
			? {
					kind,
					data,
					unit: dataUnit,
					title: options.title,
					axes: options.axes,
					description: options.description,
					size: options.size,
					showValues: options.showValues,
					color: options.color,
					labels: options.labels,
					areaLegend: options.areaLegend,
					direction: options.direction,
					reading: options.reading,
					indicators: options.indicators,
					table,
					law,
					simulation,
					rawValues,
					frequencyTable,
					series,
					twoSeries,
					scatter: null
				}
			: null;

	return { type: 'stat-chart', kind, source, spec, errors, warnings };
}

/**
 * Analyser un bloc repéré dans les lignes d'un document (clôtures comprises).
 */
export function parseStatChart(
	lines: string[],
	startIndex: number,
	endIndex: number
): StatChartNode {
	const kind = isStatChartBlockStart(lines[startIndex]) ?? STAT_CHART_KINDS[0];
	const closed = endIndex > startIndex && BLOCK_END_REGEX.test(lines[endIndex]);
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseStatChartContent(kind, body.join('\n'));
	if (closed) return node;
	// Non fermé : le diagramme n'est pas dessiné, l'auteur sait pourquoi (Q48).
	return {
		...node,
		spec: null,
		errors: [
			...node.errors,
			{
				message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
				line: body.length + 1
			}
		]
	};
}
