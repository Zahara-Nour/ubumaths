import type { RequiredForm } from './types';

export const REQUIRED_FORM_OPTIONS = [
	{ value: '', label: 'Aucune' },
	{ value: 'product', label: 'Produit' },
	{ value: 'sum', label: 'Somme' },
	{ value: 'additionOnly', label: 'Somme sans soustraction' },
	{ value: 'fraction', label: 'Fraction' },
	{ value: 'power', label: 'Puissance' },
	{ value: 'custom', label: 'Pattern personnalisé' }
] as const;

export const ACCEPTABLE_PLACEHOLDER = 'Forme acceptable, perfectible (ex: u*v) — facultatif';

/** Motif `acceptable` d'une forme exigée ('' s'il n'y en a pas) */
export function acceptableOf(requiredForm: RequiredForm | undefined): string {
	return requiredForm && typeof requiredForm === 'object' ? (requiredForm.acceptable ?? '') : '';
}

/** Forme exigée par motif, avec son motif `acceptable` s'il est renseigné */
export function customRequiredForm(pattern: string, acceptable: string): RequiredForm {
	return acceptable.trim()
		? { pattern: pattern.trim(), acceptable: acceptable.trim() }
		: { pattern: pattern.trim() };
}
