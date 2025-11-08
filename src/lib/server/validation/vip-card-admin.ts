/**
 * VIP Card Admin Validation Schemas
 * =================================
 *
 * Comprehensive Zod validation schemas for VIP card administration:
 * - Template management (create, update, image upload)
 * - Config management (create, update, activate)
 * - Teacher overrides (bulk update)
 */

import { z } from 'zod';
import { drawCardsFiltersSchema } from './draw-vip-cards';

/**
 * Valid rarity levels for VIP cards
 */
const rarityEnum = z.enum(['common', 'rare', 'epic', 'legendary']);

/**
 * Valid categories for VIP cards
 */
const categoryEnum = z.enum(['bonus', 'privilege', 'social', 'power']);

/**
 * Valid VIP card rarity levels (copied from draw-vip-cards.ts for consistency)
 */
const vipCardRarityEnum = z.enum(['common', 'rare', 'epic', 'legendary']);

/**
 * Valid warning types
 */
const warningTypeEnum = z.enum(['C', 'M', 'R', 'T']);

/**
 * Exchange card modes schemas
 */
const exchangeReplaceRandomSchema = z.object({
	mode: z.literal('replace_random'),
	count: z
		.number()
		.int('Count must be an integer')
		.min(1, 'Count must be at least 1')
		.max(10, 'Count cannot exceed 10')
		.finite('Count must be finite')
		.optional()
});

const exchangeRarityPointsSchema = z.object({
	mode: z.literal('rarity_points'),
	targetRarity: vipCardRarityEnum,
	pointsRequired: z
		.number()
		.int('Points must be an integer')
		.positive('Points must be positive')
		.finite('Points must be finite')
});

const exchangeDiscardForSpecificSchema = z.object({
	mode: z.literal('discard_for_specific'),
	discardCount: z
		.number()
		.int('Discard count must be an integer')
		.min(1, 'Discard count must be at least 1')
		.max(10, 'Discard count cannot exceed 10')
		.finite('Discard count must be finite'),
	targetCardId: z.string().min(1, 'Target card ID is required')
});

const exchangeCardActionSchema = z.discriminatedUnion('mode', [
	exchangeReplaceRandomSchema,
	exchangeRarityPointsSchema,
	exchangeDiscardForSpecificSchema
]);

/**
 * Individual action schemas with proper type discrimination
 */
const drawCardsActionSchema = z.object({
	type: z.literal('draw_cards'),
	count: z
		.number()
		.int('Count must be an integer')
		.min(1, 'Count must be at least 1')
		.max(10, 'Count cannot exceed 10')
		.finite('Count must be finite'),
	filters: drawCardsFiltersSchema.optional()
});

const removeWarningsActionSchema = z.object({
	type: z.literal('remove_warnings'),
	count: z
		.number()
		.int('Count must be an integer')
		.min(1, 'Count must be at least 1')
		.max(5, 'Count cannot exceed 5')
		.finite('Count must be finite'),
	warningType: warningTypeEnum.optional()
});

const exchangeCardsActionSchema = z.object({
	type: z.literal('exchange_cards'),
	exchange: exchangeCardActionSchema
});

const addGidouillesActionSchema = z.object({
	type: z.literal('add_gidouilles'),
	amount: z
		.number()
		.int('Amount must be an integer')
		.min(1, 'Amount must be at least 1')
		.max(1000, 'Amount cannot exceed 1000')
		.finite('Amount must be finite')
});

/**
 * Choose card action with three mutually exclusive filter modes
 */
const chooseCardActionSchema = z
	.object({
		type: z.literal('choose_card'),
		count: z
			.number()
			.int('Count must be an integer')
			.min(1, 'Count must be at least 1')
			.max(10, 'Count cannot exceed 10')
			.finite('Count must be finite'),
		// Filter modes (mutually exclusive)
		filter: z.literal('all').optional(),
		maxRarity: vipCardRarityEnum.optional(),
		possibleCardIds: z
			.array(z.string().min(1, 'Card ID cannot be empty'))
			.min(1, 'At least one card ID is required when using specific cards filter')
			.max(20, 'Cannot specify more than 20 cards')
			.optional()
	})
	.strict()
	.refine(
		(data) => {
			// Ensure only ONE filter mode is used (or none, defaulting to 'all')
			const filterCount = [data.filter, data.maxRarity, data.possibleCardIds].filter(
				(f) => f !== undefined
			).length;
			return filterCount <= 1;
		},
		{
			message: 'Only one filter mode can be used at a time (filter, maxRarity, or possibleCardIds)'
		}
	);

/**
 * Action configuration schema using discriminated union
 * Ensures each action type has the correct parameters
 */
const actionSchema = z.discriminatedUnion('type', [
	drawCardsActionSchema,
	removeWarningsActionSchema,
	exchangeCardsActionSchema,
	addGidouillesActionSchema,
	chooseCardActionSchema
]);

/**
 * Schema for creating a new VIP card template
 *
 * @example
 * {
 *   id: "super-bonus",
 *   name: "Super Bonus",
 *   description: "Double gidouilles for one week",
 *   rarity: "epic",
 *   category: "bonus",
 *   isEnabled: true,
 *   imagePath: "/images/vip-cards/super-bonus@0.5x.webp",
 *   action: { type: "add_gidouilles", amount: 50 },
 *   sortOrder: 10
 * }
 */
export const createTemplateSchema = z
	.object({
		id: z
			.string()
			.min(1, 'ID is required')
			.max(50, 'ID must be 50 characters or less')
			.regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens (kebab-case)'),
		name: z
			.string()
			.min(1, 'Name is required')
			.max(100, 'Name must be 100 characters or less')
			.trim(),
		description: z
			.string()
			.min(1, 'Description is required')
			.max(500, 'Description must be 500 characters or less')
			.trim(),
		rarity: rarityEnum,
		category: categoryEnum,
		isEnabled: z.boolean(),
		imagePath: z
			.string()
			.min(1, 'Image path is required')
			.max(255, 'Image path must be 255 characters or less'),
		action: actionSchema.optional(),
		sortOrder: z
			.number()
			.int('Sort order must be an integer')
			.min(0, 'Sort order cannot be negative')
			.max(999, 'Sort order cannot exceed 999')
			.finite('Sort order must be finite')
			.default(0)
	})
	.strict();

/**
 * Schema for updating an existing VIP card template
 * All fields are optional to allow partial updates
 * Note: action field accepts null (no action) or a valid action object
 */
export const updateTemplateSchema = z
	.object({
		name: z
			.string()
			.min(1, 'Name cannot be empty')
			.max(100, 'Name must be 100 characters or less')
			.trim()
			.optional(),
		description: z
			.string()
			.min(1, 'Description cannot be empty')
			.max(500, 'Description must be 500 characters or less')
			.trim()
			.optional(),
		rarity: rarityEnum.optional(),
		category: categoryEnum.optional(),
		isEnabled: z.boolean().optional(),
		imagePath: z
			.string()
			.min(1, 'Image path cannot be empty')
			.max(255, 'Image path must be 255 characters or less')
			.optional(),
		action: actionSchema.nullable().optional(),
		sortOrder: z
			.number()
			.int('Sort order must be an integer')
			.min(0, 'Sort order cannot be negative')
			.max(999, 'Sort order cannot exceed 999')
			.finite('Sort order must be finite')
			.optional()
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	});

/**
 * Schema for uploading VIP card image
 * Validates WebP format and size limits
 */
export const uploadImageSchema = z
	.object({
		image: z
			.instanceof(File, { message: 'Image file is required' })
			.refine((file) => file.type === 'image/webp', {
				message: 'Only WebP images are allowed'
			})
			.refine((file) => file.size > 0, {
				message: 'Image file cannot be empty'
			})
			.refine((file) => file.size <= 2 * 1024 * 1024, {
				message: 'Image must be less than 2MB'
			})
	})
	.strict();

/**
 * Schema for creating a new VIP card config
 * Ensures probabilities sum to exactly 100%
 *
 * @example
 * {
 *   configName: "Holiday Event",
 *   commonProbability: 50,
 *   rareProbability: 30,
 *   epicProbability: 15,
 *   legendaryProbability: 5,
 *   description: "Special holiday card distribution",
 *   validFrom: "2024-12-20T00:00:00Z",
 *   validUntil: "2025-01-05T23:59:59Z"
 * }
 */
export const createConfigSchema = z
	.object({
		configName: z
			.string()
			.min(1, 'Config name is required')
			.max(100, 'Config name must be 100 characters or less')
			.trim(),
		commonProbability: z
			.number()
			.int('Common probability must be an integer')
			.min(0, 'Common probability cannot be negative')
			.max(100, 'Common probability cannot exceed 100')
			.finite('Common probability must be finite'),
		rareProbability: z
			.number()
			.int('Rare probability must be an integer')
			.min(0, 'Rare probability cannot be negative')
			.max(100, 'Rare probability cannot exceed 100')
			.finite('Rare probability must be finite'),
		epicProbability: z
			.number()
			.int('Epic probability must be an integer')
			.min(0, 'Epic probability cannot be negative')
			.max(100, 'Epic probability cannot exceed 100')
			.finite('Epic probability must be finite'),
		legendaryProbability: z
			.number()
			.int('Legendary probability must be an integer')
			.min(0, 'Legendary probability cannot be negative')
			.max(100, 'Legendary probability cannot exceed 100')
			.finite('Legendary probability must be finite'),
		description: z
			.string()
			.max(500, 'Description must be 500 characters or less')
			.trim()
			.optional()
			.nullable(),
		validFrom: z
			.string()
			.datetime({ message: 'Valid from must be a valid ISO 8601 datetime' })
			.optional()
			.nullable(),
		validUntil: z
			.string()
			.datetime({ message: 'Valid until must be a valid ISO 8601 datetime' })
			.optional()
			.nullable()
	})
	.strict()
	.refine(
		(data) =>
			data.commonProbability +
				data.rareProbability +
				data.epicProbability +
				data.legendaryProbability ===
			100,
		{
			message: 'Probabilities must sum to exactly 100%',
			path: ['commonProbability']
		}
	);

/**
 * Schema for updating an existing VIP card config
 * All fields optional, but probabilities must still sum to 100 if provided
 */
export const updateConfigSchema = z
	.object({
		configName: z
			.string()
			.min(1, 'Config name cannot be empty')
			.max(100, 'Config name must be 100 characters or less')
			.trim()
			.optional(),
		commonProbability: z
			.number()
			.int('Common probability must be an integer')
			.min(0, 'Common probability cannot be negative')
			.max(100, 'Common probability cannot exceed 100')
			.finite('Common probability must be finite')
			.optional(),
		rareProbability: z
			.number()
			.int('Rare probability must be an integer')
			.min(0, 'Rare probability cannot be negative')
			.max(100, 'Rare probability cannot exceed 100')
			.finite('Rare probability must be finite')
			.optional(),
		epicProbability: z
			.number()
			.int('Epic probability must be an integer')
			.min(0, 'Epic probability cannot be negative')
			.max(100, 'Epic probability cannot exceed 100')
			.finite('Epic probability must be finite')
			.optional(),
		legendaryProbability: z
			.number()
			.int('Legendary probability must be an integer')
			.min(0, 'Legendary probability cannot be negative')
			.max(100, 'Legendary probability cannot exceed 100')
			.finite('Legendary probability must be finite')
			.optional(),
		description: z
			.string()
			.max(500, 'Description must be 500 characters or less')
			.trim()
			.optional()
			.nullable(),
		validFrom: z
			.string()
			.datetime({ message: 'Valid from must be a valid ISO 8601 datetime' })
			.optional()
			.nullable(),
		validUntil: z
			.string()
			.datetime({ message: 'Valid until must be a valid ISO 8601 datetime' })
			.optional()
			.nullable()
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'At least one field must be provided for update'
	})
	.refine(
		(data) => {
			// If any probability is provided, check they sum to 100
			const hasProbabilities =
				data.commonProbability !== undefined ||
				data.rareProbability !== undefined ||
				data.epicProbability !== undefined ||
				data.legendaryProbability !== undefined;

			if (!hasProbabilities) return true;

			// All probabilities must be provided together
			const allProvided =
				data.commonProbability !== undefined &&
				data.rareProbability !== undefined &&
				data.epicProbability !== undefined &&
				data.legendaryProbability !== undefined;

			if (!allProvided) return false;

			const sum =
				(data.commonProbability ?? 0) +
				(data.rareProbability ?? 0) +
				(data.epicProbability ?? 0) +
				(data.legendaryProbability ?? 0);

			return sum === 100;
		},
		{
			message: 'If updating probabilities, all four must be provided and sum to 100%',
			path: ['commonProbability']
		}
	);

/**
 * Schema for individual teacher override
 */
const teacherOverrideSchema = z
	.object({
		cardId: z.string().min(1, 'Card ID is required'),
		isEnabled: z.boolean()
	})
	.strict();

/**
 * Schema for bulk updating teacher VIP card overrides
 *
 * @example
 * {
 *   overrides: [
 *     { cardId: "super-bonus", isEnabled: true },
 *     { cardId: "warning-remover", isEnabled: false }
 *   ]
 * }
 */
export const updateOverridesSchema = z
	.object({
		overrides: z
			.array(teacherOverrideSchema)
			.min(1, 'At least one override is required')
			.max(50, 'Cannot update more than 50 overrides at once')
	})
	.strict();

/**
 * TypeScript types inferred from schemas
 */
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UploadImageInput = z.infer<typeof uploadImageSchema>;
export type CreateConfigInput = z.infer<typeof createConfigSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
export type UpdateOverridesInput = z.infer<typeof updateOverridesSchema>;
