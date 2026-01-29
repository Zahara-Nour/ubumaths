/**
 * Enhanced Domain Step Types
 *
 * Types for the enhanced pedagogical step recording system.
 * Provides richer information about domain computation steps.
 *
 * @module mathAST/domain/enhanced-step-types
 */

import type { Verbosity } from '../common/verbosity';
import type { Domain } from './types';

// =============================================================================
// Domain Rule Types
// =============================================================================

/**
 * Rules that can be applied during domain computation.
 *
 * These rules are used to identify the type of step being recorded
 * and to look up French descriptions.
 */
export type DomainRule =
	// Constraint rules (function domain requirements)
	| 'sqrt_constraint' // √u requires u ≥ 0
	| 'ln_constraint' // ln(u) requires u > 0
	| 'log_constraint' // log(u) requires u > 0
	| 'division_constraint' // 1/u requires u ≠ 0
	| 'arcsin_constraint' // arcsin(u) requires -1 ≤ u ≤ 1
	| 'arccos_constraint' // arccos(u) requires -1 ≤ u ≤ 1
	| 'tan_constraint' // tan(x) requires x ≠ π/2 + kπ
	| 'cot_constraint' // cot(x) requires x ≠ kπ
	| 'sec_constraint' // sec(x) requires x ≠ π/2 + kπ
	| 'csc_constraint' // csc(x) requires x ≠ kπ
	| 'power_constraint' // x^(-n) requires x ≠ 0
	| 'even_root_constraint' // x^(1/2n) requires x ≥ 0
	| 'acosh_constraint' // acosh(u) requires u ≥ 1
	| 'atanh_constraint' // atanh(u) requires |u| < 1
	// Operation rules
	| 'intersection' // Intersection of constraints
	| 'union' // Union of domains
	| 'complement' // Complement of domain
	| 'difference' // Difference of domains
	// Preimage rules (solving for x)
	| 'preimage_linear' // Linear inequality resolution
	| 'preimage_quadratic' // Quadratic inequality resolution
	| 'preimage_cubic' // Cubic inequality resolution
	| 'preimage_general' // General preimage analysis
	// Composition rules
	| 'composition' // Function composition analysis
	| 'composition_range_analysis' // Range analysis of inner function
	// Simplification rules
	| 'simplification' // Domain simplification
	| 'merge_intervals' // Merging adjacent intervals
	| 'remove_redundant' // Removing redundant constraints
	// Special cases
	| 'universal' // Universal domain (ℝ)
	| 'empty' // Empty domain
	| 'periodic_exclusion'; // Periodic point exclusion

// =============================================================================
// Enhanced Domain Step Interface
// =============================================================================

/**
 * An enhanced step in the domain computation with rich pedagogical information.
 *
 * Unlike the basic DomainStep, this includes:
 * - A typed rule identifier for lookup
 * - Intermediate domain result
 * - Detailed reasoning for the step
 * - Verbosity level for filtering
 *
 * @example
 * ```typescript
 * const step: EnhancedDomainStep = {
 *   id: 1,
 *   rule: 'sqrt_constraint',
 *   description: 'La racine carrée nécessite un argument positif ou nul',
 *   expression: '\\sqrt{x - 2}',
 *   constraint: 'x - 2 \\geq 0',
 *   intermediateDomain: { kind: 'interval_set', intervals: [...], excludedPoints: [] },
 *   reasoning: 'Pour que √(x-2) soit définie, il faut x-2 ≥ 0, donc x ≥ 2',
 *   verbosityLevel: 'summarized'
 * };
 * ```
 */
export interface EnhancedDomainStep {
	/** Unique identifier for this step */
	readonly id: number;

	/** The rule applied in this step */
	readonly rule: DomainRule;

	/** French description of the rule */
	readonly description: string;

	/** LaTeX representation of the expression being analyzed */
	readonly expression: string;

	/** LaTeX representation of the constraint applied */
	readonly constraint: string;

	/** The domain result after applying this step (optional) */
	readonly intermediateDomain?: Domain;

	/** Detailed reasoning for this step (optional, for 'detailed' verbosity) */
	readonly reasoning?: string;

	/** Minimum verbosity level to show this step */
	readonly verbosityLevel: Verbosity;
}

// =============================================================================
// Enhanced Domain Result Interface
// =============================================================================

/**
 * Result of an enhanced domain computation.
 *
 * Extends DomainResult with richer step information.
 */
export interface EnhancedDomainResult {
	/** The computed domain */
	readonly domain: Domain;

	/** The variable used in the computation */
	readonly variable: string;

	/** Enhanced steps (when showSteps is true) */
	readonly steps?: readonly EnhancedDomainStep[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a rule is a constraint rule.
 */
export function isConstraintRule(rule: DomainRule): boolean {
	const constraintRules: DomainRule[] = [
		'sqrt_constraint',
		'ln_constraint',
		'log_constraint',
		'division_constraint',
		'arcsin_constraint',
		'arccos_constraint',
		'tan_constraint',
		'cot_constraint',
		'sec_constraint',
		'csc_constraint',
		'power_constraint',
		'even_root_constraint',
		'acosh_constraint',
		'atanh_constraint'
	];
	return constraintRules.includes(rule);
}

/**
 * Check if a rule is a preimage rule.
 */
export function isPreimageRule(rule: DomainRule): boolean {
	const preimageRules: DomainRule[] = [
		'preimage_linear',
		'preimage_quadratic',
		'preimage_cubic',
		'preimage_general'
	];
	return preimageRules.includes(rule);
}

/**
 * Check if a rule is an operation rule.
 */
export function isOperationRule(rule: DomainRule): boolean {
	const operationRules: DomainRule[] = ['intersection', 'union', 'complement', 'difference'];
	return operationRules.includes(rule);
}

/**
 * Get the constraint rule for a function name.
 *
 * @param funcName - The function name (e.g., 'sqrt', 'ln', 'tan')
 * @returns The corresponding constraint rule, or null if no constraint
 */
export function getConstraintRuleForFunction(funcName: string): DomainRule | null {
	const ruleMap: Record<string, DomainRule> = {
		sqrt: 'sqrt_constraint',
		ln: 'ln_constraint',
		log: 'log_constraint',
		log10: 'log_constraint',
		log2: 'log_constraint',
		asin: 'arcsin_constraint',
		arcsin: 'arcsin_constraint',
		acos: 'arccos_constraint',
		arccos: 'arccos_constraint',
		tan: 'tan_constraint',
		cot: 'cot_constraint',
		sec: 'sec_constraint',
		csc: 'csc_constraint',
		acosh: 'acosh_constraint',
		atanh: 'atanh_constraint'
	};
	return ruleMap[funcName] ?? null;
}
