/**
 * API SRS Deck Sections — Liste et création.
 *
 * GET  /api/srs/decks/[id]/sections        — liste les sections du deck
 * POST /api/srs/decks/[id]/sections        — crée une nouvelle section
 *
 * RLS bloque automatiquement les decks `is_assigned=true` ou
 * `is_auto_managed=true` (cf. migration 20260610100100).
 *
 * Spec : docs/wip/srs-fsrs-spec-tdd.md §6
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { createSectionSchema } from '$lib/server/validation/srs';

/**
 * GET /api/srs/decks/[id]/sections
 *
 * Retourne les sections triées par display_order, name.
 * Vérification ownership explicite (P2 defense in depth — RLS protégeait déjà
 * mais retournait silencieusement [] pour un deck non-owné).
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await requireAuth(locals);

	const { data: deck } = await locals.supabase
		.from('srs_decks')
		.select('id')
		.eq('id', params.id)
		.eq('owner_id', user.id)
		.maybeSingle();

	if (!deck) {
		return json({ error: 'Deck not found or access denied' }, { status: 404 });
	}

	const { data, error: dbErr } = await locals.supabase
		.from('srs_deck_sections')
		.select('id, deck_id, name, description, display_order, created_at, updated_at')
		.eq('deck_id', params.id)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (dbErr) {
		console.error('[sections] GET failed:', dbErr);
		return json({ error: 'Failed to fetch sections' }, { status: 500 });
	}

	return json({ sections: data ?? [] });
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
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const validation = createSectionSchema.safeParse(bodyRaw);
	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
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
			return json({ error: 'Une section avec ce nom existe déjà dans ce deck.' }, { status: 409 });
		}
		// 42501 = insufficient privilege (RLS)
		if (insertErr.code === '42501') {
			return json(
				{ error: "Ce deck n'accepte pas de sections manuelles (assigné ou auto-géré)." },
				{ status: 403 }
			);
		}
		console.error('[sections] POST failed:', insertErr);
		return json({ error: insertErr.message }, { status: 500 });
	}

	return json({ section: data }, { status: 201 });
};
