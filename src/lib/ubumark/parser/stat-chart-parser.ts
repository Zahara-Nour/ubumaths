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
	type LawData,
	type LawIndicator,
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
	type StatChartUnit
} from '../types/stat-chart';
import { COURBE_COLORS, COURBE_SIZES, type CourbeColor, type CourbeSize } from '../types/courbe';
import { summarizeClasses } from '$lib/statistics/classes';
import { crossTable } from '$lib/statistics/cross-table';
import { Fraction } from '$lib/statistics/fraction';
import { randomVariable } from '$lib/statistics/random-variable';
import { readListValue } from '$lib/statistics/read-value';
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
}

/** Une ligne `X = …` ou `P = …` d'une loi, avant le contrôle d'ensemble */
interface LawLine {
	texts: (string | null)[];
	line: number;
}

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
	/^```(barres|circulaire|histogramme|frequences-cumulees|tableau-croise|loi|simulation)\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `titre: …` — clé en lettres (accents compris), puis deux-points */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

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
	'classes'
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
	sens: ['frequences-cumulees'],
	lecture: ['frequences-cumulees'],
	indicateurs: ['barres', 'histogramme', 'frequences-cumulees', 'loi'],
	lignes: ['tableau-croise'],
	colonnes: ['tableau-croise'],
	totaux: ['tableau-croise'],
	afficher: ['tableau-croise'],
	masquer: ['tableau-croise', 'loi'],
	coin: ['tableau-croise'],
	mode: ['simulation'],
	tirages: ['simulation'],
	graine: ['simulation'],
	echantillons: ['simulation'],
	classes: ['histogramme', 'frequences-cumulees']
};

/** Options dont l'auteur écrit l'accent */
const OPTION_SPELLING: Partial<Record<OptionKey, string>> = {
	etiquettes: 'étiquettes',
	legende: 'légende',
	echantillons: 'échantillons'
};

const KIND_NAME: Record<StatChartKind, string> = {
	barres: 'diagrammes en barres',
	circulaire: 'diagrammes circulaires',
	histogramme: 'histogrammes',
	'frequences-cumulees': 'polygones des fréquences cumulées',
	'tableau-croise': 'tableaux croisés',
	loi: 'lois de variables aléatoires',
	simulation: 'simulations'
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
	'frequences-cumulees'
];

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

/** Ligne qui a la forme d'une ligne de bloc statistique */
function looksLikeStatChartLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.includes('=')) return true;
	const kv = KEY_LINE_REGEX.exec(trimmed);
	return kv !== null && isOptionKey(normalizeKey(kv[1]));
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
		const closes = !bodyOpensParagraph(body, looksLikeStatChartLine);
		if (j < lines.length && BLOCK_END_REGEX.test(lines[j]) && closes) {
			blocks.push({ kind, startIndex, endIndex: j, closed: true });
			i = j + 1;
			continue;
		}
		let end = startIndex;
		for (let k = startIndex + 1; k < j; k++) {
			if (lines[k].trim() === '' || !looksLikeStatChartLine(lines[k])) break;
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
			`l'option « ${key} » ne s'applique pas aux ${KIND_NAME[kind]} (réservée aux ${names})`
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
		case 'classes':
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
			options.color = oneOf(value, COURBE_COLORS, 'couleur');
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
			options.rows = parseNames(value, 'lignes');
			return;
		case 'colonnes':
			options.columns = parseNames(value, 'colonnes');
			return;
		case 'afficher':
			options.display = oneOf(value, CROSS_TABLE_DISPLAYS, 'affichage');
			return;
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

	const values = raw.map((entry) => rawNumber(entry.text));
	const numeric = values.every((value) => value !== null);
	const groups = new Map<string, { label: string; value: number; count: number; line: number }>();
	for (const [i, { text, line }] of raw.entries()) {
		// `+ 0` : -0 et 0 sont la même catégorie
		const value = numeric ? (values[i] ?? 0) + 0 : 0;
		const key = numeric ? String(value) : text.normalize('NFC').toLocaleLowerCase('fr');
		const group = groups.get(key);
		if (group) {
			group.count++;
			continue;
		}
		let label = text;
		if (numeric) {
			try {
				label = numericLabel(text, value);
			} catch (error) {
				return at(line, error instanceof Error ? error.message : String(error));
			}
		}
		groups.set(key, { label, value, count: 1, line });
	}
	const categories = [...groups.values()];
	if (numeric) categories.sort((a, b) => a.value - b.value);

	const tooLong = categories.find((c) => c.label.length > STAT_CHART_LIMITS.labelLength);
	if (tooLong) {
		return at(
			tooLong.line,
			`nom de catégorie trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
		);
	}
	if (categories.length > maxCategories) {
		const shapes = kind === 'circulaire' ? 'secteurs' : 'barres';
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
	if (bounds.length < 2)
		throw new LineError('classes : au moins deux bornes (classes: 0 ; 5 ; 10)');
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
	const chart = kind === 'histogramme' ? 'un histogramme' : 'un polygone';
	for (const { text, line } of raw) {
		const value = rawNumber(text);
		if (value === null) {
			return at(line, `« ${text} » n’est pas un nombre : ${chart} demande des nombres`);
		}
		if (value < first.interval.lower) {
			return at(line, `${spokenNumber(value)} sort des classes : la première est ${first.label}`);
		}
		if (value >= last.interval.upper) {
			const next = last.interval.upper + (last.interval.upper - last.interval.lower);
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

function parseLawIndicators(raw: string): LawIndicator[] {
	const names = raw
		.split(';')
		.map((name) => name.trim())
		.filter((name) => name !== '');
	if (names.length === 0) throw new LineError('indicateurs : aucun indicateur donné');
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
			indicators: options.lawIndicators
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
	areaLegend: { value: number } | null
): StatChartIssue | null {
	if (data.length === 0) {
		return { message: 'Aucune donnée : écrire au moins une ligne « catégorie = effectif »' };
	}
	if (kind === 'barres') return null;

	const total = data.reduce((sum, datum) => sum + datum.value, 0);
	// Circulaire et séries en classes : des pourcentages forment un tout (Q22 ;
	// revue du lot 3 : 10 % + 20 % montaient quand même à 100 % sur le polygone)
	if (unit === 'pourcentages' && Math.abs(total - 100) > STAT_CHART_LIMITS.percentTolerance) {
		const rounded = Math.round(total * 10) / 10;
		return { message: `La somme des pourcentages fait ${formatForMessage(rounded)} %, pas 100 %` };
	}

	if (CLASS_CHART_KINDS.includes(kind)) {
		const classes = data.map((d) => ({
			lower: d.interval?.lower ?? 0,
			upper: d.interval?.upper ?? 0,
			count: d.value
		}));
		// Classes contiguës, total non nul : la règle du module statistique
		const outcome = summarizeClasses(classes);
		if (outcome !== null && !outcome.ok) return { message: outcome.message };
		// Quadrillage borné : la règle partagée avec la scène
		if (kind === 'histogramme' && usesCarreaux(classes, areaLegend !== null)) {
			const grid = carreauGrid(classes, areaLegend?.value ?? null);
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
	unit: StatChartUnit
): string | null {
	const isClasses = CLASS_CHART_KINDS.includes(kind);
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
// ANALYSE
// ============================================================================

/** Analyser le corps d'un bloc (sans les clôtures). Rend toujours un nœud. */
export function parseStatChartContent(kind: StatChartKind, source: string): StatChartNode {
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
		classBounds: null
	};
	let lawVariable = null as ({ name: string } & LawLine) | null;
	let lawProbabilities = null as LawLine | null;
	// Une simulation écrit sa loi comme le bloc ```loi
	const isSimulation = kind === 'simulation';
	const isLaw = kind === 'loi' || isSimulation;
	const tableRows: TableRow[] = [];
	// Série brute (`données:`), dépouillée une fois tout lu
	const raw: { text: string; line: number }[] = [];
	const isTable = kind === 'tableau-croise';
	const isClasses = CLASS_CHART_KINDS.includes(kind);
	const maxCategories = isClasses
		? STAT_CHART_LIMITS.classes
		: kind === 'barres'
			? STAT_CHART_LIMITS.barCategories
			: STAT_CHART_LIMITS.pieSectors;

	source.split('\n').forEach((rawLine, index) => {
		const line = index + 1;
		const content = rawLine.trim();
		if (content === '') return;
		try {
			const kv = KEY_LINE_REGEX.exec(content);
			const key = kv ? normalizeKey(kv[1]) : null;
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
			if (raw.length > 0) throw new LineError(RAW_AND_COUNTS);
			const { label, interval } = isClasses
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
			if (data.length >= maxCategories) {
				const what = isClasses ? 'classes' : 'catégories';
				throw new LineError(`au plus ${maxCategories} ${what} dans les ${KIND_NAME[kind]}`);
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

	let rawValues: number[] | null = null;
	if (errors.length === 0 && isClasses && options.classBounds !== null && raw.length === 0) {
		const line = optionLines.classes ?? 0;
		errors.push({
			message: `Ligne ${line} : classes : seulement avec données: (sinon écrire [0 ; 5[ = effectif)`,
			line
		});
	} else if (errors.length === 0 && raw.length > 0 && isClasses) {
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

	const dataUnit: StatChartUnit = unit?.value ?? 'effectifs';
	let table: CrossTableData | null = null;
	let law: LawData | null = null;
	let simulation: SimulationData | null = null;
	if (errors.length === 0 && isSimulation) {
		const problem = checkSimulationOptions(options, optionLines);
		if (problem) errors.push(problem);
	}
	if (errors.length === 0 && isLaw) {
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
				sampleSize: options.sampleSize
			};
		} else law = checked.law;
	} else if (errors.length === 0 && isTable) {
		const checked = checkTable(options, tableRows, optionLines);
		if ('errors' in checked) errors.push(...checked.errors);
		else table = checked.table;
	} else if (errors.length === 0) {
		const whole = checkWhole(kind, data, dataUnit, options.areaLegend);
		if (whole) errors.push(whole);
	}
	if (errors.length === 0 && options.indicators.length > 0) {
		const problem = checkIndicators(kind, options.indicators, data, dataUnit);
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
					rawValues
				}
			: null;

	return { type: 'stat-chart', kind, source, spec, errors, warnings: [] };
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
