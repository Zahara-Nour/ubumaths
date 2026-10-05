import type { RequiredForm } from './types';

export const REQUIRED_FORM_OPTIONS = [
	{ value: '', label: 'Aucune' },
	{ value: 'product', label: 'Produit' },
	{ value: 'sum', label: 'Somme' },
	{ value: 'additionOnly', label: 'Somme sans soustraction' },
	{ value: 'fraction', label: 'Fraction' },
	{ value: 'power', label: 'Puissance' },
	// Formes d'une équation (case « équation » : droite, cercle)
	{ value: 'reduite', label: 'Équation réduite (y = mx + p)' },
	{ value: 'cartesienne', label: 'Équation cartésienne (ax + by + c = 0)' },
	{ value: 'centre-rayon', label: 'Équation centre-rayon ((x − a)² + (y − b)² = r²)' },
	// Formes d'un nombre complexe
	{ value: 'exponentielle', label: 'Complexe : forme exponentielle (re^{iθ}, r > 0)' },
	{ value: 'algebrique', label: 'Complexe : forme algébrique (a + ib)' },
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
