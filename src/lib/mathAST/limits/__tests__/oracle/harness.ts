/**
 * Harnais de l'oracle numérique : construit la limite écrite par l'élève,
 * interroge le moteur, et confronte le résultat à l'attendu ET à
 * l'évaluation numérique de f près de la borne.
 *
 * Deux modes par entrée :
 * - `lim`  : `evaluateLimit(parseLatex('\lim_{x\to a} f'))` (saisie élève) ;
 * - `expr` : `evaluateLimit(parseLatex(f), 'x', borne parsée, direction)`.
 * Une entrée est « fausse » si l'un des deux modes rend une valeur fausse ;
 * elle est « couverte » si l'un des deux rend une valeur (juste).
 */

import { evaluateLimit } from '../../evaluate';
import { parseLatex } from '../../../parser';
import { toLatex } from '../../../latex-generator';
import { compile } from '../../../eval';
import { findNodes } from '../../../transforms';
import { isFunction, isInfinity, isLimit, isNumber } from '../../../guards';
import type { LimitDirection, LimitResult } from '../../types';
import type { LimitNode, MathNode } from '../../../types';
import type { ExpectedLimit, OracleEntry } from './corpus';

export type OracleMode = 'lim' | 'expr';

export interface ModeOutcome {
	readonly mode: OracleMode;
	/** Résumé lisible (`exact \frac{1}{2}`, `infinite +inf`, `unsupported`…). */
	readonly summary: string;
	/** Une valeur (finie ou infinie) a été rendue. */
	readonly hasValue: boolean;
	/** Raisons de fausseté (vide = juste ou non supporté). */
	readonly wrong: readonly string[];
}

export interface Verdict {
	readonly entry: OracleEntry;
	readonly outcomes: readonly ModeOutcome[];
	readonly wrong: boolean;
	readonly covered: boolean;
	/** `\lim(...)` non supporté alors que la fonction seule l'est. */
	readonly parenthesesGap: boolean;
}

/** Valeurs numériques au-delà desquelles une valeur « exacte » est suspecte. */
const MAX_EXACT_MAGNITUDE = 1e9;
const MAX_SIGNIFICANT_DIGITS = 12;
/** Tolérance de la confrontation numérique (relative, plancher 1). */
const NUMERIC_TOLERANCE = 1e-3;
/** Tolérance entre deux valeurs exactes (moteur vs attendu). */
const EXACT_TOLERANCE = 1e-9;
/** Échelle des points d'échantillonnage (écarts h, ou x en ±∞). */
const FINITE_STEPS = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8, 1e-9, 1e-10];
const INFINITE_POINTS = [1e1, 1e2, 1e3, 1e4, 1e5, 1e6, 1e8, 1e10, 1e12];
/**
 * Nombre de points les plus proches de la borne qui peuvent « confirmer » :
 * assez pour couvrir une convergence lente (√x·ln x en 0⁺) ET une annulation
 * catastrophique près de la borne ((1 − cos x)/x² n'est fiable qu'à h ≥ 1e-5).
 */
const CLOSEST_POINTS = 6;

// =============================================================================
// Construction de la limite
// =============================================================================

export interface BuiltLimit {
	readonly latex: string;
	readonly node: LimitNode;
	readonly expression: MathNode;
}

/**
 * `\lim_{x\to a} f` tel qu'un élève l'écrit ; si le corps n'est pas pris en
 * entier par le parseur (somme : `\lim … x\sin x`), l'élève met des
 * parenthèses : `\lim_{x\to a}\left(f\right)`.
 */
export function buildLimit(entry: OracleEntry): BuiltLimit {
	const expression = parseLatex(entry.f);
	const v = limitVariableLatex(entry);
	const bare = `\\lim_{${v}\\to ${entry.at}}${entry.f}`;
	const parsedBare = tryParse(bare);
	if (parsedBare && isLimit(parsedBare) && toLatex(parsedBare.expression) === toLatex(expression)) {
		return { latex: bare, node: parsedBare, expression };
	}
	const wrapped = `\\lim_{${v}\\to ${entry.at}}\\left(${entry.f}\\right)`;
	const parsedWrapped = parseLatex(wrapped);
	if (!isLimit(parsedWrapped)) throw new Error(`${entry.id} : ${wrapped} n'est pas une limite`);
	return { latex: wrapped, node: parsedWrapped, expression };
}

/** Variable de l'entrée telle qu'écrite dans `\lim_{…}` (`x`, `\alpha`). */
export function limitVariableLatex(entry: OracleEntry): string {
	const name = entry.variable ?? 'x';
	return name.length > 1 ? `\\${name}` : name;
}

function tryParse(latex: string): MathNode | null {
	try {
		return parseLatex(latex);
	} catch {
		return null;
	}
}

// =============================================================================
// Numérique
// =============================================================================

export type Borne =
	| { readonly kind: 'finite'; readonly value: number }
	| {
			readonly kind: 'infinite';
			readonly sign: 1 | -1;
	  };

export function borneOf(entry: OracleEntry, node: LimitNode): Borne {
	if (toLatex(node.approach).includes('\\infty')) {
		return { kind: 'infinite', sign: entry.at.trim().startsWith('-') ? -1 : 1 };
	}
	return { kind: 'finite', value: compile(node.approach)({}) };
}

/** Points d'échantillonnage, du plus loin au plus proche de la borne. */
function samplePoints(borne: Borne, direction: LimitDirection): number[][] {
	if (borne.kind === 'infinite') return [INFINITE_POINTS.map((x) => borne.sign * x)];
	const sides: number[] = direction === 'left' ? [-1] : direction === 'right' ? [1] : [-1, 1];
	return sides.map((side) => FINITE_STEPS.map((h) => borne.value + side * h));
}

function sampleValues(f: (x: number) => number, points: readonly number[]): number[] {
	return points.map((x) => {
		try {
			return f(x);
		} catch {
			return Number.NaN;
		}
	});
}

/** Un des points les plus proches confirme la valeur finie L. */
function confirmsFinite(values: readonly number[], limit: number): boolean {
	const finite = values.filter((v) => Number.isFinite(v));
	const closest = finite.slice(-CLOSEST_POINTS);
	const tolerance = NUMERIC_TOLERANCE * Math.max(1, Math.abs(limit));
	return closest.some((v) => Math.abs(v - limit) <= tolerance);
}

/** Croissance vers ±∞ : bon signe au plus proche, |f| croissant sur l'échelle. */
function confirmsInfinite(values: readonly number[], sign: 1 | -1): boolean {
	const usable = values.filter((v) => !Number.isNaN(v));
	if (usable.length < 2) return false;
	const first = usable[0];
	const last = usable[usable.length - 1];
	return Math.sign(last) === sign && Math.abs(last) > Math.abs(first) && Math.abs(last) > 1;
}

export function compileFunction(expression: MathNode, variable = 'x'): (x: number) => number {
	const compiled = compile(expression);
	return (x: number) => compiled({ [variable]: x });
}

/** Valeur numérique d'un attendu : nombre, ±Infinity, ou null (`none`). */
export function expectedNumber(expected: ExpectedLimit): number | null {
	if (expected === 'none') return null;
	if (expected === '+inf') return Number.POSITIVE_INFINITY;
	if (expected === '-inf') return Number.NEGATIVE_INFINITY;
	return compile(parseLatex(expected))({});
}

/**
 * L'attendu noté à la main est-il cohérent avec f ? (garde-fou du corpus).
 * Rend null si oui, sinon une explication.
 */
export function checkExpectedNumerically(entry: OracleEntry): string | null {
	const target = expectedNumber(entry.expected);
	if (target === null) return null;
	const built = buildLimit(entry);
	const f = compileFunction(built.expression, built.node.variable);
	const borne = borneOf(entry, built.node);
	for (const points of samplePoints(borne, built.node.direction)) {
		const values = sampleValues(f, points);
		const ok = Number.isFinite(target)
			? confirmsFinite(values, target)
			: confirmsInfinite(values, target > 0 ? 1 : -1);
		if (!ok) return `${entry.id} : attendu ${entry.expected}, échantillons ${values.join(', ')}`;
	}
	return null;
}

// =============================================================================
// Jugement d'un résultat du moteur
// =============================================================================

function describe(result: LimitResult): string {
	if (result.value === null) return result.status;
	if (isInfinity(result.value)) {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function significantDigits(value: string): number {
	const digits = value.replace(/[^0-9]/g, '').replace(/^0+/, '');
	return digits.replace(/0+$/, '').length;
}

/** Règle (c) : une valeur exacte finie ne porte ni ∞, ni ln(0), ni flottant étrange. */
function exactValueDefects(value: MathNode): string[] {
	const defects: string[] = [];
	if (findNodes(value, isInfinity).length > 0) defects.push('∞ dans une valeur exacte');
	const zeroLogs = findNodes(value, isFunction).filter(
		(node) =>
			node.name === 'ln' &&
			node.args.length === 1 &&
			isNumber(node.args[0]) &&
			Number(node.args[0].value) === 0
	);
	if (zeroLogs.length > 0) defects.push('ln(0) dans une valeur exacte');
	for (const node of findNodes(value, isNumber)) {
		if (Math.abs(Number(node.value)) > MAX_EXACT_MAGNITUDE) {
			defects.push(`nombre démesuré ${node.value}`);
		} else if (significantDigits(node.value) > MAX_SIGNIFICANT_DIGITS) {
			defects.push(`flottant non réduit ${node.value}`);
		}
	}
	return defects;
}

/** Valeur numérique rendue par le moteur, ou null si aucune. */
function resultNumber(result: LimitResult): number | null {
	if (result.value === null) return null;
	if (result.status !== 'exact' && result.status !== 'infinite') return null;
	if (isInfinity(result.value)) {
		return result.value.sign === 'positive' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
	}
	return compile(result.value)({});
}

function sameNumber(a: number, b: number): boolean {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
	return Math.abs(a - b) <= EXACT_TOLERANCE * Math.max(1, Math.abs(b));
}

type Evaluator = (direction: LimitDirection) => LimitResult;

function safeEvaluate(evaluator: Evaluator, direction: LimitDirection): LimitResult | Error {
	try {
		return evaluator(direction);
	} catch (error) {
		return error instanceof Error ? error : new Error(String(error));
	}
}

function judgeMode(
	mode: OracleMode,
	entry: OracleEntry,
	evaluator: Evaluator,
	direction: LimitDirection,
	borne: Borne,
	f: (x: number) => number
): ModeOutcome {
	const result = safeEvaluate(evaluator, direction);
	if (result instanceof Error) {
		return { mode, summary: `erreur ${result.message}`, hasValue: false, wrong: [] };
	}
	const summary = describe(result);
	const wrong: string[] = [];
	const expected = expectedNumber(entry.expected);

	if (result.status === 'does-not-exist') {
		// Règle (a) : « pas de limite » alors qu'une limite existe
		if (expected !== null) wrong.push(`pas de limite rendue, attendu ${entry.expected}`);
		return { mode, summary, hasValue: false, wrong };
	}
	// Règle (g) : une valeur APPROCHÉE n'est pas une limite rendue, mais elle
	// ne doit jamais être fausse (x^{1/5}/x^{1/3} en 0 rendait « ≈ 60 », pour +∞)
	if (result.status === 'approximate' && result.value !== null) {
		let approx: number;
		try {
			approx = isInfinity(result.value)
				? result.value.sign === 'positive'
					? Number.POSITIVE_INFINITY
					: Number.NEGATIVE_INFINITY
				: compile(result.value)({});
		} catch {
			approx = Number.NaN;
		}
		const close =
			expected !== null &&
			(Number.isFinite(expected)
				? Math.abs(approx - expected) <= 1e-3 * Math.max(1, Math.abs(expected))
				: approx === expected);
		if (!close) wrong.push(`valeur approchée fausse (${summary}), attendu ${entry.expected}`);
		return { mode, summary, hasValue: false, wrong };
	}
	let value: number | null;
	try {
		value = resultNumber(result);
	} catch {
		wrong.push('valeur rendue non évaluable numériquement');
		return { mode, summary, hasValue: true, wrong };
	}
	if (value === null) return { mode, summary, hasValue: false, wrong };

	// Règle (e) : pas de limite attendue ⇒ jamais une valeur
	if (expected === null) {
		wrong.push(`valeur rendue alors qu'il n'y a pas de limite`);
		return { mode, summary, hasValue: true, wrong };
	}
	// Règle (a) : valeur et statut coïncident avec l'attendu
	if (!sameNumber(value, expected)) wrong.push(`attendu ${entry.expected}`);
	if (result.status === 'infinite' && Number.isFinite(value)) {
		wrong.push('statut infinite pour une valeur finie');
	}
	if (result.status === 'exact' && !Number.isFinite(value)) {
		wrong.push('statut exact pour une valeur infinie');
	}
	// Règle (c) puis (b) : valeur exacte finie propre ET confirmée numériquement
	if (result.value && !isInfinity(result.value)) {
		wrong.push(...exactValueDefects(result.value));
		if (Number.isFinite(value)) {
			for (const points of samplePoints(borne, direction)) {
				if (!confirmsFinite(sampleValues(f, points), value)) {
					wrong.push(`démentie numériquement (f ≠ ${value} près de la borne)`);
					break;
				}
			}
		}
	}
	// Règle (d) : bilatérale rendue ⇒ gauche et droite rendent la même chose
	if (direction === 'both' && borne.kind === 'finite') {
		for (const side of ['left', 'right'] as const) {
			const sideResult = safeEvaluate(evaluator, side);
			if (sideResult instanceof Error) continue;
			if (sideResult.status === 'does-not-exist') {
				wrong.push(`bilatérale rendue mais côté ${side} : pas de limite`);
				continue;
			}
			let sideValue: number | null;
			try {
				sideValue = resultNumber(sideResult);
			} catch {
				sideValue = null;
			}
			if (sideValue !== null && !sameNumber(sideValue, value)) {
				wrong.push(`bilatérale ${summary} mais côté ${side} : ${describe(sideResult)}`);
			}
		}
	}
	return { mode, summary, hasValue: true, wrong };
}

/** Juge une entrée dans les deux modes. */
export function judgeEntry(entry: OracleEntry): Verdict {
	const built = buildLimit(entry);
	const borne = borneOf(entry, built.node);
	const f = compileFunction(built.expression, built.node.variable);
	const limitNode = built.node;
	const viaLim: Evaluator = (direction) =>
		evaluateLimit(direction === limitNode.direction ? limitNode : { ...limitNode, direction });
	const viaExpr: Evaluator = (direction) =>
		evaluateLimit(built.expression, limitNode.variable, limitNode.approach, direction);
	const outcomes = [
		judgeMode('lim', entry, viaLim, limitNode.direction, borne, f),
		judgeMode('expr', entry, viaExpr, limitNode.direction, borne, f)
	];
	const wrong = outcomes.some((o) => o.wrong.length > 0);
	const covered = !wrong && outcomes.some((o) => o.hasValue || isNoLimitFound(o, entry));
	const [lim, expr] = outcomes;
	// « Pas de limite » trouvé par \lim(…) aussi : pas d'écart (x^{-1/3} en 0)
	const parenthesesGap =
		built.latex.includes('\\left(') &&
		!lim.hasValue &&
		!isNoLimitFound(lim, entry) &&
		(expr.hasValue || isNoLimitFound(expr, entry));
	return { entry, outcomes, wrong, covered, parenthesesGap };
}

/** « pas de limite » correctement établi (attendu `none`, statut does-not-exist). */
function isNoLimitFound(outcome: ModeOutcome, entry: OracleEntry): boolean {
	return entry.expected === 'none' && outcome.summary === 'does-not-exist';
}

/** Ligne de rapport d'une entrée fausse. */
export function describeWrong(verdict: Verdict): string {
	const details = verdict.outcomes
		.filter((o) => o.wrong.length > 0)
		.map((o) => `[${o.mode}] ${o.summary} — ${o.wrong.join(' ; ')}`)
		.join(' | ');
	const { id, at, f, expected } = verdict.entry;
	return `${id} : lim ${verdict.entry.variable ?? 'x'}→${at} ${f}, attendu ${expected} → ${details}`;
}
