/**
 * Pedagogical Solve — Linear inequalities (palier 2a)
 *
 * Generates pedagogical step-by-step explanations for solving a linear
 * inequality `ax + b ⊻ cx + d` where `⊻ ∈ { <, >, <=, >=, != }`. The narrative
 * mirrors `linear.ts` (regroup x-terms / constants, divide by the coefficient
 * of x), with one critical addition: when the divisor is a numerically
 * negative scalar, the operator is flipped (`<` ↔ `>`, `<=` ↔ `>=`). For `!=`
 * no flip is ever applied.
 *
 * Per-level granularity is controlled by the same `STRATEGIES` table used by
 * the linear-equation pipeline (see `./types`):
 *
 * - `college` produces a flat list of micro-steps.
 * - `lycee` groups regroupement into a single top-level step with `subSteps`.
 * - `superieur` further groups everything under `reduce-to-canonical`.
 * - `primaire` is excluded at the type level (algebra is out of curriculum).
 *
 * Degenerate cases (`a = 0` after regroupement) yield a final
 * `inequality-conclude-truth` step whose `truth` flag tells the renderer
 * whether the resulting constant inequality is always true (S = ℝ) or always
 * false (contradiction, S = ∅).
 *
 * @module mathAST/pedagogical-solve/linear-inequality
 */

import type { MathNode, RelationNode } from '../types';
import {
	type EquationStep,
	type LinearInequalityStepsOptions,
	type GenerationStrategy,
	STRATEGIES
} from './types';
import { add, divide, opposite, variable as varNode } from '../factory';
import { flattenSumShallow, unflattenSum } from '../flatten';
import type { SignedTerm } from '../flatten';
import { containsVariable } from '../common/contains-variable';
import { getNumericValue } from '../common/numeric';
import { detectVariable, getPolynomialDegree } from '../solve/classify';
import { getVariables } from '../eval/substitute';
import {
	canon,
	addToBothSides,
	divideBothSidesWithFlip,
	isOne,
	isZero,
	makeStep,
	renumberSteps
} from './_helpers';
import { toLatex } from '../latex-generator';
import { InequalityNotSolvable } from '../solve/inequality/types';

// =============================================================================
// Errors
// =============================================================================

/**
 * Thrown when the polynomial degree of the standard form `f(x) − g(x)` is
 * outside V1 scope (≥ 2, or non-polynomial). Quadratic inequalities will be
 * handled by palier 2b. `degree === null` indicates a non-polynomial input.
 *
 * Mirrors the constructor signature of `UnsupportedEquationDegree` in
 * `pedagogical-solve/index.ts`.
 */
export class UnsupportedInequalityDegree extends Error {
	constructor(public readonly degree: number | null) {
		super(
			degree === null
				? 'generateInequalitySteps: inequality is not a polynomial in the unknown.'
				: `generateInequalitySteps: polynomial degree ${degree} is unsupported (V1 covers degrees 0 and 1; quadratic awaits palier 2b).`
		);
		this.name = 'UnsupportedInequalityDegree';
	}
}

/**
 * Thrown when the input is not actually an inequality (e.g. relation === '=').
 */
export class PedagogicalInequalityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'PedagogicalInequalityError';
	}
}

// `InequalityNotSolvable` is re-exported by the barrel `pedagogical-solve/index.ts`
// (kept off this file to avoid a duplicate exposure path).

// =============================================================================
// Local helpers (mirroring linear.ts)
// =============================================================================

/**
 * Split a side of an inequality into (x-terms-sum, constant-terms-sum).
 * Either part may be `null` when no such terms exist on that side.
 */
function splitSide(
	side: MathNode,
	variable: string
): { xPart: MathNode | null; constPart: MathNode | null } {
	const flat = flattenSumShallow(side);
	const xTerms: SignedTerm[] = [];
	const constTerms: SignedTerm[] = [];
	for (const item of flat) {
		if (containsVariable(item.term, variable)) xTerms.push(item);
		else constTerms.push(item);
	}
	return {
		xPart: xTerms.length === 0 ? null : unflattenSum(xTerms),
		constPart: constTerms.length === 0 ? null : unflattenSum(constTerms)
	};
}

function extractCoefficientOfX(node: MathNode, variable: string): MathNode | null {
	if (!containsVariable(node, variable)) return null;
	return canon(divide(node, varNode(variable), 'fraction'));
}

function chooseAddOrSubtract(operand: MathNode): {
	kind: 'add-both-sides' | 'subtract-both-sides';
	displayOperand: MathNode;
} {
	if (operand.type === 'opposite') {
		return { kind: 'subtract-both-sides', displayOperand: operand.operand };
	}
	const numeric = getNumericValue(operand);
	if (numeric !== null && numeric < 0) {
		return { kind: 'subtract-both-sides', displayOperand: canon(opposite(operand)) };
	}
	return { kind: 'add-both-sides', displayOperand: operand };
}

function operandPretty(node: MathNode): string {
	return toLatex(node).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2');
}

const INEQUALITY_OPS = new Set(['<', '>', '<=', '>=', '!=']);

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Generate pedagogical steps for solving a linear inequality.
 *
 * @throws PedagogicalInequalityError when `relation === '='`.
 * @throws UnsupportedInequalityDegree when the polynomial degree is ≥ 2.
 * @throws InequalityNotSolvable when free parametric coefficients are present.
 */
export function generateLinearInequalitySteps(
	inequality: RelationNode,
	options: LinearInequalityStepsOptions
): readonly EquationStep[] {
	const { level, includeSubSteps = true, variable: varOpt } = options;
	const strategy: GenerationStrategy = STRATEGIES[level];

	// 1. Validate the relation operator.
	if (inequality.relation === '=') {
		throw new PedagogicalInequalityError(
			"L'égalité n'est pas une inéquation — utiliser generateLinearEquationSteps()"
		);
	}
	if (!INEQUALITY_OPS.has(inequality.relation)) {
		throw new PedagogicalInequalityError(
			`Opérateur de relation non supporté: '${inequality.relation}'`
		);
	}

	// 2. Detect (or accept) the variable. `null` is valid here: it means the
	//    inequality is fully constant (e.g. `0 < 1`) and degenerates immediately
	//    into a conclude-truth step.
	const variable = varOpt ?? detectVariable(inequality);

	// 3. Sanity check on degree (degree 0 or 1 only). For constant inequalities
	//    (no variable detected), the standard form is also a constant — degree
	//    is 0 or null depending on `getPolynomialDegree`'s behaviour. We only
	//    block degree ≥ 2.
	const standardForm = canon(add(inequality.left, opposite(inequality.right)));
	if (variable !== null) {
		const degree = getPolynomialDegree(standardForm, variable);
		if (degree !== null && degree >= 2) {
			throw new UnsupportedInequalityDegree(degree);
		}

		// 4. Reject parametric coefficients (free variables ≠ unknown).
		const free = [...getVariables(inequality.left), ...getVariables(inequality.right)].filter(
			(v) => v !== variable
		);
		if (free.length > 0) {
			throw new InequalityNotSolvable(
				`Coefficients paramétriques détectés: ${[...new Set(free)].join(', ')}`,
				'Hors scope V1 — fournir des coefficients numériques.'
			);
		}
	}

	let nextId = 1;
	const id = () => nextId++;

	// 5. Initial identify-equation step.
	const identifyStep: EquationStep | null = strategy.includeIdentify
		? makeStep({
				id: id(),
				rule: 'identify-equation',
				description: 'Inéquation du premier degré',
				before: inequality,
				after: inequality,
				operation: { kind: 'identify-equation', equationType: 'linear' }
			})
		: null;

	// 6. Fully-constant case: skip directly to conclude-truth.
	if (variable === null) {
		const concludeStep = buildConcludeStep(inequality, id());
		const result: EquationStep[] = [];
		if (identifyStep) result.push(identifyStep);
		result.push(concludeStep);
		return renumberSteps(result);
	}

	// 7. Regroupement (mirrors linear.ts).
	let current: RelationNode = inequality;
	const regroupementSteps: EquationStep[] = [];
	const rightSplit = splitSide(current.right, variable);
	const leftSplit = splitSide(current.left, variable);
	const xMoveRaw = rightSplit.xPart !== null ? canon(opposite(rightSplit.xPart)) : null;
	const constMoveRaw =
		leftSplit.constPart !== null && !isZero(leftSplit.constPart)
			? canon(opposite(leftSplit.constPart))
			: null;

	if (strategy.regroupementMode === 'combined') {
		if (xMoveRaw !== null || constMoveRaw !== null) {
			let after = current;
			if (xMoveRaw !== null) after = addToBothSides(after, xMoveRaw);
			if (constMoveRaw !== null) after = addToBothSides(after, constMoveRaw);
			regroupementSteps.push(
				makeStep({
					id: id(),
					rule: 'transpose-terms',
					description: `On isole les termes en ${variable} dans le membre de gauche`,
					before: current,
					after,
					operation: {
						kind: 'transpose-terms',
						variableOperand: xMoveRaw,
						constantOperand: constMoveRaw
					}
				})
			);
			current = after;
		}
	} else {
		if (xMoveRaw !== null) {
			const choice = chooseAddOrSubtract(xMoveRaw);
			const after = addToBothSides(current, xMoveRaw);
			regroupementSteps.push(
				makeStep({
					id: id(),
					rule: choice.kind,
					description:
						choice.kind === 'add-both-sides'
							? `On ajoute ${operandPretty(choice.displayOperand)} aux deux membres`
							: `On soustrait ${operandPretty(choice.displayOperand)} aux deux membres`,
					before: current,
					after,
					operation: { kind: choice.kind, operand: choice.displayOperand }
				})
			);
			current = after;
		}
		if (constMoveRaw !== null) {
			const choice = chooseAddOrSubtract(constMoveRaw);
			const after = addToBothSides(current, constMoveRaw);
			regroupementSteps.push(
				makeStep({
					id: id(),
					rule: choice.kind,
					description:
						choice.kind === 'add-both-sides'
							? `On ajoute ${operandPretty(choice.displayOperand)} aux deux membres`
							: `On soustrait ${operandPretty(choice.displayOperand)} aux deux membres`,
					before: current,
					after,
					operation: { kind: choice.kind, operand: choice.displayOperand }
				})
			);
			current = after;
		}
	}

	// 8. Division by the coefficient of x (with flip when negative).
	let divisionStep: EquationStep | null = null;
	let degenerateConcludeStep: EquationStep | null = null;
	const coefficient = extractCoefficientOfX(current.left, variable);
	if (coefficient === null || isZero(coefficient)) {
		// Degenerate: after regroupement the LHS no longer contains the variable.
		// `current` is now a constant ⊻ constant inequality (e.g. `0 < 4`).
		degenerateConcludeStep = buildConcludeStep(current, id());
	} else if (!isOne(coefficient)) {
		const { result: after, flipped } = divideBothSidesWithFlip(current, coefficient);
		if (strategy.divisionMode === 'compact') {
			divisionStep = makeStep({
				id: id(),
				rule: 'simplify-coefficient',
				description: flipped
					? `On simplifie le coefficient de ${variable} (changement de sens car le coefficient est négatif)`
					: `On termine en simplifiant le coefficient de ${variable}`,
				before: current,
				after,
				operation: {
					kind: 'simplify-coefficient',
					coefficient,
					...(flipped && { flipOperator: true })
				}
			});
		} else {
			divisionStep = makeStep({
				id: id(),
				rule: 'divide-both-sides',
				description: flipped
					? `On divise les deux membres par ${operandPretty(coefficient)} (changement de sens car ${operandPretty(coefficient)} est négatif)`
					: `On divise les deux membres par ${operandPretty(coefficient)}`,
				before: current,
				after,
				operation: {
					kind: 'divide-both-sides',
					operand: coefficient,
					...(flipped && { flipOperator: true })
				}
			});
		}
		current = after;
	}
	// else (coefficient === 1) — nothing to divide, no step emitted

	// 9. Assemble.
	const result: EquationStep[] = [];
	if (identifyStep) result.push(identifyStep);

	if (strategy.mergeAll) {
		const allMicro: EquationStep[] = [...regroupementSteps];
		if (divisionStep) allMicro.push(divisionStep);
		if (degenerateConcludeStep) allMicro.push(degenerateConcludeStep);
		if (allMicro.length > 0) {
			const before = allMicro[0].before;
			const after = allMicro[allMicro.length - 1].after;
			result.push(
				makeStep({
					id: id(),
					rule: 'reduce-to-canonical',
					description: `On isole ${variable}`,
					before,
					after,
					operation: { kind: 'reduce-to-canonical' },
					subSteps: includeSubSteps ? allMicro : undefined
				})
			);
		}
		return renumberSteps(result);
	}

	result.push(...regroupementSteps);
	if (divisionStep) result.push(divisionStep);
	if (degenerateConcludeStep) result.push(degenerateConcludeStep);

	return renumberSteps(result);
}

// =============================================================================
// Conclude-truth helper (degenerate constant inequality)
// =============================================================================

/**
 * Build the final conclude step for a constant inequality (e.g. `0 < 4` →
 * truth=true, `7 < 3` → truth=false). Evaluates both sides numerically and
 * compares.
 *
 * @internal
 */
function buildConcludeStep(constantIneq: RelationNode, id: number): EquationStep {
	const truth = evaluateConstantInequality(constantIneq);
	return makeStep({
		id,
		rule: 'inequality-conclude-truth',
		description: truth
			? `L'inéquation ${toLatex(constantIneq)} est toujours vraie : la solution est ℝ`
			: `L'inéquation ${toLatex(constantIneq)} est une contradiction : aucune solution`,
		before: constantIneq,
		after: constantIneq,
		operation: { kind: 'inequality-conclude-truth', truth },
		verbosityLevel: 'summarized'
	});
}

/**
 * Evaluate a constant inequality (both sides numeric) into a boolean truth
 * value. Defensively returns `false` (contradiction-like) when one side is
 * non-numeric — that should not happen in practice because the caller only
 * invokes this on inequalities that have already been reduced.
 */
function evaluateConstantInequality(rel: RelationNode): boolean {
	const lhs = getNumericValue(rel.left);
	const rhs = getNumericValue(rel.right);
	if (lhs === null || rhs === null) return false;
	switch (rel.relation) {
		case '<':
			return lhs < rhs;
		case '>':
			return lhs > rhs;
		case '<=':
			return lhs <= rhs;
		case '>=':
			return lhs >= rhs;
		case '!=':
			return lhs !== rhs;
		default:
			return false;
	}
}
