/**
 * Sign Rules Module
 *
 * Rules for determining the sign of composite mathematical expressions
 * based on the signs of their components.
 *
 * @module mathAST/sign/rules
 */

// =============================================================================
// Product Rules
// =============================================================================

export { signOfProduct, signOfProductMultiple } from './product';

// =============================================================================
// Quotient Rules
// =============================================================================

export { signOfQuotient } from './quotient';

// =============================================================================
// Sum Rules
// =============================================================================

export { signOfSum, allSameSign, signOfDifference, negateSign } from './sum';

// =============================================================================
// Power Rules
// =============================================================================

export { signOfPower, signOfIntegerPower, extractRationalExponent } from './power';
export type { RationalExponent } from './power';

// =============================================================================
// Function Rules
// =============================================================================

export { signOfFunction, signOfMultiArgFunction, getBuiltinSignInfo } from './function';
export type { BuiltinSignInfo } from './function';
