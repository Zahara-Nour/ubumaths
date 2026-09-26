/**
 * Mode « la règle suffit » (`rulesSuffice`) — garde-fou partagé
 * =============================================================
 *
 * Une case en `rulesSuffice` sans aucune règle rendrait toute réponse juste.
 * Ce module dit quelles cases sont dans ce cas ; il sert à `validateTemplate`
 * (générateur, specs) et au schéma Zod strict (éditeur JSON).
 *
 * Types structurels minimaux : le module ne dépend d'aucun autre, pour être
 * importable depuis le schéma Zod sans cycle.
 */

// ============================================================================
// TYPES
// ============================================================================

interface BlankLike {
	rulesSuffice?: boolean;
	validationRules?: readonly unknown[];
}

interface VariationLike {
	blanks?: readonly BlankLike[];
	blankDefaults?: { rulesSuffice?: boolean };
	validationRules?: readonly unknown[];
}

interface SharedLike {
	blankDefaults?: { rulesSuffice?: boolean };
	validationRules?: readonly unknown[];
}

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Index des cases d'une variation en `rulesSuffice` qui n'ont aucune règle,
 * avec les mêmes héritages que le générateur (case → variation → partagé).
 */
export function findRulesSufficeBlanksWithoutRules(
	variation: VariationLike,
	shared?: SharedLike | null
): number[] {
	const blankDefaults = variation.blankDefaults ?? shared?.blankDefaults;
	const inheritedRules = variation.validationRules ?? shared?.validationRules;

	return (variation.blanks ?? []).flatMap((blank, index) => {
		const suffices = blank.rulesSuffice ?? blankDefaults?.rulesSuffice;
		const rules = blank.validationRules ?? inheritedRules;
		return suffices && !(rules && rules.length > 0) ? [index] : [];
	});
}

/** Une instance a-t-elle au moins une case à plusieurs bonnes réponses ? */
export function hasRulesSufficeBlank(instance: { blanks?: readonly BlankLike[] }): boolean {
	return (instance.blanks ?? []).some((blank) => blank.rulesSuffice === true);
}
