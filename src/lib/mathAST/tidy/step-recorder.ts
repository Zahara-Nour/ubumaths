/**
 * Les étapes de `tidy` — ce que la mise au propre raconte.
 *
 * Spécification : `docs/wip/tidy-voix-phase0.md` (validée le 2026-09-21).
 *
 * `tidy` ne réécrit pas : il décompose en `TidyTerm[]`, accumule, reconstruit.
 * Il n'existe donc aucune expression intermédiaire « naturelle ». Les étapes
 * sont obtenues en **matérialisant** un AST entre deux stages du pipeline
 * (`buildSum` est appelable à tout moment) — c'est pour ça qu'une étape
 * correspond à un stage, et non à une occurrence de réécriture.
 *
 * @module mathAST/tidy/step-recorder
 */

import type { MathNode } from '../types';
import type { Verbosity } from '../common/verbosity';
import { StepRecorderBase, type BaseStep } from '../common/step-recorder-base.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Les gestes que `tidy` sait nommer.
 *
 * Préfixés `tidy-` : les noms de `normalize` (`'combine-like-terms'`,
 * `'simplify-fraction'`) vivent dans la même table de catégories pédagogiques
 * (`pedagogical-simplify/intent-rules.ts`), et deux gestes différents ne
 * doivent pas y porter le même nom.
 *
 * `tidy-terms` est le geste grossier du lot 1 : tout ce qui se fait terme par
 * terme pendant la décomposition (nombres, radicaux, facteurs, signes). Le
 * lot 2 le remplacera par ses quatre gestes fins.
 */
export type TidyRule = 'tidy-terms' | 'tidy-collect-like-terms' | 'tidy-sort-terms' | 'tidy-choose-unit';

/** Une étape de mise au propre. */
export interface TidyStep extends BaseStep<TidyRule> {}

// =============================================================================
// Constantes
// =============================================================================

/** Ce que chaque geste dit à l'élève. */
export const TIDY_RULE_DESCRIPTIONS: Readonly<Record<TidyRule, string>> = {
	'tidy-terms': 'On met chaque terme au propre',
	'tidy-collect-like-terms': 'On regroupe les termes semblables',
	'tidy-sort-terms': 'On range par degré décroissant',
	'tidy-choose-unit': 'On écrit dans la même unité'
};

// =============================================================================
// Enregistreur
// =============================================================================

/**
 * Enregistre les étapes de `tidy`.
 *
 * Une étape n'est retenue que si l'écriture change — la comparaison est
 * **structurelle**, jamais par référence : reconstruire un AST rend toujours
 * un objet neuf, donc `before !== after` est vrai même quand rien n'a bougé.
 * C'est la leçon du finding F4 de la PR #379.
 */
export class TidyStepRecorder extends StepRecorderBase<TidyStep, TidyRule> {
	recordStep(
		rule: TidyRule,
		description: string,
		before: MathNode,
		after: MathNode,
		verbosityLevel: Verbosity = 'detailed'
	): void {
		this.pushStep({ id: this.nextId++, rule, description, before, after, verbosityLevel });
	}

	/** Enregistre un geste avec sa description, en allant la chercher par son nom. */
	recordRule(rule: TidyRule, before: MathNode, after: MathNode): void {
		this.recordStep(rule, TIDY_RULE_DESCRIPTIONS[rule], before, after);
	}
}

/** Ce que `tidy` accepte en second argument. */
export interface TidyOptions {
	/** À qui raconter. Absent, `tidy` ne construit aucune expression en trop. */
	readonly recorder?: TidyStepRecorder;
}
