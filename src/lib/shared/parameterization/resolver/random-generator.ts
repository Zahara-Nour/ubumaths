/**
 * Random Generator - Generate random numbers from specifications
 * ===============================================================
 *
 * Generates random numbers according to RandomSpec with:
 * - Optional seed for reproducibility
 * - Variable bound resolution
 * - Exclusion pattern support
 * - Multiple decimal formats
 *
 * @module shared/parameterization/resolver/random-generator
 */

import type { RandomSpec, ResolvedVariable, NumberOrVariable } from '../types';
import { seededRandom } from '$lib/utils/random';

/**
 * Generate a random number from specification
 *
 * Supports:
 * - Integer ranges: 1-10
 * - Decimal by digits: 2.3 (2 digits before, 3 after)
 * - Decimal ranges with step: 0.5-9.99:0.01
 * - Variable bounds: min/max from resolved variables
 * - Exclusion patterns: single values, ranges, variables
 * - Seeded generation for reproducibility
 *
 * @param spec - Random specification to generate from
 * @param resolvedVariables - Previously resolved variables (for bounds and exclusions)
 * @param seed - Optional seed for reproducibility
 * @returns Generated random number
 * @throws Error if spec is invalid or no valid values remain after exclusions
 *
 * @example Integer range
 * ```typescript
 * generateRandomNumber(
 *   { type: 'integer', min: {type:'number',value:1}, max: {type:'number',value:10}, exclusions: [] },
 *   [],
 *   12345
 * )
 * // → 7 (deterministic with seed)
 * ```
 *
 * @example Decimal by digits
 * ```typescript
 * generateRandomNumber(
 *   { type: 'decimal-by-digits', digitsBefore: {type:'number',value:2}, digitsAfter: {type:'number',value:3}, exclusions: [] },
 *   [],
 *   12345
 * )
 * // → 47.391 (2 digits before decimal, 3 after)
 * ```
 *
 * @example Decimal range with step
 * ```typescript
 * generateRandomNumber(
 *   { type: 'decimal-range', min: {type:'number',value:0.5}, max: {type:'number',value:9.99}, step: 0.01, exclusions: [] },
 *   [],
 *   12345
 * )
 * // → 5.37 (multiples of 0.01 between 0.5 and 9.99)
 * ```
 *
 * @example With exclusions
 * ```typescript
 * generateRandomNumber(
 *   {
 *     type: 'integer',
 *     min: {type:'number',value:1},
 *     max: {type:'number',value:10},
 *     exclusions: [
 *       { type: 'value', value: {type:'number',value:5} },
 *       { type: 'range', min: {type:'number',value:7}, max: {type:'number',value:9} }
 *     ]
 *   },
 *   [],
 *   12345
 * )
 * // → Returns 1,2,3,4,6, or 10 (excludes 5,7,8,9)
 * ```
 *
 * @example Variable bounds
 * ```typescript
 * generateRandomNumber(
 *   {
 *     type: 'integer',
 *     min: {type:'variable',name:'min'},
 *     max: {type:'variable',name:'max'},
 *     exclusions: []
 *   },
 *   [
 *     { name: 'min', value: '5' },
 *     { name: 'max', value: '20' }
 *   ],
 *   12345
 * )
 * // → Random number between 5 and 20
 * ```
 *
 * @example Variable exclusion
 * ```typescript
 * generateRandomNumber(
 *   {
 *     type: 'integer',
 *     min: {type:'number',value:1},
 *     max: {type:'number',value:10},
 *     exclusions: [
 *       { type: 'value', value: {type:'variable',name:'a'} }
 *     ]
 *   },
 *   [{ name: 'a', value: '5' }],
 *   12345
 * )
 * // → Random number 1-10 excluding 5
 * ```
 */
export function generateRandomNumber(
	spec: RandomSpec,
	resolvedVariables: ResolvedVariable[],
	seed?: number
): number {
	// 1. Resolve variables in bounds/digits
	let min: number | undefined;
	let max: number | undefined;
	let digitsBefore: number | undefined;
	let digitsAfter: number | undefined;

	if (
		spec.type === 'integer' ||
		spec.type === 'decimal-range' ||
		spec.type === 'relative-integer'
	) {
		min = resolveNumberOrVariable(spec.min, resolvedVariables);
		max = resolveNumberOrVariable(spec.max, resolvedVariables);

		// Validate min <= max (allow single value ranges)
		if (min !== undefined && max !== undefined && min > max) {
			throw new Error(`Invalid range: min (${min}) must be less than or equal to max (${max})`);
		}

		// For relative integers, min must be positive (represents the absolute value)
		if (spec.type === 'relative-integer' && min !== undefined && min <= 0) {
			throw new Error(`Relative integer min must be positive, got ${min}`);
		}
	}

	if (spec.type === 'decimal-by-digits') {
		digitsBefore = resolveNumberOrVariable(spec.digitsBefore, resolvedVariables);
		digitsAfter = resolveNumberOrVariable(spec.digitsAfter, resolvedVariables);

		// Validate digits are non-negative integers
		if (digitsBefore !== undefined && (!Number.isInteger(digitsBefore) || digitsBefore < 0)) {
			throw new Error(`digitsBefore must be a non-negative integer, got ${digitsBefore}`);
		}
		if (digitsAfter !== undefined && (!Number.isInteger(digitsAfter) || digitsAfter < 0)) {
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
			// For relative integers, also exclude the negation
			if (spec.type === 'relative-integer') {
				excludedValues.add(-value);
			}
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
			if (spec.type === 'integer' || spec.type === 'relative-integer') {
				for (let i = Math.ceil(excludeMin); i <= Math.floor(excludeMax); i++) {
					excludedValues.add(i);
					// For relative integers, also exclude the negation
					if (spec.type === 'relative-integer') {
						excludedValues.add(-i);
					}
				}
			} else {
				// For decimals, use step
				const step = spec.type === 'decimal-range' ? spec.step : 0.01;
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
		} else if (spec.type === 'relative-integer') {
			value = randomRelativeInt(min!, max!, seed ? seed + attempts : undefined);
		} else if (spec.type === 'decimal-by-digits') {
			value = randomDecimalByDigits(
				digitsBefore!,
				digitsAfter!,
				seed ? seed + attempts : undefined
			);
		} else {
			value = randomDecimalByRange(
				min!,
				max!,
				spec.step || 0.01,
				seed ? seed + attempts : undefined
			);
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
 * Resolve a NumberOrVariable to an actual number
 */
function resolveNumberOrVariable(
	value: NumberOrVariable,
	resolvedVariables: ResolvedVariable[]
): number {
	if (value.type === 'number') {
		return value.value;
	}

	// Find variable
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
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number, seed?: number): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	return Math.floor(random * (max - min + 1)) + min;
}

/**
 * Generate a random relative integer from union of {-max..-min} ∪ {min..max}
 *
 * Example: min=2, max=9 → picks from {-9,-8,-7,-6,-5,-4,-3,-2, 2,3,4,5,6,7,8,9}
 */
function randomRelativeInt(min: number, max: number, seed?: number): number {
	// Total values: (max - min + 1) * 2 (negative range + positive range)
	const rangeSize = max - min + 1;
	const totalValues = rangeSize * 2;

	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	const index = Math.floor(random * totalValues);

	if (index < rangeSize) {
		// Negative range: -max to -min
		return -(max - index);
	} else {
		// Positive range: min to max
		return min + (index - rangeSize);
	}
}

/**
 * Generate a random decimal with specified digits before and after decimal point
 */
function randomDecimalByDigits(digitsBefore: number, digitsAfter: number, seed?: number): number {
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
 */
function randomDecimalByRange(min: number, max: number, step: number, seed?: number): number {
	const random = seed !== undefined ? seededRandom(seed) : Math.random();
	const steps = Math.floor((max - min) / step);
	const selectedStep = Math.floor(random * (steps + 1));
	return parseFloat((min + selectedStep * step).toFixed(10)); // Avoid float errors
}
