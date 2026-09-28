/**
 * `/api/skill-attempts` : un INSERT qui ne rend aucune ligne n'est pas un succès.
 *
 * Garde de principe : un INSERT refusé par la RLS lève normalement une erreur
 * (42501) ; ce cas « 0 ligne, pas d'erreur » ne devrait pas se produire, mais
 * la route ne doit pas répondre 200 s'il se produit.
 *
 * Avant : l'INSERT n'avait pas de `.select()`, la route répondait 200
 * `{ inserted: 1 }` alors que rien n'était écrit — et la fiche FSRS, elle,
 * venait d'être mise à jour : exactement la désynchro que le garde-fou
 * « FSRS avant l'attempt » veut empêcher, mais invisible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());
const ensureProgrammeDeckCard = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: STUDENT_ID } })
}));

import { POST } from '../+server';

const STUDENT_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '22222222-2222-4222-8222-222222222222';

/** Lignes rendues par l'INSERT … `.select()` ; [] = aucune ligne écrite */
let insertedRows: { id: string }[];

function fakeSupabase() {
	return {
		from(table: string) {
			if (table === 'question_templates') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: { id: TEMPLATE_ID, question_template_points: [] },
								error: null
							})
						})
					})
				};
			}
			// skill_attempts
			const result = { data: insertedRows, error: null };
			return {
				// Sans `.select()`, l'appel attend directement l'INSERT : il reçoit
				// `{ error: null }`, comme le vrai client sur un refus RLS
				insert: () => ({
					select: async () => result,
					then: (resolve: (v: { error: null }) => unknown) => resolve({ error: null })
				})
			};
		}
	};
}

async function post() {
	const request = new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ template_id: TEMPLATE_ID, success: true, with_help: false })
	});
	return POST({ request, locals: { supabase: fakeSupabase() } } as never);
}

describe('POST /api/skill-attempts — écriture vérifiée', () => {
	beforeEach(() => {
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
		ensureProgrammeDeckCard.mockReset().mockResolvedValue(undefined);
	});

	it('répond 200 quand la ligne est bien écrite', async () => {
		insertedRows = [{ id: 'attempt-1' }];
		const response = await post();
		expect(response.status).toBe(200);
	});

	it('répond 500 quand la RLS refuse en silence (0 ligne, aucune erreur)', async () => {
		insertedRows = [];
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const response = await post();
		expect(response.status).toBe(500);
		consoleError.mockRestore();
	});
});
