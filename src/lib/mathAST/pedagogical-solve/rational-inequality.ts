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
import type { EquationStep, RationalInequalityStepsOptions } from './types';
import { STRATEGIES_RATIONAL } from './types';
import { add, implicitMultiply, number, opposite, relation, subtract } from '../factory';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { getVariables, hasVariable } from '../eval/substitute';
import { flattenSumShallow } from '../flatten';
import { nodesEqual } from '../normal/hash';
import { extractQuadraticCoefficients } from '../solve/solvers/quadratic';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { solve } from '../solve/solve';
import { solveInequality } from '../solve/inequality';
import { computeNumericValue } from '../solve/numeric-value';
import {
	canon,
	describeDomain,
	isConstantCoefficient,
	isZero,
	makeStep,
	renumberSteps
} from './_helpers';
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

// =============================================================================
// V2 — Multi-fraction support
// =============================================================================

/**
 * A classified term from the top-level sum/subtraction structure.
 * - `denominator === null` ⇒ polynomial term (no fraction wrapper)
 * - `denominator !== null` ⇒ fraction term `numerator / denominator`
 */
type ClassifiedTerm = {
	readonly numerator: MathNode;
	readonly denominator: MathNode | null;
	readonly sign: '+' | '-';
};

/**
 * Walk the top-level sum/subtraction structure of a node and classify each
 * term as a fraction (division with variable in denominator) or a polynomial
 * term. Used by the `combine-fractions` detection.
 */
function collectFractionTerms(node: MathNode, variable: string): ClassifiedTerm[] {
	const flat = flattenSumShallow(node);
	const out: ClassifiedTerm[] = [];
	for (const { sign, term } of flat) {
		const t = unwrap(term);
		// Skip literal zero terms (e.g. when `inequality.right = 0` produces a
		// `- 0` in the flattened sum).
		if (t.type === 'number' && t.value === '0') continue;
		if (t.type === 'division' && hasVariable(t.denominator, variable)) {
			out.push({ numerator: t.numerator, denominator: t.denominator, sign });
		} else {
			out.push({ numerator: t, denominator: null, sign });
		}
	}
	return out;
}

/**
 * Compute the common denominator and combined numerator for V2 multi-fraction
 * input. V2 cap : at most 2 distinct fraction denominators, both linear, no
 * polynomial gcd reduction.
 *
 * Returns `null` if the V2 cap is exceeded (caller falls back to V1 path or
 * throws).
 */
function combineFractions(terms: readonly ClassifiedTerm[]): {
	readonly originalTerms: readonly ClassifiedTerm[];
	readonly adjustedNumerators: readonly MathNode[];
	readonly commonDenominator: MathNode;
	readonly combinedNumerator: MathNode;
	readonly combined: { readonly numerator: MathNode; readonly denominator: MathNode };
} | null {
	// Collect distinct fraction denominators (modulo structural equality).
	const fractionTerms = terms.filter((t) => t.denominator !== null);
	if (fractionTerms.length === 0) return null; // No fractions → not our case
	const distinctDenoms: MathNode[] = [];
	for (const t of fractionTerms) {
		if (t.denominator === null) continue;
		if (!distinctDenoms.some((d) => nodesEqual(d, t.denominator!))) {
			distinctDenoms.push(t.denominator);
		}
	}
	// V2 cap : up to 2 distinct denominators, all coprime (no GCD reduction).
	if (distinctDenoms.length > 2) return null;

	// Common denominator = product of distinct denominators (coprime assumption).
	const commonDenominator =
		distinctDenoms.length === 1
			? distinctDenoms[0]
			: canon(implicitMultiply(distinctDenoms[0], distinctDenoms[1]));

	// For each term, multiply its numerator by the « missing » factor so its
	// fraction sits on the common denominator.
	const adjustedNumerators: MathNode[] = [];
	let combinedNumerator: MathNode = number('0');
	for (const t of terms) {
		let missingFactor: MathNode;
		if (t.denominator === null) {
			missingFactor = commonDenominator;
		} else {
			const otherDenoms = distinctDenoms.filter((d) => !nodesEqual(d, t.denominator!));
			if (otherDenoms.length === 0) {
				missingFactor = number('1');
			} else if (otherDenoms.length === 1) {
				missingFactor = otherDenoms[0];
			} else {
				// V2 caps at 2 distinct, so this branch is unreachable.
				return null;
			}
		}
		// Guard : `numerator × 1` should display as just `numerator` ; canon may
		// or may not strip the `× 1` depending on AST shape, so we short-circuit.
		const adjustedNum =
			missingFactor.type === 'number' && missingFactor.value === '1'
				? t.numerator
				: canon(implicitMultiply(t.numerator, missingFactor));
		adjustedNumerators.push(adjustedNum);
		const signed = t.sign === '+' ? adjustedNum : opposite(adjustedNum);
		combinedNumerator = add(combinedNumerator, signed);
	}
	combinedNumerator = canon(combinedNumerator);

	return {
		originalTerms: terms,
		adjustedNumerators,
		commonDenominator,
		combinedNumerator,
		combined: { numerator: combinedNumerator, denominator: commonDenominator }
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
	if (result.error) {
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

function buildCombineFractionsStep(
	originalIneq: RelationNode,
	combination: NonNullable<ReturnType<typeof combineFractions>>,
	idGen: () => number
): EquationStep {
	return makeStep({
		id: idGen(),
		rule: 'combine-fractions',
		description: 'On réduit au même dénominateur',
		before: originalIneq,
		after: originalIneq,
		operation: {
			kind: 'combine-fractions',
			originalTerms: combination.originalTerms,
			adjustedNumerators: combination.adjustedNumerators,
			commonDenominator: combination.commonDenominator,
			combinedNumerator: combination.combinedNumerator,
			combined: combination.combined
		}
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
	numeratorMultiplicities: readonly number[],
	denominatorMultiplicities: readonly number[],
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
			numeratorMultiplicities,
			denominatorMultiplicities,
			leadingCoefP,
			leadingCoefQ,
			degP,
			degQ,
			variable
		}
	});
}

/**
 * Compute multiplicities for the roots returned by `solve()`. The solver
 * deduplicates roots, so we infer multiplicity from the degree shortfall :
 * - degree 1, 1 root → [1]
 * - degree 2, 2 roots → [1, 1]
 * - degree 2, 1 root → [2] (double root, Δ=0)
 * - degree 2, 0 roots → [] (Δ<0, no real root)
 * - degree 0, 0 roots → []
 *
 * For higher degrees (out of V1 scope) or any other shape, throws — the
 * caller's `degP`/`degQ` validation should already exclude these.
 */
function computeMultiplicities(roots: readonly MathNode[], degree: number): readonly number[] {
	if (roots.length === 0) return [];
	if (roots.length === degree) {
		// Each root simple.
		return roots.map(() => 1);
	}
	if (degree === 2 && roots.length === 1) {
		// Δ = 0 → unique root with multiplicity 2.
		return [2];
	}
	// Anything else (e.g. degree ≥ 3, or unexpected) is rejected upstream by
	// the degree guard ; this branch is defensive.
	throw new InequalityNotSolvable(
		`Multiplicité non déductible (degré=${degree}, racines distinctes=${roots.length}).`,
		'Hors scope V1.'
	);
}

function buildConcludeRationalStep(
	originalIneq: RelationNode,
	op: InequalityOp,
	idGen: () => number
): EquationStep {
	const result = solveInequality(originalIneq);
	const solutionDescription = describeDomain(result.solution);
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

	// 3. Detect the input shape :
	//    - Already a single fraction P/Q with rhs = 0 → V1 direct path
	//    - Multiple fractions, or polynomial+fraction, or rhs ≠ 0 → V2 needs
	//      a `combine-fractions` step before identifying P/Q.
	const leftUnwrapped = unwrap(inequality.left);
	const rightIsZero = isZero(inequality.right);
	const isV1DirectPath = leftUnwrapped.type === 'division' && rightIsZero;

	let combinationData: ReturnType<typeof combineFractions> | null = null;
	if (!isV1DirectPath) {
		// V2 — try to combine fractions.
		const rawStandardForm = subtract(inequality.left, inequality.right);
		const terms = collectFractionTerms(rawStandardForm, variable);
		const fractionTermCount = terms.filter((t) => t.denominator !== null).length;
		if (fractionTermCount === 0) {
			// No fractions found — not a rational inequality at all (e.g. someone
			// called this on a polynomial). Re-route via the dispatcher.
			throw new InequalityNotSolvable(
				'Aucun terme fractionnaire détecté — utiliser `generateInequalitySteps`.',
				'Cas dégénéré.'
			);
		}
		combinationData = combineFractions(terms);
		if (combinationData === null) {
			throw new InequalityNotSolvable(
				'Inéquation rationnelle complexe (V2 supporte au plus 2 dénominateurs distincts coprimes).',
				'Hors scope V2.'
			);
		}
	}

	// 4. Standardise to canonical P/Q form (subtract right side, simplify).
	const canonForm = canon(subtract(inequality.left, inequality.right));
	const rationalForm = tryExtractRationalForm(canonForm);
	if (rationalForm === null) {
		// After canonicalisation, the form is no longer a fraction — could be a
		// polynomial after cancellation (e.g. `(x²-1)/(x-1) < 0` simplifies to
		// `x+1 < 0`). The top-level `generateInequalitySteps` dispatcher handles
		// these naturally because `getPolynomialDegree(canon)` returns a number,
		// routing to the polynomial pipeline. Direct callers of this function
		// receive a typed error so they can re-route via the dispatcher.
		throw new InequalityNotSolvable(
			'Forme dégénérée : la fraction se simplifie en un polynôme. Utiliser `generateInequalitySteps` qui re-route automatiquement.',
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

	// 6. Find numerator roots + denominator zeros (silent calculation).
	// Multiplicities are computed from the degree shortfall (V1.1 — supports
	// double roots in the renderer's sign walk).
	const numeratorRoots = findPolynomialZeros(numerator, variable, degP);
	const denominatorZeros = findPolynomialZeros(denominator, variable, degQ);
	const numeratorMultiplicities = computeMultiplicities(numeratorRoots, degP);
	const denominatorMultiplicities = computeMultiplicities(denominatorZeros, degQ);

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
	// V2 — emit the « réduction au même dénominateur » step BEFORE
	// `identify-rational` when the input wasn't already a single P/Q.
	if (combinationData !== null) {
		result.push(buildCombineFractionsStep(inequality, combinationData, idGen));
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
			numeratorMultiplicities,
			denominatorMultiplicities,
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
