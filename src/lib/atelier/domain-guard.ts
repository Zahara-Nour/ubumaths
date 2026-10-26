/**
 * Atelier — garder le domaine (chantier tidy-conditions, David 2026-10-26)
 *
 * Toutes les lignes se comportent comme une expression tapée et `.développer` :
 * une simplification n'a lieu que si le domaine ne change pas. Mesuré avant :
 * `.simplifier x/x` → `1`, `.simplifier (x²−1)/(x+1)` → `x − 1`,
 * `.simplifier ln(x) − ln(x)` → `0`, sans condition sur la ligne.
 *
 * Celle qui change le domaine passe par le bouton de la ligne : « Simplifier
 * pour x ≠ 0 » montre le résultat avec sa condition, et ses étapes. Une
 * condition qu'on ne sait pas écrire (`tan`) : ni simplification, ni bouton.
 *
 * @module atelier/domain-guard
 */

import type { MathNode } from '$lib/mathAST/types';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { PedagogicalSimplifyResult } from '$lib/mathAST/pedagogical-simplify/types';
import {
	describeConditions,
	domainChange,
	tidy,
	tidyWithConditions,
	type TidyCondition,
	type TidyOptions
} from '$lib/mathAST/tidy';
import { toLatex } from '$lib/mathAST/latex-generator';
import { stripUnnecessaryBrackets } from '$lib/mathAST/transforms';
import { withValueInRegister } from '$lib/mathAST/integration/coefficient-register';

// =============================================================================
// Types
// =============================================================================

/** L'autre écriture d'une ligne, montrée par son bouton (`Alternative` de `calcul.ts`). */
export interface DomainAlternative {
	/** « Simplifier pour x ≠ 0 » */
	readonly label: string;
	/** Ce que dit le bouton basculé */
	readonly back: string;
	/** `1\text{,}\quad\text{pour } x \neq 0` */
	readonly latex: string;
	readonly steps?: readonly RenderedStep[];
	readonly summary?: readonly RenderedStep[];
	/** Ce que le réglage, la note et `avec` / `dans` lisent (§ 3) */
	readonly domain: DomainFacts;
}

/** La simplification derrière le bouton : sa réponse seule et ses conditions. */
export interface DomainFacts {
	readonly conditions: readonly TidyCondition[];
	/** La réponse en LaTeX, sans « pour … » */
	readonly answer: string;
	readonly ast: MathNode;
}

/** Un calcul pédagogique coupé avant la première étape qui change le domaine. */
export interface KeptDomain {
	/** Le calcul gardé : le résultat entier si le domaine ne change pas. */
	readonly kept: PedagogicalSimplifyResult;
	/** Ce que le résultat entier perd ; `[]` : rien, `null` : on ne sait pas l'écrire. */
	readonly lost: readonly TidyCondition[] | null;
}

// =============================================================================
// Constantes
// =============================================================================

/** Le bouton basculé : revenir à la ligne qui garde le domaine. */
const BACK = 'Sans simplifier';

// =============================================================================
// Fonctions
// =============================================================================

/** Les conditions écrites et reliées par « et » : `x ≠ 0 et y ≠ 0`. */
function joined(conditions: readonly TidyCondition[]): { text: string; latex: string } {
	const written = describeConditions(conditions);
	return {
		text: written.map((c) => c.text).join(' et '),
		latex: written.map((c) => c.latex).join('\\text{ et }')
	};
}

/**
 * Le bouton d'une simplification qui change le domaine : la réponse, puis sa
 * condition, `1\text{,}\quad\text{pour } x \neq 0`.
 */
export function domainAlternative(
	answer: MathNode,
	conditions: readonly TidyCondition[],
	steps?: { readonly steps?: readonly RenderedStep[]; readonly summary?: readonly RenderedStep[] }
): DomainAlternative {
	const { text, latex } = joined(conditions);
	return {
		label: `Simplifier pour ${text}`,
		back: BACK,
		// La virgule en texte : la virgule décimale lirait `0,5,` comme une liste (`0,5 ;`)
		latex: `${toLatex(answer)}\\text{,}\\quad\\text{pour }${latex}`,
		...(steps?.steps !== undefined && { steps: steps.steps }),
		...(steps?.summary !== undefined && { summary: steps.summary }),
		domain: { conditions, answer: toLatex(answer), ast: answer }
	};
}

/**
 * Une ligne déjà écrite sans perte de domaine (`x/x`, `−x + x/x`) : le bouton
 * de la simplification que `tidy` a refusée, s'il y en a une.
 */
export function tidyAlternative(
	shown: MathNode,
	options?: TidyOptions
): DomainAlternative | undefined {
	const { result, conditions } = tidyWithConditions(shown, options);
	// Un décimal tapé reste décimal (revue : `0,5x/x` donnait `1/2`)
	return conditions.length === 0
		? undefined
		: domainAlternative(withValueInRegister(result, shown), conditions);
}

/**
 * Une expression tapée, déjà écrite sans perte de domaine : ce que `tidy` a
 * refusé par prudence et qui garde pourtant le domaine passe sur la ligne
 * (`x/x + ln(x)` → `ln(x) + 1`, ln dit déjà x > 0) ; ce qui le change passe
 * au bouton.
 */
export function tidyFurther(
	shown: MathNode,
	options?: TidyOptions
): { readonly shown: MathNode; readonly alternative?: DomainAlternative } {
	const { result: tidied, conditions } = tidyWithConditions(shown, options);
	// Un décimal tapé reste décimal (revue : `0,5x/x` donnait `1/2`)
	const result = withValueInRegister(tidied, shown);
	if (conditions.length > 0) return { shown, alternative: domainAlternative(result, conditions) };
	const change = domainChange(shown, result);
	return { shown: change !== null && change.length === 0 ? result : shown };
}

/**
 * Le calcul du moteur pédagogique, coupé avant la première étape qui change
 * le domaine de `input` (`fraction-cancel` sur `x/x`, `square-sqrt`,
 * `exp-ln`…). Les étapes d'avant restent : `x²/x + x` garde son rangement.
 * Le résumé n'est pas recoupé : il fondrait des étapes des deux côtés.
 */
export function keepingDomain(input: MathNode, result: PedagogicalSimplifyResult): KeptDomain {
	const lost = domainChange(input, result.result);
	if (lost !== null && lost.length === 0) return { kept: result, lost };
	const changes = (node: MathNode) => {
		const loss = domainChange(input, node);
		return loss === null || loss.length > 0;
	};
	const first = result.steps.findIndex((step) => changes(step.globalAfter ?? step.after));
	// Aucune étape ne le dit (la perte vient de l'assemblage final) : rien n'est gardé
	if (first === -1)
		return { kept: { ...result, result: input, steps: [], summary: undefined }, lost };
	// La factorisation qui n'est là que pour simplifier la fraction part avec
	// elle : `auto` ne rend jamais une forme factorisée (ADR 0007)
	let kept = first;
	while (kept > 0 && result.steps[kept - 1].rule === 'fraction-factorise') kept--;
	const steps = result.steps.slice(0, kept);
	const at =
		result.steps[kept].globalBefore ??
		(kept === 0 ? input : (result.steps[kept - 1].globalAfter ?? input));
	return { kept: { ...result, result: at, steps, summary: undefined }, lost };
}

/**
 * Une réponse venue d'ailleurs que le moteur pédagogique (repli du moteur de
 * calcul, `tidy` d'une expression tapée) : gardée si le domaine ne change pas ;
 * sinon l'expression d'origine, et le bouton de la réponse avec sa condition.
 */
export function guardedAnswer(
	input: MathNode,
	answer: MathNode
): { readonly shown: MathNode; readonly alternative?: DomainAlternative } {
	const lost = domainChange(input, answer);
	if (lost === null) return { shown: input };
	if (lost.length === 0) return { shown: answer };
	return { shown: input, alternative: domainAlternative(answer, lost) };
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
