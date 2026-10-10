/**
 * Layout racine — catalogue des cartes VIP lu seulement avec une session
 * =====================================================================
 *
 * Le visiteur non connecté n'a aucun droit sur `vip_card_templates`. Le layout
 * racine tourne à CHAQUE page vue : il ne doit pas interroger ce catalogue sans
 * session (préparation du retrait des privilèges inutiles d'`anon`).
 */
import { describe, it, expect, vi } from 'vitest';
import { load } from '../+layout.server';
import type { LayoutServerData } from '../$types';

// ============================================================================
// TYPES
// ============================================================================

type LoadEvent = Parameters<typeof load>[0];
// Ce que rend VRAIMENT le load : SvelteKit l'infère via un proxy sans l'annotation
// `LayoutServerLoad`, dont le type de retour lâche (`Record<string, any>`) ne dit rien.
type LoadResult = LayoutServerData;

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE = { id: 'carte-1', sort_order: 1, action: null };

// ============================================================================
// HELPERS
// ============================================================================

function fakeSupabase() {
	const query = {
		select: () => query,
		order: () => Promise.resolve({ data: [TEMPLATE], error: null })
	};
	return { from: vi.fn(() => query) };
}

function event(user: { id: string } | null) {
	const supabase = fakeSupabase();
	const loadEvent = {
		locals: { supabase, user, profile: null },
		cookies: { getAll: () => [] }
	} as unknown as LoadEvent;
	return { supabase, loadEvent };
}

// ============================================================================
// TESTS
// ============================================================================

describe('layout racine — vip_card_templates', () => {
	it('visiteur : aucune requête au catalogue, tableau vide', async () => {
		const { supabase, loadEvent } = event(null);
		const result = (await load(loadEvent)) as LoadResult;

		expect(supabase.from).not.toHaveBeenCalledWith('vip_card_templates');
		expect(supabase.from).not.toHaveBeenCalled();
		expect(result.vipCardTemplates).toEqual([]);
	});

	it('connecté : le catalogue est chargé', async () => {
		const { supabase, loadEvent } = event({ id: 'u1' });
		const result = (await load(loadEvent)) as LoadResult;

		expect(supabase.from).toHaveBeenCalledWith('vip_card_templates');
		expect(result.vipCardTemplates.map((t) => t.id)).toEqual(['carte-1']);
	});
});
