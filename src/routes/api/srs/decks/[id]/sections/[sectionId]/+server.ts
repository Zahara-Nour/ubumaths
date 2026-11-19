/**
 * API SRS Deck Section — Modification et suppression.
 *
 * PATCH  /api/srs/decks/[id]/sections/[sectionId]  — modifie une section
 * DELETE /api/srs/decks/[id]/sections/[sectionId]  — supprime une section
 *                                                    (cartes orphelines → section_id NULL via ON DELETE SET NULL)
 *
 * Spec : docs/archive/wip/srs-fsrs-spec-tdd.md §6
 */

import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { updateSectionSchema } from '#lib/server/validation/srs.ts';
import { z } from 'zod';
import type { TablesUpdate } from '#lib/types/database.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/srs/decks/[id]/sections/[sectionId]/+server');

/** Paramètres de la route : deux uuid. */
const sectionParamsSchema = z.object({ id: z.string().uuid(), sectionId: z.string().uuid() });

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireAuth(locals);

	// P2 defense in depth : vérif ownership explicite avant tout traitement
	const { data: deck, error: deckError } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('id', params.id)
		.eq('owner_id', user.id)
		.maybeSingle();

	// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
	// panne doit se distinguer d'un refus mérité.
	if (deckError) {
		logger.error('Contrôle d’accès impossible :', deckError);
		return Response.json({ error: 'Impossible de vérifier l’accès' }, { status: 500 });
	}
	if (!deck) {
		return Response.json({ error: 'Deck introuvable ou accès refusé' }, { status: 404 });
	}

	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		return Response.json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = updateSectionSchema.safeParse(bodyRaw);
	if (!validation.success) {
		return Response.json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	const updates: TablesUpdate<'srs_deck_sections'> = {};
	if (validation.data.name !== undefined) updates.name = validation.data.name;
	if (validation.data.description !== undefined) updates.description = validation.data.description;
	if (validation.data.display_order !== undefined)
		updates.display_order = validation.data.display_order;

	if (Object.keys(updates).length === 0) {
		return Response.json({ error: 'Aucun champ à modifier' }, { status: 400 });
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
			return Response.json({ error: 'Une section avec ce nom existe déjà.' }, { status: 409 });
		}
		if (updateErr.code === '42501') {
			return Response.json({ error: 'Modification refusée par les permissions.' }, { status: 403 });
		}
		logger.error('[sections/PATCH] failed:', updateErr);
		return Response.json({ error: updateErr.message }, { status: 500 });
	}

	if (!data) {
		return Response.json({ error: 'Section introuvable' }, { status: 404 });
	}

	return Response.json({ section: data });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	const paramsValidation = sectionParamsSchema.safeParse(params);
	if (!paramsValidation.success) {
		return Response.json({ error: 'Identifiant invalide' }, { status: 400 });
	}
	const { id: deckId, sectionId } = paramsValidation.data;

	// P2 defense in depth : vérif ownership explicite
	const { data: deck, error: deckError } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('id', deckId)
		.eq('owner_id', user.id)
		.maybeSingle();

	// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
	// panne doit se distinguer d'un refus mérité.
	if (deckError) {
		logger.error('Contrôle d’accès impossible :', deckError);
		return Response.json({ error: 'Impossible de vérifier l’accès' }, { status: 500 });
	}
	if (!deck) {
		return Response.json({ error: 'Deck introuvable ou accès refusé' }, { status: 404 });
	}

	const { data: deletedSections, error: deleteErr } = await locals.supabase
		.from('srs_deck_sections')
		.delete()
		.eq('id', sectionId)
		.eq('deck_id', deckId)
		.select('id');

	if (deleteErr) {
		if (deleteErr.code === '42501') {
			return Response.json({ error: 'Suppression refusée par les permissions.' }, { status: 403 });
		}
		logger.error('[sections/DELETE] failed:', deleteErr);
		return Response.json({ error: deleteErr.message }, { status: 500 });
	}

	// 0 ligne : soit la section n'existe pas (suppression idempotente, 200 comme avant),
	// soit la RLS a refusé EN SILENCE (paquet assigné ou géré automatiquement) — la route
	// annonçait alors un succès (constat E20, 2026-10-10). On distingue par une lecture.
	if (!deletedSections || deletedSections.length === 0) {
		const { data: encore, error: lectureErr } = await locals.supabase
			.from('srs_deck_sections')
			.select('id')
			.eq('id', sectionId)
			.eq('deck_id', deckId)
			.maybeSingle();
		if (lectureErr) {
			logger.error('[sections/DELETE] contrôle impossible :', lectureErr);
			return Response.json({ error: 'Impossible de vérifier la suppression' }, { status: 500 });
		}
		if (encore) {
			return Response.json({ error: 'Cette section ne peut pas être supprimée.' }, { status: 403 });
		}
	}

	return Response.json({ success: true });
};
