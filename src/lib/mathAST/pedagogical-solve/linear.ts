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
 */
function splitSide(
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
	const regroupementMicro: EquationStep[] = [];

	// 2a — Move x-terms from RIGHT to LEFT
	const rightSplit = splitSide(current.right, variable);
	if (rightSplit.xPart !== null) {
		const operand = canon(opposite(rightSplit.xPart));
		const after = addToBothSides(current, operand);
		regroupementMicro.push(
			makeStep({
				id: id(),
				rule: 'add-both-sides',
				description: `On ajoute ${operandPretty(operand)} aux deux membres pour regrouper les termes en ${variable} à gauche`,
				before: current,
				after,
				operation: { kind: 'add-both-sides', operand }
			})
		);
		current = after;
	}

	// 2b — Move constants from LEFT to RIGHT
	const leftSplit = splitSide(current.left, variable);
	if (leftSplit.constPart !== null && !isZero(leftSplit.constPart)) {
		const operand = canon(opposite(leftSplit.constPart));
		const after = addToBothSides(current, operand);
		regroupementMicro.push(
			makeStep({
				id: id(),
				rule: 'add-both-sides',
				description: `On ajoute ${operandPretty(operand)} aux deux membres pour isoler le terme en ${variable}`,
				before: current,
				after,
				operation: { kind: 'add-both-sides', operand }
			})
		);
		current = after;
	}

	// Step 3 — Division (skip when coefficient is 1)
	let divisionStep: EquationStep | null = null;
	const coefficient = extractCoefficientOfX(current.left, variable);
	if (coefficient !== null && !isOne(coefficient)) {
		const after = divideBothSides(current, coefficient);
		divisionStep = makeStep({
			id: id(),
			rule: 'divide-both-sides',
			description: `On divise les deux membres par ${operandPretty(coefficient)}`,
			before: current,
			after,
			operation: { kind: 'divide-both-sides', operand: coefficient }
		});
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

	// `mergeAll`: collapse regroupement + division + solution into ONE step.
	// Drops `solutionStep` and `divisionStep` as separate top-level entries;
	// they live inside the merged step's substeps instead.
	if (strategy.mergeAll) {
		const allMicro: EquationStep[] = [...regroupementMicro];
		if (divisionStep) allMicro.push(divisionStep);
		// Include solutionStep in substeps so the drill-down shows the full
		// narrative (regroupement → division → "Solution: x = …"). The
		// merged top-level step's `after` field already shows the solved
		// equation, so a separate top-level "Solution" entry would be
		// redundant for the ultra-condensed superieur view.
		if (solutionStep) allMicro.push(solutionStep);
		if (allMicro.length > 0) {
			const before = allMicro[0].before;
			const after = solutionStep ? solutionStep.before : allMicro[allMicro.length - 1].after;
			result.push(
				makeStep({
					id: id(),
					rule: 'reduce-to-canonical',
					description: solutionStep
						? `Forme canonique → ${solutionStep.description.replace(/^Solution : /, '')}`
						: 'Forme canonique ax = b',
					before,
					after,
					operation: { kind: 'reduce-to-canonical' },
					subSteps: includeSubSteps ? allMicro : undefined
				})
			);
		} else if (solutionStep) {
			// No work to do (e.g., already x = value)
			result.push(solutionStep);
		}
		return result;
	}

	// Standard assembly (non-mergeAll)
	if (regroupementMicro.length > 0) {
		if (strategy.groupRegroupement) {
			result.push(
				makeStep({
					id: id(),
					rule: 'reduce-to-canonical',
					description: 'Mise sous forme canonique ax = b',
					before: regroupementMicro[0].before,
					after: regroupementMicro[regroupementMicro.length - 1].after,
					operation: { kind: 'reduce-to-canonical' },
					subSteps: includeSubSteps ? regroupementMicro : undefined
				})
			);
		} else {
			result.push(...regroupementMicro);
		}
	}

	if (divisionStep) {
		if (strategy.groupDivision && includeSubSteps) {
			result.push(
				makeStep({
					id: id(),
					rule: 'divide-both-sides',
					description: divisionStep.description,
					before: divisionStep.before,
					after: divisionStep.after,
					operation: divisionStep.operation,
					subSteps: [divisionStep]
				})
			);
		} else {
			result.push(divisionStep);
		}
	}

	if (solutionStep) result.push(solutionStep);

	return result;
}

// =============================================================================
// Pretty-printing helpers
// =============================================================================

import { toLatex } from '../latex-generator';

function operandPretty(node: MathNode): string {
	return toLatex(node);
}

/**
 * Extract the solution value from `x = value` or `value = x`.
 */
function readSolutionValue(eq: RelationNode, variable: string): MathNode | null {
	if (eq.left.type === 'variable' && eq.left.name === variable) return eq.right;
	if (eq.right.type === 'variable' && eq.right.name === variable) return eq.left;
	return null;
}
