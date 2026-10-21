/**
 * Routes du Palotin : écritures au client service, identité de la SESSION
 * =======================================================================
 *
 * PR 2 de docs/wip/palotin-boucle-progress.md : le choix et le changement de
 * Palotin n'écrivent plus rien au client de l'élève (la PR suivante lui retire
 * le droit d'écrire sa ligne). L'identifiant écrit est celui de la session,
 * jamais un identifiant glissé dans le corps de la requête.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	buddyRow,
	createFakeBuddyDb,
	type FakeBuddyDb
} from '$lib/server/__tests__/helpers/fake-buddy-db';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const service = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => service.current
}));
vi.mock('$lib/server/middleware/auth', () => ({
	requireRole: async () => ({ user: { id: ELEVE }, profile: { role: 'student' } })
}));

import { POST as chooseRoute } from '../+server';
import { POST as changeRoute } from '../change/+server';

// Constantes
const ELEVE = '11111111-1111-4111-8111-111111111111';
const AUTRE = '99999999-9999-4999-8999-999999999999';

// Variables
let db: FakeBuddyDb;
let serviceDb: ReturnType<typeof createFakeBuddyDb>;
let student: ReturnType<typeof createFakeSupabase>;

// Functions
function setup(buddy: FakeBuddyDb['buddy'], gidouilles = 0) {
	db = { buddy, profile: { id: ELEVE, gidouilles } };
	serviceDb = createFakeBuddyDb(db);
	service.current = serviceDb.client;
	// Client de l'élève : ses lectures voient la même ligne (sa RLS)
	student = createFakeSupabase((table, calls) => {
		if (calls[0]?.method !== 'select') return { data: null, error: null };
		return { data: table === 'student_buddies' ? db.buddy : null, error: null };
	});
}

function studentWrites(): string[] {
	return student.queries
		.map((q) => q.calls[0]?.method ?? '')
		.filter((m) => ['insert', 'update', 'upsert', 'delete'].includes(m));
}

async function call(
	route: (event: never) => Response | Promise<Response>,
	body: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
	const request = new Request('http://localhost/api/student/buddy', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
	try {
		const response = await route({ request, locals: { supabase: student.client } } as never);
		return { status: response.status, json: await response.json() };
	} catch (thrown) {
		// `error()` de SvelteKit lance un HttpError (qui n'étend pas Error)
		const httpError = thrown as { status: number; body: Record<string, unknown> };
		return { status: httpError.status, json: httpError.body };
	}
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/student/buddy (choix du Palotin)', () => {
	it('crée la ligne au client service, pour l’élève de la session, même si le corps en nomme un autre', async () => {
		setup(null);
		const { status } = await call(chooseRoute, { palotinType: 'cotice', student_id: AUTRE });

		expect(status).toBe(201);
		expect(db.buddy).toMatchObject({ student_id: ELEVE, palotin_type: 'cotice' });
		expect(studentWrites()).toEqual([]);
	});

	it('déjà choisi : 409, rien n’est écrit', async () => {
		setup(buddyRow(ELEVE));
		expect((await call(chooseRoute, { palotinType: 'giron' })).status).toBe(409);
		expect(studentWrites()).toEqual([]);
	});
});

describe('POST /api/student/buddy/change', () => {
	it('1er changement gratuit : écrit au client service, rien au client de l’élève', async () => {
		setup(buddyRow(ELEVE, { palotin_type: 'pile', change_count: 0 }), 10);
		const { status, json } = await call(changeRoute, { newPalotinType: 'giron' });

		expect(status).toBe(200);
		expect(json.cost).toBe(0);
		expect(db.buddy).toMatchObject({ palotin_type: 'giron', change_count: 1 });
		expect(db.profile.gidouilles).toBe(10);
		expect(studentWrites()).toEqual([]);
	});

	it('changement payant : 50 gidouilles débitées au client service', async () => {
		setup(buddyRow(ELEVE, { palotin_type: 'pile', change_count: 2 }), 120);
		const { status, json } = await call(changeRoute, { newPalotinType: 'cotice' });

		expect(status).toBe(200);
		expect(json.cost).toBe(50);
		expect(db.profile.gidouilles).toBe(70);
		expect(studentWrites()).toEqual([]);
	});

	it('solde insuffisant : 400, ni changement ni débit', async () => {
		setup(buddyRow(ELEVE, { palotin_type: 'pile', change_count: 1 }), 20);
		expect((await call(changeRoute, { newPalotinType: 'cotice' })).status).toBe(400);
		expect(db.buddy?.palotin_type).toBe('pile');
		expect(db.profile.gidouilles).toBe(20);
	});

	it('ligne modifiée à chaque essai : 409, pas un succès silencieux', async () => {
		setup(buddyRow(ELEVE, { palotin_type: 'pile', change_count: 0 }), 0);
		db.beforeWrite = (table, index) => {
			if (table === 'student_buddies' && db.buddy) db.buddy.updated_at = `autre-${index}`;
		};
		expect((await call(changeRoute, { newPalotinType: 'cotice' })).status).toBe(409);
		expect(db.buddy?.palotin_type).toBe('pile');
	});

	it('sans Palotin : 404 ; même Palotin : 400', async () => {
		setup(null);
		expect((await call(changeRoute, { newPalotinType: 'cotice' })).status).toBe(404);
		setup(buddyRow(ELEVE, { palotin_type: 'pile' }));
		expect((await call(changeRoute, { newPalotinType: 'pile' })).status).toBe(400);
	});

	it('corps invalide : 400 (Zod)', async () => {
		setup(buddyRow(ELEVE));
		expect((await call(changeRoute, { newPalotinType: 'dragon' })).status).toBe(400);
	});
});
