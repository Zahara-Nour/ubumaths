import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { VipCardWithLockStatus } from '$lib/types/marketplace';
import type { VipCardInstance } from '$lib/types/vip-card';
import { z } from 'zod';

// Query schema
const querySchema = z.object({
	include_locked: z
		.union([z.enum(['true', 'false']), z.null()])
		.transform((val) => val === 'true')
		.default(false)
});

/**
 * GET /api/vip-cards/my-cards
 * Get current user's VIP cards with lock status
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate query parameters
	const queryValidation = querySchema.safeParse({
		include_locked: url.searchParams.get('include_locked')
	});

	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { include_locked } = queryValidation.data;

	// Get user's VIP cards from profile
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', userId)
		.single();

	if (profileError) {
		console.error('Error fetching user profile:', profileError);
		throw error(500, 'Erreur lors de la récupération du profil');
	}

	const vipCards = (profile?.vip_cards as Record<string, VipCardInstance> | null) ?? {};
	const cardInstanceIds = Object.keys(vipCards);

	if (cardInstanceIds.length === 0) {
		return json([]);
	}

	// Get card locks for this user
	const { data: locks, error: locksError } = await supabase
		.from('marketplace_locked_cards')
		.select('card_instance_id, locked_for, locked_entity_id')
		.eq('student_id', userId);

	if (locksError) {
		console.error('Error fetching card locks:', locksError);
		throw error(500, 'Erreur lors de la récupération des verrouillages');
	}

	// Create a map of locks by card instance ID
	const lockMap = new Map(
		(locks || []).map((lock) => [
			lock.card_instance_id,
			{
				locked_for: lock.locked_for as 'listing' | 'trade',
				locked_entity_id: lock.locked_entity_id
			}
		])
	);

	// Get unique template IDs from user's cards
	const templateIds = [...new Set(Object.values(vipCards).map((card) => card.cardId))];

	// Get templates
	const { data: templates, error: templatesError } = await supabase
		.from('vip_card_templates')
		.select('id, name, description, image_path, rarity, category')
		.in('id', templateIds);

	if (templatesError) {
		console.error('Error fetching card templates:', templatesError);
		throw error(500, 'Erreur lors de la récupération des modèles de cartes');
	}

	// Create template map
	const templateMap = new Map((templates || []).map((t) => [t.id, t]));

	// Build VipCardWithLockStatus array
	const result: VipCardWithLockStatus[] = [];

	for (const [instanceId, cardData] of Object.entries(vipCards)) {
		const lock = lockMap.get(instanceId);
		const isLocked = !!lock;

		// Skip locked cards if not requested
		if (!include_locked && isLocked) {
			continue;
		}

		// Skip used cards (they have a usedAt timestamp)
		if (cardData.usedAt) {
			continue;
		}

		const template = templateMap.get(cardData.cardId);
		if (!template) {
			// Skip cards with missing templates
			continue;
		}

		result.push({
			id: instanceId,
			template_id: cardData.cardId,
			earned_at: cardData.earnedAt,
			is_locked: isLocked,
			lock_reason: lock ? (lock.locked_for === 'listing' ? 'in_listing' : 'in_trade') : undefined,
			locked_for_listing_id: lock?.locked_for === 'listing' ? lock.locked_entity_id : null,
			locked_for_trade_id: lock?.locked_for === 'trade' ? lock.locked_entity_id : null,
			template: {
				id: template.id,
				name: template.name,
				description: template.description,
				image_path: template.image_path,
				rarity: template.rarity as 'common' | 'rare' | 'epic' | 'legendary',
				category: template.category
			}
		});
	}

	// Sort by earned_at (most recent first)
	result.sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());

	return json(result);
};
