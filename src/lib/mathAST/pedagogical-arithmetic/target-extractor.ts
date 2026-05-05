/**
 * Target Extractor
 *
 * Builds a `PedagogicalTarget` from question parameters via the cascade
 * `blank > variation > shared` (already merged into `QuestionInstance` /
 * `InstanceBlank` by the question generator).
 *
 * The extractor is the single entry point used by the pipeline orchestrator
 * to derive structural goals (`TargetForm`), strict cosmetic constraints,
 * answer-format hints, and validation rules — without the pipeline having
 * to know about the `QuestionInstance` shape.
 *
 * Design rationale (Phase 0 Q9, Q10) — see
 * `docs/wip/pedagogical-arithmetic-prompt.md` :
 *
 * - **Q9** (`expressionName`) : `InstanceBlank` has no `expressionName`
 *   field today. The signature accepts an explicit 3rd argument
 *   `expressionName?: string`. The caller (typically a Svelte correction
 *   component) knows the mapping `blank → expression` via
 *   `instance.expressions[]`. A future refactor can populate
 *   `InstanceBlank.expressionName` directly in `assign-blank-indices.ts` to
 *   make the 3rd arg redundant.
 *
 * - **Q10** (`structure: TargetForm`) : the `RequiredForm` field on the
 *   variation/blank is a *user-facing* form choice. The pedagogical
 *   pipeline needs the *wider* `TargetForm` (with `'scientific'`,
 *   `'reduced-fraction'`, `'decimal'`) to drive rule selection. Heuristics:
 *
 *     1. If `requiredForm` is a string member of `TargetForm`, pass through
 *        unchanged. Pattern objects (`{ pattern: '…' }`) are dropped from the
 *        target structure (the orchestrator handles patterns separately).
 *     2. If `answerFormat` looks scientific (`'10^?'`, `'? × 10^?'`, …), set
 *        `'scientific'` (overrides 1 if 1 also matches).
 *     3. If `reducedFractions: 'strict'` AND the structure is a fraction (or
 *        the answerFormat is fraction-shaped), set `'reduced-fraction'`.
 *     4. If `precision.type === 'decimal'` AND no fraction context, set
 *        `'decimal'`.
 *     5. Otherwise leave `structure` undefined (no driver-form heuristic
 *        applies).
 *
 * @module mathAST/pedagogical-arithmetic/target-extractor
 */

import type {
	ConstraintMode,
	ConstraintOptions,
	InstanceBlank,
	PrecisionType,
	QuestionInstance,
	RequiredForm,
	ValidationRule
} from '$lib/questions/types';
import type { PedagogicalTarget, TargetForm } from '../pedagogical-evaluate/types';
import { classifyAnswerFormat } from './answer-format-parser';

// =============================================================================
// Public API
// =============================================================================

/**
 * Build a `PedagogicalTarget` from a `QuestionInstance` and (optionally) a
 * specific blank + expression name.
 *
 * Cascade rules (in order):
 *   - `blank` overrides values from the instance
 *   - the instance carries variation/shared values already merged
 *
 * Returns a frozen-shape `PedagogicalTarget` with all derivable fields set.
 * Fields the question doesn't specify are left `undefined` — callers should
 * read them defensively.
 *
 * @param instance       The generated question instance
 * @param blank          Optional specific blank being analyzed (math blanks
 *                       drive cosmetic and form constraints).
 * @param expressionName Optional name of the expression linked to this blank.
 *                       Used to look up `instance.expressions[*].answerFormat`.
 *                       The caller is responsible for knowing this mapping —
 *                       see Q9 in the prompt.
 */
export function extractPedagogicalTarget(
	instance: QuestionInstance,
	blank?: InstanceBlank,
	expressionName?: string
): PedagogicalTarget {
	const requiredForm: RequiredForm | undefined = blank?.requiredForm ?? instance.requiredForm;
	const precision: PrecisionType | undefined = blank?.precision;
	const validationRules: readonly ValidationRule[] | undefined =
		blank?.validationRules ?? instance.validationRules;
	const unit = blank?.unit;
	const answerFormat = lookupAnswerFormat(instance, expressionName);
	const strictCosmetics = filterStrictMode(instance.options?.constraints);
	const structure = deriveTargetForm({
		requiredForm,
		answerFormat,
		strictCosmetics,
		precision
	});

	return {
		structure,
		precision,
		answerFormat,
		unit,
		strictCosmetics,
		validationRules
	};
}

// =============================================================================
// Field accessors
// =============================================================================

/**
 * Look up the resolved `answerFormat` for a given expression name on the
 * instance. Returns `undefined` when the expression is absent or has no
 * format set.
 */
function lookupAnswerFormat(
	instance: QuestionInstance,
	expressionName: string | undefined
): string | undefined {
	if (!expressionName) return undefined;
	const exprs = instance.expressions;
	if (!exprs || exprs.length === 0) return undefined;
	const found = exprs.find((e) => e.name === expressionName);
	return found?.answerFormat;
}

/**
 * Filter `ConstraintOptions` to keep ONLY the keys whose mode is `'strict'`.
 *
 * Modes other than `'strict'` (`'warn'`, `'off'`) do not impose a structural
 * pedagogical commitment — they only affect feedback. The pedagogical
 * pipeline reads only strict modes to decide post-processing (force a
 * fraction reduction, prefer `5 - 3` over `5 + (-3)`, …).
 *
 * Returns `undefined` when no strict mode is present (so callers can use
 * truthy checks).
 */
function filterStrictMode(
	constraints?: ConstraintOptions
):
	| Pick<ConstraintOptions, 'reducedFractions' | 'signs' | 'nullTerms' | 'factorOne' | 'zeros'>
	| undefined {
	if (!constraints) return undefined;
	const STRICT_KEYS = ['reducedFractions', 'signs', 'nullTerms', 'factorOne', 'zeros'] as const;
	const result: Partial<Record<(typeof STRICT_KEYS)[number], ConstraintMode>> = {};
	let hasAny = false;
	for (const key of STRICT_KEYS) {
		if (constraints[key] === 'strict') {
			result[key] = 'strict';
			hasAny = true;
		}
	}
	return hasAny ? (result as Pick<ConstraintOptions, (typeof STRICT_KEYS)[number]>) : undefined;
}

// =============================================================================
// TargetForm derivation
// =============================================================================

interface DeriveContext {
	requiredForm?: RequiredForm;
	answerFormat?: string;
	strictCosmetics?: ReturnType<typeof filterStrictMode>;
	precision?: PrecisionType;
}

/**
 * Members of `RequiredForm` that are valid `TargetForm` values without
 * additional widening. Excludes `{ pattern }` objects which cannot directly
 * map to a `TargetForm` member.
 */
const FORM_PASSTHROUGH = new Set<RequiredForm>(['product', 'sum', 'fraction', 'power']);

/**
 * Derive a `TargetForm` from the available signals.
 *
 * Order of precedence (top wins) :
 *   1. `'scientific'` — `answerFormat` is scientific (overrides everything,
 *      because the format dictates the LITERAL final structure).
 *   2. `'reduced-fraction'` — `reducedFractions: 'strict'` AND a fraction
 *      context (either `requiredForm: 'fraction'` OR fraction-shaped
 *      `answerFormat`). Without a fraction context, falls through.
 *   3. Pass-through — `requiredForm` is one of the predefined `TargetForm`
 *      string members. `{ pattern }` requiredForms drop here.
 *   4. `'decimal'` — `precision.type === 'decimal'` AND no fraction context.
 *   5. `undefined` — no heuristic applies.
 */
function deriveTargetForm(ctx: DeriveContext): TargetForm | undefined {
	// Heuristic 2 first — scientific notation strongly overrides other
	// signals because it dictates the LITERAL final structure.
	if (ctx.answerFormat && classifyAnswerFormat(ctx.answerFormat) === 'scientific') {
		return 'scientific';
	}

	// Heuristic 3 — reduced-fraction only when context is fraction-shaped.
	const strict = ctx.strictCosmetics?.reducedFractions === 'strict';
	const fractionContext =
		ctx.requiredForm === 'fraction' ||
		(ctx.answerFormat !== undefined && classifyAnswerFormat(ctx.answerFormat) === 'fraction');
	if (strict && fractionContext) {
		return 'reduced-fraction';
	}

	// Heuristic 1 — pass-through pre-defined RequiredForm strings.
	if (typeof ctx.requiredForm === 'string' && FORM_PASSTHROUGH.has(ctx.requiredForm)) {
		return ctx.requiredForm;
	}

	// Heuristic 4 — decimal precision without a fraction context.
	if (ctx.precision?.type === 'decimal' && !fractionContext) {
		return 'decimal';
	}

	// Heuristic 5 — fallback.
	return undefined;
}
