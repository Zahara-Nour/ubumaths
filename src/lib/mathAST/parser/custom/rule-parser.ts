/**
 * Rule Parser for MathAST Pattern Matching
 *
 * Parses rule strings into Rule objects for transformation rules.
 *
 * Syntax:
 * ```
 * rule := pattern '->' replacement [';' conditions]
 * conditions := condition (',' condition)*
 * condition := '_' wildcardName ':' constraintName
 * constraintName := 'number' | 'integer' | 'positive' | 'negative' | 'nonzero' | 'variable'
 * ```
 *
 * @example
 * parseRule('_x + 0 -> _x')
 * parseRule('_x / _x -> 1 ; _x:nonzero')
 * parseRule('_a^_n * _a^_m -> _a^(_n+_m) ; _n:integer, _m:integer')
 *
 * @module mathAST/parser/custom/rule-parser
 */

import { parsePattern, PatternParseError } from './pattern-parser';
import { PatternTokenizer, type WildcardConstraintName } from './pattern-tokenizer';
import type {
	Rule,
	RuleOptions,
	Pattern,
	MatchBindings,
	PatternConstraint
} from '../../pattern/types';
import { P } from '../../pattern/builder';
import { checkConstraint } from '../../pattern/constraints';

// =============================================================================
// Error Class
// =============================================================================

/**
 * Custom error class for rule parse errors with location information.
 */
export class RuleParseError extends Error {
	readonly position?: number;

	constructor(message: string, position?: number) {
		super(message);
		this.name = 'RuleParseError';
		this.position = position;
	}
}

// =============================================================================
// Internal Types
// =============================================================================

/**
 * Represents a parsed condition from the rule string
 */
interface WildcardCondition {
	wildcardName: string;
	constraintName: WildcardConstraintName;
}

// =============================================================================
// Constraint Mapping
// =============================================================================

/**
 * Gets the constraint for a given constraint name.
 * Uses a function to avoid circular dependency issues with P namespace at module load time.
 */
function getConstraint(name: WildcardConstraintName): PatternConstraint {
	// Access P lazily to avoid circular dependency at module load time
	const constraintMap: Record<WildcardConstraintName, () => PatternConstraint> = {
		number: P.isNumber,
		integer: P.isInteger,
		positive: P.isPositive,
		negative: P.isNegative,
		nonzero: P.isNonzero,
		variable: P.isVariable
	};
	return constraintMap[name]();
}

// =============================================================================
// Condition Parsing
// =============================================================================

/**
 * Parses a conditions string like "_x:nonzero, _y:integer" into WildcardCondition objects.
 *
 * Uses the PatternTokenizer to properly parse wildcards with constraints.
 */
function parseConditions(input: string): WildcardCondition[] {
	const trimmed = input.trim();
	if (!trimmed) return [];

	const tokenizer = new PatternTokenizer(trimmed);
	const conditions: WildcardCondition[] = [];

	while (true) {
		const token = tokenizer.nextToken();

		if (token.type === 'EOF') break;

		if (token.type === 'WILDCARD') {
			// Wildcard must have a constraint in condition context
			if (!token.constraintName) {
				throw new RuleParseError(
					`Condition must have constraint: ${token.value}. Use format '_name:constraint' (e.g., '_x:nonzero')`,
					token.position
				);
			}

			conditions.push({
				wildcardName: token.wildcardName!,
				constraintName: token.constraintName
			});
		} else if (token.type === 'COMMA') {
			// Skip commas between conditions
			continue;
		} else {
			throw new RuleParseError(
				`Unexpected token in conditions: '${token.value}'. Expected wildcard with constraint (e.g., '_x:nonzero')`,
				token.position
			);
		}
	}

	return conditions;
}

/**
 * Builds a condition function from parsed wildcard conditions.
 *
 * The condition function checks that all constrained wildcards satisfy their constraints.
 */
function buildConditionFunction(
	conditions: WildcardCondition[]
): ((bindings: MatchBindings) => boolean) | undefined {
	if (conditions.length === 0) return undefined;

	return (bindings: MatchBindings): boolean => {
		for (const { wildcardName, constraintName } of conditions) {
			const value = bindings.get(wildcardName);

			// If the wildcard wasn't bound, the condition fails
			if (value === undefined) return false;

			// Skip sequence bindings (they have a 'kind' property)
			if (typeof value === 'object' && 'kind' in value) continue;

			// Check the constraint
			const constraint = getConstraint(constraintName);
			if (!checkConstraint(constraint, value)) return false;
		}
		return true;
	};
}

// =============================================================================
// Main Parser
// =============================================================================

/**
 * Parse a rule string into a Rule object.
 *
 * Syntax: `pattern -> replacement [; conditions]`
 *
 * @param input - The rule string to parse
 * @param options - Optional rule options (name, priority)
 * @returns A Rule object
 * @throws RuleParseError if parsing fails
 *
 * @example
 * // Basic rule
 * parseRule('_x + 0 -> _x')
 *
 * // Rule with name
 * parseRule('_x + 0 -> _x', { name: 'additive-identity' })
 *
 * // Rule with condition
 * parseRule('_x / _x -> 1 ; _x:nonzero')
 *
 * // Rule with multiple conditions
 * parseRule('_a^_n * _a^_m -> _a^(_n+_m) ; _n:integer, _m:integer')
 */
export function parseRule(input: string, options?: Partial<RuleOptions>): Rule {
	// Step 1: Find and split on '->'
	const arrowIndex = input.indexOf('->');
	if (arrowIndex === -1) {
		throw new RuleParseError("Missing '->' in rule. Expected format: 'pattern -> replacement'");
	}

	const patternStr = input.slice(0, arrowIndex).trim();
	const afterArrow = input.slice(arrowIndex + 2);

	if (!patternStr) {
		throw new RuleParseError('Empty pattern before ->');
	}

	// Step 2: Split remainder on ';' for conditions
	const semicolonIndex = afterArrow.indexOf(';');
	const replacementStr =
		semicolonIndex === -1 ? afterArrow.trim() : afterArrow.slice(0, semicolonIndex).trim();

	const conditionsStr = semicolonIndex === -1 ? null : afterArrow.slice(semicolonIndex + 1).trim();

	if (!replacementStr) {
		throw new RuleParseError('Empty replacement after ->');
	}

	// Step 3: Parse pattern and replacement using pattern-parser
	let pattern: Pattern;
	let replacement: Pattern;

	try {
		pattern = parsePattern(patternStr);
	} catch (e) {
		if (e instanceof PatternParseError) {
			throw new RuleParseError(`Invalid pattern: ${e.message}`, e.position);
		}
		throw e;
	}

	try {
		replacement = parsePattern(replacementStr);
	} catch (e) {
		if (e instanceof PatternParseError) {
			throw new RuleParseError(
				`Invalid replacement: ${e.message}`,
				arrowIndex + 2 + (e.position ?? 0)
			);
		}
		throw e;
	}

	// Step 4: Parse conditions (if any)
	const conditions = conditionsStr ? parseConditions(conditionsStr) : [];
	const conditionFn = buildConditionFunction(conditions);

	// Step 5: Build and return the rule
	return {
		name: options?.name ?? 'parsed-rule',
		pattern,
		replacement,
		...(conditionFn && { condition: conditionFn }),
		...(options?.priority !== undefined && { priority: options.priority })
	};
}
