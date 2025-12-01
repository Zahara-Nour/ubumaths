/**
 * Dimensional Analysis - Default Function Rules
 *
 * Defines the dimensional requirements for standard mathematical functions.
 * These rules specify what unit types each function accepts and produces.
 */

import type { FunctionRule, BuiltInFunctionName } from './types';

// =============================================================================
// Default Function Rules
// =============================================================================

/**
 * Default rules for built-in mathematical functions.
 *
 * Categories:
 * - Trigonometric: require angle/dimensionless, produce dimensionless
 * - Inverse trigonometric: require dimensionless, produce angle
 * - Hyperbolic: require dimensionless, produce dimensionless
 * - Logarithmic: require dimensionless, produce dimensionless
 * - Root/Power: preserve or transform units
 *
 * @example
 * ```typescript
 * const sinRule = DEFAULT_FUNCTION_RULES.get('sin');
 * // { name: 'sin', inputRequirement: 'angle', outputUnit: 'dimensionless', ... }
 * ```
 */
export const DEFAULT_FUNCTION_RULES: ReadonlyMap<BuiltInFunctionName, FunctionRule> = new Map<
	BuiltInFunctionName,
	FunctionRule
>([
	// Trigonometric functions - require angle, produce dimensionless
	[
		'sin',
		{
			name: 'sin',
			inputRequirement: 'angle',
			outputUnit: 'dimensionless',
			description: 'Sine function - requires angle input'
		}
	],
	[
		'cos',
		{
			name: 'cos',
			inputRequirement: 'angle',
			outputUnit: 'dimensionless',
			description: 'Cosine function - requires angle input'
		}
	],
	[
		'tan',
		{
			name: 'tan',
			inputRequirement: 'angle',
			outputUnit: 'dimensionless',
			description: 'Tangent function - requires angle input'
		}
	],

	// Inverse trigonometric functions - require dimensionless, produce angle
	[
		'asin',
		{
			name: 'asin',
			inputRequirement: 'dimensionless',
			outputUnit: 'angle',
			description: 'Inverse sine - produces angle'
		}
	],
	[
		'acos',
		{
			name: 'acos',
			inputRequirement: 'dimensionless',
			outputUnit: 'angle',
			description: 'Inverse cosine - produces angle'
		}
	],
	[
		'atan',
		{
			name: 'atan',
			inputRequirement: 'dimensionless',
			outputUnit: 'angle',
			description: 'Inverse tangent - produces angle'
		}
	],
	[
		'atan2',
		{
			name: 'atan2',
			inputRequirement: 'same',
			outputUnit: 'angle',
			description: 'Two-argument inverse tangent - both args must have same units'
		}
	],

	// Hyperbolic functions - require and produce dimensionless
	[
		'sinh',
		{
			name: 'sinh',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Hyperbolic sine - requires dimensionless'
		}
	],
	[
		'cosh',
		{
			name: 'cosh',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Hyperbolic cosine - requires dimensionless'
		}
	],
	[
		'tanh',
		{
			name: 'tanh',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Hyperbolic tangent - requires dimensionless'
		}
	],

	// Logarithmic and exponential functions - require and produce dimensionless
	[
		'ln',
		{
			name: 'ln',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Natural logarithm - requires dimensionless'
		}
	],
	[
		'log',
		{
			name: 'log',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Logarithm - requires dimensionless'
		}
	],
	[
		'log10',
		{
			name: 'log10',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Base-10 logarithm - requires dimensionless'
		}
	],
	[
		'log2',
		{
			name: 'log2',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Base-2 logarithm - requires dimensionless'
		}
	],
	[
		'exp',
		{
			name: 'exp',
			inputRequirement: 'dimensionless',
			outputUnit: 'dimensionless',
			description: 'Exponential function - requires dimensionless'
		}
	],

	// Root functions - preserve units (sqrt of m² = m)
	[
		'sqrt',
		{
			name: 'sqrt',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Square root - preserves unit structure (exponents halved)'
		}
	],
	[
		'cbrt',
		{
			name: 'cbrt',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Cube root - preserves unit structure (exponents divided by 3)'
		}
	],

	// Absolute value - preserves units
	[
		'abs',
		{
			name: 'abs',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Absolute value - preserves units'
		}
	],

	// Min/Max - require same units, preserve
	[
		'min',
		{
			name: 'min',
			inputRequirement: 'same',
			outputUnit: 'preserve',
			description: 'Minimum - all arguments must have same units'
		}
	],
	[
		'max',
		{
			name: 'max',
			inputRequirement: 'same',
			outputUnit: 'preserve',
			description: 'Maximum - all arguments must have same units'
		}
	],

	// Rounding functions
	[
		'floor',
		{
			name: 'floor',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Floor function - preserves units'
		}
	],
	[
		'ceil',
		{
			name: 'ceil',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Ceiling function - preserves units'
		}
	],
	[
		'round',
		{
			name: 'round',
			inputRequirement: 'any',
			outputUnit: 'preserve',
			description: 'Round function - preserves units'
		}
	],
	[
		'sign',
		{
			name: 'sign',
			inputRequirement: 'any',
			outputUnit: 'dimensionless',
			description: 'Sign function - produces dimensionless (-1, 0, or 1)'
		}
	]
]);

// =============================================================================
// Rule Lookup Utilities
// =============================================================================

/**
 * Gets the function rule for a given function name.
 * Returns the default rule if defined, or undefined for unknown functions.
 *
 * @param name - Function name to look up
 * @param customRules - Optional custom rules that override defaults
 * @returns The function rule, or undefined if not found
 *
 * @example
 * ```typescript
 * const sinRule = getFunctionRule('sin');
 * const customRule = getFunctionRule('myFunc', customRulesMap);
 * ```
 */
export function getFunctionRule(
	name: string,
	customRules?: ReadonlyMap<string, FunctionRule>
): FunctionRule | undefined {
	// Check custom rules first (allows overriding defaults)
	if (customRules?.has(name)) {
		return customRules.get(name);
	}

	// Fall back to defaults
	return DEFAULT_FUNCTION_RULES.get(name as BuiltInFunctionName);
}

/**
 * Checks if a function is known (has a defined rule).
 *
 * @param name - Function name to check
 * @param customRules - Optional custom rules
 * @returns True if the function has a rule defined
 */
export function isKnownFunction(
	name: string,
	customRules?: ReadonlyMap<string, FunctionRule>
): boolean {
	return getFunctionRule(name, customRules) !== undefined;
}

/**
 * Creates a custom function rule.
 * Utility function for defining rules with proper typing.
 *
 * @example
 * ```typescript
 * const myRule = createFunctionRule('integrate', {
 *   inputRequirement: 'any',
 *   outputUnit: 'preserve',
 *   description: 'Integration preserves units'
 * });
 * ```
 */
export function createFunctionRule(
	name: string,
	options: Omit<FunctionRule, 'name'>
): FunctionRule {
	return {
		name,
		...options
	};
}

/**
 * Merges custom rules with default rules.
 * Custom rules take precedence over defaults.
 *
 * @param customRules - Custom rules to merge
 * @returns Combined rules map
 */
export function mergeWithDefaultRules(
	customRules: ReadonlyMap<string, FunctionRule>
): ReadonlyMap<string, FunctionRule> {
	const merged = new Map<string, FunctionRule>(DEFAULT_FUNCTION_RULES);

	for (const [name, rule] of customRules) {
		merged.set(name, rule);
	}

	return merged;
}
