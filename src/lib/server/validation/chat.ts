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
// TYPE EXPORTS
// ============================================================================

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
