/**
 * VIP card drawing validation schemas
 */

import { z } from 'zod';

/**
 * Valid VIP card rarity levels
 */
const rarityEnum = z.enum(['common', 'rare', 'epic', 'legendary']);

/**
 * Schema for draw_cards action filters
 * Used to validate filters when drawing VIP cards with specific constraints
 */
export const drawCardsFiltersSchema = z
	.object({
		forceRarity: rarityEnum.optional(),
		minRarity: rarityEnum.optional(),
		excludeCardIds: z
			.array(z.string().min(1, 'L’identifiant de carte ne peut pas être vide'))
			.max(50, 'Impossible d’exclure plus de 50 cartes')
			.optional(),
		onlyCardsWithActions: z.boolean().optional()
	})
	.strict()
	.refine(
		(data) => {
			// forceRarity and minRarity are mutually exclusive
			return !(data.forceRarity && data.minRarity);
		},
		{
			message: 'Les filtres forceRarity et minRarity ne peuvent pas être combinés'
		}
	);

/**
 * TypeScript type inferred from drawCardsFiltersSchema
 */
export type DrawCardsFiltersInput = z.infer<typeof drawCardsFiltersSchema>;

/**
 * Schema for drawing VIP cards with gidouilles payment (with optional filters)
 */
const gidouillesPaymentSchema = z.object({
	studentId: z.string().uuid('Identifiant d’élève invalide'),
	count: z
		.number()
		.int('Le nombre de cartes doit être un entier')
		.min(1, 'Il faut tirer au moins 1 carte')
		.max(10, 'Impossible de tirer plus de 10 cartes à la fois')
		.finite('Le nombre de cartes doit être un nombre fini'),
	paymentMethod: z.literal('gidouilles'),
	gidouillesCost: z
		.number()
		.int('Le coût en gidouilles doit être un entier')
		.min(0, 'Le coût en gidouilles ne peut pas être négatif')
		.max(100, 'Le coût en gidouilles ne peut pas dépasser 100')
		.finite('Le coût en gidouilles doit être un nombre fini'),
	vipCardInstanceId: z.never().optional(),
	filters: drawCardsFiltersSchema.optional()
});

/**
 * Schema for drawing VIP cards with VIP card payment (with optional filters)
 */
const vipCardPaymentSchema = z.object({
	studentId: z.string().uuid('Identifiant d’élève invalide'),
	count: z
		.number()
		.int('Le nombre de cartes doit être un entier')
		.min(1, 'Il faut tirer au moins 1 carte')
		.max(10, 'Impossible de tirer plus de 10 cartes à la fois')
		.finite('Le nombre de cartes doit être un nombre fini'),
	paymentMethod: z.literal('vip_card'),
	vipCardInstanceId: z.string().uuid('Identifiant de carte VIP invalide'),
	gidouillesCost: z.never().optional(),
	filters: drawCardsFiltersSchema.optional()
});

/**
 * Discriminated union schema for drawing VIP cards
 * Supports two payment methods:
 * 1. 'gidouilles' - Pay with gidouilles (requires gidouillesCost)
 * 2. 'vip_card' - Pay with an existing VIP card (requires vipCardInstanceId)
 *
 * Both payment methods support optional filters for fine-grained control:
 * - forceRarity: Force all drawn cards to be of a specific rarity
 * - minRarity: Guarantee minimum rarity (common < rare < epic < legendary)
 * - excludeCardIds: Exclude specific cards from the draw pool
 * - onlyCardsWithActions: Only draw cards that have actions
 */
export const drawVipCardsSchema = z.discriminatedUnion('paymentMethod', [
	gidouillesPaymentSchema,
	vipCardPaymentSchema
]);

/**
 * TypeScript type inferred from drawVipCardsSchema
 */
export type DrawVipCardsInput = z.infer<typeof drawVipCardsSchema>;
