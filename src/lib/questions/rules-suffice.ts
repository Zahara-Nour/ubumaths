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

interface InstanceBlankLike extends BlankLike {
	type?: string;
	unit?: { expected: boolean };
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

/**
 * Mode « la règle suffit » actif sur une case d'INSTANCE : il faut le réglage
 * ET au moins une règle, sur une case mathématique sans unité (les règles sont
 * numériques). Sinon, on retombe sur la comparaison à `expectedAnswer` —
 * jamais sur « toute réponse est juste ».
 */
export function rulesDecide(blank: InstanceBlankLike): boolean {
	return (
		blank.rulesSuffice === true &&
		(blank.validationRules?.length ?? 0) > 0 &&
		blank.type !== 'text' &&
		!blank.unit?.expected
	);
}

/** Une instance a-t-elle au moins une case à plusieurs bonnes réponses ? */
export function hasRulesSufficeBlank(instance: { blanks?: readonly InstanceBlankLike[] }): boolean {
	return (instance.blanks ?? []).some(rulesDecide);
}
