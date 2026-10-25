/**
 * Pedagogical Solve — les étapes écrites comme la réponse (lot 5f-4 du
 * chantier simplify-carte, R8 ; Q46, David, 2026-10-24)
 *
 * Les pipelines calculent en rationnels exacts ; l'écriture se choisit ici,
 * une fois, sur les étapes finies, avant le rendu :
 *
 * - **registre décimal** : quand l'équation tape un décimal, les nombres et
 *   coefficients à écriture décimale finie s'écrivent en décimal (`x = 0,3`,
 *   `0,5x = 1`, « On divise les deux membres par 0,5 »), les autres restent
 *   en fraction (`x = 10/3`) — S1, la règle de `inDecimalRegister` ;
 * - **solutions** : les valeurs lues (`x = …`, `S = {…}`, « On simplifie les
 *   solutions ») passent par `exactValueToShow`, comme la réponse de la ligne :
 *   `S = {−√2/2 ; √2/2}`, `(1 − √5)/2` (Q22, Q23).
 *
 * Inéquations comprises (Q50, David, 2026-10-25) : mêmes règles pour les
 * étapes, et les racines des tableaux de signes s'écrivent comme des
 * solutions. L'ensemble solution, lui, est une chaîne déjà écrite par le
 * pipeline (`solutionDescription`, `describeDomain`), avec la même écriture.
 *
 * @module mathAST/pedagogical-solve/shown-steps
 */

import type { MathNode, RelationNode } from '../types';
import type { EquationOperation, EquationStep } from './types';
import { exactValueToShow } from '../eval/exact-value';
import { hasDecimalLiteral } from '../tidy/decimal';
import { inDecimalRegister } from '../pedagogical-limits/decimal-register';
import type { DecimalRegisterOptions } from '../pedagogical-limits/decimal-register';
import { findNodes } from '../transforms';
import { getVariables } from '../eval/substitute';

// =============================================================================
// Fonctions
// =============================================================================

/** Les étapes d'une équation ou d'une inéquation écrites comme sa réponse. */
export function stepsAsShown(
	steps: readonly EquationStep[],
	equation: RelationNode
): readonly EquationStep[] {
	const decimal = hasDecimalLiteral(equation);
	// L'écriture tapée reste, jusque dans les branches d'une valeur absolue
	// (`\dfrac{x}{2} - 0,5 = 1`) : les pipelines y reprennent les nœuds tapés
	const typed = new Set(findNodes(equation, () => true));
	const options = { keep: (node: MathNode) => typed.has(node), roots: true };
	const write = (node: MathNode): MathNode => (decimal ? inRegister(node, options) : node);
	const value = (node: MathNode): MathNode => exactValueToShow(node, { decimal });

	const rewrite = (step: EquationStep): EquationStep => ({
		...step,
		before: writeRelation(step.before, write),
		after: writeRelation(step.after, write),
		...(step.operation && { operation: operationWith(step.operation, write, value) }),
		...(step.subSteps && { subSteps: step.subSteps.map(rewrite) })
	});
	const shown = steps.map(rewrite);
	if (equation.relation === '=' || shown.length === 0) return shown;
	// Une inéquation du premier degré ne conclut pas : sa dernière étape finit
	// sur la forme résolue `x < c`, dont c se lit comme une solution
	// (`2x < √2` → `x < √2/2`, comme `2x = √2`)
	const last = steps[steps.length - 1];
	const solved = solvedBoundWritten(last.after, value);
	if (solved === null) return shown;
	return [...shown.slice(0, -1), { ...shown[shown.length - 1], after: solved }];
}

/** `x ⋚ c` (c sans inconnue), c écrit par `value` ; sinon `null`. */
function solvedBoundWritten(
	after: RelationNode,
	value: (n: MathNode) => MathNode
): RelationNode | null {
	if (after.relation === '=' || after.left.type !== 'variable') return null;
	if (getVariables(after.right).size > 0) return null;
	return { ...after, right: value(after.right) };
}

/** `inDecimalRegister`, membre à membre pour une relation. */
function inRegister(node: MathNode, options: DecimalRegisterOptions): MathNode {
	if (options.keep?.(node) || node.type !== 'relation') return inDecimalRegister(node, options);
	return {
		...node,
		left: inDecimalRegister(node.left, options),
		right: inDecimalRegister(node.right, options)
	};
}

function writeRelation(node: RelationNode, write: (n: MathNode) => MathNode): RelationNode {
	const written = write(node);
	return written.type === 'relation' ? written : node;
}

/**
 * L'opération, ses valeurs écrites : les solutions lues par `value`, tout
 * autre nœud par `write` (coefficients, termes déplacés, branches).
 *
 * Les solutions BRUTES de la formule (`apply-quadratic-formula`,
 * `rawSolutions`) ne passent pas par `value` : elles montrent le calcul avant
 * simplification, `exactValueToShow` les calculerait.
 */
function operationWith(
	operation: EquationOperation,
	write: (n: MathNode) => MathNode,
	value: (n: MathNode) => MathNode
): EquationOperation {
	switch (operation.kind) {
		case 'read-solution':
			return { ...operation, value: value(operation.value) };
		case 'read-solutions':
		case 'simplify-solutions':
			return {
				...(writtenNodes(operation, write) as typeof operation),
				solutions: operation.solutions.map(value)
			};
		case 'solve-each-factor':
			return {
				...operation,
				pairs: operation.pairs.map(({ factor, value: v }) => ({
					factor: write(factor),
					value: value(v)
				}))
			};
		// Les racines d'un tableau de signes sont des solutions : `(1 − √5)/2`
		case 'quadratic-sign-table':
			return { ...writtenNodes(operation, write), roots: operation.roots.map(value) };
		case 'rational-domain-restriction':
			return { ...operation, excluded: operation.excluded.map(value) };
		case 'rational-locate-roots':
		case 'rational-sign-table':
			return {
				...(writtenNodes(operation, write) as typeof operation),
				numeratorRoots: operation.numeratorRoots.map(value),
				denominatorZeros: operation.denominatorZeros.map(value)
			};
		default:
			return writtenNodes(operation, write);
	}
}

/**
 * Chaque nœud de l'opération passé par `write` — champs, tableaux et objets
 * imbriqués (`originalTerms`) compris. Un nœud se reconnaît à son `type` ;
 * une opération, à son `kind`.
 */
function writtenNodes<T extends object>(operation: T, write: (n: MathNode) => MathNode): T {
	const walk = (field: unknown): unknown => {
		if (Array.isArray(field)) return field.map(walk);
		if (field === null || typeof field !== 'object') return field;
		if (isNode(field)) return write(field);
		return Object.fromEntries(Object.entries(field).map(([key, inner]) => [key, walk(inner)]));
	};
	return walk(operation) as T;
}

function isNode(field: object): field is MathNode {
	return 'type' in field && typeof field.type === 'string' && !('kind' in field);
}
