/**
 * Endpoint API : choisir des cartes VIP
 * =====================================
 *
 * Permet de choisir les cartes VIP à recevoir grâce à une carte d'action
 * `choose_card`, consommée quand le choix aboutit.
 *
 * POST /api/vip-cards/choose
 *
 * SÉCURITÉ :
 * - authentification requise : l'élève pour lui-même, ou le professeur / admin
 *   pour un élève de ses classes (contrôle `class_members`) ;
 * - entrée validée par Zod ;
 * - la carte d'action existe, est inutilisée, non engagée sur le marché et
 *   porte une action `choose_card` ;
 * - les cartes choisies existent, sont activées et respectent les filtres ;
 * - la carte d'action est consommée EN PREMIER (`use_vip_card`, FOR UPDATE) :
 *   de deux requêtes concurrentes, une seule attribue des cartes ;
 * - l'attribution passe par `grant_vip_cards_after_action`, réservée au
 *   serveur (migration 20261003150000, Q137 b) : toutes les cartes ou aucune.
 *   Si elle échoue, la carte d'action est rendue (`restore_vip_card_instance`).
 *
 * DÉROULÉ :
 * 1. Valider la requête (Zod)
 * 2. Vérifier l'authentification et les droits
 * 3. Lire l'inventaire de l'élève
 * 4. Carte d'action : existante, inutilisée, non verrouillée
 * 5. Nombre de cartes choisies = action.count
 * 6. Cartes choisies conformes aux filtres (all / maxRarity / possibleCardIds)
 * 7. Consommer la carte d'action
 * 8. Attribuer les cartes (client service) ; en cas d'échec, rendre la carte d'action
 * 9. Répondre avec les cartes reçues
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { requireConsent } from '$lib/server/middleware/consent';
import { chooseCardsSchema } from '$lib/server/validation/choose-cards';
import type { VipCardAction } from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import { getTemplatesByIds, getTemplateById } from '$lib/server/vip-card-queries';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { validateActivationContext } from '$lib/server/vip-card-context';
import { asStudentVipCards } from '$lib/types/vip-card';
import {
	findLockedCardInstances,
	grantVipCardsAfterAction,
	restoreActionCard
} from '$lib/server/vip-card-grants';

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Authentification requise
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Lecture et validation du corps de la requête
	const body = await request.json();
	const validation = chooseCardsSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Autorisation : le professeur pour son élève, ou l'élève pour lui-même
	const isTeacher = profile.role === 'teacher' || profile.role === 'admin';
	const isStudent = user.id === data.studentId;

	if (isTeacher) {
		// Le professeur doit enseigner à cet élève
		const hasAccess = await verifyTeacherStudentWithRole(
			user.id,
			data.studentId,
			profile,
			supabase
		);
		if (!hasAccess) {
			throw error(403, 'You can only choose cards for students in your classes');
		}
	} else if (!isStudent) {
		// Ni professeur, ni l'élève lui-même
		throw error(403, 'You can only choose cards for yourself or your students');
	} else {
		// Élève : consentement requis
		requireConsent(profile, 'purchase_items');
	}
	// Pour l'élève, l'approbation de la carte est vérifiée après sa lecture

	// Inventaire de l'élève
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', data.studentId)
		.single();

	if (fetchError) {
		console.error('[choose] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = asStudentVipCards(studentProfile.vip_cards);

	// La carte d'action existe et n'est pas utilisée
	const actionCardInstance = vipCards[data.actionCardInstanceId];
	if (!actionCardInstance) {
		throw error(404, `Action card instance not found: ${data.actionCardInstanceId}`);
	}
	if (actionCardInstance.usedAt) {
		throw error(400, `Action card already used: ${data.actionCardInstanceId}`);
	}

	// Modèle de la carte d'action (contexte d'activation et action)
	const actionCard = await getTemplateById(supabase, actionCardInstance.cardId);
	if (!actionCard) {
		throw error(404, `Action card definition not found: ${actionCardInstance.cardId}`);
	}

	// Élève : approbation du professeur OU contexte d'activation valide
	if (isStudent && !actionCardInstance.activationApprovedAt) {
		const actionContext = (actionCard.action as VipCardAction | null)?.context;
		if (actionContext) {
			const contextValid = await validateActivationContext(actionContext, supabase, data.studentId);
			if (!contextValid) {
				throw error(400, 'Cette carte ne peut être activée que dans un contexte spécifique');
			}
		} else {
			throw error(400, 'This card must be approved by a teacher before use.');
		}
	}

	// La carte porte une action choose_card
	if (!actionCard.action || actionCard.action.type !== 'choose_card') {
		throw error(400, `Card "${actionCard.name}" does not have a choose_card action`);
	}

	const chooseAction = actionCard.action;

	// Nombre de cartes choisies
	if (data.chosenCardIds.length !== chooseAction.count) {
		throw error(
			400,
			`Must choose exactly ${chooseAction.count} card${chooseAction.count > 1 ? 's' : ''}, got ${data.chosenCardIds.length}`
		);
	}

	// Cartes choisies conformes aux filtres
	const templatesMap = await validateChosenCards(supabase, data.chosenCardIds, chooseAction);

	// Une carte engagée sur le marché ne peut pas être consommée. Lecture par le
	// client service : sous RLS, le professeur ne voit pas les verrous de ses
	// élèves et lirait « aucun verrou ».
	const lockedIds = await findLockedCardInstances(data.studentId, [
		data.actionCardInstanceId
	]).catch(() => {
		throw error(500, 'Failed to verify marketplace lock status');
	});
	if (lockedIds.length > 0) {
		throw error(400, 'Cette carte est engagée sur le marché et ne peut pas être utilisée');
	}

	// Consommer la carte d'action EN PREMIER. `use_vip_card` verrouille le profil
	// (FOR UPDATE) et refuse une carte déjà utilisée : de deux requêtes
	// concurrentes, une seule attribue des cartes. Appelée avec le client de
	// l'utilisateur : elle revérifie elle-même propriétaire / professeur.
	const { data: useResult, error: useError } = await supabase.rpc('use_vip_card', {
		p_student_id: data.studentId,
		p_instance_id: data.actionCardInstanceId,
		p_metadata: {
			action_type: 'choose_card',
			cards_chosen: data.chosenCardIds
		}
	});

	if (useError) {
		console.error('[choose] RPC use_vip_card error:', useError);
		throw error(500, `Failed to mark action card as used: ${useError.message}`);
	}

	// `usedAt` : posé par `use_vip_card` quand la carte n'a plus d'usage (sinon
	// null) ; la restitution exige de retrouver exactement cette valeur.
	const rpcResult = useResult as { success: boolean; error?: string; usedAt?: string | null };
	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to mark action card as used');
	}

	// Attribuer toutes les cartes ou aucune (serveur seul, Q137 b). En cas
	// d'échec (carte désactivée entre-temps…), la carte d'action est rendue :
	// un refus ne coûte rien à l'élève.
	const granted = await grantVipCardsAfterAction({
		studentId: data.studentId,
		actionInstanceId: data.actionCardInstanceId,
		discardIds: [],
		awardCardIds: data.chosenCardIds,
		source: 'choose',
		discardMetadata: {},
		awardMetadata: { action_card_name: actionCard.name }
	});

	if (!granted) {
		const restored = await restoreActionCard(
			data.studentId,
			data.actionCardInstanceId,
			actionCardInstance,
			rpcResult.usedAt ?? null
		);
		throw error(
			409,
			restored
				? 'Le choix n’a pas pu se faire : la carte d’action n’a pas été utilisée'
				: 'Le choix n’a pas pu se faire et la carte d’action n’a pas pu être rendue'
		);
	}

	// Chaque instance vient de la base : la même carte choisie deux fois donne
	// deux instances distinctes.
	const earnedAt = new Date().toISOString();
	const cardsReceived = granted.map(({ cardId, instanceId }) => ({
		cardId,
		name: templatesMap.get(cardId)?.name || cardId,
		instanceId,
		earnedAt
	}));

	return json({
		success: true,
		actionCardUsed: {
			cardId: actionCardInstance.cardId,
			name: actionCard.name,
			instanceId: data.actionCardInstanceId
		},
		cardsReceived
	});
};

// ============================================================================
// CONTRÔLES
// ============================================================================

/**
 * Vérifie que les cartes choisies respectent les filtres de l'action ; rend
 * leurs modèles, indexés par identifiant.
 */
async function validateChosenCards(
	supabase: SupabaseClient<Database>,
	chosenCardIds: string[],
	action: { count: number; filter?: 'all'; maxRarity?: string; possibleCardIds?: string[] }
): Promise<Map<string, VipCardTemplate>> {
	// Tous les modèles choisis en une requête
	const templates = await getTemplatesByIds(supabase, chosenCardIds);
	const templatesMap = new Map(templates.map((t) => [t.id, t]));

	// Toutes les cartes choisies doivent exister et être activées, quel que soit
	// le mode : le serveur attribue avec le client service, sans autre filtre.
	const chosenTemplates: VipCardTemplate[] = [];
	for (const cardId of chosenCardIds) {
		const template = templatesMap.get(cardId);
		if (!template) {
			throw error(404, `Card not found: ${cardId}`);
		}
		if (!template.is_enabled) {
			throw error(400, `Card "${template.name}" is not available`);
		}
		chosenTemplates.push(template);
	}

	// Mode 3 : possibleCardIds (liste imposée)
	if (action.possibleCardIds && action.possibleCardIds.length > 0) {
		for (const cardId of chosenCardIds) {
			if (!action.possibleCardIds.includes(cardId)) {
				const template = templatesMap.get(cardId);
				throw error(
					400,
					`Card "${template?.name || cardId}" is not in the allowed list for this action`
				);
			}
		}
		return templatesMap;
	}

	// Mode 2 : maxRarity (rareté plafonnée)
	if (action.maxRarity) {
		const maxRarityValue = getRarityPoints(
			action.maxRarity as 'common' | 'rare' | 'epic' | 'legendary'
		);

		for (const template of chosenTemplates) {
			const cardRarityValue = getRarityPoints(
				template.rarity as 'common' | 'rare' | 'epic' | 'legendary'
			);
			if (cardRarityValue > maxRarityValue) {
				throw error(
					400,
					`Card "${template.name}" (${template.rarity}) exceeds maximum rarity ${action.maxRarity}`
				);
			}
		}
	}

	// Mode 1 : filter='all' (par défaut : toute carte activée)
	return templatesMap;
}
