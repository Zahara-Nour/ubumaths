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
import { toCustom } from '$lib/mathAST/custom-generator';
import { astOf } from './parse';
import { readListValue } from '$lib/statistics/read-value';

// =============================================================================
// Types
// =============================================================================

/** Les fonctions de statistiques : des plages, des listes, plusieurs arguments (PR 1). */
export type StatisticFunction =
	'SOMME' | 'MOYENNE' | 'MEDIANE' | 'MIN' | 'MAX' | 'NB' | 'ECARTYPE' | 'ECARTYPEP';

/** Les fonctions de calcul : des nombres, en nombre fixe (PR 2). */
export type CalculationFunction = 'ARRONDI' | 'ENT' | 'RACINE' | 'ABS' | 'LN' | 'EXP' | 'PI';

/** Les conditions : SI et NB.SI, avec du texte et des comparaisons (PR 3). */
export type ConditionFunction = 'SI' | 'NB.SI';

export type GridFunction = StatisticFunction | CalculationFunction | ConditionFunction;

/** Une comparaison : `<`, `>`, `<=`, `>=`, `=`, `<>` (comme LibreOffice). */
export type Comparison = '<' | '>' | '<=' | '>=' | '=' | '<>';

/** Ce que compare une condition : un nombre, ou un mot. */
export type Compared =
	| { readonly kind: 'number'; readonly value: number }
	| { readonly kind: 'text'; readonly text: string };

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
	| {
			readonly ok: true;
			readonly node: MathNode;
			/** Le résultat n'est qu'approché (ARRONDI d'un flottant au-delà de 15 chiffres). */
			readonly inexact?: boolean;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const STATISTIC_FUNCTIONS: readonly StatisticFunction[] = [
	'SOMME',
	'MOYENNE',
	'MEDIANE',
	'MIN',
	'MAX',
	'NB',
	'ECARTYPE',
	'ECARTYPEP'
];

/** Leur nombre d'arguments. */
export const CALCULATION_ARITY: Readonly<Record<CalculationFunction, number>> = {
	ARRONDI: 2,
	ENT: 1,
	RACINE: 1,
	ABS: 1,
	LN: 1,
	EXP: 1,
	PI: 0
};

export const CONDITION_ARITY: Readonly<Record<ConditionFunction, number>> = { SI: 3, 'NB.SI': 2 };

export const GRID_FUNCTIONS: readonly GridFunction[] = [
	...STATISTIC_FUNCTIONS,
	...(Object.keys(CALCULATION_ARITY) as CalculationFunction[]),
	...(Object.keys(CONDITION_ARITY) as ConditionFunction[])
];

export const TEXT_ALONE_MESSAGE =
	'Un texte entre guillemets s’utilise dans SI ou NB.SI, par exemple =NB.SI(B2:B30;"fille").';
export const COMPARISON_ALONE_MESSAGE =
	'Une comparaison s’écrit dans SI, par exemple =SI(A1>2;1;0).';
export const UNCLOSED_QUOTE_MESSAGE = 'Il manque un guillemet fermant.';

/** Ce que dit l'aide sous la barre (§5) : la forme, puis ce que rend la fonction. */
const SIGNATURES: Readonly<Record<GridFunction, string>> = {
	SOMME: 'SOMME(plage ; …) — la somme des nombres',
	MOYENNE: 'MOYENNE(plage ; …) — la moyenne des nombres',
	MEDIANE: 'MEDIANE(plage ; …) — la médiane des nombres',
	MIN: 'MIN(plage ; …) — le plus petit nombre',
	MAX: 'MAX(plage ; …) — le plus grand nombre',
	NB: 'NB(plage ; …) — combien de cases contiennent un nombre',
	ECARTYPE: 'ECARTYPE(plage ; …) — l’écart type (divise par n − 1)',
	ECARTYPEP: 'ECARTYPEP(plage ; …) — l’écart type (divise par n), le σ de .stats',
	ARRONDI: 'ARRONDI(x ; n) — x arrondi à n décimales',
	ENT: 'ENT(x) — la partie entière (vers le bas)',
	RACINE: 'RACINE(x) — √x',
	ABS: 'ABS(x) — la valeur absolue',
	LN: 'LN(x) — le logarithme népérien',
	EXP: 'EXP(x) — l’exponentielle',
	PI: 'PI() — le nombre π',
	SI: 'SI(condition ; si vrai ; si faux) — l’un ou l’autre selon la condition',
	'NB.SI': 'NB.SI(plage ; critère) — combien de cases vérifient le critère'
};

/** ARRONDI(x ; n) : n entre −15 et 15 (au-delà, un gel ou des chiffres faux — revue). */
const MAX_ROUNDING_DIGITS = 15;

/** Les chiffres significatifs justes d'un flottant. */
const FLOAT_DIGITS = 15;

/** Au plus autant de propositions quand un nom est en cours d'écriture. */
const MAX_HINTS = 3;

/** Les fonctions de calcul, et leur nom pour mathAST. */
const ENGINE_NAMES: Readonly<Record<Exclude<CalculationFunction, 'ARRONDI' | 'PI'>, string>> = {
	ENT: 'floor',
	RACINE: 'sqrt',
	ABS: 'abs',
	LN: 'ln',
	EXP: 'exp'
};

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

export function isStatistic(name: GridFunction): name is StatisticFunction {
	return (STATISTIC_FUNCTIONS as readonly string[]).includes(name);
}

/** `Médiane`, `écartypep` → `MEDIANE`, `ECARTYPEP` ; `null` pour un nom qui n'en est pas une. */
export function gridFunctionOf(name: string): GridFunction | null {
	const plain = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
	return (GRID_FUNCTIONS as readonly string[]).includes(plain) ? (plain as GridFunction) : null;
}

/** La parenthèse fermante qui répond à celle de `open`, ou -1. */
function closingParenthesis(body: string, open: number): number {
	let depth = 0;
	let quoted = false;
	for (let i = open; i < body.length; i++) {
		// Un texte entre guillemets ne compte pas : `"oui (vraiment)"`
		if (body[i] === '"') quoted = !quoted;
		if (quoted) continue;
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
	let quoted = false;
	for (let i = 0; i < inside.length; i++) {
		const char = inside[i];
		if (char === '"') quoted = !quoted;
		if (quoted) continue;
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
	const named = outsideQuotes(body, (part) =>
		part.replace(CALL, (match, name: string) => {
			const canonical = gridFunctionOf(name);
			return canonical === null ? match : match.replace(name, canonical);
		})
	);
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
	name: StatisticFunction,
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

/**
 * Une fonction de calcul (PR 2) sur ses arguments : RACINE, ABS, LN, EXP, ENT
 * deviennent l'appel de mathAST (mêmes refus que Calcul) ; ARRONDI rend un
 * décimal ; PI, π.
 */
export function computeCalculation(
	name: CalculationFunction,
	values: readonly ArgumentValue[]
): Computed {
	if (name === 'PI') {
		const pi = astOf('π', 'text');
		return pi === null ? { ok: false, message: 'π introuvable.' } : { ok: true, node: pi };
	}
	if (name === 'ARRONDI') {
		const [x, n] = values;
		if (!Number.isInteger(n.value)) {
			return {
				ok: false,
				message: 'ARRONDI : le nombre de décimales doit être un entier (ARRONDI(x ; 2)).'
			};
		}
		// Borné (règle 1) : `ARRONDI(1/3;1000000)` écrivait un million de chiffres
		// et gelait l'onglet (revue)
		if (Math.abs(n.value) > MAX_ROUNDING_DIGITS) {
			return {
				ok: false,
				message: `ARRONDI : le nombre de décimales doit être entre -${MAX_ROUNDING_DIGITS} et ${MAX_ROUNDING_DIGITS}.`
			};
		}
		const result = rounded(x, n.value);
		return {
			ok: true,
			node: { type: 'number', value: result.written },
			...(result.inexact && { inexact: true })
		};
	}
	return {
		ok: true,
		node: { type: 'function', name: ENGINE_NAMES[name], args: [grouped(values[0].node)] }
	};
}

/** `p/q`, `-p/q`, `p`, `-p` (entiers) : la fraction exacte d'une écriture, sinon `null`. */
function fractionOf(written: string): { p: bigint; q: bigint } | null {
	const text = written.replaceAll(' ', '');
	const integer = /^\(?(-?\d+)\)?$/.exec(text);
	if (integer !== null) return { p: BigInt(integer[1]), q: 1n };
	const fraction = /^\(?(-?)(\d+)\)?\/(\d+)$|^-\((\d+)\/(\d+)\)$/.exec(text);
	if (fraction === null) return null;
	const negative = fraction[1] === '-' || fraction[4] !== undefined;
	const p = BigInt(fraction[2] ?? fraction[4]);
	const q = BigInt(fraction[3] ?? fraction[5]);
	return q === 0n ? null : { p: negative ? -p : p, q };
}

/**
 * x arrondi à n décimales, la moitié LOIN DE ZÉRO (comme LibreOffice :
 * ARRONDI(-2,5 ; 0) = −3), écrit en décimal (`2.57`). Exact quand x est une
 * fraction (en entiers longs : 2,675 → 2,68, quand les flottants donnent 2,67).
 */
function rounded(x: ArgumentValue, n: number): { written: string; inexact: boolean } {
	const exact = evaluate(x.node, { mode: 'exact' });
	const fraction =
		exact.status === 'value' && exact.exact ? fractionOf(toCustom(exact.node)) : null;
	if (fraction !== null) {
		const scale = 10n ** BigInt(Math.abs(n));
		const negative = fraction.p < 0n;
		const num = (negative ? -fraction.p : fraction.p) * (n >= 0 ? scale : 1n);
		const den = fraction.q * (n >= 0 ? 1n : scale);
		const units = (2n * num + den) / (2n * den);
		return { written: decimalText(negative && units !== 0n ? -units : units, n), inexact: false };
	}
	// Un flottant (π, √2) n'a que ~15 chiffres justes : au-delà, le résultat est
	// approché, jamais présenté comme exact (revue : ARRONDI(PI();20) se disait exact)
	const scale = 10 ** n;
	const units = Math.sign(x.value) * Math.round(Math.abs(x.value) * scale);
	const digits = x.value === 0 ? 0 : n + Math.floor(Math.log10(Math.abs(x.value))) + 1;
	return { written: decimalText(BigInt(units), n), inexact: digits > FLOAT_DIGITS };
}

/** `units` × 10⁻ⁿ, écrit en décimal sans zéros inutiles (`257`, 2 → `2.57`). */
function decimalText(units: bigint, n: number): string {
	if (n <= 0) return (units * 10n ** BigInt(-n)).toString();
	const negative = units < 0n;
	const digits = (negative ? -units : units).toString().padStart(n + 1, '0');
	const whole = digits.slice(0, digits.length - n);
	const fraction = digits.slice(digits.length - n).replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole}${fraction === '' ? '' : `.${fraction}`}`;
}

/**
 * L'aide sous la barre (§5) : la forme de la fonction dont on écrit les
 * arguments (la plus intérieure), sinon celles dont on écrit le nom (`=ECART`) ;
 * `null` quand il n'y a rien à dire.
 */
export function functionHint(draft: string): string | null {
	const text = draft.trimStart();
	if (!text.startsWith('=')) return null;
	const body = text.slice(1);
	let open: GridFunction | null = null;
	for (const match of body.matchAll(CALL)) {
		const name = gridFunctionOf(match[1]);
		if (name === null) continue;
		const at = (match.index ?? 0) + match[0].length - 1;
		if (closingParenthesis(body, at) === -1) open = name;
	}
	if (open !== null) return SIGNATURES[open];
	const typing = /([A-Za-zÀ-ÖØ-öø-ÿ.]{2,})$/.exec(body);
	if (typing === null) return null;
	const prefix = typing[1]
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase();
	// Deux lettres seulement pour un nom entier (LN, NB, PI) : `=A1*ab` n'est pas
	// le début d'ABS, c'est sans doute un objet de l'élève (revue)
	const matches = GRID_FUNCTIONS.filter((name) =>
		prefix.length >= 3 ? name.startsWith(prefix) : name === prefix
	).slice(0, MAX_HINTS);
	return matches.length === 0 ? null : matches.map((name) => SIGNATURES[name]).join(' · ');
}

// =============================================================================
// Texte et comparaisons (PR 3)
// =============================================================================

/** `"fille"` seul : le texte, sinon `null`. */
export function textLiteral(arg: string): string | null {
	const match = /^\s*"([^"]*)"\s*$/.exec(arg);
	return match === null ? null : match[1];
}

/**
 * Appliquer `map` aux seuls morceaux HORS des guillemets : un texte (`"A1"`) ne
 * se décale pas à la recopie et ne passe pas en capitales.
 */
export function outsideQuotes(text: string, map: (part: string) => string): string {
	return text
		.split('"')
		.map((part, i) => (i % 2 === 0 ? map(part) : part))
		.join('"');
}

/** La condition `A1>=10` coupée à sa comparaison du premier niveau, sinon `null`. */
export function splitComparison(
	arg: string
): { left: string; op: Comparison; right: string } | null {
	let depth = 0;
	let quoted = false;
	for (let i = 0; i < arg.length; i++) {
		const char = arg[i];
		if (char === '"') quoted = !quoted;
		if (quoted) continue;
		if (char === '(') depth++;
		else if (char === ')') depth--;
		else if (depth === 0 && (char === '<' || char === '>' || char === '=')) {
			const two = arg.slice(i, i + 2);
			const op: Comparison =
				two === '<=' || two === '>=' || two === '<>' ? two : (char as Comparison);
			return { left: arg.slice(0, i), op, right: arg.slice(i + op.length) };
		}
	}
	return null;
}

/** Un mot, en minuscules et sans espaces autour : `Fille` = `fille` (comme LibreOffice). */
function plain(text: string): string {
	return text.trim().toLocaleLowerCase('fr');
}

/**
 * Comparer deux choses ; un mot ne se compare qu'avec `=` ou `<>` (un nombre et
 * un mot ne sont jamais égaux). `null` : comparaison sans objet (un mot avec `<`).
 */
export function compare(left: Compared, op: Comparison, right: Compared): boolean | null {
	if (left.kind === 'number' && right.kind === 'number') {
		const a = left.value;
		const b = right.value;
		const equal = Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
		switch (op) {
			case '=':
				return equal;
			case '<>':
				return !equal;
			case '<':
				return a < b && !equal;
			case '>':
				return a > b && !equal;
			case '<=':
				return a < b || equal;
			case '>=':
				return a > b || equal;
		}
	}
	if (op !== '=' && op !== '<>') return null;
	const equal =
		left.kind === 'text' && right.kind === 'text' && plain(left.text) === plain(right.text);
	return op === '=' ? equal : !equal;
}

/** Le critère de NB.SI : `">=10"`, `"<>0"`, `"fille"`, `"12"` → une comparaison et sa cible. */
export function criterionOf(text: string): { op: Comparison; target: Compared } {
	const match = /^\s*(<=|>=|<>|<|>|=)?(.*)$/.exec(text);
	const op = (match?.[1] ?? '=') as Comparison;
	const rest = (match?.[2] ?? '').trim();
	const number = readListValue(rest);
	return {
		op,
		target: number === null ? { kind: 'text', text: rest } : { kind: 'number', value: number }
	};
}

/** Ce que dit Calcul d'une fonction de la grille qu'on y tape (Q-L4-6), sinon `null`. */
export function gridFunctionInCalcul(name: string): string | null {
	const known = gridFunctionOf(name);
	if (known === null) return null;
	const here = `${known} est une fonction de la grille (onglet Données)`;
	const written: Partial<Record<GridFunction, string>> = {
		RACINE: 'sqrt(…)',
		ENT: 'floor(…)',
		ABS: 'abs(…)',
		LN: 'ln(…)',
		EXP: 'exp(…)',
		PI: 'π'
	};
	if (written[known] !== undefined) return `${here} : dans Calcul, écris ${written[known]}.`;
	return isStatistic(known) ? `${here}. Pour une liste, tape .stats L.` : `${here}.`;
}
