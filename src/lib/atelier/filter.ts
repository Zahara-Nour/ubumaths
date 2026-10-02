/**
 * Atelier — `.filtrer`, un sous-ensemble d'individus répondant à un critère
 *
 * Outils statistiques v2, lot 2, PR (c) (Q90, 2026-10-02 ; 2de `2-174` : à
 * partir de listes représentant des caractères d'individus, déterminer un
 * sous-ensemble répondant à un critère — filtre, ET, OU, NON). Chaque liste
 * donne une entrée par individu.
 *
 * - `.filtrer L = fille et M = oui` : combien d'individus vérifient le critère ;
 * - `.filtrer N si L = fille et M = oui` : la liste des valeurs de N pour eux.
 *
 * Le critère : `=`, `≠` (`!=`), et sur des nombres `<`, `>`, `≤` (`<=`),
 * `≥` (`>=`) ; `et`, `ou`, `non`, parenthèses. Le ET passe avant le OU.
 *
 * @module atelier/filter
 */

import type { Atelier } from './atelier.svelte';
import { isList, isQualitative, type ListObject } from './types';
import { nextName } from './names';
import { individualEntries, readListValue } from './parse';
import { holeMessage } from './cross';
import { formatStatNumber } from '$lib/statistics/format';

// =============================================================================
// Types
// =============================================================================

export type FilterResult =
	| { readonly ok: true; readonly text: string }
	| { readonly ok: false; readonly message: string };

type Operator = '=' | '≠' | '<' | '>' | '≤' | '≥';

/** Un critère analysé */
type Criterion =
	| {
			readonly kind: 'compare';
			readonly list: string;
			readonly op: Operator;
			readonly value: string;
	  }
	| { readonly kind: 'not'; readonly operand: Criterion }
	| { readonly kind: 'and' | 'or'; readonly left: Criterion; readonly right: Criterion };

type Token =
	| { readonly kind: 'open' | 'close' }
	| { readonly kind: 'op'; readonly op: Operator }
	| { readonly kind: 'word'; readonly text: string };

/** Une erreur de lecture du critère : le message d'usage, sans plus de détail */
class Unreadable extends Error {}

// =============================================================================
// Constantes
// =============================================================================

const USAGE =
	'Écris la commande ainsi : .filtrer L = fille et M = oui, ou .filtrer N si L = fille.';

/** Les écritures d'un opérateur, la plus longue d'abord (`<=` avant `<`) */
const OPERATORS: readonly [string, Operator][] = [
	['!=', '≠'],
	['<=', '≤'],
	['>=', '≥'],
	['≠', '≠'],
	['≤', '≤'],
	['≥', '≥'],
	['=', '='],
	['<', '<'],
	['>', '>']
];

const KEYWORDS = new Set(['et', 'ou', 'non']);

// =============================================================================
// Lecture du critère
// =============================================================================

/** Découper : parenthèses, opérateurs, et mots (séparés par les espaces) */
function tokenize(text: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	while (i < text.length) {
		const c = text[i];
		if (/\s/.test(c)) {
			i++;
			continue;
		}
		if (c === '(' || c === ')') {
			tokens.push({ kind: c === '(' ? 'open' : 'close' });
			i++;
			continue;
		}
		const operator = OPERATORS.find(([written]) => text.startsWith(written, i));
		if (operator !== undefined) {
			tokens.push({ kind: 'op', op: operator[1] });
			i += operator[0].length;
			continue;
		}
		let j = i;
		while (
			j < text.length &&
			!/\s/.test(text[j]) &&
			text[j] !== '(' &&
			text[j] !== ')' &&
			!OPERATORS.some(([written]) => text.startsWith(written, j))
		) {
			j++;
		}
		tokens.push({ kind: 'word', text: text.slice(i, j) });
		i = j;
	}
	return tokens;
}

/** Analyse descendante : ou → et → non → comparaison | ( critère ) */
function parseCriterion(tokens: readonly Token[]): Criterion {
	let position = 0;
	const peek = () => tokens[position];
	const isKeyword = (word: string) => {
		const token = peek();
		return token?.kind === 'word' && token.text.toLowerCase() === word;
	};

	const or = (): Criterion => {
		let left = and();
		while (isKeyword('ou')) {
			position++;
			left = { kind: 'or', left, right: and() };
		}
		return left;
	};
	const and = (): Criterion => {
		let left = not();
		while (isKeyword('et')) {
			position++;
			left = { kind: 'and', left, right: not() };
		}
		return left;
	};
	const not = (): Criterion => {
		if (isKeyword('non')) {
			position++;
			return { kind: 'not', operand: not() };
		}
		return primary();
	};
	const primary = (): Criterion => {
		const token = peek();
		if (token?.kind === 'open') {
			position++;
			const inner = or();
			if (peek()?.kind !== 'close') throw new Unreadable();
			position++;
			return inner;
		}
		if (token?.kind !== 'word' || KEYWORDS.has(token.text.toLowerCase())) throw new Unreadable();
		position++;
		const op = peek();
		if (op?.kind !== 'op') throw new Unreadable();
		position++;
		// La valeur : les mots jusqu'au prochain `et` / `ou` / `)` — une
		// modalité peut contenir des espaces (`pas du tout`)
		const words: string[] = [];
		while (peek()?.kind === 'word' && !isKeyword('et') && !isKeyword('ou')) {
			words.push((peek() as { text: string }).text);
			position++;
		}
		if (words.length === 0) throw new Unreadable();
		return { kind: 'compare', list: token.text, op: op.op, value: words.join(' ') };
	};

	const criterion = or();
	if (position !== tokens.length) throw new Unreadable();
	return criterion;
}

/** Les listes que cite un critère, dans l'ordre */
function listsOf(criterion: Criterion): string[] {
	switch (criterion.kind) {
		case 'compare':
			return [criterion.list];
		case 'not':
			return listsOf(criterion.operand);
		default:
			return [...listsOf(criterion.left), ...listsOf(criterion.right)];
	}
}

/** Le critère réécrit proprement, pour la ligne de l'historique */
function written(criterion: Criterion, nested = false): string {
	switch (criterion.kind) {
		case 'compare':
			return `${criterion.list} ${criterion.op} ${criterion.value}`;
		case 'not': {
			const operand = criterion.operand;
			return operand.kind === 'compare' ? `non ${written(operand)}` : `non (${written(operand)})`;
		}
		default: {
			// Le mot de l'élève, pas le nom interne (`and` s'affichait, test)
			const word = criterion.kind === 'and' ? 'et' : 'ou';
			const text = `${written(criterion.left, true)} ${word} ${written(criterion.right, true)}`;
			return nested && criterion.kind === 'or' ? `(${text})` : text;
		}
	}
}

// =============================================================================
// Évaluation
// =============================================================================

function listNamed(atelier: Atelier, name: string): ListObject | null {
	const object = atelier.get(name);
	return object !== undefined && isList(object) ? object : null;
}

/** Le nombre d'entrées d'une liste : modalités ou nombres */
function sizeOf(list: ListObject): number {
	return isQualitative(list) ? list.categories.length : list.values.length;
}

/** Même clé que les modalités (Q85) : sans la casse ni les espaces autour */
function key(text: string): string {
	return text.trim().toLocaleLowerCase('fr');
}

/** Vérifier les comparaisons avant d'évaluer : un message en français, ou rien */
function checkComparisons(
	criterion: Criterion,
	lists: ReadonlyMap<string, ListObject>
): string | null {
	switch (criterion.kind) {
		case 'compare': {
			const list = lists.get(criterion.list)!;
			if (isQualitative(list)) {
				if (criterion.op !== '=' && criterion.op !== '≠') {
					return `${list.name} contient des mots : ${criterion.op} compare des nombres.`;
				}
				return null;
			}
			return readListValue(criterion.value) === null
				? `« ${criterion.value} » n’est pas un nombre : ${list.name} contient des nombres.`
				: null;
		}
		case 'not':
			return checkComparisons(criterion.operand, lists);
		default:
			return checkComparisons(criterion.left, lists) ?? checkComparisons(criterion.right, lists);
	}
}

function holds(criterion: Criterion, lists: ReadonlyMap<string, ListObject>, i: number): boolean {
	switch (criterion.kind) {
		case 'not':
			return !holds(criterion.operand, lists, i);
		case 'and':
			return holds(criterion.left, lists, i) && holds(criterion.right, lists, i);
		case 'or':
			return holds(criterion.left, lists, i) || holds(criterion.right, lists, i);
		case 'compare': {
			const list = lists.get(criterion.list)!;
			if (isQualitative(list)) {
				const same = key(list.categories[i]) === key(criterion.value);
				return criterion.op === '=' ? same : !same;
			}
			const a = list.values[i];
			const b = readListValue(criterion.value)!;
			switch (criterion.op) {
				case '=':
					return a === b;
				case '≠':
					return a !== b;
				case '<':
					return a < b;
				case '>':
					return a > b;
				case '≤':
					return a <= b;
				case '≥':
					return a >= b;
			}
		}
	}
}

/** Les modalités cherchées qui n'apparaissent pas dans leur liste : un indice (« filles ») */
function absentValues(criterion: Criterion, lists: ReadonlyMap<string, ListObject>): string[] {
	switch (criterion.kind) {
		case 'compare': {
			const list = lists.get(criterion.list)!;
			if (!isQualitative(list)) return [];
			const present = list.categories.some((c) => key(c) === key(criterion.value));
			return present ? [] : [`« ${criterion.value} » n’apparaît pas dans ${list.name}`];
		}
		case 'not':
			return absentValues(criterion.operand, lists);
		default:
			return [...absentValues(criterion.left, lists), ...absentValues(criterion.right, lists)];
	}
}

/** `.filtrer <critère>` ou `.filtrer N si <critère>` */
export function filterCommand(atelier: Atelier, argument: string): FilterResult {
	const text = argument.trim();
	// `N si …` : la liste à filtrer, puis le critère
	const target = /^(\S+)\s+si\s+(.+)$/i.exec(text);
	const targetName = target?.[1];
	const criterionText = target?.[2] ?? text;

	let criterion: Criterion;
	try {
		criterion = parseCriterion(tokenize(criterionText));
	} catch (error) {
		if (error instanceof Unreadable) return { ok: false, message: USAGE };
		throw error;
	}

	// Les listes citées (et la cible) : existantes, valides, de même longueur
	const names = [...new Set([...(targetName ? [targetName] : []), ...listsOf(criterion)])];
	const lists = new Map<string, ListObject>();
	for (const name of names) {
		const list = listNamed(atelier, name);
		if (list === null)
			return { ok: false, message: `« ${name} » n’est pas une liste de l’atelier.` };
		if (list.status !== 'ok') {
			return {
				ok: false,
				message: list.message ?? `« ${name} » ne peut pas être filtrée pour le moment.`
			};
		}
		// Un trou décalerait les individus suivants en silence (revue)
		const read = individualEntries(list.definition, isQualitative(list));
		if ('hole' in read) return { ok: false, message: holeMessage(name, read.hole) };
		lists.set(name, list);
	}
	const [first, ...others] = [...lists.values()];
	const size = sizeOf(first);
	const mismatch = others.find((list) => sizeOf(list) !== size);
	if (mismatch !== undefined) {
		return {
			ok: false,
			message: `${first.name} a ${size} entrées et ${mismatch.name} ${sizeOf(mismatch)} : il faut une entrée par individu.`
		};
	}
	const problem = checkComparisons(criterion, lists);
	if (problem !== null) return { ok: false, message: problem };

	const kept = Array.from({ length: size }, (_, i) => i).filter((i) => holds(criterion, lists, i));
	const shown = written(criterion);
	const count = kept.length;
	const verbs = count > 1 ? 'individus sur' : 'individu sur';
	const verify = count > 1 ? 'vérifient' : 'vérifie';

	if (targetName === undefined) {
		const percent = formatStatNumber(Number(((100 * count) / Math.max(1, size)).toFixed(1)), 'fr');
		const hints = count === 0 ? absentValues(criterion, lists) : [];
		const hint = hints.length > 0 ? ` — ${hints.join(' ; ')}` : '';
		return { ok: true, text: `${count} ${verbs} ${size} ${verify} ${shown} (${percent} %)${hint}` };
	}

	if (count === 0) {
		return { ok: true, text: `0 individu sur ${size} vérifie ${shown} : aucune liste créée` };
	}
	const source = lists.get(targetName)!;
	// Les entrées TELLES QUE TAPÉES (`1/3` reste `1/3`, revue) ; sans trou, une par individu
	const typed = individualEntries(source.definition, isQualitative(source));
	const entries = 'entries' in typed ? kept.map((i) => typed.entries[i]) : [];
	const name = nextName('list', atelier.names);
	const created = atelier.create({ kind: 'list', name, definition: entries.join(' ; ') });
	if (!created.ok) return { ok: false, message: created.message };
	return {
		ok: true,
		text: `Liste ${name} créée : les valeurs de ${targetName} pour ${count > 1 ? `les ${count} individus` : 'le seul individu'} qui ${verify} ${shown}`
	};
}
