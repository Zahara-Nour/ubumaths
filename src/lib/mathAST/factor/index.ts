/**
 * Moteur commun de factorisation (ADR 0024).
 *
 * Couche 1, le noyau exact (lot 1) : `factorPolynomial` factorise un polynôme
 * en une variable dans ℚ[x] (ou ℝ sur demande), sans étapes ;
 * `factorizationToNode` l'écrit en `MathNode`, coefficients entiers dès que
 * possible. Les stratégies qui racontent (couche 2) viendront au lot 2.
 *
 * Doc : docs/systeme/mathast/README.md § « factor/ ».
 */

export {
	compareFactors,
	factorPolynomial,
	primitivePart,
	MAX_FACTOR_DEGREE,
	MAX_RATIONAL_ROOT_CANDIDATES,
	MAX_RADICAND,
	type FactorField,
	type FactorOptions,
	type Factorization,
	type IntegerFactor,
	type PolynomialFactor,
	type SurdFactor
} from './factor';
export { factorizationToNode } from './render';
export {
	type Poly,
	type RationalFunction,
	MAX_POLYNOMIAL_DEGREE,
	divideOutRoot,
	evalPoly,
	toPolynomial,
	toRationalFunction
} from './polynomial';
export {
	extractRationalRoots,
	MAX_DIVISOR_SEARCH,
	type RationalRootSearch
} from './rational-roots';
export { discriminant, quadraticRootParts, type QuadraticRootParts } from './quadratic';
export { polynomialNode, rationalPolynomialNode } from './polynomial-node';
export {
	type CommonRootDivision,
	divideOutCommonRoot,
	integerLinearFactor,
	integerLinearFactorNode,
	linearFactorText
} from './common-root';
