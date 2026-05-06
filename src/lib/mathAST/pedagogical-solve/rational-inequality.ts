/**
 * Pedagogical Solve — Rational inequalities (palier 3)
 *
 * Generates pedagogical step-by-step explanations for solving a rational
 * inequality `P(x)/Q(x) ⊻ 0` where ⊻ ∈ {<, >, ≤, ≥, ≠}. Mirrors the structure
 * of `quadratic-inequality.ts` (palier 2b) but with a four-row sign table that
 * carries `P(x)`, `Q(x)`, and the quotient `P(x)/Q(x)`.
 *
 * Pipeline (lycée standard) :
 *   1. identify-equation              (kind = 'rational')
 *   2. identify-rational              (display P, Q)
 *   3. rational-domain-restriction    (D = ℝ \ {z₁, …})
 *   4. rational-locate-roots          (numerator roots + denominator zeros)
 *   5. rational-sign-table            (combined 4-row table)
 *   6. inequality-conclude-rational   (S = …)
 *
 * Per-level granularity is controlled by `STRATEGIES_RATIONAL`. `lycee` emits
 * the `identify-equation` lead-in ; `superieur` skips it.
 *
 * Out of V1 scope :
 * - Multi-fraction forms (`1/x + 1/(x-1) ⊻ 0`) requiring a "common denominator"
 *   pedagogical step → throw `InequalityNotSolvable`.
 * - Numerator or denominator of degree > 2.
 * - Parametric coefficients.
 *
 * @module mathAST/pedagogical-solve/rational-inequality
 */

import type { MathNode, RelationNode } from '../types';
import type { Domain } from '../domain/types';
import type { EquationStep, RationalInequalityStepsOptions } from './types';
import { STRATEGIES_RATIONAL } from './types';
import { number, relation, subtract } from '../factory';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { getVariables } from '../eval/substitute';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { solve } from '../solve/solve';
import { solveInequality } from '../solve/inequality';
import { computeNumericValue } from '../solve/numeric-value';
import { canon, isConstantCoefficient, isZero, makeStep, renumberSteps } from './_helpers';
import { _describeDomain } from './quadratic-inequality';
import {
	generateLinearInequalitySteps,
	UnsupportedInequalityDegree,
	PedagogicalInequalityError
} from './linear-inequality';
import { InequalityNotSolvable } from '../solve/inequality/types';

// Re-export for convenience.
export { UnsupportedInequalityDegree, PedagogicalInequalityError };

// =============================================================================
// Internal types
// =============================================================================

type InequalityOp = '<' | '>' | '<=' | '>=' | '!=';

const INEQUALITY_OPS: ReadonlySet<string> = new Set(['<', '>', '<=', '>=', '!=']);

// =============================================================================
// AST helpers
// =============================================================================

/** Strip a top-level `delimiter` wrapper for structural inspection. */
function unwrap(node: MathNode): MathNode {
	return node.type === 'delimiter' ? node.content : node;
}

/**
 * Detect a rational form `P/Q` in the canonical standard form. Returns
 * `{ numerator, denominator }` when the canonical form is a single division
 * node, or `null` otherwise (multi-fraction or polynomial).
 */
function tryExtractRationalForm(
	canonForm: MathNode
): { readonly numerator: MathNode; readonly denominator: MathNode } | null {
	const top = unwrap(canonForm);
	if (top.type !== 'division') return null;
	return {
		numerator: top.numerator,
		denominator: top.denominator
	};
}

/**
 * Find the roots of a polynomial of degree ≤ 2 in `variable`. Returns the
 * exact symbolic roots (as `MathNode`s) sorted by approximate numeric value.
 *
 * - degree 0 → `[]` (constant non-zero polynomial has no roots)
 * - degree 1 → single root `−offset/coefficient`
 * - degree 2 → 0, 1, or 2 roots depending on the discriminant
 *
 * Throws `InequalityNotSolvable` if the polynomial has unsupported shape.
 */
function findPolynomialZeros(
	poly: MathNode,
	variable: string,
	degree: number
): readonly MathNode[] {
	if (degree === 0) {
		// Constant. If literally 0 the caller should have rejected earlier.
		return [];
	}
	// Use the generic solver to find roots ; it handles linear and quadratic
	// uniformly and returns Solution[] with .value as MathNode.
	const eq = relation('=', poly, number('0'));
	const result = solve(eq, { variable });
	if (result.status === 'error' || result.status === 'unsupported') {
		throw new InequalityNotSolvable(
			`Impossible de trouver les racines : ${result.error ?? 'erreur solver'}`,
			'Hors scope V1.'
		);
	}
	const values = result.solutions.map((s) => s.value);
	return sortRootsByValue(values);
}

/** Sort MathNodes by their approximate numeric value (smallest first). */
function sortRootsByValue(roots: readonly MathNode[]): MathNode[] {
	const withVals = roots.map((r) => ({
		node: r,
		value: computeNumericValue(r) ?? Number.MAX_SAFE_INTEGER
	}));
	withVals.sort((a, b) => a.value - b.value);
	return withVals.map((w) => w.node);
}

/**
 * Extract the leading coefficient (sign of polynomial at +∞) for a polynomial
 * of degree ≤ 2 in `variable`. Used by the renderer to determine the sign at
 * the table's right end.
 *
 * - degree 0 → the polynomial itself
 * - degree 1 → coefficient of `x` (from `extractLinearForm`)
 * - degree 2 → coefficient `a` (from `extractQuadraticCoefficients`)
 */
function extractLeadingCoefficient(poly: MathNode, variable: string, degree: number): MathNode {
	if (degree === 0) return poly;
	if (degree === 1) {
		const linear = extractLinearForm(poly, variable);
		if (linear === null) {
			throw new InequalityNotSolvable(
				'Impossible d’extraire le coefficient dominant (forme inhabituelle).',
				'Hors scope V1.'
			);
		}
		return linear.coefficient;
	}
	// degree 2
	const coeffs = extractQuadraticCoefficients(poly, variable);
	if (coeffs === null) {
		throw new InequalityNotSolvable(
			'Impossible d’extraire le coefficient dominant (forme inhabituelle).',
			'Hors scope V1.'
		);
	}
	return coeffs.a;
}

/** Validate that a polynomial has only constant coefficients (no parametric). */
function rejectIfParametric(poly: MathNode, variable: string, label: string): void {
	const degree = getPolynomialDegree(poly, variable);
	if (degree === null) {
		throw new InequalityNotSolvable(
			`${label} n’est pas un polynôme en ${variable}.`,
			'Hors scope V1.'
		);
	}
	// Per-coefficient check via extractor.
	if (degree === 2) {
		const coeffs = extractQuadraticCoefficients(poly, variable);
		if (coeffs === null) {
			throw new InequalityNotSolvable(
				`${label} : extraction de coefficients impossible.`,
				'Hors scope V1.'
			);
		}
		if (
			!isConstantCoefficient(coeffs.a) ||
			!isConstantCoefficient(coeffs.b) ||
			!isConstantCoefficient(coeffs.c)
		) {
			throw new InequalityNotSolvable(
				`${label} : coefficients paramétriques détectés (V1 supporte uniquement les coefficients numériques).`,
				'Hors scope V1.'
			);
		}
	} else if (degree === 1) {
		const linear = extractLinearForm(poly, variable);
		if (linear === null) {
			throw new InequalityNotSolvable(
				`${label} : extraction de coefficients linéaires impossible.`,
				'Hors scope V1.'
			);
		}
		if (
			!isConstantCoefficient(linear.coefficient) ||
			(linear.offset !== null && !isConstantCoefficient(linear.offset))
		) {
			throw new InequalityNotSolvable(
				`${label} : coefficients paramétriques détectés.`,
				'Hors scope V1.'
			);
		}
	} else {
		// degree 0
		if (!isConstantCoefficient(poly)) {
			throw new InequalityNotSolvable(
				`${label} : coefficient paramétrique détecté.`,
				'Hors scope V1.'
			);
		}
	}
}

// =============================================================================
// Step builders
// =============================================================================

function buildIdentifyEquationStep(originalIneq: RelationNode, idGen: () => number): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'identify-equation',
		description: 'Inéquation rationnelle',
		before: originalIneq,
		after: originalIneq,
		operation: { kind: 'identify-equation', equationType: 'rational' }
	});
}

function buildIdentifyRationalStep(
	originalIneq: RelationNode,
	numerator: MathNode,
	denominator: MathNode,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'identify-rational',
		description: 'On reconnaît la forme P(x)/Q(x)',
		before: originalIneq,
		after: originalIneq,
		operation: { kind: 'identify-rational', numerator, denominator }
	});
}

function buildDomainRestrictionStep(
	originalIneq: RelationNode,
	excluded: readonly MathNode[],
	variable: string,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'rational-domain-restriction',
		description: 'Domaine de définition (zéros du dénominateur exclus)',
		before: originalIneq,
		after: originalIneq,
		operation: { kind: 'rational-domain-restriction', excluded, variable }
	});
}

function buildLocateRootsStep(
	originalIneq: RelationNode,
	numeratorRoots: readonly MathNode[],
	denominatorZeros: readonly MathNode[],
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'rational-locate-roots',
		description: 'Racines du numérateur et zéros du dénominateur',
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'rational-locate-roots',
			numeratorRoots,
			denominatorZeros
		}
	});
}

function buildRationalSignTableStep(
	originalIneq: RelationNode,
	numerator: MathNode,
	denominator: MathNode,
	numeratorRoots: readonly MathNode[],
	denominatorZeros: readonly MathNode[],
	leadingCoefP: MathNode,
	leadingCoefQ: MathNode,
	degP: number,
	degQ: number,
	variable: string,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'rational-sign-table',
		description: 'Tableau de signes combiné',
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'rational-sign-table',
			numerator,
			denominator,
			numeratorRoots,
			denominatorZeros,
			leadingCoefP,
			leadingCoefQ,
			degP,
			degQ,
			variable
		}
	});
}

function buildConcludeRationalStep(
	originalIneq: RelationNode,
	op: InequalityOp,
	idGen: () => number
): EquationStep {
	const result = solveInequality(originalIneq);
	const solutionDescription = _describeDomain(result.solution as Domain);
	return makeStep({
		id: idGen(),
		rule: 'inequality-conclude-rational',
		description: `Solution : ${solutionDescription}`,
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'inequality-conclude-rational',
			relation: op,
			solutionDescription
		},
		verbosityLevel: 'summarized'
	});
}

// =============================================================================
// Public entry point
// =============================================================================

/**
 * Generate pedagogical steps for solving a rational inequality.
 *
 * @throws PedagogicalInequalityError — operator is `=`.
 * @throws InequalityNotSolvable — multi-fraction, parametric, deg > 2, etc.
 */
export function generateRationalInequalitySteps(
	inequality: RelationNode,
	options: RationalInequalityStepsOptions
): readonly EquationStep[] {
	const { level, variable: varOpt } = options;
	const strategy = STRATEGIES_RATIONAL[level];

	// 1. Operator validation
	if (inequality.relation === '=') {
		throw new PedagogicalInequalityError("L'égalité n'est pas une inéquation — utiliser solve()");
	}
	if (!INEQUALITY_OPS.has(inequality.relation)) {
		throw new PedagogicalInequalityError(
			`Opérateur de relation non supporté: '${inequality.relation}'`
		);
	}
	const op = inequality.relation as InequalityOp;

	// 2. Detect variable. `detectVariable` returns null for either 0 vars
	//    (constant inequality) or ≥ 2 vars (parametric). We disambiguate :
	//    - 0 vars → fall back to linear pipeline (handles `0 < 1`, etc.)
	//    - ≥ 2 vars → reject as parametric (V1 hors scope)
	const variable = varOpt ?? detectVariable(inequality);
	if (variable === null) {
		const vars = new Set([...getVariables(inequality.left), ...getVariables(inequality.right)]);
		if (vars.size === 0) {
			// Truly constant inequality.
			return generateLinearInequalitySteps(inequality, {
				level: level === 'lycee' ? 'lycee' : 'superieur'
			});
		}
		throw new InequalityNotSolvable(
			`Coefficients paramétriques détectés (variables : ${[...vars].join(', ')}).`,
			'Hors scope V1 — fournir une seule variable.'
		);
	}

	// 3. Reject multi-fraction at the source (left side must be a single
	//    division before canonicalisation, mod delimiter wrapping). This guards
	//    against `1/x + 1/(x-1) < 0` whose canon is a single fraction but whose
	//    pedagogy requires a "common denominator" step (V1 hors scope).
	const leftUnwrapped = unwrap(inequality.left);
	if (leftUnwrapped.type !== 'division') {
		throw new InequalityNotSolvable(
			'Inéquation rationnelle non réduite à une seule fraction P/Q — non supporté en V1.',
			'Réduire au même dénominateur manuellement avant de relancer.'
		);
	}

	// 4. Standardise to canonical P/Q form (subtract right side, simplify).
	const canonForm = canon(subtract(inequality.left, inequality.right));
	const rationalForm = tryExtractRationalForm(canonForm);
	if (rationalForm === null) {
		// After canonicalisation, the form is no longer a fraction — could be
		// a polynomial after cancellation (e.g. `(x²-1)/(x-1) < 0` simplifies
		// to `x+1 < 0`). The dispatcher should retry on the polynomial form ;
		// we throw a typed error to signal "not a rational inequality at all".
		throw new InequalityNotSolvable(
			'La forme canonique n’est pas une fraction P/Q — relancer via le pipeline polynomial.',
			'Cas dégénéré : numérateur et dénominateur se simplifient.'
		);
	}
	const { numerator, denominator } = rationalForm;

	// 5. Validate degrees + reject parametric coefficients
	rejectIfParametric(numerator, variable, 'Le numérateur P(x)');
	rejectIfParametric(denominator, variable, 'Le dénominateur Q(x)');
	const degP = getPolynomialDegree(numerator, variable);
	const degQ = getPolynomialDegree(denominator, variable);
	if (degP === null || degP > 2) {
		throw new InequalityNotSolvable(
			`Degré du numérateur ${degP} non supporté (V1 : degré ≤ 2).`,
			'Hors scope V1.'
		);
	}
	if (degQ === null || degQ > 2) {
		throw new InequalityNotSolvable(
			`Degré du dénominateur ${degQ} non supporté (V1 : degré ≤ 2).`,
			'Hors scope V1.'
		);
	}
	if (isZero(denominator)) {
		throw new InequalityNotSolvable(
			'Le dénominateur est identiquement nul.',
			'Forme dégénérée non supportée.'
		);
	}

	// 6. Find numerator roots + denominator zeros (silent calculation)
	const numeratorRoots = findPolynomialZeros(numerator, variable, degP);
	const denominatorZeros = findPolynomialZeros(denominator, variable, degQ);

	// 6b. V1 guard : reject double roots. A degree-2 polynomial with exactly
	// 1 distinct real root means a double root (Δ=0), which would make the
	// sign-table renderer flip incorrectly. V1 supports only simple roots
	// (Δ ≠ 0) ; a double root is V1.1+ and would need multiplicity tracking
	// in the sign walk.
	if (degP === 2 && numeratorRoots.length === 1) {
		throw new InequalityNotSolvable(
			'Le numérateur a une racine double — non supporté en V1.',
			'Hors scope V1 (le tableau de signes ne change pas de signe au passage d’une racine double).'
		);
	}
	if (degQ === 2 && denominatorZeros.length === 1) {
		throw new InequalityNotSolvable(
			'Le dénominateur a un zéro double — non supporté en V1.',
			'Hors scope V1.'
		);
	}

	// 7. Extract leading coefficients (for sign-arithmetic in the renderer)
	const leadingCoefP = extractLeadingCoefficient(numerator, variable, degP);
	const leadingCoefQ = extractLeadingCoefficient(denominator, variable, degQ);

	// 8. Emit the pipeline
	let nextId = 1;
	const idGen = () => nextId++;
	const result: EquationStep[] = [];

	if (strategy.includeIdentify) {
		result.push(buildIdentifyEquationStep(inequality, idGen));
	}
	result.push(buildIdentifyRationalStep(inequality, numerator, denominator, idGen));
	result.push(buildDomainRestrictionStep(inequality, denominatorZeros, variable, idGen));
	result.push(buildLocateRootsStep(inequality, numeratorRoots, denominatorZeros, idGen));
	result.push(
		buildRationalSignTableStep(
			inequality,
			numerator,
			denominator,
			numeratorRoots,
			denominatorZeros,
			leadingCoefP,
			leadingCoefQ,
			degP,
			degQ,
			variable,
			idGen
		)
	);
	result.push(buildConcludeRationalStep(inequality, op, idGen));

	return renumberSteps(result);
}
