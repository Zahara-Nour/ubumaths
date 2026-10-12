/**
 * VIP Card Admin Validation Schemas
 * =================================
 *
 * Comprehensive Zod validation schemas for VIP card administration:
 * - Template management (create, update, image upload)
 * - Config management (create, update, activate)
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
 * Valid activation contexts for self-activatable cards
 */
const activationContextEnum = z.enum(['any', 'minesweeper']);

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
		.int('Nombre de cartes : nombre entier attendu')
		.min(1, 'Nombre de cartes : au moins 1')
		.max(10, 'Nombre de cartes : 10 au maximum')
		.finite('Nombre de cartes : nombre fini attendu')
		.optional()
});

const exchangeRarityPointsSchema = z.object({
	mode: z.literal('rarity_points'),
	targetRarity: vipCardRarityEnum,
	pointsRequired: z
		.number()
		.int('Points : nombre entier attendu')
		.positive('Points : nombre positif attendu')
		.finite('Points : nombre fini attendu')
});

const exchangeDiscardForSpecificSchema = z.object({
	mode: z.literal('discard_for_specific'),
	discardCount: z
		.number()
		.int('Nombre de cartes à défausser : nombre entier attendu')
		.min(1, 'Nombre de cartes à défausser : au moins 1')
		.max(10, 'Nombre de cartes à défausser : 10 au maximum')
		.finite('Nombre de cartes à défausser : nombre fini attendu'),
	targetCardId: z.string().min(1, 'Carte à obtenir requise')
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
		.int('Nombre de cartes : nombre entier attendu')
		.min(1, 'Nombre de cartes : au moins 1')
		.max(10, 'Nombre de cartes : 10 au maximum')
		.finite('Nombre de cartes : nombre fini attendu'),
	filters: drawCardsFiltersSchema.optional(),
	context: activationContextEnum.optional()
});

const removeWarningsActionSchema = z.object({
	type: z.literal('remove_warnings'),
	count: z
		.number()
		.int('Nombre d’avertissements : nombre entier attendu')
		.min(1, 'Nombre d’avertissements : au moins 1')
		.max(5, 'Nombre d’avertissements : 5 au maximum')
		.finite('Nombre d’avertissements : nombre fini attendu'),
	warningType: warningTypeEnum.optional(),
	context: activationContextEnum.optional()
});

const exchangeCardsActionSchema = z.object({
	type: z.literal('exchange_cards'),
	exchange: exchangeCardActionSchema,
	context: activationContextEnum.optional()
});

const addGidouillesActionSchema = z.object({
	type: z.literal('add_gidouilles'),
	amount: z
		.number()
		.int('Gidouilles : nombre entier attendu')
		.min(1, 'Gidouilles : au moins 1')
		.max(1000, 'Gidouilles : 1000 au maximum')
		.finite('Gidouilles : nombre fini attendu'),
	context: activationContextEnum.optional()
});

/**
 * Choose card action with three mutually exclusive filter modes
 */
const chooseCardActionSchema = z
	.object({
		type: z.literal('choose_card'),
		count: z
			.number()
			.int('Nombre de cartes : nombre entier attendu')
			.min(1, 'Nombre de cartes : au moins 1')
			.max(10, 'Nombre de cartes : 10 au maximum')
			.finite('Nombre de cartes : nombre fini attendu'),
		// Filter modes (mutually exclusive)
		filter: z.literal('all').optional(),
		maxRarity: vipCardRarityEnum.optional(),
		possibleCardIds: z
			.array(z.string().min(1, 'Identifiant de carte vide'))
			.min(1, 'Au moins une carte requise pour le filtre « cartes précises »')
			.max(20, '20 cartes au maximum')
			.optional(),
		context: activationContextEnum.optional()
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
			message: 'Un seul filtre à la fois (filter, maxRarity ou possibleCardIds)'
		}
	);

const hintActionSchema = z.object({
	type: z.literal('hint'),
	context: activationContextEnum.optional()
});

const undoActionSchema = z.object({
	type: z.literal('undo'),
	context: activationContextEnum.optional()
});

/**
 * Action configuration schema using discriminated union
 * Ensures each action type has the correct parameters
 */
const actionSchema = z.discriminatedUnion('type', [
	drawCardsActionSchema,
	removeWarningsActionSchema,
	exchangeCardsActionSchema,
	addGidouillesActionSchema,
	chooseCardActionSchema,
	hintActionSchema,
	undoActionSchema
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
 *   imagePath: "https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/vip-card-images/super-bonus@0.5x.webp",
 *   action: { type: "add_gidouilles", amount: 50 },
 *   sortOrder: 10
 * }
 */
export const createTemplateSchema = z
	.object({
		id: z
			.string()
			.min(1, 'Identifiant requis')
			.max(50, 'Identifiant : 50 caractères au maximum')
			.regex(
				/^[a-z0-9-]+$/,
				'Identifiant : minuscules, chiffres et tirets seulement (ex. super-bonus)'
			),
		name: z.string().min(1, 'Nom requis').max(100, 'Nom : 100 caractères au maximum').trim(),
		description: z
			.string()
			.min(1, 'Description requise')
			.max(500, 'Description : 500 caractères au maximum')
			.trim(),
		rarity: rarityEnum,
		category: categoryEnum,
		isEnabled: z.boolean(),
		imagePath: z
			.string()
			.max(255, 'Chemin d’image : 255 caractères au maximum')
			.optional()
			.default(''),
		action: actionSchema.optional(),
		usesTotal: z
			.number()
			.int('Nombre d’utilisations : nombre entier attendu')
			.min(1, 'Nombre d’utilisations : au moins 1')
			.max(99, 'Nombre d’utilisations : 99 au maximum')
			.finite('Nombre d’utilisations : nombre fini attendu')
			.nullable()
			.optional()
			.default(null),
		sortOrder: z
			.number()
			.int('Ordre d’affichage : nombre entier attendu')
			.min(0, 'Ordre d’affichage : 0 au minimum')
			.max(999, 'Ordre d’affichage : 999 au maximum')
			.finite('Ordre d’affichage : nombre fini attendu')
			.default(0),
		basePrice: z
			.number()
			.int('Prix de base : nombre entier attendu')
			.min(0, 'Prix de base : 0 au minimum')
			.max(10000, 'Prix de base : 10000 au maximum')
			.finite('Prix de base : nombre fini attendu')
			.default(0),
		isPurchasable: z.boolean().default(true),
		maxOwnedPerStudent: z
			.number()
			.int('Exemplaires par élève : nombre entier attendu')
			.min(1, 'Exemplaires par élève : au moins 1')
			.max(100, 'Exemplaires par élève : 100 au maximum')
			.finite('Exemplaires par élève : nombre fini attendu')
			.default(5)
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
			.min(1, 'Nom vide')
			.max(100, 'Nom : 100 caractères au maximum')
			.trim()
			.optional(),
		description: z
			.string()
			.min(1, 'Description vide')
			.max(500, 'Description : 500 caractères au maximum')
			.trim()
			.optional(),
		rarity: rarityEnum.optional(),
		category: categoryEnum.optional(),
		isEnabled: z.boolean().optional(),
		imagePath: z
			.string()
			.min(1, 'Chemin d’image vide')
			.max(255, 'Chemin d’image : 255 caractères au maximum')
			.optional(),
		action: actionSchema.nullable().optional(),
		usesTotal: z
			.number()
			.int('Nombre d’utilisations : nombre entier attendu')
			.min(1, 'Nombre d’utilisations : au moins 1')
			.max(99, 'Nombre d’utilisations : 99 au maximum')
			.finite('Nombre d’utilisations : nombre fini attendu')
			.nullable()
			.optional(),
		sortOrder: z
			.number()
			.int('Ordre d’affichage : nombre entier attendu')
			.min(0, 'Ordre d’affichage : 0 au minimum')
			.max(999, 'Ordre d’affichage : 999 au maximum')
			.finite('Ordre d’affichage : nombre fini attendu')
			.optional(),
		basePrice: z
			.number()
			.int('Prix de base : nombre entier attendu')
			.min(0, 'Prix de base : 0 au minimum')
			.max(10000, 'Prix de base : 10000 au maximum')
			.finite('Prix de base : nombre fini attendu')
			.optional(),
		isPurchasable: z.boolean().optional(),
		maxOwnedPerStudent: z
			.number()
			.int('Exemplaires par élève : nombre entier attendu')
			.min(1, 'Exemplaires par élève : au moins 1')
			.max(100, 'Exemplaires par élève : 100 au maximum')
			.finite('Exemplaires par élève : nombre fini attendu')
			.optional()
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Aucun champ à modifier'
	});

/**
 * Schema for uploading VIP card image
 * Validates WebP format and size limits
 */
export const uploadImageSchema = z
	.object({
		image: z
			.instanceof(File, { message: 'Image requise' })
			.refine((file) => file.type === 'image/webp', {
				message: 'Seules les images WebP sont acceptées'
			})
			.refine((file) => file.size > 0, {
				message: 'Image vide'
			})
			.refine((file) => file.size <= 2 * 1024 * 1024, {
				message: 'Image trop lourde (2 Mo au maximum)'
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
			.min(1, 'Nom de la configuration requis')
			.max(100, 'Nom de la configuration : 100 caractères au maximum')
			.trim(),
		commonProbability: z
			.number()
			.int('Probabilité commune : nombre entier attendu')
			.min(0, 'Probabilité commune : 0 au minimum')
			.max(100, 'Probabilité commune : 100 au maximum')
			.finite('Probabilité commune : nombre fini attendu'),
		rareProbability: z
			.number()
			.int('Probabilité rare : nombre entier attendu')
			.min(0, 'Probabilité rare : 0 au minimum')
			.max(100, 'Probabilité rare : 100 au maximum')
			.finite('Probabilité rare : nombre fini attendu'),
		epicProbability: z
			.number()
			.int('Probabilité épique : nombre entier attendu')
			.min(0, 'Probabilité épique : 0 au minimum')
			.max(100, 'Probabilité épique : 100 au maximum')
			.finite('Probabilité épique : nombre fini attendu'),
		legendaryProbability: z
			.number()
			.int('Probabilité légendaire : nombre entier attendu')
			.min(0, 'Probabilité légendaire : 0 au minimum')
			.max(100, 'Probabilité légendaire : 100 au maximum')
			.finite('Probabilité légendaire : nombre fini attendu'),
		description: z
			.string()
			.max(500, 'Description : 500 caractères au maximum')
			.trim()
			.optional()
			.nullable(),
		validFrom: z
			.string()
			.datetime({ message: 'Date de début invalide (format ISO 8601 attendu)' })
			.optional()
			.nullable(),
		validUntil: z
			.string()
			.datetime({ message: 'Date de fin invalide (format ISO 8601 attendu)' })
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
			message: 'La somme des probabilités doit faire exactement 100 %',
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
			.min(1, 'Nom de la configuration vide')
			.max(100, 'Nom de la configuration : 100 caractères au maximum')
			.trim()
			.optional(),
		commonProbability: z
			.number()
			.int('Probabilité commune : nombre entier attendu')
			.min(0, 'Probabilité commune : 0 au minimum')
			.max(100, 'Probabilité commune : 100 au maximum')
			.finite('Probabilité commune : nombre fini attendu')
			.optional(),
		rareProbability: z
			.number()
			.int('Probabilité rare : nombre entier attendu')
			.min(0, 'Probabilité rare : 0 au minimum')
			.max(100, 'Probabilité rare : 100 au maximum')
			.finite('Probabilité rare : nombre fini attendu')
			.optional(),
		epicProbability: z
			.number()
			.int('Probabilité épique : nombre entier attendu')
			.min(0, 'Probabilité épique : 0 au minimum')
			.max(100, 'Probabilité épique : 100 au maximum')
			.finite('Probabilité épique : nombre fini attendu')
			.optional(),
		legendaryProbability: z
			.number()
			.int('Probabilité légendaire : nombre entier attendu')
			.min(0, 'Probabilité légendaire : 0 au minimum')
			.max(100, 'Probabilité légendaire : 100 au maximum')
			.finite('Probabilité légendaire : nombre fini attendu')
			.optional(),
		description: z
			.string()
			.max(500, 'Description : 500 caractères au maximum')
			.trim()
			.optional()
			.nullable(),
		validFrom: z
			.string()
			.datetime({ message: 'Date de début invalide (format ISO 8601 attendu)' })
			.optional()
			.nullable(),
		validUntil: z
			.string()
			.datetime({ message: 'Date de fin invalide (format ISO 8601 attendu)' })
			.optional()
			.nullable()
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: 'Aucun champ à modifier'
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
			message: 'Les quatre probabilités se modifient ensemble, et leur somme doit faire 100 %',
			path: ['commonProbability']
		}
	);

/**
 * TypeScript types inferred from schemas
 */
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type UploadImageInput = z.infer<typeof uploadImageSchema>;
export type CreateConfigInput = z.infer<typeof createConfigSchema>;
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>;
