/**
 * Lecture commune des cases « primitive » et « solution-ed »
 * ==========================================================
 *
 * Une réponse est une expression en une variable (`x` par défaut) ; toute autre
 * lettre (`C`, `K`, `k`, `\lambda`…) est une CONSTANTE, sauf `e`, `i` et `π`.
 * Rien n'est calculé ici : la lecture est celle de mathAST (`parseLatexSafe`),
 * la comparaison son décideur (`areEquivalent`), sous budget.
 *
 * @module questions/calculus/calculus-reading
 */

import type { MathNode } from '$lib/mathAST/types';
import type { Domain } from '$lib/mathAST/domain/types';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { areEquivalent } from '$lib/mathAST/equivalence';
import { differentiate } from '$lib/mathAST/differentiation/differentiate';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import { computeNumericValue } from '$lib/mathAST/solve/numeric-value';
import { isInfinity } from '$lib/mathAST/guards';
import { stripLatexSpacing } from '$lib/math';
import { isAnswerTooComplex } from '$lib/questions/answer-complexity';
import { readExpectedIntervals } from '$lib/questions/intervals/interval-answer';

// Types
export interface CalculusVerdict {
	status: 'correct' | 'incorrect' | 'empty';
	/** Message montré à l'élève (dérivée au lieu d'une primitive, constante manquante) */
	feedback?: string;
}

export type ExpectedCheck = { ok: true } | { ok: false; error: string };

// Constantes

/** Variable par défaut */
export const DEFAULT_VARIABLE = 'x';

/** Lettres qui ne sont jamais des constantes d'intégration : Euler, imaginaire, π */
const RESERVED_NAMES = new Set(['e', 'i', 'pi']);

/** Budget d'UNE comparaison (la garde Q58 a déjà filtré l'écriture) */
const EQUIVALENCE_BUDGET_MS = 300;

/** Nom d'une variable ou d'une fonction : une lettre */
export const SINGLE_LETTER_REGEX = /^[A-Za-z]$/;

/** Préfixe toléré : `F(x)=`, `y(x)=`, `y=` */
const NAME_PREFIX_REGEX = /^\s*[A-Za-z]\s*(?:\(\s*[A-Za-z]\s*\))?\s*=(?!=)/;

/** Tolérance relative des comparaisons numériques (condition initiale) */
const NUMERIC_TOLERANCE = 1e-9;

/** Points d'essai sur ℝ (ni entiers ni symétriques : pas de coïncidence) */
const REAL_LINE_POINTS = [-2.73, -1.31, -0.37, 0.41, 1.29, 2.87];

/** Décalages d'essai depuis une borne finie d'un intervalle non borné */
const UNBOUNDED_OFFSETS = [0.07, 0.43, 1.31, 3.7, 11.3];

/** Fractions d'essai d'un intervalle borné */
const BOUNDED_FRACTIONS = [0.07, 0.29, 0.51, 0.73, 0.93];

// Functions

/**
 * Une expression écrite (réponse de l'élève ou champ de l'auteur) : nœud
 * mathAST, `null` si illisible, trop complexe ou si c'est une relation.
 * Le préfixe `F(x)=` / `y=` est toléré.
 */
export function readExpression(text: string): MathNode | null {
	if (!text.trim() || isAnswerTooComplex(text)) return null;
	try {
		const body = text.replace(NAME_PREFIX_REGEX, '');
		const { ast, errors } = parseLatexSafe(stripLatexSpacing(body, 'decimal'));
		if (!ast || (errors && errors.length > 0)) return null;
		if (ast.type === 'relation') return null;
		return ast;
	} catch {
		return null;
	}
}

/** Lettres libres d'une expression autres que la variable : ses constantes */
export function constantNames(node: MathNode, variable: string): string[] {
	return [...getVariables(node)].filter((name) => name !== variable && !RESERVED_NAMES.has(name));
}

/** Équivalence sous budget ; une réduction qui échoue vaut « non » */
export function equivalent(a: MathNode, b: MathNode): boolean {
	try {
		return areEquivalent(a, b, { timeoutMs: EQUIVALENCE_BUDGET_MS });
	} catch {
		return false;
	}
}

/** Dérivée par mathAST ; `null` si elle échoue */
export function derivative(node: MathNode, variable: string): MathNode | null {
	try {
		return differentiate(node, { variable });
	} catch {
		return null;
	}
}

/** Valeur numérique réelle de `node` sous `bindings`, `null` si non définie */
export function numericValue(node: MathNode, bindings: Record<string, number>): number | null {
	try {
		return computeNumericValue(substitute(node, bindings));
	} catch {
		return null;
	}
}

/** Deux valeurs numériques égales à la tolérance près */
export function nearlyEqual(a: number, b: number): boolean {
	return Math.abs(a - b) <= NUMERIC_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

/** Borne infinie : `+\infty`, `-\infty` (nœud signé ou opposé) */
function isInfiniteBound(value: MathNode): boolean {
	return isInfinity(value) || (value.type === 'opposite' && isInfinity(value.operand));
}

/** Points d'essai à l'intérieur d'un intervalle `]lower ; upper[` */
function pointsBetween(lower: number | null, upper: number | null): number[] {
	if (lower !== null && upper !== null) {
		return BOUNDED_FRACTIONS.map((t) => lower + t * (upper - lower));
	}
	if (lower !== null) return UNBOUNDED_OFFSETS.map((d) => lower + d);
	if (upper !== null) return UNBOUNDED_OFFSETS.map((d) => upper - d);
	return REAL_LINE_POINTS;
}

/** Points d'essai d'un ensemble lu par `readExpectedIntervals` ; `null` si inutilisable */
function domainPoints(domain: Domain): number[] | null {
	if (domain.kind === 'universal') return REAL_LINE_POINTS;
	if (domain.kind !== 'interval_set' || domain.intervals.length === 0) return null;
	const points: number[] = [];
	for (const interval of domain.intervals) {
		const lowerInfinite = isInfiniteBound(interval.lower.value);
		const upperInfinite = isInfiniteBound(interval.upper.value);
		const lower = lowerInfinite ? null : computeNumericValue(interval.lower.value);
		const upper = upperInfinite ? null : computeNumericValue(interval.upper.value);
		if ((!lowerInfinite && lower === null) || (!upperInfinite && upper === null)) return null;
		if (lower !== null && upper !== null && lower >= upper) return null;
		points.push(...pointsBetween(lower, upper));
	}
	return points;
}

/**
 * Points d'essai d'un intervalle écrit par l'auteur (`]0;+\infty[`, `[1;e]`) ;
 * `{ ok: false }` s'il est illisible ou réduit à des points isolés.
 */
export function readIntervalPoints(
	interval: string
): { ok: true; points: number[] } | { ok: false; error: string } {
	const read = readExpectedIntervals(interval);
	if (!read.ok) return { ok: false, error: `intervalle illisible « ${interval} »` };
	const points = domainPoints(read.domain);
	return points
		? { ok: true, points }
		: { ok: false, error: `intervalle inutilisable « ${interval} »` };
}
