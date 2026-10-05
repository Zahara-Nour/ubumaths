/**
 * Equation Solver - Main Entry Point
 *
 * Provides the main solve() function for solving equations.
 *
 * ## Supported equation types and completeness guarantees
 *
 * | Type                        | Solver              | Completeness              |
 * |-----------------------------|---------------------|---------------------------|
 * | Linear (ax+b=0)             | linearSolver        | Complete                  |
 * | Quadratic (ax²+bx+c=0)     | quadraticSolver     | Complete                  |
 * | Cubic (ax³+bx²+cx+d=0)     | polynomialSolver    | Complete (Cardano)        |
 * | Pure power (x^n=k)          | polynomialSolver    | Complete                  |
 * | Quartic (ax⁴+bx³+cx²+dx+e=0)| quarticSolver       | Complete (Ferrari)        |
 * | General polynomial deg > 4  | —                   | NOT supported             |
 * | Exponential (e^x=c)         | transcendentalSolver| Simple cases only         |
 * | Logarithmic (ln(x)=c)       | transcendentalSolver| Simple cases only         |
 * | Trigonometric (sin(ax+b)=c) | transcendentalSolver| Periodic family           |
 * | Trig non-linear (sin(f(x))=c)| tryTrigRecursive   | First-period u-values     |
 * | Exp non-linear (e^(f(x))=c)  | tryExpLogRecursive | Recursive decomposition   |
 * | Log non-linear (ln(f(x))=c)  | tryExpLogRecursive | Recursive decomposition   |
 * | Mixed products (x·sin(x)=0) | tryProductDecomp    | Zero-product property     |
 * | Mixed (x·e^x=1, etc.)      | —                   | NOT supported             |
 *
 * ## Critical role in sign analysis
 *
 * The sign module (and the variations module above it) depends on solve finding
 * **all** zeros of an expression. If solve misses a zero, the sign analysis may
 * silently produce incorrect results (see sign/index.ts for details).
 *
 * ## Known gaps (affecting sign/variation correctness)
 *
 * 1. **Polynomials degree >= 5**: no general formula exists (Abel-Ruffini theorem).
 *    Needs numeric methods (Newton) + Sturm sequences for root counting.
 * 2. **Trigonometric solutions**: only the principal value is returned, not the
 *    full periodic family (x = arcsin(c) + 2kπ). For sign analysis on R, all
 *    zeros in the domain must be enumerated. The periodicity module
 *    (analysis/periodicity.ts) can detect periods and could be used to generate
 *    all zeros within a given interval.
 * 3. **Mixed transcendental equations** (e^x=x): most not handled.
 *    Product-form equations (x·sin(x)=0) are decomposed via zero-product property.
 *    Non-product mixed equations still require numeric methods.
 *
 * For the Chiphre pedagogical scope (high school level), the most impactful
 * gap is trigonometric periodic solutions: derivatives like cos(x) have infinitely
 * many zeros and the current solver only returns one.
 *
 * @module mathAST/solve/solve
 */

import type { MathNode, RelationNode } from '../types';
import type {
	SolveResult,
	SolveOptions,
	ClassificationResult,
	SolvingStrategy,
	EquationSolver
} from './types';
import { DEFAULT_SOLVE_OPTIONS, SolveError } from './types';
import { isDelimiter, isMultiplication, isRelation } from '../guards';
import {
	classifyEquation,
	toStandardForm,
	detectVariable,
	unwrapGrouping,
	unwrapGroupingMembers
} from './classify';
import { createStepRecorder } from './step-recorder';
import { linearSolver } from './solvers/linear';
import { quadraticSolver } from './solvers/quadratic';
import { polynomialSolver } from './solvers/polynomial';
import { quarticSolver } from './solvers/quartic';
import {
	transcendentalSolver,
	extractTranscendentalEquation,
	computeUSolutions
} from './solvers/transcendental';
import { extractLinearForm } from '../analysis/coefficient-utils';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { normalize, normalFormsEquivalent, ZERO_NORMAL_FORM, denormalize } from '../normal';
import {
	number,
	equals,
	func,
	superscript,
	euler,
	divide,
	add,
	multiply,
	opposite,
	parentheses
} from '../factory';
import { numericNode } from '../common/numeric';
import { flattenSumShallow, flattenProductShallow, unflattenSum } from '../flatten';
import { getVariables } from '../eval/substitute';
import { isZeroNode } from './solvers/polynomial';
import type { Solution, PeriodicSolutionFamily } from './types';
import { getRuleDescription } from './descriptions-fr';
import { computeDomain } from '../domain/compute';
import { promoteEulerInRelation, promoteStandaloneEulerInRelation } from './promote-euler';
import { tryRationalDecomposition, createRationalDepthState } from './rational';
import type { Domain } from '../domain/types';
import {
	containsNode,
	isUniversal,
	isEmpty as isDomainEmpty,
	intersect as intersectDomains
} from '../domain/algebra';
import { formatInterval } from '../domain/format';
import { applyRules } from '../pattern/rule';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode } from '../pattern/types';
// Import direct, pas le baril `rule-sets/index.ts` (cycle de chunk documenté
// dans `common-factor.ts`).
import { commonFactorRules } from '../pattern/rule-sets/common-factor';
import { nodesEqual } from '../normal/hash';
import { denormalizeMonomial, denormalizeTerm } from '../normal/denormalize';
import { divMonomials, gcdMonomials } from '../normal/monomial';

// =============================================================================
// Strategy Selection
// =============================================================================

/**
 * Select the best solving strategy based on equation classification.
 *
 * Note: 'algebraic' means an exact closed-form solution exists.
 * 'numeric' means we'd need iterative methods (Newton, bisection, …).
 * Currently, 'numeric' strategy is declared but not fully implemented —
 * equations classified as numeric will typically fail to solve.
 */
function selectStrategy(classification: ClassificationResult): SolvingStrategy {
	switch (classification.type) {
		case 'linear':
		case 'quadratic':
			return 'algebraic';

		case 'polynomial':
			// Degree 3 (Cardano) and 4 (Ferrari) are algebraic.
			// Degree >= 5 needs numeric methods (Abel-Ruffini theorem).
			return classification.degree && classification.degree <= 4 ? 'algebraic' : 'numeric';

		case 'exponential':
		case 'logarithmic':
			// Simple cases can be algebraic
			return 'algebraic';

		case 'trigonometric':
		case 'mixed':
			// Usually need numeric methods
			return 'numeric';

		default:
			return 'numeric';
	}
}

/**
 * Select the appropriate solver based on classification.
 */
function selectSolver(classification: ClassificationResult): EquationSolver | null {
	switch (classification.type) {
		case 'linear':
			return linearSolver;

		case 'quadratic':
			return quadraticSolver;

		case 'polynomial':
			if (classification.degree === 4) return quarticSolver;
			return polynomialSolver;

		case 'exponential':
		case 'logarithmic':
		case 'trigonometric':
			return transcendentalSolver;

		default:
			return null;
	}
}

// =============================================================================
// Constant Equation Handler
// =============================================================================

/**
 * Handle constant equations (no variable).
 * - If expr = 0, the equation is always true (infinite solutions)
 * - If expr ≠ 0, the equation is always false (no solution)
 */
function handleConstantEquation(
	expr: MathNode,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult {
	const recorder = createStepRecorder();
	const zeroNorm = normalize(number('0'));
	const exprNorm = normalize(expr);

	if (normalFormsEquivalent(exprNorm, zeroNorm)) {
		// 0 = 0: infinite solutions
		recorder.recordStep(
			'infinite-solutions',
			"L'equation 0 = 0 est toujours vraie",
			expr,
			expr,
			'summarized'
		);
		return {
			variable: '',
			status: 'infinite',
			solutions: [],
			equationType: 'constant',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	// c = 0 where c ≠ 0: no solution
	recorder.recordStep(
		'no-solution',
		"L'equation est une contradiction (constante non nulle = 0)",
		expr,
		expr,
		'summarized'
	);
	return {
		variable: '',
		status: 'no-solution',
		solutions: [],
		equationType: 'constant',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Product Decomposition (Zero-Product Property)
// =============================================================================

/**
 * Extract product factors from a standard-form expression (lhs - rhs).
 *
 * toStandardForm returns `lhs - rhs`. If rhs was 0, this is `lhs - 0`,
 * a subtraction node. We flatten the sum to find the non-zero term,
 * then check if it's a multiplication.
 *
 * @returns Array of factors if expr is a product, null otherwise
 */
function extractProductFactors(expr: MathNode): MathNode[] | null {
	const terms = flattenSumShallow(expr);

	// Filter out zero terms
	const nonZeroTerms = terms.filter(({ term }) => !isZeroNode(term));

	// Must have exactly 1 non-zero term, and it must be positive
	if (nonZeroTerms.length !== 1) return null;
	const { sign, term } = nonZeroTerms[0];

	// A negative term means the expression is `-product`, which is fine:
	// -A·B = 0 iff A·B = 0. But we need the inner product node.
	const productNode = sign === '-' && term.type === 'opposite' ? term.operand : term;

	// Check if it's a multiplication
	if (productNode.type !== 'multiplication') return null;

	const factors = flattenProductShallow(productNode);
	if (factors.length < 2) return null;

	return factors.map(({ factor }) => factor);
}

/**
 * Try to compute an approximate numeric value for a solution missing one.
 * Handles the case where the linear solver doesn't set approximate for zero.
 */
function ensureApproximate(sol: Solution): Solution {
	if (sol.approximate !== undefined) return sol;
	const norm = normalize(sol.value);
	if (norm.numerator.length === 0 || normalFormsEquivalent(norm, ZERO_NORMAL_FORM)) {
		return { ...sol, approximate: 0 };
	}
	return sol;
}

/**
 * Deduplicate solutions by approximate numeric value or normalized form.
 */
function deduplicateSolutions(solutions: Solution[], tolerance = 1e-10): Solution[] {
	const result: Solution[] = [];
	for (const sol of solutions) {
		const isDuplicate = result.some((existing) => {
			// Compare by approximate value if both are defined
			if (existing.approximate !== undefined && sol.approximate !== undefined) {
				return Math.abs(existing.approximate - sol.approximate) < tolerance;
			}
			// Compare by normalized form as fallback
			return normalFormsEquivalent(normalize(existing.value), normalize(sol.value));
		});
		if (!isDuplicate) {
			result.push(sol);
		}
	}
	return result;
}

/**
 * Recursion guard for product decomposition.
 * flattenProductShallow fully decomposes products so recursion is unlikely,
 * but this prevents stack overflow on pathological inputs.
 */
let productDecompositionDepth = 0;
const MAX_PRODUCT_DECOMPOSITION_DEPTH = 5;

/**
 * Try to solve an equation by product decomposition (zero-product property).
 *
 * If the standard-form expression is a product A·B·...= 0, solve each
 * variable-dependent factor independently and merge solutions.
 *
 * **Limitation**: When multiple factors produce periodic solution families
 * (e.g., sin(x)·cos(x) = 0), only the first periodic family is attached.
 * For complete zero enumeration in sign analysis, each factor may need
 * to be solved independently.
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryProductDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (productDecompositionDepth >= MAX_PRODUCT_DECOMPOSITION_DEPTH) return null;

	const factors = extractProductFactors(expr);
	if (!factors) return null;

	// Partition into variable-dependent and constant factors
	const variableFactors = factors.filter((f) => getVariables(f).has(variable));

	// Need at least 2 variable-dependent factors for decomposition to be useful
	if (variableFactors.length < 2) return null;

	const recorder = createStepRecorder();
	recorder.recordStep(
		'zero-product-property',
		getRuleDescription('zero-product-property'),
		expr,
		expr,
		'summarized'
	);

	const allSolutions: Solution[] = [];
	const periodicFamilies: PeriodicSolutionFamily[] = [];

	productDecompositionDepth++;
	try {
		for (const factor of variableFactors) {
			const unwrapped = unwrapGrouping(factor);
			const factorEq = equals(unwrapped, number('0'));
			const factorResult = solve(factorEq, { variable, verbosity: opts.verbosity });

			if (factorResult.status === 'no-solution' || factorResult.status === 'no-real-solution') {
				continue;
			}

			allSolutions.push(...factorResult.solutions.map(ensureApproximate));

			if (factorResult.periodicSolutions) {
				periodicFamilies.push(factorResult.periodicSolutions);
			}
		}
	} finally {
		productDecompositionDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'mixed',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: 'mixed',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity),
		// If there are periodic families, attach the first one
		// (multiple periodic families would need a more complex merge)
		...(periodicFamilies.length > 0 ? { periodicSolutions: periodicFamilies[0] } : {})
	};
}

// =============================================================================
// Common Factor Decomposition (mise en facteur, puis produit nul)
// =============================================================================

/** Garde de récursion : chaque facteur est résolu par un nouvel appel à `solve`. */
let commonFactorDepth = 0;
const MAX_COMMON_FACTOR_DEPTH = 3;

/**
 * L'opposé d'un terme, écrit comme un PRODUIT dont le premier facteur porte le
 * signe : `6x·e^{2x}` devient `(−6x)·e^{2x}`, et un terme nu `eˣ` devient
 * `(−1)·eˣ`.
 *
 * ⚠️ Les règles de `commonFactorRules` ne connaissent que l'addition
 * (`a·c + b·c`, `c + b·c`) : sans cette réécriture, `3e^{2x} − 6x·e^{2x}` ne
 * se factorisait pas. On ne réécrit pas les règles — on leur présente la
 * somme sous la forme qu'elles savent lire.
 */
function negatedTermAsProduct(term: MathNode): MathNode {
	if (isMultiplication(term)) {
		return multiply(opposite(term.left), term.right, term.displayStyle);
	}
	return multiply(opposite(number('1')), term, 'star');
}

/**
 * La somme `lhs − rhs` réécrite en additions seules, ou `null` si ce n'est pas
 * une somme d'au moins deux termes non nuls.
 */
function sumOfSignedTerms(expr: MathNode): MathNode | null {
	const terms = flattenSumShallow(expr).filter(({ term }) => !isZeroNode(term));
	if (terms.length < 2) return null;
	const addends = terms.map(({ sign, term }) => (sign === '+' ? term : negatedTermAsProduct(term)));
	return addends.reduce((sum, term) => add(sum, term));
}

/**
 * Remettre au propre les facteurs-sommes d'un produit factorisé : `(3 + −6x)`
 * se lit `(3 − 6x)`. Seule l'écriture change — la forme normale est la même.
 */
function tidySumFactors(product: MathNode): MathNode {
	if (!isMultiplication(product)) return product;
	const tidy = (factor: MathNode): MathNode => {
		if (isDelimiter(factor) && factor.content.type === 'addition') {
			return parentheses(denormalize(normalize(factor.content)));
		}
		return tidySumFactors(factor);
	};
	return multiply(tidy(product.left), tidy(product.right), product.displayStyle);
}

/**
 * Résoudre `somme = 0` en mettant en évidence un facteur commun NON constant,
 * puis par la propriété du produit nul.
 *
 * `eˣ + x·eˣ = 0` devient `(x + 1)·eˣ = 0` : x = −1, et `eˣ = 0` n'a pas de
 * solution. C'est la forme sous laquelle arrive la dérivée de `x·eˣ` — sans
 * cette étape, `.variations` n'y trouvait aucun point critique.
 *
 * ⚠️ **La factorisation n'est pas réécrite ici** : ce sont les règles de
 * `pattern/rule-sets/common-factor` (`commonFactorRules`, celles de
 * l'intention « factoriser »), appliquées jusqu'au point fixe pour qu'une
 * somme de trois termes se factorise aussi. Les règles du CONTENU
 * (`commonContentFactorRules`, facteur numérique et monôme) ne sont pas
 * utilisées : les polynômes ont leurs propres solveurs.
 *
 * Appelée seulement quand les autres chemins ont échoué : une équation que
 * le solveur savait déjà résoudre garde sa résolution et ses étapes. Le
 * domaine est filtré ensuite par `solve` (x ln x + x = 0 : x = 0 sort).
 *
 * @returns SolveResult si la mise en facteur aboutit à un produit nul, null sinon
 */
function tryCommonFactorDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (commonFactorDepth >= MAX_COMMON_FACTOR_DEPTH) return null;

	const sum = sumOfSignedTerms(expr);
	if (sum === null) return null;

	// 1. La somme telle qu'elle est écrite (comportement de #852, inchangé).
	const direct = applyRules(commonFactorRules, sum);
	const fromWrittenSum = nodesEqual(direct, sum)
		? null
		: solveFactoredProduct(expr, tidySumFactors(direct), variable, opts);
	if (fromWrittenSum !== null) return fromWrittenSum;

	// 2. Le facteur commun enfoui dans un produit, un opposé ou une puissance :
	//    la somme est d'abord réécrite pour l'exposer, puis les MÊMES règles
	//    factorisent.
	const exposed = sumWithExposedCommonFactor(expr, variable);
	if (exposed === null) return null;
	const factored = applyRules(commonFactorRules, exposed.sum);
	if (!isMultiplication(factored) || !nodesEqual(factored.right, exposed.factor)) return null;
	return solveFactoredProduct(expr, tidySumFactors(factored), variable, opts);
}

/**
 * Résoudre le produit issu de la mise en facteur (produit nul), en racontant
 * la mise en facteur en tête des étapes.
 */
function solveFactoredProduct(
	expr: MathNode,
	product: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	let productResult: SolveResult | null;
	commonFactorDepth++;
	try {
		productResult = tryProductDecomposition(product, variable, opts);
	} finally {
		commonFactorDepth--;
	}
	if (productResult === null) return null;

	const recorder = createStepRecorder();
	recorder.recordStep(
		'common-factor',
		getRuleDescription('common-factor'),
		expr,
		product,
		'summarized'
	);

	return {
		...productResult,
		steps: [...recorder.getStepsFiltered(opts.verbosity), ...productResult.steps]
	};
}

/**
 * La somme réécrite `r₁·c + r₂·c + …`, le facteur commun `c` en opérande
 * DIRECT de chaque terme, pour que `commonFactorRules` le voie.
 *
 * ⚠️ **Ce que les règles ne lisent pas** (mesuré sur des dérivées de
 * Terminale) : un facteur commun enfoui dans un produit imbriqué
 * (`x·(e^{2x}·2)`), sous un opposé (`x·(−e^{−x})`), ou caché dans une
 * puissance (`x²·1/x`, qui vaut `x`). On ne réécrit pas les règles : la forme
 * normale (`normalize`) aplatit déjà chaque terme en coefficient × liste de
 * facteurs `base^exposant` — signes et nombres sortis, `x²·1/x` simplifié,
 * `x²` vu comme `x` à l'exposant 2. Le facteur commun est leur PGCD
 * (`gcdMonomials`), le reste de chaque terme son quotient (`divMonomials`).
 *
 * Seuls comptent les facteurs qui dépendent de l'inconnue et d'exposant
 * positif : sortir un nombre ne mène à aucun produit nul utile.
 *
 * @returns la somme réécrite et le facteur commun, ou `null` s'il n'y en a pas
 */
function sumWithExposedCommonFactor(
	expr: MathNode,
	variable: string
): { readonly sum: MathNode; readonly factor: MathNode } | null {
	const form = normalize(expr);
	// Un dénominateur non constant demanderait de raisonner sur ses zéros :
	// hors de portée, on ne s'y aventure pas.
	if (form.denominator.length !== 1 || form.denominator[0].monomial.length !== 0) return null;

	const terms = form.numerator;
	if (terms.length < 2) return null;

	const common = terms
		.slice(1)
		.reduce((gcd, term) => gcdMonomials(gcd, term.monomial), [...terms[0].monomial])
		.filter((f) => f.exponent.n > 0n && getVariables(f.base).has(variable));
	const factor = denormalizeMonomial(common);
	if (factor === null) return null;

	const addends: MathNode[] = terms.map((term) =>
		multiply(
			denormalizeTerm({
				coefficient: term.coefficient,
				monomial: divMonomials(term.monomial, common)
			}),
			factor,
			'implicit'
		)
	);
	return { sum: addends.reduce((acc: MathNode, term) => add(acc, term)), factor };
}

// =============================================================================
// Power Decomposition
// =============================================================================

/** Recursion guard for nested powers such as `((x-1)^2)^3`. */
let powerDecompositionDepth = 0;
const MAX_POWER_DECOMPOSITION_DEPTH = 5;

/**
 * Read `u^n` when `n` is an integer ≥ 2 and `u` involves the variable.
 *
 * A bare variable base is left alone: `x^n = k` has its own solver, which knows
 * how to answer for a non-zero `k`.
 */
function extractZeroPowerBase(expr: MathNode, variable: string): MathNode | null {
	const node = unwrapGrouping(expr);
	if (node.type !== 'superscript') return null;

	const exponent = node.superscript;
	if (exponent.type !== 'number') return null;

	const n = Number(exponent.value);
	if (!Number.isInteger(n) || n < 2) return null;

	const base = unwrapGrouping(node.base);
	if (base.type === 'variable') return null;
	if (!getVariables(base).has(variable)) return null;

	return base;
}

/**
 * Try to solve `u^n = 0` as `u = 0`.
 *
 * A power vanishes exactly where its base does — the multiplicity changes the
 * shape of the curve, not the set of solutions. Without this, `(x²-2)² = 0`
 * reached the quartic solver, which refuses coefficients that still hold `x`,
 * and the equation came back as having no solution at all. `(x²-2)³ = 0` was
 * degree 6, which no solver covers.
 *
 * @returns SolveResult if the expression is such a power, null otherwise
 */
function tryPowerDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (powerDecompositionDepth >= MAX_POWER_DECOMPOSITION_DEPTH) return null;

	const base = extractZeroPowerBase(expr, variable);
	if (!base) return null;

	const recorder = createStepRecorder();
	recorder.recordStep(
		'zero-product-property',
		getRuleDescription('zero-product-property'),
		expr,
		equals(base, number('0')),
		'summarized'
	);

	let baseResult: SolveResult;
	powerDecompositionDepth++;
	try {
		baseResult = solve(equals(base, number('0')), { variable, verbosity: opts.verbosity });
	} finally {
		powerDecompositionDepth--;
	}

	if (baseResult.solutions.length === 0) {
		return {
			variable,
			status: baseResult.status,
			solutions: [],
			equationType: 'mixed',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const solutions = baseResult.solutions.map(ensureApproximate);

	return {
		variable,
		status: solutions.length === 1 ? 'unique' : 'multiple',
		solutions,
		equationType: 'mixed',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity),
		...(baseResult.periodicSolutions ? { periodicSolutions: baseResult.periodicSolutions } : {})
	};
}

// =============================================================================
// Trig Recursive Decomposition
// =============================================================================

/**
 * Recursion guard for trig recursive decomposition.
 */
let trigRecursiveDepth = 0;
const MAX_TRIG_RECURSIVE_DEPTH = 3;

/**
 * Try to solve a trig equation with a non-linear argument by recursive decomposition.
 *
 * For sin(f(x)) = c, compute u-values (arcsin(c), π - arcsin(c)),
 * then solve f(x) = u recursively.
 *
 * Only activates when the trig argument is non-linear. Linear arguments
 * (sin(ax+b) = c) are left to the normal solver which produces PeriodicSolutionFamily.
 *
 * **Limitation**: Only base u-values are used (k=0); additional periods of the trig
 * function in u-space are not enumerated. For sin(x²) = 0 this gives
 * {0, ±√π} but not ±√(2π), ±√(3π), etc.
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryTrigRecursiveDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (trigRecursiveDepth >= MAX_TRIG_RECURSIVE_DEPTH) return null;

	const extracted = extractTranscendentalEquation(expr, variable);
	if (!extracted || extracted.kind !== 'trig') return null;

	const { funcName, argument, constantNode, constantNumeric } = extracted;

	// Check domain restrictions for sin/cos
	if ((funcName === 'sin' || funcName === 'cos') && Math.abs(constantNumeric) > 1) {
		const recorder = createStepRecorder();
		recorder.recordStep(
			'no-real-solution',
			`L'equation ${funcName}(f(x)) = ${constantNumeric} n'a pas de solution car ${constantNumeric} n'est pas dans [-1, 1]`,
			expr,
			expr,
			'summarized'
		);
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'trigonometric',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	// If argument is linear, let the normal trig solver handle it (with PeriodicSolutionFamily)
	const linearForm = extractLinearForm(argument, variable);
	if (linearForm) return null;

	// Compute u-space solutions
	const basePeriod = funcName === 'tan' ? Math.PI : 2 * Math.PI;
	const uSolutions = computeUSolutions(funcName, constantNode, constantNumeric, basePeriod);

	const recorder = createStepRecorder();
	recorder.recordStep(
		'trig-recursive-decomposition',
		getRuleDescription('trig-recursive-decomposition'),
		expr,
		expr,
		'summarized'
	);

	const allSolutions: Solution[] = [];

	trigRecursiveDepth++;
	try {
		for (const uSol of uSolutions) {
			// Solve: argument = uSol.symbolic
			const subEquation = equals(argument, uSol.symbolic);
			const subResult = solve(subEquation, { variable, verbosity: opts.verbosity });

			if (subResult.status === 'no-solution' || subResult.status === 'no-real-solution') {
				continue;
			}

			// Ensure approximate values and filter out non-real solutions
			for (const sol of subResult.solutions) {
				let approx = sol.approximate;
				if (approx === undefined) {
					try {
						approx = evaluateNodeToApproximatedNumber(sol.value);
					} catch {
						// If evaluation fails, skip this solution (likely imaginary)
						continue;
					}
				}
				if (!isFinite(approx)) continue;
				allSolutions.push({ ...sol, approximate: approx });
			}
		}
	} finally {
		trigRecursiveDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: 'trigonometric',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: 'trigonometric',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Exp/Log Recursive Decomposition
// =============================================================================

/**
 * Recursion guard for exp/log recursive decomposition.
 */
let expLogRecursiveDepth = 0;
const MAX_EXP_LOG_RECURSIVE_DEPTH = 3;

/**
 * `e^A − e^B = 0`, les deux exposants dépendant de l'inconnue.
 *
 * Deux formes de l'exponentielle : base `euler()` (le `e` de `e^u` est promu
 * en amont) et fonction `exp(u)`.
 *
 * ⚠️ Construits à l'APPEL, pas au chargement du module : par l'atelier, `P`
 * est encore `undefined` quand `solve.ts` s'évalue (cycle d'import) —
 * mesuré, « Cannot read properties of undefined (reading 'sum') ».
 */
function equalExponentialsPatterns() {
	return [
		P.sum(P.pow(P.lit(euler()), P._('a')), P.neg(P.pow(P.lit(euler()), P._('b')))),
		P.sum(P.func('exp', [P._('a')]), P.neg(P.func('exp', [P._('b')])))
	] as const;
}

/**
 * `e^A = e^B` ⟺ `A = B` : l'exponentielle est injective sur ℝ.
 *
 * ⚠️ Sans cette règle, `e^x = e^{-x}` revenait « Type d'equation
 * transcendante non supporte » : l'extracteur exige UN seul terme
 * exponentiel dépendant de l'inconnue, le reste constant. On ne traite que
 * les deux exposants variables ; `e^{x+1} = e^3` reste au solveur linéaire
 * de `solveExponential`.
 *
 * La sous-équation `A = B` porte toute la réponse, y compris « aucune
 * solution » (`e^x = e^{x+1}`) ou « tout réel » (`e^x = e^x`).
 */
function tryEqualExponentials(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (expLogRecursiveDepth >= MAX_EXP_LOG_RECURSIVE_DEPTH) return null;

	for (const pattern of equalExponentialsPatterns()) {
		const bindings = tryMatch(pattern, expr);
		if (!bindings) continue;
		const a = getBindingNode(bindings, 'a');
		const b = getBindingNode(bindings, 'b');
		if (!a || !b) continue;
		if (!getVariables(a).has(variable) || !getVariables(b).has(variable)) continue;

		const subEquation = equals(a, b);
		expLogRecursiveDepth++;
		let subResult: SolveResult;
		try {
			subResult = solve(subEquation, { variable, verbosity: opts.verbosity });
		} finally {
			expLogRecursiveDepth--;
		}

		const recorder = createStepRecorder();
		recorder.recordStep(
			'equal-exponentials',
			getRuleDescription('equal-exponentials'),
			expr,
			subEquation,
			'summarized'
		);
		return {
			...subResult,
			equationType: 'exponential',
			steps: [...recorder.getStepsFiltered(opts.verbosity), ...subResult.steps]
		};
	}
	return null;
}

/**
 * Try to solve an exp/log equation with a non-linear argument by recursive decomposition.
 *
 * For e^(f(x)) = c, compute u = ln(c), then solve f(x) = u recursively.
 * For ln(f(x)) = c, compute u = e^c, then solve f(x) = u recursively.
 *
 * Only activates when the argument is non-linear. Linear arguments
 * (e^(ax+b) = c) are left to the normal solver.
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryExpLogRecursiveDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (expLogRecursiveDepth >= MAX_EXP_LOG_RECURSIVE_DEPTH) return null;

	const extracted = extractTranscendentalEquation(expr, variable);
	if (!extracted || (extracted.kind !== 'exp' && extracted.kind !== 'log')) return null;

	const { kind, funcName, argument, constantNode, constantNumeric } = extracted;

	// If argument is linear, let the normal solver handle it
	const linearForm = extractLinearForm(argument, variable);
	if (linearForm) return null;

	// Compute u-values
	interface UValue {
		readonly symbolic: MathNode;
		readonly numeric: number;
	}
	const uValues: UValue[] = [];

	if (kind === 'exp') {
		// e^u = c → u = ln(c), requires c > 0
		if (constantNumeric <= 0) {
			const recorder = createStepRecorder();
			recorder.recordStep(
				'no-real-solution',
				`L'equation exponentielle n'a pas de solution reelle car la valeur cible est negative ou nulle`,
				expr,
				expr,
				'summarized'
			);
			return {
				variable,
				status: 'no-real-solution',
				solutions: [],
				equationType: 'exponential',
				strategy: 'algebraic',
				steps: recorder.getStepsFiltered(opts.verbosity)
			};
		}
		const lnC = func('ln', [constantNode]);
		const lnCSimplified = denormalize(normalize(lnC));
		uValues.push({ symbolic: lnCSimplified, numeric: Math.log(constantNumeric) });
	} else if (funcName === 'ln') {
		// ln(u) = c → u = e^c
		let inverseNode: MathNode;
		if (constantNumeric === 0) {
			inverseNode = number('1');
		} else if (constantNumeric === 1) {
			inverseNode = euler();
		} else {
			inverseNode = denormalize(normalize(superscript(euler(), constantNode)));
		}
		uValues.push({ symbolic: inverseNode, numeric: Math.exp(constantNumeric) });
	} else {
		// log(u) = c → u = 10^c
		let inverseNode: MathNode;
		if (constantNumeric === 0) {
			inverseNode = number('1');
		} else {
			inverseNode = denormalize(normalize(superscript(number('10'), constantNode)));
		}
		uValues.push({ symbolic: inverseNode, numeric: Math.pow(10, constantNumeric) });
	}

	const recorder = createStepRecorder();
	recorder.recordStep(
		'exp-log-recursive-decomposition',
		getRuleDescription('exp-log-recursive-decomposition'),
		expr,
		expr,
		'summarized'
	);

	const allSolutions: Solution[] = [];

	expLogRecursiveDepth++;
	try {
		for (const uVal of uValues) {
			// Solve: argument = uVal.symbolic
			const subEquation = equals(argument, uVal.symbolic);
			const subResult = solve(subEquation, { variable, verbosity: opts.verbosity });

			if (subResult.status === 'no-solution' || subResult.status === 'no-real-solution') {
				continue;
			}

			// Ensure approximate values and filter out non-real solutions
			for (const sol of subResult.solutions) {
				let approx = sol.approximate;
				if (approx === undefined) {
					try {
						approx = evaluateNodeToApproximatedNumber(sol.value);
					} catch {
						continue;
					}
				}
				if (!isFinite(approx)) continue;

				// For log equations, verify the solution doesn't make the argument negative
				if (kind === 'log') {
					try {
						// The argument of ln/log must be positive
						// We check by evaluating the argument at the solution
						// For now, just accept - domain checking is complex
					} catch {
						continue;
					}
				}

				allSolutions.push({ ...sol, approximate: approx });
			}
		}
	} finally {
		expLogRecursiveDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-real-solution',
			solutions: [],
			equationType: kind === 'exp' ? 'exponential' : 'logarithmic',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: kind === 'exp' ? 'exponential' : 'logarithmic',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Radical Decomposition (x^(p/q) = c)
// =============================================================================

/**
 * Result of extracting a radical equation structure from an expression.
 *
 * Represents `a·u^(p/q) + b = 0` → `u^(p/q) = -b/a = c`.
 */
interface RadicalEquationParts {
	/** The argument inside the radical (u in u^(p/q)) */
	readonly argument: MathNode;
	/** Numerator of the exponent (p in p/q) */
	readonly expNumerator: number;
	/** Denominator of the exponent (q in p/q) */
	readonly expDenominator: number;
	/** The constant RHS after isolation (c in u^(p/q) = c) */
	readonly constantNumeric: number;
	/** Symbolic constant node */
	readonly constantNode: MathNode;
}

/**
 * Try to extract a radical equation from expr = 0.
 *
 * Detects two patterns:
 * 1. FunctionNode: `a·sqrt(u) + b = 0` or `a·sqrt[n](u) + b = 0`
 *    (sqrt is a function with optional `base` for nth root)
 * 2. SuperscriptNode: `a·u^(p/q) + b = 0` where p/q is a non-integer fraction
 *
 * @returns RadicalEquationParts if pattern matches, null otherwise.
 */
function extractRadicalEquation(expr: MathNode, variable: string): RadicalEquationParts | null {
	const terms = flattenSumShallow(expr);

	for (let i = 0; i < terms.length; i++) {
		const { sign, term } = terms[i];

		// Try to match radical patterns
		const matched = tryRadicalPatterns(term, variable);
		if (!matched) continue;

		// Remaining terms must be free of the variable
		let hasVariableInRemaining = false;
		const remainingTerms: { readonly sign: '+' | '-'; readonly term: MathNode }[] = [];

		for (let j = 0; j < terms.length; j++) {
			if (j === i) continue;
			remainingTerms.push(terms[j]);
			if (getVariables(terms[j].term).has(variable)) {
				hasVariableInRemaining = true;
			}
		}

		if (hasVariableInRemaining) continue;

		// Compute coefficient a (from sign and coefficient factors)
		let aNumeric = matched.coeffNumeric;
		if (sign === '-') aNumeric = -aNumeric;

		// Compute b from remaining terms
		let bNumeric = 0;
		if (remainingTerms.length > 0) {
			const bNode = unflattenSum(remainingTerms);
			if (!bNode) continue;
			try {
				bNumeric = evaluateNodeToApproximatedNumber(bNode);
			} catch {
				continue;
			}
		}

		// c = -b/a
		const constantNumeric = -bNumeric / aNumeric;
		const constantNode =
			Math.abs(constantNumeric - Math.round(constantNumeric)) < 1e-12
				? numericNode(Math.round(constantNumeric))
				: numericNode(constantNumeric);

		return {
			argument: matched.argument,
			expNumerator: matched.expNumerator,
			expDenominator: matched.expDenominator,
			constantNumeric,
			constantNode
		};
	}

	return null;
}

/**
 * Pattern match result for radical terms.
 */
interface RadicalPatternMatch {
	readonly argument: MathNode;
	readonly expNumerator: number;
	readonly expDenominator: number;
	readonly coeffNumeric: number;
}

/**
 * Try to match a term against radical patterns.
 *
 * Pattern 1: sqrt(u) — FunctionNode with name 'sqrt', optional base for nth root
 * Pattern 2: cbrt(u) — FunctionNode with name 'cbrt'
 * Pattern 3: u^(p/q) — SuperscriptNode where exponent is a fraction with non-integer value
 *
 * For products like 2·sqrt(x), we extract the coefficient.
 */
function tryRadicalPatterns(term: MathNode, variable: string): RadicalPatternMatch | null {
	// Try to extract radical + coefficient from a product
	const factors = term.type === 'multiplication' ? flattenProductShallow(term) : null;

	if (factors && factors.length >= 2) {
		// Find the radical factor and collect coefficients
		for (let i = 0; i < factors.length; i++) {
			const radical = matchSingleRadical(factors[i].factor, variable);
			if (!radical) continue;

			// Remaining factors must be free of variable
			let coeffNumeric = 1;
			let allConstant = true;
			for (let j = 0; j < factors.length; j++) {
				if (j === i) continue;
				if (getVariables(factors[j].factor).has(variable)) {
					allConstant = false;
					break;
				}
				try {
					coeffNumeric *= evaluateNodeToApproximatedNumber(factors[j].factor);
				} catch {
					allConstant = false;
					break;
				}
			}

			if (allConstant) {
				return { ...radical, coeffNumeric };
			}
		}
		return null;
	}

	// Single term (no product)
	const radical = matchSingleRadical(term, variable);
	if (radical) return { ...radical, coeffNumeric: 1 };

	return null;
}

/**
 * Match a single node as a radical expression.
 */
function matchSingleRadical(
	node: MathNode,
	variable: string
): { argument: MathNode; expNumerator: number; expDenominator: number } | null {
	// Pattern 1: sqrt(u) or sqrt[n](u)
	if (node.type === 'function' && (node.name === 'sqrt' || node.name === 'cbrt')) {
		if (node.args.length !== 1) return null;
		const arg = node.args[0];
		if (!getVariables(arg).has(variable)) return null;

		if (node.name === 'cbrt') {
			return { argument: arg, expNumerator: 1, expDenominator: 3 };
		}

		// sqrt with optional nth root index (base property)
		let rootIndex = 2;
		if (node.base) {
			try {
				rootIndex = evaluateNodeToApproximatedNumber(node.base);
				if (!Number.isInteger(rootIndex) || rootIndex < 2) return null;
			} catch {
				return null;
			}
		}

		return { argument: arg, expNumerator: 1, expDenominator: rootIndex };
	}

	// Pattern 2: u^(p/q) where exponent is a fraction (DivisionNode)
	if (node.type === 'superscript') {
		const exp = node.superscript;
		if (exp.type !== 'division') return null;

		// Evaluate numerator and denominator of exponent
		let p: number, q: number;
		try {
			p = evaluateNodeToApproximatedNumber(exp.numerator);
			q = evaluateNodeToApproximatedNumber(exp.denominator);
		} catch {
			return null;
		}

		// Must be a fractional exponent with integer parts
		if (!Number.isInteger(p) || !Number.isInteger(q) || q <= 0 || p <= 0) return null;
		// If p/q is an integer, it's not a radical (it's a polynomial)
		if (p % q === 0) return null;

		const base = node.base;
		if (!getVariables(base).has(variable)) return null;

		return { argument: base, expNumerator: p, expDenominator: q };
	}

	return null;
}

/**
 * Recursion guard for radical decomposition.
 */
let radicalDecompositionDepth = 0;
const MAX_RADICAL_DECOMPOSITION_DEPTH = 3;

/**
 * Try to solve an equation by radical decomposition.
 *
 * For `u^(p/q) = c`:
 * - If q is even and c < 0: no real solution
 * - If q is odd and c < 0: u = -(|c|^(q/p)) (odd root of negative)
 * - Otherwise: u = c^(q/p), then solve u = value recursively
 *
 * @returns SolveResult if decomposition applies, null otherwise
 */
function tryRadicalDecomposition(
	expr: MathNode,
	variable: string,
	opts: Required<Omit<SolveOptions, 'variable' | 'initialGuesses' | 'domain'>> & {
		initialGuesses?: readonly number[];
		domain?: Domain;
	}
): SolveResult | null {
	if (radicalDecompositionDepth >= MAX_RADICAL_DECOMPOSITION_DEPTH) return null;

	const extracted = extractRadicalEquation(expr, variable);
	if (!extracted) return null;

	const {
		argument,
		expNumerator: p,
		expDenominator: q,
		constantNumeric: c,
		constantNode
	} = extracted;

	const recorder = createStepRecorder();

	// Check domain: even root requires non-negative RHS
	if (q % 2 === 0 && c < 0) {
		recorder.recordStep(
			'no-real-solution',
			`L'equation n'a pas de solution reelle car une racine d'indice pair ne peut etre negative`,
			expr,
			expr,
			'summarized'
		);
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'unknown',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	// Build symbolic u-value: u^(p/q) = c → u = c^(q/p)
	const inverseExp = q === 1 ? numericNode(p) : divide(numericNode(q), numericNode(p), 'fraction');
	const uSymbolic =
		p === 1 && q === 1
			? constantNode
			: denormalize(normalize(superscript(constantNode, inverseExp)));

	recorder.recordStep(
		'radical-decomposition',
		`On eleve les deux membres a la puissance ${q}/${p}`,
		expr,
		expr,
		'summarized'
	);

	// Now solve: argument = uSymbolic
	const allSolutions: Solution[] = [];

	radicalDecompositionDepth++;
	try {
		const subEquation = equals(argument, uSymbolic);
		const subResult = solve(subEquation, { variable, verbosity: opts.verbosity });

		if (subResult.status !== 'no-solution' && subResult.status !== 'no-real-solution') {
			for (const sol of subResult.solutions) {
				let approx = sol.approximate;
				if (approx === undefined) {
					try {
						approx = evaluateNodeToApproximatedNumber(sol.value);
					} catch {
						continue;
					}
				}
				if (!isFinite(approx)) continue;
				allSolutions.push({ ...sol, approximate: approx });
			}
		}
	} finally {
		radicalDecompositionDepth--;
	}

	if (allSolutions.length === 0) {
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'unknown',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity)
		};
	}

	const deduplicated = deduplicateSolutions(allSolutions);
	deduplicated.sort((a, b) => (a.approximate ?? 0) - (b.approximate ?? 0));

	return {
		variable,
		status: deduplicated.length === 1 ? 'unique' : 'multiple',
		solutions: deduplicated,
		equationType: 'unknown',
		strategy: 'algebraic',
		steps: recorder.getStepsFiltered(opts.verbosity)
	};
}

// =============================================================================
// Domain Filtering
// =============================================================================

/**
 * Filter solutions that fall outside the domain of definition.
 *
 * Evaluates each solution's symbolic value to a number and checks
 * domain membership. Falls back to `approximate` if symbolic evaluation
 * fails, and keeps the solution if neither is available.
 *
 * Records a step for each excluded solution.
 */
function filterSolutionsByDomain(
	result: SolveResult,
	domain: Domain,
	variable: string,
	recorder: import('./types').SolveStepRecorder
): SolveResult {
	if (isUniversal(domain)) return { ...result, domain };

	const kept: Solution[] = [];
	for (const sol of result.solutions) {
		if (!containsNode(domain, sol.value)) {
			const numericValue = sol.approximate ?? evaluateNodeToApproximatedNumber(sol.value);
			recorder.recordStep(
				'domain-exclusion',
				`${variable} = ${(numericValue ?? 0).toPrecision(6)} est exclu du domaine`,
				sol.value,
				sol.value,
				'summarized'
			);
		} else {
			kept.push(sol);
		}
	}

	const newStatus: import('./types').SolutionStatus =
		kept.length === 0 ? 'no-solution' : kept.length === 1 ? 'unique' : result.status;

	return { ...result, solutions: kept, status: newStatus, domain };
}

// =============================================================================
// Main Solve Function
// =============================================================================

/**
 * Solve an equation for a specified variable.
 *
 * This is the main entry point for equation solving.
 *
 * @param equation - The equation to solve (RelationNode with '=' relation)
 * @param options - Solving options
 * @returns SolveResult with solutions and metadata
 *
 * @example
 * ```typescript
 * // Solve 2x + 4 = 0
 * const eq = equals(add(multiply(number('2'), variable('x')), number('4')), number('0'));
 * const result = solve(eq);
 * // result.solutions = [{ value: opposite(number('2')), exact: true }]
 * ```
 *
 * @example
 * ```typescript
 * // Solve with detailed steps
 * const result = solve(eq, { verbosity: 'detailed' });
 * result.steps.forEach(step => console.log(step.description));
 * ```
 */
export function solve(equation: RelationNode, options?: SolveOptions): SolveResult {
	// Merge options with defaults
	const opts = {
		...DEFAULT_SOLVE_OPTIONS,
		...options
	};

	// Validate input: must be a relation with '='
	if (!isRelation(equation)) {
		throw new SolveError("L'entree doit etre une equation", 'unknown', 'Expected RelationNode');
	}

	if (equation.relation !== '=') {
		throw new SolveError(
			'Seules les egalites peuvent etre resolues',
			'unknown',
			`Relation recue: ${equation.relation}`
		);
	}

	// Promote bare `e` (parsed as variable) to `euler()` in superscript bases.
	// Without this, `detectVariable(e^x - 1 = 0)` would see `{e, x}` and return
	// null, falling into the constant-equation path even though x is the obvious
	// unknown. See `solve/promote-euler.ts` for the rationale.
	//
	// Un membre purement parenthésé est lu comme son contenu : `(2x-3) = 0`
	// est `2x-3 = 0`. Sinon `flattenSumShallow`, qui s'arrête aux délimiteurs,
	// voit un seul terme et chaque solveur se trompe à sa façon (linéaire :
	// x = 0 ; exponentiel, logarithmique, trigonométrique, quartique : aucune
	// solution). L'atelier envoie ces entrées : `f(x)` y devient `(expression)`.
	//
	// Le `e` SEUL (`e^x = e`) est lui aussi la constante dès qu'il ne peut pas
	// être l'inconnue — sinon « contradictoire », réponse fausse et assurée.
	const promotedEq = unwrapGroupingMembers(
		promoteStandaloneEulerInRelation(promoteEulerInRelation(equation), opts.variable)
	);

	// Convert to standard form: f(x) = 0
	const expr = toStandardForm(promotedEq);

	// Detect variable if not specified
	const variable = opts.variable ?? detectVariable(promotedEq);

	// Handle constant equations (no variable)
	if (!variable) {
		return handleConstantEquation(expr, opts);
	}

	// L'inconnue est imposée mais n'apparaît pas : `1 = 0` résolue en x. Sans
	// ce cas, l'équation tombait dans la classification (`unknown`) et
	// revenait en ERREUR « non supporte » — alors qu'elle n'a simplement pas
	// de solution. C'est le numérateur de 1/x = 0 (dérivée de ln x) : un
	// échec que `.variations` doit distinguer d'une vraie absence de zéro.
	// ⚠️ Seulement sans AUCUNE lettre : `a + 1 = 0` résolue en x dépend de a,
	// la déclarer contradictoire serait faux.
	if (getVariables(expr).size === 0) {
		return { ...handleConstantEquation(expr, opts), variable };
	}

	// Compute domain of definition, intersected with user-provided search domain
	const { domain: computedDomain } = computeDomain(expr, variable);
	const domain = options?.domain
		? intersectDomains(computedDomain, options.domain)
		: computedDomain;

	// Short-circuit if domain is empty
	if (isDomainEmpty(domain)) {
		const recorder = createStepRecorder();
		recorder.recordStep(
			'domain-computation',
			"L'expression n'est définie nulle part",
			expr,
			expr,
			'summarized'
		);
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'unknown',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity),
			domain,
			error: "L'expression n'est définie nulle part",
			conclusive: true
		};
	}

	// Record domain steps
	const domainRecorder = createStepRecorder();
	if (options?.domain) {
		domainRecorder.recordStep(
			'search-domain',
			`Recherche des solutions sur ${formatInterval(domain)}`,
			expr,
			expr,
			'summarized'
		);
	} else if (!isUniversal(domain)) {
		domainRecorder.recordStep(
			'domain-computation',
			`Ensemble de définition : ${formatInterval(domain)}`,
			expr,
			expr,
			'summarized'
		);
	}

	// --- Solve (all existing paths) ---

	let result: SolveResult | null = null;

	// Try product decomposition (zero-product property) before classification
	result = tryProductDecomposition(expr, variable, opts);

	// A power vanishes where its base does: (x²-2)² = 0 reduces to x²-2 = 0
	if (!result) {
		result = tryPowerDecomposition(expr, variable, opts);
	}

	// Try trig recursive decomposition for non-linear trig arguments
	if (!result) {
		result = tryTrigRecursiveDecomposition(expr, variable, opts);
	}

	// Try exp/log recursive decomposition for non-linear exp/log arguments
	// e^A = e^B → A = B, avant la décomposition (qui exige UN terme exponentiel)
	if (!result) {
		result = tryEqualExponentials(expr, variable, opts);
	}

	if (!result) {
		result = tryExpLogRecursiveDecomposition(expr, variable, opts);
	}

	// Try radical decomposition (√x, ∛x, x^(p/q))
	if (!result) {
		result = tryRadicalDecomposition(expr, variable, opts);
	}

	// Try rational decomposition (P(x)/Q(x) = 0). Runs after the polynomial-
	// shaped paths above (product, trig, exp/log, radical) so that
	// already-polynomial expressions take their proper specialized route ;
	// rational acts as the catch-all for anything `normalize` reduces to a
	// fraction with the variable in the denominator.
	//
	// A fresh depth-state box is created per top-level invocation — the box
	// is passed into `tryRationalDecomposition` (rather than using a module-
	// level counter) so that re-entrancy from sign/range modules and
	// parallel test workers cannot observe stale state.
	if (!result) {
		const rationalRecorder = createStepRecorder();
		result = tryRationalDecomposition(
			expr,
			variable,
			opts,
			rationalRecorder,
			solve,
			createRationalDepthState()
		);
	}

	// Try transcendental solver directly before classification.
	// This catches e^u (SuperscriptNode) which getTranscendentalType() doesn't detect
	// as 'exponential' (it only recognizes exp() FunctionNode).
	if (!result && extractTranscendentalEquation(expr, variable)) {
		const recorder = createStepRecorder();
		const transcResult = transcendentalSolver.solve(expr, variable, opts, recorder);
		if (transcResult.status !== 'no-solution' || !transcResult.error) {
			result = {
				...transcResult,
				steps: recorder.getStepsFiltered(opts.verbosity)
			};
		}
	}

	// Classification-based solver path
	if (!result) {
		const classification = classifyEquation(equation, variable);
		const strategy = selectStrategy(classification);
		const recorder = createStepRecorder();
		const solver = selectSolver(classification);

		if (!solver) {
			result = {
				variable,
				status: 'no-solution',
				solutions: [],
				equationType: classification.type,
				strategy,
				steps: recorder.getStepsFiltered(opts.verbosity),
				error: `Type d'equation non supporte: ${classification.type}`
			};
		} else {
			const solverResult = solver.solve(expr, variable, opts, recorder);
			result = {
				...solverResult,
				equationType: classification.type,
				strategy,
				steps: recorder.getStepsFiltered(opts.verbosity)
			};
		}
	}

	// Une somme dont les termes partagent un facteur non constant : on le met
	// en évidence, puis produit nul. En DERNIER recours seulement — voir
	// `tryCommonFactorDecomposition`.
	if (result.error !== undefined && !result.conclusive && result.solutions.length === 0) {
		const factored = tryCommonFactorDecomposition(expr, variable, opts);
		if (factored) result = factored;
	}

	// --- Apply domain filtering (single exit point) ---

	// Prepend domain steps to result steps
	const domainSteps = domainRecorder.getStepsFiltered(opts.verbosity);
	if (domainSteps.length > 0) {
		result = { ...result, steps: [...domainSteps, ...result.steps] };
	}

	result = filterSolutionsByDomain(result, domain, variable, domainRecorder);

	// Append any exclusion steps
	const exclusionSteps = domainRecorder
		.getStepsFiltered(opts.verbosity)
		.filter((s) => s.rule === 'domain-exclusion');
	if (exclusionSteps.length > 0) {
		result = { ...result, steps: [...result.steps, ...exclusionSteps] };
	}

	return result;
}

/**
 * Solve an equation from a MathNode (must be a RelationNode).
 * Convenience function that validates the input type.
 */
export function solveEquation(node: MathNode, options?: SolveOptions): SolveResult {
	if (!isRelation(node)) {
		throw new SolveError(
			"L'entree doit etre une equation (ex: 2x + 3 = 0)",
			'unknown',
			`Type recu: ${node.type}`
		);
	}

	return solve(node, options);
}
