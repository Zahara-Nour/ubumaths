/**
 * Type Inference Rules Index
 *
 * Re-exports all type inference rules for easy import.
 */

// Literal rules
export {
	inferNumberType,
	inferMathConstantType,
	inferVariableType,
	inferGreekLetterType,
	inferLiteralType
} from './literals';

// Arithmetic rules
export {
	inferAdditionType,
	inferSubtractionType,
	inferMultiplicationType,
	inferDivisionType,
	inferOppositeType,
	inferPositiveType
} from './arithmetic';

// Power rules
export { inferPowerType, inferSqrtType } from './power';

// Function rules
export { inferFunctionType } from './functions';
