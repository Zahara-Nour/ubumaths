/**
 * POST /api/srs/chapters/[chapterId]/submit — coup de pouce ouvert (idée 5)
 * =========================================================================
 *
 * Comme la révision du Programme : « Réussi » après un indice ouvert donne
 * « Difficile » (2) à la révision espacée, trace « avec indice » ; « Pas
 * réussi » reste « À revoir » ; sans indice, rien ne change.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const loadChapterDeck = vi.hoisted(() => vi.fn());

vi.mock('#lib/server/srs/fsrs-actions.ts', () => ({ applyFsrsReview }));
vi.mock('#lib/server/srs/chapter-deck.ts', () => ({ loadChapterDeck }));
vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireRole: async () => ({ user: { id: ELEVE }, profile: { role: 'student' } })
}));
vi.mock('#lib/server/middleware/consent.ts', () => ({ requireConsent: () => {} }));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const CHAPITRE = '22222222-2222-4222-8222-222222222222';
const MODELE = '44444444-4444-4444-8444-444444444444';

/** Lignes envoyées à `skill_attempts` */
let traces: Record<string, unknown>[] = [];

function fauxSupabase() {
	return {
		from: () => ({
			insert: async (row: Record<string, unknown>) => {
				traces.push(row);
				return { error: null };
			}
		})
	};
}

async function reviser(corps: Record<string, unknown>) {
	const request = new Request('http://localhost/x', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ templateId: MODELE, ...corps })
	});
	return POST({
		request,
		params: { chapterId: CHAPITRE },
		locals: { supabase: fauxSupabase() }
	} as never);
}

describe('POST /api/srs/chapters/[chapterId]/submit — coup de pouce', () => {
	beforeEach(() => {
		traces = [];
		loadChapterDeck.mockReset().mockResolvedValue({ templateIds: [MODELE] });
		applyFsrsReview.mockReset().mockResolvedValue({
			state: 1,
			nextReview: new Date(),
			totalReviews: 1
		});
	});

	it('« Réussi » avec indice : « Difficile » pour FSRS, trace « avec indice »', async () => {
		const response = await reviser({ grade: 3, withHelp: true });
		expect(response.status).toBe(200);
		expect(applyFsrsReview.mock.calls[0][5]).toBe(2);
		expect(traces).toEqual([
			expect.objectContaining({ grade: 2, success: true, with_help: true, place: 'review' })
		]);
	});

	it('« Pas réussi » avec indice : reste « À revoir »', async () => {
		await reviser({ grade: 1, withHelp: true });
		expect(applyFsrsReview.mock.calls[0][5]).toBe(1);
		expect(traces).toEqual([expect.objectContaining({ grade: 1, with_help: true })]);
	});

	it('sans indice : « Bien », trace sans indice (inchangé)', async () => {
		await reviser({ grade: 3 });
		expect(applyFsrsReview.mock.calls[0][5]).toBe(3);
		expect(traces).toEqual([expect.objectContaining({ grade: 3, with_help: false })]);
	});
});
