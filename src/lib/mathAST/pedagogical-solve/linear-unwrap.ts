/**
 * Pedagogical Solve — un membre non développé, défait comme sur papier (Q52)
 *
 * Avant les étapes du premier degré (`linear.ts`, `linear-inequality.ts`),
 * qui ne savent raconter que des termes `a·x` : on défait le membre qui porte
 * x, sans le développer quand ce n'est pas nécessaire (David, 2026-10-25 :
 * « 0,5(x+1) = 2 : on divise par 0,5 puis on enlève 1 ») :
 *
 * 1. x des deux côtés, ou plusieurs termes en x d'un côté → on développe
 *    (`3(x−1) = 2x + 1` → `3x − 3 = 2x + 1`) ;
 * 2. parenthèses précédées d'un + → on les supprime (`3 + (x−1) = 5`) ;
 * 3. un terme constant à côté du terme en x → on l'ôte d'abord
 *    (`2(x+1) + 3 = 7` → `2(x+1) = 4`) ;
 * 4. le terme en x seul :
 *    - `−(…)` → on multiplie par −1 ;
 *    - `k(…)` → on divise par k, ou on multiplie par son inverse si k est
 *      écrit en fraction (Q51 : `\frac{1}{2}(x+1)` → × 2) ;
 *    - `(…)/d` → on multiplie par d (`\frac{x+1}{2} = 3` → `x + 1 = 6`).
 *
 * Le sens d'une inéquation se retourne pour un facteur négatif. Le membre
 * obtenu reprend les nœuds tapés (`x + 1` de `0,5(x+1)`) : il n'est pas
 * récrit par `canon`, qui le développerait. On recommence jusqu'à ce que tous
 * les termes en x soient `a·x` ; une forme qu'on ne sait pas défaire lève
 * `UndevelopedLinearForm` (repli sur la réponse du moteur).
 *
 * @module mathAST/pedagogical-solve/linear-unwrap
 */

import type { MathNode, RelationNode } from '../types';
import type { EquationOperation, EquationStep } from './types';
import { add, divide, multiply, number, opposite, relation } from '../factory';
import { flattenSumShallow, unflattenSum } from '../flatten';
import type { SignedTerm } from '../flatten';
import { containsVariable } from '../common/contains-variable';
import { unwrapGrouping } from '../solve/classify';
import { toLatex } from '../latex-generator';
import {
	UndevelopedLinearForm,
	canon,
	chooseAddOrSubtract,
	flipRelation,
	flipsOrdering,
	isFractionWritten,
	isLinearTerm,
	makeStep,
	movedTerm,
	undevelopedTerm
} from './_helpers';

// =============================================================================
// Constantes
// =============================================================================

/** Garde contre une boucle : chaque tour défait au moins un niveau du membre. */
const MAX_ROUNDS = 12;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les étapes qui défont les membres non développés, et la relation obtenue,
 * dont tous les termes en x sont `a·x`. Sans terme non développé : aucune
 * étape, la relation rendue telle quelle.
 *
 * @param id - Le compteur d'identifiants du pipeline appelant.
 * @throws UndevelopedLinearForm pour une forme qu'on ne sait pas défaire.
 */
export function unwrapLinearRelation(
	start: RelationNode,
	variable: string,
	id: () => number
): { steps: EquationStep[]; relation: RelationNode } {
	const steps: EquationStep[] = [];
	let current = start;
	for (let round = 0; undevelopedTerm(current, variable) !== null; round++) {
		if (round >= MAX_ROUNDS) throw new UndevelopedLinearForm(current);
		const step = nextStep(current, variable, id());
		steps.push(step);
		current = step.after;
	}
	return { steps, relation: current };
}

/** L'étape suivante sur une relation qui a un terme en x non développé. */
function nextStep(current: RelationNode, variable: string, stepId: number): EquationStep {
	const leftHasX = containsVariable(current.left, variable);
	const rightHasX = containsVariable(current.right, variable);
	if (leftHasX && rightHasX) return expandStep(current, variable, stepId);

	const side = leftHasX ? 'left' : 'right';
	const xSide = current[side];
	const other = side === 'left' ? current.right : current.left;
	const terms = flattenSumShallow(xSide);
	const xTerms = terms.filter(({ term }) => containsVariable(term, variable));
	if (xTerms.length > 1) return expandStep(current, variable, stepId);

	const [xTerm] = xTerms;
	const constTerms = terms.filter(({ term }) => !containsVariable(term, variable));
	if (constTerms.length > 0) {
		// `3 + (x − 1)` : des parenthèses après un +
		if (xTerm.sign === '+' && unwrapGrouping(xTerm.term) !== xTerm.term) {
			return removeParenthesesStep(current, side, terms, stepId);
		}
		return moveConstantStep(current, side, xTerm, constTerms, other, variable, stepId);
	}
	return isolateFactorStep(current, side, xTerm, other, variable, stepId);
}

/** On développe chaque terme en x qui n'est pas `a·x`, dans les deux membres. */
function expandStep(current: RelationNode, variable: string, stepId: number): EquationStep {
	const expandSide = (side: MathNode): MathNode => {
		const terms = flattenSumShallow(side);
		if (terms.every(({ term }) => isLinearTerm(term, variable))) return side;
		const expanded = terms.flatMap((signed) =>
			isLinearTerm(signed.term, variable) ? [signed] : flattenSumShallow(canon(signedNode(signed)))
		);
		return unflattenSum(expanded) ?? number(0);
	};
	const after = relation(current.relation, expandSide(current.left), expandSide(current.right));
	return makeStep({
		id: stepId,
		rule: 'expand',
		description: 'On développe',
		before: current,
		after,
		operation: { kind: 'expand' }
	});
}

/** `3 + (x − 1)` → `3 + x − 1` : les termes des parenthèses, signes inchangés. */
function removeParenthesesStep(
	current: RelationNode,
	side: 'left' | 'right',
	terms: readonly SignedTerm[],
	stepId: number
): EquationStep {
	const opened = terms.flatMap((signed) => {
		const inner = unwrapGrouping(signed.term);
		return signed.sign === '+' && inner !== signed.term ? flattenSumShallow(inner) : [signed];
	});
	const after = withSide(current, side, unflattenSum(opened) ?? number(0), otherOf(current, side));
	return makeStep({
		id: stepId,
		rule: 'remove-parentheses',
		description: 'On supprime les parenthèses',
		before: current,
		after,
		operation: { kind: 'remove-parentheses' }
	});
}

/** `2(x+1) + 3 = 7` → `2(x+1) = 4` : le terme constant passe de l'autre côté. */
function moveConstantStep(
	current: RelationNode,
	side: 'left' | 'right',
	xTerm: SignedTerm,
	constTerms: readonly SignedTerm[],
	other: MathNode,
	variable: string,
	stepId: number
): EquationStep {
	const moved = movedTerm(unflattenSum(constTerms), variable);
	const xOnly = signedNode(xTerm);
	if (moved === null) {
		// Constantes de somme nulle (`2(x+1) + 3 − 3`) : on simplifie seulement
		return makeStep({
			id: stepId,
			rule: 'simplify',
			description: 'On simplifie',
			before: current,
			after: withSide(current, side, xOnly, other),
			operation: { kind: 'simplify', side }
		});
	}
	const choice = chooseAddOrSubtract(moved);
	return makeStep({
		id: stepId,
		rule: choice.kind,
		description:
			choice.kind === 'add-both-sides'
				? `On ajoute ${pretty(choice.displayOperand)} aux deux membres`
				: `On soustrait ${pretty(choice.displayOperand)} aux deux membres`,
		before: current,
		after: withSide(current, side, xOnly, canon(add(other, moved))),
		operation: { kind: choice.kind, operand: choice.displayOperand }
	});
}

/**
 * Le terme en x est seul dans son membre : on défait son facteur
 * (`−(…)`, `k(…)`, `(…)/d`), le sens retourné pour un facteur négatif.
 */
function isolateFactorStep(
	current: RelationNode,
	side: 'left' | 'right',
	xTerm: SignedTerm,
	other: MathNode,
	variable: string,
	stepId: number
): EquationStep {
	let negative = xTerm.sign === '-';
	let term = xTerm.term;
	while (term.type === 'opposite') {
		negative = !negative;
		term = term.operand;
	}
	const signed = (factor: MathNode): MathNode => (negative ? canon(opposite(factor)) : factor);

	// `−(x − 3)` : on multiplie par −1
	if (unwrapGrouping(term) !== term) {
		if (!negative) throw new UndevelopedLinearForm(term);
		return factorStep(
			current,
			side,
			unwrapGrouping(term),
			other,
			'multiply',
			canon(opposite(number(1))),
			stepId
		);
	}
	// `k(x + 1)`, `(x + 1) × k` : on divise par k, ou on multiplie par
	// l'inverse d'une fraction
	if (term.type === 'multiplication') {
		const leftHasX = containsVariable(term.left, variable);
		const rightHasX = containsVariable(term.right, variable);
		if (leftHasX !== rightHasX) {
			const written = leftHasX ? term.right : term.left;
			const inner = unwrapGrouping(leftHasX ? term.left : term.right);
			const k = signed(written);
			return isFractionWritten(written)
				? factorStep(
						current,
						side,
						inner,
						other,
						'multiply',
						canon(divide(number(1), k, 'fraction')),
						stepId
					)
				: factorStep(current, side, inner, other, 'divide', canon(k), stepId);
		}
	}
	// `(x + 1)/2` : on multiplie par 2
	if (
		term.type === 'division' &&
		containsVariable(term.numerator, variable) &&
		!containsVariable(term.denominator, variable)
	) {
		const d = signed(term.denominator);
		return factorStep(
			current,
			side,
			unwrapGrouping(term.numerator),
			other,
			'multiply',
			canon(d),
			stepId
		);
	}
	throw new UndevelopedLinearForm(term);
}

/** Les deux membres multipliés ou divisés par `factor` ; le membre en x devient `inner`. */
function factorStep(
	current: RelationNode,
	side: 'left' | 'right',
	inner: MathNode,
	other: MathNode,
	how: 'multiply' | 'divide',
	factor: MathNode,
	stepId: number
): EquationStep {
	const flipped = flipsOrdering(current.relation, factor);
	const otherAfter = canon(
		how === 'multiply' ? multiply(factor, other, 'cross') : divide(other, factor, 'fraction')
	);
	const after = withSide(current, side, inner, otherAfter);
	const rel = flipped ? flipRelation(current.relation) : current.relation;
	const verb = how === 'multiply' ? 'On multiplie' : 'On divise';
	const note = flipped ? ` (changement de sens car ${pretty(factor)} est négatif)` : '';
	const operation: EquationOperation = {
		kind: how === 'multiply' ? 'multiply-both-sides' : 'divide-both-sides',
		operand: factor,
		...(flipped && { flipOperator: true })
	};
	return makeStep({
		id: stepId,
		rule: operation.kind,
		description: `${verb} les deux membres par ${pretty(factor)}${note}`,
		before: current,
		after: { ...after, relation: rel },
		operation
	});
}

/** La relation avec `xSide` du côté `side` et `other` en face. */
function withSide(
	current: RelationNode,
	side: 'left' | 'right',
	xSide: MathNode,
	other: MathNode
): RelationNode {
	return side === 'left'
		? relation(current.relation, xSide, other)
		: relation(current.relation, other, xSide);
}

function otherOf(current: RelationNode, side: 'left' | 'right'): MathNode {
	return side === 'left' ? current.right : current.left;
}

/** Le terme avec son signe : `−` devient `opposite(…)`. */
function signedNode(signed: SignedTerm): MathNode {
	return signed.sign === '-' ? opposite(signed.term) : signed.term;
}

/** Un opérande dans la prose (titres de repli) : en LaTeX entre `$…$` (V25) */
function pretty(node: MathNode): string {
	return `$${toLatex(node).replace(/(\d|\})\s+([a-zA-Z\\])/g, '$1$2')}$`;
}
