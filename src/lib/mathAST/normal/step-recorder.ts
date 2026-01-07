/**
 * Step Recorder for Normalization
 *
 * Records transformation steps during simplification/normalization
 * for pedagogical display.
 *
 * @module mathAST/normal/step-recorder
 */

import type { MathNode } from '../types';
import type { NormalizationStep } from './types';
import { hashMathNode } from './hash';

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
 * @example
 * const recorder = new StepRecorder();
 * recorder.recordStep('additive-identity', before, after);
 * const steps = recorder.getSteps();
 */
export class StepRecorder {
	private steps: NormalizationStep[] = [];

	/**
	 * Records a step if a transformation occurred.
	 *
	 * Compares before and after using hash - only records if different.
	 *
	 * @param rule - Name of the rule applied
	 * @param before - AST before transformation
	 * @param after - AST after transformation
	 * @returns true if a step was recorded (transformation occurred)
	 */
	recordStep(rule: string, before: MathNode, after: MathNode): boolean {
		const beforeHash = hashMathNode(before);
		const afterHash = hashMathNode(after);

		if (beforeHash === afterHash) {
			return false;
		}

		this.steps.push({
			rule,
			description: getRuleDescription(rule),
			before,
			after
		});

		return true;
	}

	/**
	 * Records a step with custom description.
	 */
	recordStepWithDescription(
		rule: string,
		description: string,
		before: MathNode,
		after: MathNode
	): boolean {
		const beforeHash = hashMathNode(before);
		const afterHash = hashMathNode(after);

		if (beforeHash === afterHash) {
			return false;
		}

		this.steps.push({
			rule,
			description,
			before,
			after
		});

		return true;
	}

	/**
	 * Gets all recorded steps.
	 */
	getSteps(): readonly NormalizationStep[] {
		return this.steps;
	}

	/**
	 * Clears all recorded steps.
	 */
	clear(): void {
		this.steps = [];
	}

	/**
	 * Gets the number of recorded steps.
	 */
	get length(): number {
		return this.steps.length;
	}
}

// =============================================================================
// Simplification with Step Recording
// =============================================================================

import { simplifyArithmetic } from './rules/arithmetic.js';
import { simplifyPowers } from './rules/powers.js';
import { simplifyRadicals } from './rules/radicals.js';
import { simplifyTranscendental } from './rules/transcendental.js';

/**
 * Applies all simplification rules once, recording steps.
 *
 * @param node - The node to simplify
 * @param recorder - Optional step recorder
 * @returns The simplified node
 */
export function simplifyOnceWithSteps(node: MathNode, recorder?: StepRecorder): MathNode {
	let result = node;

	// Apply arithmetic rules
	const afterArithmetic = simplifyArithmetic(result);
	if (recorder) {
		recorder.recordStep('arithmetic', result, afterArithmetic);
	}
	result = afterArithmetic;

	// Apply power rules
	const afterPowers = simplifyPowers(result);
	if (recorder) {
		recorder.recordStep('powers', result, afterPowers);
	}
	result = afterPowers;

	// Apply radical rules
	const afterRadicals = simplifyRadicals(result);
	if (recorder) {
		recorder.recordStep('radicals', result, afterRadicals);
	}
	result = afterRadicals;

	// Apply transcendental rules
	const afterTranscendental = simplifyTranscendental(result);
	if (recorder) {
		recorder.recordStep('transcendental', result, afterTranscendental);
	}
	result = afterTranscendental;

	return result;
}

/**
 * Simplifies an expression to fixed point, recording all steps.
 *
 * @param node - The node to simplify
 * @param maxIterations - Maximum number of iterations (default 100)
 * @returns Object with simplified node and recorded steps
 */
export function simplifyWithSteps(
	node: MathNode,
	maxIterations: number = 100
): { result: MathNode; steps: readonly NormalizationStep[] } {
	const recorder = new StepRecorder();
	let current = node;
	let currentHash = hashMathNode(current);

	for (let i = 0; i < maxIterations; i++) {
		const next = simplifyOnceWithSteps(current, recorder);
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
		steps: recorder.getSteps()
	};
}
