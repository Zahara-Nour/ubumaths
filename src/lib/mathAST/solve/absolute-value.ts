/**
 * Équations avec valeur absolue (2nde, 1re) — écart V40
 *
 * `|x| = \pi`, `|x| = \ln 2`, et même `|x| = 3` revenaient « Type d'equation
 * non supporte: unknown » : aucun chemin de `solve` ne lisait `abs`. Le cours :
 *
 *   |u| = c ⇔ u = c ou u = −c   (c > 0)
 *   |u| = 0 ⇔ u = 0
 *   |u| = c n'a pas de solution  (c < 0)
 *   |u| = |v| ⇔ u = v ou u = −v
 *
 * La valeur absolue est d'abord ISOLÉE (`2|x| = 6`, `|x + 1| − 2 = 0`) : elle
 * est remplacée par une lettre neuve t, et `solve` résout l'équation obtenue
 * en t, qui doit être du premier degré et sans autre lettre. Le signe de c se
 * lit sur sa valeur (`constantSign`) : `\ln\frac12 < 0` donne ∅.
 *
 * Périmètre volontairement étroit (cas des élèves) : u et v AFFINES en
 * l'inconnue. Tout le reste — `|x² − 1| = 3`, `|x| = x + 1`, un paramètre
 * littéral, deux valeurs absolues hors de la forme |u| = |v| — rend la main
 * (`null`), donc reste un refus : jamais une valeur fausse.
 *
 * @module mathAST/solve/absolute-value
 */

import type { FunctionNode, MathNode, RelationNode } from '../types';
import type { Solution, SolveOptions, SolveResult } from './types';
import { isSolverFailure } from './types';
import { add, equals, number, opposite, subtract, variable as variableNode } from '../factory';
import { isFunction } from '../guards';
import { canonicalForm } from '../normal';
import { nodesEqual } from '../normal/hash';
import { getVariables, substitute } from '../eval/substitute';
import { findNodes, replaceNode } from '../transforms';
import { getPolynomialDegree } from '../analysis/expression-classify';
import { constantSign } from '../common/constant-sign';
import { computeNumericValue } from '../eval/numeric-value';
import { isZeroNode } from './solvers/polynomial';
import { createStepRecorder } from './step-recorder';
import { getRuleDescription } from './descriptions-fr';

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;

/** Lettres essayées pour remplacer une valeur absolue (la première absente de l'équation). */
const FRESH_NAMES = ['t', 'u', 'w', 's', 'T', 'U', 'W', 'S'] as const;
/**
 * Repli seulement, quand la comparaison exacte ne conclut pas : écart RELATIF
 * en deçà duquel deux solutions sont la même. Une tolérance absolue confondait
 * −c et c pour c petit (`|x| = 10^{-11}` ne rendait que −10⁻¹¹).
 */
const RELATIVE_DUPLICATE_TOLERANCE = 1e-12;

function isAbs(node: MathNode): node is FunctionNode {
	return isFunction(node) && node.name === 'abs' && node.args.length === 1;
}

/** u est affine en l'inconnue : degré 1 exactement (|x² − 1| = 3 est refusée). */
function isAffineIn(node: MathNode, variable: string): boolean {
	return getPolynomialDegree(node, variable) === 1;
}

/** Les arguments distincts des valeurs absolues qui contiennent l'inconnue. */
function absArguments(expr: MathNode, variable: string): MathNode[] | null {
	const arguments_: MathNode[] = [];
	for (const node of findNodes(expr, isAbs)) {
		const argument = node.args[0];
		if (!getVariables(argument).has(variable)) continue;
		// Une valeur absolue dans une autre (||x| − 1| = 2) : hors périmètre
		if (findNodes(argument, isAbs).length > 0) return null;
		if (!arguments_.some((known) => nodesEqual(known, argument))) arguments_.push(argument);
	}
	return arguments_;
}

function freshNames(expr: MathNode, count: number): string[] | null {
	const used = getVariables(expr);
	const names = FRESH_NAMES.filter((name) => !used.has(name)).slice(0, count);
	return names.length === count ? names : null;
}

/** `expr` où chaque |argument| est remplacé par la lettre de même rang. */
function withAbsReplaced(
	expr: MathNode,
	arguments_: readonly MathNode[],
	names: readonly string[]
): MathNode {
	return replaceNode(
		expr,
		(node) => isAbs(node) && arguments_.some((a) => nodesEqual(a, node.args[0])),
		(node) => {
			// Le prédicat n'a retenu que des valeurs absolues : ce test ne sert qu'au typage
			if (!isAbs(node)) return node;
			const index = arguments_.findIndex((a) => nodesEqual(a, node.args[0]));
			return variableNode(names[index]);
		}
	);
}

function approximateOf(solution: Solution): number | null {
	return solution.approximate ?? computeNumericValue(solution.value);
}

/**
 * Deux solutions identiques : d'abord sur la forme exacte (|2x| = |x| rend 0
 * deux fois), puis, si l'exact ne conclut pas, à un écart relatif près.
 */
function sameSolution(a: Solution, aValue: number, b: Solution, bValue: number): boolean {
	if (isZeroNode(subtract(a.value, b.value))) return true;
	const scale = Math.max(Math.abs(aValue), Math.abs(bValue));
	return scale === 0 || Math.abs(aValue - bValue) <= RELATIVE_DUPLICATE_TOLERANCE * scale;
}

/** Solutions réunies, sans doublon, dans l'ordre croissant. */
function merged(results: readonly SolveResult[]): Solution[] | null {
	const solutions: { readonly solution: Solution; readonly value: number }[] = [];
	for (const result of results) {
		for (const solution of result.solutions) {
			const value = approximateOf(solution);
			if (value === null) return null;
			if (solutions.some((s) => sameSolution(s.solution, s.value, solution, value))) continue;
			solutions.push({ solution: { ...solution, approximate: value }, value });
		}
	}
	return solutions.sort((a, b) => a.value - b.value).map((s) => s.solution);
}

/**
 * Résoudre chaque équation affine, puis réunir. `null` dès qu'une n'est pas
 * conclue : une branche non résolue n'est pas une branche sans solution.
 */
function solveBranches(
	expr: MathNode,
	branches: readonly RelationNode[],
	variable: string,
	opts: SolveOptions,
	solve: SolveFn,
	rule: 'absolute-value' | 'equal-absolute-values'
): SolveResult | null {
	const results: SolveResult[] = [];
	for (const branch of branches) {
		const result = solve(branch, { variable, verbosity: opts.verbosity });
		if (isSolverFailure(result) || result.periodicSolutions) return null;
		results.push(result);
	}

	const recorder = createStepRecorder();
	recorder.recordStep(rule, getRuleDescription(rule), expr, expr, 'summarized');
	const steps = [
		...recorder.getStepsFiltered(opts.verbosity ?? 'summarized'),
		...results.flatMap((r) => r.steps)
	];
	const base = { variable, equationType: 'mixed', strategy: 'algebraic', steps } as const;

	// |x − 1| = |1 − x| : une branche est une identité, tout réel convient
	if (results.some((r) => r.status === 'infinite')) {
		return { ...base, status: 'infinite', solutions: [] };
	}

	const solutions = merged(results);
	if (solutions === null) return null;
	return {
		...base,
		status: solutions.length === 0 ? 'no-solution' : solutions.length === 1 ? 'unique' : 'multiple',
		solutions
	};
}

/** k·|u| + r = 0, k et r constants, u affine : |u| = c, c constante, de signe connu. */
function analyzeSingle(
	expr: MathNode,
	argument: MathNode,
	variable: string,
	solve: SolveFn
): { readonly value: MathNode; readonly sign: -1 | 0 | 1 } | null {
	const names = freshNames(expr, 1);
	if (names === null) return null;
	const [t] = names;
	const isolated = withAbsReplaced(expr, [argument], names);
	// L'inconnue hors de la valeur absolue (|x| = x + 1) : hors périmètre
	if (getVariables(isolated).has(variable)) return null;
	if (getPolynomialDegree(isolated, t) !== 1) return null;

	const inT = solve(equals(isolated, number('0')), { variable: t });
	if (inT.status !== 'unique' || inT.solutions.length !== 1) return null;
	const value = inT.solutions[0].value;
	// Un paramètre littéral (|x| = a) : le signe de c n'est pas connu
	if (getVariables(value).size > 0) return null;

	const sign = constantSign(canonicalForm(value));
	return sign === null ? null : { value, sign };
}

/** k·|u| − k·|v| = 0, u et v affines : c'est exactement k(|u| − |v|) = 0, k ≠ 0. */
function isEqualAbs(expr: MathNode, [u, v]: readonly MathNode[]): boolean {
	const names = freshNames(expr, 2);
	if (names === null) return false;
	const [t1, t2] = names;
	const isolated = withAbsReplaced(expr, [u, v], names);
	const letters = getVariables(isolated);
	if ([...letters].some((name) => name !== t1 && name !== t2)) return false;
	if (getPolynomialDegree(isolated, t1) !== 1 || getPolynomialDegree(isolated, t2) !== 1) {
		return false;
	}
	// a·t₁ + b·t₂ (+ c·t₁t₂ + d) avec g(0, 0) = 0 et g(t, t) ≡ 0 : d = c = 0,
	// b = −a — c'est exactement a(|u| − |v|) = 0
	const atOrigin = substitute(isolated, { [t1]: 0, [t2]: 0 });
	const onDiagonal = substitute(isolated, { [t2]: variableNode(t1) });
	if (!isZeroNode(atOrigin) || !isZeroNode(onDiagonal)) return false;
	// a = 0 : g ≡ 0, l'équation ne dit rien de |u|, |v|
	return !isZeroNode(substitute(isolated, { [t1]: 1, [t2]: 0 }));
}

/**
 * La forme d'une équation `expr = 0` avec valeur absolue, une fois la valeur
 * absolue isolée — ou `null` hors du périmètre. Partagée par `solve` (le
 * résultat) et `pedagogical-solve/absolute-value` (la rédaction) : les deux
 * lisent la MÊME équation, jamais deux analyses qui pourraient diverger.
 *
 * - `single` : |argument| = value, `sign` le signe de value ;
 * - `equal` : |left| = |right|.
 */
export type AbsoluteValueShape =
	| {
			readonly kind: 'single';
			readonly argument: MathNode;
			readonly value: MathNode;
			readonly sign: -1 | 0 | 1;
	  }
	| { readonly kind: 'equal'; readonly left: MathNode; readonly right: MathNode };

export function analyzeAbsoluteValue(
	expr: MathNode,
	variable: string,
	solve: SolveFn
): AbsoluteValueShape | null {
	const arguments_ = absArguments(expr, variable);
	if (arguments_ === null || arguments_.length === 0 || arguments_.length > 2) return null;
	if (!arguments_.every((a) => isAffineIn(a, variable))) return null;

	if (arguments_.length === 1) {
		const single = analyzeSingle(expr, arguments_[0], variable, solve);
		return single === null ? null : { kind: 'single', argument: arguments_[0], ...single };
	}
	const [left, right] = arguments_;
	return isEqualAbs(expr, arguments_) ? { kind: 'equal', left, right } : null;
}

/**
 * Résoudre `expr = 0` quand l'inconnue n'y paraît que sous une ou deux valeurs
 * absolues d'expressions affines. `null` hors de ce périmètre.
 */
export function tryAbsoluteValue(
	expr: MathNode,
	variable: string,
	opts: SolveOptions,
	solve: SolveFn
): SolveResult | null {
	const shape = analyzeAbsoluteValue(expr, variable, solve);
	if (shape === null) return null;

	if (shape.kind === 'equal') {
		const { left: u, right: v } = shape;
		const branches = [equals(subtract(u, v), number('0')), equals(add(u, v), number('0'))];
		return solveBranches(expr, branches, variable, opts, solve, 'equal-absolute-values');
	}

	const { argument, value: c, sign } = shape;
	if (sign < 0) {
		const recorder = createStepRecorder();
		recorder.recordStep(
			'absolute-value-negative',
			getRuleDescription('absolute-value-negative'),
			expr,
			expr,
			'summarized'
		);
		return {
			variable,
			status: 'no-solution',
			solutions: [],
			equationType: 'mixed',
			strategy: 'algebraic',
			steps: recorder.getStepsFiltered(opts.verbosity ?? 'summarized')
		};
	}

	const branches =
		sign === 0
			? [equals(argument, number('0'))]
			: [equals(argument, opposite(c)), equals(argument, c)];
	return solveBranches(expr, branches, variable, opts, solve, 'absolute-value');
}
