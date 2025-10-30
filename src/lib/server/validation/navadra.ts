/**
 * Navadra game validation schemas
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// ============================================================================
// GAME ENUMS
// ============================================================================

/**
 * Valid spell elements
 */
export const spellElementSchema = z.enum(['fire', 'water', 'earth', 'air', 'light', 'dark']);

/**
 * Valid spell types
 */
export const spellTypeSchema = z.enum(['attack', 'defense', 'heal', 'buff', 'debuff']);

/**
 * Valid monster categories
 */
export const monsterCategorySchema = z.enum(['common', 'rare', 'epic', 'legendary']);

/**
 * Valid combat status
 */
export const combatStatusSchema = z.enum(['active', 'completed', 'abandoned']);

/**
 * Valid combat outcome
 */
export const combatOutcomeSchema = z.enum(['victory', 'defeat', 'draw']);

// ============================================================================
// SPELL SCHEMAS
// ============================================================================

/**
 * Schema for unlocking a spell
 */
export const unlockSpellSchema = z.object({
	spell_num: z
		.number()
		.int('Le numéro de sort doit être un entier')
		.positive('Le numéro de sort doit être positif')
		.max(999, 'Numéro de sort invalide'),
	element: spellElementSchema,
	type: spellTypeSchema,
	power: z
		.number()
		.int('La puissance doit être un entier')
		.positive('La puissance doit être positive')
		.max(1000, 'Puissance trop élevée')
});

/**
 * Schema for selecting a spell in combat
 */
export const selectSpellSchema = z.object({
	spell_num: z
		.number()
		.int('Le numéro de sort doit être un entier')
		.positive('Le numéro de sort doit être positif')
		.max(999, 'Numéro de sort invalide')
});

// ============================================================================
// COMBAT SCHEMAS
// ============================================================================

/**
 * Schema for starting combat with an existing monster
 */
export const startCombatSchema = z.object({
	monster_id: uuidSchema.optional()
});

/**
 * Schema for submitting a challenge answer in combat
 */
export const submitAnswerSchema = z.object({
	challenge_id: uuidSchema,
	answer: z
		.string()
		.min(1, 'Réponse requise')
		.max(10000, 'Réponse trop longue')
		.transform((str, ctx) => {
			try {
				return JSON.parse(str);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Format JSON invalide pour la réponse'
				});
				return z.NEVER;
			}
		}),
	correct_answer: z
		.string()
		.min(1, 'Réponse correcte requise')
		.max(10000, 'Réponse correcte trop longue')
		.transform((str, ctx) => {
			try {
				return JSON.parse(str);
			} catch {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'Format JSON invalide pour la réponse correcte'
				});
				return z.NEVER;
			}
		}),
	time_taken: z
		.number()
		.int('Le temps doit être un entier')
		.nonnegative('Le temps ne peut pas être négatif')
		.max(600000, 'Temps trop long (max 10 minutes)'),
	spell_num: z
		.number()
		.int('Le numéro de sort doit être un entier')
		.positive('Le numéro de sort doit être positif')
		.max(999, 'Numéro de sort invalide')
});

// ============================================================================
// MONSTER SCHEMAS
// ============================================================================

/**
 * Schema for monster configuration
 */
export const monsterConfigSchema = z.object({
	name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
	element: spellElementSchema,
	level: z.number().int().positive().max(100, 'Niveau trop élevé'),
	category: monsterCategorySchema,
	max_endurance: z
		.number()
		.int("L'endurance doit être un entier")
		.positive("L'endurance doit être positive")
		.max(999999, 'Endurance trop élevée'),
	attack_coefficient: z
		.number()
		.positive('Le coefficient doit être positif')
		.max(100, 'Coefficient trop élevé')
});

// ============================================================================
// DECK SCHEMAS
// ============================================================================

/**
 * Schema for creating/updating a spell deck
 */
export const spellDeckSchema = z.object({
	name: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
	spell_nums: z
		.array(z.number().int().positive().max(999))
		.min(1, 'Au moins un sort requis')
		.max(20, 'Maximum 20 sorts par deck'),
	is_active: z.boolean().default(false)
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Spell unlock response schema
 */
export const spellUnlockResponseSchema = z.object({
	success: z.literal(true),
	spell: z.object({
		id: uuidSchema,
		spell_num: z.number().int().positive(),
		element: spellElementSchema,
		type: spellTypeSchema,
		power: z.number().int().positive(),
		level: z.number().int().positive()
	})
});

/**
 * Combat creation response schema
 */
export const combatCreationResponseSchema = z.object({
	success: z.literal(true),
	combat_id: uuidSchema
});

/**
 * Challenge selection response schema
 */
export const challengeSelectionResponseSchema = z.object({
	success: z.literal(true),
	spell: z.object({
		id: uuidSchema,
		spell_num: z.number().int().positive(),
		element: spellElementSchema,
		power: z.number().int().positive()
	}),
	challenge: z.object({
		id: uuidSchema,
		element: spellElementSchema,
		difficulty: z.number().int().positive().max(10)
	})
});

/**
 * Combat turn response schema
 */
export const combatTurnResponseSchema = z.object({
	success: z.literal(true),
	damageDealt: z.number().int().nonnegative(),
	challengeSuccess: z.boolean(),
	victory: z.boolean(),
	rewards: z
		.object({
			xp: z.number().int().nonnegative(),
			prestige: z.number().int().nonnegative(),
			pyrs: z.number().int().nonnegative(),
			element: spellElementSchema
		})
		.optional()
});
