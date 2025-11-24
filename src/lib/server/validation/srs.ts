/**
 * SRS (Spaced Repetition System) validation schemas
 */

import { z } from 'zod';

/**
 * Schema for creating a deck
 */
export const createDeckSchema = z.object({
	name: z.string().trim().min(1).max(100),
	description: z.string().max(500).optional(),
	deckType: z.enum(['official', 'personal']),
	config: z
		.object({
			desiredRetention: z.number().min(0.7).max(0.97).optional(),
			maximumInterval: z.number().int().positive().max(36500).optional(),
			parameters: z.array(z.number()).length(21).optional()
		})
		.optional()
});

/**
 * Schema for creating a template card
 */
export const createTemplateCardSchema = z.object({
	deckId: z.string().uuid(),
	cardType: z.literal('template'),
	templateId: z.string().uuid()
});

/**
 * Schema for creating a custom card
 * Now validates markdown strings instead of ContentField arrays
 */
export const createCustomCardSchema = z.object({
	deckId: z.string().uuid(),
	cardType: z.literal('custom'),
	frontContent: z.string().min(1, 'Front content is required').max(10000),
	backContent: z.string().min(1, 'Back content is required').max(10000)
});

/**
 * Schema for creating a card (template or custom)
 */
export const createCardSchema = z.discriminatedUnion('cardType', [
	createTemplateCardSchema,
	createCustomCardSchema
]);

/**
 * Schema for submitting a review
 */
export const submitReviewSchema = z.object({
	cardId: z.string().uuid(),
	deckId: z.string().uuid(),
	grade: z.number().int().min(1).max(4),
	timeSpent: z.number().int().nonnegative().max(3600).optional()
});

/**
 * Schema for updating a deck (all fields optional)
 */
export const updateDeckSchema = createDeckSchema.partial();

/**
 * Schema for deck query parameters
 */
export const listDecksQuerySchema = z.object({
	deckType: z.enum(['official', 'personal']).nullish(),
	search: z.string().max(100).nullish()
});

/**
 * Schema for card query parameters
 */
export const listCardsQuerySchema = z.object({
	deck_id: z.string().uuid()
});

/**
 * Schema for updating a card (custom cards only)
 * Now validates markdown strings instead of ContentField arrays
 */
export const updateCardSchema = z.object({
	frontContent: z.string().min(1, 'Front content is required').max(10000).optional(),
	backContent: z.string().min(1, 'Back content is required').max(10000).optional()
});

/**
 * Schema for assigning a deck to students/classes
 */
export const assignDeckSchema = z.object({
	targetType: z.enum(['student', 'class']),
	targetIds: z.array(z.string().uuid()).min(1).max(100)
});

/**
 * Schema for UUID parameter validation
 */
export const uuidParamSchema = z.object({
	id: z.string().uuid()
});

/**
 * Schema for review/due query parameters
 */
export const dueCardsQuerySchema = z.object({
	deck_id: z.string().uuid()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * FSRS config schema
 */
export const fsrsConfigSchema = z.object({
	desiredRetention: z.number().min(0.7).max(0.97),
	maximumInterval: z.number().int().positive().max(36500),
	parameters: z.array(z.number()).length(21).optional()
});

/**
 * Deck stats schema
 */
export const deckStatsSchema = z.object({
	total_cards: z.number().int().nonnegative(),
	due_count: z.number().int().nonnegative(),
	new_count: z.number().int().nonnegative(),
	learning_count: z.number().int().nonnegative(),
	review_count: z.number().int().nonnegative()
});

/**
 * Single deck response schema
 */
export const deckResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable().optional(),
	owner_id: z.string().uuid(),
	deck_type: z.enum(['official', 'personal']),
	is_assigned: z.boolean(),
	config: fsrsConfigSchema,
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Deck with stats response schema
 */
export const deckWithStatsResponseSchema = deckResponseSchema.extend({
	stats: deckStatsSchema
});

/**
 * Deck list response schema (GET /api/srs/decks)
 */
export const deckListResponseSchema = z.object({
	decks: z.array(deckWithStatsResponseSchema)
});

/**
 * Deck detail response schema (GET /api/srs/decks/[id])
 */
export const deckDetailResponseSchema = z.object({
	deck: deckWithStatsResponseSchema
});

/**
 * Create deck response schema (POST /api/srs/decks)
 */
export const createDeckResponseSchema = z.object({
	deck: deckResponseSchema
});

/**
 * Content field response schema
 */
export const contentFieldResponseSchema = z.object({
	type: z.enum(['text', 'latex', 'image', 'markdown']),
	value: z.string(),
	metadata: z.record(z.string(), z.any()).optional()
});

/**
 * Card state schema
 */
export const cardStateSchema = z.object({
	stability: z.number(),
	difficulty: z.number(),
	elapsed_days: z.number().int().nonnegative(),
	scheduled_days: z.number().int().nonnegative(),
	reps: z.number().int().nonnegative(),
	lapses: z.number().int().nonnegative(),
	state: z.enum(['New', 'Learning', 'Review', 'Relearning']),
	last_review: z.string().datetime().nullable().optional()
});

/**
 * Single card response schema
 */
export const cardResponseSchema = z.object({
	id: z.string().uuid(),
	deck_id: z.string().uuid(),
	card_type: z.enum(['template', 'custom']),
	template_id: z.string().uuid().nullable().optional(),
	front_content: z.array(contentFieldResponseSchema).nullable().optional(),
	back_content: z.array(contentFieldResponseSchema).nullable().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Card with state response schema (for review)
 */
export const cardWithStateResponseSchema = cardResponseSchema.extend({
	state: cardStateSchema,
	due_date: z.string().datetime()
});

/**
 * Card list response schema (GET /api/srs/cards)
 */
export const cardListResponseSchema = z.object({
	cards: z.array(cardResponseSchema)
});

/**
 * Card detail response schema (GET /api/srs/cards/[id])
 */
export const cardDetailResponseSchema = z.object({
	card: cardWithStateResponseSchema
});

/**
 * Create card response schema (POST /api/srs/cards)
 */
export const createCardResponseSchema = z.object({
	card: cardResponseSchema
});

/**
 * Due cards response schema (GET /api/srs/review/due)
 */
export const dueCardsResponseSchema = z.object({
	cards: z.array(cardWithStateResponseSchema),
	total_due: z.number().int().nonnegative()
});

/**
 * Review result schema
 */
export const reviewResultSchema = z.object({
	card_id: z.string().uuid(),
	new_state: cardStateSchema,
	next_due_date: z.string().datetime()
});

/**
 * Submit review response schema (POST /api/srs/review/submit)
 */
export const submitReviewResponseSchema = z.object({
	success: z.literal(true),
	result: reviewResultSchema
});

/**
 * Assign deck response schema (POST /api/srs/decks/[id]/assign)
 */
export const assignDeckResponseSchema = z.object({
	success: z.literal(true),
	message: z.string(),
	assignments_created: z.number().int().nonnegative()
});
