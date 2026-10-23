import type { ConfigurableConstraintId, ConstraintId } from './types';
import { DEFAULT_CONSTRAINT_MODE, DEFAULT_FORM_CONSTRAINT_MODE } from './types';
import { SUPERFLU_RULE_IDS, bySuperfluRule } from '$lib/mathAST/superflu/rules';

/** Contraintes réglables par modèle (`rounding`, toujours exigée, n'en est pas) */
export const CONSTRAINT_IDS: ConfigurableConstraintId[] = [
	// Règles de superflu, dans l'ordre de leur registre (`mathAST/superflu/rules.ts`)
	...SUPERFLU_RULE_IDS,
	'form',
	'percent',
	'unit',
	'intervalForm'
];

export const CONSTRAINT_LABELS: Record<ConstraintId, string> = {
	// Règles de superflu : libellé tiré de leur fiche
	...bySuperfluRule((rule) => rule.label),
	form: 'Forme générale',
	percent: 'Pourcentage',
	unit: 'Unité',
	intervalForm: 'Écriture d’un ensemble (intervalles)',
	rounding: 'Arrondi demandé'
};

export const CONSTRAINT_MODE_OPTIONS = [
	{ value: '', label: 'Défaut (warn)' },
	{ value: 'strict', label: 'Strict' },
	{ value: 'warn', label: 'Avertissement' },
	{ value: 'off', label: 'Désactivé' }
] as const;

/**
 * Choix proposés pour une contrainte, avec le libellé de SON défaut : `form`
 * est `strict` par défaut, les autres `warn` (ADR 0013).
 */
export function constraintModeOptions(id: ConstraintId): { value: string; label: string }[] {
	const defaultMode = id === 'form' ? DEFAULT_FORM_CONSTRAINT_MODE : DEFAULT_CONSTRAINT_MODE;
	return CONSTRAINT_MODE_OPTIONS.map((option) =>
		option.value === '' ? { value: '', label: `Défaut (${defaultMode})` } : { ...option }
	);
}
