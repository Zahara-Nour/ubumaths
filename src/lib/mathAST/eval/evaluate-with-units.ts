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
import {
	getConversionFactor,
	isAffine,
	normalizeToBase,
	recognizeDerivedUnit
} from '../units/conversion';
import { getUnitFamily } from '../units/definitions';
import { UnitAST } from '../units/factory';
import type { MathNode } from '../types';
import { isUnit } from '../guards';
import { withUnit } from '../factory';
import { numericNode } from '../common/numeric';
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
				return withUnit(numericNode(convertedValue), targetUnit);
			}

			// For complex expressions (e.g., (2+3) km), wrap with multiplication.
			// The multiplication will be evaluated later by evaluate().
			return withUnit(
				{
					type: 'multiplication',
					left: numericNode(factor),
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
 * Normalize each UnitNode in the expression to its own SI base form
 * (coefficient = 1), absorbing the prefix factor into the value.
 *
 * Unlike {@link transformToTargetUnit}, this does **not** require a common
 * target unit — each UnitNode is rewritten independently. After this pass,
 * a downstream multiplication of values produces a result whose unit's
 * coefficient is exactly 1 (pure SI base). This is necessary in 'best' mode
 * for derived-unit recognition (Newton, Joule, ...) where the target unit
 * is composite and cannot be reached via a single conversion factor.
 *
 * **Precondition**: no affine units (°C, °F) anywhere in `node`.
 * `detectAffineComposition` must have already short-circuited those cases —
 * the formula `value × unit.coefficient` is wrong for affine units (it
 * ignores the offset).
 *
 * @example
 * // 5 kg → 5000 g (g now coefficient 1)
 * // 3 m  → 3 m   (already coefficient 1)
 * // 1 s  → 1 s   (already coefficient 1)
 */
function normalizeAllUnitsToBase(node: MathNode): MathNode {
	return mapNode(node, (n) => {
		if (!isUnit(n)) return n;

		// Already in pure base form (coefficient ≈ 1) and components map is
		// keyed by SI base symbols.
		if (Math.abs(n.unit.coefficient - 1) < EPSILON) return n;

		const baseUnit: Unit = {
			components: n.unit.components,
			coefficient: 1
		};
		const factor = n.unit.coefficient;
		const innerNode = n.expression;

		if (innerNode.type === 'number') {
			const originalValue = parseFloat(innerNode.value);
			return withUnit(numericNode(originalValue * factor), baseUnit);
		}

		return withUnit(
			{
				type: 'multiplication',
				left: numericNode(factor),
				right: innerNode,
				style: 'implicit',
				displayStyle: 'implicit'
			} as MathNode,
			baseUnit
		);
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
	if (typeof value === 'boolean') {
		throw new Error('Cannot convert boolean result to numeric value');
	}
	return value;
}

// =============================================================================
// Affine (Temperature) Operations
// =============================================================================

/**
 * Detect any composition (multiplication, division, exponentiation) involving
 * an affine unit (°C, °F) anywhere in the expression.
 *
 * Affine units have an offset that makes multiplicative composition undefined:
 * `5°C × 2` could mean `10°C` or `546.3 K` depending on interpretation.
 * To avoid ambiguity all such compositions are forbidden.
 *
 * Plain addition/subtraction is allowed and handled by
 * {@link tryEvaluateAffineBinary}.
 */
function detectAffineComposition(node: MathNode): boolean {
	let found = false;

	function visit(n: MathNode, withinComposition: boolean): void {
		if (found) return;

		if (isUnit(n)) {
			if (withinComposition && isAffine(n.unit)) {
				found = true;
				return;
			}
			visit(n.expression, withinComposition);
			return;
		}

		switch (n.type) {
			// --- Composition contexts (affine units forbidden as descendants) ---
			case 'multiplication':
				visit(n.left, true);
				visit(n.right, true);
				break;
			case 'division':
				visit(n.numerator, true);
				visit(n.denominator, true);
				break;
			case 'superscript':
				visit(n.base, true);
				visit(n.superscript, true);
				break;
			case 'function':
				// sin(°C), exp(°C), etc. are meaningless.
				for (const arg of n.args) {
					visit(arg, true);
				}
				break;
			case 'composition':
				// f ∘ g treats inner/outer as composed (function-of-function).
				visit(n.outer, true);
				visit(n.inner, true);
				break;
			case 'logical':
				// and/or applied to quantities is meaningless.
				visit(n.left, true);
				visit(n.right, true);
				break;
			case 'logical-not':
				visit(n.operand, true);
				break;
			case 'limit':
				// lim involves an evaluation, treat the expression as composed
				// to be conservative.
				visit(n.expression, true);
				visit(n.approach, true);
				break;

			// --- Pass-through contexts (preserve withinComposition) ---
			case 'addition':
			case 'subtraction':
				visit(n.left, withinComposition);
				visit(n.right, withinComposition);
				break;
			case 'opposite':
			case 'positive':
				visit(n.operand, withinComposition);
				break;
			case 'delimiter':
				visit(n.content, withinComposition);
				break;
			case 'relation':
				// 5°C > 3°C is a comparison; both sides retain context.
				visit(n.left, withinComposition);
				visit(n.right, withinComposition);
				break;
			case 'subscript':
				// x_1: base is the value, subscript is an index. Keep context.
				visit(n.base, withinComposition);
				visit(n.subscript, withinComposition);
				break;
			case 'piecewise':
				for (const piece of n.pieces) {
					visit(piece.condition, withinComposition);
					visit(piece.value, withinComposition);
				}
				if (n.otherwise) visit(n.otherwise, withinComposition);
				break;
			case 'matrix':
				for (const row of n.rows) {
					for (const cell of row) {
						visit(cell, withinComposition);
					}
				}
				break;

			// --- Leaf nodes (no children) ---
			// number, variable, greek, symbol, hole, constant, boolean,
			// complex, infinity, signed-zero
			default:
				break;
		}
	}

	visit(node, false);
	return found;
}

/**
 * Build a DimensionalEvaluationError for affine composition violations.
 */
function affineCompositionError(detail: string): DimensionalEvaluationError {
	const message = `AFFINE_COMPOSITION_FORBIDDEN: ${detail}`;
	return new DimensionalEvaluationError(message, [
		{ code: 'AFFINE_COMPOSITION_FORBIDDEN', message }
	]);
}

/**
 * Handle direct top-level binary additions/subtractions involving affine units.
 *
 * Semantics:
 * - sub(°C/F, °C/F): difference of absolute temperatures → result in K (delta)
 * - sub(°C/F, K):    absolute - delta → absolute, in left's unit
 * - add(°C/F, °C/F): forbidden (sum of absolutes)
 * - add(°C/F, K):    absolute + delta → absolute, in left's unit
 * - add(K, °C/F):    delta + absolute → absolute, in right's unit
 * - sub(K, °C/F):    forbidden (delta - absolute is meaningless)
 *
 * Returns null if the node is not a recognized affine binary pattern.
 * Throws DimensionalEvaluationError for forbidden patterns.
 */
function tryEvaluateAffineBinary(node: MathNode): EvalResultWithUnit | null {
	if (node.type !== 'addition' && node.type !== 'subtraction') return null;

	// Strip parenthetical wrappers — `(5°C) - (3°C)` should behave like `5°C - 3°C`.
	const stripDelim = (n: MathNode): MathNode => {
		let cur = n;
		while (cur.type === 'delimiter') cur = cur.content;
		return cur;
	};

	const left = stripDelim(node.left);
	const right = stripDelim(node.right);
	if (!isUnit(left) || !isUnit(right)) return null;

	const leftAffine = isAffine(left.unit);
	const rightAffine = isAffine(right.unit);

	if (!leftAffine && !rightAffine) return null;

	// Dimensional check: both must be temperature-compatible
	const leftIsTemperature = left.unit.components.has('K');
	const rightIsTemperature = right.unit.components.has('K');
	if (!leftIsTemperature || !rightIsTemperature) {
		throw affineCompositionError('temperature units cannot be combined with non-temperature units');
	}

	const leftValue = evaluateNodeToApproximatedNumber(left.expression);
	const rightValue = evaluateNodeToApproximatedNumber(right.expression);

	const leftCoeff = left.unit.coefficient;
	const rightCoeff = right.unit.coefficient;
	const leftOffset = left.unit.offset ?? 0;
	const rightOffset = right.unit.offset ?? 0;

	if (node.type === 'subtraction') {
		if (leftAffine && rightAffine) {
			// Both absolute: convert to K, subtract → delta in K
			const leftK = (leftValue + leftOffset) * leftCoeff;
			const rightK = (rightValue + rightOffset) * rightCoeff;
			const deltaK = leftK - rightK;
			const kUnit = UnitAST.unit('K')!;
			return {
				value: deltaK,
				node: numericNode(deltaK),
				exact: false,
				unit: kUnit
			};
		}
		if (leftAffine && !rightAffine) {
			// absolute - delta = absolute (in left's unit)
			// rightValue is in K-equivalent (after coefficient scaling).
			const deltaInLeftUnit = (rightValue * rightCoeff) / leftCoeff;
			const result = leftValue - deltaInLeftUnit;
			return {
				value: result,
				node: numericNode(result),
				exact: false,
				unit: left.unit
			};
		}
		// !leftAffine && rightAffine: K - °C is meaningless (delta − absolute)
		throw affineCompositionError(
			'cannot subtract an absolute temperature (°C/°F) from a delta (K)'
		);
	}

	// Addition
	if (leftAffine && rightAffine) {
		throw affineCompositionError(
			'sum of absolute temperatures (°C/°F) is undefined; convert at least one operand to K (delta)'
		);
	}
	if (leftAffine && !rightAffine) {
		// absolute + delta = absolute in left unit
		const deltaInLeftUnit = (rightValue * rightCoeff) / leftCoeff;
		const result = leftValue + deltaInLeftUnit;
		return {
			value: result,
			node: numericNode(result),
			exact: false,
			unit: left.unit
		};
	}
	// !leftAffine && rightAffine: delta + absolute = absolute in right unit
	const deltaInRightUnit = (leftValue * leftCoeff) / rightCoeff;
	const result = rightValue + deltaInRightUnit;
	return {
		value: result,
		node: numericNode(result),
		exact: false,
		unit: right.unit
	};
}

// =============================================================================
// Named SI Derived Unit Recognition
// =============================================================================

/**
 * If `enabled`, try to recognize the result unit as a named SI derived unit
 * (Newton, Joule, ...). On match, returns the rescaled `{ value, unit }`
 * pair so the displayed value matches the canonical derived coefficient
 * (e.g., 15000 g·m·s⁻² → 15 N).
 *
 * Returns the input unchanged if `enabled` is false or no derived match.
 */
function maybeRecognizeDerived(
	value: number,
	unit: Unit,
	enabled: boolean
): { value: number; unit: Unit } {
	if (!enabled) return { value, unit };
	const recognized = recognizeDerivedUnit(unit);
	if (!recognized) return { value, unit };

	// Rescale: newValue × recognized.coefficient = oldValue × oldUnit.coefficient
	// Both expressions equal the value in SI base.
	const newValue = (value * unit.coefficient) / recognized.coefficient;
	return { value: newValue, unit: recognized };
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

	// Step 0a: Reject any composition (×, ÷, ^, function call) that involves
	// an affine unit (°C, °F). Multiplicative composition with an offset is
	// mathematically undefined.
	if (detectAffineComposition(node)) {
		throw affineCompositionError(
			'cannot multiply, divide, raise to a power, or pass to a function an affine unit (°C, °F)'
		);
	}

	// Step 0b: Top-level binary operations with affine operands have special
	// semantics (delta vs absolute) and cannot go through the multiplicative
	// pipeline. Handle them up-front.
	const affineBinaryResult = tryEvaluateAffineBinary(node);
	if (affineBinaryResult !== null) {
		return affineBinaryResult;
	}

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
		// Normalize each UnitNode to its own SI base (coef = 1) so the result
		// genuinely lands in pure SI base. Required when the target is composite
		// (e.g., recognizing kg·m·s⁻² as Newton).
		const siTransformed = normalizeAllUnitsToBase(node);
		const siResult = evaluate(siTransformed, {
			mode: opts.mode,
			precision: opts.precision,
			functions: opts.functions
		});

		// Handle non-value results
		if (siResult.status !== 'value') {
			throw new DimensionalEvaluationError(
				siResult.status === 'unevaluable'
					? siResult.reason
					: `Indeterminate form: ${siResult.form}`,
				[
					{
						code: 'EVAL_FAILED',
						message:
							siResult.status === 'unevaluable'
								? siResult.reason
								: `Indeterminate form: ${siResult.form}`
					}
				]
			);
		}

		const siValue = getNumericValue(siResult.value);
		const best = selectBestUnit(siValue, siUnit);

		// In 'best' mode, recognize named SI derived units (Newton, Joule, ...)
		// before the family-based prefix selection takes effect. We use the
		// SI value/unit as input so the canonical-coefficient rescaling works.
		// TODO(V2): after derived recognition, reapply selectBestUnit-like
		// prefix selection within the derived unit's family — `5e6 N` should
		// display as `5 MN`, not `5000000 N`. Out of scope for V1.
		const recognizeDerivedFlag = opts.recognizeDerived ?? true;
		const derivedAtSI = maybeRecognizeDerived(siValue, siUnit, recognizeDerivedFlag);
		const useDerived = derivedAtSI.unit !== siUnit;
		const finalValue = useDerived ? derivedAtSI.value : best.value;
		finalUnit = useDerived ? derivedAtSI.unit : best.unit;
		if (firstUnit) {
			originalUnit = firstUnit;
		}

		// Return early with best unit result
		// Note: In 'best' mode, the node is always a NumberNode with the converted value,
		// unlike 'first'/'si' modes which preserve the evaluated node structure.
		// This is because we need to represent the value in the selected "best" unit.
		return {
			value: finalValue,
			node: numericNode(finalValue),
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

	// Handle non-value results
	if (evalResult.status !== 'value') {
		throw new DimensionalEvaluationError(
			evalResult.status === 'unevaluable'
				? evalResult.reason
				: `Indeterminate form: ${evalResult.form}`,
			[
				{
					code: 'EVAL_FAILED',
					message:
						evalResult.status === 'unevaluable'
							? evalResult.reason
							: `Indeterminate form: ${evalResult.form}`
				}
			]
		);
	}

	// Step 8: Optional derived-unit recognition for 'first' / 'si' modes.
	// Default off; user opts in with `recognizeDerived: true`. We rescale the
	// numeric value via maybeRecognizeDerived; for non-numeric results we keep
	// the original value (rescaling MathNode/Complex is out of scope here).
	if (opts.recognizeDerived === true) {
		const numericValue = (() => {
			try {
				return getNumericValue(evalResult.value);
			} catch {
				return null;
			}
		})();
		if (numericValue !== null) {
			const recognized = maybeRecognizeDerived(numericValue, finalUnit, true);
			if (recognized.unit !== finalUnit) {
				return {
					value: recognized.value,
					node: numericNode(recognized.value),
					exact: false,
					unit: recognized.unit,
					...(originalUnit && { originalUnit })
				};
			}
		}
	}

	// Step 9: Build and return result with the correctly computed finalUnit
	return {
		value: evalResult.value,
		node: evalResult.node,
		exact: evalResult.exact,
		unit: finalUnit,
		...(originalUnit && { originalUnit })
	};
}
