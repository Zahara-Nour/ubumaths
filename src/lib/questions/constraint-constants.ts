import type { ConstraintId } from './types';

export const CONSTRAINT_IDS: ConstraintId[] = [
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
	'unit'
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
	unit: 'Unité'
};

export const CONSTRAINT_MODE_OPTIONS = [
	{ value: '', label: 'Défaut (warn)' },
	{ value: 'strict', label: 'Strict' },
	{ value: 'warn', label: 'Avertissement' },
	{ value: 'off', label: 'Désactivé' }
] as const;
