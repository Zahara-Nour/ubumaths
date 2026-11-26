/**
 * Messaging system validation schemas
 */

import { z } from 'zod';
import type { Json } from '#lib/types/database.ts';

/** Texte d'un message : la limite d'avant, comptée sur le texte du document. */
export const MESSAGE_MAX_CHARS = 10_000;

/** Poids du document écrit en JSON (mise en forme et formules comprises). */
const MESSAGE_MAX_JSON_LENGTH = 100_000;

/** Emboîtement des blocs : l'éditeur ne dépasse pas quelques niveaux de listes. */
const MESSAGE_MAX_DEPTH = 20;

const NODE_TYPE_MAX_LENGTH = 50;

/** Blocs qui, vides, ne montrent rien : à eux seuls ils ne font pas un message. */
const BLANK_LEAF_TYPES = new Set(['paragraph', 'heading', 'hardBreak', 'text']);

interface DocumentMeasure {
	/** Caractères de texte */
	chars: number;
	/** Au moins un texte non blanc, ou un bloc sans texte qui se voit (formule…) */
	visible: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Mesure un bloc du document et ses enfants ; `null` s'il n'a pas la forme d'un
 * bloc de l'éditeur (type absent, enfants qui ne sont pas une liste, trop profond).
 */
function measureNode(node: unknown, depth: number): DocumentMeasure | null {
	if (depth > MESSAGE_MAX_DEPTH || !isRecord(node)) return null;
	const { type, text, content } = node;
	if (typeof type !== 'string' || type.length === 0 || type.length > NODE_TYPE_MAX_LENGTH) {
		return null;
	}
	if (text !== undefined && typeof text !== 'string') return null;
	if (content !== undefined && !Array.isArray(content)) return null;

	const ownText = typeof text === 'string' ? text : '';
	const measure: DocumentMeasure = {
		chars: ownText.length,
		visible: ownText.trim().length > 0 || (content === undefined && !BLANK_LEAF_TYPES.has(type))
	};
	for (const child of content ?? []) {
		const childMeasure = measureNode(child, depth + 1);
		if (!childMeasure) return null;
		measure.chars += childMeasure.chars;
		measure.visible ||= childMeasure.visible;
	}
	return measure;
}

/**
 * Ce qui empêche `value` d'être le contenu d'un message, ou `null` s'il convient :
 * un document de l'éditeur riche (`{ type: 'doc', content: [...] }`), borné en
 * profondeur, en poids et en texte, et qui montre quelque chose.
 */
export function messageDocumentProblem(value: unknown): string | null {
	if (!isRecord(value) || value.type !== 'doc' || !Array.isArray(value.content)) {
		return 'Message illisible';
	}
	const measure = measureNode(value, 0);
	if (!measure) return 'Message illisible';
	if (JSON.stringify(value).length > MESSAGE_MAX_JSON_LENGTH || measure.chars > MESSAGE_MAX_CHARS) {
		return 'Message trop long (10 000 caractères au plus)';
	}
	if (!measure.visible) return 'Le message est vide';
	return null;
}

/**
 * Schema for sending a message
 */
export const sendMessageSchema = z.object({
	recipientIds: z.array(z.string().uuid()).max(100).optional(),
	subject: z
		.string()
		.trim()
		.min(1, 'Subject is required')
		.max(200, 'Subject too long (max 200 characters)'),
	// Le document de l'éditeur riche (jsonb de `send_private_message`), pas une chaîne
	content: z
		.unknown()
		.superRefine((value, ctx) => {
			const problem = messageDocumentProblem(value);
			if (problem) ctx.addIssue({ code: 'custom', message: problem });
		})
		// Sorti de `request.json()` et vérifié ci-dessus : c'est du JSON
		.transform((value) => value as Json),
	isGroupMessage: z.boolean().default(false),
	classId: z.string().uuid().optional().nullable(),
	parentMessageId: z.string().uuid().optional().nullable()
});

/**
 * Schema for saving a message draft
 */
export const saveDraftSchema = z.object({
	id: z.string().uuid().optional(),
	subject: z.string().max(200).optional(),
	content: z.string().max(10000).optional(),
	recipientIds: z.array(z.string().uuid()).max(100).optional(),
	isGroupMessage: z.boolean().default(false),
	classId: z.string().uuid().optional().nullable(),
	replyingToMessageId: z.string().uuid().optional().nullable()
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Message recipient schema
 */
export const messageRecipientSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	email: z.string().email()
});

/**
 * Single message response schema
 */
export const messageResponseSchema = z.object({
	id: z.string().uuid(),
	sender_id: z.string().uuid(),
	sender_name: z.string(),
	sender_email: z.string().email(),
	subject: z.string(),
	content: z.string(),
	is_group_message: z.boolean(),
	class_id: z.string().uuid().nullable().optional(),
	parent_message_id: z.string().uuid().nullable().optional(),
	created_at: z.string().datetime(),
	read: z.boolean().optional()
});

/**
 * Colonnes à défaut mais sans NOT NULL (`is_starred`, `is_group_message`,
 * `recipient_count`) : un NULL prend le défaut de la colonne au lieu de faire
 * tomber toute la liste en 500.
 */
const nullableFlag = z
	.boolean()
	.nullable()
	.transform((flag) => flag ?? false);
const nullableRecipientCount = z
	.number()
	.int()
	.nonnegative()
	.nullable()
	.transform((count) => count ?? 1);

/**
 * Message inbox response schema (GET /api/messages/inbox) : une ligne de
 * get_user_inbox. Pas `messageResponseSchema` : la RPC ne rend ni adresse de
 * l'expéditeur ni created_at, et l'adresse n'a pas à circuler.
 */
export const inboxMessagesResponseSchema = z.object({
	messages: z.array(
		z
			.object({
				message_id: z.string().uuid(),
				sender_id: z.string().uuid(),
				// profiles.full_name peut être nul : un libellé plutôt qu'une ligne refusée
				sender_name: z
					.string()
					.nullable()
					.transform((name) => name ?? 'Expéditeur inconnu'),
				sender_avatar_url: z.string().nullable(),
				subject: z.string(),
				// jsonb de l'éditeur, rendu tel quel
				content: z.unknown(),
				plain_text: z.string().nullable(),
				// Horodatage Postgres : décalage « +00:00 », que .datetime() refuse par défaut
				sent_at: z.string().datetime({ offset: true }),
				read_at: z.string().datetime({ offset: true }).nullable(),
				is_starred: nullableFlag,
				status: z.enum(['inbox', 'archived', 'trash']),
				is_group_message: nullableFlag,
				recipient_count: nullableRecipientCount,
				has_attachments: z.boolean(),
				attachment_count: z.number().int().nonnegative()
			})
			// Les pages lisent `id` (clé de liste) et `message_id` (actions)
			.transform((row) => ({ ...row, id: row.message_id }))
	)
});

/**
 * Sent messages response schema (GET /api/messages/sent) : une ligne de
 * get_user_sent_messages, qui rend les destinataires et non l'expéditeur.
 */
export const sentMessagesResponseSchema = z.object({
	messages: z.array(
		z
			.object({
				message_id: z.string().uuid(),
				subject: z.string(),
				content: z.unknown(),
				plain_text: z.string().nullable(),
				sent_at: z.string().datetime({ offset: true }),
				is_group_message: nullableFlag,
				recipient_count: nullableRecipientCount,
				has_attachments: z.boolean(),
				// jsonb_agg rend null quand il ne reste aucune ligne de destinataire
				recipients: z
					.array(
						z.object({
							id: z.string().uuid(),
							name: z
								.string()
								.nullable()
								.transform((name) => name ?? 'Destinataire inconnu'),
							avatar_url: z.string().nullable()
						})
					)
					.nullable()
					.transform((recipients) => recipients ?? [])
			})
			.transform((row) => ({ ...row, id: row.message_id }))
	)
});

/**
 * Un message du fil (GET /api/messages/thread) : les champs que lit la page
 * /messages/thread/[id], tirés de get_message_thread (ordre, niveau) et de
 * get_message_details (rôle, pièces jointes). Pas le schéma de la boîte de
 * réception : ces RPC ne rendent ni sender_email ni created_at.
 */
export const threadMessageResponseSchema = z.object({
	id: z.string().uuid(),
	sender_id: z.string().uuid(),
	sender_name: z.string().nullable(),
	sender_avatar_url: z.string().nullable(),
	sender_role: z.string().nullable(),
	subject: z.string(),
	// jsonb de l'éditeur, rendu tel quel par MessageContent
	content: z.unknown(),
	// Horodatage Postgres : décalage « +00:00 », que .datetime() refuse par défaut
	sent_at: z.string().datetime({ offset: true }),
	edited_at: z.string().datetime({ offset: true }).nullable(),
	parent_message_id: z.string().uuid().nullable(),
	level: z.number().int().nonnegative(),
	attachments: z.array(z.record(z.string(), z.unknown())).nullable()
});

/**
 * Message thread response schema (GET /api/messages/thread)
 */
export const messageThreadResponseSchema = z.object({
	messages: z.array(threadMessageResponseSchema)
});

/**
 * Message detail response schema (GET /api/messages/[id])
 */
export const messageDetailResponseSchema = z.object({
	message: messageResponseSchema
});

/**
 * Send message response schema (POST /api/messages/send)
 */
export const sendMessageResponseSchema = z.object({
	success: z.literal(true),
	message_id: z.string().uuid(),
	recipients_count: z.number().int().positive()
});

/**
 * Draft schema
 */
export const draftResponseSchema = z.object({
	id: z.string().uuid(),
	subject: z.string().nullable().optional(),
	content: z.string().nullable().optional(),
	recipient_ids: z.array(z.string().uuid()).nullable().optional(),
	is_group_message: z.boolean(),
	class_id: z.string().uuid().nullable().optional(),
	replying_to_message_id: z.string().uuid().nullable().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

/**
 * Drafts list response schema (GET /api/messages/drafts)
 */
export const draftsListResponseSchema = z.object({
	drafts: z.array(draftResponseSchema)
});

/**
 * Save draft response schema (POST /api/messages/drafts)
 */
export const saveDraftResponseSchema = z.object({
	success: z.literal(true),
	draft_id: z.string().uuid()
});

/**
 * Recipients list response schema (GET /api/messages/recipients)
 */
export const recipientsListResponseSchema = z.object({
	recipients: z.array(messageRecipientSchema)
});

/**
 * Unread count response schema (GET /api/messages/unread-count)
 */
export const unreadCountResponseSchema = z.object({
	count: z.number().int().nonnegative()
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

/**
 * Schema for search query parameters (GET /api/messages/search)
 */
export const searchMessagesQuerySchema = z.object({
	q: z.string().trim().min(1, 'Requête de recherche requise').max(200, 'Requête trop longue'),
	searchIn: z.enum(['inbox', 'sent', 'all']).default('all').optional(),
	hasAttachments: z
		.string()
		.optional()
		.transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
	senderName: z.string().max(200).optional(),
	dateFrom: z.string().datetime('Date invalide').optional(),
	dateTo: z.string().datetime('Date invalide').optional(),
	limit: z.coerce.number().int().positive().max(100, 'Maximum 100 résultats').default(50),
	offset: z.coerce.number().int().nonnegative().default(0)
});

/**
 * Search messages response schema (GET /api/messages/search)
 */
export const searchMessagesResponseSchema = z.object({
	messages: z.array(messageResponseSchema),
	total: z.number().int().nonnegative()
});

// ============================================================================
// QUERY PARAMETER SCHEMAS
// ============================================================================

/**
 * Schema for inbox query parameters (GET /api/messages/inbox)
 */
export const inboxMessagesQuerySchema = z.object({
	status: z.enum(['inbox', 'archived', 'trash']).default('inbox'),
	folderId: z.string().uuid().optional(),
	limit: z.coerce.number().int().positive().max(100, 'Maximum 100 messages').default(50),
	// Borné : au-delà d'un entier Postgres, la RPC échouerait en 500
	offset: z.coerce.number().int().nonnegative().max(100000, 'Décalage trop grand').default(0)
});

/**
 * Schema for sent messages query parameters (GET /api/messages/sent)
 */
export const sentMessagesQuerySchema = z.object({
	limit: z.coerce.number().int().positive().max(100, 'Maximum 100 messages').default(50),
	// Borné : au-delà d'un entier Postgres, la RPC échouerait en 500
	offset: z.coerce.number().int().nonnegative().max(100000, 'Décalage trop grand').default(0)
});

/**
 * Schema for thread messages query parameters (GET /api/messages/thread)
 */
export const threadMessagesQuerySchema = z.object({
	rootId: z.string().uuid('ID du message racine invalide')
});

// ============================================================================
// UPDATE MESSAGE SCHEMAS
// ============================================================================

/**
 * Schema for updating message (PATCH /api/messages/[id])
 *
 * Union discriminée sur `action` plutôt qu'un objet plat contrôlé par
 * `.refine()`. Le `refine` validait bien à l'exécution, mais laissait `status`
 * et `folderId` en `string | undefined` pour le compilateur : les routes
 * devaient donc les passer tels quels à des RPC qui exigent une chaîne, et le
 * commentaire « Zod a déjà validé » remplaçait une garantie de type.
 *
 * La discrimination donne les deux à la fois : même contrat d'exécution, et un
 * `switch (action)` qui rétrécit réellement les champs associés.
 */
export const updateMessageSchema = z.discriminatedUnion('action', [
	z.object({
		action: z.literal('updateStatus'),
		// Message en français : il remonte tel quel au client (UI francophone).
		status: z.enum(['inbox', 'archived', 'trash'], {
			message: 'Champs requis manquants pour cette action : statut'
		})
	}),
	z.object({
		action: z.literal('moveToFolder'),
		folderId: z
			.string({ message: 'Champs requis manquants pour cette action : dossier' })
			.uuid('ID de dossier invalide')
	}),
	z.object({ action: z.literal('toggleRead') }),
	z.object({ action: z.literal('toggleStar') })
]);
