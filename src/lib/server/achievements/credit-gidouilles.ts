/**
 * Versement des gidouilles d'un succès-jalon (Q146, Q156)
 * ======================================================
 *
 * Les jalons de jeux (2048, Mathémo) sont enregistrés par leurs routes, pas
 * par `process_achievement_event`. Ils créditent ici par la MÊME fonction que
 * les succès : `update_student_gidouilles` à 5 arguments, qui crédite le profil
 * et écrit `gidouilles_activity` (→ `reward_events`), avec le même libellé
 * « Succès : <nom> » et la classe active de l'élève.
 *
 * La version à 2 arguments refusait toujours le client service (elle exige un
 * prof connecté) : ces gidouilles n'étaient jamais versées.
 *
 * À appeler avec le client SERVICE, après que l'appelant a vérifié l'identité
 * de session et inséré la ligne `student_achievements` (une seule fois).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/** Paramètres de la surcharge à 5 arguments. `p_class_id` accepte NULL en SQL
 * (élève hors classe), ce que le générateur de types ne dit pas. */
type CreditParams = {
	p_student_id: string;
	p_class_id: string | null;
	p_delta: number;
	p_reason: string;
	p_created_by: string | null;
};

/**
 * Verse `amount` gidouilles pour le succès `achievementName`.
 * Rend l'erreur éventuelle (lecture de la classe ou crédit), `null` sinon.
 */
export async function creditAchievementGidouilles(
	admin: SupabaseClient<Database>,
	studentId: string,
	amount: number,
	achievementName: string
): Promise<unknown> {
	// Classe active la plus récente, comme process_achievement_event.
	const { data: membership, error: membershipError } = await admin
		.from('class_members')
		.select('class_id')
		.eq('student_id', studentId)
		.eq('status', 'active')
		.order('joined_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (membershipError) return membershipError;

	const params: CreditParams = {
		p_student_id: studentId,
		p_class_id: membership?.class_id ?? null,
		p_delta: amount,
		p_reason: `Succès : ${achievementName}`,
		p_created_by: null
	};

	// Appel de MÉTHODE (rpc lit `this`) sur un client re-typé pour la surcharge.
	const client = admin as unknown as {
		rpc: (fn: 'update_student_gidouilles', params: CreditParams) => PromiseLike<{ error: unknown }>;
	};
	const { error } = await client.rpc('update_student_gidouilles', params);

	return error ?? null;
}
