/**
 * API SRS Deck Sections — Liste et création.
 *
 * GET  /api/srs/decks/[id]/sections        — liste les sections du deck
 * POST /api/srs/decks/[id]/sections        — crée une nouvelle section
 *
 * RLS bloque automatiquement les decks `is_assigned=true` ou
 * `is_auto_managed=true` (cf. migration 20260610100100).
 *
 * Spec : docs/archive/wip/srs-fsrs-spec-tdd.md §6
 */

import { serverErrorResponse } from '#lib/server/utils/error-handler.ts';
import type { RequestHandler } from './$types';
import { requireAuth } from '#lib/server/middleware/auth.ts';
import { createSectionSchema } from '#lib/server/validation/srs.ts';
import { createServerLogger } from '#lib/utils/logger.ts';

const logger = createServerLogger('api/srs/decks/[id]/sections/+server');

/**
 * GET /api/srs/decks/[id]/sections
 *
 * Retourne les sections triées par display_order, name.
 * Vérification ownership explicite (P2 defense in depth — RLS protégeait déjà
 * mais retournait silencieusement [] pour un deck non-owné).
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

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

	const { data, error: dbErr } = await locals.supabase
		.from('srs_deck_sections')
		.select('id, deck_id, name, description, display_order, created_at, updated_at')
		.eq('deck_id', params.id)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (dbErr) {
		logger.error('[sections] GET failed:', dbErr);
		return Response.json({ error: 'Impossible de charger les sections' }, { status: 500 });
	}

	return Response.json({ sections: data ?? [] });
};

/**
 * POST /api/srs/decks/[id]/sections
 *
 * Crée une section dans le deck. RLS refuse si le deck est assigné
 * ou auto-géré (403 → renvoyé comme 403 par Supabase).
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	await requireAuth(locals);

	let bodyRaw: unknown;
	try {
		bodyRaw = await request.json();
	} catch {
		return Response.json({ error: 'Corps de requête illisible' }, { status: 400 });
	}

	const validation = createSectionSchema.safeParse(bodyRaw);
	if (!validation.success) {
		return Response.json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	const { name, description, display_order } = validation.data;

	const { data, error: insertErr } = await locals.supabase
		.from('srs_deck_sections')
		.insert({
			deck_id: params.id,
			name,
			description: description ?? null,
			display_order
		})
		.select('id, deck_id, name, description, display_order, created_at, updated_at')
		.single();

	if (insertErr) {
		// 23505 = unique violation (deck_id, name)
		if (insertErr.code === '23505') {
			return Response.json(
				{ error: 'Une section avec ce nom existe déjà dans ce deck.' },
				{ status: 409 }
			);
		}
		// 42501 = insufficient privilege (RLS)
		if (insertErr.code === '42501') {
			return Response.json(
				{ error: "Ce deck n'accepte pas de sections manuelles (assigné ou auto-géré)." },
				{ status: 403 }
			);
		}
		return serverErrorResponse(
			'api/srs/sections/POST',
			insertErr,
			'Impossible de créer la section'
		);
	}

	return Response.json({ section: data }, { status: 201 });
};
