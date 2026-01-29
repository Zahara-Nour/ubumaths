/**
 * Domain Rule Descriptions (French)
 *
 * Human-readable descriptions for each domain computation rule.
 * Used for pedagogical display in the enhanced step recorder.
 *
 * @module mathAST/domain/step-descriptions
 */

import type { DomainRule } from './enhanced-step-types';

/**
 * French descriptions for each domain computation rule.
 * Keys are rule identifiers, values are human-readable descriptions.
 */
export const DOMAIN_RULE_DESCRIPTIONS: Readonly<Record<DomainRule, string>> = {
	// ==========================================================================
	// Constraint Rules
	// ==========================================================================
	sqrt_constraint: 'La racine carrée nécessite un argument positif ou nul (√u définie si u ≥ 0)',
	ln_constraint: 'Le logarithme nécessite un argument strictement positif (ln(u) défini si u > 0)',
	log_constraint:
		'Le logarithme nécessite un argument strictement positif (log(u) défini si u > 0)',
	division_constraint: 'La division nécessite un dénominateur non nul (u/v défini si v ≠ 0)',
	arcsin_constraint:
		"L'arc sinus nécessite un argument dans [-1, 1] (arcsin(u) défini si -1 ≤ u ≤ 1)",
	arccos_constraint:
		"L'arc cosinus nécessite un argument dans [-1, 1] (arccos(u) défini si -1 ≤ u ≤ 1)",
	tan_constraint: 'La tangente nécessite un argument différent de π/2 + kπ (tan(x) ≠ π/2 + kπ)',
	cot_constraint: 'La cotangente nécessite un argument différent de kπ (cot(x) ≠ kπ)',
	sec_constraint: 'La sécante nécessite un argument différent de π/2 + kπ (sec(x) ≠ π/2 + kπ)',
	csc_constraint: 'La cosécante nécessite un argument différent de kπ (csc(x) ≠ kπ)',
	power_constraint: 'Une puissance négative nécessite une base non nulle (u⁻ⁿ défini si u ≠ 0)',
	even_root_constraint:
		'Une racine paire nécessite un argument positif ou nul (u^(1/2n) défini si u ≥ 0)',
	acosh_constraint: "L'argument cosinus hyperbolique nécessite u ≥ 1 (acosh(u) défini si u ≥ 1)",
	atanh_constraint:
		"L'argument tangente hyperbolique nécessite |u| < 1 (atanh(u) défini si -1 < u < 1)",

	// ==========================================================================
	// Operation Rules
	// ==========================================================================
	intersection:
		'Intersection des contraintes (domaine final = intersection de toutes les conditions)',
	union: 'Union des domaines (réunion de plusieurs intervalles)',
	complement: 'Complémentaire du domaine',
	difference: 'Différence de domaines',

	// ==========================================================================
	// Preimage Rules
	// ==========================================================================
	preimage_linear: "Résolution de l'inéquation linéaire (ax + b ≥ c → x ≥ (c-b)/a)",
	preimage_quadratic: "Résolution de l'inéquation du second degré",
	preimage_cubic: "Résolution de l'inéquation du troisième degré",
	preimage_general: "Analyse de l'antécédent (préimage) de la contrainte",

	// ==========================================================================
	// Composition Rules
	// ==========================================================================
	composition: 'Analyse de la composition de fonctions (f∘g nécessite g(x) dans le domaine de f)',
	composition_range_analysis: "Analyse de l'image de la fonction intérieure",

	// ==========================================================================
	// Simplification Rules
	// ==========================================================================
	simplification: 'Simplification du domaine',
	merge_intervals: "Fusion d'intervalles adjacents ou qui se chevauchent",
	remove_redundant: 'Suppression des contraintes redondantes',

	// ==========================================================================
	// Special Cases
	// ==========================================================================
	universal: 'Aucune restriction - domaine universel (ℝ)',
	empty: 'Domaine vide - aucune valeur ne satisfait les contraintes',
	periodic_exclusion: 'Exclusion périodique de points'
};

/**
 * Gets the description for a domain rule, with fallback.
 *
 * @param rule - The rule identifier
 * @returns French description or fallback string
 *
 * @example
 * getDomainRuleDescription('sqrt_constraint')
 * // Returns: "La racine carrée nécessite un argument positif ou nul (√u définie si u ≥ 0)"
 *
 * getDomainRuleDescription('unknown-rule' as DomainRule)
 * // Returns: "Règle: unknown-rule"
 */
export function getDomainRuleDescription(rule: DomainRule): string {
	return DOMAIN_RULE_DESCRIPTIONS[rule] ?? `Règle: ${rule}`;
}

/**
 * Templates for generating contextual explanations.
 * Use with string interpolation to create specific messages.
 */
export const DOMAIN_RULE_TEMPLATES: Readonly<Record<DomainRule, string>> = {
	sqrt_constraint: 'Pour que √({expr}) soit définie, il faut {expr} ≥ 0',
	ln_constraint: 'Pour que ln({expr}) soit défini, il faut {expr} > 0',
	log_constraint: 'Pour que log({expr}) soit défini, il faut {expr} > 0',
	division_constraint: 'Pour que la division soit définie, il faut {expr} ≠ 0',
	arcsin_constraint: 'Pour que arcsin({expr}) soit défini, il faut -1 ≤ {expr} ≤ 1',
	arccos_constraint: 'Pour que arccos({expr}) soit défini, il faut -1 ≤ {expr} ≤ 1',
	tan_constraint: 'Pour que tan({expr}) soit définie, il faut {expr} ≠ π/2 + kπ',
	cot_constraint: 'Pour que cot({expr}) soit définie, il faut {expr} ≠ kπ',
	sec_constraint: 'Pour que sec({expr}) soit définie, il faut {expr} ≠ π/2 + kπ',
	csc_constraint: 'Pour que csc({expr}) soit définie, il faut {expr} ≠ kπ',
	power_constraint: 'Pour que ({expr})⁻ⁿ soit définie, il faut {expr} ≠ 0',
	even_root_constraint: 'Pour que ({expr})^(1/2n) soit définie, il faut {expr} ≥ 0',
	acosh_constraint: 'Pour que acosh({expr}) soit défini, il faut {expr} ≥ 1',
	atanh_constraint: 'Pour que atanh({expr}) soit défini, il faut -1 < {expr} < 1',
	intersection: "Le domaine final est l'intersection de toutes les contraintes",
	union: 'Le domaine est la réunion des intervalles {intervals}',
	complement: 'On prend le complémentaire du domaine',
	difference: 'On retire {excluded} du domaine',
	preimage_linear: 'On résout {expr} {op} {bound}',
	preimage_quadratic: 'On résout {expr} {op} {bound} (équation du second degré)',
	preimage_cubic: 'On résout {expr} {op} {bound} (équation du troisième degré)',
	preimage_general:
		"On détermine les valeurs de {var} telles que {expr} appartienne à l'ensemble requis",
	composition:
		'Pour f∘g, on analyse les valeurs de {var} telles que g({var}) soit dans le domaine de f',
	composition_range_analysis:
		"L'image de {inner} est {range}, on vérifie la compatibilité avec {outer}",
	simplification: 'On simplifie le domaine en {result}',
	merge_intervals: 'On fusionne les intervalles {intervals} en {result}',
	remove_redundant: 'On supprime les contraintes redondantes',
	universal: 'Aucune restriction particulière, le domaine est ℝ',
	empty: 'Les contraintes sont incompatibles, le domaine est vide',
	periodic_exclusion: 'On exclut les points {base} + k×{period} pour tout k ∈ ℤ'
};

/**
 * Apply a template with the given values.
 *
 * @param rule - The rule to get the template for
 * @param values - Key-value pairs to substitute in the template
 * @returns The filled template string
 *
 * @example
 * applyDomainRuleTemplate('sqrt_constraint', { expr: 'x - 2' })
 * // Returns: "Pour que √(x - 2) soit définie, il faut x - 2 ≥ 0"
 */
export function applyDomainRuleTemplate(rule: DomainRule, values: Record<string, string>): string {
	let template = DOMAIN_RULE_TEMPLATES[rule];
	for (const [key, value] of Object.entries(values)) {
		template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
	}
	return template;
}
