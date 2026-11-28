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
 * Un élément peut contenir un bloc ```courbe (lot 2) : sa suite est en retrait de
 * 2 espaces (comme ```choix), le lien `-> étiquette` sur sa dernière ligne, et le
 * bloc associer se ferme par ```` :
 *
 * ````associer
 * - ```courbe
 *   f(x) = 2x + 1
 *   ```
 *   -> $x \mapsto 2x + 1$
 * - -> $x \mapsto x^2$
 * ````
 *
 * Seulement à gauche, seulement ```courbe, sans geste (`placer:`, `tracer:`), et au
 * plus 6 éléments dès qu'un élément contient un bloc.
 *
 * `geste: relier` (défaut : l'élève trace un trait d'un point à l'autre) ou
 * `geste: étiquettes` (il pose une étiquette sur la place de chaque élément), en tête.
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Dans
 * l'énoncé d'une instance, le bloc n'a plus de lien : `- élément ->` pour chaque
 * élément, puis `- -> étiquette` dans l'ordre AFFICHÉ (mélangé) ; il peut être
 * montré tel quel, il ne trahit rien.
 *
 * @module ubumark/parser/associer-parser
 */

import { unnestedLine } from './nested-line';
import type { AssocierGesture, AssocierNode, AssocierSpec } from '../types/associer';
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
	/** Clôture d'ouverture (``` ou ````…) */
	fence: string;
	closed: boolean;
}

export interface AssocierBlock extends AssocierSpec {
	range: AssocierBlockRange;
}

// Constantes
const OPEN_REGEX = /^(`{3,})associer\s*$/;
const ITEM_REGEX = /^-(?:[ \t](.*))?$/;
const SETTING_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;
const TEXT_BLANK = '[_]';
/** Ouverture ou clôture d'un bloc dans un élément (``` seule ou avec un nom) */
const INNER_FENCE_REGEX = /^(`{3,})(\S*)\s*$/;
const CONTINUATION_INDENT = '  ';
/** Réglage d'une courbe à geste : elle porterait une case */
const COURBE_GESTURE_REGEX = /^\s*(placer|tracer)\s*:/i;
/** Langage du seul bloc admis dans un élément */
const ITEM_BLOCK_LANGUAGE = 'courbe';

export const ASSOCIER_BLOCK_UNCLOSED_MESSAGE = 'bloc non fermé (ajouter ``` à la fin)';
export const ASSOCIER_FENCE_MESSAGE =
	'un élément contient un bloc : ouvrir par ````associer et fermer par ```` (quatre accents graves)';
/** Au plus, dès qu'un élément contient un bloc (8 courbes : page trop haute) */
export const ASSOCIER_MAX_BLOCK_ITEMS = 6;

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

/** `relier` ou `étiquettes` (accents et casse ignorés) ; `null` : inconnu */
function readGesture(value: string): AssocierGesture | null {
	const word = value
		.trim()
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
	if (word === 'relier') return 'relier';
	if (word === 'etiquettes' || word === 'etiquette') return 'etiquettes';
	return null;
}

/** L'élément de rang `index` n'a pas d'étiquette (bloc du prof) */
export function missingLabelMessage(index: number, item: string): string {
	return `l’élément ${index + 1} (« ${item} ») n’a pas d’étiquette : écrire « -> étiquette »`;
}

export function isAssocierBlockStart(line: string): boolean {
	return OPEN_REGEX.test(line);
}

/** L'élément contient-il un bloc (une ligne qui commence par ```) ? */
export function associerItemHasBlock(item: string): boolean {
	return /^`{3,}/m.test(item);
}

/** Un élément dans un message : sa première ligne, ou son rang s'il commence par un bloc */
function itemName(index: number, item: string): string {
	if (!item.includes('\n')) return `« ${item} »`;
	const first = item.split('\n')[0];
	return INNER_FENCE_REGEX.test(first) ? `n° ${index + 1}` : `« ${first} »`;
}

/**
 * Blocs associer de premier niveau. Clôture : une ligne de ` seuls, au moins aussi
 * longue que l'ouverture ; sans elle, le bloc va jusqu'à la fin du texte.
 */
export function findAssocierBlocks(lines: readonly string[]): AssocierBlockRange[] {
	const ranges: AssocierBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		const open = lines[i].match(OPEN_REGEX);
		if (!open) {
			i++;
			continue;
		}
		const fence = open[1];
		const close = new RegExp(`^\`{${fence.length},}\\s*$`);
		let j = i + 1;
		while (j < lines.length && !close.test(lines[j])) j++;
		const closed = j < lines.length;
		ranges.push({ startIndex: i, endIndex: closed ? j : lines.length - 1, fence, closed });
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
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	/** Clôture d'ouverture (``` ou ````) */
	fence: string;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	const bodyOf = (source: readonly string[], range: AssocierBlockRange) =>
		source.slice(range.startIndex + 1, range.closed ? range.endIndex : range.endIndex + 1);
	// Au premier niveau : lignes intactes (le retrait d'une suite d'élément compte, et
	// la clôture en retrait d'une courbe ne ferme pas le bloc associer)
	const top = findAssocierBlocks(lines).map((range) => ({
		startIndex: range.startIndex,
		endIndex: range.endIndex,
		fence: range.fence,
		body: bodyOf(lines, range),
		closed: range.closed,
		nested: false
	}));
	const inTop = (index: number) =>
		top.some((block) => index >= block.startIndex && index <= block.endIndex);
	// En retrait ou cité : repéré sur les lignes désimbriquées, refusé par le générateur
	const nested = findAssocierBlocks(plain)
		.filter((range) => lines[range.startIndex] !== plain[range.startIndex])
		.filter((range) => !inTop(range.startIndex))
		.map((range) => ({
			startIndex: range.startIndex,
			endIndex: range.endIndex,
			fence: range.fence,
			body: bodyOf(plain, range),
			closed: range.closed,
			nested: true
		}));
	return [...top, ...nested].sort((a, b) => a.startIndex - b.startIndex);
}

/** L'énoncé a-t-il des éléments à associer ? */
export function hasAssocierToPlace(markdown: string): boolean {
	return findAssociersToPlace(markdown).length > 0;
}

/** Une ligne `- …` du bloc et sa suite (retrait de 2 espaces retiré) */
interface Entry {
	line: string;
	content: string;
	continuation: string[];
}

/**
 * Lignes d'une suite d'élément → contenu, lien et erreurs. Le lien est la dernière
 * ligne non vide hors d'un bloc qui commence par `->` ; `link` vaut `null` sans lui.
 */
function readContinuation(
	first: string,
	continuation: readonly string[]
): { content: string; link: string | null; errors: string[] } {
	const errors: string[] = [];
	const content: string[] = [];
	let link: string | null = null;
	let inner: { fence: string; language: string } | null = null;
	for (const line of first === '' ? continuation : [first, ...continuation]) {
		const trimmed = line.trim();
		const fence = trimmed.match(INNER_FENCE_REGEX);
		if (inner) {
			content.push(line);
			if (fence && fence[2] === '' && fence[1].length >= inner.fence.length) inner = null;
			else if (inner.language === ITEM_BLOCK_LANGUAGE && COURBE_GESTURE_REGEX.test(line)) {
				errors.push(
					'une courbe dans un élément : pas de placer: ni de tracer: (pas de case dedans)'
				);
			}
			continue;
		}
		if (link !== null) {
			if (trimmed !== '') {
				errors.push('« -> étiquette » va sur la dernière ligne de l’élément');
				link = null;
			}
			continue;
		}
		if (trimmed.startsWith('->')) {
			link = trimmed.slice(2).trim();
			continue;
		}
		if (fence && fence[2] !== '') {
			inner = { fence: fence[1], language: fence[2] };
			if (fence[2] !== ITEM_BLOCK_LANGUAGE) {
				errors.push(
					`seul un bloc \`\`\`${ITEM_BLOCK_LANGUAGE} peut aller dans un élément (pas \`\`\`${fence[2]})`
				);
			}
		}
		content.push(line);
	}
	if (inner) errors.push('bloc non fermé dans un élément (ajouter ``` en retrait)');
	while (content.length > 0 && content[content.length - 1].trim() === '') content.pop();
	return { content: content.join('\n').trim(), link, errors };
}

/** Lit le corps d'un bloc associer (lignes entre les clôtures) */
export function parseAssocierBody(body: readonly string[]): AssocierSpec {
	const errors: string[] = [];
	const spec: AssocierSpec = { gesture: 'relier', items: [], labels: [], answers: [], errors };
	const entries: Entry[] = [];
	/** Clôture du bloc ouvert dans l'élément en cours (ses lignes lui appartiennent) */
	let innerFence: string | null = null;

	const labelIndex = (label: string): number => {
		const known = spec.labels.indexOf(label);
		if (known !== -1) return known;
		spec.labels.push(label);
		return spec.labels.length - 1;
	};

	// 1. Découpage : réglages, lignes `- …` et leur suite en retrait
	for (const line of body) {
		const current = entries[entries.length - 1];
		const trimmed = line.trim();
		if (current && innerFence !== null) {
			const stripped = line.startsWith(CONTINUATION_INDENT) ? line.slice(2) : line;
			current.continuation.push(stripped);
			const fence = stripped.trim().match(INNER_FENCE_REGEX);
			if (fence && fence[2] === '' && fence[1].length >= innerFence.length) innerFence = null;
			continue;
		}
		if (trimmed === '') {
			current?.continuation.push('');
			continue;
		}
		const item = trimmed.match(ITEM_REGEX);
		const indented = line.startsWith(CONTINUATION_INDENT);
		if (current && indented && !item) {
			const stripped = line.slice(2);
			current.continuation.push(stripped);
			// Ouverture d'un bloc (```courbe) : ses lignes, même `- …`, sont à l'élément
			const fence = stripped.trim().match(INNER_FENCE_REGEX);
			innerFence = fence && fence[2] !== '' ? fence[1] : null;
			continue;
		}
		if (item) {
			const content = (item[1] ?? '').trim();
			entries.push({ line: trimmed, content, continuation: [] });
			const fence = content.match(INNER_FENCE_REGEX);
			innerFence = fence && fence[2] !== '' ? fence[1] : null;
			continue;
		}
		const setting = entries.length > 0 ? null : trimmed.match(SETTING_REGEX);
		if (setting) {
			const key = setting[1].toLowerCase();
			if (key === 'case' && CASE_INDEX_REGEX.test(setting[2].trim())) {
				spec.caseIndex = Number(setting[2].trim());
			} else if (key === 'geste') {
				const gesture = readGesture(setting[2]);
				if (gesture) spec.gesture = gesture;
				else errors.push('geste: écrire relier (des traits) ou étiquettes (à poser)');
			} else {
				errors.push(`réglage « ${setting[1]} » inconnu`);
			}
			continue;
		}
		errors.push(`ligne « ${trimmed} » : une ligne commence par « - »`);
	}

	// 2. Lecture de chaque élément
	/** Éléments déjà signalés sans étiquette (pas de second message) */
	const reported = new Set<number>();
	for (const { line, content, continuation } of entries) {
		const hasContinuation = continuation.some((text) => text.trim() !== '');
		if (!hasContinuation) {
			const link = splitLink(content);
			if (!link) {
				errors.push(`ligne « ${line} » : écrire « - élément -> étiquette »`);
				continue;
			}
			const [left, right] = link;
			if (left === '' && right === '') {
				errors.push(`ligne « ${line} » : ni élément ni étiquette`);
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
		// Une suite en retrait n'a de sens que pour un bloc (texte sur plusieurs lignes,
		// réglage en retrait : refusés)
		const lines = [content, ...continuation];
		if (!lines.some((text) => INNER_FENCE_REGEX.test(text.trim()))) {
			errors.push(
				`ligne « ${line} » : seul un bloc \`\`\`${ITEM_BLOCK_LANGUAGE} peut suivre un élément, en retrait (un élément de texte tient sur une ligne)`
			);
			continue;
		}
		// Élément sur plusieurs lignes (un bloc dedans) : jamais à droite
		if (content.startsWith('->') || splitLink(content) !== null) {
			errors.push(
				`ligne « ${line} » : pas de bloc dans une étiquette ni dans un intrus (les blocs vont à gauche)`
			);
			continue;
		}
		const read = readContinuation(content, continuation);
		errors.push(...read.errors);
		if (read.content === '') {
			errors.push(`ligne « ${line} » : élément vide`);
			continue;
		}
		spec.items.push(read.content);
		const index = spec.items.length - 1;
		if (read.link === null) {
			errors.push(missingLabelMessage(index, read.content));
			reported.add(index);
			spec.answers.push(null);
		} else {
			spec.answers.push(read.link === '' ? null : labelIndex(read.link));
		}
	}

	// Des liens écrits, d'autres oubliés : bloc du prof incomplet
	if (spec.answers.some((answer) => answer !== null)) {
		spec.answers.forEach((answer, index) => {
			if (answer === null && !reported.has(index)) {
				errors.push(missingLabelMessage(index, spec.items[index]));
			}
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
				`les éléments ${first + 1} et ${index + 1} sont identiques (${itemName(index, text)}) : on ne saurait pas lequel va où`
			);
		}
	});
	if (spec.items.some(associerItemHasBlock) && spec.items.length > ASSOCIER_MAX_BLOCK_ITEMS) {
		errors.unshift(
			`au plus ${ASSOCIER_MAX_BLOCK_ITEMS} éléments quand un élément contient un bloc`
		);
	}
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
	// Même convention que ```choix : un bloc dans un élément exige ````
	if (range && range.fence.length === 3 && node.items.some(associerItemHasBlock)) {
		node.errors.push(ASSOCIER_FENCE_MESSAGE);
	}
	return { node };
}

/**
 * Écrit le bloc d'une instance : `case: N`, chaque élément sans son lien, puis les
 * étiquettes dans l'ordre donné (l'ordre AFFICHÉ)
 */
export function serializeAssocierBlock(block: {
	caseIndex: number;
	gesture: AssocierGesture;
	items: readonly string[];
	labels: readonly string[];
}): string {
	// Élément sur plusieurs lignes (un bloc dedans) : suite en retrait, lien vide en
	// dernière ligne, clôture ````
	const multiline = block.items.some((item) => item.includes('\n'));
	const fence = multiline ? '````' : '```';
	const writeItem = (item: string): string[] => {
		if (!item.includes('\n')) return [`- ${item} ->`];
		const [first, ...rest] = item.split('\n');
		return [`- ${first}`, ...rest.map((line) => (line === '' ? '' : `  ${line}`)), '  ->'];
	};
	return [
		`${fence}associer`,
		`case: ${block.caseIndex}`,
		...(block.gesture === 'etiquettes' ? ['geste: étiquettes'] : []),
		...block.items.flatMap(writeItem),
		...block.labels.map((label) => `- -> ${label}`),
		fence
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
