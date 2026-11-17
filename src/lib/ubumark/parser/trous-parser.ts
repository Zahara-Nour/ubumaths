/**
 * Bloc ```trous — texte à trous à étiquettes (outils-manquants n° 34)
 * ===================================================================
 *
 * Le prof écrit son texte ; chaque trou est sa bonne étiquette entre crochets, à
 * sa place, HORS d'une formule (`$[0 ; 1]$` n'est pas un trou) ; une étiquette
 * formule s'écrit `[$r$]`. En dernière ligne, `intrus:` ajoute des étiquettes sans
 * trou, séparées par `;` (hors formule) :
 *
 * ```trous
 * Une suite définie par $u_{n+1} = u_n + r$ est [arithmétique], de raison [$r$].
 * Une suite définie par $u_{n+1} = q \times u_n$ est [géométrique], de raison [$q$].
 * intrus: croissante ; $u_0$
 * ```
 *
 * Le texte est de l'ubumark en ligne (gras, formules, variables résolues au tirage),
 * une ligne non vide par ligne affichée (les lignes vides sont ignorées). Deux trous
 * peuvent avoir la même étiquette : elle n'est montrée qu'une fois, et l'élève peut
 * la poser plusieurs fois. De 1 à 10 trous ; de 3 à 12 étiquettes différentes.
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Dans l'énoncé
 * d'une instance, les trous sont vides (`[]`) et la réserve est écrite dans l'ordre
 * AFFICHÉ (mélangé) en dernière ligne, `étiquettes: a ; b ; c` ; il peut être montré
 * tel quel, il ne trahit rien. Écrit ainsi par le prof (cours), le bloc se lit sans
 * réponse : un geste libre.
 *
 * @module ubumark/parser/trous-parser
 */

import { unnestedLine } from './nested-line';
import type { TrousNode, TrousSegment, TrousSpec } from '../types/trous';
import {
	TROUS_MAX_HOLES,
	TROUS_MAX_LABELS,
	TROUS_MIN_HOLES,
	TROUS_MIN_LABELS
} from '../utils/trous';

// Types
export interface TrousBlockRange {
	/** Ligne d'ouverture (```trous) */
	startIndex: number;
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	closed: boolean;
}

export interface TrousBlock extends TrousSpec {
	range: TrousBlockRange;
}

// Constantes
const OPEN_REGEX = /^```trous\s*$/;
const CLOSE_REGEX = /^```\s*$/;
const CASE_REGEX = /^case\s*:\s*(\d{1,3})\s*$/i;
/** `intrus:` (bloc du prof) ou `étiquettes:` (instance), accents et casse ignorés */
const LIST_SETTING_REGEX = /^(intrus|[ée]tiquettes?)\s*:\s*(.*)$/i;
/** Un bloc ouvert dans le texte (``` seul ou avec un nom) */
const INNER_FENCE_REGEX = /^`{3,}/;

export const TROUS_BLOCK_UNCLOSED_MESSAGE = 'bloc non fermé (ajouter ``` à la fin)';

// Functions

/** Coupe une liste `a ; b` au `;` HORS d'une formule ; morceaux vides retirés */
function splitList(value: string): string[] {
	const parts: string[] = [];
	let inMath = false;
	let start = 0;
	for (let i = 0; i < value.length; i++) {
		const char = value[i];
		if (char === '\\') {
			i++;
			continue;
		}
		if (char === '$') inMath = !inMath;
		else if (!inMath && char === ';') {
			parts.push(value.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(value.slice(start));
	return parts.map((part) => part.trim()).filter((part) => part !== '');
}

/** `;` hors d'une formule ? (il séparerait la liste de la réserve) */
function hasBareSemicolon(text: string): boolean {
	return splitList(text).length > 1;
}

/** `?` dans une formule (une case de l'énoncé) ? */
function hasMathBlank(text: string): boolean {
	let inMath = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (char === '\\') {
			i++;
			continue;
		}
		if (char === '$') inMath = !inMath;
		else if (inMath && char === '?') return true;
	}
	return false;
}

/**
 * Coupe une ligne du texte aux trous `[…]` HORS des formules. Rend les morceaux
 * (le rang d'un trou est posé par l'appelant), le texte de chaque trou, et
 * `unclosed` pour un `[` sans `]`.
 */
function splitHoles(line: string): {
	parts: ({ kind: 'text'; text: string } | { kind: 'hole'; label: string })[];
	unclosed: boolean;
	/** `[texte](adresse)` : un lien markdown, pas un trou */
	link?: boolean;
	/** Un trou entre deux `*` (gras, italique) laissés ouverts avant lui */
	inEmphasis?: boolean;
} {
	const parts: ({ kind: 'text'; text: string } | { kind: 'hole'; label: string })[] = [];
	let inMath = false;
	let text = '';
	let i = 0;
	while (i < line.length) {
		const char = line[i];
		if (char === '\\') {
			text += line.slice(i, i + 2);
			i += 2;
			continue;
		}
		if (char === '$') {
			inMath = !inMath;
			text += char;
			i++;
			continue;
		}
		if (inMath || char !== '[') {
			text += char;
			i++;
			continue;
		}
		// Un trou : jusqu'au premier `]` hors d'une formule
		let labelMath = false;
		let j = i + 1;
		while (j < line.length) {
			if (line[j] === '\\') {
				j += 2;
				continue;
			}
			if (line[j] === '$') labelMath = !labelMath;
			else if (!labelMath && line[j] === ']') break;
			// Un second `[` avant le `]` : le premier n'est pas fermé (`]2 ; 3[` écrit en texte)
			else if (!labelMath && line[j] === '[') return { parts, unclosed: true };
			j++;
		}
		if (j >= line.length) return { parts, unclosed: true };
		if (line[j + 1] === '(') return { parts, unclosed: false, link: true };
		if (openEmphasis(line.slice(0, i))) return { parts, unclosed: false, inEmphasis: true };
		if (text !== '') parts.push({ kind: 'text', text });
		text = '';
		parts.push({ kind: 'hole', label: line.slice(i + 1, j).trim() });
		i = j + 1;
	}
	if (text !== '') parts.push({ kind: 'text', text });
	return { parts, unclosed: false };
}

/**
 * Un gras (`**`) ou un italique (`*`) ouvert et pas refermé dans ce début de ligne
 * (hors formules) ? Un trou y couperait le gras : les `*` s'afficheraient tels quels.
 */
function openEmphasis(before: string): boolean {
	let inMath = false;
	let outside = '';
	for (let i = 0; i < before.length; i++) {
		const char = before[i];
		if (char === '\\') {
			i++;
			continue;
		}
		if (char === '$') inMath = !inMath;
		else if (!inMath) outside += char;
	}
	const strong = outside.split('**').length - 1;
	const single = outside.replaceAll('**', '').split('*').length - 1;
	return strong % 2 === 1 || single % 2 === 1;
}

/**
 * Le bloc a-t-il un trou rempli (une étiquette entre crochets) ? Garde anti-fuite :
 * l'énoncé d'une instance n'a que des trous vides, quelle que soit sa réserve.
 */
export function trousHasFilledHole(body: readonly string[]): boolean {
	return body.some((line) => {
		const trimmed = line.trim();
		if (CASE_REGEX.test(trimmed) || LIST_SETTING_REGEX.test(trimmed)) return false;
		const { parts, unclosed, link } = splitHoles(trimmed);
		// Illisible : signalé, par prudence
		if (unclosed || link) return true;
		return parts.some((part) => part.kind === 'hole' && part.label !== '');
	});
}

export function isTrousBlockStart(line: string): boolean {
	return OPEN_REGEX.test(line);
}

/**
 * Blocs trous de premier niveau. Clôture : ``` seule ; sans elle, le bloc va
 * jusqu'à la fin du texte.
 */
export function findTrousBlocks(lines: readonly string[]): TrousBlockRange[] {
	const ranges: TrousBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (!OPEN_REGEX.test(lines[i])) {
			i++;
			continue;
		}
		let j = i + 1;
		while (j < lines.length && !CLOSE_REGEX.test(lines[j])) j++;
		const closed = j < lines.length;
		const endIndex = closed ? j : lines.length - 1;
		ranges.push({ startIndex: i, endIndex, closed });
		i = endIndex + 1;
	}
	return ranges;
}

/**
 * Les blocs trous d'un énoncé (tous portent des cases) : corps sans clôtures,
 * fermeture, et `nested` pour un bloc en retrait ou cité (l'élève ne pourrait pas
 * y répondre : ses cases ne sont pas créées)
 */
export function findTrousToPlace(markdown: string): {
	startIndex: number;
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	return findTrousBlocks(plain).map((range) => ({
		startIndex: range.startIndex,
		endIndex: range.endIndex,
		body: plain.slice(range.startIndex + 1, range.closed ? range.endIndex : range.endIndex + 1),
		closed: range.closed,
		nested: lines[range.startIndex] !== plain[range.startIndex]
	}));
}

/** L'énoncé a-t-il un texte à trous ? */
export function hasTrousToPlace(markdown: string): boolean {
	return findTrousToPlace(markdown).length > 0;
}

/** Le trou de rang `index` n'a pas d'étiquette (bloc du prof) */
export function emptyHoleMessage(index: number): string {
	return `le trou ${index + 1} est vide : écrire sa bonne étiquette entre les crochets, [étiquette]`;
}

/** Lit le corps d'un bloc trous (lignes entre les clôtures) */
export function parseTrousBody(body: readonly string[]): TrousSpec {
	const errors: string[] = [];
	const spec: TrousSpec = { lines: [], labels: [], answers: [], errors };
	/** Texte de chaque trou, dans l'ordre (`''` : trou vide) */
	const holeLabels: string[] = [];
	let intrus: string[] | null = null;
	let shown: string[] | null = null;
	let hasInnerBlock = false;
	let hasTextBlank = false;

	const content = body.map((line) => line.trim());
	let last = content.length - 1;
	while (last >= 0 && content[last] === '') last--;

	content.forEach((line, index) => {
		if (line === '') return;
		const caseLine = line.match(CASE_REGEX);
		if (caseLine) {
			spec.caseIndex = Number(caseLine[1]);
			return;
		}
		const setting = line.match(LIST_SETTING_REGEX);
		if (setting) {
			const isIntrus = setting[1].toLowerCase() === 'intrus';
			if (index !== last) {
				errors.push(
					isIntrus
						? 'intrus: va sur la dernière ligne du bloc'
						: 'étiquettes: va sur la dernière ligne du bloc'
				);
				return;
			}
			const list = splitList(setting[2]);
			if (isIntrus) intrus = list;
			else shown = list;
			return;
		}
		if (INNER_FENCE_REGEX.test(line)) {
			hasInnerBlock = true;
			return;
		}
		const { parts, unclosed, link, inEmphasis } = splitHoles(line);
		if (link) {
			errors.push(`ligne « ${line} » : pas de lien dans un bloc trous ([texte](adresse))`);
			return;
		}
		if (inEmphasis) {
			errors.push(
				`ligne « ${line} » : un trou ne peut pas être dans du gras ou de l’italique (fermer « ** » ou « * » avant le trou)`
			);
			return;
		}
		if (unclosed) {
			errors.push(
				`ligne « ${line} » : crochet « [ » sans « ] » (un intervalle s’écrit en formule : $]2 ; 3[$)`
			);
			return;
		}
		const segments: TrousSegment[] = parts.map((part) => {
			if (part.kind === 'text') return part;
			holeLabels.push(part.label);
			return { kind: 'hole', hole: holeLabels.length - 1 };
		});
		if (parts.some((part) => part.kind === 'text' && part.text.includes('[_]'))) {
			hasTextBlank = true;
		}
		spec.lines.push(segments);
	});

	if (hasInnerBlock)
		errors.push('pas de bloc dans le texte (le bloc trous ne contient que du texte)');

	const labelIndex = (label: string): number => {
		const known = spec.labels.indexOf(label);
		if (known !== -1) return known;
		spec.labels.push(label);
		return spec.labels.length - 1;
	};

	if (shown !== null) {
		// Forme d'instance (ou geste libre d'un cours) : trous vides, réserve écrite
		const list: string[] = shown;
		if (intrus !== null) errors.push('étiquettes: et intrus: ne vont pas ensemble');
		if (holeLabels.some((label) => label !== '')) {
			errors.push('avec étiquettes:, les trous restent vides [] (sinon : intrus:)');
		}
		for (const label of list) labelIndex(label);
		spec.answers = holeLabels.map(() => null);
	} else {
		holeLabels.forEach((label, index) => {
			if (label === '') {
				errors.push(emptyHoleMessage(index));
				spec.answers.push(null);
				return;
			}
			if (label === '_') {
				hasTextBlank = true;
				spec.answers.push(null);
				return;
			}
			spec.answers.push(labelIndex(label));
		});
		for (const label of intrus ?? []) {
			if (spec.labels.includes(label) && holeLabels.includes(label)) {
				errors.push(`l’intrus « ${label} » est déjà l’étiquette d’un trou : le retirer de intrus:`);
				continue;
			}
			labelIndex(label);
		}
	}

	if (hasTextBlank || [...spec.labels, ...textOf(spec)].some(hasMathBlank)) {
		errors.push(
			'pas de case [_] ni de « ? » en formule dans un bloc trous (chaque trou est déjà une case)'
		);
	}
	for (const label of spec.labels) {
		if (hasBareSemicolon(label)) {
			errors.push(
				`« ${label} » : pas de « ; » hors formule dans une étiquette (il sépare les intrus ; un intervalle s’écrit en formule : $[${label}]$)`
			);
		}
	}

	if (holeLabels.length < TROUS_MIN_HOLES) {
		errors.unshift(
			'aucun trou : écrire chaque trou avec sa bonne étiquette entre crochets, [arithmétique]'
		);
	}
	if (holeLabels.length > TROUS_MAX_HOLES) errors.unshift(`au plus ${TROUS_MAX_HOLES} trous`);
	if (spec.labels.length < TROUS_MIN_LABELS) {
		errors.unshift(
			`au moins ${TROUS_MIN_LABELS} étiquettes différentes (sinon la réponse se devine ; ajouter un intrus en dernière ligne : « intrus: … »)`
		);
	}
	if (spec.labels.length > TROUS_MAX_LABELS) {
		errors.unshift(`au plus ${TROUS_MAX_LABELS} étiquettes différentes`);
	}
	return spec;
}

/** Les morceaux de texte du bloc (hors trous) */
function textOf(spec: Pick<TrousSpec, 'lines'>): string[] {
	return spec.lines.flatMap((line) =>
		line.flatMap((segment) => (segment.kind === 'text' ? [segment.text] : []))
	);
}

/** Nœud d'un bloc trous depuis son texte entre les clôtures */
export function parseTrousContent(source: string): TrousNode {
	return { type: 'trous', ...parseTrousBody(source.split('\n')), source };
}

/**
 * Nœud du bloc trous qui s'ouvre à `startIndex` (parseur markdown). `end` n'est
 * pas lu : la clôture est retrouvée ici.
 */
export function parseTrousBlock(
	lines: string[],
	startIndex: number,
	_end: number
): { node: TrousNode } {
	const range = findTrousBlocks(lines.slice(startIndex))[0];
	const endIndex = range ? startIndex + range.endIndex : lines.length - 1;
	const closed = range?.closed ?? false;
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const node = parseTrousContent(body.join('\n'));
	if (!closed) node.errors.push(TROUS_BLOCK_UNCLOSED_MESSAGE);
	return { node };
}

/** Une ligne du texte réécrite, chaque trou par `hole(rang)` */
export function writeTrousLine(
	line: readonly TrousSegment[],
	hole: (index: number) => string
): string {
	return line
		.map((segment) => (segment.kind === 'text' ? segment.text : hole(segment.hole)))
		.join('');
}

/**
 * Écrit le bloc d'une instance : `case: N`, le texte aux trous vides, puis la
 * réserve dans l'ordre donné (l'ordre AFFICHÉ)
 */
export function serializeTrousBlock(block: {
	caseIndex: number;
	lines: readonly (readonly TrousSegment[])[];
	labels: readonly string[];
}): string {
	return [
		'```trous',
		`case: ${block.caseIndex}`,
		...block.lines.map((line) => writeTrousLine(line, () => '[]')),
		`étiquettes: ${block.labels.join(' ; ')}`,
		'```'
	].join('\n');
}

/**
 * Remplace chaque bloc trous de premier niveau par `replace(bloc)` ; le reste du
 * texte est rendu à l'octet près.
 */
export function replaceTrousBlocks(
	markdown: string,
	replace: (block: TrousBlock) => string
): string {
	const lines = markdown.split('\n');
	const ranges = findTrousBlocks(lines);
	if (ranges.length === 0) return markdown;
	const out: string[] = [];
	let next = 0;
	for (const range of ranges) {
		out.push(...lines.slice(next, range.startIndex));
		const body = lines.slice(
			range.startIndex + 1,
			range.closed ? range.endIndex : range.endIndex + 1
		);
		out.push(replace({ ...parseTrousBody(body), range }));
		next = range.endIndex + 1;
	}
	out.push(...lines.slice(next));
	return out.join('\n');
}
