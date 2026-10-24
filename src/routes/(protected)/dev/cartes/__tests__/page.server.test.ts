/**
 * Cartes VIP (`/dev/cartes`) — le catalogue n'est lu qu'avec une session
 * =====================================================================
 *
 * La garde de `/dev` arrête le visiteur en amont ; le chargement garde sa
 * propre défense : sans session, il ne doit ni interroger la base, ni échouer
 * (un refus de privilège ferait lever `getAllTemplates` → 500).
 */
import { describe, it, expect, vi } from 'vitest';
import { load as loadDemo } from '../+page.server';
import { load as loadExamples } from '../exemples/+page.server';

// ============================================================================
// TYPES
// ============================================================================

type LoadFn = typeof loadDemo | typeof loadExamples;

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE = { id: 'carte-1', sort_order: 1, is_enabled: true };

const PAGES: Array<[string, LoadFn]> = [
	['/dev/cartes', loadDemo],
	['/dev/cartes/exemples', loadExamples]
];

// ============================================================================
// HELPERS
// ============================================================================

function fakeSupabase(response: { data: unknown; error: unknown }) {
	const query = {
		select: () => query,
		order: () => Promise.resolve(response)
	};
	return { from: vi.fn(() => query) };
}

async function run(load: LoadFn, user: { id: string } | null, supabase: unknown) {
	const loadEvent = { locals: { supabase, user } } as unknown as Parameters<LoadFn>[0];
	return (await load(loadEvent as never)) as { templates: Array<{ id: string }> };
}

// ============================================================================
// TESTS
// ============================================================================

describe.each(PAGES)('%s', (_path, load) => {
	it('visiteur : pas de requête, liste vide, pas d’erreur', async () => {
		// Ce que rendrait la base après le retrait du privilège d'anon.
		const supabase = fakeSupabase({
			data: null,
			error: { code: '42501', message: 'permission denied for table vip_card_templates' }
		});

		const result = await run(load, null, supabase);

		expect(supabase.from).not.toHaveBeenCalled();
		expect(result.templates).toEqual([]);
	});

	it('connecté : le catalogue est chargé', async () => {
		const supabase = fakeSupabase({ data: [TEMPLATE], error: null });

		const result = await run(load, { id: 'u1' }, supabase);

		expect(supabase.from).toHaveBeenCalledWith('vip_card_templates');
		expect(result.templates.map((t) => t.id)).toEqual(['carte-1']);
	});
});
