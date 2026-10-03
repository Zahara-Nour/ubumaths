/**
 * Écritures de cartes VIP réservées au serveur
 * =============================================
 *
 * Les routes `api/vip-cards/exchange` et `api/vip-cards/choose` consomment la
 * carte d'action avec le client de l'utilisateur (`use_vip_card`), puis
 * délèguent ici ce que la base refuse aux comptes connectés (migrations
 * 20261003140000 et 20261003150000, Q131 et Q137 b) :
 *
 * - `grant_vip_cards_after_action` défausse ET attribue en UNE transaction :
 *   tout ou rien ;
 * - `restore_vip_card_instance` rend la carte d'action si cette étape échoue ;
 * - la lecture des verrous du marché, que la RLS masque au professeur.
 *
 * ⚠️ Aucun contrôle d'autorisation ici : l'APPELANT a vérifié l'identité de
 * session, la propriété des cartes et la conformité de la carte d'action.
 */
import { z } from 'zod';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import type { Json } from '$lib/types/database';
import { rpcNullable, toJson } from '$lib/types/database-helpers';
import type { VipCardInstance } from '$lib/types/vip-card';

// ============================================================================
// TYPES
// ============================================================================

export type GrantedCard = { cardId: string; instanceId: string };

// ============================================================================
// CONSTANTES
// ============================================================================

const grantResultSchema = z.object({
	success: z.literal(true),
	awarded: z.array(z.object({ card_id: z.string(), instance_id: z.string() }))
});

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Défausse `discardIds` puis attribue `awardCardIds` (`null` = carte tirée au
 * hasard), en une seule transaction. Rend les instances créées, dans l'ordre
 * de `awardCardIds`, ou `null` si la base a tout annulé (rien n'a bougé).
 */
export async function grantVipCardsAfterAction(params: {
	studentId: string;
	/** Carte d'action déjà consommée : la base refuse si elle est engagée sur le marché. */
	actionInstanceId: string;
	discardIds: string[];
	awardCardIds: Array<string | null>;
	source: 'exchange' | 'choose';
	discardMetadata: Json;
	awardMetadata: Json;
}): Promise<GrantedCard[] | null> {
	const { data, error } = await createServiceRoleClient().rpc('grant_vip_cards_after_action', {
		p_student_id: params.studentId,
		p_action_instance_id: params.actionInstanceId,
		p_discard_ids: params.discardIds,
		// Un élément NULL = carte tirée au hasard ; le type généré ignore les NULL.
		p_award_card_ids: params.awardCardIds.map((id) => rpcNullable(id)),
		p_source: params.source,
		p_discard_metadata: params.discardMetadata,
		p_award_metadata: params.awardMetadata
	});

	if (error) {
		console.error('[vip-cards] grant_vip_cards_after_action annulée :', error);
		return null;
	}

	const parsed = grantResultSchema.safeParse(data);
	if (!parsed.success) {
		console.error('[vip-cards] grant_vip_cards_after_action : réponse inattendue', data);
		return null;
	}

	return parsed.data.awarded.map((a) => ({ cardId: a.card_id, instanceId: a.instance_id }));
}

/**
 * Rend à l'élève sa carte d'action, dans l'état lu AVANT `use_vip_card`.
 * `expectedUsedAt` : le `usedAt` rendu par `use_vip_card` (`null` s'il reste
 * des usages). La base ne restaure que si la carte est EXACTEMENT dans l'état
 * laissé par cet appel : une défausse ou un usage concurrent n'est pas écrasé.
 * Rend `true` si la carte a été restaurée.
 */
export async function restoreActionCard(
	studentId: string,
	instanceId: string,
	snapshot: VipCardInstance,
	expectedUsedAt: string | null
): Promise<boolean> {
	const { data, error } = await createServiceRoleClient().rpc('restore_vip_card_instance', {
		p_student_id: studentId,
		p_instance_id: instanceId,
		p_snapshot: toJson(snapshot),
		p_expected_used_at: rpcNullable(expectedUsedAt)
	});

	if (error || data !== true) {
		console.error('[vip-cards] carte d’action NON rendue :', {
			studentId,
			instanceId,
			error,
			data
		});
		return false;
	}
	return true;
}

/**
 * Instances engagées sur le marché parmi `instanceIds`. Lue par le client
 * service : sous RLS, le professeur ne voit pas les verrous de ses élèves et
 * lirait « aucun verrou ».
 */
export async function findLockedCardInstances(
	studentId: string,
	instanceIds: string[]
): Promise<string[]> {
	const { data, error } = await createServiceRoleClient()
		.from('marketplace_locked_cards')
		.select('card_instance_id')
		.eq('student_id', studentId)
		.in('card_instance_id', instanceIds);

	if (error) {
		console.error('[vip-cards] verrous du marché illisibles :', error);
		throw error;
	}
	return (data ?? []).map((row) => row.card_instance_id);
}
