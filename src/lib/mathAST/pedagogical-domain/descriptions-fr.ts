/**
 * Pedagogical Domain — French Descriptions per School Level
 *
 * Titles and explanations for each `DomainRule` adapted to a `SchoolLevel`.
 *
 * - **Titles** drive the step header (e.g. « Contrainte de la racine carrée »).
 *   Always shown.
 * - **Explanations** drive the optional longer text shown at
 *   `verbosity === 'detailed'`. Built on top of `DOMAIN_RULE_TEMPLATES`
 *   (in `domain/step-descriptions.ts`) — we reuse those for the contextual
 *   reasoning string (already populated by the recorder via
 *   `recordWithTemplate`), and add level-specific framing here.
 *
 * Vocabulary register :
 * - `lycee` : full sentences, named theorems, didactic.
 * - `superieur` : symbolic shorthand, terse.
 *
 * @module mathAST/pedagogical-domain/descriptions-fr
 */

import type { DomainRule, EnhancedDomainStep } from '../domain';
import type { PedagogicalDomainSchoolLevel } from './types';

// =============================================================================
// Title functions
// =============================================================================

export type TitleFn = (step: EnhancedDomainStep) => string;
export type ExplainFn = (step: EnhancedDomainStep) => string;

/**
 * Lycée titles : full descriptive headers.
 *
 * Only V1 MVP rules are populated. Out-of-MVP rules fall back to
 * `step.description` via `getDefaultTitle`.
 */
const LYCEE_TITLES: Partial<Record<DomainRule, TitleFn>> = {
	sqrt_constraint: () => 'Contrainte de la racine carrée',
	ln_constraint: () => 'Contrainte du logarithme népérien',
	log_constraint: () => 'Contrainte du logarithme',
	division_constraint: () => 'Contrainte de la division',
	arcsin_constraint: () => 'Contrainte de l’arc sinus',
	arccos_constraint: () => 'Contrainte de l’arc cosinus',
	tan_constraint: () => 'Contrainte de la tangente',
	cot_constraint: () => 'Contrainte de la cotangente',
	sec_constraint: () => 'Contrainte de la sécante',
	csc_constraint: () => 'Contrainte de la cosécante',
	power_constraint: () => 'Contrainte de la puissance négative',
	even_root_constraint: () => 'Contrainte de la racine paire',
	intersection: () => 'Intersection des contraintes',
	universal: () => 'Domaine universel',
	empty: () => 'Domaine vide'
};

/**
 * Supérieur titles : compact headers.
 */
const SUPERIEUR_TITLES: Partial<Record<DomainRule, TitleFn>> = {
	sqrt_constraint: () => '√u défini',
	ln_constraint: () => 'ln u défini',
	log_constraint: () => 'log u défini',
	division_constraint: () => 'u ≠ 0',
	arcsin_constraint: () => 'arcsin u défini',
	arccos_constraint: () => 'arccos u défini',
	tan_constraint: () => 'tan u défini',
	cot_constraint: () => 'cot u défini',
	sec_constraint: () => 'sec u défini',
	csc_constraint: () => 'csc u défini',
	arccosh_constraint: () => 'arccosh u défini',
	arctanh_constraint: () => 'arctanh u défini',
	power_constraint: () => 'u^(-n) défini',
	even_root_constraint: () => 'u^(1/2n) défini',
	intersection: () => 'Intersection',
	universal: () => 'D = ℝ',
	empty: () => 'D = ∅'
};

export const TITLES: Readonly<
	Record<PedagogicalDomainSchoolLevel, Partial<Record<DomainRule, TitleFn>>>
> = {
	lycee: LYCEE_TITLES,
	superieur: SUPERIEUR_TITLES
};

// =============================================================================
// Explanation functions
// =============================================================================

/**
 * Lycée explanations : reuse the contextual `step.reasoning` populated by
 * `applyDomainRuleTemplate` in compute.ts, optionally enriching with
 * didactic framing.
 */
const LYCEE_EXPLANATIONS: Partial<Record<DomainRule, ExplainFn>> = {
	sqrt_constraint: (step) =>
		step.reasoning ?? 'La racine carrée nécessite un argument positif ou nul.',
	ln_constraint: (step) =>
		step.reasoning ?? 'Le logarithme népérien nécessite un argument strictement positif.',
	log_constraint: (step) =>
		step.reasoning ?? 'Le logarithme nécessite un argument strictement positif.',
	division_constraint: (step) => step.reasoning ?? 'La division nécessite un dénominateur non nul.',
	arcsin_constraint: (step) =>
		step.reasoning ?? 'L’arc sinus n’est défini que pour des arguments dans [-1 ; 1].',
	arccos_constraint: (step) =>
		step.reasoning ?? 'L’arc cosinus n’est défini que pour des arguments dans [-1 ; 1].',
	tan_constraint: (step) =>
		step.reasoning ?? 'La tangente n’est pas définie aux multiples de π/2 + kπ.',
	cot_constraint: (step) =>
		step.reasoning ?? 'La cotangente n’est pas définie aux multiples de kπ.',
	sec_constraint: (step) =>
		step.reasoning ?? 'La sécante n’est pas définie aux multiples de π/2 + kπ.',
	csc_constraint: (step) => step.reasoning ?? 'La cosécante n’est pas définie aux multiples de kπ.',
	power_constraint: (step) =>
		step.reasoning ?? 'Une puissance d’exposant négatif nécessite une base non nulle.',
	even_root_constraint: (step) =>
		step.reasoning ?? 'Une racine paire nécessite un argument positif ou nul.',
	intersection: () =>
		'Le domaine de définition est l’intersection de toutes les contraintes individuelles.',
	universal: () => 'Aucune restriction particulière : le domaine est ℝ.',
	empty: () => 'Les contraintes sont incompatibles : le domaine est vide.'
};

/**
 * Supérieur explanations : compact, symbolic.
 */
const SUPERIEUR_EXPLANATIONS: Partial<Record<DomainRule, ExplainFn>> = {
	sqrt_constraint: (step) => step.reasoning ?? '√u défini ⟺ u ≥ 0.',
	ln_constraint: (step) => step.reasoning ?? 'ln u défini ⟺ u > 0.',
	log_constraint: (step) => step.reasoning ?? 'log u défini ⟺ u > 0.',
	division_constraint: (step) => step.reasoning ?? '1/u défini ⟺ u ≠ 0.',
	arcsin_constraint: (step) => step.reasoning ?? 'arcsin u défini ⟺ |u| ≤ 1.',
	arccos_constraint: (step) => step.reasoning ?? 'arccos u défini ⟺ |u| ≤ 1.',
	tan_constraint: (step) => step.reasoning ?? 'tan u défini ⟺ u ≠ π/2 + kπ.',
	cot_constraint: (step) => step.reasoning ?? 'cot u défini ⟺ u ≠ kπ.',
	sec_constraint: (step) => step.reasoning ?? 'sec u défini ⟺ u ≠ π/2 + kπ.',
	csc_constraint: (step) => step.reasoning ?? 'csc u défini ⟺ u ≠ kπ.',
	arccosh_constraint: (step) => step.reasoning ?? 'arccosh u défini ⟺ u ≥ 1.',
	arctanh_constraint: (step) => step.reasoning ?? 'arctanh u défini ⟺ |u| < 1.',
	power_constraint: (step) => step.reasoning ?? 'u⁻ⁿ défini ⟺ u ≠ 0.',
	even_root_constraint: (step) => step.reasoning ?? 'u^(1/2n) défini ⟺ u ≥ 0.',
	intersection: () => 'D = ⋂ contraintes.',
	universal: () => 'Pas de restriction : D = ℝ.',
	empty: () => 'Contraintes incompatibles : D = ∅.'
};

export const EXPLANATIONS: Readonly<
	Record<PedagogicalDomainSchoolLevel, Partial<Record<DomainRule, ExplainFn>>>
> = {
	lycee: LYCEE_EXPLANATIONS,
	superieur: SUPERIEUR_EXPLANATIONS
};

// =============================================================================
// Defaults
// =============================================================================

/**
 * Default title falls back to `step.description` (always populated by the
 * recorder from `DOMAIN_RULE_DESCRIPTIONS`).
 */
export function getDefaultTitle(step: EnhancedDomainStep): string {
	return step.description;
}
