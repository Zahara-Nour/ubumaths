/**
 * Endpoint API : échanger des cartes VIP
 * ======================================
 *
 * Trois modes d'échange, fixés par la carte d'action :
 * - replace_random : défausser N cartes, en tirer N au hasard ;
 * - rarity_points : défausser des cartes dont les points de rareté paient une
 *   carte de la rareté visée ;
 * - discard_for_specific : défausser N cartes pour obtenir une carte précise.
 *
 * POST /api/vip-cards/exchange
 *
 * SÉCURITÉ :
 * - authentification requise : l'élève pour lui-même, ou le professeur / admin
 *   pour un élève de ses classes (contrôle `class_members`) ;
 * - entrée validée par une union discriminée Zod ;
 * - la requête doit correspondre à la configuration de la carte d'action
 *   (`exchange_cards`, même mode, même cible, même nombre de cartes) ;
 * - cartes défaussées : détenues par l'élève, inutilisées, distinctes, autres
 *   que la carte d'action, non engagées sur le marché ;
 * - carte cible (discard_for_specific) : existante et activée ;
 * - la carte d'action est consommée EN PREMIER (`use_vip_card`, FOR UPDATE) :
 *   de deux requêtes concurrentes sur la même carte, une seule passe ;
 * - défausse + attribution : `grant_vip_cards_after_action`, réservée au
 *   serveur (migration 20261003150000, Q137 b), en UNE transaction, APRÈS tous
 *   les contrôles ci-dessus. Si elle échoue, la carte d'action est rendue
 *   (`restore_vip_card_instance`) : l'élève ne perd rien.
 *
 * TRAÇABILITÉ :
 * - toutes les entrées du journal partagent un même `exchange_id` ;
 * - défausse, usage de la carte d'action et cartes reçues sont journalisés
 *   par les fonctions SQL elles-mêmes.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import {
	exchangeCardsSchema,
	type ExchangeCardsInput
} from '$lib/server/validation/exchange-cards';
import type {
	ExchangeCardAction,
	StudentVipCards,
	VipCardAction,
	VipCardRarity
} from '$lib/types/vip-card';
import { getRarityPoints } from '$lib/types/vip-card';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';
import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
import { getTemplateById, getTemplatesByRarity } from '$lib/server/vip-card-queries';
import { verifyTeacherStudentWithRole } from '$lib/server/middleware/student-access';
import { validateActivationContext } from '$lib/server/vip-card-context';
import { asStudentVipCards } from '$lib/types/vip-card';
import {
	findLockedCardInstances,
	grantVipCardsAfterAction,
	restoreActionCard
} from '$lib/server/vip-card-grants';

// ============================================================================
// TYPES
// ============================================================================

/** Ce que l'échange va attribuer, arrêté AVANT de consommer quoi que ce soit. */
type ExchangePlan =
	| { mode: 'replace_random'; count: number }
	| { mode: 'rarity_points' | 'discard_for_specific'; template: VipCardTemplate };

type DiscardedCard = { cardId: string; name: string; instanceId: string };
type ReceivedCard = { cardId: string; name: string; instanceId: string; earnedAt: string };

/** Nombre maximal de cartes en mode « replace_random » sans `maxCount` (cf. la modale). */
const DEFAULT_MAX_REPLACE = 10;

// ============================================================================
// POST HANDLER
// ============================================================================

export const POST: RequestHandler = async ({ request, locals }) => {
	// Authentification requise
	const { user, profile } = await requireAuth(locals);
	const supabase = locals.supabase;

	// Lecture et validation du corps de la requête
	const body = await request.json();
	const validation = exchangeCardsSchema.safeParse(body);

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
			throw error(403, 'You can only exchange cards for students in your classes');
		}
	} else if (!isStudent) {
		// Ni professeur, ni l'élève lui-même
		throw error(403, 'You can only exchange cards for yourself or your students');
	}
	// Pour l'élève, l'approbation de la carte est vérifiée après sa lecture

	// Inventaire de l'élève
	const { data: studentProfile, error: fetchError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', data.studentId)
		.single();

	if (fetchError) {
		console.error('[exchange] Error fetching student profile:', fetchError);
		throw error(500, `Failed to fetch student profile: ${fetchError.message}`);
	}

	const vipCards = asStudentVipCards(studentProfile.vip_cards);

	// La carte d'action existe et n'est pas utilisée
	const actionCard = vipCards[data.actionCardInstanceId];
	if (!actionCard) {
		throw error(404, `Action card instance not found: ${data.actionCardInstanceId}`);
	}
	if (actionCard.usedAt) {
		throw error(400, `Action card already used: ${data.actionCardInstanceId}`);
	}

	const actionTemplate = await getTemplateById(supabase, actionCard.cardId);
	if (!actionTemplate) {
		throw error(404, 'Action card template not found');
	}

	// Élève : approbation du professeur OU contexte d'activation valide
	if (isStudent && !actionCard.activationApprovedAt) {
		const actionContext = (actionTemplate.action as VipCardAction | null)?.context;
		if (actionContext) {
			const contextValid = await validateActivationContext(actionContext, supabase, data.studentId);
			if (!contextValid) {
				throw error(400, 'Cette carte ne peut être activée que dans un contexte spécifique');
			}
		} else {
			throw error(400, 'This card must be approved by a teacher before use.');
		}
	}

	// La carte d'action fixe l'échange : son type, son mode, sa cible et son
	// nombre de cartes. Sans ce contrôle, n'importe quelle carte approuvée
	// permettait de demander n'importe quelle carte, et le serveur — qui
	// attribue avec le client service — l'aurait accordée.
	const exchangeConfig = getExchangeConfig(actionTemplate);
	checkRequestMatchesCard(data, exchangeConfig);

	// Les cartes à défausser : distinctes, autres que la carte d'action,
	// détenues par l'élève et inutilisées.
	if (new Set(data.cardsToDiscard).size !== data.cardsToDiscard.length) {
		throw error(400, 'Une même carte ne peut pas être défaussée deux fois');
	}
	if (data.cardsToDiscard.includes(data.actionCardInstanceId)) {
		throw error(400, 'La carte d’action ne peut pas être défaussée');
	}
	for (const instanceId of data.cardsToDiscard) {
		const instance = vipCards[instanceId];
		if (!instance) {
			throw error(404, `Card instance not found: ${instanceId}`);
		}
		if (instance.usedAt) {
			throw error(400, `Card already used: ${instanceId}`);
		}
	}

	// Aucune carte (action ni défausse) engagée sur le marché. Lecture par le
	// client service : sous RLS, le professeur ne voit pas les verrous de ses
	// élèves et lirait « aucun verrou ».
	const lockedIds = await findLockedCardInstances(data.studentId, [
		data.actionCardInstanceId,
		...data.cardsToDiscard
	]).catch(() => {
		throw error(500, 'Failed to verify marketplace lock status');
	});
	if (lockedIds.length > 0) {
		throw error(400, `Card is locked in marketplace and cannot be exchanged: ${lockedIds[0]}`);
	}

	// Tout ce qui peut échouer pour une raison métier est vérifié AVANT de
	// consommer la carte d'action. Ce qui échouerait APRÈS (carte modifiée
	// entre-temps, cible désactivée…) est annulé en bloc par la base, et la
	// carte d'action est rendue : un refus ne coûte rien à l'élève.
	const cardsDiscarded = await describeDiscardedCards(supabase, vipCards, data.cardsToDiscard);
	const plan = await buildExchangePlan(supabase, data, vipCards);

	const actionCardName = actionTemplate.name || actionCard.cardId;
	const exchangeId = crypto.randomUUID();
	const cardsReceivedCount = plan.mode === 'replace_random' ? plan.count : 1;

	// 1. Consommer la carte d'action EN PREMIER. `use_vip_card` verrouille le
	//    profil (FOR UPDATE) et refuse une carte déjà utilisée : de deux requêtes
	//    concurrentes sur la même carte, une seule passe. Appelée avec le client
	//    de l'utilisateur : elle revérifie elle-même propriétaire / professeur.
	const { data: useResult, error: useError } = await supabase.rpc('use_vip_card', {
		p_student_id: data.studentId,
		p_instance_id: data.actionCardInstanceId,
		p_metadata: {
			action_type: 'exchange_cards',
			mode: data.mode,
			cards_discarded: data.cardsToDiscard.length,
			cards_received: cardsReceivedCount,
			exchange_id: exchangeId
		}
	});

	if (useError) {
		console.error('[exchange] RPC use_vip_card error:', useError);
		throw error(500, `Failed to mark action card as used: ${useError.message}`);
	}

	// `usedAt` : posé par `use_vip_card` quand la carte n'a plus d'usage (sinon
	// null) ; la restitution exige de retrouver exactement cette valeur.
	const rpcResult = useResult as { success: boolean; error?: string; usedAt?: string | null };
	if (!rpcResult.success) {
		throw error(400, rpcResult.error || 'Failed to mark action card as used');
	}

	// 2. Défausser et attribuer en UNE transaction (serveur seul, Q137 b).
	const granted = await grantVipCardsAfterAction({
		studentId: data.studentId,
		actionInstanceId: data.actionCardInstanceId,
		discardIds: data.cardsToDiscard,
		awardCardIds:
			plan.mode === 'replace_random'
				? Array.from({ length: plan.count }, () => null)
				: [plan.template.id],
		source: 'exchange',
		discardMetadata: {
			used_by: 'exchange',
			exchange_mode: data.mode,
			exchange_id: exchangeId,
			action_card_name: actionCardName
		},
		awardMetadata: {
			exchange_id: exchangeId,
			exchange_mode: data.mode,
			action_card_name: actionCardName
		}
	});

	// 3. Échec : la base n'a rien défaussé ni attribué ; on rend la carte d'action.
	if (!granted) {
		const restored = await restoreActionCard(
			data.studentId,
			data.actionCardInstanceId,
			actionCard,
			rpcResult.usedAt ?? null
		);
		throw error(
			409,
			restored
				? 'L’échange n’a pas pu se faire : aucune carte n’a été utilisée'
				: 'L’échange n’a pas pu se faire et la carte d’action n’a pas pu être rendue'
		);
	}

	const cardsReceived = await describeReceivedCards(supabase, plan, granted);

	return json({
		cardsDiscarded,
		cardsReceived,
		actionCardUsed: {
			cardId: actionCard.cardId,
			name: actionCardName,
			instanceId: data.actionCardInstanceId
		}
	});
};

// ============================================================================
// CONTRÔLES : la requête doit correspondre à la carte d'action
// ============================================================================

function getExchangeConfig(template: VipCardTemplate): ExchangeCardAction {
	const action = template.action;
	if (!action || action.type !== 'exchange_cards' || !action.exchange) {
		throw error(400, `Card "${template.name}" does not have an exchange_cards action`);
	}
	return action.exchange;
}

function checkRequestMatchesCard(data: ExchangeCardsInput, config: ExchangeCardAction): void {
	if (data.mode !== config.mode) {
		throw error(400, `Cette carte permet un échange « ${config.mode} », pas « ${data.mode} »`);
	}

	const count = data.cardsToDiscard.length;

	if (data.mode === 'replace_random' && config.mode === 'replace_random') {
		// Comme la modale : `count` absent, nul ou 0 = nombre libre (borné par maxCount).
		if (config.count) {
			if (count !== config.count) {
				throw error(400, `Cette carte demande exactement ${config.count} carte(s) à défausser`);
			}
		} else if (count > (config.maxCount ?? DEFAULT_MAX_REPLACE)) {
			throw error(
				400,
				`Cette carte permet au plus ${config.maxCount ?? DEFAULT_MAX_REPLACE} carte(s) à défausser`
			);
		}
		return;
	}

	if (data.mode === 'rarity_points' && config.mode === 'rarity_points') {
		if (data.targetRarity !== config.targetRarity) {
			throw error(400, `Cette carte donne une carte ${config.targetRarity}`);
		}
		return;
	}

	if (data.mode === 'discard_for_specific' && config.mode === 'discard_for_specific') {
		if (data.targetCardId !== config.targetCardId) {
			throw error(400, 'Cette carte ne donne pas la carte demandée');
		}
		if (count !== config.discardCount) {
			throw error(
				400,
				`Cette carte demande exactement ${config.discardCount} carte(s) à défausser`
			);
		}
	}
}

/** Arrête ce que l'échange attribuera, sans rien écrire. */
async function buildExchangePlan(
	supabase: SupabaseClient<Database>,
	data: ExchangeCardsInput,
	vipCards: StudentVipCards
): Promise<ExchangePlan> {
	switch (data.mode) {
		case 'replace_random':
			return { mode: 'replace_random', count: data.cardsToDiscard.length };

		case 'rarity_points': {
			// Total des points de rareté des cartes défaussées
			let totalPoints = 0;
			for (const instanceId of data.cardsToDiscard) {
				const template = await getTemplateById(supabase, vipCards[instanceId].cardId);
				if (template) {
					totalPoints += getRarityPoints(template.rarity as VipCardRarity);
				}
			}

			const targetPoints = getRarityPoints(data.targetRarity);
			if (totalPoints < targetPoints) {
				throw error(
					400,
					`Insufficient rarity points: Required ${targetPoints}, available ${totalPoints}`
				);
			}

			const targetTemplates = await getTemplatesByRarity(supabase, data.targetRarity, true);
			if (targetTemplates.length === 0) {
				throw error(500, `No cards found with rarity ${data.targetRarity}`);
			}
			const template = targetTemplates[Math.floor(Math.random() * targetTemplates.length)];
			return { mode: 'rarity_points', template };
		}

		case 'discard_for_specific': {
			const template = await getTemplateById(supabase, data.targetCardId);
			if (!template) {
				throw error(404, `Target card not found: ${data.targetCardId}`);
			}
			// Q138 : comme dans choose, une carte désactivée ne s'obtient pas.
			if (!template.is_enabled) {
				throw error(400, `Card "${template.name}" is not available`);
			}
			return { mode: 'discard_for_specific', template };
		}

		default:
			throw error(400, `Unknown exchange mode: ${(data as { mode: string }).mode}`);
	}
}

async function describeDiscardedCards(
	supabase: SupabaseClient<Database>,
	vipCards: StudentVipCards,
	cardsToDiscard: string[]
): Promise<DiscardedCard[]> {
	const cardsDiscarded: DiscardedCard[] = [];
	for (const instanceId of cardsToDiscard) {
		const instance = vipCards[instanceId];
		const template = await getTemplateById(supabase, instance.cardId);
		cardsDiscarded.push({
			cardId: instance.cardId,
			name: template?.name || instance.cardId,
			instanceId
		});
	}
	return cardsDiscarded;
}

// ============================================================================
// RÉPONSE
// ============================================================================

/** Décrit les cartes reçues, avec les instances rendues par la base. */
async function describeReceivedCards(
	supabase: SupabaseClient<Database>,
	plan: ExchangePlan,
	granted: { cardId: string; instanceId: string }[]
): Promise<ReceivedCard[]> {
	const earnedAt = new Date().toISOString();
	const cardsReceived: ReceivedCard[] = [];
	for (const { cardId, instanceId } of granted) {
		const template =
			plan.mode === 'replace_random' ? await getTemplateById(supabase, cardId) : plan.template;
		cardsReceived.push({ cardId, name: template?.name || cardId, instanceId, earnedAt });
	}
	return cardsReceived;
}
