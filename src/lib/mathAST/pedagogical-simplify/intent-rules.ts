/**
 * Pedagogical Simplify — Intent dispatcher and rule categorization.
 *
 * Pure helpers (no side effects, no IO) used by the Phase 2 pipeline:
 *
 *  - `selectRulesForIntent(intent, flags)` — returns the active pattern rules
 *    for a given intent + which capability flags are on, plus a boolean that
 *    tells the pipeline whether to run a normalize pass after the pattern
 *    passes (`developper` only : `reduire` and `auto` finish with `tidy`,
 *    chantier simplify-carte § 33).
 *
 *  - `categorizeRule(name)` — maps both pattern rule names (from
 *    `pattern/rule-sets/*`) and normalize step names (recorded by
 *    `normal/normalize.ts`) to a pedagogical category. Falls back to
 *    `'autre'` for parity, complex-algebra and other cross-cutting rules.
 *
 * The two namespaces are disjoint (pattern names like `'pythagorean'` never
 * collide with normalize names like `'combine-like-terms'`), so a single
 * map is enough.
 *
 * @module mathAST/pedagogical-simplify/intent-rules
 */

import type { Rule } from '../pattern/types';
import {
	absReduceRules,
	absSimplifyRules,
	hypSimplifyRules,
	expFunctionRules,
	logExpRules,
	powerRules,
	sqrtRules,
	trigNegativeAngleRules,
	trigPeriodicRules,
	trigSimplifyRules
} from '../pattern/rule-sets';
// Direct import (bypassing the rule-sets barrel) to avoid a Rollup chunk-cycle
// warning between `rule-sets/index.ts` and `algebraic-identities.ts`.
import { algebraicExpandingRules } from '../pattern/rule-sets/algebraic-identities';
// Import direct lui aussi, pour la même raison de cycle de chunk.
import { commonFactorRules } from '../pattern/rule-sets/common-factor';
import { distributeBinomialProduct } from './pedagogical-rules';
import { factoriserIdentityRules } from './pedagogical-rules/polynomial-identities';
import type { PedagogicalSimplifyCategory, SimplifyIntent } from './types';

// =============================================================================
// Intent dispatcher
// =============================================================================

/**
 * Capability flags consulted by the dispatcher. Mirrors a subset of
 * `PedagogicalSimplifyOptions`.
 */
export interface IntentRuleFlags {
	readonly enableTrig: boolean;
	readonly enableLogExp: boolean;
	readonly enableAbs: boolean;
	readonly enableHyperbolic: boolean;
}

export interface SelectedRules {
	/** Pattern rules active for the intent + flags. No duplicates. */
	readonly rules: readonly Rule[];

	/**
	 * Whether the pipeline should run a normalize pass after pattern rules.
	 * `true` for `'developper'` only. `false` for `'factoriser'` (normalize
	 * would undo the factoring), and for `'reduire'` / `'auto'` : normalize
	 * develops everything (`2(x+3) → 2x+6`), they finish with `tidy`.
	 */
	readonly useNormalize: boolean;
}

/**
 * Drop entries whose `name` already appeared earlier in the list (first wins).
 * Exported so Phase 2 helpers that assemble multi-source rule arrays don't
 * re-implement the single-pass `Set` approach.
 */
export function dedupeByName(rules: readonly Rule[]): readonly Rule[] {
	const seen = new Set<string>();
	const out: Rule[] = [];
	for (const r of rules) {
		if (seen.has(r.name)) continue;
		seen.add(r.name);
		out.push(r);
	}
	return out;
}

/**
 * Build the active rule set for a given intent.
 *
 * Each intent assembles a different mix of rule sources :
 *
 *  - `factoriser`  : `commonFactorRules` + `factoriserIdentityRules` (les
 *                    identités de `algebraicFactoringRules`, les numériques
 *                    lues par coefficients) + identities (trig / log-exp /
 *                    abs / hyperbolic) gated by flags. No expansion rules.
 *                    `useNormalize: false` (would undo the factoring). Le
 *                    pipeline ajoute le contenu des sommes maximales et les
 *                    stratégies de `factor-strategies.ts` (ADR 0024).
 *
 *  - `developper`  : `algebraicExpandingRules` + identities. No factoring.
 *                    `useNormalize: true` (combine-like-terms after expand).
 *
 *  - `reduire`     : identities + powers + sqrt rules. Neither factoring nor
 *                    expansion. `useNormalize: false` : the pipeline finishes
 *                    with `tidy`, told in steps (`reduce-steps.ts`).
 *
 *  - `auto`        : the same rules as `reduire`, never factoring (ADR 0007 :
 *                    the symbolic factoring rules made `x²+2x+1` go to
 *                    `(x+1)²` and back on screen). The pipeline adds the
 *                    polynomial fractions and « expand only if shorter »
 *                    (`reduce-steps.ts`). `useNormalize: false`.
 */
export function selectRulesForIntent(
	intent: SimplifyIntent,
	flags: IntentRuleFlags
): SelectedRules {
	const identitiesAndUtilities: Rule[] = [];
	if (flags.enableTrig) identitiesAndUtilities.push(...trigSimplifyRules);
	if (flags.enableLogExp) identitiesAndUtilities.push(...logExpRules);
	if (flags.enableAbs) identitiesAndUtilities.push(...absSimplifyRules);
	if (flags.enableHyperbolic) identitiesAndUtilities.push(...hypSimplifyRules);

	switch (intent) {
		case 'factoriser': {
			// ⚠️ La mise en facteur commun n'existait pas : `algebraicFactoringRules`
			// ne contient que des identités remarquables. Sans elle, `eˣ + x·eˣ`
			// restait tel quel au lieu de devenir `(x+1)eˣ`.
			// Les identités numériques y sont lues par coefficients (`4x² − 25`),
			// facteurs dans l'ordre du noyau : `factoriserIdentityRules` (ADR 0024).
			const rules = dedupeByName([
				...commonFactorRules,
				...factoriserIdentityRules,
				...identitiesAndUtilities
			]);
			return { rules, useNormalize: false };
		}
		case 'developper': {
			const rules = dedupeByName([
				...algebraicExpandingRules,
				distributeBinomialProduct,
				...identitiesAndUtilities
			]);
			return { rules, useNormalize: true };
		}
		case 'reduire':
		case 'auto': {
			// Ce que `normalize` faisait en silence : parité et période (`cos(−x) → cos(x)`),
			// `|−x| = |x|`, `||x|| = |x|`, `ln(exp(x))`, `exp(a)·exp(b)`. Ici seulement :
			// dans `factoriser`, `exp-product` passerait avant la mise en facteur et
			// détruirait le facteur commun (`exp(x)exp(x)+exp(x)`, revue du lot 3)
			const trigReductions = flags.enableTrig
				? [...trigNegativeAngleRules, ...trigPeriodicRules]
				: [];
			const absReductions = flags.enableAbs ? absReduceRules : [];
			const expReductions = flags.enableLogExp ? expFunctionRules : [];
			const rules = dedupeByName([
				...identitiesAndUtilities,
				...expReductions,
				...trigReductions,
				...absReductions,
				...powerRules,
				...sqrtRules
			]);
			return { rules, useNormalize: false };
		}
	}
}

// =============================================================================
// Rule categorization
// =============================================================================

/**
 * Static map from rule name → pedagogical category.
 *
 * Covers BOTH:
 *  - pattern rule names (`pattern/rule-sets/*` — `'pythagorean'`,
 *    `'diff-squares-symbolic'`, `'expand-sum-squared'`, etc.),
 *  - normalize step names (`normal/normalize.ts` — `'combine-like-terms'`,
 *    `'simplify-fraction'`, `'radical-simplify'`, etc.).
 *
 * Unknown / cross-cutting rules (parity, complex algebra, rounding) fall
 * through to `'autre'`.
 *
 * Rule-of-thumb when adding a category :
 *  - structural rewriting (a+b)(a-b)/(a±b)² → `distribution` or `factorisation`
 *  - fixed identity (sin²+cos²=1, ln(ab)) → `identites-trig` / `identites-log-exp`
 *  - polynomial arithmetic (combine-like-terms, double-neg) → `combinaison-termes-semblables`
 *  - rational arithmetic on numbers → `fractions`
 *  - a^n laws → `puissances`
 *  - √-laws → `radicaux`
 *  - |x|-laws → `valeur-absolue`
 */
const RULE_CATEGORY_MAP: ReadonlyMap<string, PedagogicalSimplifyCategory> = new Map([
	// ---- valeur-absolue -------------------------------------------------------
	['abs-negation', 'valeur-absolue' as PedagogicalSimplifyCategory],
	['abs-idempotent', 'valeur-absolue'],
	['abs-product', 'valeur-absolue'],
	['abs-quotient', 'valeur-absolue'],
	['abs-positive', 'valeur-absolue'],
	['abs-negative', 'valeur-absolue'],
	['abs-even-pow', 'valeur-absolue'],
	['abs-pow-even', 'valeur-absolue'],
	// normalize-side abs steps
	['abs-even-power', 'valeur-absolue'],
	['abs-function', 'valeur-absolue'],

	// ---- factorisation --------------------------------------------------------
	['diff-squares-symbolic', 'factorisation'],
	['diff-squares-numeric', 'factorisation'],
	['perfect-square-trinomial', 'factorisation'],
	['sum-cubes-symbolic', 'factorisation'],
	['sum-cubes-numeric', 'factorisation'],
	['diff-cubes-symbolic', 'factorisation'],
	['diff-cubes-numeric', 'factorisation'],
	['common-factor-products', 'factorisation'],
	['common-factor-bare-term', 'factorisation'],
	['common-factor-content-add', 'factorisation'],
	['common-factor-content-sub', 'factorisation'],
	['trinomial-roots', 'factorisation'],
	['trinomial-integer-form', 'factorisation'],
	['evident-root', 'factorisation'],

	// ---- distribution ---------------------------------------------------------
	['expand-sum-squared', 'distribution'],
	['expand-diff-squared', 'distribution'],
	['product-to-diff-squares', 'distribution'],
	['distribute-binomial-product', 'distribution'],
	['develop-to-factor', 'distribution'],
	['expand', 'distribution'],

	// ---- identites-trig -------------------------------------------------------
	['pythagorean', 'identites-trig'],
	['one-minus-sin-squared', 'identites-trig'],
	['one-minus-cos-squared', 'identites-trig'],
	['tan-squared-plus-one', 'identites-trig'],
	['cot-squared-plus-one', 'identites-trig'],
	['sec-squared-minus-one', 'identites-trig'],
	['csc-squared-minus-one', 'identites-trig'],
	['sin-squared', 'identites-trig'],
	['cos-squared', 'identites-trig'],
	['sin-cubed', 'identites-trig'],
	['cos-cubed', 'identites-trig'],
	['sin-fourth', 'identites-trig'],
	['cos-fourth', 'identites-trig'],
	['sin-negative', 'identites-trig'],
	['cos-negative', 'identites-trig'],
	['tan-negative', 'identites-trig'],
	['sin-period-2pi', 'identites-trig'],
	['cos-period-2pi', 'identites-trig'],
	['sin-plus-pi', 'identites-trig'],
	['cos-plus-pi', 'identites-trig'],
	['tan-plus-pi-over-2', 'identites-trig'],
	['sin-plus-pi-over-2', 'identites-trig'],
	['cos-plus-pi-over-2', 'identites-trig'],
	['sin-cofunction', 'identites-trig'],
	['cos-cofunction', 'identites-trig'],
	['tan-cofunction', 'identites-trig'],
	['sin-supplementary', 'identites-trig'],
	['cos-supplementary', 'identites-trig'],
	['tan-supplementary', 'identites-trig'],
	['sin-over-cos', 'identites-trig'],
	['cos-over-sin', 'identites-trig'],
	['cos-over-sin-simplify', 'identites-trig'],
	['one-over-sin', 'identites-trig'],
	['one-over-cos', 'identites-trig'],
	['sin-cos-product', 'identites-trig'],
	['sin-cos-different', 'identites-trig'],
	['sin-sin-product', 'identites-trig'],
	['cos-cos-product', 'identites-trig'],
	['double-angle-sin', 'identites-trig'],
	['expand-double-sin', 'identites-trig'],
	['expand-double-cos', 'identites-trig'],
	['expand-double-tan', 'identites-trig'],
	['sin-sum', 'identites-trig'],
	['cos-sum', 'identites-trig'],
	['tan-sum', 'identites-trig'],
	['sin-difference', 'identites-trig'],
	['cos-difference', 'identites-trig'],
	['tan-difference', 'identites-trig'],
	['sin-half-angle', 'identites-trig'],
	['cos-half-angle', 'identites-trig'],
	['tan-half-angle', 'identites-trig'],
	['sin-remarkable', 'identites-trig'],
	['cos-remarkable', 'identites-trig'],
	['tan-remarkable', 'identites-trig'],
	// normalize-side trig steps
	['trig-known-value', 'identites-trig'],
	['trig-pi-shift', 'identites-trig'],
	['inverse-trig-special-value', 'identites-trig'],
	['cos-pi', 'identites-trig'],
	['cos-zero', 'identites-trig'],
	['sin-pi', 'identites-trig'],
	['sin-zero', 'identites-trig'],
	['tan-zero', 'identites-trig'],

	// ---- identites-log-exp ----------------------------------------------------
	['ln-exp', 'identites-log-exp'],
	['exp-ln', 'identites-log-exp'],
	['ln-one', 'identites-log-exp'],
	['ln-e', 'identites-log-exp'],
	['ln-pow', 'identites-log-exp'],
	['ln-product', 'identites-log-exp'],
	['ln-quotient', 'identites-log-exp'],
	// normalize-side log/exp steps
	['exp-ln-inverse', 'identites-log-exp'],
	['ln-exp-inverse', 'identites-log-exp'],
	['log-simplify', 'identites-log-exp'],
	['exp-zero', 'identites-log-exp'],
	['exp-one', 'identites-log-exp'],
	['exp-product', 'identites-log-exp'],

	// ---- puissances -----------------------------------------------------------
	['pow-one', 'puissances'],
	['pow-zero', 'puissances'],
	['one-pow', 'puissances'],
	['zero-pow', 'puissances'],
	['neg-one-pow-even', 'puissances'],
	['neg-one-pow-odd', 'puissances'],
	['neg-base-pow-even', 'puissances'],
	['neg-base-pow-odd', 'puissances'],
	['pow-of-pow', 'puissances'],
	['same-base-mul', 'puissances'],
	['same-base-mul-bare', 'puissances'],
	['same-base-div', 'puissances'],
	['same-base-mul-spread', 'puissances'],
	['same-base-div-spread', 'puissances'],
	['pow-of-quotient', 'puissances'],
	['pow-neg-one', 'puissances'],
	// normalize-side power steps
	['expand-power', 'puissances'],
	['power-of-sqrt', 'puissances'],
	['power-zero', 'puissances'],
	['power-one', 'puissances'],
	['zero-power', 'puissances'],
	['one-power', 'puissances'],
	['power-of-power', 'puissances'],
	['product-power', 'puissances'],
	['quotient-power', 'puissances'],
	['negative-exponent', 'puissances'],
	['constant-power', 'puissances'],

	// ---- radicaux -------------------------------------------------------------
	['sqrt-product', 'radicaux'],
	['sqrt-quotient', 'radicaux'],
	['sqrt-one', 'radicaux'],
	['sqrt-zero', 'radicaux'],
	// √(a²) ↔ (√a)² — taught in the radical chapter even though the
	// rule lives in `powers.ts`.
	['sqrt-square', 'radicaux'],
	['square-sqrt', 'radicaux'],
	// normalize-side radical steps
	// √(AB²) = AB : une longueur est positive (lot Q-F, 2026-10-12)
	['length-radical', 'radicaux'],
	['radical-simplify', 'radicaux'],
	['radical-of-radical', 'radicaux'],
	['sqrt-extract-perfect-square', 'radicaux'],
	['sqrt-of-square', 'radicaux'],
	['sqrt-of-even-power', 'radicaux'],
	['sqrt-perfect-square-trinomial', 'radicaux'],
	['sqrt-perfect-square', 'radicaux'],
	['sqrt-simplify', 'radicaux'],
	['sqrt-to-half-power', 'radicaux'],
	['cbrt-perfect-cube', 'radicaux'],
	['rationalize-conjugate', 'radicaux'],
	['rationalize-denominator', 'radicaux'],

	// ---- fractions ------------------------------------------------------------
	['simplify-fraction', 'fractions'],
	// normalize-side division steps
	['division-by-one', 'fractions'],
	['division-same', 'fractions'],
	['constant-division', 'fractions'],

	// `auto` : fraction de polynômes (chantier simplify-carte § 33, Q4)
	['fraction-factorise', 'factorisation'],
	['fraction-cancel', 'fractions'],
	['fraction-develop', 'distribution'],
	// tidy-side steps (`reduire` et `auto`, chantier simplify-carte § 33)
	['tidy-fold-numbers', 'combinaison-termes-semblables'],
	['tidy-terms', 'combinaison-termes-semblables'],
	['tidy-collect-like-terms', 'combinaison-termes-semblables'],
	['tidy-simplify-signs', 'combinaison-termes-semblables'],
	['tidy-sort-terms', 'combinaison-termes-semblables'],
	['tidy-number-first', 'combinaison-termes-semblables'],
	['tidy-merge-factors', 'puissances'],
	['tidy-extract-radicals', 'radicaux'],
	['tidy-power-to-root', 'radicaux'],
	['tidy-add-fractions', 'fractions'],
	['tidy-choose-unit', 'autre'],

	// ---- combinaison-termes-semblables ---------------------------------------
	// pattern arithmetic rules
	['add-zero-left', 'combinaison-termes-semblables'],
	['add-zero-right', 'combinaison-termes-semblables'],
	['sub-zero', 'combinaison-termes-semblables'],
	['zero-sub', 'combinaison-termes-semblables'],
	['sub-self', 'combinaison-termes-semblables'],
	['mul-one-left', 'combinaison-termes-semblables'],
	['mul-one-right', 'combinaison-termes-semblables'],
	['mul-zero-left', 'combinaison-termes-semblables'],
	['mul-zero-right', 'combinaison-termes-semblables'],
	['div-one', 'combinaison-termes-semblables'],
	['zero-div', 'combinaison-termes-semblables'],
	['div-self', 'combinaison-termes-semblables'],
	['double-neg', 'combinaison-termes-semblables'],
	['positive-identity', 'combinaison-termes-semblables'],
	// normalize-side core arithmetic
	['combine-like-terms', 'combinaison-termes-semblables'],
	['additive-identity-left', 'combinaison-termes-semblables'],
	['additive-identity-right', 'combinaison-termes-semblables'],
	['multiplicative-identity-left', 'combinaison-termes-semblables'],
	['multiplicative-identity-right', 'combinaison-termes-semblables'],
	['multiplicative-zero-left', 'combinaison-termes-semblables'],
	['multiplicative-zero-right', 'combinaison-termes-semblables'],
	['double-negative', 'combinaison-termes-semblables'],
	['constant-addition', 'combinaison-termes-semblables'],
	['constant-subtraction', 'combinaison-termes-semblables'],
	['constant-multiplication', 'combinaison-termes-semblables'],
	['reduce-factors', 'combinaison-termes-semblables']
]);

/**
 * Resolve the pedagogical category of a step by its rule name.
 *
 * Returns `'autre'` for unknown rules, parity rules, complex-algebra rules,
 * and any rule that doesn't fit one of the 9 pedagogical buckets.
 */
export function categorizeRule(name: string): PedagogicalSimplifyCategory {
	return RULE_CATEGORY_MAP.get(name) ?? 'autre';
}
