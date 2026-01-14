/**
 * Chat/AI validation schemas
 */

import { z } from 'zod';

// ============================================================================
// MESSAGE CONTENT SCHEMAS
// ============================================================================

/**
 * Text content part (for multimodal messages)
 */
const textContentSchema = z.object({
	type: z.literal('text'),
	text: z
		.string()
		.min(1, 'Le texte ne peut pas être vide')
		.max(10000, 'Texte trop long (max 10000)')
});

/**
 * Image URL content part (for multimodal messages)
 */
const imageUrlContentSchema = z.object({
	type: z.literal('image_url'),
	image_url: z.object({
		url: z.string().url("URL d'image invalide")
	})
});

/**
 * Message content can be:
 * - Simple string (for text-only messages)
 * - Array of content parts (for multimodal messages with text and/or images)
 */
const messageContentSchema = z.union([
	z.string().min(1, 'Le contenu du message ne peut pas être vide').max(10000, 'Message trop long'),
	z
		.array(z.discriminatedUnion('type', [textContentSchema, imageUrlContentSchema]))
		.min(1, 'Au moins un élément de contenu requis')
		.max(10, "Trop d'éléments de contenu (max 10)")
]);

// ============================================================================
// CHAT MESSAGE SCHEMAS
// ============================================================================

/**
 * Individual chat message schema
 */
const chatMessageSchema = z.object({
	role: z.enum(['system', 'user', 'assistant'], {
		message: 'Rôle de message invalide'
	}),
	content: messageContentSchema
});

/**
 * Schema for chat request (POST /api/chat)
 * Validates the entire conversation payload
 *
 * Security constraints:
 * - Min 1 message (prevents empty requests)
 * - Max 50 messages (prevents abuse/DoS)
 * - Max 10000 chars per message content (prevents payload attacks)
 * - Max 10 content parts per multimodal message (prevents complexity attacks)
 */
export const chatRequestSchema = z.object({
	messages: z
		.array(chatMessageSchema)
		.min(1, 'Au moins un message requis')
		.max(50, 'Trop de messages dans la conversation (max 50)')
});

// ============================================================================
// MESSAGE MODERATION SCHEMAS
// ============================================================================

/**
 * Schema for reporting a message
 *
 * Security constraints:
 * - messageId must be valid UUID (prevents injection)
 * - reason must be one of allowed values (prevents arbitrary data)
 * - details max 500 chars (prevents abuse)
 */
export const reportMessageSchema = z.object({
	messageId: z.string().uuid('Message ID must be a valid UUID'),
	reason: z.enum(['spam', 'harassment', 'inappropriate', 'other'], {
		message: 'Invalid reason. Must be spam, harassment, inappropriate, or other'
	}),
	details: z.string().max(500, 'Details cannot exceed 500 characters').optional()
});

// ============================================================================
// CONVERSATION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for creating a 1-on-1 conversation
 *
 * Security constraints:
 * - friendId must be valid UUID (prevents injection)
 */
export const createConversationSchema = z.object({
	friendId: z.string().uuid('Friend ID must be a valid UUID')
});

// ============================================================================
// TUTOR MODE SCHEMAS
// ============================================================================

/**
 * Exercise context for tutor mode
 */
const exerciseContextSchema = z.object({
	exerciseId: z.string().uuid('ID exercice invalide').optional(),
	statement: z.string().max(5000, 'Énoncé trop long (max 5000 caractères)'),
	topic: z.string().max(100, 'Sujet trop long (max 100 caractères)').optional(),
	domain: z.string().max(100, 'Domaine trop long (max 100 caractères)').optional(),
	level: z.number().int().min(1).max(5).optional(),
	studentGrade: z.string().max(20, 'Niveau élève invalide').optional(),
	attempts: z
		.array(
			z.object({
				answer: z.string().max(1000, 'Réponse trop longue (max 1000 caractères)').optional(),
				isCorrect: z.boolean(),
				timestamp: z.string().datetime('Timestamp invalide').optional()
			})
		)
		.max(20, 'Trop de tentatives dans le contexte (max 20)')
		.optional()
});

/**
 * Schema for tutor chat request (POST /api/chat with tutor mode)
 *
 * Security constraints:
 * - Extends chatRequestSchema with tutor-specific fields
 * - helpLevel limited to 0-7 range
 * - exerciseContext validated with size limits
 * - conversationId must be UUID if provided
 */
export const tutorRequestSchema = chatRequestSchema.extend({
	tutorMode: z.boolean().default(false),
	exerciseContext: exerciseContextSchema.optional(),
	// Use nullish() to accept both null and undefined (null comes from JSON.stringify when conversationId is null)
	conversationId: z.string().uuid('ID conversation invalide').nullish(),
	helpLevel: z
		.number()
		.int("Niveau d'aide doit être un entier")
		.min(0, "Niveau d'aide minimum: 0")
		.max(7, "Niveau d'aide maximum: 7")
		.default(0)
});

// ============================================================================
// TUTOR CONVERSATION MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schema for querying tutor conversations (GET /api/tutor/conversations)
 *
 * Security constraints:
 * - Both exerciseId and assignmentId must be valid UUIDs
 */
export const getTutorConversationQuerySchema = z.object({
	exerciseId: z.string().uuid('ID exercice invalide'),
	assignmentId: z.string().uuid('ID assignment invalide')
});

/**
 * Schema for creating a tutor conversation (POST /api/tutor/conversations)
 *
 * Security constraints:
 * - exerciseId and assignmentId must be valid UUIDs
 * - statement limited to 5000 chars
 * - The correction is fetched server-side, not from client
 */
export const createTutorConversationSchema = z.object({
	exerciseId: z.string().uuid('ID exercice invalide'),
	assignmentId: z.string().uuid('ID assignment invalide'),
	statement: z.string().max(5000, 'Énoncé trop long (max 5000 caractères)'),
	topic: z.string().max(100, 'Sujet trop long').optional(),
	classId: z.string().uuid('ID classe invalide').optional()
});

/**
 * Schema for querying tutor messages (GET /api/tutor/conversations/[id]/messages)
 *
 * Security constraints:
 * - limit between 1 and 100
 * - before must be valid ISO timestamp if provided
 */
export const getTutorMessagesQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).default(50),
	before: z.string().datetime('Timestamp invalide').optional()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type TutorRequest = z.infer<typeof tutorRequestSchema>;
export type ReportMessageInput = z.infer<typeof reportMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type GetTutorConversationQuery = z.infer<typeof getTutorConversationQuerySchema>;
export type CreateTutorConversationInput = z.infer<typeof createTutorConversationSchema>;
export type GetTutorMessagesQuery = z.infer<typeof getTutorMessagesQuerySchema>;
