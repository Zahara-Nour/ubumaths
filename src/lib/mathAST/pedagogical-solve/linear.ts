/**
 * Pedagogical Solve — Linear equations
 *
 * Generates pedagogical step-by-step explanations for solving a linear
 * equation `ax + b = cx + d`. The narrative follows what a student does on
 * paper:
 *
 *   1. (optional) Identify the equation as linear.
 *   2. Move x-terms to the left: add `−(x-terms on right)` to both sides.
 *   3. Move constants to the right: add `−(constants on left)` to both sides.
 *   4. Divide both sides by the coefficient of x.
 *   5. Read the solution `x = …`.
 *
 * Per-level granularity is controlled by `STRATEGIES` (see `./types`):
 * - `college` produces a flat list of micro-steps.
 * - `lycee` groups regroupement into a single top-level step with `subSteps`.
 * - `superieur` further groups everything under `reduce-to-canonical`.
 * - `primaire` falls back to college (algebra is out of curriculum).
 *
 * @module mathAST/pedagogical-solve/linear
 */

import type { MathNode, RelationNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import {
	type EquationStep,
	type EquationOperation,
	type LinearEquationStepsOptions,
	type GenerationStrategy,
	STRATEGIES
} from './types';
import { add, divide, opposite, relation, variable as varNode } from '../factory';
import { flattenSumShallow, unflattenSum } from '../flatten';
import { containsVariable } from '../common/contains-variable';
import { getNumericValue } from '../common/numeric';
import { denormalize, normalize } from '../normal';
import { detectVariable, getPolynomialDegree } from '../solve/classify';

// =============================================================================
// Helpers
// =============================================================================

/** Canonicalize a MathNode (run normalize ∘ denormalize). */
function canon(node: MathNode): MathNode {
	return denormalize(normalize(node));
}

/** Canonicalize a RelationNode by canonicalizing both sides. */
function canonEquation(eq: RelationNode): RelationNode {
	return relation(eq.relation, canon(eq.left), canon(eq.right));
}

/**
 * Split a side of an equation into (x-terms-sum, constant-terms-sum).
 * Either part may be `null` when no such terms exist on that side.
 *
 * Exported so the renderer (`linear-renderer`) can compute the "remainders"
 * displayed in the `transpose-terms` LaTeX form (LEFT remainder = x-part of
 * LEFT, RIGHT remainder = constant-part of RIGHT).
 */
export function splitSide(
	side: MathNode,
	variable: string
): { xPart: MathNode | null; constPart: MathNode | null } {
	const flat = flattenSumShallow(side);
	const xTerms: typeof flat = [];
	const constTerms: typeof flat = [];
	for (const item of flat) {
		if (containsVariable(item.term, variable)) xTerms.push(item);
		else constTerms.push(item);
	}
	return {
		xPart: xTerms.length === 0 ? null : unflattenSum(xTerms),
		constPart: constTerms.length === 0 ? null : unflattenSum(constTerms)
	};
}

/** Add `operand` to both sides and canonicalize the result. */
function addToBothSides(eq: RelationNode, operand: MathNode): RelationNode {
	return canonEquation(relation(eq.relation, add(eq.left, operand), add(eq.right, operand)));
}

/** Divide both sides by `divisor` and canonicalize. */
function divideBothSides(eq: RelationNode, divisor: MathNode): RelationNode {
	return canonEquation(
		relation(
			eq.relation,
			divide(eq.left, divisor, 'fraction'),
			divide(eq.right, divisor, 'fraction')
		)
	);
}

/**
 * Extract the coefficient of x from a node of the form `ax` (after
 * regroupement). Returns null if the node does not contain the variable.
 */
function extractCoefficientOfX(node: MathNode, variable: string): MathNode | null {
	if (!containsVariable(node, variable)) return null;
	return canon(divide(node, varNode(variable), 'fraction'));
}

/** True when a MathNode is a number literal equal to 1. */
function isOne(node: MathNode): boolean {
	return node.type === 'number' && node.value === '1';
}

/** True when a MathNode is a number literal equal to 0. */
function isZero(node: MathNode): boolean {
	return node.type === 'number' && node.value === '0';
}

/**
 * Resolve a "move-to-other-side" operation to either `add-both-sides` or
 * `subtract-both-sides` so the operand is always non-negative for display.
 *
 * Detects negativity in 3 forms :
 * - `opposite(X)` AST wrapper → kind = subtract, displayOperand = X
 * - Numeric value (number literal, simple fraction…) < 0 via `getNumericValue`
 *   → kind = subtract, displayOperand = canon(opposite(operand))
 * - Otherwise → kind = add, displayOperand = operand
 */
function chooseAddOrSubtract(operand: MathNode): {
	kind: 'add-both-sides' | 'subtract-both-sides';
	displayOperand: MathNode;
} {
	if (operand.type === 'opposite') {
		return {
			kind: 'subtract-both-sides',
			displayOperand: operand.operand
		};
	}
	const numeric = getNumericValue(operand);
	if (numeric !== null && numeric < 0) {
		return {
			kind: 'subtract-both-sides',
			displayOperand: canon(opposite(operand))
		};
	}
	return { kind: 'add-both-sides', displayOperand: operand };
}

/**
 * Renumber a step tree so top-level steps get IDs 1, 2, 3, … and each parent's
 * substeps restart at 1. Applied as a final pass after assembly because the
 * generation order does not match the desired top-level order (substeps are
 * created before their wrapping group step).
 */
function renumberSteps(steps: readonly EquationStep[]): readonly EquationStep[] {
	return steps.map((step, i) => renumberStep(step, i + 1));
}

function renumberStep(step: EquationStep, id: number): EquationStep {
	const renumberedSubs = step.subSteps?.map((sub, j) => renumberStep(sub, j + 1));
	return {
		...step,
		id,
		...(renumberedSubs !== undefined && { subSteps: renumberedSubs })
	};
}

// =============================================================================
// Step builders
// =============================================================================

function makeStep(args: {
	id: number;
	rule: string;
	description: string;
	before: RelationNode;
	after: RelationNode;
	operation?: EquationOperation;
	verbosityLevel?: Verbosity;
	subSteps?: readonly EquationStep[];
}): EquationStep {
	return {
		id: args.id,
		rule: args.rule,
		description: args.description,
		before: args.before,
		after: args.after,
		verbosityLevel: args.verbosityLevel ?? 'detailed',
		...(args.operation !== undefined && { operation: args.operation }),
		...(args.subSteps !== undefined && args.subSteps.length > 0 && { subSteps: args.subSteps })
	};
}

// =============================================================================
// Main entry point
// =============================================================================

/**
 * Generate pedagogical steps for solving a linear equation.
 *
 * @throws if the equation is not first-degree in the chosen variable.
 */
export function generateLinearEquationSteps(
	equation: RelationNode,
	options: LinearEquationStepsOptions
): readonly EquationStep[] {
	const { level, includeSubSteps = true, variable: varOpt } = options;
	const strategy: GenerationStrategy = STRATEGIES[level];

	const variable = varOpt ?? detectVariable(equation);
	if (variable === null) {
		throw new Error('generateLinearEquationSteps: cannot detect a single variable');
	}

	// Sanity check: must be linear in the chosen variable
	const exprForDegree = canon(
		relation('=', equation.left, equation.right).left
	); /* placeholder — see below */
	// Use the standard form to compute degree (matches solver's classify.ts)
	const standardForm = canon(
		add(equation.left, opposite(equation.right))
	); /* f(x) − g(x) for degree probe */
	const degree = getPolynomialDegree(standardForm, variable);
	if (degree !== 1 && degree !== 0) {
		// degree 0 happens for `x = 5` after standardize (x − 5), still linear-equivalent
		throw new Error(
			`generateLinearEquationSteps: equation is not linear in '${variable}' (degree=${degree})`
		);
	}
	void exprForDegree; // silence unused

	let nextId = 1;
	const id = () => nextId++;

	// Build per-phase step lists; assemble at the end based on strategy.
	const identifyStep: EquationStep | null = strategy.includeIdentify
		? makeStep({
				id: id(),
				rule: 'identify-equation',
				description: 'Équation du premier degré',
				before: equation,
				after: equation,
				operation: { kind: 'identify-equation', equationType: 'linear' }
			})
		: null;

	let current: RelationNode = equation;
	const regroupementSteps: EquationStep[] = [];

	// Compute the two regroupement operands once (shared by atomic + combined modes)
	const rightSplit = splitSide(current.right, variable);
	const leftSplit = splitSide(current.left, variable);
	const xMoveRaw = rightSplit.xPart !== null ? canon(opposite(rightSplit.xPart)) : null;
	const constMoveRaw =
		leftSplit.constPart !== null && !isZero(leftSplit.constPart)
			? canon(opposite(leftSplit.constPart))
			: null;

	if (strategy.regroupementMode === 'combined') {
		// Combined: ONE transpose-terms step showing both moves simultaneously
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
		// Atomic: one add-both-sides per move (college style)
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

	// Step 3 — Division (skip when coefficient is 1)
	let divisionStep: EquationStep | null = null;
	const coefficient = extractCoefficientOfX(current.left, variable);
	if (coefficient !== null && !isOne(coefficient)) {
		const after = divideBothSides(current, coefficient);
		if (strategy.divisionMode === 'compact') {
			divisionStep = makeStep({
				id: id(),
				rule: 'simplify-coefficient',
				description: `On termine en simplifiant le coefficient de ${variable}`,
				before: current,
				after,
				operation: { kind: 'simplify-coefficient', coefficient }
			});
		} else {
			divisionStep = makeStep({
				id: id(),
				rule: 'divide-both-sides',
				description: `On divise les deux membres par ${operandPretty(coefficient)}`,
				before: current,
				after,
				operation: { kind: 'divide-both-sides', operand: coefficient }
			});
		}
		current = after;
	}

	// Step 4 — Read solution
	const solutionValue = readSolutionValue(current, variable);
	const solutionStep: EquationStep | null =
		solutionValue !== null
			? makeStep({
					id: id(),
					rule: 'read-solution',
					description: `Solution : ${variable} = ${operandPretty(solutionValue)}`,
					before: current,
					after: current,
					operation: { kind: 'read-solution', variable, value: solutionValue },
					verbosityLevel: 'summarized'
				})
			: null;

	// -----------------------------------------------------------------------
	// Assemble top-level steps based on strategy
	// -----------------------------------------------------------------------
	const result: EquationStep[] = [];

	if (identifyStep) result.push(identifyStep);

	// `mergeAll`: collapse regroupement + division + solution into ONE step
	// with everything as substeps. Used for the legacy supérieur layout.
	if (strategy.mergeAll) {
		const allMicro: EquationStep[] = [...regroupementSteps];
		if (divisionStep) allMicro.push(divisionStep);
		if (solutionStep) allMicro.push(solutionStep);
		if (allMicro.length > 0) {
			const before = allMicro[0].before;
			const after = solutionStep ? solutionStep.before : allMicro[allMicro.length - 1].after;
			result.push(
				makeStep({
					id: id(),
					rule: 'reduce-to-canonical',
					description: solutionStep
						? `On isole ${variable} → ${solutionStep.description.replace(/^Solution : /, '')}`
						: `On isole ${variable}`,
					before,
					after,
					operation: { kind: 'reduce-to-canonical' },
					subSteps: includeSubSteps ? allMicro : undefined
				})
			);
		} else if (solutionStep) {
			result.push(solutionStep);
		}
		return renumberSteps(result);
	}

	// Flat assembly (college, lycée): each step is its own top-level entry.
	// At lycée the combined transpose-terms + simplify-coefficient already
	// reduce the count; no wrapper step is needed.
	result.push(...regroupementSteps);
	if (divisionStep) result.push(divisionStep);
	if (solutionStep) result.push(solutionStep);

	// Final pass: renumber so top-level IDs are 1, 2, 3, … and substeps
	// restart at 1 within each parent. (The `id()` counter is global, so the
	// wrapping group steps end up with the highest IDs even though they
	// appear first.)
	return renumberSteps(result);
}

// =============================================================================
// Pretty-printing helpers
// =============================================================================

import { toLatex } from '../latex-generator';

function operandPretty(node: MathNode): string {
	// `toLatex` emits a literal space for implicit multiplication (`5 x`) for
	// LaTeX source readability. In our pedagogical operand strings (terminal
	// demos, plain-text titles) we want the tighter `5x`. Strip the space
	// only between a digit/closing-brace and a letter (the implicit-multiply
	// case) — leave `\dfrac{...}{...}` etc. untouched.
	return toLatex(node).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2');
}

/**
 * Extract the solution value from `x = value` or `value = x`.
 */
function readSolutionValue(eq: RelationNode, variable: string): MathNode | null {
	if (eq.left.type === 'variable' && eq.left.name === variable) return eq.right;
	if (eq.right.type === 'variable' && eq.right.name === variable) return eq.left;
	return null;
}
