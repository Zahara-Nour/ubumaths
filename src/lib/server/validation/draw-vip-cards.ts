/**
 * VIP card drawing validation schemas
 */

import { z } from 'zod';

/**
 * Schema for drawing VIP cards with gidouilles payment
 */
const gidouillesPaymentSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	count: z
		.number()
		.int('Card count must be an integer')
		.min(1, 'Must draw at least 1 card')
		.max(10, 'Cannot draw more than 10 cards at once')
		.finite('Card count must be a finite number'),
	paymentMethod: z.literal('gidouilles'),
	gidouillesCost: z
		.number()
		.int('Gidouilles cost must be an integer')
		.min(0, 'Gidouilles cost cannot be negative')
		.max(100, 'Gidouilles cost cannot exceed 100')
		.finite('Gidouilles cost must be a finite number'),
	vipCardInstanceId: z.never().optional()
});

/**
 * Schema for drawing VIP cards with VIP card payment
 */
const vipCardPaymentSchema = z.object({
	studentId: z.string().uuid('Invalid student ID'),
	count: z
		.number()
		.int('Card count must be an integer')
		.min(1, 'Must draw at least 1 card')
		.max(10, 'Cannot draw more than 10 cards at once')
		.finite('Card count must be a finite number'),
	paymentMethod: z.literal('vip_card'),
	vipCardInstanceId: z.string().uuid('Invalid VIP card instance ID'),
	gidouillesCost: z.never().optional()
});

/**
 * Discriminated union schema for drawing VIP cards
 * Supports two payment methods:
 * 1. 'gidouilles' - Pay with gidouilles (requires gidouillesCost)
 * 2. 'vip_card' - Pay with an existing VIP card (requires vipCardInstanceId)
 */
export const drawVipCardsSchema = z.discriminatedUnion('paymentMethod', [
	gidouillesPaymentSchema,
	vipCardPaymentSchema
]);

/**
 * TypeScript type inferred from drawVipCardsSchema
 */
export type DrawVipCardsInput = z.infer<typeof drawVipCardsSchema>;
