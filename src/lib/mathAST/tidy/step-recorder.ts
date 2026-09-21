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
import { StepRecorderBase, type BaseStep } from '../common/step-recorder-base';

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
 * `tidy-terms` est le **filet** : ce que le travail terme par terme (nombres,
 * radicaux, facteurs, signes) a changé sans qu'une seule famille puisse en
 * répondre sort encore d'un bloc — voir `soleFamilyRule` dans `collect.ts`.
 */
export type TidyRule =
	| 'tidy-terms'
	| 'tidy-fold-numbers'
	| 'tidy-extract-radicals'
	| 'tidy-merge-factors'
	| 'tidy-simplify-signs'
	| 'tidy-add-fractions'
	| 'tidy-collect-like-terms'
	| 'tidy-sort-terms'
	| 'tidy-choose-unit';

/** Une étape de mise au propre. */
export type TidyStep = BaseStep<TidyRule>;

// =============================================================================
// Constantes
// =============================================================================

/** Ce que chaque geste dit à l'élève. */
export const TIDY_RULE_DESCRIPTIONS: Readonly<Record<TidyRule, string>> = {
	'tidy-terms': 'On met chaque terme au propre',
	'tidy-fold-numbers': 'On calcule les nombres',
	'tidy-extract-radicals': 'On extrait du radical les facteurs qui sont des carrés parfaits',
	'tidy-merge-factors': 'On regroupe les facteurs de même base',
	'tidy-simplify-signs': 'On simplifie les signes',
	'tidy-add-fractions': 'On met au même dénominateur et on calcule',
	'tidy-collect-like-terms': 'On regroupe les termes semblables',
	'tidy-sort-terms': 'On range par degré décroissant',
	'tidy-choose-unit': "On choisit l'unité adaptée"
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

/**
 * Ce que `tidy` accepte en second argument.
 *
 * ⚠️ **Un enregistreur vaut pour UN appel.** `tidy` ajoute ses étapes à la
 * suite sans jamais vider : réutiliser la même instance sur deux expressions
 * met bout à bout deux chaînes qui ne se recollent pas. Les invariants de
 * chaîne (`étape[i].après === étape[i+1].avant`) ne valent qu'à l'intérieur
 * d'un appel.
 */
export interface TidyOptions {
	/** À qui raconter. Absent, `tidy` ne construit aucune expression en trop. */
	readonly recorder?: TidyStepRecorder;
}
