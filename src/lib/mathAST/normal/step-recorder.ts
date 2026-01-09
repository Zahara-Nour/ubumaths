/**
 * Step Recorder for Normalization
 *
 * Records transformation steps during simplification/normalization
 * for pedagogical display.
 *
 * @module mathAST/normal/step-recorder
 */

import type { MathNode } from '../types';
import type { NormalizationStep, NormalizationVerbosity } from './types';
import { hashMathNode } from './hash';
import { StepRecorderBase } from '../common/step-recorder-base.js';
import type { Verbosity } from '../common/verbosity.js';

// =============================================================================
// Rule Descriptions (French)
// =============================================================================

/**
 * Human-readable descriptions for each simplification rule.
 */
const RULE_DESCRIPTIONS: Record<string, string> = {
	// Arithmetic
	'additive-identity-left': "L'addition de 0 est l'élément neutre (0 + a = a)",
	'additive-identity-right': "L'addition de 0 est l'élément neutre (a + 0 = a)",
	'multiplicative-identity-left': 'La multiplication par 1 est neutre (1 × a = a)',
	'multiplicative-identity-right': 'La multiplication par 1 est neutre (a × 1 = a)',
	'multiplicative-zero-left': 'Tout nombre multiplié par 0 donne 0 (0 × a = 0)',
	'multiplicative-zero-right': 'Tout nombre multiplié par 0 donne 0 (a × 0 = 0)',
	'division-by-one': 'Division par 1 est neutre (a ÷ 1 = a)',
	'division-same': "Division d'un nombre par lui-même donne 1 (a ÷ a = 1)",
	'double-negative': 'Double négation (--a = a)',
	'constant-addition': 'Addition de constantes',
	'constant-subtraction': 'Soustraction de constantes',
	'constant-multiplication': 'Multiplication de constantes',
	'constant-division': 'Division de constantes',

	// Powers
	'power-zero': 'Tout nombre à la puissance 0 vaut 1 (a⁰ = 1)',
	'power-one': 'Un nombre à la puissance 1 reste inchangé (a¹ = a)',
	'zero-power': "0 élevé à n'importe quelle puissance positive vaut 0",
	'one-power': "1 élevé à n'importe quelle puissance vaut 1",
	'power-of-power': 'Puissance de puissance: (aᵐ)ⁿ = aᵐⁿ',
	'product-power': "Puissance d'un produit: (ab)ⁿ = aⁿbⁿ",
	'quotient-power': "Puissance d'un quotient: (a/b)ⁿ = aⁿ/bⁿ",
	'negative-exponent': 'Exposant négatif: a⁻ⁿ = 1/aⁿ',
	'constant-power': "Calcul d'une puissance de constantes",

	// Radicals
	'sqrt-perfect-square': 'Racine carrée parfaite: √n² = n',
	'sqrt-simplify': 'Simplification de racine: √(ab²) = b√a',
	'cbrt-perfect-cube': 'Racine cubique parfaite: ∛n³ = n',
	'radical-simplify': 'Simplification de radical',
	'radical-of-radical': 'Radical de radical: √(√a) = a^(1/4)',
	'sqrt-one': '√1 = 1',
	'sqrt-zero': '√0 = 0',

	// Transcendental
	'ln-one': 'ln(1) = 0',
	'ln-e': 'ln(e) = 1',
	'exp-zero': 'e⁰ = 1',
	'exp-one': 'e¹ = e',
	'exp-ln': 'exp(ln(x)) = x',
	'ln-exp': 'ln(exp(x)) = x',
	'sin-zero': 'sin(0) = 0',
	'cos-zero': 'cos(0) = 1',
	'tan-zero': 'tan(0) = 0',
	'sin-pi': 'sin(π) = 0',
	'cos-pi': 'cos(π) = -1',

	// Phase 2 - Normalization
	'pre-simplify': 'Pré-simplification (Phase 1)',
	'combine-like-terms': 'Combinaison des termes semblables',
	'simplify-fraction': 'Simplification de la fraction',
	'expand-power': 'Développement de la puissance',
	'trig-known-value': 'Valeur trigonométrique remarquable',
	'exp-ln-inverse': 'exp(ln(x)) = x',
	'ln-exp-inverse': 'ln(exp(x)) = x',
	'log-simplify': 'Simplification du logarithme',

	// General
	simplification: 'Simplification',
	arithmetic: 'Simplification arithmétique',
	powers: 'Simplification des puissances',
	radicals: 'Simplification des radicaux',
	transcendental: 'Simplification des fonctions transcendantes'
};

/**
 * Gets the description for a rule, with fallback.
 */
export function getRuleDescription(rule: string): string {
	return RULE_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}

// =============================================================================
// Step Recorder Class
// =============================================================================

/**
 * Records normalization/simplification steps.
 *
 * Extends StepRecorderBase for common functionality (ID generation,
 * step storage, verbosity filtering).
 *
 * Features unique to NormalizationStepRecorder:
 * - Hash-based deduplication (only records if before !== after)
 * - Auto-description lookup from RULE_DESCRIPTIONS
 *
 * @example
 * const recorder = new StepRecorder();
 * recorder.recordStep('additive-identity', 'desc', before, after, 'detailed');
 * const steps = recorder.getSteps();
 */
export class StepRecorder extends StepRecorderBase<NormalizationStep, string> {
	/**
	 * Records a step with explicit verbosity level.
	 *
	 * Compares before and after using hash - only records if different.
	 *
	 * @param rule - Name of the rule applied
	 * @param description - Human-readable description in French
	 * @param before - AST before transformation
	 * @param after - AST after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step
	 * @returns true if a step was recorded (transformation occurred)
	 */
	recordStep(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		const beforeHash = hashMathNode(before);
		const afterHash = hashMathNode(after);

		if (beforeHash === afterHash) {
			return false;
		}

		this.pushStep({
			id: this.nextId++,
			rule,
			description,
			before,
			after,
			verbosityLevel
		});

		return true;
	}

	/**
	 * Records a step using auto-lookup description.
	 *
	 * @param rule - Name of the rule applied
	 * @param before - AST before transformation
	 * @param after - AST after transformation
	 * @param verbosityLevel - Minimum verbosity to show this step (default: 'detailed')
	 * @returns true if a step was recorded (transformation occurred)
	 */
	recordStepByRule(
		rule: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		return this.recordStep(rule, getRuleDescription(rule), before, after, verbosityLevel);
	}

	/**
	 * Records a step with custom description.
	 * @deprecated Use recordStep with explicit description instead
	 */
	recordStepWithDescription(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): boolean {
		return this.recordStep(rule, description, before, after, verbosityLevel);
	}
}

// =============================================================================
// Simplification with Step Recording
// =============================================================================

import { simplifyRadicals } from './rules/radicals.js';

/**
 * Applies Phase 1 simplification rules once, recording steps.
 *
 * Note: Arithmetic and power rules have been moved to Phase 2 (polynomial normalization).
 * Phase 1 now only handles radical combination rules that Phase 2 cannot do efficiently.
 *
 * @param node - The node to simplify
 * @param recorder - Optional step recorder
 * @param verbosity - Verbosity level for recording (default: 'detailed')
 * @returns The simplified node
 */
export function simplifyOnceWithSteps(
	node: MathNode,
	recorder?: StepRecorder,
	verbosity: Verbosity = 'detailed'
): MathNode {
	// Apply radical rules (Phase 1)
	const result = simplifyRadicals(node);
	if (recorder && verbosity !== 'result') {
		recorder.recordStepByRule('radicals', node, result, verbosity);
	}

	return result;
}

/**
 * Simplifies an expression to fixed point, recording all steps.
 *
 * @param node - The node to simplify
 * @param verbosity - Verbosity level for recording (default: 'summarized')
 * @param maxIterations - Maximum number of iterations (default 100)
 * @returns Object with simplified node and recorded steps
 */
export function simplifyWithSteps(
	node: MathNode,
	verbosity: NormalizationVerbosity = 'summarized',
	maxIterations: number = 100
): { result: MathNode; steps: readonly NormalizationStep[] } {
	const recorder = new StepRecorder();
	let current = node;
	let currentHash = hashMathNode(current);

	for (let i = 0; i < maxIterations; i++) {
		const next = simplifyOnceWithSteps(current, recorder, verbosity);
		const nextHash = hashMathNode(next);

		// Fixed point reached
		if (nextHash === currentHash) {
			break;
		}

		current = next;
		currentHash = nextHash;
	}

	return {
		result: current,
		steps: recorder.getStepsFiltered(verbosity)
	};
}
