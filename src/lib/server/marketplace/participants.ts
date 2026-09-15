/**
 * Qui est en face, au marché
 *
 * ⚠️ Le marché est à l'échelle de l'ÉCOLE, alors que depuis `20260915580000`
 * un élève ne lit plus que lui-même, ses camarades ACTIFS, ses amis, ses
 * co-participants de tournoi et le personnel. Les jointures qui résolvent les
 * personnes — `creator:creator_id(...)`, `proposer:profiles!...` — rendent donc
 * `null` pour presque tout le monde.
 *
 * Et sans erreur : tous les accès sont en `?.` et retombent sur « Anonyme ».
 * Rien ne casse, rien n'est signalé, et l'élève accepte un échange avec
 * quelqu'un qu'il ne peut pas nommer.
 *
 * Mesuré avant d'écrire ce module : 949 couples annonce × élève sur 1040
 * auraient affiché « Anonyme », et 10 propositions sur 31.
 *
 * ⚠️ On COMPLÈTE la jointure, on ne la remplace pas : quand elle réussit, elle
 * rend l'état civil que l'intéressé a déjà le droit de voir. La fonction ne
 * sert qu'aux trous, et elle rend un nom PSEUDONYMISÉ.
 *
 * @module server/marketplace/participants
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/** Le nom d'affichage d'un participant, tel que la fonction bornée le rend. */
export type Participant = { id: string; display_name: string; avatar_url: string | null };

/**
 * Les participants demandés, par identifiant.
 *
 * Rend une table VIDE en cas de panne, jamais une exception : un nom manquant
 * dégrade l'affichage, il ne doit pas faire échouer la page du marché.
 */
export async function fetchParticipants(
	supabase: SupabaseClient<Database>,
	ids: string[]
): Promise<Map<string, Participant>> {
	const uniques = [...new Set(ids.filter(Boolean))];
	if (uniques.length === 0) return new Map();

	const { data, error } = await supabase.rpc('resolve_marketplace_participants', {
		p_user_ids: uniques
	});

	if (error) {
		console.error('[marketplace] Participants illisibles :', error);
		return new Map();
	}

	return new Map((data ?? []).map((p) => [p.id, p]));
}

/**
 * Complète un participant que la jointure n'a pas pu résoudre.
 *
 * ⚠️ `username` est le champ que les écrans affichent. On y met le nom
 * pseudonymisé, pas l'état civil : celui qui a le droit de voir le vrai nom
 * l'obtient déjà par la jointure, qui a priorité.
 */
export function completerParticipant<T extends { id: string; username: string } | null | undefined>(
	joint: T,
	id: string | null | undefined,
	annuaire: Map<string, Participant>
): { id: string; username: string; avatar_url: string | null } | undefined {
	if (joint) return joint as { id: string; username: string; avatar_url: string | null };
	if (!id) return undefined;

	const repli = annuaire.get(id);
	if (!repli) return undefined;

	return { id: repli.id, username: repli.display_name, avatar_url: repli.avatar_url };
}
