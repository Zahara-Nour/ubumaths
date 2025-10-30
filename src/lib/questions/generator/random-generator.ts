/**
 * Random Number Generator
 * =======================
 *
 * Generates random numbers based on RandomSpec with support for:
 * - Variable resolution in bounds and digits
 * - Complex exclusion patterns
 * - Seeded random for reproducibility
 * - Integer and decimal generation
 *
 * @module questions/generator/random-generator
 */

import type { RandomSpec, NumberOrVariable, ResolvedVariable } from '../types';

/**
 * Variable context - can be array or object
 */
export type VariableContext = ResolvedVariable[] | Record<string, number | string>;

/**
 * Resolve a NumberOrVariable to an actual number
 *
 * @param value - Number or variable reference
 * @param resolvedVariables - Already resolved variables (array or object)
 * @returns Resolved number
 * @throws Error if variable not found or not numeric
 */
export function resolveNumberOrVariable(
	value: NumberOrVariable,
	resolvedVariables: VariableContext
): number {
	if (value.type === 'number') {
		return value.value;
	}

	// value.type === 'variable'
	// Handle object format (for tests)
	if (!Array.isArray(resolvedVariables)) {
		const varValue = resolvedVariables[value.name];
		if (varValue === undefined) {
			throw new Error(`Variable "${value.name}" not found or not yet resolved`);
		}
		const num = typeof varValue === 'number' ? varValue : parseFloat(varValue);
		if (isNaN(num)) {
			throw new Error(`Variable "${value.name}" does not resolve to a number: ${varValue}`);
		}
		return num;
	}

	// Handle array format (production)
	const variable = resolvedVariables.find((v) => v.name === value.name);
	if (!variable) {
		throw new Error(`Variable "${value.name}" not found or not yet resolved`);
	}

	const num = parseFloat(variable.value);
	if (isNaN(num)) {
		throw new Error(`Variable "${value.name}" does not resolve to a number: ${variable.value}`);
	}

	return num;
}

/**
 * Generate a random number based on specification
 *
 * @param spec - Random specification
 * @param resolvedVariables - Already resolved variables
 * @param seed - Optional seed for reproducibility
 * @returns Generated random number
 * @throws Error if generation fails or validation fails
 *
 * @example
 * ```typescript
 * // Simple integer
 * generateRandomNumber({ type: 'integer', min: 1, max: 10, exclusions: [] }, [], 42)
 *
 * // With variable bounds
 * const vars = [{ name: 'max', value: '20' }];
 * generateRandomNumber({ type: 'integer', min: 1, max: {type:'variable',name:'max'}, exclusions: [] }, vars)
 *
 * // With exclusions
 * generateRandomNumber({ type: 'integer', min: 1, max: 20, exclusions: [{type:'value',value:5}] }, [])
 * ```
 */
export function generateRandomNumber(
	spec: RandomSpec,
	resolvedVariables: VariableContext,
	seed?: number
): number {
	// 1. Resolve variables in bounds/digits
	let min: number | undefined;
	let max: number | undefined;
	let digitsBefore: number | undefined;
	let digitsAfter: number | undefined;

	if (spec.type === 'integer' || spec.type === 'decimal-range') {
		min = resolveNumberOrVariable(spec.min, resolvedVariables);
		max = resolveNumberOrVariable(spec.max, resolvedVariables);

		// Validate min <= max (allow single value ranges)
		if (min > max) {
			throw new Error(`Invalid range: min (${min}) must be less than or equal to max (${max})`);
		}
	}

	if (spec.type === 'decimal-by-digits') {
		digitsBefore = resolveNumberOrVariable(spec.digitsBefore, resolvedVariables);
		digitsAfter = resolveNumberOrVariable(spec.digitsAfter, resolvedVariables);

		// Validate digits are non-negative integers
		if (!Number.isInteger(digitsBefore) || digitsBefore < 0) {
			throw new Error(`digitsBefore must be a non-negative integer, got ${digitsBefore}`);
		}
		if (!Number.isInteger(digitsAfter) || digitsAfter < 0) {
			throw new Error(`digitsAfter must be a non-negative integer, got ${digitsAfter}`);
		}
	}

	// Validate step for decimal ranges
	if (spec.type === 'decimal-range') {
		if (spec.step <= 0) {
			throw new Error(`Step must be positive, got ${spec.step}`);
		}
	}

	// 2. Resolve exclusions
	const excludedValues = new Set<number>();

	for (const exclusion of spec.exclusions) {
		if (exclusion.type === 'value') {
			const value = resolveNumberOrVariable(exclusion.value, resolvedVariables);
			excludedValues.add(value);
		} else if (exclusion.type === 'range') {
			const excludeMin = resolveNumberOrVariable(exclusion.min, resolvedVariables);
			const excludeMax = resolveNumberOrVariable(exclusion.max, resolvedVariables);

			// Validate exclusion range
			if (excludeMin >= excludeMax) {
				throw new Error(
					`Invalid exclusion range: min (${excludeMin}) must be less than max (${excludeMax})`
				);
			}

			// Generate all values in range
			if (spec.type === 'integer') {
				for (let i = Math.ceil(excludeMin); i <= Math.floor(excludeMax); i++) {
					excludedValues.add(i);
				}
			} else if (spec.type === 'decimal-range') {
				// For decimals, use step
				const step = spec.step || 0.01;
				for (let i = excludeMin; i <= excludeMax; i += step) {
					excludedValues.add(parseFloat(i.toFixed(10))); // Avoid float errors
				}
			}
		}
	}

	// 3. Generate random number
	let value: number;
	let attempts = 0;
	const MAX_ATTEMPTS = 10000;

	do {
		if (spec.type === 'integer') {
			value = randomInt(min!, max!, seed ? seed + attempts : undefined);
		} else if (spec.type === 'decimal-by-digits') {
			value = randomDecimalByDigits(
				digitsBefore!,
				digitsAfter!,
				seed ? seed + attempts : undefined
			);
		} else {
			// spec.type === 'decimal-range'
			value = randomDecimalByRange(min!, max!, spec.step, seed ? seed + attempts : undefined);
		}

		attempts++;
		if (attempts > MAX_ATTEMPTS) {
			throw new Error(
				`Unable to generate random number with given exclusions after ${MAX_ATTEMPTS} attempts. ` +
					`Range: [${min}, ${max}], Excluded: ${excludedValues.size} values`
			);
		}
	} while (excludedValues.has(value));

	return value;
}

/**
 * Generate a random integer between min and max (inclusive)
 *
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param seed - Optional seed for reproducibility
 * @returns Random integer
 */
export function randomInt(min: number, max: number, seed?: number): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Generate a random decimal with specified digits before and after decimal point
 *
 * @param digitsBefore - Number of digits before decimal point
 * @param digitsAfter - Number of digits after decimal point
 * @param seed - Optional seed
 * @returns Random decimal
 *
 * @example
 * ```typescript
 * randomDecimalByDigits(2, 3)  // Returns e.g., 45.123
 * randomDecimalByDigits(1, 2)  // Returns e.g., 7.89
 * ```
 */
export function randomDecimalByDigits(
	digitsBefore: number,
	digitsAfter: number,
	seed?: number
): number {
	const random1 = seed !== undefined ? seededRandom(seed) : Math.random();
	const random2 = seed !== undefined ? seededRandom(seed + 1) : Math.random();

	// Generate digits before decimal point
	const maxBefore = Math.pow(10, digitsBefore) - 1;
	const minBefore = digitsBefore > 1 ? Math.pow(10, digitsBefore - 1) : 0;
	const beforePart = Math.floor(random1 * (maxBefore - minBefore + 1)) + minBefore;

	// Generate digits after decimal point
	const afterPart = Math.floor(random2 * Math.pow(10, digitsAfter));
	const afterStr = afterPart.toString().padStart(digitsAfter, '0');

	return parseFloat(`${beforePart}.${afterStr}`);
}

/**
 * Generate a random decimal in a range with a step
 *
 * @param min - Minimum value
 * @param max - Maximum value
 * @param step - Step between values
 * @param seed - Optional seed
 * @returns Random decimal
 *
 * @example
 * ```typescript
 * randomDecimalByRange(0.5, 9.99, 0.01)  // Returns e.g., 5.37
 * ```
 */
export function randomDecimalByRange(
	min: number,
	max: number,
	step: number,
	seed?: number
): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	const steps = Math.floor((max - min) / step);
	const selectedStep = Math.floor(random * (steps + 1));
	return parseFloat((min + selectedStep * step).toFixed(10)); // Avoid float errors
}

/**
 * Seeded pseudo-random number generator
 *
 * Uses simple sine-based PRNG for reproducibility.
 * Not cryptographically secure, but sufficient for educational content.
 *
 * @param seed - Seed value
 * @returns Pseudo-random number between 0 and 1
 */
export function seededRandom(seed: number): number {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}
