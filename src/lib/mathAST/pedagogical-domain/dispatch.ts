/**
 * Pedagogical Domain — Dispatcher
 *
 * Public entry point for the pedagogical domain pipeline. Parses the LaTeX
 * `expression`, instantiates a `DomainStepRecorder`, runs the instrumented
 * `computeDomain`, and returns the captured steps + final domain.
 *
 * V1 MVP: throws `PedagogicalDomainNotImplemented` if the expression
 * triggers a rule outside `V1_MVP_RULES` (e.g. `tan(x)`, `arccosh(x)`,
 * deeply nested compositions). Detection is heuristic: we run
 * `computeDomain`, then inspect the recorder. If the captured rules
 * include any rule outside V1_MVP_RULES, we throw.
 *
 * @module mathAST/pedagogical-domain/dispatch
 */

import type { MathNode } from '../types';
import { parseLatexSafe } from '../parser';
import { computeDomain, createDomainStepRecorder, intersect } from '../domain';
import { compile } from '../eval/compile';
import { findNodes } from '../transforms';
import type { Domain, DomainRule, EnhancedDomainStep } from '../domain';
import { LYCEE_FORBIDDEN_RULES } from '../domain/mvp-rules';
import {
	PedagogicalDomainNotImplemented,
	V1_MVP_RULES,
	type PedagogicalDomainOptions,
	type PedagogicalDomainResult,
	type PedagogicalDomainSchoolLevel
} from './types';

// =============================================================================
// String-shaped options (Mode B)
// =============================================================================

/**
 * Mode-B-friendly options shape, where the expression is a LaTeX string
 * (the format produced by template authors).
 */
export interface PedagogicalDomainDispatchOptions {
	/** LaTeX expression of `f(x)` (e.g. `'\\sqrt{x - 2}'`). */
	readonly expression: string;
	/** Variable. Default: `'x'`. */
	readonly variable?: string;
	/** School level. Required. */
	readonly schoolLevel: PedagogicalDomainSchoolLevel;
	/** Verbosity. Default: `'detailed'`. */
	readonly verbosity?: PedagogicalDomainOptions['verbosity'];
}

// =============================================================================
// Typed entry point
// =============================================================================

/**
 * Run the pedagogical domain pipeline on an already-parsed MathNode.
 *
 * @param expression - The expression to compute the domain of.
 * @param options - Pipeline options.
 * @returns The domain + recorded pedagogical steps.
 * @throws {PedagogicalDomainNotImplemented} If the expression triggers a
 *   rule outside V1 MVP scope, or no MVP rule applies (no constraint to
 *   teach).
 */
export function generatePedagogicalDomainSteps(
	expression: MathNode,
	options: PedagogicalDomainOptions
): PedagogicalDomainResult {
	const { schoolLevel, variable = 'x', verbosity = 'detailed' } = options;

	assertSupportedLevel(schoolLevel, expression);

	const recorder = createDomainStepRecorder();
	const result = computeDomain(expression, variable, {
		showSteps: true,
		verbosity,
		recorder
	});

	// Contrainte que le moteur n'a pas su résoudre (`\sqrt{\sin x}`,
	// `\frac{1}{x^5+x+1}`) : le domaine rendu est incomplet. Aucune étape
	// plutôt qu'une rédaction concluant à tort « Domaine : ℝ ».
	if (result.unresolved && result.unresolved.length > 0) {
		throw new PedagogicalDomainNotImplemented(
			expression,
			`unresolved constraints: ${result.unresolved.join(', ')}`
		);
	}

	const allSteps = recorder.getSteps();
	assertOnlyMvpRules(allSteps, expression);
	assertLevelAllowsRules(allSteps, schoolLevel, expression);

	const filtered = recorder.getStepsFiltered(verbosity);
	const constraintSteps = filtered.filter((s) => s.rule !== 'intersection');

	// Valeur interdite irrationnelle connue seulement en décimal
	// (`\frac{1}{x^3-2}` → 1.2599…) : pas d'étapes (décision Q3 du 2026-10-13)
	const shownDomains = [result.domain, ...filtered.flatMap((s) => s.intermediateDomain ?? [])];
	if (shownDomains.some(hasApproximateValue)) {
		throw new PedagogicalDomainNotImplemented(expression, 'approximate excluded value');
	}

	// Les étapes doivent PROUVER le domaine : l'intersection des ensembles
	// qu'elles montrent est le domaine du moteur. Sinon une contrainte est
	// appliquée sans être écrite (`\sqrt{x}+x^{-1/2}` : x > 0) et l'étape finale
	// affirmerait un domaine que la rédaction ne justifie pas.
	const proven = intersectionOfSteps(constraintSteps);
	if (proven === null || !sameSet(proven, result.domain)) {
		throw new PedagogicalDomainNotImplemented(
			expression,
			'recorded constraints do not yield the domain'
		);
	}

	if (filtered.length === 0) {
		return { steps: [synthesizeUniversalStep(result.domain)], domain: result.domain, variable };
	}

	return {
		steps: withFinalDomainStep(filtered, result.domain),
		domain: result.domain,
		variable
	};
}

/**
 * Chaque étape de contrainte montre l'ensemble de SA contrainte ; le domaine
 * se lit à l'étape d'intersection. Le moteur ne l'émet que si le domaine est
 * restreint : on l'ajoute dès qu'il y a plus d'une contrainte.
 */
function withFinalDomainStep(
	steps: readonly EnhancedDomainStep[],
	domain: Domain
): readonly EnhancedDomainStep[] {
	if (steps.length === 1 || steps.some((s) => s.rule === 'intersection')) return steps;
	const last = steps[steps.length - 1];
	return [
		...steps,
		{
			id: last.id + 1,
			rule: 'intersection',
			description: 'Intersection des contraintes',
			expression: '',
			constraint: '',
			intermediateDomain: domain,
			verbosityLevel: 'summarized'
		}
	];
}

// =============================================================================
// Ensembles : intersection et égalité par valeur
// =============================================================================

/** Intersection des ensembles des étapes ; `null` si elle ne se calcule pas. */
function intersectionOfSteps(steps: readonly EnhancedDomainStep[]): Domain | null {
	let result: Domain = { kind: 'universal' };
	for (const step of steps) {
		const set = step.intermediateDomain;
		if (set === undefined) return null;
		if (set.kind === 'universal') continue;
		if (result.kind === 'universal') {
			result = set;
			continue;
		}
		if (set.kind === 'periodic_exclusion' || result.kind === 'periodic_exclusion') {
			if (sameSet(set, result)) continue;
			return null;
		}
		if (set.kind === 'condition_domain' || result.kind === 'condition_domain') return null;
		result = intersect(result, set);
	}
	return result;
}

interface Piece {
	readonly lo: number;
	readonly loClosed: boolean;
	readonly hi: number;
	readonly hiClosed: boolean;
}

const TOLERANCE = 1e-9;

function near(a: number, b: number): boolean {
	if (!Number.isFinite(a) || !Number.isFinite(b)) return a === b;
	return Math.abs(a - b) <= TOLERANCE * Math.max(1, Math.abs(a));
}

/** Égalité de deux ensembles par valeur (et non par écriture). */
function sameSet(a: Domain, b: Domain): boolean {
	if (a.kind === 'periodic_exclusion' || b.kind === 'periodic_exclusion') {
		if (a.kind !== 'periodic_exclusion' || b.kind !== 'periodic_exclusion') return false;
		const pa = numberOf(a.period);
		const pb = numberOf(b.period);
		const ba = numberOf(a.basePoint);
		const bb = numberOf(b.basePoint);
		if (pa === null || pb === null || ba === null || bb === null || !near(pa, pb)) return false;
		const shift = (ba - bb) / pa;
		return near(shift, Math.round(shift));
	}
	const pa = toPieces(a);
	const pb = toPieces(b);
	if (pa === null || pb === null || pa.length !== pb.length) return false;
	return pa.every(
		(p, i) =>
			near(p.lo, pb[i].lo) &&
			near(p.hi, pb[i].hi) &&
			(p.loClosed === pb[i].loClosed || !Number.isFinite(p.lo)) &&
			(p.hiClosed === pb[i].hiClosed || !Number.isFinite(p.hi))
	);
}

/** Morceaux disjoints triés, points exclus retirés ; `null` si non évaluable. */
function toPieces(domain: Domain): Piece[] | null {
	if (domain.kind === 'empty') return [];
	if (domain.kind === 'universal') {
		return [{ lo: -Infinity, loClosed: false, hi: Infinity, hiClosed: false }];
	}
	if (domain.kind !== 'interval_set') return null;
	let pieces: Piece[] = [];
	for (const interval of domain.intervals) {
		const lo = numberOf(interval.lower.value);
		const hi = numberOf(interval.upper.value);
		if (lo === null || hi === null) return null;
		pieces.push({
			lo,
			loClosed: interval.lower.type === 'closed',
			hi,
			hiClosed: interval.upper.type === 'closed'
		});
	}
	for (const point of domain.excludedPoints) {
		const x = numberOf(point.value);
		if (x === null) return null;
		pieces = pieces.flatMap((p) => removePoint(p, x));
	}
	pieces = pieces.filter((p) => p.lo < p.hi || (near(p.lo, p.hi) && p.loClosed && p.hiClosed));
	pieces.sort((p, q) => p.lo - q.lo);
	const merged: Piece[] = [];
	for (const piece of pieces) {
		const last = merged[merged.length - 1];
		if (
			last !== undefined &&
			(last.hi > piece.lo + TOLERANCE ||
				(near(last.hi, piece.lo) && (last.hiClosed || piece.loClosed)))
		) {
			const hiFromPiece = piece.hi > last.hi || (near(piece.hi, last.hi) && piece.hiClosed);
			merged[merged.length - 1] = {
				lo: last.lo,
				loClosed: last.loClosed,
				hi: hiFromPiece ? piece.hi : last.hi,
				hiClosed: hiFromPiece ? piece.hiClosed : last.hiClosed
			};
		} else {
			merged.push(piece);
		}
	}
	return merged;
}

function removePoint(piece: Piece, x: number): Piece[] {
	if (near(x, piece.lo) && near(x, piece.hi)) return [];
	if (near(x, piece.lo)) return [{ ...piece, loClosed: false }];
	if (near(x, piece.hi)) return [{ ...piece, hiClosed: false }];
	if (x < piece.lo || x > piece.hi) return [piece];
	return [
		{ lo: piece.lo, loClosed: piece.loClosed, hi: x, hiClosed: false },
		{ lo: x, loClosed: false, hi: piece.hi, hiClosed: piece.hiClosed }
	];
}

function numberOf(node: MathNode): number | null {
	if (node.type === 'infinity') return node.sign === 'positive' ? Infinity : -Infinity;
	try {
		const value = compile(node)({});
		return typeof value === 'number' && Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/** Un nombre écrit avec plus de 6 décimales : une valeur approchée. */
function hasApproximateValue(domain: Domain): boolean {
	const nodes: MathNode[] = [];
	if (domain.kind === 'interval_set') {
		for (const i of domain.intervals) nodes.push(i.lower.value, i.upper.value);
		for (const p of domain.excludedPoints) nodes.push(p.value);
	} else if (domain.kind === 'periodic_exclusion') {
		nodes.push(domain.basePoint, domain.period);
	}
	return nodes.some(
		(node) => findNodes(node, (n) => n.type === 'number' && /\.\d{7,}/.test(n.value)).length > 0
	);
}

// =============================================================================
// String entry point (Mode B)
// =============================================================================

/**
 * Parse the LaTeX expression then run the pipeline.
 *
 * Throws `PedagogicalDomainNotImplemented` when:
 * - the expression cannot be parsed
 * - any of the throw conditions of the underlying pipeline fire
 */
export function dispatchPedagogicalDomain(
	options: PedagogicalDomainDispatchOptions
): PedagogicalDomainResult {
	const expression = parseExpression(options.expression);
	return generatePedagogicalDomainSteps(expression, {
		schoolLevel: options.schoolLevel,
		variable: options.variable,
		...(options.verbosity && { verbosity: options.verbosity })
	});
}

// =============================================================================
// Helpers
// =============================================================================

function assertSupportedLevel(
	schoolLevel: PedagogicalDomainSchoolLevel,
	expression: MathNode
): void {
	if (schoolLevel !== 'lycee' && schoolLevel !== 'superieur') {
		throw new PedagogicalDomainNotImplemented(
			expression,
			`schoolLevel "${schoolLevel}" not supported (lycee | superieur only)`
		);
	}
}

function assertOnlyMvpRules(steps: readonly EnhancedDomainStep[], expression: MathNode): void {
	const outOfScope: DomainRule[] = [];
	for (const step of steps) {
		if (!V1_MVP_RULES.has(step.rule)) {
			outOfScope.push(step.rule);
		}
	}
	if (outOfScope.length > 0) {
		throw new PedagogicalDomainNotImplemented(
			expression,
			`out-of-MVP rules in trace: ${outOfScope.join(', ')}`
		);
	}
}

/**
 * Throws when the trace contains rules that are out of syllabus at the
 * requested level. Currently only enforced for `lycee`: hyperbolic
 * inverses (`arccosh`, `arctanh`) are post-bac topics.
 */
function assertLevelAllowsRules(
	steps: readonly EnhancedDomainStep[],
	schoolLevel: PedagogicalDomainSchoolLevel,
	expression: MathNode
): void {
	if (schoolLevel !== 'lycee') return;
	const forbidden: DomainRule[] = [];
	for (const step of steps) {
		if (LYCEE_FORBIDDEN_RULES.has(step.rule)) {
			forbidden.push(step.rule);
		}
	}
	if (forbidden.length > 0) {
		throw new PedagogicalDomainNotImplemented(
			expression,
			`rules out of lycée syllabus: ${forbidden.join(', ')}`
		);
	}
}

function synthesizeUniversalStep(domain: Domain): EnhancedDomainStep {
	return {
		id: 1,
		rule: 'universal',
		description: 'Aucune restriction - domaine universel (ℝ)',
		expression: '',
		constraint: '',
		intermediateDomain: domain,
		reasoning: 'Aucune restriction particulière, le domaine est ℝ',
		verbosityLevel: 'summarized'
	};
}

function parseExpression(latex: string): MathNode {
	const trimmed = latex.trim();
	if (trimmed.length === 0) {
		throw new PedagogicalDomainNotImplemented(
			{ type: 'number', value: '0' },
			'empty expression string'
		);
	}

	const result = parseLatexSafe(trimmed);
	if (result.errors.length > 0 || !result.ast) {
		throw new PedagogicalDomainNotImplemented(
			{ type: 'number', value: '0' },
			`parse error: ${result.errors[0]?.message ?? 'unknown'}`
		);
	}
	return result.ast;
}
