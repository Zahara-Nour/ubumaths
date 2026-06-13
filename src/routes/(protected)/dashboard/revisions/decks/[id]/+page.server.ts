/**
 * Deck Detail Page Server
 *
 * Vue gestion d'un deck personnel : sections manuelles + cartes regroupées.
 * Pour les decks auto-managés (Programme), la page redirige vers la vue dédiée.
 * Pour les decks assignés (RO), affiche les cartes mais désactive les actions.
 *
 * Cf. docs/wip/srs-fsrs-spec-tdd.md §6 + §8
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { UNASSIGNED_KEY } from './constants';
import { requireAuth } from '$lib/server/middleware/auth';

export interface DeckSection {
	id: string;
	name: string;
	description: string | null;
	display_order: number;
}

export interface DeckCardLite {
	id: string;
	cardType: 'template' | 'custom';
	templateId: string | null;
	templateSubdomain: string | null;
	sectionId: string | null;
	createdAt: string;
}

export interface DeckDetailData {
	deck: {
		id: string;
		name: string;
		description: string | null;
		isAssigned: boolean;
		isAutoManaged: boolean;
	};
	sections: DeckSection[];
	/** Cartes regroupées par section_id (ou clé `__unassigned` pour celles sans section). */
	cardsBySection: Record<string, DeckCardLite[]>;
	totalCards: number;
}

export const load: PageServerLoad = async ({ params, locals }): Promise<DeckDetailData> => {
	const { user } = await requireAuth(locals);

	// 1. Charger le deck (RLS vérifie ownership)
	const { data: deck, error: deckErr } = await locals.supabase
		.from('srs_decks')
		.select('id, name, description, is_assigned, is_auto_managed, owner_id')
		.eq('id', params.id)
		.maybeSingle();

	if (deckErr) throw error(500, deckErr.message);
	if (!deck) throw error(404, 'Deck introuvable');
	if (deck.owner_id !== user.id) throw error(403, 'Accès refusé');

	// Redirection vers vue dédiée pour Programme
	if (deck.is_auto_managed) {
		redirect(307, '/dashboard/revisions/decks/programme');
	}

	// 2. Charger les sections
	const { data: sectionsData, error: sectionsErr } = await locals.supabase
		.from('srs_deck_sections')
		.select('id, name, description, display_order')
		.eq('deck_id', deck.id)
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (sectionsErr) throw error(500, sectionsErr.message);

	const sections: DeckSection[] = sectionsData ?? [];

	// 3. Charger les cartes avec leur section_id
	const { data: cardsData, error: cardsErr } = await locals.supabase
		.from('srs_cards')
		.select('id, card_type, template_id, section_id, created_at, question_templates(subdomain)')
		.eq('deck_id', deck.id)
		.order('created_at', { ascending: true });

	if (cardsErr) throw error(500, cardsErr.message);

	type CardRow = {
		id: string;
		card_type: 'template' | 'custom';
		template_id: string | null;
		section_id: string | null;
		created_at: string;
		question_templates: { subdomain: string | null } | null;
	};

	const cards: DeckCardLite[] = ((cardsData ?? []) as unknown as CardRow[]).map((c) => ({
		id: c.id,
		cardType: c.card_type,
		templateId: c.template_id,
		templateSubdomain: c.question_templates?.subdomain ?? null,
		sectionId: c.section_id,
		createdAt: c.created_at
	}));

	// 4. Regrouper par section_id
	const cardsBySection: Record<string, DeckCardLite[]> = { [UNASSIGNED_KEY]: [] };
	for (const s of sections) cardsBySection[s.id] = [];
	for (const c of cards) {
		const key = c.sectionId ?? UNASSIGNED_KEY;
		if (!cardsBySection[key]) cardsBySection[key] = [];
		cardsBySection[key].push(c);
	}

	return {
		deck: {
			id: deck.id,
			name: deck.name,
			description: deck.description,
			isAssigned: deck.is_assigned,
			isAutoManaged: deck.is_auto_managed
		},
		sections,
		cardsBySection,
		totalCards: cards.length
	};
};
