import type { ConfigurableConstraintId, ConstraintId } from './types';
import { DEFAULT_CONSTRAINT_MODE, DEFAULT_FORM_CONSTRAINT_MODE } from './types';

/** Contraintes réglables par modèle (`rounding`, toujours exigée, n'en est pas) */
export const CONSTRAINT_IDS: ConfigurableConstraintId[] = [
	'spaces',
	'products',
	'brackets',
	'zeros',
	'form',
	'nullTerms',
	'factorOne',
	'factorZero',
	'signs',
	'reducedFractions',
	'reducedRadicals',
	'percent',
	'unit',
	'intervalForm'
];

export const CONSTRAINT_LABELS: Record<ConstraintId, string> = {
	spaces: 'Espaces',
	products: 'Symbole de multiplication',
	brackets: 'Parenthèses',
	zeros: 'Zéros inutiles',
	form: 'Forme générale',
	nullTerms: 'Termes nuls (x + 0)',
	factorOne: 'Facteur 1 (1 * x)',
	factorZero: 'Facteur 0 (0 * x)',
	signs: 'Signes (-- = +)',
	reducedFractions: 'Fractions irréductibles',
	reducedRadicals: 'Racines simplifiées',
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
