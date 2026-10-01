/**
 * Blocs ```barres et ```circulaire — analyse du texte
 * ===================================================
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
 * Grammaire (Q8 du 2026-10-01) : `clé: valeur` est une option, `catégorie =
 * effectif` une donnée. Une option CONNUE l'emporte (`titre: Score = 3` est un
 * titre) ; une clé inconnue suivie de « = » est un nom de catégorie
 * (`Sport: Foot = 3`).
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
	STAT_CHART_KINDS,
	STAT_CHART_LABELS,
	STAT_CHART_LIMITS,
	type StatChartBlockRange,
	type StatChartDatum,
	type StatChartIssue,
	type StatChartKind,
	type StatChartLabels,
	type StatChartNode,
	type StatChartSpec,
	type StatChartUnit
} from '../types/stat-chart';
import { COURBE_COLORS, COURBE_SIZES, type CourbeColor, type CourbeSize } from '../types/courbe';

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
}

// ============================================================================
// CONSTANTES
// ============================================================================

const BLOCK_START_REGEX = /^```(barres|circulaire)\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `titre: …` — clé en lettres (accents compris), puis deux-points */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** `12`, `12,5`, `-3`, `35 %`, `12.5%` */
const NUMBER_REGEX = /^(-?\d+(?:[.,]\d+)?)\s*(%?)$/;

/** Clés, sans accent ni majuscule */
const OPTION_KEYS = [
	'titre',
	'axes',
	'description',
	'taille',
	'valeurs',
	'couleur',
	'etiquettes'
] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

/** Options réservées à un seul genre de diagramme */
const OPTION_KIND: Partial<Record<OptionKey, StatChartKind>> = {
	axes: 'barres',
	valeurs: 'barres',
	couleur: 'barres',
	etiquettes: 'circulaire'
};

const KIND_NAME: Record<StatChartKind, string> = {
	barres: 'diagrammes en barres',
	circulaire: 'diagrammes circulaires'
};

// ============================================================================
// DÉTECTION
// ============================================================================

/** Genre du bloc qu'ouvre cette ligne, ou null. */
export function isStatChartBlockStart(line: string): StatChartKind | null {
	const match = BLOCK_START_REGEX.exec(line);
	return match ? (match[1] as StatChartKind) : null;
}

/** Ligne qui a la forme d'une ligne de bloc statistique */
function looksLikeStatChartLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.includes('=')) return true;
	const kv = KEY_LINE_REGEX.exec(trimmed);
	return kv !== null && isOptionKey(normalizeKey(kv[1]));
}

/**
 * Blocs ```barres / ```circulaire d'une liste de lignes (indices inclusifs,
 * clôtures comprises).
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

/** Un nombre écrit par l'auteur : valeur et unité. */
function parseValue(raw: string): { value: number; unit: StatChartUnit } {
	const text = raw.trim();
	const match = NUMBER_REGEX.exec(text);
	if (!match) {
		throw new LineError(`« ${text} » n'est pas un nombre (écrire par exemple 12, 12,5 ou 35 %)`);
	}
	const value = Number(match[1].replace(',', '.'));
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

function applyOption(kind: StatChartKind, key: OptionKey, value: string, options: Options): void {
	const only = OPTION_KIND[key];
	if (only !== undefined && only !== kind) {
		throw new LineError(`l'option « ${key} » est réservée aux ${KIND_NAME[only]}`);
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
	unit: StatChartUnit
): StatChartIssue | null {
	if (data.length === 0) {
		return { message: 'Aucune donnée : écrire au moins une ligne « catégorie = effectif »' };
	}
	if (kind !== 'circulaire') return null;

	const total = data.reduce((sum, datum) => sum + datum.value, 0);
	if (total === 0) return { message: 'Effectif total nul : aucun secteur à dessiner' };
	if (unit === 'pourcentages' && Math.abs(total - 100) > STAT_CHART_LIMITS.percentTolerance) {
		const rounded = Math.round(total * 10) / 10;
		return { message: `La somme des pourcentages fait ${formatForMessage(rounded)} %, pas 100 %` };
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
	const seenOptions = new Set<OptionKey>();
	const options: Options = {
		title: null,
		axes: { x: null, y: null },
		description: null,
		size: 'moyenne',
		showValues: false,
		color: 'bleu',
		labels: 'pourcentages'
	};
	const maxCategories =
		kind === 'barres' ? STAT_CHART_LIMITS.barCategories : STAT_CHART_LIMITS.pieSectors;

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
				return;
			}

			const separator = content.lastIndexOf('=');
			if (separator === -1) {
				if (kv) {
					throw new LineError(
						`option « ${kv[1]} » inconnue (options : titre, axes, description, taille, valeurs, couleur, étiquettes)`
					);
				}
				throw new LineError('écrire « catégorie = effectif » ou « option: valeur »');
			}

			const label = content.slice(0, separator).trim();
			if (label === '') throw new LineError('catégorie sans nom avant « = »');
			if (label.length > STAT_CHART_LIMITS.labelLength) {
				throw new LineError(
					`nom de catégorie trop long (au plus ${STAT_CHART_LIMITS.labelLength} caractères)`
				);
			}
			if (data.some((datum) => datum.label === label)) {
				throw new LineError(`catégorie « ${label} » déjà donnée`);
			}
			if (data.length >= maxCategories) {
				throw new LineError(`au plus ${maxCategories} catégories dans les ${KIND_NAME[kind]}`);
			}

			const parsed = parseValue(content.slice(separator + 1));
			if (unit !== null && unit.value !== parsed.unit) {
				throw new LineError(
					`effectifs et pourcentages mélangés (la ligne ${unit.line} donne des ${unit.value})`
				);
			}
			unit ??= { value: parsed.unit, line };
			data.push({ label, value: parsed.value, line });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			errors.push({ message: `Ligne ${line} : ${message}`, line, content });
		}
	});

	const dataUnit: StatChartUnit = unit?.value ?? 'effectifs';
	if (errors.length === 0) {
		const whole = checkWhole(kind, data, dataUnit);
		if (whole) errors.push(whole);
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
