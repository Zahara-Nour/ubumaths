/**
 * Dimensional Analysis - Analyzer
 *
 * Validates unit compatibility in mathematical expressions and computes
 * the resulting unit from operations. Provides detailed error reporting
 * for dimensional mismatches.
 *
 * @module mathAST/dimensional/analyzer
 */

import type {
	MathNode,
	NumberNode,
	VariableNode,
	GreekLetterNode,
	SymbolNode,
	AdditionNode,
	SubtractionNode,
	MultiplicationNode,
	DivisionNode,
	OppositeNode,
	PositiveNode,
	FunctionNode,
	DelimiterNode,
	SuperscriptNode,
	SubscriptNode,
	RelationNode,
	UnitNode
} from '../types';
import type { Unit, Dimension } from '../units/types';
import { multiply, divide, power } from '../units/operations';
import { unitsAreCompatible, getDimensionalSignature } from '../units/conversion';
import { dimensionless } from '../units/factory';
import type {
	DimensionalContext,
	DimensionalAnalysisResult,
	DimensionalError,
	DimensionalErrorCode,
	DimensionalErrorDetails,
	DimensionalWarning,
	DimensionalWarningCode,
	FunctionRule
} from './types';
import { getFunctionRule } from './rules';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a dimensional error
 */
function createError(
	code: DimensionalErrorCode,
	message: string,
	node: MathNode,
	details?: DimensionalErrorDetails
): DimensionalError {
	return {
		code,
		message,
		node,
		...(details && { details })
	};
}

/**
 * Create a dimensional warning
 */
function createWarning(
	code: DimensionalWarningCode,
	message: string,
	node: MathNode,
	details?: DimensionalWarning['details']
): DimensionalWarning {
	return {
		code,
		message,
		node,
		...(details && { details })
	};
}

/**
 * Check if a unit is dimensionless (has no physical dimension)
 */
function isDimensionless(unit: Unit | null): boolean {
	if (unit === null) return true;
	return unit.components.size === 0;
}

/**
 * Check if a unit represents an angle (radians or degrees)
 */
function isAngleUnit(unit: Unit | null): boolean {
	if (unit === null) return false;

	// Get the dimensional signature
	const signature = getDimensionalSignature(unit);

	// Check if it has only angle dimension with exponent 1
	const dimensionKeys = Object.keys(signature) as Dimension[];
	if (dimensionKeys.length === 1 && signature.angle === 1) {
		return true;
	}

	return false;
}

/**
 * Get a human-readable representation of a unit
 */
function formatUnit(unit: Unit | null): string {
	if (unit === null) return 'dimensionless';
	if (unit.original) return unit.original;
	if (unit.components.size === 0) return 'dimensionless';

	const parts: string[] = [];
	for (const [symbol, exp] of unit.components) {
		if (exp === 1) {
			parts.push(symbol);
		} else {
			parts.push(`${symbol}^${exp}`);
		}
	}
	return parts.join('.') || 'dimensionless';
}

/**
 * Create a dimensionless Unit object (as opposed to null which means "no unit info")
 */
function createDimensionlessUnit(): Unit {
	return dimensionless();
}

/**
 * Create an angle unit (radians)
 */
function createAngleUnit(): Unit {
	return {
		components: new Map([['rad', 1]]),
		coefficient: 1
	};
}

/**
 * Extract a numeric value from a node if it's a simple number
 */
function extractNumericValue(node: MathNode): number | null {
	if (node.type === 'number') {
		return parseFloat(node.value);
	}

	if (node.type === 'opposite') {
		const inner = extractNumericValue(node.operand);
		return inner !== null ? -inner : null;
	}

	if (node.type === 'positive') {
		return extractNumericValue(node.operand);
	}

	if (node.type === 'delimiter') {
		return extractNumericValue(node.content);
	}

	// Division of two numbers
	if (node.type === 'division') {
		const num = extractNumericValue(node.numerator);
		const den = extractNumericValue(node.denominator);
		if (num !== null && den !== null && den !== 0) {
			return num / den;
		}
	}

	return null;
}

// =============================================================================
// Node Analysis Functions
// =============================================================================

/**
 * Analyze a number node
 * Numbers are dimensionless (have no physical unit)
 */
function analyzeNumber(
	_node: NumberNode,
	_context: DimensionalContext,
	_errors: DimensionalError[],
	_warnings: DimensionalWarning[]
): Unit | null {
	// Numbers are dimensionless - return null to indicate "no unit information"
	return null;
}

/**
 * Analyze a variable node
 * Look up the variable's unit in the context
 */
function analyzeVariable(
	node: VariableNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const variableUnit = context.variables?.get(node.name);

	if (variableUnit !== undefined) {
		return variableUnit;
	}

	// Variable not found in context
	const strictMode = context.options?.strictMode ?? true;

	if (strictMode) {
		errors.push(
			createError('UNDEFINED_VARIABLE', `Variable '${node.name}' has unknown unit`, node, {
				variableName: node.name
			})
		);
		return null;
	} else {
		// Non-strict mode: treat as dimensionless with warning
		warnings.push(
			createWarning(
				'IMPLICIT_UNIT_ASSUMPTION',
				`Variable '${node.name}' assumed to be dimensionless`,
				node,
				{ variableName: node.name }
			)
		);
		return null;
	}
}

/**
 * Analyze a Greek letter node
 * Greek letters are treated as dimensionless (like mathematical constants)
 */
function analyzeGreekLetter(
	_node: GreekLetterNode,
	_context: DimensionalContext,
	_errors: DimensionalError[],
	_warnings: DimensionalWarning[]
): Unit | null {
	// Greek letters (like pi, theta) are treated as dimensionless
	return null;
}

/**
 * Analyze a symbol node
 * Mathematical symbols are treated as dimensionless
 */
function analyzeSymbol(
	_node: SymbolNode,
	_context: DimensionalContext,
	_errors: DimensionalError[],
	_warnings: DimensionalWarning[]
): Unit | null {
	// Mathematical symbols are dimensionless
	return null;
}

/**
 * Analyze addition: units must be compatible
 */
function analyzeAddition(
	node: AdditionNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const leftUnit = analyzeNode(node.left, context, errors, warnings);
	const rightUnit = analyzeNode(node.right, context, errors, warnings);

	// If either side had errors, we already have errors recorded
	// But we can still try to analyze compatibility

	return analyzeAddSubtract(node, leftUnit, rightUnit, 'add', context, errors, warnings);
}

/**
 * Analyze subtraction: units must be compatible
 */
function analyzeSubtraction(
	node: SubtractionNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const leftUnit = analyzeNode(node.left, context, errors, warnings);
	const rightUnit = analyzeNode(node.right, context, errors, warnings);

	return analyzeAddSubtract(node, leftUnit, rightUnit, 'subtract', context, errors, warnings);
}

/**
 * Common logic for addition and subtraction
 */
function analyzeAddSubtract(
	node: MathNode,
	leftUnit: Unit | null,
	rightUnit: Unit | null,
	operation: 'add' | 'subtract',
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const opName = operation === 'add' ? 'add' : 'subtract';

	// Case 1: Both are null (no unit info) -> result is null
	if (leftUnit === null && rightUnit === null) {
		return null;
	}

	// Case 2: One is null, one has units
	if (leftUnit === null && rightUnit !== null) {
		const allowMix = context.options?.allowDimensionlessMix ?? false;
		if (allowMix) {
			warnings.push(
				createWarning(
					'DIMENSIONLESS_MIXED',
					`Mixing dimensionless value with '${formatUnit(rightUnit)}' - assuming same dimension`,
					node,
					{ assumedUnit: rightUnit }
				)
			);
			return rightUnit;
		} else if (!isDimensionless(rightUnit)) {
			errors.push(
				createError(
					'INCOMPATIBLE_UNITS',
					`Cannot ${opName} dimensionless value and '${formatUnit(rightUnit)}'`,
					node,
					{ expected: createDimensionlessUnit(), actual: rightUnit }
				)
			);
			return null;
		}
		return rightUnit;
	}

	if (leftUnit !== null && rightUnit === null) {
		const allowMix = context.options?.allowDimensionlessMix ?? false;
		if (allowMix) {
			warnings.push(
				createWarning(
					'DIMENSIONLESS_MIXED',
					`Mixing '${formatUnit(leftUnit)}' with dimensionless value - assuming same dimension`,
					node,
					{ assumedUnit: leftUnit }
				)
			);
			return leftUnit;
		} else if (!isDimensionless(leftUnit)) {
			errors.push(
				createError(
					'INCOMPATIBLE_UNITS',
					`Cannot ${opName} '${formatUnit(leftUnit)}' and dimensionless value`,
					node,
					{ expected: leftUnit, actual: createDimensionlessUnit() }
				)
			);
			return null;
		}
		return leftUnit;
	}

	// Case 3: Both have units - check compatibility
	// TypeScript knows both are non-null here
	const left = leftUnit!;
	const right = rightUnit!;

	if (unitsAreCompatible(left, right)) {
		// Return left unit (arbitrary choice since they're compatible)
		return left;
	}

	// Units are not compatible
	errors.push(
		createError(
			'INCOMPATIBLE_UNITS',
			`Cannot ${opName} '${formatUnit(left)}' and '${formatUnit(right)}': incompatible dimensions`,
			node,
			{ expected: left, actual: right }
		)
	);

	return null;
}

/**
 * Analyze multiplication: multiply units
 */
function analyzeMultiplication(
	node: MultiplicationNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const leftUnit = analyzeNode(node.left, context, errors, warnings);
	const rightUnit = analyzeNode(node.right, context, errors, warnings);

	// If either is null (no unit info), result takes the other's unit
	if (leftUnit === null && rightUnit === null) {
		return null;
	}
	if (leftUnit === null) {
		return rightUnit;
	}
	if (rightUnit === null) {
		return leftUnit;
	}

	// Both have units - multiply them
	return multiply(leftUnit, rightUnit);
}

/**
 * Analyze division: divide units
 */
function analyzeDivision(
	node: DivisionNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const numeratorUnit = analyzeNode(node.numerator, context, errors, warnings);
	const denominatorUnit = analyzeNode(node.denominator, context, errors, warnings);

	// If either is null (no unit info), handle accordingly
	if (numeratorUnit === null && denominatorUnit === null) {
		return null;
	}
	if (numeratorUnit === null) {
		// 1 / denominator = denominator^-1
		return power(denominatorUnit!, -1);
	}
	if (denominatorUnit === null) {
		return numeratorUnit;
	}

	// Both have units - divide them
	return divide(numeratorUnit, denominatorUnit);
}

/**
 * Analyze opposite (negation): preserves unit
 */
function analyzeOpposite(
	node: OppositeNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	return analyzeNode(node.operand, context, errors, warnings);
}

/**
 * Analyze positive sign: preserves unit
 */
function analyzePositive(
	node: PositiveNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	return analyzeNode(node.operand, context, errors, warnings);
}

/**
 * Analyze superscript (power): compute power of base unit
 */
function analyzeSuperscript(
	node: SuperscriptNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const baseUnit = analyzeNode(node.base, context, errors, warnings);
	const exponentUnit = analyzeNode(node.superscript, context, errors, warnings);

	// Exponent must be dimensionless
	if (exponentUnit !== null && !isDimensionless(exponentUnit)) {
		errors.push(
			createError(
				'INVALID_FUNCTION_INPUT',
				`Exponent must be dimensionless, got '${formatUnit(exponentUnit)}'`,
				node,
				{ actual: exponentUnit, context: 'Exponent in power operation' }
			)
		);
		return null;
	}

	// If base has no unit, result has no unit
	if (baseUnit === null) {
		return null;
	}

	// Try to extract numeric exponent value
	const exponentValue = extractNumericValue(node.superscript);

	if (exponentValue === null) {
		// Complex exponent - if base has units, this might be problematic
		if (!isDimensionless(baseUnit)) {
			// For non-numeric exponents with a dimensioned base,
			// we cannot determine the result unit reliably
			// In practice, this is often used for symbolic expressions
			// Return null to indicate unknown unit
			warnings.push(
				createWarning(
					'IMPLICIT_UNIT_ASSUMPTION',
					`Non-numeric exponent with unit '${formatUnit(baseUnit)}' - result unit cannot be determined`,
					node
				)
			);
		}
		return null;
	}

	// Check for fractional exponents if not allowed
	const allowFractional = context.options?.allowFractionalExponents ?? true;
	if (!allowFractional && !Number.isInteger(exponentValue)) {
		errors.push(
			createError(
				'NON_INTEGER_EXPONENT',
				`Fractional exponent ${exponentValue} not allowed with unit '${formatUnit(baseUnit)}'`,
				node,
				{ context: `Exponent value: ${exponentValue}` }
			)
		);
		return null;
	}

	// Check for large exponents (warning)
	if (Math.abs(exponentValue) > 10) {
		warnings.push(
			createWarning(
				'LARGE_EXPONENT',
				`Unusually large exponent ${exponentValue} on unit '${formatUnit(baseUnit)}'`,
				node
			)
		);
	}

	// Compute the resulting unit
	return power(baseUnit, exponentValue);
}

/**
 * Analyze subscript: typically used for indexing, preserves base unit
 */
function analyzeSubscript(
	node: SubscriptNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	// Subscript typically represents indexing or labeling
	// The unit comes from the base
	return analyzeNode(node.base, context, errors, warnings);
}

/**
 * Analyze function call
 */
function analyzeFunction(
	node: FunctionNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const rule = getFunctionRule(node.name, context.functionRules);
	const strictMode = context.options?.strictMode ?? true;

	// Analyze all arguments first
	const argUnits: (Unit | null)[] = node.args.map((arg) =>
		analyzeNode(arg, context, errors, warnings)
	);

	// Unknown function
	if (!rule) {
		if (strictMode) {
			errors.push(
				createError(
					'INVALID_FUNCTION_INPUT',
					`Unknown function '${node.name}' - cannot determine dimensional behavior`,
					node,
					{ functionName: node.name }
				)
			);
			return null;
		} else {
			warnings.push(
				createWarning(
					'UNKNOWN_FUNCTION',
					`Unknown function '${node.name}' - assuming unit-preserving behavior`,
					node,
					{ functionName: node.name }
				)
			);
			// Return first argument's unit as a guess
			return argUnits.length > 0 ? argUnits[0] : null;
		}
	}

	// Validate input based on rule
	const validInput = validateFunctionInput(node, rule, argUnits, errors);

	if (!validInput) {
		return null;
	}

	// Determine output unit based on rule
	return determineFunctionOutput(node, rule, argUnits, errors, context);
}

/**
 * Validate function input against its rule
 */
function validateFunctionInput(
	node: FunctionNode,
	rule: FunctionRule,
	argUnits: (Unit | null)[],
	errors: DimensionalError[]
): boolean {
	switch (rule.inputRequirement) {
		case 'dimensionless':
			// All arguments must be dimensionless
			for (let i = 0; i < argUnits.length; i++) {
				const argUnit = argUnits[i];
				if (argUnit !== null && !isDimensionless(argUnit)) {
					errors.push(
						createError(
							'INVALID_FUNCTION_INPUT',
							`${rule.name}() requires dimensionless argument, got '${formatUnit(argUnit)}'`,
							node,
							{
								functionName: rule.name,
								requiredInputType: 'dimensionless',
								actual: argUnit,
								argumentIndex: i
							}
						)
					);
					return false;
				}
			}
			return true;

		case 'angle':
			// All arguments must be angles or dimensionless
			for (let i = 0; i < argUnits.length; i++) {
				const argUnit = argUnits[i];
				if (argUnit !== null && !isDimensionless(argUnit) && !isAngleUnit(argUnit)) {
					errors.push(
						createError(
							'INVALID_FUNCTION_INPUT',
							`${rule.name}() requires angle or dimensionless argument, got '${formatUnit(argUnit)}'`,
							node,
							{
								functionName: rule.name,
								requiredInputType: 'angle',
								actual: argUnit,
								argumentIndex: i
							}
						)
					);
					return false;
				}
			}
			return true;

		case 'any':
			// Any unit is acceptable
			return true;

		case 'same': {
			// All arguments must have compatible units
			if (argUnits.length < 2) {
				return true;
			}

			// Find the first non-null unit
			let referenceUnit: Unit | null = null;
			let referenceIndex = -1;
			for (let i = 0; i < argUnits.length; i++) {
				if (argUnits[i] !== null) {
					referenceUnit = argUnits[i];
					referenceIndex = i;
					break;
				}
			}

			// Check all other non-null units are compatible
			for (let i = referenceIndex + 1; i < argUnits.length; i++) {
				const argUnit = argUnits[i];
				if (argUnit === null) continue;

				if (referenceUnit === null) {
					// First non-null unit, use as reference
					referenceUnit = argUnit;
					referenceIndex = i;
				} else if (!unitsAreCompatible(referenceUnit, argUnit)) {
					errors.push(
						createError(
							'INCONSISTENT_FUNCTION_ARGS',
							`${rule.name}() requires all arguments to have the same unit. Argument ${i + 1} has '${formatUnit(argUnit)}' but expected '${formatUnit(referenceUnit)}'`,
							node,
							{
								functionName: rule.name,
								expected: referenceUnit,
								actual: argUnit,
								argumentIndex: i
							}
						)
					);
					return false;
				}
			}
			return true;
		}

		default:
			return true;
	}
}

/**
 * Determine the output unit of a function based on its rule
 */
function determineFunctionOutput(
	node: FunctionNode,
	rule: FunctionRule,
	argUnits: (Unit | null)[],
	errors: DimensionalError[],
	context: DimensionalContext
): Unit | null {
	switch (rule.outputUnit) {
		case 'dimensionless':
			// Output is always dimensionless
			return createDimensionlessUnit();

		case 'angle':
			// Output is always an angle (radians)
			return createAngleUnit();

		case 'preserve':
			// Unit is preserved (possibly transformed)
			if (rule.name === 'sqrt') {
				return handleSqrtOutput(node, argUnits[0], errors, context);
			}
			if (rule.name === 'cbrt') {
				return handleCbrtOutput(node, argUnits[0], errors, context);
			}
			// For abs, floor, ceil, round, etc. - preserve unit as-is
			return argUnits.length > 0 ? argUnits[0] : null;

		default:
			return null;
	}
}

/**
 * Handle sqrt output - halve all exponents
 * Respects allowFractionalExponents option to determine error vs warning behavior
 */
function handleSqrtOutput(
	node: FunctionNode,
	inputUnit: Unit | null,
	errors: DimensionalError[],
	context: DimensionalContext
): Unit | null {
	if (inputUnit === null) {
		return null;
	}

	const allowFractional = context.options?.allowFractionalExponents ?? true;
	let hasOddExponent = false;

	// Check that all exponents are even (so sqrt results in integers)
	for (const [symbol, exponent] of inputUnit.components) {
		if (exponent % 2 !== 0) {
			hasOddExponent = true;
			if (!allowFractional) {
				// Odd exponent - sqrt would produce fractional exponent
				errors.push(
					createError(
						'NON_INTEGER_EXPONENT',
						`sqrt() of '${formatUnit(inputUnit)}' produces fractional exponent for '${symbol}'`,
						node,
						{
							functionName: 'sqrt',
							actual: inputUnit,
							context: `${symbol}^${exponent} -> ${symbol}^${exponent / 2}`
						}
					)
				);
			}
		}
	}

	// If fractional exponents not allowed and we have odd exponents, return null
	if (hasOddExponent && !allowFractional) {
		return null;
	}

	// Halve all exponents (fractional exponents are allowed or not needed)
	return power(inputUnit, 0.5);
}

/**
 * Handle cbrt output - divide all exponents by 3
 * Respects allowFractionalExponents option to determine error vs warning behavior
 */
function handleCbrtOutput(
	node: FunctionNode,
	inputUnit: Unit | null,
	errors: DimensionalError[],
	context: DimensionalContext
): Unit | null {
	if (inputUnit === null) {
		return null;
	}

	const allowFractional = context.options?.allowFractionalExponents ?? true;
	let hasNonDivisibleExponent = false;

	// Check that all exponents are divisible by 3
	for (const [symbol, exponent] of inputUnit.components) {
		if (exponent % 3 !== 0) {
			hasNonDivisibleExponent = true;
			if (!allowFractional) {
				errors.push(
					createError(
						'NON_INTEGER_EXPONENT',
						`cbrt() of '${formatUnit(inputUnit)}' produces fractional exponent for '${symbol}'`,
						node,
						{
							functionName: 'cbrt',
							actual: inputUnit,
							context: `${symbol}^${exponent} -> ${symbol}^${exponent / 3}`
						}
					)
				);
			}
		}
	}

	// If fractional exponents not allowed and we have non-divisible exponents, return null
	if (hasNonDivisibleExponent && !allowFractional) {
		return null;
	}

	// Divide all exponents by 3
	return power(inputUnit, 1 / 3);
}

/**
 * Analyze delimiter node - pass through to content
 * Note: Absolute value is now represented as abs() function, not delimiter
 */
function analyzeDelimiter(
	node: DelimiterNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	// Delimiters (parentheses) pass through to content
	return analyzeNode(node.content, context, errors, warnings);
}

/**
 * Analyze relation node - both sides must have compatible units
 */
function analyzeRelation(
	node: RelationNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const leftUnit = analyzeNode(node.left, context, errors, warnings);
	const rightUnit = analyzeNode(node.right, context, errors, warnings);

	// Both sides should have compatible units for comparison
	if (leftUnit !== null && rightUnit !== null) {
		if (!unitsAreCompatible(leftUnit, rightUnit)) {
			errors.push(
				createError(
					'INVALID_RELATION',
					`Cannot compare '${formatUnit(leftUnit)}' with '${formatUnit(rightUnit)}': incompatible dimensions`,
					node,
					{ expected: leftUnit, actual: rightUnit }
				)
			);
		}
	} else if (leftUnit !== null && rightUnit === null && !isDimensionless(leftUnit)) {
		// Comparing unit with dimensionless
		const allowMix = context.options?.allowDimensionlessMix ?? false;
		if (!allowMix) {
			errors.push(
				createError(
					'INVALID_RELATION',
					`Cannot compare '${formatUnit(leftUnit)}' with dimensionless value`,
					node,
					{ expected: leftUnit, actual: createDimensionlessUnit() }
				)
			);
		}
	} else if (leftUnit === null && rightUnit !== null && !isDimensionless(rightUnit)) {
		const allowMix = context.options?.allowDimensionlessMix ?? false;
		if (!allowMix) {
			errors.push(
				createError(
					'INVALID_RELATION',
					`Cannot compare dimensionless value with '${formatUnit(rightUnit)}'`,
					node,
					{ expected: createDimensionlessUnit(), actual: rightUnit }
				)
			);
		}
	}

	// Relations always produce a dimensionless (boolean) result
	return createDimensionlessUnit();
}

/**
 * Analyze unit node - attach unit to inner expression
 */
function analyzeUnit(
	node: UnitNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	const innerUnit = analyzeNode(node.expression, context, errors, warnings);

	// Check for nested units
	if (innerUnit !== null && !isDimensionless(innerUnit)) {
		errors.push(
			createError(
				'NESTED_UNITS',
				`Expression already has unit '${formatUnit(innerUnit)}', cannot attach another unit '${formatUnit(node.unit)}'`,
				node,
				{ expected: createDimensionlessUnit(), actual: innerUnit }
			)
		);
		return null;
	}

	// Return the attached unit
	return node.unit;
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze a MathAST node and determine its unit
 */
function analyzeNode(
	node: MathNode,
	context: DimensionalContext,
	errors: DimensionalError[],
	warnings: DimensionalWarning[]
): Unit | null {
	switch (node.type) {
		case 'number':
			return analyzeNumber(node, context, errors, warnings);

		case 'variable':
			return analyzeVariable(node, context, errors, warnings);

		case 'greek':
			return analyzeGreekLetter(node, context, errors, warnings);

		case 'symbol':
			return analyzeSymbol(node, context, errors, warnings);

		case 'addition':
			return analyzeAddition(node, context, errors, warnings);

		case 'subtraction':
			return analyzeSubtraction(node, context, errors, warnings);

		case 'multiplication':
			return analyzeMultiplication(node, context, errors, warnings);

		case 'division':
			return analyzeDivision(node, context, errors, warnings);

		case 'opposite':
			return analyzeOpposite(node, context, errors, warnings);

		case 'positive':
			return analyzePositive(node, context, errors, warnings);

		case 'superscript':
			return analyzeSuperscript(node, context, errors, warnings);

		case 'subscript':
			return analyzeSubscript(node, context, errors, warnings);

		case 'function':
			return analyzeFunction(node, context, errors, warnings);

		case 'delimiter':
			return analyzeDelimiter(node, context, errors, warnings);

		case 'relation':
			return analyzeRelation(node, context, errors, warnings);

		case 'unit':
			return analyzeUnit(node, context, errors, warnings);

		case 'hole':
			// Holes are dimensionless placeholders - they have no inherent dimension
			return createDimensionlessUnit();

		case 'composition':
			// Composition (f composed with g) - treat as a functional composition
			// The result unit depends on what the composed functions do
			// Analyze both outer and inner for errors, but return null (unknown unit)
			analyzeNode(node.outer, context, errors, warnings);
			analyzeNode(node.inner, context, errors, warnings);
			// Composition of functions typically produces another function,
			// whose output unit depends on the specific functions involved
			return null;

		case 'matrix':
			// Matrix: analyze all elements for dimensional consistency
			// All elements should have compatible dimensions (this is a simplification)
			for (const row of node.rows) {
				for (const elem of row) {
					analyzeNode(elem, context, errors, warnings);
				}
			}
			// Matrices don't have a single unit - return null
			return null;

		case 'complex':
			// Complex numbers: analyze real and imaginary parts
			// Both parts must be dimensionless (complex numbers with units aren't standard)
			analyzeNode(node.real, context, errors, warnings);
			analyzeNode(node.imaginary, context, errors, warnings);
			// Complex numbers are dimensionless
			return createDimensionlessUnit();

		case 'infinity':
			// Infinity is dimensionless
			return createDimensionlessUnit();

		case 'limit':
			// The result of a limit has the same dimension as the expression
			return analyzeNode(node.expression, context, errors, warnings);

		default: {
			// TypeScript exhaustiveness check
			const _exhaustive: never = node;
			return null;
		}
	}
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Analyze dimensional validity of a MathAST expression
 *
 * Validates that all unit operations in the expression are dimensionally
 * consistent and computes the resulting unit.
 *
 * @param node - The MathAST node to analyze
 * @param context - Optional context providing variable units and options
 * @returns Analysis result with validity, result unit, and any errors/warnings
 *
 * @example Basic usage
 * ```typescript
 * const result = analyzeDimensions(expression);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 *
 * @example With variable context
 * ```typescript
 * const context: DimensionalContext = {
 *   variables: new Map([
 *     ['v', { components: new Map([['m', 1], ['s', -1]]), coefficient: 1 }],
 *     ['t', { components: new Map([['s', 1]]), coefficient: 1 }]
 *   ])
 * };
 * const result = analyzeDimensions(expression, context);
 * ```
 */
export function analyzeDimensions(
	node: MathNode,
	context: DimensionalContext = {}
): DimensionalAnalysisResult {
	const errors: DimensionalError[] = [];
	const warnings: DimensionalWarning[] = [];

	const resultUnit = analyzeNode(node, context, errors, warnings);

	return {
		valid: errors.length === 0,
		resultUnit,
		errors,
		...(warnings.length > 0 && { warnings })
	};
}

/**
 * Quick check if an expression is dimensionally valid
 *
 * Convenience function that returns only the validity status.
 * Use analyzeDimensions() if you need error details.
 *
 * @param node - The MathAST node to check
 * @param context - Optional context providing variable units and options
 * @returns True if the expression is dimensionally valid
 *
 * @example
 * ```typescript
 * if (isDimensionallyValid(expression)) {
 *   // Proceed with evaluation
 * } else {
 *   // Handle error
 * }
 * ```
 */
export function isDimensionallyValid(node: MathNode, context?: DimensionalContext): boolean {
	return analyzeDimensions(node, context).valid;
}

/**
 * Get the resulting unit of an expression
 *
 * Convenience function that returns only the result unit.
 * Returns null if the expression is invalid or has no unit.
 * Use analyzeDimensions() if you need to distinguish between
 * invalid expressions and dimensionless results.
 *
 * @param node - The MathAST node to analyze
 * @param context - Optional context providing variable units and options
 * @returns The resulting unit, or null if invalid/dimensionless
 *
 * @example
 * ```typescript
 * const unit = getResultingUnit(expression);
 * if (unit) {
 *   console.log('Result has unit:', formatUnit(unit));
 * }
 * ```
 */
export function getResultingUnit(node: MathNode, context?: DimensionalContext): Unit | null {
	const result = analyzeDimensions(node, context);
	return result.valid ? result.resultUnit : null;
}

// =============================================================================
// Exports for Testing/Advanced Use
// =============================================================================

export {
	isDimensionless,
	isAngleUnit,
	formatUnit,
	createDimensionlessUnit,
	createAngleUnit,
	extractNumericValue
};
