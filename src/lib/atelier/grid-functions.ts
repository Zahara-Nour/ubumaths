/**
 * Atelier — les fonctions du tableur (tableur intégré, lot 4).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot4-phase0.md`, Q-L4-1 : une couche de la
 * grille, AVANT mathAST. Elle repère les appels `SOMME(…)`, `MOYENNE(…)` et les
 * plages (`A2:A21`, `A:A`) ; chaque argument passe par la lecture des formules
 * d'aujourd'hui ; le résultat entre dans l'arbre comme une valeur de case.
 * mathAST ne change pas : plages, `NB` ou `ECARTYPEP` n'ont de sens que dans la
 * grille.
 *
 * Ce module LIT (appels, arguments, plages) et CALCULE une fonction à partir des
 * valeurs de ses arguments ; `formula.ts` relie les deux à la grille.
 *
 * @module atelier/grid-functions
 */

import { cellName, GRID_ROWS } from './grid';
import type { MathNode } from '$lib/mathAST/types';
import { evaluate } from '$lib/mathAST/eval/evaluate';

// =============================================================================
// Types
// =============================================================================

export type GridFunction =
	'SOMME' | 'MOYENNE' | 'MEDIANE' | 'MIN' | 'MAX' | 'NB' | 'ECARTYPE' | 'ECARTYPEP';

/** Un appel repéré dans le corps d'une formule : sa place, son nom, ses arguments bruts. */
export interface GridCall {
	readonly start: number;
	/** La parenthèse ouvrante. */
	readonly open: number;
	readonly end: number;
	readonly name: GridFunction;
	readonly args: readonly string[];
}

/** Une plage lue : ses bornes, rangées (`A4:A1` → A1 à A4). */
export interface GridRange {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

/** Une valeur d'argument, pour le calcul : son arbre exact et sa valeur approchée. */
export interface ArgumentValue {
	readonly node: MathNode;
	readonly value: number;
}

export type Computed =
	{ readonly ok: true; readonly node: MathNode } | { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const GRID_FUNCTIONS: readonly GridFunction[] = [
	'SOMME',
	'MOYENNE',
	'MEDIANE',
	'MIN',
	'MAX',
	'NB',
	'ECARTYPE',
	'ECARTYPEP'
];

/**
 * Un nom suivi d'une parenthèse ; accents permis (`MÉDIANE`), point permis
 * (`NB.SI`, PR 3), un chiffre devant aussi (`2SOMME(…)`, produit). Les lettres
 * accentuées sans `×` (U+00D7) ni `÷` (U+00F7), qui sont dans `À-ÿ` (revue).
 */
const CALL = /(?<![A-Za-zÀ-ÖØ-öø-ÿ_\\.$])([A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ.]*)\s*\(/g;

/** `A2:A21`, `$A$2:A2` : deux cases ; `A:A`, `$A:$A` : une colonne entière. */
const RANGE = /^\s*(\$?)([A-Za-z])(\$?)([1-9]\d*)\s*:\s*(\$?)([A-Za-z])(\$?)([1-9]\d*)\s*$/;
const COLUMN_RANGE = /^\s*(\$?)([A-Za-z])\s*:\s*(\$?)([A-Za-z])\s*$/;

/**
 * Une plage de cases DANS un texte : pour la refuser hors d'une fonction, ou
 * mêlée à un calcul. Pas `A:A` : hors d'un argument, `a:b` est une division
 * (l'usage du collège, revue) ; une colonne entière ne se lit qu'en argument.
 */
export const RANGE_IN_TEXT =
	/(?<![A-Za-z_\\$])\$?[A-Za-z]\$?\d+\s*:\s*\$?[A-Za-z]\$?\d+(?![A-Za-z_\d(])/;

export const RANGE_ALONE_MESSAGE =
	'Une plage s’utilise dans une fonction, par exemple =SOMME(A1:A3).';
export const RANGE_MIXED_MESSAGE =
	'Une plage s’utilise seule en argument : =SOMME(A1:A3), pas =SOMME(A1:A3*2).';

// =============================================================================
// Lire
// =============================================================================

/** `Médiane`, `écartypep` → `MEDIANE`, `ECARTYPEP` ; `null` pour un nom qui n'en est pas une. */
export function gridFunctionOf(name: string): GridFunction | null {
	const plain = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
	return (GRID_FUNCTIONS as readonly string[]).includes(plain) ? (plain as GridFunction) : null;
}

/** La parenthèse fermante qui répond à celle de `open`, ou -1. */
function closingParenthesis(body: string, open: number): number {
	let depth = 0;
	for (let i = open; i < body.length; i++) {
		if (body[i] === '(') depth++;
		else if (body[i] === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

/** Les arguments d'un appel, coupés aux « ; » du premier niveau. */
function splitArguments(inside: string): string[] {
	const args: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < inside.length; i++) {
		const char = inside[i];
		if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (char === ';' && depth === 0) {
			args.push(inside.slice(start, i));
			start = i + 1;
		}
	}
	args.push(inside.slice(start));
	return args.length === 1 && args[0].trim() === '' ? [] : args;
}

/**
 * Les appels de fonctions du tableur du PREMIER niveau d'un corps de formule
 * (ceux qu'ils contiennent sont lus avec leurs arguments), ou `null` si une
 * parenthèse ne se ferme pas.
 */
export function findCalls(body: string): GridCall[] | null {
	const calls: GridCall[] = [];
	let from = 0;
	for (const match of body.matchAll(CALL)) {
		const start = match.index ?? 0;
		if (start < from) continue;
		const name = gridFunctionOf(match[1]);
		if (name === null) continue;
		const open = start + match[0].length - 1;
		const close = closingParenthesis(body, open);
		if (close === -1) return null;
		calls.push({
			start,
			open,
			end: close + 1,
			name,
			args: splitArguments(body.slice(open + 1, close))
		});
		from = close + 1;
	}
	return calls;
}

/** `A2:A21` ou `A:A` (Q-L4-4 : de A1 à A200), rangée ; `null` si ce n'est pas une plage. */
export function readRange(text: string): GridRange | null {
	const cells = RANGE.exec(text);
	if (cells !== null) {
		const [c1, r1, c2, r2] = [
			cells[2].toUpperCase().charCodeAt(0) - 65,
			Number(cells[4]),
			cells[6].toUpperCase().charCodeAt(0) - 65,
			Number(cells[8])
		];
		return {
			left: Math.min(c1, c2),
			right: Math.max(c1, c2),
			top: Math.min(r1, r2),
			bottom: Math.max(r1, r2)
		};
	}
	const column = COLUMN_RANGE.exec(text);
	if (column === null) return null;
	const [c1, c2] = [column[2], column[4]].map((l) => l.toUpperCase().charCodeAt(0) - 65);
	return { left: Math.min(c1, c2), right: Math.max(c1, c2), top: 1, bottom: GRID_ROWS };
}

/** Les cases d'une plage, colonne par colonne. */
export function cellsOf(range: GridRange): string[] {
	const cells: string[] = [];
	for (let column = range.left; column <= range.right; column++) {
		for (let row = range.top; row <= range.bottom; row++) cells.push(cellName(column, row));
	}
	return cells;
}

/**
 * Réécrire chaque ARGUMENT des fonctions du tableur, emboîtées comprises ;
 * le reste du texte ne change pas. C'est là, et seulement là, que `A:A` est une
 * colonne (revue : `=a:b` hors d'un argument est une division).
 */
export function mapCallArguments(body: string, map: (arg: string) => string): string {
	const calls = findCalls(body);
	if (calls === null) return body;
	let result = body;
	for (const call of [...calls].reverse()) {
		const args = call.args.map((arg) => {
			const mapped = map(arg);
			return mapped === arg ? mapCallArguments(arg, map) : mapped;
		});
		result = `${result.slice(0, call.open + 1)}${args.join(';')})${result.slice(call.end)}`;
	}
	return result;
}

/** `A:A`, `$A:$B` : une colonne entière, en argument — ses lettres et ses `$`. */
export function columnRangeOf(
	arg: string
): { readonly d1: string; readonly c1: string; readonly d2: string; readonly c2: string } | null {
	const match = COLUMN_RANGE.exec(arg);
	return match === null ? null : { d1: match[1], c1: match[2], d2: match[3], c2: match[4] };
}

/** `=somme(a1:a4)` → `=SOMME(A1:A4)` : les noms et les colonnes entières en capitales (Q-L4-7). */
export function normalizeGridFunctions(body: string): string {
	const named = body.replace(CALL, (match, name: string) => {
		const canonical = gridFunctionOf(name);
		return canonical === null ? match : match.replace(name, canonical);
	});
	return mapCallArguments(named, (arg) => (columnRangeOf(arg) === null ? arg : arg.toUpperCase()));
}

// =============================================================================
// Calculer
// =============================================================================

function grouped(node: MathNode): MathNode {
	return { type: 'delimiter', delimiters: 'parentheses', content: node, semantic: 'grouping' };
}

function numberNode(value: number): MathNode {
	return { type: 'number', value: String(value) };
}

/**
 * La somme, en arbre ÉQUILIBRÉ : une somme de 200 cases écrite à la suite fait
 * un arbre de profondeur 200, que la garde de mathAST refuse (profondeur 100 —
 * exception mesurée en écrivant ce lot) ; équilibrée, sa profondeur est log₂ n.
 */
function sum(nodes: readonly MathNode[]): MathNode {
	if (nodes.length === 1) return grouped(nodes[0]);
	const middle = Math.floor(nodes.length / 2);
	return { type: 'addition', left: sum(nodes.slice(0, middle)), right: sum(nodes.slice(middle)) };
}

function divided(numerator: MathNode, denominator: number): MathNode {
	return {
		type: 'division',
		numerator: grouped(numerator),
		denominator: numberNode(denominator),
		displayStyle: 'fraction'
	};
}

/**
 * L'ARBRE exact que vaut une fonction sur ces nombres : mathAST le calcule
 * ensuite, exact quand c'est court (Q2). MIN, MAX et MEDIANE choisissent par la
 * valeur approchée, puis rendent l'écriture exacte.
 *
 * @param label - Ce que l'élève a passé, pour un refus (« Aucun nombre dans A1:A5. »)
 */
export function computeFunction(
	name: GridFunction,
	values: readonly ArgumentValue[],
	label: string
): Computed {
	const n = values.length;
	const nodes = values.map((v) => v.node);
	if (name === 'NB') return { ok: true, node: numberNode(n) };
	if (name === 'SOMME') return { ok: true, node: n === 0 ? numberNode(0) : sum(nodes) };
	if (n === 0) return { ok: false, message: `Aucun nombre dans ${label}.` };

	const mean = divided(sum(nodes), n);
	switch (name) {
		case 'MOYENNE':
			return { ok: true, node: mean };
		case 'MIN':
		case 'MAX': {
			const pick = values.reduce((best, v) =>
				(name === 'MIN' ? v.value < best.value : v.value > best.value) ? v : best
			);
			return { ok: true, node: grouped(pick.node) };
		}
		case 'MEDIANE': {
			const sorted = [...values].sort((a, b) => a.value - b.value);
			const middle = Math.floor(n / 2);
			return {
				ok: true,
				node:
					n % 2 === 1
						? grouped(sorted[middle].node)
						: divided(sum([sorted[middle - 1].node, sorted[middle].node]), 2)
			};
		}
		case 'ECARTYPE':
		case 'ECARTYPEP': {
			const divisor = name === 'ECARTYPE' ? n - 1 : n;
			if (divisor === 0) {
				return {
					ok: false,
					message: 'ECARTYPE demande au moins deux nombres (il divise par n − 1).'
				};
			}
			// La moyenne calculée UNE fois : recopiée dans chaque carré, elle faisait un
			// arbre en n² (40 000 feuilles pour 200 cases, 750 ms à chaque saisie — revue)
			const meanValue = evaluate(mean, { mode: 'exact' });
			const meanNode =
				meanValue.status === 'value' && meanValue.exact ? meanValue.node : grouped(mean);
			const squares = nodes.map((node): MathNode => ({
				type: 'superscript',
				base: grouped({ type: 'subtraction', left: grouped(node), right: grouped(meanNode) }),
				superscript: numberNode(2)
			}));
			return {
				ok: true,
				node: { type: 'function', name: 'sqrt', args: [divided(sum(squares), divisor)] }
			};
		}
	}
}
