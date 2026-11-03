/**
 * Simplifier sans changer le domaine (chantier tidy-conditions, David 2026-10-26 ;
 * descendu de l'Atelier dans le moteur, chantier registre-reference, 2026-11-03)
 *
 * Une simplification n'a lieu que si le domaine ne change pas (ADR 0032, S3) :
 * `x/x`, `(x²−1)/(x+1)`, `ln(x) − ln(x)` restent écrits. Le calcul vient du
 * moteur pédagogique, coupé avant la première étape qui change le domaine ;
 * s'il n'a rien à dire, celui du moteur de calcul, gardé de même.
 *
 * C'est la réponse brute de `.simplifier` dans le registre ; l'Atelier y
 * ajoute ses étapes et le bouton « Simplifier pour x ≠ 0 »
 * (`atelier/domain-guard.ts`).
 *
 * @module mathAST/pedagogical-simplify/keep-domain
 */

import type { MathNode } from '../types';
import { domainChange, domainChanges, tidy, type TidyCondition, type TidyOptions } from '../tidy';
import { stripUnnecessaryBrackets } from '../transforms';
import { simplify } from '../simplify/simplify';
import { generatePedagogicalSimplifySteps } from './pipeline';
import type { PedagogicalSimplifyResult } from './types';

// =============================================================================
// Types
// =============================================================================

/** Un calcul pédagogique coupé avant la première étape qui change le domaine. */
export interface KeptDomain {
	/** Le calcul gardé : le résultat entier si le domaine ne change pas. */
	readonly kept: PedagogicalSimplifyResult;
	/** Ce que le résultat entier change ; `[]` : rien, `null` : on ne sait pas l'écrire. */
	readonly lost: readonly TidyCondition[] | null;
	/** Le domaine du résultat entier est plus petit (§ 4.2). */
	readonly narrows: boolean;
}

/** La simplification qui garde le domaine, et le calcul entier dont elle sort. */
export interface SimplifiedKeepingDomain {
	/** Le calcul entier du moteur pédagogique (le bouton de l'Atelier le montre). */
	readonly full: PedagogicalSimplifyResult;
	readonly domain: KeptDomain;
	/** La réponse : la fin du calcul gardé, ou l'expression mise au propre. */
	readonly answer: MathNode;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le calcul du moteur pédagogique, coupé avant la première étape qui change
 * le domaine de `input` (`fraction-cancel` sur `x/x`, `square-sqrt`,
 * `exp-ln`…). Les étapes d'avant restent : `x²/x + x` garde son rangement.
 * Le résumé n'est pas recoupé : il fondrait des étapes des deux côtés.
 */
export function keepingDomain(input: MathNode, result: PedagogicalSimplifyResult): KeptDomain {
	const change = domainChanges(input, result.result);
	const lost = change?.conditions ?? null;
	const narrows = change?.narrows ?? false;
	if (lost !== null && lost.length === 0) return { kept: result, lost, narrows };
	const changes = (node: MathNode) => {
		const loss = domainChange(input, node);
		return loss === null || loss.length > 0;
	};
	const first = result.steps.findIndex((step) => changes(step.globalAfter ?? step.after));
	// Aucune étape ne le dit (la perte vient de l'assemblage final) : rien n'est gardé
	if (first === -1)
		return { kept: { ...result, result: input, steps: [], summary: undefined }, lost, narrows };
	// La factorisation qui n'est là que pour simplifier la fraction part avec
	// elle : `auto` ne rend jamais une forme factorisée (ADR 0007)
	let kept = first;
	while (kept > 0 && result.steps[kept - 1].rule === 'fraction-factorise') kept--;
	const steps = result.steps.slice(0, kept);
	const at =
		result.steps[kept].globalBefore ??
		(kept === 0 ? input : (result.steps[kept - 1].globalAfter ?? input));
	return { kept: { ...result, result: at, steps, summary: undefined }, lost, narrows };
}

/**
 * L'expression mise au propre sans changer son domaine : `tidy`, sauf là où il
 * le changerait encore — l'expression lue. Filet : `tidy` garde le domaine
 * (S3, `1/(1/x)` compris depuis tidy-conditions § 4.3).
 */
export function writtenKeepingDomain(node: MathNode, options?: TidyOptions): MathNode {
	const tidied = tidy(node, options);
	const lost = domainChange(node, tidied);
	return lost !== null && lost.length === 0 ? tidied : stripUnnecessaryBrackets(node);
}

/**
 * Une réponse venue d'ailleurs que le moteur pédagogique : gardée si le
 * domaine ne change pas, sinon l'expression d'origine.
 */
export function answerKeepingDomain(input: MathNode, answer: MathNode): MathNode {
	const lost = domainChange(input, answer);
	return lost !== null && lost.length === 0 ? answer : input;
}

/**
 * Le calcul du moteur pédagogique qui garde le domaine ; `null` s'il n'a
 * rien à simplifier (zéro étape), ou ne sait pas lire l'expression
 * (`PedagogicalSimplifyNotImplemented` : inéquation, matrice…).
 * Des étapes, mais aucune qui garde le domaine : l'expression mise au propre.
 */
export function simplifiedKeepingDomain(node: MathNode): SimplifiedKeepingDomain | null {
	let full: PedagogicalSimplifyResult;
	try {
		full = generatePedagogicalSimplifySteps(node, {
			intent: 'auto',
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
	} catch {
		return null;
	}
	if (full.steps.length === 0) return null;
	const domain = keepingDomain(node, full);
	const answer = domain.kept.steps.length === 0 ? writtenKeepingDomain(node) : domain.kept.result;
	return { full, domain, answer };
}

/**
 * La réponse brute de `.simplifier` : le moteur pédagogique qui garde le
 * domaine ; à défaut, le moteur de calcul, gardé de même (`ln(x) − ln(x)`
 * reste écrit).
 */
export function simplifyKeepingDomain(node: MathNode): MathNode {
	const simplified = simplifiedKeepingDomain(node);
	if (simplified !== null) return simplified.answer;
	return answerKeepingDomain(writtenKeepingDomain(node), simplify(node).result);
}
