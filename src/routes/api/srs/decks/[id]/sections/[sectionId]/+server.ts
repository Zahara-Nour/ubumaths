/**
 * API SRS Deck Section — Modification et suppression.
 *
 * PATCH  /api/srs/decks/[id]/sections/[sectionId]  — modifie une section
 * DELETE /api/srs/decks/[id]/sections/[sectionId]  — supprime une section
 *                                                    (cartes orphelines → section_id NULL via ON DELETE SET NULL)
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §6
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { updateSectionSchema } from '$lib/server/validation/srs';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);

	// P2 defense in depth : vérif ownership explicite avant tout traitement
	const { data: deck } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('id', params.id)
		.eq('owner_id', user.id)
		.maybeSingle();
	if (!deck) {
		return json({ error: 'Deck not found or access denied' }, { status: 404 });
	}

	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const validation = updateSectionSchema.safeParse(bodyRaw);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	const updates: Record<string, unknown> = {};
	if (validation.data.name !== undefined) updates.name = validation.data.name;
	if (validation.data.description !== undefined) updates.description = validation.data.description;
	if (validation.data.display_order !== undefined)
		updates.display_order = validation.data.display_order;

	if (Object.keys(updates).length === 0) {
		return json({ error: 'No fields to update' }, { status: 400 });
	}

	const { data, error: updateErr } = await locals.supabase
		.from('srs_deck_sections')
		.update(updates)
		.eq('id', params.sectionId)
		.eq('deck_id', params.id)
		.select('id, deck_id, name, description, display_order, created_at, updated_at')
		.single();

	if (updateErr) {
		if (updateErr.code === '23505') {
			return json({ error: 'Une section avec ce nom existe déjà.' }, { status: 409 });
		}
		if (updateErr.code === '42501') {
			return json({ error: 'Modification refusée par les permissions.' }, { status: 403 });
		}
		console.error('[sections/PATCH] failed:', updateErr);
		return json({ error: updateErr.message }, { status: 500 });
	}

	if (!data) {
		return json({ error: 'Section not found' }, { status: 404 });
	}

	return json({ section: data });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	// P2 defense in depth : vérif ownership explicite
	const { data: deck } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('id', params.id)
		.eq('owner_id', user.id)
		.maybeSingle();
	if (!deck) {
		return json({ error: 'Deck not found or access denied' }, { status: 404 });
	}

	const { error: deleteErr } = await locals.supabase
		.from('srs_deck_sections')
		.delete()
		.eq('id', params.sectionId)
		.eq('deck_id', params.id);

	if (deleteErr) {
		if (deleteErr.code === '42501') {
			return json({ error: 'Suppression refusée par les permissions.' }, { status: 403 });
		}
		console.error('[sections/DELETE] failed:', deleteErr);
		return json({ error: deleteErr.message }, { status: 500 });
	}

	return json({ success: true });
};
