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
import { getCardColumnId, getColumnBoardId } from '$lib/server/kanban';
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
	await requireAuth(locals);
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

	return json({ card: data as KanbanCard });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	await requireAuth(locals);
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
