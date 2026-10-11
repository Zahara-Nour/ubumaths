/**
 * `a·sin(u) + b·cos(u) = 0` se ramène à `tan(u) = −b/a`
 *
 * Classique de 1re / Tle : `sin x = cos x` (x = π/4 + kπ), `sin x = −cos x`.
 * Revenait « Je ne sais pas encore résoudre cette équation. » (revue,
 * 2026-10-09).
 *
 * La division par cos(u) est une équivalence : là où cos(u) = 0, |sin(u)| = 1
 * et a·sin(u) ≠ 0 (a ≠ 0) — aucune solution n'est perdue.
 *
 * Rien n'est résolu ici : `tan(u) = −b/a` passe par `solve` (famille
 * périodique comprise).
 *
 * @module mathAST/solve/sin-cos-ratio
 */

import type { MathNode, RelationNode } from '../types';
import type { SolveOptions, SolveResult } from './types';
import { isSolverFailure } from './types';
import { divide, equals, func, number, opposite } from '../factory';
import { denormalize, normalize } from '../normal';
import { getVariables } from '../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../eval/evaluate';
import { flattenSumShallow, type SignedTerm } from '../flatten';
import { nodesEqual } from '../normal/hash';
import { P } from '../pattern/builder';
import { tryMatch } from '../pattern/match';
import { getBindingNode, isProductSequenceBinding } from '../pattern/types';
import { createStepRecorder } from './step-recorder';

type SolveFn = (equation: RelationNode, options?: SolveOptions) => SolveResult;

/** Un terme `k·f(u)` lu : son coefficient signé et son argument. */
export interface TrigTerm {
	readonly coefficient: MathNode;
	readonly argument: MathNode;
}

/**
 * `k·sin(u)` (resp. cos, tan), k sans l'inconnue, ou `null`. `requireVariable` :
 * l'argument doit contenir l'inconnue (sinon `cos(π/3)` est lu aussi).
 */
export function readTrigTerm(
	term: SignedTerm,
	name: 'sin' | 'cos' | 'tan',
	variable: string,
	requireVariable = true
): TrigTerm | null {
	const pattern = P.prod(P.func(name, [P._('u')]), P.___('coeff', P.isFreeOf(variable)));
	const bindings = tryMatch(pattern, term.term);
	if (!bindings) return null;
	const argument = getBindingNode(bindings, 'u');
	if (!argument || (requireVariable && !getVariables(argument).has(variable))) return null;
	const coeffBinding = bindings.get('coeff');
	const factors =
		coeffBinding && isProductSequenceBinding(coeffBinding) ? coeffBinding.factors : [];
	const product = factors.reduce<MathNode | null>(
		(acc, factor) =>
			acc === null
				? factor
				: { type: 'multiplication', left: acc, right: factor, displayStyle: 'implicit' },
		null
	);
	const k = product ?? number('1');
	return { coefficient: term.sign === '-' ? opposite(k) : k, argument };
}

function nonZero(node: MathNode): boolean {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) && Math.abs(value) > 1e-12;
	} catch {
		return false;
	}
}

/**
 * Résoudre `expr = 0` quand c'est `a·sin(u) + b·cos(u)` (deux termes, même
 * argument, a et b constants non nuls). `null` sinon, ou si `tan(u) = −b/a`
 * n'est pas résolue : l'appelant garde son échec.
 */
export function trySinCosRatio(
	expr: MathNode,
	variable: string,
	options: Pick<SolveOptions, 'verbosity'>,
	solveFn: SolveFn
): SolveResult | null {
	const terms = flattenSumShallow(expr);
	if (terms.length !== 2) return null;
	const [first, second] = terms;
	const sine = readTrigTerm(first, 'sin', variable) ?? readTrigTerm(second, 'sin', variable);
	const cosine = readTrigTerm(first, 'cos', variable) ?? readTrigTerm(second, 'cos', variable);
	if (sine === null || cosine === null) return null;
	if (!nodesEqual(sine.argument, cosine.argument)) return null;
	if (!nonZero(sine.coefficient) || !nonZero(cosine.coefficient)) return null;

	// tan(u) = −b/a
	const ratio = denormalize(
		normalize(divide(opposite(cosine.coefficient), sine.coefficient, 'fraction'))
	);
	const reduced = equals(func('tan', [sine.argument]), ratio);
	const result = solveFn(reduced, { variable, verbosity: options.verbosity });
	if (isSolverFailure(result)) return null;

	const recorder = createStepRecorder();
	recorder.recordStep(
		'divide-by-cosine',
		'On divise par cos, qui ne s’annule pas sur les solutions : on obtient une tangente',
		expr,
		reduced,
		'summarized'
	);
	return {
		...result,
		steps: [...recorder.getStepsFiltered(options.verbosity ?? 'summarized'), ...result.steps]
	};
}
