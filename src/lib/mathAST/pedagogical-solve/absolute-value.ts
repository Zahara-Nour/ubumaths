/**
 * Pedagogical Solve — équations avec valeur absolue (2nde, 1re)
 *
 * La rédaction validée par David le 2026-10-13 :
 *
 *   1. on isole la valeur absolue s'il le faut (`3|x − 1| = 6` ⇒ `|x − 1| = 2`) ;
 *   2. |u| = c ⇔ u = c ou u = −c (c > 0) — comme x² = c ;
 *      |u| = 0 ⇔ u = 0 ;
 *      |u| = c, c < 0 : une valeur absolue est positive ou nulle, pas de solution ;
 *      |u| = |v| ⇔ u = v ou u = −v ;
 *   3. chaque équation du premier degré est résolue par le pipeline du premier
 *      degré, À PLAT (pas de sous-étapes : tout est visible) ;
 *   4. on réunit les solutions.
 *
 * La forme de l'équation est lue par `analyzeAbsoluteValue`, la même analyse
 * que `solve` : périmètre identique (u, v affines), et un refus (`throw`)
 * partout ailleurs — jamais une rédaction fausse. L'ensemble des solutions de
 * la conclusion est celui de `solve`.
 *
 * @module mathAST/pedagogical-solve/absolute-value
 */

import type { FunctionNode, MathNode, RelationNode } from '../types';
import type { SchoolLevel } from '../common/step-renderer-base';
import { equals, func, number, opposite, subtract } from '../factory';
import { isFunction } from '../guards';
import { nodesEqual } from '../normal/hash';
import { getVariables } from '../eval/substitute';
import { findNodes } from '../transforms';
import { solve } from '../solve/solve';
import { analyzeAbsoluteValue, type AbsoluteValueShape } from '../solve/absolute-value';
import { detectVariable } from '../solve/classify';
import { makeStep } from './_helpers';
import { canonicalForm } from '../normal';
import { computeNumericValue } from '../eval/numeric-value';
import { generateLinearEquationSteps } from './linear';
import type { EquationOperation, EquationStep, LinearSchoolLevel } from './types';

// =============================================================================
// Types
// =============================================================================

export interface AbsoluteValueEquationStepsOptions {
	readonly level: SchoolLevel;
	readonly variable?: string;
}

/** L'équation n'est pas dans le périmètre (u non affine, inconnue hors de |…|, paramètre…). */
export class UnsupportedAbsoluteValueEquation extends Error {
	constructor() {
		super(
			'pedagogical-solve: équation avec valeur absolue hors périmètre (|u| = c ou |u| = |v|, u et v affines).'
		);
		this.name = 'UnsupportedAbsoluteValueEquation';
	}
}

// =============================================================================
// Constantes
// =============================================================================

/** Les issues de `solve` qu'on sait conclure : un ensemble fini, vide, ou ℝ. */
/** Écart relatif en deçà duquel deux solutions sont la même. */
const RELATIVE_TOLERANCE = 1e-9;

const CONCLUSIVE_STATUSES: ReadonlySet<string> = new Set([
	'unique',
	'multiple',
	'no-solution',
	'infinite'
]);

// =============================================================================
// Fonctions
// =============================================================================

function isAbs(node: MathNode): node is FunctionNode {
	return isFunction(node) && node.name === 'abs' && node.args.length === 1;
}

function abs(node: MathNode): FunctionNode {
	return func('abs', [node]);
}

/** Les valeurs absolues de l'équation telles que l'élève les a écrites. */
export function countAbsoluteValues(node: MathNode): number {
	return findNodes(node, isAbs).length;
}

/** L'équation contient-elle une valeur absolue où paraît l'inconnue ? */
export function hasAbsoluteValueOf(equation: RelationNode, variable: string): boolean {
	return findNodes(equation, isAbs).some((node) => getVariables(node).has(variable));
}

/**
 * Le niveau des étapes du premier degré de chaque branche : celui demandé
 * (l'élève lit la même rédaction que pour `2x + 1 = 5` seule), le primaire
 * relevé au collège comme dans `generateEquationSteps`. Partagé avec le
 * renderer : générer et rendre au même niveau.
 */
export function linearLevelFor(level: SchoolLevel): LinearSchoolLevel {
	return level === 'primaire' ? 'college' : level;
}

/**
 * Les solutions écrites comme dans les branches (`\sqrt{2} - 1`, pas la forme
 * réduite du moteur), sans doublon (`|2x| = |x|` donne 0 deux fois), dans
 * l'ordre croissant — et vérifiées contre `solve` : un désaccord est un refus.
 */
function orderedSolutions(written: readonly MathNode[], engine: readonly MathNode[]): MathNode[] {
	const valued: { readonly node: MathNode; readonly value: number }[] = [];
	for (const node of written) {
		const value = computeNumericValue(node);
		if (value === null) throw new UnsupportedAbsoluteValueEquation();
		if (valued.some((v) => near(v.value, value))) continue;
		valued.push({ node, value });
	}
	const engineValues = engine.map((node) => computeNumericValue(node));
	const agrees =
		engineValues.length === valued.length &&
		engineValues.every((e) => e !== null && valued.some((v) => near(v.value, e)));
	if (!agrees) throw new UnsupportedAbsoluteValueEquation();
	return valued.sort((a, b) => a.value - b.value).map((v) => v.node);
}

function near(a: number, b: number): boolean {
	return Math.abs(a - b) <= RELATIVE_TOLERANCE * Math.max(1, Math.abs(a), Math.abs(b));
}

/** `x = c`, c sans l'inconnue : déjà résolue, rien à rédiger. */
function isSolvedFor(equation: RelationNode, variable: string): boolean {
	return (
		equation.left.type === 'variable' &&
		equation.left.name === variable &&
		!getVariables(equation.right).has(variable)
	);
}

/**
 * L'équation isolée `|u| = c` (ou `|u| = |v|`) et si l'élève l'a déjà écrite
 * ainsi. Déjà isolée, c reste écrit comme l'élève l'a tapé (`1 - \sqrt{2}`).
 */
function isolatedForm(
	input: RelationNode,
	shape: AbsoluteValueShape,
	variable: string
): { readonly relation: RelationNode; readonly already: boolean; readonly value?: MathNode } {
	const { left, right } = input;
	if (shape.kind === 'equal') {
		const already =
			isAbs(left) &&
			isAbs(right) &&
			nodesEqual(left.args[0], shape.left) &&
			nodesEqual(right.args[0], shape.right);
		return { relation: already ? input : equals(abs(shape.left), abs(shape.right)), already };
	}
	const already =
		isAbs(left) && nodesEqual(left.args[0], shape.argument) && !getVariables(right).has(variable);
	const value = already ? right : shape.value;
	return { relation: already ? input : equals(abs(shape.argument), value), already, value };
}

/** Les équations du premier degré : u = c puis u = −c, ou u = v puis u = −v. */
function branchesOf(shape: AbsoluteValueShape, value: MathNode | undefined): RelationNode[] {
	if (shape.kind === 'equal') {
		return [
			equals(shape.left, shape.right),
			equals(shape.left, canonicalForm(opposite(shape.right)))
		];
	}
	const c = value ?? shape.value;
	return shape.sign === 0
		? [equals(shape.argument, number('0'))]
		: [equals(shape.argument, c), equals(shape.argument, canonicalForm(opposite(c)))];
}

function splitDescription(op: EquationOperation & { kind: 'split-absolute-value' }): string {
	if (op.case === 'equal')
		return "Deux nombres ont la même valeur absolue s'ils sont égaux ou opposés";
	if (op.case === 'zero') return 'Seul $0$ a pour valeur absolue $0$';
	return 'Deux nombres ont pour valeur absolue la même constante positive';
}

/**
 * Générer les étapes de résolution d'une équation avec valeur absolue.
 *
 * @throws {UnsupportedAbsoluteValueEquation} hors du périmètre de `solve`.
 */
export function generateAbsoluteValueEquationSteps(
	input: RelationNode,
	options: AbsoluteValueEquationStepsOptions
): readonly EquationStep[] {
	const variable = options.variable ?? detectVariable(input);
	if (variable === null) {
		throw new Error('generateAbsoluteValueEquationSteps: cannot detect a single variable');
	}
	const shape = analyzeAbsoluteValue(subtract(input.left, input.right), variable, solve);
	if (shape === null) throw new UnsupportedAbsoluteValueEquation();
	const overall = solve(input, { variable });
	if (!CONCLUSIVE_STATUSES.has(overall.status)) throw new UnsupportedAbsoluteValueEquation();

	const steps: EquationStep[] = [];
	let nextId = 1;
	const push = (
		operation: EquationOperation,
		description: string,
		before: RelationNode,
		after: RelationNode = before
	) => {
		steps.push(
			makeStep({ id: nextId++, rule: operation.kind, description, before, after, operation })
		);
	};

	push(
		{ kind: 'identify-equation', equationType: 'absolute-value', variable },
		shape.kind === 'equal'
			? 'Équation avec deux valeurs absolues'
			: 'Équation avec une valeur absolue',
		input
	);

	const isolated = isolatedForm(input, shape, variable);
	if (!isolated.already) {
		push(
			{ kind: 'isolate-absolute-value', form: shape.kind },
			'On isole la valeur absolue',
			input,
			isolated.relation
		);
	}
	const current = isolated.relation;

	if (shape.kind === 'single' && shape.sign < 0) {
		const value = isolated.value ?? shape.value;
		push(
			{ kind: 'absolute-value-negative', value },
			'Une valeur absolue est positive ou nulle',
			current
		);
		push(
			{ kind: 'read-solutions', variable, solutions: [] },
			"L'équation n'a pas de solution",
			current
		);
		return steps;
	}

	const branches = branchesOf(shape, isolated.value);
	const split: EquationOperation = {
		kind: 'split-absolute-value',
		case: shape.kind === 'equal' ? 'equal' : shape.sign === 0 ? 'zero' : 'positive',
		...(isolated.value !== undefined && { value: isolated.value }),
		branches
	};
	push(split, splitDescription(split), current);

	let last = current;
	const written: MathNode[] = [];
	for (const branch of branches) {
		if (isSolvedFor(branch, variable)) {
			written.push(branch.right);
			continue;
		}
		push({ kind: 'solve-branch', equation: branch }, 'On résout une des deux équations', branch);
		last = branch;

		// Les étapes du premier degré, sans leur titre ni leur « S = … » : la
		// conclusion porte sur l'équation de départ, pas sur cette branche
		const linear = generateLinearEquationSteps(branch, {
			level: linearLevelFor(options.level),
			variable
		});
		for (const step of linear) {
			const kind = step.operation?.kind;
			if (kind === 'identify-equation' || kind === 'read-solution') continue;
			steps.push({ ...step, id: nextId++ });
			last = step.after;
		}

		// 0 = 4 ou 0 = 0 : l'équation obtenue ne dépend plus de l'inconnue
		const status = solve(branch, { variable }).status;
		if (status === 'infinite' || status === 'no-solution') {
			const relation = getVariables(last).has(variable)
				? equals(canonicalForm(subtract(branch.left, branch.right)), number('0'))
				: last;
			const truth = status === 'infinite';
			push(
				{ kind: 'branch-truth', truth, variable, relation },
				truth ? 'Cette équation est vérifiée par tout réel' : "Cette équation n'a pas de solution",
				relation
			);
			last = relation;
		} else if (isSolvedFor(last, variable)) {
			written.push(last.right);
		} else {
			throw new UnsupportedAbsoluteValueEquation();
		}
	}

	if (overall.status === 'infinite') {
		push({ kind: 'read-all-reals', variable }, 'Tout réel est solution', last);
		return steps;
	}
	const solutions = orderedSolutions(
		written,
		overall.solutions.map((s) => s.value)
	);
	push(
		{ kind: 'read-solutions', variable, solutions },
		solutions.length === 0
			? "L'équation n'a pas de solution"
			: solutions.length === 1
				? "L'équation a une seule solution"
				: 'On réunit les solutions des deux équations',
		last
	);
	return steps;
}
