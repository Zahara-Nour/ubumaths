/**
 * Pedagogical Domain — Types
 *
 * Domain-specific types for the pedagogical domain pipeline. Layered on top of
 * the algorithmic `computeDomain()` (in `domain/compute.ts`) which has been
 * instrumented in this MVP to emit `EnhancedDomainStep[]` via
 * `DomainStepRecorder`.
 *
 * Design rationale (Option C — direct instrumentation) — see
 * `docs/wip/domain-renderer-prompt.md` :
 *
 * Empirical spike on `computeDomain()` showed that `result.steps` was
 * `undefined` on every test case (`√(x-2)`, `1/x`, `ln(x²-1)`, …) even with
 * `showSteps: true`. The `DomainStepRecorder` infrastructure (recorder
 * implementation, descriptions, templates) was built and tested in isolation
 * but never wired to the engine. This pedagogical layer wires the recorder
 * into the engine via instrumentation in `domain/compute.ts`, then renders
 * the captured steps with school-level vocabulary.
 *
 * V1 MVP scope (5 rules):
 * - sqrt_constraint
 * - ln_constraint / log_constraint
 * - division_constraint
 * - arcsin_constraint / arccos_constraint
 * - intersection
 *
 * V1.1 (out of MVP scope, throws `PedagogicalDomainNotImplemented`):
 * - tan/cot/sec/csc constraints (periodic_exclusion)
 * - preimage_linear / preimage_quadratic / preimage_cubic
 * - composition / composition_range_analysis
 * - union / complement / difference
 * - power_constraint / even_root_constraint
 * - arccosh_constraint / arctanh_constraint (sup only)
 *
 * @module mathAST/pedagogical-domain/types
 */

import type { MathNode } from '../types';
import type { SchoolLevel } from '../common/step-renderer-base';
import type { Verbosity } from '../common/verbosity';
import type { Domain, EnhancedDomainStep } from '../domain';
import { V1_MVP_RULES as V1_MVP_RULES_SHARED } from '../domain/mvp-rules';

// =============================================================================
// School Level
// =============================================================================

/**
 * School levels covered by the pedagogical domain pipeline.
 *
 * Domain of definition is on the syllabus from 2nde (lycée) onwards, so
 * `primaire` and `college` are deliberately excluded. Calling the pipeline
 * with one of these levels throws `PedagogicalDomainNotImplemented`.
 */
export type PedagogicalDomainSchoolLevel = Exclude<SchoolLevel, 'primaire' | 'college'>;

// =============================================================================
// V1 MVP Rule Set (re-export from shared `domain/mvp-rules.ts`)
// =============================================================================

/**
 * The subset of `DomainRule` covered by the V1 MVP. Used by the dispatcher
 * to decide whether to throw `PedagogicalDomainNotImplemented` and by the
 * renderer to look up titles/explanations.
 *
 * Re-exported from `domain/mvp-rules.ts` (single source of truth, kept in
 * `domain/` to avoid the circular dep `domain/` → `pedagogical-domain/`).
 */
export const V1_MVP_RULES = V1_MVP_RULES_SHARED;

// =============================================================================
// Generation Strategy (per school level)
// =============================================================================

/**
 * Per-level configuration controlling vocabulary register.
 *
 * - `vocab` : `'didactic'` at lycée (full sentences, named theorems),
 *   `'compact'` at supérieur (symbolic shorthand, terse).
 * - `verbosityCompactConclusion` : at sup, the conclusion is one line; at
 *   lycée, an explicit step closes the chain.
 */
export interface DomainGenerationStrategy {
	readonly vocab: 'didactic' | 'compact';
	readonly verbosityCompactConclusion: boolean;
}

/**
 * Strategy table for the supported school levels.
 *
 * `primaire` and `college` are intentionally absent — domain of definition
 * is not on the syllabus before 2nde.
 */
export const STRATEGIES_DOMAIN: Readonly<
	Record<PedagogicalDomainSchoolLevel, DomainGenerationStrategy>
> = {
	lycee: { vocab: 'didactic', verbosityCompactConclusion: false },
	superieur: { vocab: 'compact', verbosityCompactConclusion: true }
};

// =============================================================================
// Pipeline Options & Result
// =============================================================================

/**
 * Typed options accepted by `generatePedagogicalDomainSteps()`.
 *
 * The expression is provided as a `MathNode` (already parsed). The string
 * entry point used by Mode B lives in `dispatch.ts` and parses LaTeX up front.
 */
export interface PedagogicalDomainOptions {
	/** Target school level. Drives strategy selection and vocabulary. */
	readonly schoolLevel: PedagogicalDomainSchoolLevel;

	/** Variable to compute the domain for. Default: `'x'`. */
	readonly variable?: string;

	/** Verbosity level — affects which steps are emitted. Default: `'detailed'`. */
	readonly verbosity?: Verbosity;

	/** External AbortSignal for cooperative interruption. */
	readonly signal?: AbortSignal;

	/** Wall-clock budget in ms (best-effort cooperative check). */
	readonly timeoutMs?: number;
}

/**
 * Output of running the pedagogical domain pipeline.
 */
export interface PedagogicalDomainResult {
	/** Recorded steps (filtered by verbosity). */
	readonly steps: readonly EnhancedDomainStep[];

	/** The computed domain. */
	readonly domain: Domain;

	/** The variable used in the computation. */
	readonly variable: string;
}

// =============================================================================
// Errors
// =============================================================================

/**
 * Error thrown when a pedagogical domain cannot be computed within the V1
 * MVP scope.
 *
 * Caught by `correction-generator.ts` to fall back silently to Mode A. The
 * `expression` and `reason` fields are debug-only and not surfaced in the
 * UI — the silent fallback produces no log either (consistent with the 9
 * other Mode B kinds).
 *
 * Throw cases :
 *
 * - `schoolLevel === 'primaire' || 'college'` (out of syllabus)
 * - The expression triggers a rule outside the V1 MVP set (V1_MVP_RULES) —
 *   e.g. `tan(x)` (periodic_exclusion), `arccosh(x)` (sup-only), nested
 *   compositions (V1.1 scope)
 * - Parse error in the expression string
 */
export class PedagogicalDomainNotImplemented extends Error {
	readonly expression: MathNode;
	readonly reason?: string;

	constructor(expression: MathNode, reason?: string) {
		super(`Pedagogical domain not implemented${reason ? `: ${reason}` : ''}`);
		this.name = 'PedagogicalDomainNotImplemented';
		this.expression = expression;
		this.reason = reason;
	}
}
