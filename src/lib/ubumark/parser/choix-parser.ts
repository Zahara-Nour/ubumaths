/**
 * Bloc ```choix — la case « choix » (chantier figure-et-choix § 2.1)
 * ==================================================================
 *
 * Une case comme les autres (`blanks[i]`), écrite dans l'énoncé :
 *
 * ```choix
 * plusieurs: oui
 * melanger: non
 * - Oui, ils sont alignés.
 * - Non, ils ne sont pas alignés.
 * ```
 *
 * Réglages en tête, avant la liste : `plusieurs: oui|non` (défaut : une réponse),
 * `melanger: oui|non` (défaut : mélangé). Un choix par ligne `- …` ; sa suite est
 * en retrait de 2 espaces. Un choix qui contient un bloc : clôture ```` du bloc
 * choix. Chaque choix est de l'ubumark (formules, variables résolues au tirage).
 *
 * `case: N` est posée par le générateur de questions, jamais écrite. Dans
 * l'énoncé d'une instance, le bloc liste ses choix dans l'ordre AFFICHÉ (mélange
 * fait, `melanger:` retiré) : il peut être montré tel quel, il ne trahit rien.
 *
 * @module ubumark/parser/choix-parser
 */

import type { ChoiceNode } from '../types/choix';

// Types
export interface ChoiceBlockRange {
	/** Ligne d'ouverture (```choix) */
	startIndex: number;
	/** Ligne de clôture ; bloc non fermé : dernière ligne du texte */
	endIndex: number;
	/** Clôture d'ouverture (``` ou ````…) */
	fence: string;
	closed: boolean;
}

export interface ChoiceBlockSpec {
	/** Posée par le générateur (`case: N`) */
	caseIndex?: number;
	/** `plusieurs: oui` : plusieurs bonnes réponses (cases à cocher) */
	multiple: boolean;
	/** `melanger: non` : ordre de l'auteur */
	shuffle: boolean;
	/** Choix, markdown, dans l'ordre écrit */
	choices: string[];
	/** Messages pour l'auteur, en français */
	errors: string[];
}

export interface ChoiceBlock extends ChoiceBlockSpec {
	range: ChoiceBlockRange;
}

// Constantes
/** Ouverture au premier niveau : ```choix, ````choix… */
const OPEN_REGEX = /^(`{3,})choix\s*$/;
/** La même, en retrait (liste) ou citée */
const NESTED_OPEN_REGEX = /^(?:\s+|\s*>\s*)`{3,}choix\s*$/;
const ITEM_REGEX = /^-(?:[ \t](.*))?$/;
const SETTING_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;
const CASE_INDEX_REGEX = /^\d{1,3}$/;
/** Clôture d'un bloc dans un choix (``` seule ou avec un nom) */
const INNER_FENCE_REGEX = /^(`{3,})/;
const CONTINUATION_INDENT = '  ';

export const CHOICE_BLOCK_NESTED_MESSAGE =
	'Un bloc choix doit être au premier niveau de l’énoncé (ni dans une liste, ni dans une citation)';
export const CHOICE_BLOCK_UNCLOSED_MESSAGE = 'bloc non fermé (ajouter ``` à la fin)';
const TOO_FEW_CHOICES_MESSAGE = 'au moins 2 choix (une ligne « - … » par choix)';
const SETTING_NAMES = 'plusieurs, melanger';

// Functions
export function isChoiceBlockStart(line: string): boolean {
	return OPEN_REGEX.test(line);
}

/** Ouverture d'un bloc choix en retrait ou citée (refusée : le bloc porte une case) */
export function isNestedChoiceBlockStart(line: string): boolean {
	return NESTED_OPEN_REGEX.test(line);
}

/**
 * Blocs choix de premier niveau. Clôture : une ligne de ` seuls, au moins aussi
 * longue que l'ouverture ; sans elle, le bloc va jusqu'à la fin du texte.
 */
export function findChoiceBlocks(lines: readonly string[]): ChoiceBlockRange[] {
	const ranges: ChoiceBlockRange[] = [];
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

function readYesNo(key: string, value: string, errors: string[]): boolean | undefined {
	const word = value.trim().toLowerCase();
	if (word === 'oui') return true;
	if (word === 'non') return false;
	errors.push(`${key}: écrire oui ou non`);
	return undefined;
}

/** Lignes d'un choix → son markdown (retrait de suite retiré, lignes vides de fin ôtées) */
function choiceContent(lines: readonly string[]): string {
	const out = [...lines];
	while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
	return out.join('\n').trim();
}

/** Lit le corps d'un bloc choix (lignes entre les clôtures) */
export function parseChoiceBody(body: readonly string[]): ChoiceBlockSpec {
	const errors: string[] = [];
	const spec: ChoiceBlockSpec = { multiple: false, shuffle: true, choices: [], errors };
	const items: string[][] = [];
	/** Clôture du bloc ouvert dans le choix en cours (ses lignes lui appartiennent) */
	let innerFence: string | null = null;

	for (const line of body) {
		const current = items[items.length - 1];
		if (current && innerFence !== null) {
			const stripped = line.startsWith(CONTINUATION_INDENT) ? line.slice(2) : line;
			current.push(stripped);
			const fence = stripped.trim().match(INNER_FENCE_REGEX);
			if (fence && fence[1].length >= innerFence.length && stripped.trim() === fence[1]) {
				innerFence = null;
			}
			continue;
		}
		const item = line.match(ITEM_REGEX);
		if (item) {
			items.push([item[1] ?? '']);
			innerFence = (item[1] ?? '').trim().match(INNER_FENCE_REGEX)?.[1] ?? null;
			continue;
		}
		if (line.trim() === '') {
			current?.push('');
			continue;
		}
		if (current && line.startsWith(CONTINUATION_INDENT)) {
			const stripped = line.slice(2);
			current.push(stripped);
			innerFence = stripped.trim().match(INNER_FENCE_REGEX)?.[1] ?? null;
			continue;
		}
		const setting = current ? null : line.trim().match(SETTING_REGEX);
		if (setting) {
			const key = setting[1].toLowerCase();
			if (key === 'plusieurs') {
				const value = readYesNo('plusieurs', setting[2], errors);
				if (value !== undefined) spec.multiple = value;
			} else if (key === 'melanger' || key === 'mélanger') {
				const value = readYesNo('melanger', setting[2], errors);
				if (value !== undefined) spec.shuffle = value;
			} else if (key === 'case' && CASE_INDEX_REGEX.test(setting[2].trim())) {
				spec.caseIndex = Number(setting[2].trim());
			} else {
				errors.push(`réglage « ${setting[1]} » inconnu (${SETTING_NAMES})`);
			}
			continue;
		}
		errors.push(
			`ligne « ${line.trim()} » : un choix commence par « - » (sa suite : en retrait de 2 espaces)`
		);
	}

	spec.choices = items.map(choiceContent);
	spec.choices.forEach((choice, index) => {
		if (choice === '') errors.push(`le choix ${index + 1} est vide`);
	});
	if (spec.choices.length < 2) errors.unshift(TOO_FEW_CHOICES_MESSAGE);
	return spec;
}

/** Plus longue suite de ` en tête de ligne d'un texte */
function longestFence(text: string): number {
	let longest = 0;
	for (const match of text.matchAll(/^\s*(`{3,})/gm)) {
		longest = Math.max(longest, match[1].length);
	}
	return longest;
}

/**
 * Écrit le bloc d'une instance : `case: N`, `plusieurs: oui` s'il y a lieu, les
 * choix dans l'ordre donné (suite en retrait de 2 espaces). Clôture plus longue
 * que tout bloc contenu dans un choix.
 */
export function serializeChoiceBlock(block: {
	caseIndex: number;
	multiple: boolean;
	choices: readonly string[];
}): string {
	const fence = '`'.repeat(Math.max(3, ...block.choices.map((c) => longestFence(c) + 1)));
	const items = block.choices.map((choice) => {
		const [first, ...rest] = choice.split('\n');
		return [
			`- ${first}`,
			...rest.map((line) => (line === '' ? '' : `${CONTINUATION_INDENT}${line}`))
		].join('\n');
	});
	return [
		`${fence}choix`,
		`case: ${block.caseIndex}`,
		...(block.multiple ? ['plusieurs: oui'] : []),
		...items,
		fence
	].join('\n');
}

/**
 * Remplace chaque bloc choix de premier niveau par `replace(bloc)` ; le reste du
 * texte est rendu à l'octet près.
 */
export function replaceChoiceBlocks(
	markdown: string,
	replace: (block: ChoiceBlock) => string
): string {
	const lines = markdown.split('\n');
	const ranges = findChoiceBlocks(lines);
	if (ranges.length === 0) return markdown;
	const out: string[] = [];
	let next = 0;
	for (const range of ranges) {
		out.push(...lines.slice(next, range.startIndex));
		const body = lines.slice(
			range.startIndex + 1,
			range.closed ? range.endIndex : range.endIndex + 1
		);
		out.push(replace({ ...parseChoiceBody(body), range }));
		next = range.endIndex + 1;
	}
	out.push(...lines.slice(next));
	return out.join('\n');
}

/**
 * Nœud du bloc choix qui s'ouvre à `startIndex` (parseur markdown). `end` n'est
 * pas lu : la clôture (``` ou ````) est retrouvée ici.
 */
export function parseChoiceBlock(
	lines: string[],
	startIndex: number,
	_end: number
): { node: ChoiceNode } {
	const range = findChoiceBlocks(lines.slice(startIndex))[0];
	const endIndex = range ? startIndex + range.endIndex : lines.length - 1;
	const closed = range?.closed ?? false;
	const body = lines.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
	const spec = parseChoiceBody(body);
	return {
		node: {
			type: 'choice',
			...(spec.caseIndex !== undefined && { caseIndex: spec.caseIndex }),
			multiple: spec.multiple,
			choices: spec.choices,
			errors: closed ? spec.errors : [...spec.errors, CHOICE_BLOCK_UNCLOSED_MESSAGE]
		}
	};
}
