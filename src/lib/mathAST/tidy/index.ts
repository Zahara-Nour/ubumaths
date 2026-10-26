/**
 * `tidy()` — la mise au propre sans développement.
 *
 * Contrat : `docs/systeme/mathast/tidy-spec.md`, §A. AST en entrée, AST en sortie.
 *
 * - **valeur conservée** : `areEquivalent(tidy(x), x)` ;
 * - **idempotent** : `tidy(tidy(x))` est structurellement égal à `tidy(x)` ;
 * - **jamais de développement ni de factorisation** : `(x+1)²` reste `(x+1)²`,
 *   `x(x+1)` reste `x(x+1)`, `x²+x` reste `x²+x` ;
 * - **ne lève jamais d'exception** : ce qu'il ne sait pas traiter ressort tel
 *   quel.
 *
 * @module mathAST/tidy
 */

import type { MathNode } from '../types';
import { parentheses } from '../factory';
import { findNodes, mapNode, stripUnnecessaryBrackets } from '../transforms';
import { tidyNode } from './collect';
import type { TidyOptions } from './step-recorder';
import type { TidyCondition } from './types';
import { conditionKey, domainLoss, mergeConditions } from './conditions';

export { TidyStepRecorder, TIDY_RULE_DESCRIPTIONS } from './step-recorder';
export type { TermOrder, TidyOptions, TidyRule, TidyStep, UnitChoice } from './step-recorder';
export type { TidyCondition } from './types';
export {
	conditionSet,
	describeConditions,
	domainChange,
	domainChanges,
	domainLoss,
	isIncluded,
	plainConditions,
	type ConditionText,
	type DomainChangeDetail
} from './conditions';

/**
 * Met une expression au propre.
 *
 * Étape 2 du contrat — les parenthèses que la priorité rend inutiles — passe
 * par `stripUnnecessaryBrackets` en pré-traitement ; celles qui restent
 * nécessaires sont **réécrites** par la construction (`build.ts`), pas
 * conservées.
 *
 * @param node - L'expression à mettre au propre
 * @param options - `recorder` pour écouter les étapes ; absent, rien n'est construit en trop
 * @returns Une nouvelle expression, l'entrée inchangée en cas d'imprévu
 */
export function tidy(node: MathNode, options?: TidyOptions): MathNode {
	try {
		// ⚠️ Le 3ᵉ argument est l'expression TELLE QUE L'ÉLÈVE L'A ÉCRITE. Sans lui,
		// la chaîne partirait du nœud déjà dépouillé de ses parenthèses : `(3x+2x)`
		// commencerait à `3x+2x`, une réécriture qu'il ne voit jamais.
		const written = withImpliedParentheses(node);
		return tidyNode(stripUnnecessaryBrackets(written), options, written);
	} catch (error) {
		// Seul un débordement de pile (expression pathologiquement profonde) est
		// rattrapé : toute autre exception est un bug de `tidy` et doit remonter.
		if (error instanceof RangeError) return node;
		throw error;
	}
}

/**
 * La variante de `tidy` qui simplifie aussi ce qui perd le domaine (S3, décision
 * de David du 2026-10-22 ; chantier tidy-conditions, 2026-10-26) et dit à quelle
 * condition : `x/x → 1`, pour x ≠ 0 ; `ln(x) − ln(x) → 0`, pour x > 0. Sans
 * condition à poser, le résultat est celui de `tidy`. Une condition qu'on ne
 * sait pas écrire simplement (`tan(x) − tan(x)`) : la simplification n'a pas lieu.
 *
 * @returns Le résultat et ses conditions, réunies (une par expression, la plus forte)
 */
export function tidyWithConditions(
	node: MathNode,
	options?: TidyOptions
): { result: MathNode; conditions: readonly TidyCondition[] } {
	const conditions: TidyCondition[] = [];
	try {
		const written = withImpliedParentheses(node);
		const result = tidyNode(stripUnnecessaryBrackets(written), { ...options, conditions }, written);
		if (conditions.length === 0) return { result, conditions };
		// Ce que le résultat dit encore n'est pas redit : `x/x + ln(x) → 1 + ln(x)`
		// garde x > 0, le domaine n'a pas changé. Un domaine acquis (`domain`) n'est
		// pas redit non plus : seules comptent les conditions que `tidy` a posées
		const posed = mergeConditions(conditions);
		const lost = domainLoss(node, result, options?.typeCtx);
		if (lost === null) return { result, conditions: posed };
		const keys = new Set(posed.map((c) => conditionKey({ ...c, relation: 'nonzero' })));
		return {
			result,
			conditions: lost.filter((c) => keys.has(conditionKey({ ...c, relation: 'nonzero' })))
		};
	} catch (error) {
		if (error instanceof RangeError) return { result: node, conditions: [] };
		throw error;
	}
}

/**
 * Les parenthèses que la priorité impose, écrites (Q40, lot 5f-1). Un arbre
 * construit par le moteur (règle du quotient, substitution) porte
 * `u′v − (uv′)` sans nœud de parenthèse : `tidy` y distribuait alors le signe
 * (`x(2x+1) − x² − x − 1`), ce que son contrat interdit pour `−(x+2)` écrit.
 */
function withImpliedParentheses(node: MathNode): MathNode {
	// Le cas courant n'en a aucune : on ne recopie pas l'arbre pour rien
	if (findNodes(node, impliesParentheses).length === 0) return node;
	return mapNode(node, (n) => {
		if (n.type === 'subtraction' && isSum(n.right)) return { ...n, right: parentheses(n.right) };
		if (n.type === 'opposite' && isSum(n.operand)) return { ...n, operand: parentheses(n.operand) };
		return n;
	});
}

/** `a − (b + c)` ou `−(b + c)`, la somme sans nœud de parenthèse. */
function impliesParentheses(node: MathNode): boolean {
	if (node.type === 'subtraction') return isSum(node.right);
	if (node.type === 'opposite') return isSum(node.operand);
	return false;
}

function isSum(node: MathNode): boolean {
	return node.type === 'addition' || node.type === 'subtraction';
}
