/**
 * Énigmes : la réponse attendue et la correction ne partent pas au navigateur de l'élève
 * ====================================================================================
 *
 * Constat du 2026-10-12 (audit de #1132) : les pages élève renvoyaient la ligne `riddles`
 * entière — `answer.value` et `correction` se lisaient dans les données de la page, avant
 * même de répondre. Le verdict vient du serveur (`/api/riddles/[id]/submit`) : la page n'a
 * besoin que du type de saisie et, pour un QCM, des choix.
 */
import { describe, it, expect, vi } from 'vitest';
import { load as loadRiddle } from '../[id]/+page.server';
import { load as loadList } from '../+page.server';

// Réponse attendue et correction vivent dans `riddle_solutions`, que l'élève ne lit pas :
// les pages les lisent par le client service (type de saisie et choix d'un QCM).
const serviceFrom = vi.fn((table: string) => {
	if (table !== 'riddle_solutions') throw new Error(`table inattendue : ${table}`);
	return chain({ data: [SOLUTION_ROW], error: null });
});
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ from: serviceFrom })
}));

// ============================================================================
// CONSTANTES
// ============================================================================

const RIDDLE_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_VALUE = 'valeur-secrète-42';
const SECRET_CORRECTION = 'correction-secrète';

const ANSWER = {
	type: 'qcm',
	value: SECRET_VALUE,
	options: { choices: ['A', 'B', 'C'], multipleAnswers: false, caseSensitive: true }
};

const SOLUTION_ROW = { riddle_id: RIDDLE_ID, answer: ANSWER, correction: SECRET_CORRECTION };

// La ligne `riddles` porte encore ses deux colonnes jusqu'à l'étape C : si une page les
// recopiait, le test le verrait.
const RIDDLE_ROW = {
	id: RIDDLE_ID,
	riddle_number: 7,
	title: 'Les trois portes',
	genre: 'logique',
	difficulty: 2,
	statement: 'Énoncé',
	correction: SECRET_CORRECTION,
	image_url: null,
	answer: ANSWER,
	created_by: '22222222-2222-4222-8222-222222222222',
	status: 'published',
	created_at: '2026-10-01T00:00:00Z',
	updated_at: '2026-10-01T00:00:00Z'
};

// ============================================================================
// HELPERS
// ============================================================================

/** Chaîne PostgREST minimale : chaque méthode se renvoie, `await` rend `result`. */
function chain(result: unknown) {
	const c: Record<string, unknown> = {};
	for (const m of ['select', 'eq', 'or', 'order', 'limit', 'in', 'lt', 'not']) {
		c[m] = vi.fn(() => c);
	}
	c.single = vi.fn(async () => result);
	c.maybeSingle = vi.fn(async () => result);
	c.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
	return c;
}

function supabaseMock() {
	return {
		rpc: vi.fn(async () => ({ data: RIDDLE_ID, error: null })),
		from: vi.fn((table: string) => {
			if (table === 'riddles') return chain({ data: RIDDLE_ROW, error: null });
			if (table === 'riddle_attempts') return chain({ data: [], error: null });
			if (table === 'riddle_assignments')
				return chain({ data: [{ id: 'a1', riddle: RIDDLE_ROW }], error: null });
			throw new Error(`table inattendue : ${table}`);
		})
	};
}

// ============================================================================
// TESTS
// ============================================================================

describe('pages élève des énigmes : rien qui donne la réponse', () => {
	it('la page d’une énigme ne renvoie ni la valeur attendue ni la correction', async () => {
		const supabase = supabaseMock();
		const result = await loadRiddle({
			params: { id: RIDDLE_ID },
			locals: {
				supabase,
				safeGetSession: async () => ({ user: { id: 'eleve' } })
			}
		} as never);

		const json = JSON.stringify(result);
		expect(json).not.toContain(SECRET_VALUE);
		expect(json).not.toContain(SECRET_CORRECTION);
		// Ce qu'il faut pour répondre reste là.
		expect(result).toMatchObject({
			riddle: { answer: { type: 'qcm', options: { choices: ['A', 'B', 'C'] } } }
		});
	});

	it('la liste (énigme du jour, énigmes assignées) ne renvoie ni l’une ni l’autre', async () => {
		const supabase = supabaseMock();
		const result = await loadList({
			locals: { user: { id: 'eleve' }, profile: { class_ids: [] }, supabase }
		} as never);

		const json = JSON.stringify(result);
		expect(json).toContain('Les trois portes');
		expect(json).not.toContain(SECRET_VALUE);
		expect(json).not.toContain(SECRET_CORRECTION);
	});
});
