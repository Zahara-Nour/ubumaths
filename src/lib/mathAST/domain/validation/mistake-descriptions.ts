/**
 * Mistake Descriptions (French)
 *
 * Human-readable descriptions and correction templates for each mistake type.
 * Used for providing pedagogical feedback to students.
 *
 * @module mathAST/domain/validation/mistake-descriptions
 */

import type { DomainMistakeType } from './mistake-types';

// =============================================================================
// Mistake Descriptions
// =============================================================================

/**
 * Descriptions and correction templates for each mistake type.
 */
export const MISTAKE_DESCRIPTIONS: Readonly<
	Record<
		DomainMistakeType,
		{
			description: string;
			correctionTemplate: string;
		}
	>
> = {
	// ==========================================================================
	// Forgetting constraints
	// ==========================================================================
	forgot_denominator: {
		description: "Tu as oublié d'exclure les valeurs qui annulent le dénominateur.",
		correctionTemplate:
			"Le dénominateur {expr} s'annule pour {values}. Ces valeurs doivent être exclues du domaine."
	},
	forgot_sqrt_constraint: {
		description: 'Tu as oublié que la racine carrée nécessite un argument positif ou nul.',
		correctionTemplate: 'Pour que √({expr}) soit définie, il faut {expr} ≥ 0.'
	},
	forgot_ln_constraint: {
		description: 'Tu as oublié que le logarithme nécessite un argument strictement positif.',
		correctionTemplate: 'Pour que ln({expr}) soit défini, il faut {expr} > 0.'
	},
	forgot_arcsin_constraint: {
		description: 'Tu as oublié que arc sinus/cosinus nécessite un argument dans [-1, 1].',
		correctionTemplate: 'Pour que {func}({expr}) soit défini, il faut -1 ≤ {expr} ≤ 1.'
	},
	forgot_tan_constraint: {
		description: "Tu as oublié d'exclure les valeurs où la tangente n'est pas définie.",
		correctionTemplate: "La tangente n'est pas définie pour {expr} = π/2 + kπ (k entier)."
	},
	forgot_power_constraint: {
		description: "Tu as oublié qu'une puissance négative nécessite une base non nulle.",
		correctionTemplate: 'Pour que ({expr})⁻ⁿ soit définie, il faut {expr} ≠ 0.'
	},

	// ==========================================================================
	// Boundary errors
	// ==========================================================================
	wrong_inequality_direction: {
		description: "Le sens de l'inégalité est incorrect.",
		correctionTemplate: 'Tu as écrit {incorrect}, mais la contrainte correcte est {correct}.'
	},
	wrong_bound_value: {
		description: 'La valeur de la borne est incorrecte.',
		correctionTemplate:
			'Tu as trouvé {incorrect} comme borne, mais la valeur correcte est {correct}.'
	},
	included_instead_excluded: {
		description: 'Tu as inclus une borne qui devrait être exclue.',
		correctionTemplate:
			'La borne {value} ne doit pas être incluse. Utilise {open} au lieu de {closed}.'
	},
	excluded_instead_included: {
		description: 'Tu as exclu une borne qui devrait être incluse.',
		correctionTemplate: 'La borne {value} devrait être incluse. Utilise {closed} au lieu de {open}.'
	},

	// ==========================================================================
	// Set operation errors
	// ==========================================================================
	missing_union_part: {
		description: 'Il manque une partie de la réunion dans ta réponse.',
		correctionTemplate: "Tu as oublié l'intervalle {missing}. Le domaine complet est {full}."
	},
	extra_restriction: {
		description: "Tu as ajouté une restriction qui n'est pas nécessaire.",
		correctionTemplate: "La restriction {extra} n'est pas nécessaire pour cette expression."
	},
	wrong_excluded_point: {
		description: "Tu as exclu un point qui ne devrait pas l'être.",
		correctionTemplate: 'Le point {point} ne doit pas être exclu du domaine.'
	},
	missed_excluded_point: {
		description: "Tu as oublié d'exclure un point.",
		correctionTemplate: 'Le point {point} doit être exclu car {reason}.'
	},

	// ==========================================================================
	// Complex expression errors
	// ==========================================================================
	periodic_not_recognized: {
		description: "Tu n'as pas correctement géré les exclusions périodiques.",
		correctionTemplate: 'Pour {func}, il faut exclure tous les points de la forme {pattern}.'
	},
	composition_error: {
		description: "Erreur dans l'analyse de la fonction composée.",
		correctionTemplate:
			'Pour la composition {outer}∘{inner}, il faut que {inner}(x) soit dans le domaine de {outer}.'
	},
	nested_constraint_error: {
		description: 'Erreur avec les contraintes imbriquées.',
		correctionTemplate: "L'expression {expr} combine plusieurs contraintes : {constraints}."
	},

	// ==========================================================================
	// Algebraic errors
	// ==========================================================================
	algebraic_error: {
		description: 'Erreur algébrique dans la résolution de la contrainte.',
		correctionTemplate:
			'En résolvant {equation}, tu as fait une erreur. La solution est {solution}.'
	},
	sign_error: {
		description: "Erreur de signe dans la résolution de l'inégalité.",
		correctionTemplate:
			"Attention : en divisant par un nombre négatif, le sens de l'inégalité s'inverse."
	},

	// ==========================================================================
	// Format/notation errors
	// ==========================================================================
	notation_error: {
		description: "Problème de notation (cela n'affecte pas la correction mathématique).",
		correctionTemplate: 'Note : la notation standard est {standard}.'
	}
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the description for a mistake type.
 *
 * @param type - The mistake type
 * @returns French description of the mistake
 */
export function getMistakeDescription(type: DomainMistakeType): string {
	return MISTAKE_DESCRIPTIONS[type].description;
}

/**
 * Get the correction template for a mistake type.
 *
 * @param type - The mistake type
 * @returns French correction template
 */
export function getMistakeCorrectionTemplate(type: DomainMistakeType): string {
	return MISTAKE_DESCRIPTIONS[type].correctionTemplate;
}

/**
 * Apply a correction template with the given values.
 *
 * @param type - The mistake type
 * @param values - Key-value pairs to substitute in the template
 * @returns The filled correction string
 *
 * @example
 * ```typescript
 * applyMistakeCorrectionTemplate('forgot_sqrt_constraint', { expr: 'x - 2' });
 * // "Pour que √(x - 2) soit définie, il faut x - 2 ≥ 0."
 * ```
 */
export function applyMistakeCorrectionTemplate(
	type: DomainMistakeType,
	values: Record<string, string>
): string {
	let template = MISTAKE_DESCRIPTIONS[type].correctionTemplate;
	for (const [key, value] of Object.entries(values)) {
		template = template.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
	}
	return template;
}
