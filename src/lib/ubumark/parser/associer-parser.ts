/**
 * Bloc ```associer — associer deux colonnes (outils-manquants n° 27)
 * =================================================================
 *
 * Le prof écrit chaque élément de gauche avec sa bonne étiquette de droite, une
 * ligne par élément ; une ligne sans élément ajoute un intrus :
 *
 * ```associer
 * - $u_{n+1} = u_n + 3$ -> arithmétique
 * - $u_{n+1} = 2u_n$ -> géométrique
 * - $u_n = 5 + 2n$ -> arithmétique
 * - -> ni l'une ni l'autre
 * ```
 *
 * Deux éléments peuvent partager leur étiquette : elle n'est montrée qu'une fois,
 * et l'élève peut la poser plusieurs fois. Éléments et étiquettes sont de
 * l'ubumark sur une ligne (formules, variables résolues au tirage) ; l'élève est
 * jugé sur l'étiquette posée, jamais sur sa valeur. De 2 à 8 éléments, deux à deux
 * différents ; de 3 à 10 étiquettes différentes.
 *
 * Sans aucun lien (`- élément ->` partout), le bloc se lit sans réponse : l'énoncé
 * d'une instance, ou un geste libre dans un cours (une question l'exige complet).
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Dans
 * l'énoncé d'une instance, le bloc n'a plus de lien : `- élément ->` pour chaque
 * élément, puis `- -> étiquette` dans l'ordre AFFICHÉ (mélangé) ; il peut être
 * montré tel quel, il ne trahit rien.
 *
 * @module ubumark/parser/associer-parser
 */

import { unnestedLine } from './nested-line';
import type { AssocierNode, AssocierSpec } from '../types/associer';
import {
	ASSOCIER_MAX_ITEMS,
	ASSOCIER_MAX_LABELS,
	ASSOCIER_MIN_ITEMS,
	ASSOCIER_MIN_LABELS
} from '../utils/associer';

// Types
export interface AssocierBlockRange {
	/** Ligne d'ouverture (```associer) */
	startIndex: number;
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	closed: boolean;
}

export interface AssocierBlock extends AssocierSpec {
	range: AssocierBlockRange;
}

// Constantes
const OPEN_REGEX = /^```associer\s*$/;
const CLOSE_REGEX = /^```\s*$/;
const ITEM_REGEX = /^-(?:[ \t](.*))?$/;
const SETTING_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;
const TEXT_BLANK = '[_]';

export const ASSOCIER_BLOCK_UNCLOSED_MESSAGE = 'bloc non fermé (ajouter ``` à la fin)';

// Functions
/**
 * Coupe `élément -> étiquette` au premier `->` HORS d'une formule `$…$` (`$u_n -> 0$`
 * reste entier) ; `null` : pas de lien
 */
function splitLink(content: string): [string, string] | null {
	let inMath = false;
	for (let i = 0; i < content.length; i++) {
		const char = content[i];
		if (char === '\\') {
			i++;
			continue;
		}
		if (char === '$') inMath = !inMath;
		else if (!inMath && char === '-' && content[i + 1] === '>') {
			return [content.slice(0, i).trim(), content.slice(i + 2).trim()];
		}
	}
	return null;
}

/** L'élément de rang `index` n'a pas d'étiquette (bloc du prof) */
export function missingLabelMessage(index: number, item: string): string {
	return `l’élément ${index + 1} (« ${item} ») n’a pas d’étiquette : écrire « -> étiquette »`;
}

export function isAssocierBlockStart(line: string): boolean {
	return OPEN_REGEX.test(line);
}

/** Blocs associer de premier niveau ; sans clôture, le bloc va jusqu'à la fin du texte */
export function findAssocierBlocks(lines: readonly string[]): AssocierBlockRange[] {
	const ranges: AssocierBlockRange[] = [];
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

/**
 * Les blocs associer d'un énoncé (tous portent des cases) : corps sans clôtures,
 * fermeture, et `nested` pour un bloc en retrait ou cité (l'élève ne pourrait pas
 * y répondre : ses cases ne sont pas créées)
 */
export function findAssociersToPlace(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	return findAssocierBlocks(plain).map((range) => ({
		startIndex: range.startIndex,
		body: plain.slice(range.startIndex + 1, range.closed ? range.endIndex : range.endIndex + 1),
		closed: range.closed,
		nested: lines[range.startIndex] !== plain[range.startIndex]
	}));
}

/** L'énoncé a-t-il des éléments à associer ? */
export function hasAssocierToPlace(markdown: string): boolean {
	return findAssociersToPlace(markdown).length > 0;
}

/** Lit le corps d'un bloc associer (lignes entre les clôtures) */
export function parseAssocierBody(body: readonly string[]): AssocierSpec {
	const errors: string[] = [];
	const spec: AssocierSpec = { items: [], labels: [], answers: [], errors };
	let started = false;

	const labelIndex = (label: string): number => {
		const known = spec.labels.indexOf(label);
		if (known !== -1) return known;
		spec.labels.push(label);
		return spec.labels.length - 1;
	};

	for (const line of body) {
		const trimmed = line.trim();
		if (trimmed === '') continue;
		const item = trimmed.match(ITEM_REGEX);
		if (item) {
			started = true;
			const content = (item[1] ?? '').trim();
			const link = splitLink(content);
			if (!link) {
				errors.push(`ligne « ${trimmed} » : écrire « - élément -> étiquette »`);
				continue;
			}
			const [left, right] = link;
			if (left === '' && right === '') {
				errors.push(`ligne « ${trimmed} » : ni élément ni étiquette`);
				continue;
			}
			if (left === '') {
				labelIndex(right);
				continue;
			}
			spec.items.push(left);
			// Lien retiré (`- élément ->`) : énoncé d'une instance, ou bloc sans réponse
			spec.answers.push(right === '' ? null : labelIndex(right));
			continue;
		}
		const setting = started ? null : trimmed.match(SETTING_REGEX);
		if (setting) {
			const key = setting[1].toLowerCase();
			if (key === 'case' && CASE_INDEX_REGEX.test(setting[2].trim())) {
				spec.caseIndex = Number(setting[2].trim());
			} else {
				errors.push(`réglage « ${setting[1]} » inconnu`);
			}
			continue;
		}
		errors.push(`ligne « ${trimmed} » : une ligne commence par « - »`);
	}

	// Des liens écrits, d'autres oubliés : bloc du prof incomplet
	if (spec.answers.some((answer) => answer !== null)) {
		spec.answers.forEach((answer, index) => {
			if (answer === null) errors.push(missingLabelMessage(index, spec.items[index]));
		});
	}
	for (const text of [...spec.items, ...spec.labels]) {
		if (text.includes(TEXT_BLANK)) {
			errors.push(`« ${text} » : pas de case [_] dans un élément ni dans une étiquette`);
		}
	}
	spec.items.forEach((text, index) => {
		const first = spec.items.indexOf(text);
		if (first < index) {
			errors.push(
				`les éléments ${first + 1} et ${index + 1} sont identiques (« ${text} ») : on ne saurait pas lequel va où`
			);
		}
	});
	if (spec.items.length < ASSOCIER_MIN_ITEMS) {
		errors.unshift(
			`au moins ${ASSOCIER_MIN_ITEMS} éléments (une ligne « - élément -> étiquette » par élément)`
		);
	}
	if (spec.items.length > ASSOCIER_MAX_ITEMS) {
		errors.unshift(`au plus ${ASSOCIER_MAX_ITEMS} éléments`);
	}
	if (spec.labels.length < ASSOCIER_MIN_LABELS) {
		errors.unshift(
			`au moins ${ASSOCIER_MIN_LABELS} étiquettes différentes (sinon la réponse se devine ; ajouter un intrus : « - -> … »)`
		);
	}
	if (spec.labels.length > ASSOCIER_MAX_LABELS) {
		errors.unshift(`au plus ${ASSOCIER_MAX_LABELS} étiquettes différentes`);
	}
	return spec;
}

/** Nœud d'un bloc associer depuis son texte entre les clôtures */
export function parseAssocierContent(source: string): AssocierNode {
	return { type: 'associer', ...parseAssocierBody(source.split('\n')), source };
}

/**
 * Nœud du bloc associer qui s'ouvre à `startIndex` (parseur markdown). `end` n'est
 * pas lu : la clôture est retrouvée ici.
 */
export function parseAssocierBlock(
	lines: string[],
	startIndex: number,
	_end: number
): { node: AssocierNode } {
	const range = findAssocierBlocks(lines.slice(startIndex))[0];
	const endIndex = range ? startIndex + range.endIndex : lines.length - 1;
	const closed = range?.closed ?? false;
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseAssocierContent(body.join('\n'));
	if (!closed) node.errors.push(ASSOCIER_BLOCK_UNCLOSED_MESSAGE);
	return { node };
}

/**
 * Écrit le bloc d'une instance : `case: N`, chaque élément sans son lien, puis les
 * étiquettes dans l'ordre donné (l'ordre AFFICHÉ)
 */
export function serializeAssocierBlock(block: {
	caseIndex: number;
	items: readonly string[];
	labels: readonly string[];
}): string {
	return [
		'```associer',
		`case: ${block.caseIndex}`,
		...block.items.map((item) => `- ${item} ->`),
		...block.labels.map((label) => `- -> ${label}`),
		'```'
	].join('\n');
}

/**
 * Remplace chaque bloc associer de premier niveau par `replace(bloc)` ; le reste
 * du texte est rendu à l'octet près.
 */
export function replaceAssocierBlocks(
	markdown: string,
	replace: (block: AssocierBlock) => string
): string {
	const lines = markdown.split('\n');
	const ranges = findAssocierBlocks(lines);
	if (ranges.length === 0) return markdown;
	const out: string[] = [];
	let next = 0;
	for (const range of ranges) {
		out.push(...lines.slice(next, range.startIndex));
		const body = lines.slice(
			range.startIndex + 1,
			range.closed ? range.endIndex : range.endIndex + 1
		);
		out.push(replace({ ...parseAssocierBody(body), range }));
		next = range.endIndex + 1;
	}
	out.push(...lines.slice(next));
	return out.join('\n');
}
