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

export const FORM_MESSAGE_PLACEHOLDER =
	'Message si la forme n’est pas respectée (ex: le reste doit être plus petit que {{b}}) — facultatif';

/** Message de forme écrit par l'auteur ('' s'il n'y en a pas, outils-manquants n° 75) */
export function messageOf(requiredForm: RequiredForm | undefined): string {
	return requiredForm && typeof requiredForm === 'object' ? (requiredForm.message ?? '') : '';
}

/** Forme exigée par motif, avec son motif `acceptable` et son message s'ils sont renseignés */
export function customRequiredForm(
	pattern: string,
	acceptable: string,
	message = ''
): RequiredForm {
	return {
		pattern: pattern.trim(),
		...(acceptable.trim() && { acceptable: acceptable.trim() }),
		...(message.trim() && { message: message.trim() })
	};
}
