/**
 * Domain Hints Generator
 *
 * Generates progressive hints for students working on domain problems.
 * Hints become more specific at higher levels.
 *
 * @module mathAST/domain/validation/hints
 */

import type { MathNode } from '../../types';
import type { Domain } from '../types';
import type { HintLevel, HintOptions } from './types';
import { isEmpty, difference } from '../algebra';
import { formatInterval } from '../format';
import { toCustom } from '../../custom-generator';

// =============================================================================
// Main API
// =============================================================================

/**
 * Generate hints for a domain problem.
 *
 * @param expression - The mathematical expression
 * @param studentDomain - The student's current answer (or null if not yet provided)
 * @param correctDomain - The correct domain
 * @param options - Hint options including level
 * @returns Array of hint strings in French
 *
 * @example
 * ```typescript
 * // Level 1 hint (vague)
 * generateDomainHints(sqrtExpr, null, correctDomain, { level: 1 });
 * // ["Cette expression contient une racine carrée."]
 *
 * // Level 2 hint (more specific)
 * generateDomainHints(sqrtExpr, null, correctDomain, { level: 2 });
 * // ["Pour qu'une racine carrée soit définie, son argument doit être positif ou nul."]
 *
 * // Level 3 hint (very specific)
 * generateDomainHints(sqrtExpr, studentDomain, correctDomain, { level: 3 });
 * // ["L'argument de la racine est x - 2. Il faut x - 2 ≥ 0, donc x ≥ 2."]
 * ```
 */
export function generateDomainHints(
	expression: MathNode,
	studentDomain: Domain | null,
	correctDomain: Domain,
	options: HintOptions
): string[] {
	const { level, maxHints = 3, includeStructureHints = true } = options;

	const hints: string[] = [];

	// Get expression structure hints
	if (includeStructureHints) {
		const structureHints = getStructureHints(expression, level);
		hints.push(...structureHints);
	}

	// Get constraint-specific hints
	const constraintHints = getConstraintHints(expression, correctDomain, level);
	hints.push(...constraintHints);

	// If student provided an answer, add comparison-based hints
	if (studentDomain !== null) {
		const comparisonHints = getComparisonHints(studentDomain, correctDomain, level);
		hints.push(...comparisonHints);
	}

	// Limit number of hints
	return hints.slice(0, maxHints);
}

// =============================================================================
// Structure Hints
// =============================================================================

/**
 * Get hints about the expression structure.
 */
function getStructureHints(expression: MathNode, level: HintLevel): string[] {
	const hints: string[] = [];
	const operations = findOperations(expression);

	for (const op of operations) {
		switch (op.type) {
			case 'sqrt':
				hints.push(...getSqrtHints(op.argument, level));
				break;
			case 'ln':
				hints.push(...getLnHints(op.argument, level));
				break;
			case 'division':
				hints.push(...getDivisionHints(op.denominator, level));
				break;
			case 'arcsin':
			case 'arccos':
				hints.push(...getArcHints(op.type, op.argument, level));
				break;
			case 'tan':
				hints.push(...getTanHints(op.argument, level));
				break;
			case 'negative_power':
				hints.push(...getNegativePowerHints(op.base, level));
				break;
			case 'even_root':
				hints.push(...getEvenRootHints(op.argument, level));
				break;
		}
	}

	return hints;
}

/**
 * Operation types found in expressions.
 */
interface FoundOperation {
	type: 'sqrt' | 'ln' | 'division' | 'arcsin' | 'arccos' | 'tan' | 'negative_power' | 'even_root';
	argument?: MathNode;
	denominator?: MathNode;
	base?: MathNode;
}

/**
 * Find all constraint-generating operations in an expression.
 */
function findOperations(node: MathNode): FoundOperation[] {
	const operations: FoundOperation[] = [];

	function traverse(n: MathNode): void {
		switch (n.type) {
			case 'function':
				switch (n.name) {
					case 'sqrt':
						operations.push({ type: 'sqrt', argument: n.args[0] });
						break;
					case 'ln':
					case 'log':
					case 'log10':
					case 'log2':
						operations.push({ type: 'ln', argument: n.args[0] });
						break;
					case 'asin':
					case 'arcsin':
						operations.push({ type: 'arcsin', argument: n.args[0] });
						break;
					case 'acos':
					case 'arccos':
						operations.push({ type: 'arccos', argument: n.args[0] });
						break;
					case 'tan':
						operations.push({ type: 'tan', argument: n.args[0] });
						break;
				}
				for (const arg of n.args) {
					traverse(arg);
				}
				break;

			case 'division':
				operations.push({ type: 'division', denominator: n.denominator });
				traverse(n.numerator);
				traverse(n.denominator);
				break;

			case 'superscript': {
				// Check for negative exponent
				const expValue = tryGetNumericValue(n.superscript);
				if (expValue !== null && expValue < 0) {
					operations.push({ type: 'negative_power', base: n.base });
				}
				// Check for fractional exponent with even denominator
				if (n.superscript.type === 'division') {
					const den = tryGetNumericValue(n.superscript.denominator);
					if (den !== null && den > 0 && Math.round(den) % 2 === 0) {
						operations.push({ type: 'even_root', argument: n.base });
					}
				}
				traverse(n.base);
				traverse(n.superscript);
				break;
			}

			case 'addition':
			case 'subtraction':
				traverse(n.left);
				traverse(n.right);
				break;

			case 'multiplication':
				traverse(n.left);
				traverse(n.right);
				break;

			case 'opposite':
			case 'positive':
				traverse(n.operand);
				break;

			case 'delimiter':
				traverse(n.content);
				break;
		}
	}

	traverse(node);
	return operations;
}

// =============================================================================
// Operation-Specific Hints
// =============================================================================

function getSqrtHints(argument: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient une racine carrée.'];
	}
	if (level === 2) {
		return ["Pour qu'une racine carrée soit définie, son argument doit être positif ou nul (≥ 0)."];
	}
	// Level 3
	if (argument) {
		const argStr = toCustom(argument);
		return [`L'argument de la racine est ${argStr}. Il faut ${argStr} ≥ 0.`];
	}
	return ["Identifie l'argument de la racine et résous l'inéquation correspondante."];
}

function getLnHints(argument: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient un logarithme.'];
	}
	if (level === 2) {
		return ["Pour qu'un logarithme soit défini, son argument doit être strictement positif (> 0)."];
	}
	// Level 3
	if (argument) {
		const argStr = toCustom(argument);
		return [`L'argument du logarithme est ${argStr}. Il faut ${argStr} > 0.`];
	}
	return ["Identifie l'argument du logarithme et résous l'inéquation correspondante."];
}

function getDivisionHints(denominator: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient une division.'];
	}
	if (level === 2) {
		return ["Pour qu'une division soit définie, le dénominateur doit être non nul (≠ 0)."];
	}
	// Level 3
	if (denominator) {
		const denStr = toCustom(denominator);
		return [`Le dénominateur est ${denStr}. Il faut ${denStr} ≠ 0.`];
	}
	return ["Identifie le dénominateur et trouve les valeurs qui l'annulent."];
}

function getArcHints(
	type: 'arcsin' | 'arccos',
	argument: MathNode | undefined,
	level: HintLevel
): string[] {
	const funcName = type === 'arcsin' ? 'arc sinus' : 'arc cosinus';

	if (level === 1) {
		return [`Cette expression contient un ${funcName}.`];
	}
	if (level === 2) {
		return [`Pour que ${funcName} soit défini, son argument doit être dans [-1, 1].`];
	}
	// Level 3
	if (argument) {
		const argStr = toCustom(argument);
		return [`L'argument est ${argStr}. Il faut -1 ≤ ${argStr} ≤ 1.`];
	}
	return ["Identifie l'argument et résous la double inéquation."];
}

function getTanHints(argument: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient une tangente.'];
	}
	if (level === 2) {
		return ["La tangente n'est pas définie pour x = π/2 + kπ (k entier)."];
	}
	// Level 3
	if (argument) {
		const argStr = toCustom(argument);
		return [
			`L'argument de la tangente est ${argStr}. Il faut ${argStr} ≠ π/2 + kπ pour tout entier k.`
		];
	}
	return ["Identifie les valeurs où le cosinus s'annule."];
}

function getNegativePowerHints(base: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient une puissance négative.'];
	}
	if (level === 2) {
		return ['Une puissance négative (a⁻ⁿ = 1/aⁿ) nécessite une base non nulle.'];
	}
	// Level 3
	if (base) {
		const baseStr = toCustom(base);
		return [`La base est ${baseStr}. Il faut ${baseStr} ≠ 0.`];
	}
	return ["Identifie la base et trouve les valeurs qui l'annulent."];
}

function getEvenRootHints(argument: MathNode | undefined, level: HintLevel): string[] {
	if (level === 1) {
		return ['Cette expression contient une racine paire.'];
	}
	if (level === 2) {
		return [
			'Une racine paire (racine carrée, quatrième, etc.) nécessite un argument positif ou nul.'
		];
	}
	// Level 3
	if (argument) {
		const argStr = toCustom(argument);
		return [`L'argument de la racine est ${argStr}. Il faut ${argStr} ≥ 0.`];
	}
	return ["Identifie l'argument de la racine et résous l'inéquation correspondante."];
}

// =============================================================================
// Constraint Hints
// =============================================================================

/**
 * Get hints about specific constraints in the correct domain.
 */
function getConstraintHints(
	_expression: MathNode,
	correctDomain: Domain,
	level: HintLevel
): string[] {
	const hints: string[] = [];

	if (level < 3) {
		// Only give domain-specific hints at level 3
		return hints;
	}

	// Format the expected domain
	if (correctDomain.kind !== 'empty' && correctDomain.kind !== 'universal') {
		const domainStr = formatInterval(correctDomain);
		hints.push(`Le domaine attendu est de la forme : ${domainStr}`);
	}

	return hints;
}

// =============================================================================
// Comparison Hints
// =============================================================================

/**
 * Get hints based on comparing student answer to correct domain.
 */
function getComparisonHints(
	studentDomain: Domain,
	correctDomain: Domain,
	level: HintLevel
): string[] {
	const hints: string[] = [];
	const studentMissing = difference(correctDomain, studentDomain);
	const studentExtra = difference(studentDomain, correctDomain);

	// At level 1, just indicate if there's an error
	if (level === 1) {
		if (!isEmpty(studentMissing) || !isEmpty(studentExtra)) {
			hints.push('Vérifie ta réponse, il y a une erreur.');
		}
		return hints;
	}

	// At level 2, indicate the type of error
	if (level === 2) {
		if (!isEmpty(studentMissing) && isEmpty(studentExtra)) {
			hints.push('Tu as exclu trop de valeurs. Certaines valeurs devraient être dans le domaine.');
		} else if (isEmpty(studentMissing) && !isEmpty(studentExtra)) {
			hints.push(
				'Tu as inclus trop de valeurs. Certaines valeurs ne devraient pas être dans le domaine.'
			);
		} else if (!isEmpty(studentMissing) && !isEmpty(studentExtra)) {
			hints.push("Certaines valeurs manquent et d'autres sont en trop.");
		}
		return hints;
	}

	// At level 3, be very specific
	if (!isEmpty(studentMissing)) {
		const missingStr = formatInterval(studentMissing);
		hints.push(`Valeurs manquantes dans ta réponse : ${missingStr}`);
	}
	if (!isEmpty(studentExtra)) {
		const extraStr = formatInterval(studentExtra);
		hints.push(`Valeurs en trop dans ta réponse : ${extraStr}`);
	}

	return hints;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Try to get a numeric value from a node.
 */
function tryGetNumericValue(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}
	if (node.type === 'opposite' && node.operand.type === 'number') {
		return -parseFloat(node.operand.value);
	}
	return null;
}
