/**
 * API Route: /api/organisation/kanban/cards/[cardId]
 *
 * PATCH  — edit title / description, and/or move the card (change column_id +
 *          position). Anyone with board access can edit.
 * DELETE — remove a card. Anyone with board access can delete.
 *
 * Cross-board moves are forbidden at the API layer: when `column_id` changes,
 * we verify the destination column belongs to the same board as the source.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { parseKanbanId, updateCardSchema } from '$lib/server/validation/kanban';
import { getCardColumnId, getColumnBoardId, rateLimitResponse } from '$lib/server/kanban';
import { checkKanbanCardMutationRateLimit } from '$lib/server/rateLimiter';
import type { KanbanCard } from '$lib/types/database-helpers';

/**
 * Mutation payload accepted by the card PATCH endpoint. Differs from
 * `KanbanCardUpdate` because moving a card across columns is an explicit
 * use-case here (column_id IS allowed), while it's omitted from the generic
 * Update type to discourage accidental column changes elsewhere.
 */
type CardMutationPayload = Partial<
	Pick<KanbanCard, 'title' | 'description' | 'column_id' | 'position' | 'due_date'>
>;

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireAuth(locals);

	const rl = rateLimitResponse(await checkKanbanCardMutationRateLimit(user.id));
	if (rl) return rl;

	const cardId = parseKanbanId(params.cardId, 'carte');

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'JSON invalide');
	}

	const parsed = updateCardSchema.safeParse(body);
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Look up current column so we can validate cross-board moves and surface
	// 404 cleanly when the card is invisible / missing.
	const currentColumnId = await getCardColumnId(locals.supabase, cardId);
	if (!currentColumnId) {
		throw error(404, 'Carte introuvable');
	}

	// If a move is requested, verify the destination column belongs to the
	// SAME board as the source. This blocks the (otherwise RLS-allowed)
	// scenario where a user with access to two boards could move a card
	// between them.
	if (parsed.data.column_id && parsed.data.column_id !== currentColumnId) {
		const [sourceBoardId, destBoardId] = await Promise.all([
			getColumnBoardId(locals.supabase, currentColumnId),
			getColumnBoardId(locals.supabase, parsed.data.column_id)
		]);

		if (!destBoardId) {
			throw error(404, 'Colonne de destination introuvable');
		}
		if (sourceBoardId !== destBoardId) {
			throw error(
				400,
				'Déplacement inter-tableaux interdit : la colonne de destination doit appartenir au même tableau'
			);
		}
	}

	const updatePayload: CardMutationPayload = {};
	if (parsed.data.title !== undefined) updatePayload.title = parsed.data.title;
	if (parsed.data.description !== undefined) {
		updatePayload.description = parsed.data.description;
	}
	if (parsed.data.column_id !== undefined) updatePayload.column_id = parsed.data.column_id;
	if (parsed.data.position !== undefined) updatePayload.position = parsed.data.position;
	if (parsed.data.due_date !== undefined) updatePayload.due_date = parsed.data.due_date;

	// Card row update — only when there's something to update on the card
	// itself. When the patch is tags-only we skip this round-trip entirely.
	const hasRowUpdate = Object.keys(updatePayload).length > 0;
	let cardRow: KanbanCard | null = null;
	if (hasRowUpdate) {
		const { data, error: dbError } = await locals.supabase
			.from('kanban_cards')
			.update(updatePayload)
			.eq('id', cardId)
			.select()
			.single();
		if (dbError || !data) {
			console.error('[kanban] update card failed:', dbError);
			throw error(500, 'Erreur lors de la mise à jour de la carte');
		}
		cardRow = data as KanbanCard;
	}

	// Tags: full replacement of the card's tag set. We delete the existing
	// associations then bulk-insert the new ones. RLS on kanban_card_tags
	// blocks any tag from a different board, so we don't need to revalidate
	// here. We DO it inside the same request so a single PATCH is atomic
	// from the client's POV — the DB doesn't expose a true transaction
	// through the JS client, so a partial failure here is reported via 500
	// and the client rollbacks.
	if (parsed.data.tag_ids !== undefined) {
		const { error: delError } = await locals.supabase
			.from('kanban_card_tags')
			.delete()
			.eq('card_id', cardId);
		if (delError) {
			console.error('[kanban] clear card tags failed:', delError);
			throw error(500, 'Erreur lors de la mise à jour des tags');
		}
		if (parsed.data.tag_ids.length > 0) {
			const rows = parsed.data.tag_ids.map((tag_id) => ({ card_id: cardId, tag_id }));
			const { error: insError } = await locals.supabase.from('kanban_card_tags').insert(rows);
			if (insError) {
				console.error('[kanban] set card tags failed:', insError);
				throw error(500, 'Erreur lors de la mise à jour des tags');
			}
		}
	}

	// If only tags were updated we still need to return the row so the
	// client can refresh its local copy with the latest updated_at etc.
	if (!cardRow) {
		const { data, error: dbError } = await locals.supabase
			.from('kanban_cards')
			.select()
			.eq('id', cardId)
			.single();
		if (dbError || !data) {
			console.error('[kanban] read-back card failed:', dbError);
			throw error(500, 'Erreur lors de la mise à jour de la carte');
		}
		cardRow = data as KanbanCard;
	}

	return json({ card: cardRow });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	const { user } = await requireAuth(locals);

	const rl = rateLimitResponse(await checkKanbanCardMutationRateLimit(user.id));
	if (rl) return rl;

	const cardId = parseKanbanId(params.cardId, 'carte');

	// Verify existence (and access via RLS) before delete so we return 404
	// rather than a silent success on a non-existent card.
	const currentColumnId = await getCardColumnId(locals.supabase, cardId);
	if (!currentColumnId) {
		throw error(404, 'Carte introuvable');
	}

	const { error: dbError } = await locals.supabase.from('kanban_cards').delete().eq('id', cardId);

	if (dbError) {
		console.error('[kanban] delete card failed:', dbError);
		throw error(500, 'Erreur lors de la suppression de la carte');
	}

	return json({ success: true });
};
