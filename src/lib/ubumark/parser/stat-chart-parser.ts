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

import {
	CLASS_CHART_KINDS,
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
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BLOCK_START_REGEX = /^```(barres|circulaire|histogramme|frequences-cumulees)\s*$/;
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
	'indicateurs'
] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

/** Options réservées à certains blocs ; absente = tous */
const OPTION_KINDS: Partial<Record<OptionKey, readonly StatChartKind[]>> = {
	axes: ['barres', 'histogramme', 'frequences-cumulees'],
	valeurs: ['barres', 'histogramme'],
	couleur: ['barres', 'histogramme', 'frequences-cumulees'],
	etiquettes: ['circulaire'],
	legende: ['histogramme'],
	sens: ['frequences-cumulees'],
	lecture: ['frequences-cumulees'],
	indicateurs: ['barres', 'histogramme', 'frequences-cumulees']
};

const KIND_NAME: Record<StatChartKind, string> = {
	barres: 'diagrammes en barres',
	circulaire: 'diagrammes circulaires',
	histogramme: 'histogrammes',
	'frequences-cumulees': 'polygones des fréquences cumulées'
};

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
		if (j < lines.length && BLOCK_END_REGEX.test(lines[j])) {
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
		const names = allowed.map((k) => KIND_NAME[k]).join(', ');
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
			options.size = oneOf(value, COURBE_SIZES, 'taille');
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
			options.indicators = parseIndicators(value);
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
		case 'valeurs': {
			const answer = normalizeKey(value.trim());
			if (answer !== 'oui' && answer !== 'non') {
				throw new LineError(`« valeurs: ${value.trim()} » : écrire oui ou non`);
			}
			options.showValues = answer === 'oui';
			return;
		}
	}
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
		const notNumber = data.find((d) => !PLAIN_NUMBER_REGEX.test(d.label));
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
		indicators: []
	};
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
			if (kv && key !== null && isOptionKey(key)) {
				if (seenOptions.has(key)) throw new LineError(`option « ${kv[1]} » déjà donnée`);
				seenOptions.add(key);
				applyOption(kind, key, kv[2], options);
				if (key === 'indicateurs') indicatorsLine = line;
				return;
			}

			const separator = content.lastIndexOf('=');
			if (separator === -1) {
				// `Vélo : 3` : un deux-points à la place du signe =
				if (kv && NUMBER_REGEX.test(kv[2].trim())) {
					throw new LineError(`écrire « ${kv[1]} = ${kv[2].trim()} » (catégorie = effectif)`);
				}
				if (kv) {
					throw new LineError(
						`option « ${kv[1]} » inconnue (options : titre, axes, description, taille, valeurs, couleur, étiquettes, légende, sens, lecture, indicateurs)`
					);
				}
				throw new LineError('écrire « catégorie = effectif » ou « option: valeur »');
			}

			const written = content.slice(0, separator).trim();
			if (written === '') throw new LineError('catégorie sans nom avant « = »');
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

	const dataUnit: StatChartUnit = unit?.value ?? 'effectifs';
	if (errors.length === 0) {
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
		errors.length === 0 ? { kind, data, unit: dataUnit, ...options } : null;

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
