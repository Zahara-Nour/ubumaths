/**
 * La décision d'accès à une affectation de fiche
 * ===============================================
 *
 * Deux droits distincts, et c'est tout l'objet de ce module :
 *
 *   - ÉCRIRE — répondre, signaler une erreur. Gardé par `can_access_assignment`,
 *     qui exige une adhésion ACTIVE à une classe destinataire (ou d'être nommé
 *     individuellement). C'est la fonction que les policies d'écriture lisent ;
 *     elle ne doit jamais être élargie ici.
 *   - RELIRE — l'ancien membre d'une classe quittée revient sur ce qui lui
 *     avait été distribué. `can_read_assignment` y ajoute ce cas, sous les
 *     mêmes gardes de statut et de disponibilité.
 *
 * Le second appel n'est fait que si le premier a refusé : un élève en cours
 * d'année ne paie pas un aller-retour de plus.
 */

import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

export interface AssignmentAccess {
	/** L'affectation est lisible, à un titre ou à un autre. */
	canRead: boolean;
	/** Lisible mais NON modifiable : ancien membre revenant sur son travail. */
	readOnly: boolean;
}

/**
 * Résout les droits de l'appelant sur une affectation.
 *
 * Ne renvoie jamais un refus par défaut sur panne : une base injoignable lève
 * un 500. Confondre les deux ferait répondre « devoir introuvable » à un élève
 * dont le devoir existe — un message qui accuse la donnée plutôt que la panne.
 */
export async function resolveAssignmentAccess(
	supabase: SupabaseClient<Database>,
	assignmentId: string
): Promise<AssignmentAccess> {
	const { data: canWrite, error: canWriteError } = await supabase.rpc('can_access_assignment', {
		p_assignment_id: assignmentId
	});

	// PGRST116 = aucune ligne, ce que la suite traite déjà comme un refus.
	if (canWriteError && canWriteError.code !== 'PGRST116') {
		console.error('Contrôle d’accès impossible :', canWriteError);
		throw error(500, 'Impossible de vérifier votre accès');
	}

	if (canWrite === true) {
		return { canRead: true, readOnly: false };
	}

	const { data: canRead, error: canReadError } = await supabase.rpc('can_read_assignment', {
		p_assignment_id: assignmentId
	});

	if (canReadError && canReadError.code !== 'PGRST116') {
		console.error('Contrôle de lecture impossible :', canReadError);
		throw error(500, 'Impossible de vérifier votre accès');
	}

	return { canRead: canRead === true, readOnly: canRead === true };
}
