/**
 * Demandes de consentement parental — côté serveur
 * ================================================
 *
 * L'adresse d'une demande accordée est celle où part le lien « Mot de passe oublié » d'un
 * enfant (R1). Changer l'adresse d'une demande en attente ne réécrit donc jamais la ligne :
 * le lien déjà parti à l'ancienne adresse l'accorderait à la nouvelle, que personne n'a
 * confirmée (contre-revue de la PR 3). L'ancienne demande est fermée, une nouvelle part.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import { createServerLogger } from '$lib/utils/logger';

// Types

type ConsentStatus = Database['public']['Enums']['consent_status'];

/** `reuse` : même lien renvoyé · `replace` : ancienne fermée + nouvelle · `create` : nouvelle. */
export type ConsentRequestPlan = 'reuse' | 'replace' | 'create';

// Constantes

const logger = createServerLogger('server/parental-consent-requests');

// Functions

/**
 * Renvoi d'une demande (`/api/consent/send-email`) : le même lien ne repart que vers la même
 * adresse. Une autre adresse sur une demande en attente → `replace`.
 */
export function consentRequestPlan(
	latest: { status: ConsentStatus; parent_email: string; expires_at: string } | null,
	parentEmail: string,
	now: Date = new Date()
): ConsentRequestPlan {
	if (!latest || latest.status !== 'pending' || new Date(latest.expires_at) < now) {
		return 'create';
	}
	return latest.parent_email === parentEmail ? 'reuse' : 'replace';
}

/**
 * Ferme une demande EN ATTENTE : statut `expired` ET échéance passée — `grant_parental_consent`
 * ne regarde que l'échéance, le statut seul laisserait le lien valable. Rend `false` si la
 * demande n'est pas (ou plus) en attente, ou si la RLS refuse (zéro ligne, sans erreur).
 */
export async function closePendingConsentRequest(
	supabase: SupabaseClient<Database>,
	requestId: string
): Promise<boolean> {
	const { data, error } = await supabase
		.from('parental_consents')
		.update({ status: 'expired', expires_at: new Date().toISOString() })
		.eq('id', requestId)
		.eq('status', 'pending')
		.select('id');
	if (error) {
		logger.error('Demande de consentement non fermée :', error.message);
		return false;
	}
	return data?.length === 1;
}
