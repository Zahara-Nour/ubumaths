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
import { computeDomain, createDomainStepRecorder, formatInterval } from '../domain';
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

	// Aucune contrainte enregistrée : le domaine doit être ℝ. Une contrainte
	// que le moteur applique sans l'enregistrer (`x^{-1/2}` : x > 0) donnerait
	// sinon une étape « Domaine : ℝ » fausse.
	if (filtered.length === 0) {
		if (result.domain.kind !== 'universal') {
			throw new PedagogicalDomainNotImplemented(
				expression,
				'restricted domain without a recorded constraint'
			);
		}
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
 * se lit à l'étape d'intersection. Le moteur ne l'émet qu'au-delà d'une
 * contrainte : avec une seule, on l'ajoute si l'ensemble de la contrainte
 * n'est pas le domaine (contrainte appliquée sans être enregistrée).
 */
function withFinalDomainStep(
	steps: readonly EnhancedDomainStep[],
	domain: Domain
): readonly EnhancedDomainStep[] {
	if (steps.some((s) => s.rule === 'intersection')) return steps;
	const last = steps[steps.length - 1];
	const shown = last.intermediateDomain;
	if (steps.length === 1 && shown !== undefined && sameDomain(shown, domain)) return steps;
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

/** Deux domaines égaux, comparés par leur écriture. */
function sameDomain(a: Domain, b: Domain): boolean {
	return formatInterval(a) === formatInterval(b);
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
