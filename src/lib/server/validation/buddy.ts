/**
 * Buddy System — Zod validation schemas
 * ======================================
 */

import { z } from 'zod';

export const palotinTypeSchema = z.enum(['giron', 'pile', 'cotice']);

export const chooseBuddySchema = z.object({
	palotinType: palotinTypeSchema
});

export const changeBuddySchema = z.object({
	newPalotinType: palotinTypeSchema
});

export const buddyQuizAnswerSchema = z.object({
	question: z.number().int().min(0).max(3),
	palotin: palotinTypeSchema
});

export const buddyQuizSchema = z.object({
	answers: z.array(buddyQuizAnswerSchema).length(4)
});
