/**
 * Bloc ```ranger — étiquettes à ranger (chantier reponses-a-placer § 21, 22)
 * ==========================================================================
 *
 * Le prof écrit les étiquettes DANS LE BON ORDRE, une par ligne `- …` :
 *
 * ```ranger
 * signe: <
 * - $\frac{2}{7}$
 * - $\frac{3}{7}$
 * - $\frac{6}{7}$
 * ```
 *
 * `signe: <` (défaut, croissant) ou `signe: >` (décroissant), en tête. Chaque
 * étiquette est de l'ubumark sur une ligne (formules, variables résolues au
 * tirage). De 2 à 8 étiquettes, deux à deux différentes : l'élève est jugé sur
 * l'étiquette posée, jamais sur sa valeur.
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Dans
 * l'énoncé d'une instance, le bloc liste ses étiquettes dans l'ordre AFFICHÉ
 * (mélangé) : il peut être montré tel quel, il ne trahit rien.
 *
 * @module ubumark/parser/ranger-parser
 */

import type { RangerNode, RangerSign, RangerSpec } from '../types/ranger';
import { RANGER_MAX_LABELS, RANGER_MIN_LABELS } from '../utils/ranger';

// Types
export interface RangerBlockRange {
	/** Ligne d'ouverture (```ranger) */
	startIndex: number;
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	closed: boolean;
}

export interface RangerBlock extends RangerSpec {
	range: RangerBlockRange;
}

// Constantes
const OPEN_REGEX = /^```ranger\s*$/;
const CLOSE_REGEX = /^```\s*$/;
const ITEM_REGEX = /^-(?:[ \t](.*))?$/;
const SETTING_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;

export const RANGER_BLOCK_UNCLOSED_MESSAGE = 'bloc non fermé (ajouter ``` à la fin)';

// Functions
export function isRangerBlockStart(line: string): boolean {
	return OPEN_REGEX.test(line);
}

/** Blocs ranger de premier niveau ; sans clôture, le bloc va jusqu'à la fin du texte */
export function findRangerBlocks(lines: readonly string[]): RangerBlockRange[] {
	const ranges: RangerBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (!OPEN_REGEX.test(lines[i])) {
			i++;
			continue;
		}
		let j = i + 1;
		while (j < lines.length && !CLOSE_REGEX.test(lines[j])) j++;
		const closed = j < lines.length;
		ranges.push({ startIndex: i, endIndex: closed ? j : lines.length - 1, closed });
		i = (closed ? j : lines.length - 1) + 1;
	}
	return ranges;
}

/** Ligne vue sans retrait ni marque de citation */
const unquoted = (line: string) => line.replace(/^[\s>]*/, '');

/**
 * Les blocs ranger d'un énoncé (tous portent des cases) : corps sans clôtures,
 * fermeture, et `nested` pour un bloc en retrait ou cité (l'élève ne pourrait pas
 * y répondre : ses cases ne sont pas créées)
 */
export function findRangersToPlace(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unquoted);
	return findRangerBlocks(plain).map((range) => ({
		startIndex: range.startIndex,
		body: plain.slice(range.startIndex + 1, range.closed ? range.endIndex : range.endIndex + 1),
		closed: range.closed,
		nested: lines[range.startIndex] !== plain[range.startIndex]
	}));
}

/** L'énoncé a-t-il des étiquettes à ranger ? */
export function hasRangerToPlace(markdown: string): boolean {
	return findRangersToPlace(markdown).length > 0;
}

function readSign(value: string, errors: string[]): RangerSign | undefined {
	const sign = value.trim();
	if (sign === '<' || sign === '>') return sign;
	errors.push('signe: écrire < (croissant) ou > (décroissant)');
	return undefined;
}

/** Lit le corps d'un bloc ranger (lignes entre les clôtures) */
export function parseRangerBody(body: readonly string[]): RangerSpec {
	const errors: string[] = [];
	const spec: RangerSpec = { sign: '<', labels: [], errors };

	for (const line of body) {
		const trimmed = line.trim();
		if (trimmed === '') continue;
		const item = trimmed.match(ITEM_REGEX);
		if (item) {
			spec.labels.push((item[1] ?? '').trim());
			continue;
		}
		const setting = spec.labels.length === 0 ? trimmed.match(SETTING_REGEX) : null;
		if (setting) {
			const key = setting[1].toLowerCase();
			if (key === 'signe') {
				const sign = readSign(setting[2], errors);
				if (sign) spec.sign = sign;
			} else if (key === 'case' && CASE_INDEX_REGEX.test(setting[2].trim())) {
				spec.caseIndex = Number(setting[2].trim());
			} else {
				errors.push(`réglage « ${setting[1]} » inconnu (signe)`);
			}
			continue;
		}
		errors.push(`ligne « ${trimmed} » : une étiquette commence par « - »`);
	}

	spec.labels.forEach((label, index) => {
		if (label === '') errors.push(`l’étiquette ${index + 1} est vide`);
	});
	spec.labels.forEach((label, index) => {
		const first = spec.labels.indexOf(label);
		if (label !== '' && first < index) {
			errors.push(
				`les étiquettes ${first + 1} et ${index + 1} sont identiques (« ${label} ») : on ne saurait pas laquelle va où`
			);
		}
	});
	if (spec.labels.length < RANGER_MIN_LABELS) {
		errors.unshift('au moins 2 étiquettes (une ligne « - … » par étiquette)');
	}
	if (spec.labels.length > RANGER_MAX_LABELS) {
		errors.unshift(`au plus ${RANGER_MAX_LABELS} étiquettes`);
	}
	return spec;
}

/** Nœud d'un bloc ranger depuis son texte entre les clôtures */
export function parseRangerContent(source: string): RangerNode {
	return { type: 'ranger', ...parseRangerBody(source.split('\n')), source };
}

/**
 * Nœud du bloc ranger qui s'ouvre à `startIndex` (parseur markdown). `end` n'est
 * pas lu : la clôture est retrouvée ici.
 */
export function parseRangerBlock(
	lines: string[],
	startIndex: number,
	_end: number
): { node: RangerNode } {
	const range = findRangerBlocks(lines.slice(startIndex))[0];
	const endIndex = range ? startIndex + range.endIndex : lines.length - 1;
	const closed = range?.closed ?? false;
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseRangerContent(body.join('\n'));
	if (!closed) node.errors.push(RANGER_BLOCK_UNCLOSED_MESSAGE);
	return { node };
}

/**
 * Écrit le bloc d'une instance : `case: N`, `signe: >` s'il y a lieu, les
 * étiquettes dans l'ordre donné (l'ordre AFFICHÉ)
 */
export function serializeRangerBlock(block: {
	caseIndex: number;
	sign: RangerSign;
	labels: readonly string[];
}): string {
	return [
		'```ranger',
		`case: ${block.caseIndex}`,
		...(block.sign === '>' ? ['signe: >'] : []),
		...block.labels.map((label) => `- ${label}`),
		'```'
	].join('\n');
}

/**
 * Remplace chaque bloc ranger de premier niveau par `replace(bloc)` ; le reste du
 * texte est rendu à l'octet près.
 */
export function replaceRangerBlocks(
	markdown: string,
	replace: (block: RangerBlock) => string
): string {
	const lines = markdown.split('\n');
	const ranges = findRangerBlocks(lines);
	if (ranges.length === 0) return markdown;
	const out: string[] = [];
	let next = 0;
	for (const range of ranges) {
		out.push(...lines.slice(next, range.startIndex));
		const body = lines.slice(
			range.startIndex + 1,
			range.closed ? range.endIndex : range.endIndex + 1
		);
		out.push(replace({ ...parseRangerBody(body), range }));
		next = range.endIndex + 1;
	}
	out.push(...lines.slice(next));
	return out.join('\n');
}
