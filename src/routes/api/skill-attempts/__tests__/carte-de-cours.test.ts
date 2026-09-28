/**
 * POST /api/skill-attempts — source de la tentative
 * ==================================================
 *
 * Une carte de cours (#617) n'a pas de réponse à valider : la tentative est une
 * auto-évaluation. La source est lue en BASE (`options.courseCard` du modèle),
 * jamais dans le corps de la requête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const applyFsrsReview = vi.hoisted(() => vi.fn());

vi.mock('$lib/server/srs/fsrs-actions', () => ({ applyFsrsReview }));
vi.mock('$lib/server/srs/programme-deck', () => ({ ensureProgrammeDeckCard: vi.fn() }));
vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: async () => ({ user: { id: ELEVE } })
}));

import { POST } from '../+server';

const ELEVE = '11111111-1111-4111-8111-111111111111';
const MODELE = '22222222-2222-4222-8222-222222222222';

let attemptsInseres: Record<string, unknown>[];
let optionsDuModele: unknown;

function fauxSupabase() {
	return {
		from(table: string) {
			if (table === 'question_templates') {
				return {
					select: () => ({
						eq: () => ({
							maybeSingle: async () => ({
								data: { id: MODELE, options: optionsDuModele, question_template_points: [] },
								error: null
							})
						})
					})
				};
			}
			return {
				insert: async (row: Record<string, unknown>) => {
					attemptsInseres.push(row);
					return { error: null };
				}
			};
		}
	};
}

async function poster(body: Record<string, unknown>) {
	const request = new Request('http://localhost/api/skill-attempts', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	const response = await POST({ request, locals: { supabase: fauxSupabase() } } as never);
	expect(response.status).toBe(200);
}

describe('POST /api/skill-attempts — source', () => {
	beforeEach(() => {
		attemptsInseres = [];
		optionsDuModele = null;
		applyFsrsReview.mockReset().mockResolvedValue(undefined);
	});

	it('question ordinaire : source auto (inchangé)', async () => {
		await poster({ template_id: MODELE, success: true });
		expect(attemptsInseres[0]).toMatchObject({ source: 'auto', success: true, grade: 3 });
	});

	it('carte de cours : source student_self', async () => {
		optionsDuModele = { courseCard: true };
		await poster({ template_id: MODELE, success: false });
		expect(attemptsInseres[0]).toMatchObject({
			source: 'student_self',
			success: false,
			grade: 1
		});
	});
});
