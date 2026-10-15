/**
 * Atelier — les formules de la grille (tableur intégré, lot 2)
 *
 * Une cellule qui commence par `=` est calculée par le MOTEUR DE L'ATELIER
 * (option C) : valeur exacte, objets de l'atelier (`f`, curseurs), mêmes refus
 * que Calcul. Phase 0 : `docs/wip/atelier-tableur-lot2-phase0.md`.
 *
 * Lecture : chaque référence (`A2`, `$B$3`) devient une variable marquée
 * `(ω_k)` avant la lecture — un nom d'objet n'est jamais une lettre grecque, et
 * les parenthèses gardent la marque entière sous un exposant (`2^A1`) — puis la
 * valeur de la cellule remplace la marque dans l'arbre. Le texte des valeurs ne
 * repasse jamais par le parseur.
 *
 * Recalcul CIBLÉ (phase 0 §3) : seules les formules dont le texte, une cellule
 * citée ou un objet cité a changé sont recalculées, puis celles qui en dépendent.
 *
 * @module atelier/formula
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject } from './types';
import type { MathNode } from '$lib/mathAST/types';
import { astOf } from './parse';
import {
	cellName,
	columnLetter,
	columnOfLetter,
	GRID_COLUMNS,
	GRID_ROWS,
	readCellName
} from './grid';
import type { AtelierState } from './persistence';
import { gridContext, termsOf, type GridContext } from './engine';
import { evaluate } from '$lib/mathAST/eval/evaluate';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { transformAST } from '$lib/mathAST/visitor';
import { toCustom } from '$lib/mathAST/custom-generator';
import { tidyTerms } from './tidy-terms';
import { decimalCommaLatex, decimalCommaText } from './decimal-comma';
import { toLatex } from '$lib/mathAST/latex-generator';
import { readListValue } from '$lib/statistics/read-value';
import { intervalDomainOf, outsideIntervalMessage } from './interval';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { displayName } from './names';
import {
	cellsOf,
	columnRangeOf,
	computeCalculation,
	computeFunction,
	CALCULATION_ARITY,
	isStatistic,
	type CalculationFunction,
	mapCallArguments,
	findCalls,
	GRID_FUNCTIONS,
	normalizeGridFunctions,
	RANGE_ALONE_MESSAGE,
	RANGE_IN_TEXT,
	RANGE_MIXED_MESSAGE,
	readRange,
	type ArgumentValue,
	type GridFunction
} from './grid-functions';
import { findUnknownFunctionCall, SHOWN_FUNCTIONS } from '$lib/mathAST/parser/custom/tokenizer';

// =============================================================================
// Types
// =============================================================================

/** Ce que vaut une cellule : rien, un nombre, un mot, ou une erreur (avec sa phrase). */
export type CellValue =
	| { readonly kind: 'empty'; readonly message?: string }
	| {
			readonly kind: 'number';
			/** La valeur approchée, pour les listes et les tris. */
			readonly value: number;
			/** L'arbre du résultat : exact, ou un nombre décimal après le repli. */
			readonly node: MathNode;
			readonly exact: boolean;
			/**
			 * Ce que montre la case en texte (Q2) : `13/3`, `-0,25`, ou `≈ 4,3333` ;
			 * une écriture avec des lettres y est approchée — `latex` la montre exacte.
			 */
			readonly shown: string;
			/** L'écriture mathématique exacte de la CASE (Q2 : courte), sinon `null`. */
			readonly latex?: string | null;
			/** L'écriture exacte complète, pour « Valeur exacte » sous la barre, sinon `null`. */
			readonly exactLatex?: string | null;
			/**
			 * Le texte de la case EST l'écriture exacte (`1/3`, `0,25`) : pas de
			 * « Valeur exacte » en double. Faux pour `≈ 1,4142` et pour `0,25` lu de `1/4`.
			 */
			readonly shownExact?: boolean;
	  }
	| { readonly kind: 'word'; readonly text: string }
	| {
			readonly kind: 'error';
			/** Le mot court de la case (Q-L2-1) ; la phrase s'affiche sous la barre. */
			readonly label: 'erreur' | 'cycle';
			readonly message: string;
	  };

/** Ce qu'un recalcul laisse au suivant : valeurs, textes et objets vus, pour ne refaire que le nécessaire. */
export interface GridState {
	readonly values: ReadonlyMap<string, CellValue>;
	readonly texts: ReadonlyMap<string, string>;
	readonly objects: ReadonlyMap<string, string>;
	/** Le nombre de formules évaluées par ce recalcul (0 : rien ne les concernait). */
	readonly computed: number;
}

/**
 * Une formule lue : son arbre (références marquées `ω_k`, appels de fonctions du
 * tableur marqués `ψ_k`), ses cellules et ses noms cités.
 */
type ReadFormula =
	| {
			readonly ok: true;
			readonly ast: MathNode;
			readonly refs: readonly string[];
			readonly names: readonly string[];
			/** Les fonctions du tableur, dans l'ordre de leurs marques `ψ_k` (lot 4). */
			readonly calls: readonly ReadCall[];
			/** Toutes les cases dont la formule dépend : citées, et celles des plages. */
			readonly deps: readonly string[];
			/** Les noms passés seuls en argument (`MOYENNE(L)`) : une liste y vaut sa colonne. */
			readonly lists: readonly string[];
	  }
	| { readonly ok: false; readonly message: string };

/** Un appel `SOMME(…)` lu : ses arguments, plages ou expressions. */
interface ReadCall {
	readonly name: GridFunction;
	readonly args: readonly ReadArgument[];
	/** Ce que l'élève a passé (`A1:A5`), pour un refus situé. */
	readonly label: string;
}

type ReadArgument =
	| { readonly kind: 'range'; readonly cells: readonly string[] }
	| {
			readonly kind: 'expression';
			readonly read: ReadFormula & { ok: true };
			/** Un nom seul (`L`) : si c'est une liste, l'argument vaut sa colonne (Q-L4-3). */
			readonly name: string | null;
	  };

// =============================================================================
// Constantes
// =============================================================================

/**
 * Une référence de cellule : une lettre, des chiffres, un `$` facultatif devant
 * chacun ; jamais collée à une autre lettre (`sqrt2`, `ln2`) ni à `_` (`A_2`).
 */
const REFERENCE = /(?<![A-Za-z_\\$])(\$?)([A-Za-z])(\$?)([1-9]\d*)(?![A-Za-z_\d(])/g;

/** Deux lettres ou plus suivies de chiffres, en capitales : une colonne qui n'existe pas (`AB2`). */
const WIDE_REFERENCE = /(?<![A-Za-z_\\])\$?([A-Z]{2,})\$?(\d+)(?![A-Za-z_\d(])/;

/** `1e5`, `2,5e-3` : la notation scientifique, en minuscule collée à un chiffre. */
const SCIENTIFIC = /(\d(?:[.,]\d+)?)e([+-]?\d+)/g;

/** La marque d'une référence dans l'arbre lu : `ω_k`. */
const MARK = 'ω';

/** La marque d'un appel de fonction du tableur dans l'arbre lu : `ψ_k` (lot 4). */
const CALL_MARK = 'ψ';

/** Une case seule en argument : `A2`, `$B$3`. */
const LONE_CELL = /^\s*(\$?[A-Za-z]\$?[1-9]\d*)\s*$/;

/** Un nom seul en argument : `L`, `M_2` — jamais une case (`A2`). */
const LONE_NAME = /^\s*([A-Za-z](?:_\d+)?)\s*$/;

/** Au-delà, une cellule exacte rend ses dépendantes approchées (repli après coup, ~20 ms). */
const EXACT_BUDGET_MS = 20;

/**
 * Une valeur exacte plus longue que cela entre en DÉCIMAL dans les formules qui
 * la citent : sinon une colonne d'intérêts composés (`=A1*1,01` recopiée) fait
 * grossir les fractions, et une racine de la dernière gelait l'onglet (revue,
 * 1 s pour 10 lignes). Le repli après coup ne protège pas la cellule elle-même.
 */
const MAX_EXACT_CITED = 24;

/** Au-delà de ce nombre de caractères, l'écriture exacte cède la place à `≈` (Q2). */
const MAX_SHOWN_EXACT = 12;

/** « Valeur exacte » sous la barre : au-delà de cette longueur de LaTeX, elle n'est pas montrée. */
const MAX_EXACT_LATEX = 400;

const UNREADABLE = 'Je n’ai pas su lire cette formule.';

/** Ce que devient une référence poussée hors de la grille par une recopie (phase 0 §5). */
const OUTSIDE = '#HORS';
const NOT_REAL = 'Le résultat n’est pas un nombre réel.';
const INFINITE = 'Le résultat est infini.';

// =============================================================================
// Lecture
// =============================================================================

export function isFormula(text: string): boolean {
	return text.trimStart().startsWith('=');
}

/** Une vraie référence, et pas l'exposant d'une notation scientifique (`1e5`). */
function isReference(letter: string, offset: number, text: string): boolean {
	return !(letter === 'e' && /\d/.test(text[offset - 1] ?? ''));
}

/** `=a2+1` → `=A2+1` : une référence s'écrit en capitales (comme dans LibreOffice). */
export function normalizeFormula(text: string): string {
	if (!isFormula(text)) return text;
	const trimmed = text.trim();
	// Puis les fonctions du tableur et les colonnes entières (`somme(a:a)` → `SOMME(A:A)`, Q-L4-7)
	return normalizeGridFunctions(
		trimmed.replace(
			REFERENCE,
			(match, colAbs: string, letter: string, rowAbs: string, row: string, offset: number) =>
				isReference(letter, offset, trimmed)
					? `${colAbs}${letter.toUpperCase()}${rowAbs}${row}`
					: match
		)
	);
}

const readCache = new Map<string, ReadFormula>();

function readFormula(text: string, functionNames: readonly string[]): ReadFormula {
	const key = `${functionNames.join(',')}|${text}`;
	const cached = readCache.get(key);
	if (cached !== undefined) return cached;
	const read = readUncached(text, functionNames);
	if (readCache.size > 5000) readCache.clear();
	readCache.set(key, read);
	return read;
}

function readUncached(text: string, functionNames: readonly string[]): ReadFormula {
	return readBody(text.trim().slice(1), functionNames);
}

/**
 * Lire le corps d'une formule (sans `=`) — et, de la même façon, chaque
 * argument d'une fonction du tableur.
 */
function readBody(body: string, functionNames: readonly string[]): ReadFormula {
	if (body.includes(OUTSIDE)) {
		return { ok: false, message: 'Référence hors de la grille (après une recopie).' };
	}
	if (body.trim() === '' || body.includes(MARK) || body.includes(CALL_MARK)) {
		return { ok: false, message: UNREADABLE };
	}
	const wide = WIDE_REFERENCE.exec(body);
	if (wide !== null) return { ok: false, message: outsideGrid(`${wide[1]}${wide[2]}`) };

	// Les fonctions du tableur d'abord (lot 4, Q-L4-1) : chaque appel devient `(ψ_k)`
	const found = findCalls(body);
	if (found === null) return { ok: false, message: UNREADABLE };
	const calls: ReadCall[] = [];
	const deps = new Set<string>();
	const lists = new Set<string>();
	const argumentNames = new Set<string>();
	let rest = body;
	for (const call of [...found].reverse()) {
		const read = readCall(call.name, call.args, functionNames);
		if (!read.ok) return read;
		read.deps.forEach((d) => deps.add(d));
		read.lists.forEach((l) => lists.add(l));
		read.names.forEach((n) => argumentNames.add(n));
		calls.unshift(read.call);
		rest = `${rest.slice(0, call.start)}(${CALL_MARK}_${found.indexOf(call) + 1})${rest.slice(call.end)}`;
	}
	const unknown = findUnknownFunctionCall(rest.replace(/\(ψ_\d+\)/g, '1'));
	if (unknown !== null && !functionNames.includes(unknown) && /[A-Z]/.test(unknown)) {
		return {
			ok: false,
			message: `${unknown} n’est pas une fonction de la grille. Fonctions du tableur : ${GRID_FUNCTIONS.join(', ')}. Fonctions de calcul : ${SHOWN_FUNCTIONS.join(', ')}.`
		};
	}
	// Une plage hors d'une fonction : `:` se lisait comme une division (`=C1:C2` → 0,6)
	if (RANGE_IN_TEXT.test(rest)) return { ok: false, message: RANGE_ALONE_MESSAGE };

	const refs: string[] = [];
	let outside: string | null = null;
	const marked = rest
		.replace(REFERENCE, (match, _colAbs, letter: string, _rowAbs, row: string, offset: number) => {
			if (!isReference(letter, offset, rest)) return match;
			const address = `${letter.toUpperCase()}${row}`;
			if (Number(row) > GRID_ROWS) outside ??= address;
			const index = refs.indexOf(address);
			if (index === -1) refs.push(address);
			return `(${MARK}_${(index === -1 ? refs.length : index + 1).toString()})`;
		})
		.replace(SCIENTIFIC, '($1*10^($2))')
		// `2^-A1` : le parseur lit `2^(-x)`, pas `2^-(x)`
		.replace(/\^\s*-\s*\((ω_\d+)\)/g, '^(-($1))');
	if (outside !== null) return { ok: false, message: outsideGrid(outside) };
	const ast = astOf(marked, 'text', functionNames);
	if (ast === null) return { ok: false, message: UNREADABLE };
	const indexed = indexedFunctionIn(ast, functionNames);
	if (indexed !== null) return { ok: false, message: indexedFunctionMessage(indexed) };
	refs.forEach((r) => deps.add(r));
	return {
		ok: true,
		ast,
		refs,
		names: [...new Set([...namesIn(ast), ...argumentNames])],
		calls,
		deps: [...deps],
		lists: [...lists]
	};
}

/** Lire un appel : chaque argument est une plage, ou une expression lue comme une formule. */
function readCall(
	name: GridFunction,
	rawArgs: readonly string[],
	functionNames: readonly string[]
):
	| {
			ok: true;
			call: ReadCall;
			deps: readonly string[];
			lists: readonly string[];
			names: readonly string[];
	  }
	| { ok: false; message: string } {
	const arity = isStatistic(name) ? null : CALCULATION_ARITY[name];
	if (arity === null && rawArgs.length === 0) {
		return {
			ok: false,
			message: `${name} attend au moins un argument, par exemple ${name}(A2:A21).`
		};
	}
	if (!isStatistic(name) && rawArgs.length !== arity) {
		return { ok: false, message: arityMessage(name) };
	}
	const args: ReadArgument[] = [];
	const deps: string[] = [];
	const lists: string[] = [];
	const names: string[] = [];
	for (const raw of rawArgs) {
		// Une case citée seule en argument se lit comme une plage d'une case :
		// vide ou mot, elle est ignorée (`=MIN(A1;A9)`, comme LibreOffice — revue)
		// …pour les statistiques seulement : `RACINE(A5)` garde T5 (vide → vide)
		const cell = arity === null ? LONE_CELL.exec(raw) : null;
		const range = cell === null ? readRange(raw) : readRange(`${cell[1]}:${cell[1]}`);
		if (range !== null && arity !== null) {
			return {
				ok: false,
				message: `${name} attend un nombre, pas une plage : ${name}(A1).`
			};
		}
		if (range !== null) {
			if (range.bottom > GRID_ROWS) {
				return { ok: false, message: outsideGrid(cellName(range.right, range.bottom)) };
			}
			const cells = cellsOf(range);
			args.push({ kind: 'range', cells });
			deps.push(...cells);
			continue;
		}
		const read = readBody(raw, functionNames);
		// Une plage qui reste après les appels emboîtés (`SOMME(A1:A3*2)`) : mêlée à un calcul
		if (!read.ok && read.message === RANGE_ALONE_MESSAGE) {
			return {
				ok: false,
				message:
					arity === null
						? RANGE_MIXED_MESSAGE
						: `${name} attend un nombre, pas une plage : ${name}(A1).`
			};
		}
		if (!read.ok) return read;
		const lone = LONE_NAME.exec(raw);
		args.push({ kind: 'expression', read, name: lone === null ? null : lone[1] });
		deps.push(...read.deps);
		lists.push(...read.lists, ...(lone === null ? [] : [lone[1]]));
		names.push(...read.names);
	}
	const label = rawArgs.map((a) => a.trim()).join(' ; ');
	return { ok: true, call: { name, args, label }, deps, lists, names };
}

/** Le refus d'une fonction de calcul qui n'a pas son nombre d'arguments. */
function arityMessage(name: CalculationFunction): string {
	if (name === 'PI') return 'PI s’écrit sans argument : PI().';
	if (name === 'ARRONDI') return 'ARRONDI attend deux arguments : ARRONDI(x ; n).';
	return `${name} attend un argument : ${name}(x).`;
}

/**
 * Une fonction à indice citée (`f_1(3)`) : le parseur la lit `f₁ × 3`, et la
 * grille calculait alors avec f, sans rien dire (revue du lot 3) — refusée
 * jusqu'à ce que la lecture sache l'appeler.
 */
function indexedFunctionIn(ast: MathNode, functionNames: readonly string[]): string | null {
	let found: string | null = null;
	transformAST(ast, {
		enterSubscript: (node) => {
			if (found !== null || node.base.type !== 'variable') return undefined;
			const index = node.subscript.type === 'number' ? node.subscript.value : null;
			const name = `${node.base.name}_${index}`;
			if (index !== null && functionNames.includes(name)) found = name;
			return undefined;
		}
	});
	return found;
}

/** Le refus d'une fonction à indice, dans la grille comme pour `.tabuler`. */
export function indexedFunctionMessage(name: string): string {
	return `La grille ne lit pas encore une fonction à indice (${name}) : définis-la sous une seule lettre, par exemple k(x) = …`;
}

/** Les noms qu'une formule cite : variables et fonctions, hors des marques de cellules. */
function namesIn(ast: MathNode): string[] {
	const names = new Set(
		[...getVariables(ast)].filter((name) => name !== MARK && name !== CALL_MARK)
	);
	transformAST(ast, {
		enterFunction: (node) => {
			names.add(node.name);
			return undefined;
		}
	});
	return [...names];
}

function outsideGrid(address: string): string {
	return `${address} n’existe pas : la grille va de A1 à Z200.`;
}

// =============================================================================
// Calcul de la grille
// =============================================================================

/**
 * Les valeurs de toutes les formules de la grille, dans l'ordre de leurs
 * dépendances. Une cellule d'un cycle le dit ; celle qui dépend d'une erreur
 * aussi ; une cellule vide citée laisse la formule vide (T5).
 *
 * @param texts - Le texte brut de chaque cellule non vide (`B3` → `=A2+1`)
 * @param previous - Le recalcul précédent : seules les formules concernées par
 *   un changement sont refaites. Absent, tout est calculé.
 */
export function computeGrid(
	texts: ReadonlyMap<string, string>,
	atelier: Atelier,
	previous?: GridState
): GridState {
	const objects = new Map(atelier.objects.map((o) => [o.name, objectMark(o)]));
	const values = new Map<string, CellValue>();
	const formulas = [...texts].filter(([, text]) => isFormula(text));
	if (formulas.length === 0) return { values, texts, objects, computed: 0 };

	const functionNames = atelier.functionNames;
	const reads = new Map(
		formulas.map(([address, text]) => [address, readFormula(text, functionNames)])
	);

	// Les dépendances : cases citées, cases des plages, et la colonne d'une liste
	// passée par son nom (`MOYENNE(L)`, Q-L4-3)
	const deps = new Map(
		[...reads].map(([address, read]) => [address, read.ok ? dependenciesOf(read, atelier) : []])
	);
	const { order, cycleNext } = orderOf(reads, deps);
	const dirty = dirtyFormulas(reads, deps, texts, objects, atelier, previous);

	let context: GridContext | null = null;
	/** Les cellules dont la valeur exacte a coûté trop cher : leurs dépendantes passent en ≈. */
	const approximate = new Set<string>();
	let computed = 0;

	for (const address of order) {
		if (cycleNext.has(address)) {
			const next = cycleNext.get(address);
			values.set(address, {
				kind: 'error',
				label: 'cycle',
				message: `Cycle : ${address} dépend d’elle-même${next ? ` (par ${next})` : ''}.`
			});
			continue;
		}
		const kept = previous?.values.get(address);
		if (!dirty.has(address) && kept !== undefined) {
			values.set(address, kept);
			continue;
		}
		context ??= gridContext(atelier);
		computed++;
		values.set(
			address,
			safely(() =>
				computeCell(address, reads.get(address)!, texts, values, approximate, atelier, context!)
			)
		);
	}
	return { values, texts, objects, computed };
}

/**
 * Une case ne fait jamais tomber la grille : une exception du moteur (garde de
 * profondeur de mathAST, par exemple) devient l'erreur de cette case seule.
 */
function safely(compute: () => CellValue): CellValue {
	try {
		return compute();
	} catch {
		return error('Je n’ai pas su calculer cette formule.');
	}
}

/** Les cases dont dépend une formule lue, colonnes des listes nommées en argument comprises. */
function dependenciesOf(read: ReadFormula & { ok: true }, atelier: Atelier): string[] {
	if (read.lists.length === 0) return [...read.deps];
	const all = new Set(read.deps);
	for (const name of read.lists) {
		const column = atelier.get(name)?.kind === 'list' ? atelier.columnOf(name) : undefined;
		if (column !== undefined) {
			for (let row = 1; row <= GRID_ROWS; row++) all.add(cellName(column, row));
		}
	}
	return [...all];
}

/** Ordre de calcul (parcours en profondeur) et cycles : pour chaque membre, le suivant du cycle. */
function orderOf(
	reads: ReadonlyMap<string, ReadFormula>,
	deps: ReadonlyMap<string, readonly string[]>
): {
	order: string[];
	cycleNext: Map<string, string | null>;
} {
	const order: string[] = [];
	const state = new Map<string, 'visiting' | 'done'>();
	const cycleNext = new Map<string, string | null>();
	const stack: string[] = [];
	const visit = (address: string): void => {
		if (state.get(address) === 'done') return;
		if (state.get(address) === 'visiting') {
			const cycle = stack.slice(stack.indexOf(address));
			cycle.forEach((member, i) => {
				const next = cycle[(i + 1) % cycle.length];
				cycleNext.set(member, next === member ? null : next);
			});
			return;
		}
		state.set(address, 'visiting');
		stack.push(address);
		for (const ref of deps.get(address) ?? []) if (reads.has(ref)) visit(ref);
		stack.pop();
		state.set(address, 'done');
		order.push(address);
	};
	for (const address of reads.keys()) visit(address);
	return { order, cycleNext };
}

/**
 * Les formules à recalculer : celles dont le texte a changé, qui citent une
 * cellule dont le texte a changé ou un objet qui a changé (ou qui dépend d'un
 * objet changé) — puis, de proche en proche, celles qui les citent.
 */
function dirtyFormulas(
	reads: ReadonlyMap<string, ReadFormula>,
	deps: ReadonlyMap<string, readonly string[]>,
	texts: ReadonlyMap<string, string>,
	objects: ReadonlyMap<string, string>,
	atelier: Atelier,
	previous: GridState | undefined
): Set<string> {
	if (previous === undefined) return new Set(reads.keys());

	// Les objets changés, puis ceux qui les citent (`g(x) = f(x)+1` suit f)
	const changedObjects = new Set<string>();
	for (const name of new Set([...objects.keys(), ...previous.objects.keys()])) {
		if (objects.get(name) !== previous.objects.get(name)) changedObjects.add(name);
	}
	const queue = [...changedObjects];
	while (queue.length > 0) {
		for (const dependent of atelier.dependents(queue.pop()!)) {
			if (!changedObjects.has(dependent)) {
				changedObjects.add(dependent);
				queue.push(dependent);
			}
		}
	}

	const dirty = new Set<string>();
	for (const [address, read] of reads) {
		const textChanged = texts.get(address) !== previous.texts.get(address);
		const cited = deps.get(address) ?? [];
		const cites =
			read.ok &&
			(cited.some((ref) => !reads.has(ref) && texts.get(ref) !== previous.texts.get(ref)) ||
				read.names.some((name) => changedObjects.has(name)));
		if (textChanged || cites) dirty.add(address);
	}
	// De proche en proche : une formule qui cite une formule recalculée
	let grew = true;
	while (grew) {
		grew = false;
		for (const [address, read] of reads) {
			if (dirty.has(address) || !read.ok) continue;
			if ((deps.get(address) ?? []).some((ref) => dirty.has(ref))) {
				dirty.add(address);
				grew = true;
			}
		}
	}
	return dirty;
}

/** Ce dont dépend une formule qui cite cet objet : sa définition, son état, ses réglages. */
function objectMark(o: AtelierObject): string {
	return JSON.stringify([
		o.kind,
		o.definition,
		o.status,
		'interval' in o ? o.interval : null,
		'inheritedInterval' in o ? o.inheritedInterval : null,
		'reciprocalOn' in o ? o.reciprocalOn : null,
		o.kind === 'sequence' ? [o.mode, o.firstIndex, o.firstTerm] : null
	]);
}

/** La valeur d'une cellule qui n'est pas une formule : rien, un nombre tapé, un mot. */
export function plainValue(text: string): CellValue {
	if (text.trim() === '') return { kind: 'empty' };
	const number = readListValue(text);
	if (number === null) return { kind: 'word', text };
	const node = astOf(text, 'text') ?? { type: 'number', value: String(number) };
	// Une valeur tapée s'écrit comme l'élève l'a tapée (`1/4` reste `1/4`) : la
	// règle du décimal (Q-L3-2) ne vaut que pour un résultat de formule
	return { kind: 'number', value: number, node, exact: true, shown: text, shownExact: true };
}

function computeCell(
	address: string,
	read: ReadFormula,
	texts: ReadonlyMap<string, string>,
	values: ReadonlyMap<string, CellValue>,
	approximate: Set<string>,
	atelier: Atelier,
	context: GridContext
): CellValue {
	if (!read.ok) return { kind: 'error', label: 'erreur', message: read.message };

	// Les cellules citées, dans l'ordre de leurs marques
	const cited: MathNode[] = [];
	let inexact = false;
	for (const ref of read.refs) {
		const value = values.get(ref) ?? plainValue(texts.get(ref) ?? '');
		switch (value.kind) {
			case 'empty':
				return { kind: 'empty', message: `${ref} est vide.` };
			case 'word':
				return error(
					`${ref} contient un mot (${value.text}) : une formule calcule avec des nombres.`
				);
			case 'error':
				return error(`Dépend de ${ref}, en erreur.`);
			case 'number': {
				// Exacte mais trop longue : elle entre en décimal (voir MAX_EXACT_CITED)
				const long = value.exact && toCustom(value.node).length > MAX_EXACT_CITED;
				if (!value.exact || long || approximate.has(ref)) inexact = true;
				cited.push(long ? decimalNode(value.value) : value.node);
			}
		}
	}

	// Les fonctions du tableur (lot 4), dans l'ordre de leurs marques `ψ_k`
	const callNodes: MathNode[] = [];
	for (const call of read.calls) {
		const result = callValue(call, address, texts, values, approximate, atelier, context);
		if (!result.ok) return result.value;
		if (result.inexact) inexact = true;
		callNodes.push(result.node);
	}

	const withCells = transformAST(read.ast, {
		enterSubscript: (node) => {
			if (node.base.type !== 'variable' || node.subscript.type !== 'number') return undefined;
			const marks =
				node.base.name === MARK ? cited : node.base.name === CALL_MARK ? callNodes : null;
			if (marks === null) return undefined;
			const value = marks[Number(node.subscript.value) - 1];
			return value === undefined
				? undefined
				: { type: 'delimiter', delimiters: 'parentheses', content: value, semantic: 'grouping' };
		}
	});

	const unit = unitRefusal(read.names, atelier);
	if (unit !== null) return error(unit);
	const called = callRefusal(withCells, atelier, context);
	if (called !== null) return error(called);

	const terms = recurrentTerms(withCells, atelier);
	if (terms.inexact) inexact = true;
	const expanded = context.expand(terms.ast);
	if (!expanded.ok) return error(expanded.message);

	const free = [...getVariables(expanded.ast)];
	if (free.length > 0) return error(freeNameMessage(free[0], atelier));

	const started = performance.now();
	const result = evaluate(expanded.ast, { mode: inexact ? 'decimal' : 'exact' });
	if (performance.now() - started > EXACT_BUDGET_MS) approximate.add(address);
	return numberValue(result, inexact);
}

/**
 * La valeur d'un appel `SOMME(…)` : les nombres de ses arguments (vides et mots
 * ignorés, Q-L4-2 ; une erreur se transmet), puis l'arbre exact de la fonction.
 */
function callValue(
	call: ReadCall,
	address: string,
	texts: ReadonlyMap<string, string>,
	values: ReadonlyMap<string, CellValue>,
	approximate: ReadonlySet<string>,
	atelier: Atelier,
	context: GridContext
): { ok: true; node: MathNode; inexact: boolean } | { ok: false; value: CellValue } {
	const numbers: ArgumentValue[] = [];
	let inexact = false;
	const statistic = isStatistic(call.name);
	const take = (value: CellValue, cell: string | null): CellValue | null => {
		// Une fonction de calcul garde T5 : `RACINE(A5)`, A5 vide → vide
		if (value.kind === 'empty' && !statistic) return value;
		if (value.kind === 'empty' || value.kind === 'word') return null;
		if (value.kind === 'error') return cell === null ? value : error(`${cell} est en erreur.`);
		const long = value.exact && toCustom(value.node).length > MAX_EXACT_CITED;
		if (!value.exact || long || (cell !== null && approximate.has(cell))) inexact = true;
		numbers.push({ node: long ? decimalNode(value.value) : value.node, value: value.value });
		return null;
	};
	const cellValueAt = (cell: string) => values.get(cell) ?? plainValue(texts.get(cell) ?? '');

	for (const arg of call.args) {
		const column =
			statistic &&
			arg.kind === 'expression' &&
			arg.name !== null &&
			atelier.get(arg.name)?.kind === 'list'
				? atelier.columnOf(arg.name)
				: undefined;
		const cells =
			arg.kind === 'range'
				? arg.cells
				: column !== undefined
					? Array.from({ length: GRID_ROWS }, (_, i) => cellName(column, i + 1))
					: null;
		if (cells !== null) {
			for (const cell of cells) {
				const refused = take(cellValueAt(cell), cell);
				if (refused !== null) return { ok: false, value: refused };
			}
			continue;
		}
		if (arg.kind !== 'expression') continue;
		const refused = take(
			computeCell(address, arg.read, texts, values, new Set(approximate), atelier, context),
			null
		);
		if (refused !== null) return { ok: false, value: refused };
	}

	const computed = isStatistic(call.name)
		? computeFunction(call.name, numbers, call.label)
		: computeCalculation(call.name, numbers);
	if (!computed.ok) return { ok: false, value: error(computed.message) };
	return { ok: true, node: computed.node, inexact: inexact || computed.inexact === true };
}

function error(message: string): CellValue {
	return { kind: 'error', label: 'erreur', message };
}

/** Le résultat du moteur, en valeur de cellule. */
function numberValue(result: ReturnType<typeof evaluate>, inexact: boolean): CellValue {
	if (result.status === 'indeterminate') return error(`Calcul impossible : forme ${result.form}.`);
	if (result.status !== 'value') {
		return error(reasonMessage(result.status === 'unevaluable' ? result.reason : ''));
	}
	const approx = evaluate(result.node, { mode: 'decimal' });
	if (approx.status !== 'value' || typeof approx.value !== 'number') {
		// Le moteur garde `sqrt(-1)`, `ln(0)` tels quels en exact ; le décimal dit pourquoi
		return error(approx.status === 'unevaluable' ? reasonMessage(approx.reason) : NOT_REAL);
	}
	const value = approx.value;
	if (Number.isNaN(value)) return error(NOT_REAL);
	if (!Number.isFinite(value)) return error(INFINITE);
	const exact = !inexact && result.exact;
	return {
		kind: 'number',
		value,
		node: exact ? result.node : decimalNode(value),
		exact,
		...shownValue(result.node, value, exact),
		...latexOf(result.node, exact)
	};
}

/** La raison du moteur (en anglais), dite à l'élève. */
function reasonMessage(reason: string): string {
	if (/zero|zéro/i.test(reason)) return 'Division par zéro.';
	if (/^(ln|log)\b.*positive/i.test(reason)) {
		return 'Le logarithme n’est défini que pour un nombre strictement positif.';
	}
	if (/complex|imaginar|non-negative|negative/i.test(reason)) return NOT_REAL;
	if (/infin/i.test(reason)) return INFINITE;
	return 'Je n’ai pas su calculer cette formule.';
}

function decimalNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

/**
 * Q2 : l'écriture exacte si elle est courte et faite de nombres (`13/3`,
 * `-0,25`), sinon `≈` et 4 décimales. Une écriture avec des lettres (`√2`, `π`)
 * attend l'écriture mathématique de la case (PR 2) : jusque-là, sa valeur
 * approchée — jamais `\pi` ni `sqrt` sous les yeux de l'élève (revue).
 */
function shownValue(
	node: MathNode,
	value: number,
	exact: boolean
): { shown: string; shownExact: boolean } {
	if (exact) {
		const custom = toCustom(tidyTerms(node));
		// Q-L3-2 (lot 3) : un décimal fini s'écrit en décimal (`-3/2` → `-1,5`) ; la
		// fraction se voit à la sélection, sous la barre
		const decimal = finiteDecimal(custom);
		if (decimal !== null && decimal.length <= MAX_SHOWN_EXACT) {
			return { shown: decimalCommaText(decimal), shownExact: false };
		}
		const written = decimalCommaText(custom);
		if (written.length <= MAX_SHOWN_EXACT && !/[A-Za-z\\]/.test(written)) {
			return { shown: written, shownExact: true };
		}
	}
	return { shown: `≈ ${decimalCommaText(String(Number(value.toFixed(4))))}`, shownExact: false };
}

/**
 * L'écriture décimale EXACTE d'une fraction d'entiers dont le dénominateur n'a
 * que des 2 et des 5 (`-3/2` → `-1.5`, `27/4` → `6.75`), sinon `null` (`1/3`).
 * En entiers longs : jamais l'arrondi d'un flottant.
 */
function finiteDecimal(written: string): string | null {
	const match = /^\(?(-?)(\d+)\)?\/(\d+)$|^-\((\d+)\/(\d+)\)$/.exec(written.replaceAll(' ', ''));
	if (match === null) return null;
	const negative = match[1] === '-' || match[4] !== undefined;
	let numerator = BigInt(match[2] ?? match[4]);
	let denominator = BigInt(match[3] ?? match[5]);
	if (denominator === 0n) return null;
	let digits = 0;
	for (const factor of [2n, 5n]) {
		while (denominator % factor === 0n) {
			denominator /= factor;
			numerator *= factor === 2n ? 5n : 2n;
			digits++;
		}
	}
	if (denominator !== 1n) return null;
	const text = numerator.toString().padStart(digits + 1, '0');
	const whole = text.slice(0, text.length - digits);
	const fraction = text.slice(text.length - digits).replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole}${fraction === '' ? '' : `.${fraction}`}`;
}

/**
 * L'écriture mathématique d'une valeur exacte, mise au propre comme dans Calcul
 * (`tidyTerms`, virgule décimale) : celle de la case si elle est courte (Q2),
 * et l'écriture complète pour « Valeur exacte » (bornée : au-delà, rien).
 */
function latexOf(
	node: MathNode,
	exact: boolean
): { latex: string | null; exactLatex: string | null } {
	if (!exact) return { latex: null, exactLatex: null };
	const tidy = tidyTerms(node);
	// `\frac` et pas `\dfrac` : une fraction développée est trop haute pour une ligne de grille
	const full = decimalCommaLatex(toLatex(tidy)).replaceAll('\\dfrac', '\\frac');
	const custom = toCustom(tidy);
	// Seulement ce qui a des lettres (`√2`, `3π`) : un nombre (`3`, `2,5`, `509/128`)
	// s'écrit en texte, comme un nombre tapé — une fraction en maths débordait de
	// la ligne, et la police changeait d'une case à l'autre (capture de la PR 3)
	const short = custom.length <= MAX_SHOWN_EXACT && /[A-Za-z\\]/.test(custom);
	return { latex: short ? full : null, exactLatex: full.length <= MAX_EXACT_LATEX ? full : null };
}

/** Les suites récurrentes : leur terme `u(5)` se lit dans leurs termes calculés (décimaux). */
function recurrentTerms(ast: MathNode, atelier: Atelier): { ast: MathNode; inexact: boolean } {
	let inexact = false;
	const replaced = transformAST(ast, {
		enterFunction: (node) => {
			const sequence = atelier.get(node.name);
			if (sequence?.kind !== 'sequence' || sequence.mode !== 'recurrence') return undefined;
			if (node.args.length !== 1) return undefined;
			const n = numberOf(node.args[0]);
			if (n === null || !Number.isInteger(n)) return undefined;
			const terms = termsOf(atelier, node.name, n);
			const term = terms.ok ? terms.terms.find((t) => t.n === n) : undefined;
			if (term === undefined) return undefined;
			inexact = true;
			return decimalNode(term.value);
		}
	});
	return { ast: replaced, inexact };
}

function numberOf(node: MathNode): number | null {
	const evaluated = evaluate(node, { mode: 'decimal' });
	return evaluated.status === 'value' && typeof evaluated.value === 'number'
		? evaluated.value
		: null;
}

/**
 * Les appels qui refusent, avec la phrase de Calcul : `f(b)` hors de
 * l'ensemble de f (les VALEURS de l'atelier remplacées d'abord : `b` = 10 ;
 * revue), `f′` nommée avec ses primes, et le rang d'une suite.
 */
function callRefusal(ast: MathNode, atelier: Atelier, context: GridContext): string | null {
	let refusal: string | null = null;
	transformAST(ast, {
		enterFunction: (node) => {
			if (refusal !== null || node.args.length !== 1) return undefined;
			const object = atelier.get(node.name);
			if (object?.kind === 'sequence') {
				const rank = numberOf(context.values(node.args[0]));
				if (rank !== null && (!Number.isInteger(rank) || rank < 0)) {
					refusal = `Le rang de ${node.name} doit être un entier positif.`;
				}
				return undefined;
			}
			const domain = intervalDomainOf(object);
			if (domain === null) return undefined;
			const value = numberOf(context.values(node.args[0]));
			if (value === null || containsValue(domain, value)) return undefined;
			const order = 'derivativeOrder' in node ? (node.derivativeOrder ?? 0) : 0;
			refusal = outsideIntervalMessage(
				displayName(node.name + "'".repeat(order)),
				decimalCommaText(toCustom(node.args[0]).replace(/^\((.*)\)$/, '$1')),
				domain
			);
			return undefined;
		}
	});
	return refusal;
}

/** Une grandeur à unité citée : les cellules n'ont pas d'unités (règle technique du tableur). */
function unitRefusal(names: readonly string[], atelier: Atelier): string | null {
	for (const name of names) {
		const object = atelier.get(name);
		if (object?.kind === 'value' && object.unit !== undefined) {
			const written = object.definition
				.replace(/\[(.+?)\]/g, ' $1')
				.replace(/\s+/g, ' ')
				.trim();
			return `${name} est une grandeur (${written}) : une cellule calcule sans unités.`;
		}
	}
	return null;
}

/** Un nom resté sans valeur après le remplacement des objets : la raison, en français. */
function freeNameMessage(name: string, atelier: Atelier): string {
	const object = atelier.get(name);
	if (object?.kind === 'list') return `${name} est une liste : cite une de ses cellules (A2).`;
	if (object?.kind === 'function' || object?.kind === 'sequence') {
		return `${name} est une ${object.kind === 'function' ? 'fonction' : 'suite'} : écris ${name}(A2).`;
	}
	if (object !== undefined) {
		return object.message ?? `« ${name} » n’a pas encore de valeur dans l’atelier.`;
	}
	return `${name} n’est pas défini dans l’atelier : crée-le dans Mes objets (${name} = 2).`;
}

/** Le texte de chaque cellule non vide de la grille, par adresse. */
export function gridTexts(
	columns: ReadonlyMap<number, readonly string[]>,
	cells: ReadonlyMap<string, string>
): Map<string, string> {
	const texts = new Map(cells);
	for (const [column, entries] of columns) {
		entries.forEach((text, i) => {
			if (text !== '') texts.set(cellName(column, i + 1), text);
		});
	}
	return texts;
}

/**
 * Les cellules qu'une formule cite SEULES (`=A1+$B$2` → A1, B2), sans la lire.
 * Les plages n'en sont pas : leurs cases vides sont ignorées (Q-L4-2), une
 * formule qui cite une plage ne devient pas vide quand ses cases se vident.
 */
export function referencesIn(text: string): string[] {
	if (!isFormula(text)) return [];
	const body = text.trim().slice(1).replace(new RegExp(RANGE_IN_TEXT.source, 'g'), ' ');
	const refs = new Set<string>();
	for (const match of body.matchAll(REFERENCE)) {
		if (isReference(match[2], match.index ?? 0, body))
			refs.add(`${match[2].toUpperCase()}${match[4]}`);
	}
	return [...refs];
}

// =============================================================================
// Recopier, coller, lien, atelier reçu (lot 2, PR 3)
// =============================================================================

/** Réécrire chaque référence d'une formule ; une valeur (sans `=`) ne change pas. */
function mapReferences(
	text: string,
	map: (column: number, row: number, colAbs: boolean, rowAbs: boolean) => string
): string {
	if (!isFormula(text)) return text;
	const trimmed = text.trim();
	return trimmed.replace(
		REFERENCE,
		(match, colAbs: string, letter: string, rowAbs: string, row: string, offset: number) =>
			isReference(letter, offset, trimmed)
				? map(letter.toUpperCase().charCodeAt(0) - 65, Number(row), colAbs === '$', rowAbs === '$')
				: match
	);
}

/** Une référence écrite, ou `#HORS` si elle sort de la grille. */
function written(column: number, row: number, colAbs: boolean, rowAbs: boolean): string {
	if (column < 0 || column >= GRID_COLUMNS || row < 1 || row > GRID_ROWS) return OUTSIDE;
	return `${colAbs ? '$' : ''}${columnLetter(column)}${rowAbs ? '$' : ''}${row}`;
}

/**
 * Une formule recopiée de `dCol` colonnes et `dRow` lignes (§5) : les références
 * relatives se décalent, `$` les fige ; une valeur se recopie telle quelle.
 */
export function shiftFormula(text: string, dCol: number, dRow: number): string {
	return mapColumnRanges(
		mapReferences(text, (column, row, colAbs, rowAbs) =>
			written(colAbs ? column : column + dCol, rowAbs ? row : row + dRow, colAbs, rowAbs)
		),
		(column, abs) => (abs ? column : column + dCol)
	);
}

/**
 * Réécrire chaque colonne entière (`A:A`, lot 4) d'une formule — seulement en
 * argument d'une fonction du tableur : ailleurs `N:P` est une division (revue).
 * Une colonne hors de la grille → `#HORS`.
 */
function mapColumnRanges(
	text: string,
	map: (column: number, abs: boolean) => number | undefined
): string {
	if (!isFormula(text)) return text;
	const body = mapCallArguments(text.trim().slice(1), (arg) => {
		const range = columnRangeOf(arg);
		if (range === null) return arg;
		const one = map(range.c1.toUpperCase().charCodeAt(0) - 65, range.d1 === '$');
		const two = map(range.c2.toUpperCase().charCodeAt(0) - 65, range.d2 === '$');
		const inGrid = (c: number | undefined): c is number =>
			c !== undefined && c >= 0 && c < GRID_COLUMNS;
		if (!inGrid(one) || !inGrid(two)) return OUTSIDE;
		return `${range.d1}${columnLetter(one)}:${range.d2}${columnLetter(two)}`;
	});
	return `=${body}`;
}

/**
 * Les références d'un atelier reçu suivent leurs colonnes (T7) : relatives ou
 * absolues, elles pointent la colonne où la leur a été placée ; une colonne qui
 * n'est pas arrivée (vide chez l'autre élève) devient `#HORS`.
 */
export function remapColumns(text: string, placed: ReadonlyMap<number, number>): string {
	return mapColumnRanges(
		mapReferences(text, (column, row, colAbs, rowAbs) => {
			const target = placed.get(column);
			return target === undefined ? OUTSIDE : written(target, row, colAbs, rowAbs);
		}),
		(column) => placed.get(column)
	);
}

/** `{-1:-2}` : une référence relative à sa cellule ; `{$B:-2}`, `{-1:$2}` figent une partie. */
const RELATIVE = /\{(\$[A-Z]|-?\d+):(\$\d+|-?\d+)\}/g;

/** Chaque formule d'un état rangé, réécrite selon son adresse. */
function mapStateFormulas(
	state: AtelierState,
	map: (text: string, column: number, row: number) => string
): AtelierState {
	const objects = state.objects.map((o) => {
		const column = o.kind === 'list' && o.column !== undefined ? columnOfLetter(o.column) : null;
		if (column === null || !o.definition.includes('=')) return o;
		const definition = o.definition
			.split(';')
			.map((entry, i) => {
				const text = entry.trim();
				return isFormula(text) ? ` ${map(text, column, i + 1)} ` : entry;
			})
			.join(';')
			.trim();
		return { ...o, definition };
	});
	const cells = state.grid?.cells;
	const mapped =
		cells === undefined
			? undefined
			: Object.fromEntries(
					Object.entries(cells).map(([address, text]) => {
						const at = readCellName(address);
						return [address, at === null || !isFormula(text) ? text : map(text, at.column, at.row)];
					})
				);
	return {
		...state,
		objects,
		...(state.grid !== undefined && { grid: { ...state.grid, ...(mapped && { cells: mapped }) } })
	};
}

/**
 * Le lien range les formules en RELATIF (§7) : `=0,8*A29+$A$1` en A30 devient
 * `=0,8*{0:-1}+$A$1`, la même écriture sur chaque ligne d'une colonne recopiée,
 * que la compression écrase (mesuré : 2 394 → 1 308 caractères pour deux
 * colonnes de 200 lignes). Sans formule, l'état ne change pas.
 */
export function toRelative(state: AtelierState): AtelierState {
	let any = false;
	const relative = mapStateFormulas(state, (text, at, row) => {
		any = true;
		return mapReferences(text, (column, refRow, colAbs, rowAbs) => {
			if (colAbs && rowAbs) return `$${columnLetter(column)}$${refRow}`;
			const c = colAbs ? `$${columnLetter(column)}` : String(column - at);
			const r = rowAbs ? `$${refRow}` : String(refRow - row);
			return `{${c}:${r}}`;
		});
	});
	return any ? { ...relative, grid: { ...relative.grid, relative: true } } : state;
}

/** Une formule relative (`{0:-1}`) réécrite depuis sa cellule (colonne `at`, ligne `row`). */
export function fromRelativeText(text: string, at: number, row: number): string {
	return text.replace(RELATIVE, (_, c: string, r: string) => {
		const column = c.startsWith('$') ? columnOfLetter(c.slice(1)) : at + Number(c);
		const refRow = r.startsWith('$') ? Number(r.slice(1)) : row + Number(r);
		return column === null
			? OUTSIDE
			: written(column, refRow, c.startsWith('$'), r.startsWith('$'));
	});
}

/** L'inverse de `toRelative` : les références relatives réécrites depuis leur cellule. */
export function fromRelative(state: AtelierState): AtelierState {
	if (state.grid?.relative !== true) return state;
	const restored = mapStateFormulas(state, fromRelativeText);
	const { relative: _relative, ...grid } = restored.grid ?? {};
	return { ...restored, ...(Object.keys(grid).length > 0 ? { grid } : { grid: undefined }) };
}
