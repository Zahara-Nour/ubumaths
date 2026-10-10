/**
 * Suppressions SRS : un refus de la RLS n'est plus annoncé comme un succès (constat E20)
 * ======================================================================================
 *
 * Les policies DELETE de `srs_decks`, `srs_cards` et `srs_deck_sections` excluent les
 * paquets ASSIGNÉS ou GÉRÉS AUTOMATIQUEMENT (paquets de chapitre). Les routes ne
 * vérifiaient que « assigné » (cartes, paquets) ou rien (sections), puis supprimaient sans
 * `.select()` : la RLS refuse en silence (0 ligne, aucune erreur), la route répondait
 * « supprimé ». Désormais : `.select('id')`, et 0 ligne → 403.
 */
import { describe, it, expect, vi } from 'vitest';

// ============================================================================
// MOCKS
// ============================================================================

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn().mockResolvedValue({ user: { id: 'proprietaire' }, profile: {} })
}));

import { DELETE as supprimerCarte } from '../cards/[id]/+server';
import { DELETE as supprimerPaquet } from '../decks/[id]/+server';
import { DELETE as supprimerSection } from '../decks/[id]/sections/[sectionId]/+server';

// ============================================================================
// HELPERS
// ============================================================================

const PAQUET = '550e8400-e29b-41d4-a716-446655440010';
const CARTE = '550e8400-e29b-41d4-a716-446655440020';
const SECTION = '550e8400-e29b-41d4-a716-446655440030';

/**
 * Faux client : les lectures rendent un paquet du propriétaire (non assigné) et la carte ;
 * l'écriture DELETE … select rend `supprimees` — ce que la RLS laisse réellement passer.
 */
function fauxClient(supprimees: { id: string }[]) {
	const paquet = { id: PAQUET, owner_id: 'proprietaire', is_assigned: false };
	const carte = { id: CARTE, deck_id: PAQUET };
	return {
		from: (table: string) => {
			let suppression = false;
			const chaine = {
				select: () => (suppression ? Promise.resolve({ data: supprimees, error: null }) : chaine),
				delete: () => ((suppression = true), chaine),
				eq: () => chaine,
				single: () =>
					Promise.resolve({ data: table === 'srs_cards' ? carte : paquet, error: null }),
				maybeSingle: () => Promise.resolve({ data: paquet, error: null })
			};
			return chaine;
		}
	};
}

function evenement(params: Record<string, string>, supprimees: { id: string }[]) {
	return { params, locals: { supabase: fauxClient(supprimees) } } as never;
}

// ============================================================================
// TESTS
// ============================================================================

describe('suppressions SRS : refus silencieux de la RLS', () => {
	it.each([
		['carte', () => supprimerCarte(evenement({ id: CARTE }, []))],
		['paquet', () => supprimerPaquet(evenement({ id: PAQUET }, []))],
		['section', () => supprimerSection(evenement({ id: PAQUET, sectionId: SECTION }, []))]
	])('%s : aucune ligne supprimée → 403, jamais « supprimé »', async (_nom, appel) => {
		const reponse = await appel();
		expect(reponse.status).toBe(403);
	});

	it.each([
		['carte', () => supprimerCarte(evenement({ id: CARTE }, [{ id: CARTE }]))],
		['paquet', () => supprimerPaquet(evenement({ id: PAQUET }, [{ id: PAQUET }]))],
		[
			'section',
			() => supprimerSection(evenement({ id: PAQUET, sectionId: SECTION }, [{ id: SECTION }]))
		]
	])('%s : une ligne supprimée → 200', async (_nom, appel) => {
		const reponse = await appel();
		expect(reponse.status).toBe(200);
	});

	it('section : identifiants non uuid → 400', async () => {
		const reponse = await supprimerSection(evenement({ id: 'x', sectionId: 'y' }, []));
		expect(reponse.status).toBe(400);
	});
});
