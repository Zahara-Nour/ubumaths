/**
 * Atelier — les formules de la grille (tableur intégré, lot 2)
 *
 * Une cellule qui commence par `=` est calculée par le MOTEUR DE L'ATELIER
 * (option C) : valeur exacte, objets de l'atelier (`f`, curseurs), mêmes refus
 * que Calcul. Phase 0 : `docs/wip/atelier-tableur-lot2-phase0.md`.
 *
 * Lecture : chaque référence (`A2`, `$B$3`) devient une variable marquée
 * `ω_k` avant la lecture — un nom d'objet n'est jamais une lettre grecque — puis
 * la valeur de la cellule remplace la marque dans l'arbre. Le texte des
 * valeurs ne repasse jamais par le parseur.
 *
 * @module atelier/formula
 */

import type { Atelier } from './atelier.svelte';
import type { MathNode } from '$lib/mathAST/types';
import { astOf } from './parse';
import { cellName, GRID_ROWS } from './grid';
import { gridContext, termsOf, type GridContext } from './engine';
import { evaluate } from '$lib/mathAST/eval/evaluate';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { transformAST } from '$lib/mathAST/visitor';
import { toCustom } from '$lib/mathAST/custom-generator';
import { tidyTerms } from './tidy-terms';
import { decimalCommaText } from './decimal-comma';
import { readListValue } from '$lib/statistics/read-value';
import { intervalDomainOf, outsideIntervalMessage } from './interval';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { displayName } from './names';

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
			/** Ce que montre la case (Q2) : `13/3`, `0,25`, ou `≈ 4,3333`. */
			readonly shown: string;
	  }
	| { readonly kind: 'word'; readonly text: string }
	| {
			readonly kind: 'error';
			/** Le mot court de la case (Q-L2-1) ; la phrase s'affiche sous la barre. */
			readonly label: 'erreur' | 'cycle';
			readonly message: string;
	  };

/** Une formule lue : son arbre (références marquées), ses cellules citées, ou pourquoi non. */
type ReadFormula =
	| { readonly ok: true; readonly ast: MathNode; readonly refs: readonly string[] }
	| { readonly ok: false; readonly message: string };

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

/** La marque d'une référence dans l'arbre lu : `ω_k`. */
const MARK = 'ω';

/** Au-delà, une cellule exacte rend ses dépendantes approchées (repli après coup, ~20 ms). */
const EXACT_BUDGET_MS = 20;

/** Au-delà de ce nombre de caractères, l'écriture exacte cède la place à `≈` (Q2). */
const MAX_SHOWN_EXACT = 12;

const UNREADABLE = 'Je n’ai pas su lire cette formule.';

// =============================================================================
// Lecture
// =============================================================================

export function isFormula(text: string): boolean {
	return text.trimStart().startsWith('=');
}

/** `=a2+1` → `=A2+1` : une référence s'écrit en capitales (comme dans LibreOffice). */
export function normalizeFormula(text: string): string {
	if (!isFormula(text)) return text;
	return text
		.trim()
		.replace(
			REFERENCE,
			(_, colAbs, letter, rowAbs, row) => `${colAbs}${letter.toUpperCase()}${rowAbs}${row}`
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
	const body = text.trim().slice(1);
	if (body.trim() === '' || body.includes(MARK)) return { ok: false, message: UNREADABLE };
	const wide = WIDE_REFERENCE.exec(body);
	if (wide !== null) return { ok: false, message: outsideGrid(`${wide[1]}${wide[2]}`) };

	const refs: string[] = [];
	let outside: string | null = null;
	const marked = body.replace(REFERENCE, (_, _colAbs, letter: string, _rowAbs, row: string) => {
		const address = `${letter.toUpperCase()}${row}`;
		if (Number(row) > GRID_ROWS) outside ??= address;
		const index = refs.indexOf(address);
		if (index === -1) refs.push(address);
		return `${MARK}_${(index === -1 ? refs.length : index + 1).toString()}`;
	});
	if (outside !== null) return { ok: false, message: outsideGrid(outside) };
	const ast = astOf(marked, 'text', functionNames);
	return ast === null ? { ok: false, message: UNREADABLE } : { ok: true, ast, refs };
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
 */
export function computeGrid(
	texts: ReadonlyMap<string, string>,
	atelier: Atelier
): Map<string, CellValue> {
	const values = new Map<string, CellValue>();
	const formulas = [...texts].filter(([, text]) => isFormula(text));
	if (formulas.length === 0) return values;

	const functionNames = atelier.functionNames;
	const reads = new Map(
		formulas.map(([address, text]) => [address, readFormula(text, functionNames)])
	);
	const isFormulaCell = (address: string) => reads.has(address);

	// Ordre de calcul et cycles : parcours en profondeur
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
		const read = reads.get(address)!;
		if (read.ok) for (const ref of read.refs) if (isFormulaCell(ref)) visit(ref);
		stack.pop();
		state.set(address, 'done');
		order.push(address);
	};
	for (const [address] of formulas) visit(address);

	const context = gridContext(atelier);
	/** Les cellules dont la valeur exacte a coûté trop cher : leurs dépendantes passent en ≈. */
	const approximate = new Set<string>();

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
		values.set(
			address,
			computeCell(address, reads.get(address)!, texts, values, approximate, atelier, context)
		);
	}
	return values;
}

/** La valeur d'une cellule qui n'est pas une formule : rien, un nombre tapé, un mot. */
export function plainValue(text: string): CellValue {
	if (text.trim() === '') return { kind: 'empty' };
	const number = readListValue(text);
	if (number === null) return { kind: 'word', text };
	const node = astOf(text, 'text') ?? { type: 'number', value: String(number) };
	return { kind: 'number', value: number, node, exact: true, shown: text };
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
				return {
					kind: 'error',
					label: 'erreur',
					message: `${ref} contient un mot (${value.text}) : une formule calcule avec des nombres.`
				};
			case 'error':
				return { kind: 'error', label: 'erreur', message: `Dépend de ${ref}, en erreur.` };
			case 'number':
				if (!value.exact || approximate.has(ref)) inexact = true;
				cited.push(value.node);
		}
	}

	const withCells = transformAST(read.ast, {
		enterSubscript: (node) => {
			if (node.base.type !== 'variable' || node.base.name !== MARK) return undefined;
			if (node.subscript.type !== 'number') return undefined;
			const value = cited[Number(node.subscript.value) - 1];
			return value === undefined
				? undefined
				: { type: 'delimiter', delimiters: 'parentheses', content: value, semantic: 'grouping' };
		}
	});

	const outside = outsideInterval(withCells, atelier);
	if (outside !== null) return { kind: 'error', label: 'erreur', message: outside };

	const expanded = context.expand(recurrentTerms(withCells, atelier));
	if (!expanded.ok) return { kind: 'error', label: 'erreur', message: expanded.message };

	const free = [...getVariables(expanded.ast)];
	if (free.length > 0)
		return { kind: 'error', label: 'erreur', message: freeNameMessage(free[0], atelier) };

	const started = performance.now();
	const result = evaluate(expanded.ast, { mode: inexact ? 'decimal' : 'exact' });
	if (performance.now() - started > EXACT_BUDGET_MS) approximate.add(address);
	return numberValue(result, inexact);
}

/** Le résultat du moteur, en valeur de cellule. */
function numberValue(result: ReturnType<typeof evaluate>, inexact: boolean): CellValue {
	if (result.status === 'indeterminate') {
		return { kind: 'error', label: 'erreur', message: `Calcul impossible : forme ${result.form}.` };
	}
	if (result.status !== 'value') {
		const reason = result.status === 'unevaluable' ? result.reason : '';
		return {
			kind: 'error',
			label: 'erreur',
			message: /zero|zéro/i.test(reason)
				? 'Division par zéro.'
				: 'Je n’ai pas su calculer cette formule.'
		};
	}
	const approx = evaluate(result.node, { mode: 'decimal' });
	const value =
		approx.status === 'value' && typeof approx.value === 'number' ? approx.value : Number.NaN;
	if (!Number.isFinite(value)) {
		return { kind: 'error', label: 'erreur', message: 'Division par zéro.' };
	}
	const exact = !inexact && result.exact;
	return {
		kind: 'number',
		value,
		node: exact ? result.node : decimalNode(value),
		exact,
		shown: shownValue(result.node, value, exact)
	};
}

function decimalNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

/** Q2 : l'écriture exacte si elle est courte, sinon `≈` et 4 décimales. */
function shownValue(node: MathNode, value: number, exact: boolean): string {
	if (exact) {
		const written = decimalCommaText(toCustom(tidyTerms(node)));
		if (written.length <= MAX_SHOWN_EXACT) return written;
	}
	return `≈ ${decimalCommaText(String(Number(value.toFixed(4))))}`;
}

/** Les suites récurrentes : leur terme `u(5)` se lit dans leurs termes calculés. */
function recurrentTerms(ast: MathNode, atelier: Atelier): MathNode {
	return transformAST(ast, {
		enterFunction: (node) => {
			const sequence = atelier.get(node.name);
			if (sequence?.kind !== 'sequence' || sequence.mode !== 'recurrence') return undefined;
			if (node.args.length !== 1) return undefined;
			const rank = evaluate(node.args[0], { mode: 'decimal' });
			if (rank.status !== 'value' || typeof rank.value !== 'number') return undefined;
			const n = rank.value;
			if (!Number.isInteger(n)) return undefined;
			const terms = termsOf(atelier, node.name, n);
			const term = terms.ok ? terms.terms.find((t) => t.n === n) : undefined;
			return term === undefined ? undefined : decimalNode(term.value);
		}
	});
}

/** `f(-1)` avec f définie sur [0 ; +∞[ : le refus de Calcul, mot pour mot. */
function outsideInterval(ast: MathNode, atelier: Atelier): string | null {
	let refusal: string | null = null;
	transformAST(ast, {
		enterFunction: (node) => {
			if (refusal !== null || node.args.length !== 1) return undefined;
			const domain = intervalDomainOf(atelier.get(node.name));
			if (domain === null) return undefined;
			const argument = evaluate(node.args[0], { mode: 'decimal' });
			if (argument.status !== 'value' || typeof argument.value !== 'number') return undefined;
			if (containsValue(domain, argument.value)) return undefined;
			refusal = outsideIntervalMessage(
				displayName(node.name),
				decimalCommaText(toCustom(node.args[0]).replace(/^\((.*)\)$/, '$1')),
				domain
			);
			return undefined;
		}
	});
	return refusal;
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
