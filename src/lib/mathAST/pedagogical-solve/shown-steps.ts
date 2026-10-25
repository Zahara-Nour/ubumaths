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
 * Équations seulement : la réponse d'une inéquation est une chaîne déjà
 * écrite par le pipeline (`solutionDescription`), hors de Q46.
 *
 * @module mathAST/pedagogical-solve/shown-steps
 */

import type { MathNode, RelationNode } from '../types';
import type { EquationOperation, EquationStep } from './types';
import { exactValueToShow } from '../eval/exact-value';
import { hasDecimalLiteral } from '../tidy/decimal';
import { inDecimalRegister } from '../pedagogical-limits/decimal-register';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les étapes d'une équation écrites comme sa réponse ; celles d'une
 * inéquation, telles quelles.
 */
export function stepsAsShown(
	steps: readonly EquationStep[],
	equation: RelationNode
): readonly EquationStep[] {
	if (equation.relation !== '=') return steps;
	const decimal = hasDecimalLiteral(equation);
	// L'équation tapée garde son écriture (`\dfrac{x}{4} = 0,5` reste)
	const write = (node: MathNode): MathNode =>
		!decimal || node === equation ? node : inRegister(node);
	const value = (node: MathNode): MathNode => exactValueToShow(node, { decimal });

	const rewrite = (step: EquationStep): EquationStep => ({
		...step,
		before: writeRelation(step.before, write),
		after: writeRelation(step.after, write),
		...(step.operation && { operation: operationWith(step.operation, write, value) }),
		...(step.subSteps && { subSteps: step.subSteps.map(rewrite) })
	});
	return steps.map(rewrite);
}

/** `inDecimalRegister`, membre à membre pour une relation. */
function inRegister(node: MathNode): MathNode {
	if (node.type !== 'relation') return inDecimalRegister(node);
	return { ...node, left: inDecimalRegister(node.left), right: inDecimalRegister(node.right) };
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
