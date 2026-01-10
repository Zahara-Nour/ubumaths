/**
 * MathAST Unit-Aware Evaluation
 *
 * Evaluates mathematical expressions with unit propagation and validation.
 * Combines numeric evaluation with dimensional analysis for complete
 * unit-aware computation.
 *
 * @module mathAST/eval/evaluate-with-units
 */

import { evaluate, evaluateNodeToApproximatedNumber } from './evaluate';
import type {
	EvalWithUnitsOptions,
	EvalResultWithUnit,
	UnitConversionMode,
	EvalValue,
	ComplexValueResult
} from './types';
import { DEFAULT_EVAL_WITH_UNITS_OPTIONS } from './types';
import { analyzeDimensions } from '../dimensional/analyzer';
import type { DimensionalContext } from '../dimensional/types';
import type { Unit } from '../units/types';
import { getConversionFactor, normalizeToBase } from '../units/conversion';
import { getUnitFamily } from '../units/definitions';
import { UnitAST } from '../units/factory';
import type { MathNode } from '../types';
import { isUnit } from '../guards';
import { number, withUnit } from '../factory';
import { mapNode } from '../transforms';

// =============================================================================
// Constants
// =============================================================================

/**
 * Ideal numeric range for "best" unit selection.
 * Values in this range are considered human-readable.
 */
const MIN_READABLE = 0.1;
const MAX_READABLE = 1000;

/**
 * Epsilon for floating-point comparisons.
 */
const EPSILON = 1e-9;

// =============================================================================
// Error Classes
// =============================================================================

/**
 * Error thrown when dimensions are incompatible during evaluation.
 */
export class DimensionalEvaluationError extends Error {
	constructor(
		message: string,
		public readonly errors: readonly { code: string; message: string }[]
	) {
		super(message);
		this.name = 'DimensionalEvaluationError';
	}
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Collect unit information from an expression.
 *
 * Traverses the AST to find all UnitNodes and returns:
 * - first: The first unit encountered (for 'first' mode)
 * - all: Array of all units found (for 'best' mode)
 *
 * @param node - The expression to analyze
 * @returns Object with first unit and array of all units
 */
function collectUnitsFromExpression(node: MathNode): {
	first: Unit | null;
	all: Unit[];
} {
	let first: Unit | null = null;
	const all: Unit[] = [];

	function traverse(n: MathNode): void {
		if (isUnit(n)) {
			if (first === null) {
				first = n.unit;
			}
			all.push(n.unit);
			// Also traverse the inner expression
			traverse(n.expression);
		} else {
			// Traverse children based on node type
			switch (n.type) {
				case 'addition':
				case 'subtraction':
				case 'multiplication':
					traverse(n.left);
					traverse(n.right);
					break;
				case 'division':
					traverse(n.numerator);
					traverse(n.denominator);
					break;
				case 'superscript':
					traverse(n.base);
					traverse(n.superscript);
					break;
				case 'subscript':
					traverse(n.base);
					traverse(n.subscript);
					break;
				case 'opposite':
				case 'positive':
					traverse(n.operand);
					break;
				case 'delimiter':
					traverse(n.content);
					break;
				case 'function':
					for (const arg of n.args) {
						traverse(arg);
					}
					break;
				case 'relation':
					traverse(n.left);
					traverse(n.right);
					break;
				case 'composition':
					traverse(n.outer);
					traverse(n.inner);
					break;
				// Leaf nodes: number, variable, greek, symbol, hole
				default:
					break;
			}
		}
	}

	traverse(node);
	return { first, all };
}

/**
 * Get the primary base symbol from a unit.
 *
 * For simple units, returns the first component's symbol.
 * For composite units (like m/s), returns null.
 *
 * @param unit - The unit to analyze
 * @returns The base symbol or null for composite units
 */
function getPrimaryBaseSymbol(unit: Unit): string | null {
	const entries = Array.from(unit.components.entries());

	// Simple unit: exactly one component with exponent 1
	if (entries.length === 1 && entries[0][1] === 1) {
		return entries[0][0];
	}

	// Composite or powered unit - no primary symbol
	return null;
}

/**
 * Create a pure SI base unit (coefficient = 1) from a unit.
 *
 * Takes any unit and returns the equivalent SI base unit with coefficient = 1.
 * This is used for SI mode conversion where all values should be in base units.
 *
 * @param unit - The unit to convert
 * @returns SI base unit with coefficient = 1
 */
function toSIBaseUnit(unit: Unit): Unit {
	// Normalize to get base symbols
	const normalized = normalizeToBase(unit);

	// Return with coefficient = 1 (pure SI base)
	return {
		components: normalized.components,
		coefficient: 1
	};
}

/**
 * Select the "best" unit for a given value.
 *
 * Chooses the unit that puts the value in the most readable range (0.1 to 1000).
 * If no unit fits this range, selects the unit with the closest fit.
 *
 * @param valueInSI - The numeric value in SI base units
 * @param baseUnit - The SI base unit
 * @returns Object with converted value and selected unit
 */
function selectBestUnit(valueInSI: number, baseUnit: Unit): { value: number; unit: Unit } {
	// Handle zero and near-zero values - keep SI base unit
	if (Math.abs(valueInSI) < EPSILON) {
		return { value: valueInSI, unit: baseUnit };
	}

	const baseSymbol = getPrimaryBaseSymbol(baseUnit);

	// For composite units, fall back to SI
	if (baseSymbol === null) {
		return { value: valueInSI, unit: baseUnit };
	}

	// Get the family of compatible units
	const family = getUnitFamily(baseSymbol);

	let bestUnit: Unit = baseUnit;
	let bestValue: number = valueInSI;
	let bestScore: number = Infinity;

	for (const symbol of family) {
		const candidateUnit = UnitAST.unit(symbol);
		if (candidateUnit === null) continue;

		// Calculate the value in this unit
		const factor = getConversionFactor(baseUnit, candidateUnit);
		if (factor === null) continue;

		const convertedValue = valueInSI * factor;
		const absValue = Math.abs(convertedValue);

		// Check if in ideal range
		if (absValue >= MIN_READABLE && absValue <= MAX_READABLE) {
			return { value: convertedValue, unit: candidateUnit };
		}

		// Calculate score (distance from ideal range on log scale)
		let score: number;
		if (absValue < MIN_READABLE) {
			score = Math.log10(MIN_READABLE / absValue);
		} else {
			score = Math.log10(absValue / MAX_READABLE);
		}

		if (score < bestScore) {
			bestScore = score;
			bestValue = convertedValue;
			bestUnit = candidateUnit;
		}
	}

	return { value: bestValue, unit: bestUnit };
}

/**
 * Transform an expression by converting all UnitNodes to a target unit.
 *
 * For each UnitNode, converts its numeric value to the target unit
 * by applying the appropriate conversion factor.
 *
 * @param node - The expression to transform
 * @param targetUnit - The target unit for conversion
 * @returns Transformed expression with values converted
 *
 * @example
 * // For expression: 5 km + 3000 m, with targetUnit = km
 * // - 5 km:   factor = 1 (km → km), no conversion needed
 * // - 3000 m: factor = 0.001 (m → km), becomes 3 km
 * // Result: 5 km + 3 km
 */
function transformToTargetUnit(node: MathNode, targetUnit: Unit): MathNode {
	return mapNode(node, (n) => {
		if (isUnit(n)) {
			// Get conversion factor: how many targetUnits equal one source unit
			// Examples:
			// - m → km:  factor = 0.001 (1 m = 0.001 km)
			// - km → m:  factor = 1000  (1 km = 1000 m)
			// - km → km: factor = 1     (no conversion)
			const factor = getConversionFactor(n.unit, targetUnit);

			if (factor === null) {
				// Should not happen if dimensional analysis passed
				return n;
			}

			// If factor ≈ 1, source and target units are the same (or equivalent).
			// Skip conversion to avoid unnecessary computation.
			// We use EPSILON tolerance for floating-point comparison safety.
			if (Math.abs(factor - 1) < EPSILON) {
				return n;
			}

			// Apply conversion: newValue = originalValue * factor
			// Example: 3000 m → km = 3000 * 0.001 = 3 km
			const innerNode = n.expression;

			if (innerNode.type === 'number') {
				// Direct conversion of numeric value
				const originalValue = parseFloat(innerNode.value);
				const convertedValue = originalValue * factor;
				return withUnit(number(String(convertedValue)), targetUnit);
			}

			// For complex expressions (e.g., (2+3) km), wrap with multiplication.
			// The multiplication will be evaluated later by evaluate().
			return withUnit(
				{
					type: 'multiplication',
					left: number(String(factor)),
					right: innerNode,
					style: 'implicit',
					displayStyle: 'implicit'
				} as MathNode,
				targetUnit
			);
		}
		return n;
	});
}

/**
 * Type guard for MathNode.
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

/**
 * Type guard for ComplexValueResult.
 */
function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
}

/**
 * Extract the numeric value from an EvalResult.
 * Throws if value is complex with non-zero imaginary part.
 */
function getNumericValue(value: EvalValue): number {
	if (isComplex(value)) {
		if (value.imag !== 0) {
			throw new Error(
				'Cannot convert complex number with non-zero imaginary part to numeric value'
			);
		}
		return value.real;
	}
	if (isMathNode(value)) {
		// For MathNode values (from exact mode), evaluate numerically
		return evaluateNodeToApproximatedNumber(value);
	}
	return value;
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Evaluates a mathematical expression with unit propagation and validation.
 *
 * This function combines numeric evaluation with dimensional analysis to:
 * 1. Validate dimensional compatibility (throws on incompatible units)
 * 2. Propagate units through operations
 * 3. Convert values based on the conversion mode
 *
 * @param node - The MathAST node to evaluate
 * @param options - Evaluation options including conversion mode
 * @returns EvalResultWithUnit containing value, node, exactness, and unit
 *
 * @throws DimensionalEvaluationError if dimensions are incompatible
 * @throws Error for standard evaluation errors (division by zero, etc.)
 *
 * @example
 * // Adding same units: 5 km + 3000 m = 8 km (first mode)
 * const result = evaluateWithUnits(parseLatex('5~\\unit{km}+3000~\\unit{m}'));
 * // result.value = 8, result.unit = km
 *
 * @example
 * // SI mode: 5 km + 3000 m = 8000 m
 * const result = evaluateWithUnits(expr, { conversionMode: 'si' });
 * // result.value = 8000, result.unit = m
 *
 * @example
 * // Incompatible units: 5 m + 3 s -> throws
 * evaluateWithUnits(parseLatex('5~\\unit{m}+3~\\unit{s}'));
 * // throws: DimensionalEvaluationError
 */
export function evaluateWithUnits(
	node: MathNode,
	options?: EvalWithUnitsOptions
): EvalResultWithUnit {
	// Merge options with defaults
	const opts = {
		...DEFAULT_EVAL_WITH_UNITS_OPTIONS,
		...options
	};

	const conversionMode: UnitConversionMode = opts.conversionMode ?? 'first';

	// Step 1: Build dimensional context from variable units
	const dimensionalContext: DimensionalContext = {
		variables: opts.variableUnits,
		options: {
			strictMode: true,
			allowDimensionlessMix: false,
			allowFractionalExponents: true
		}
	};

	// Step 2: Analyze dimensions and validate
	const analysis = analyzeDimensions(node, dimensionalContext);

	if (!analysis.valid) {
		throw new DimensionalEvaluationError(
			analysis.errors.map((e) => e.message).join('; '),
			analysis.errors.map((e) => ({ code: e.code, message: e.message }))
		);
	}

	// Step 3: Collect units from expression
	const { first: firstUnit } = collectUnitsFromExpression(node);

	// Step 4: Get the result unit from dimensional analysis
	// This is the correctly computed unit for derived operations (m*m -> m^2, m/s -> m.s^-1)
	const resultUnit = analysis.resultUnit ?? UnitAST.dimensionless();

	// Step 5: Determine target unit for conversion and final unit based on mode
	let conversionTargetUnit: Unit;
	let finalUnit: Unit;
	let originalUnit: Unit | undefined;

	if (conversionMode === 'si') {
		// Normalize to SI base units with coefficient = 1
		conversionTargetUnit = toSIBaseUnit(resultUnit);
		finalUnit = conversionTargetUnit;
		if (firstUnit && getConversionFactor(firstUnit, conversionTargetUnit) !== 1) {
			originalUnit = firstUnit;
		}
	} else if (conversionMode === 'best') {
		// We need to evaluate first to get the numeric value for best selection
		// Use SI base with coefficient = 1 first, then select best
		const siUnit = toSIBaseUnit(resultUnit);
		const siTransformed = transformToTargetUnit(node, siUnit);
		const siResult = evaluate(siTransformed, {
			mode: opts.mode,
			precision: opts.precision,
			functions: opts.functions
		});

		const siValue = getNumericValue(siResult.value);
		const best = selectBestUnit(siValue, siUnit);

		finalUnit = best.unit;
		if (firstUnit) {
			originalUnit = firstUnit;
		}

		// Return early with best unit result
		// Note: In 'best' mode, the node is always a NumberNode with the converted value,
		// unlike 'first'/'si' modes which preserve the evaluated node structure.
		// This is because we need to represent the value in the selected "best" unit.
		return {
			value: best.value,
			node: number(String(best.value)),
			exact: siResult.exact,
			unit: finalUnit,
			...(originalUnit && { originalUnit })
		};
	} else {
		// 'first' mode - use first unit for conversion, but resultUnit as final
		// For addition/subtraction: convert to first unit, resultUnit matches first
		// For multiplication/division: no conversion needed, resultUnit is computed
		conversionTargetUnit = firstUnit ?? resultUnit;
		finalUnit = resultUnit;
	}

	// Step 6: Transform expression to conversion target unit
	const transformedNode = transformToTargetUnit(node, conversionTargetUnit);

	// Step 7: Evaluate the transformed expression
	const evalResult = evaluate(transformedNode, {
		mode: opts.mode,
		precision: opts.precision,
		functions: opts.functions
	});

	// Step 8: Build and return result with the correctly computed finalUnit
	return {
		value: evalResult.value,
		node: evalResult.node,
		exact: evalResult.exact,
		unit: finalUnit,
		...(originalUnit && { originalUnit })
	};
}
