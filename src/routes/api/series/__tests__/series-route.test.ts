/**
 * POST /api/series — enregistrer le panier comme série (B11). Prof et admin.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';

const TEACHER = '22222222-2222-4222-8222-222222222222';
const ITEM = {
	category: { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 },
	quantity: 4,
	delay: 20
};

function call(role: 'student' | 'teacher' | 'admin', body: unknown) {
	const fake = createFakeSupabase((table, calls) => {
		if (table === 'profiles') return { data: { id: TEACHER, role } };
		const insert = calls.find((c) => c.method === 'insert');
		return {
			data: {
				id: 'serie',
				...(insert?.args[0] as object),
				created_at: '2026-09-30T10:00:00Z',
				updated_at: '2026-09-30T10:00:00Z'
			}
		};
	});
	const request = new Request('http://localhost/api/series', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	const promise = POST({
		request,
		locals: {
			supabase: fake.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		}
	} as never);
	return { promise, fake };
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/series (B11)', () => {
	it('prof : 201 et la série enregistrée', async () => {
		const { promise, fake } = call('teacher', {
			title: ' Tables ',
			grade: '6',
			categories: [ITEM]
		});
		const response = await promise;
		expect(response.status).toBe(201);
		expect((await response.json()).series).toMatchObject({ title: 'Tables', categories: [ITEM] });
		expect(fake.on('series')).toHaveLength(1);
	});

	it('admin : autorisé', async () => {
		const { promise } = call('admin', { title: 'Tables', grade: '6', categories: [ITEM] });
		expect((await promise).status).toBe(201);
	});

	it('élève : refusé (403), rien d’écrit', async () => {
		const { promise, fake } = call('student', { title: 'Tables', grade: '6', categories: [ITEM] });
		await expect(promise).rejects.toMatchObject({ status: 403 });
		expect(fake.on('series')).toHaveLength(0);
	});

	it('titre vide : 400 en français', async () => {
		const { promise } = call('teacher', { title: '  ', grade: '6', categories: [ITEM] });
		const response = await promise;
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe('Titre requis');
	});

	it('51 catégories : 400', async () => {
		const { promise } = call('teacher', {
			title: 'Tables',
			grade: '6',
			categories: Array(51).fill(ITEM)
		});
		expect((await promise).status).toBe(400);
	});

	it('corps illisible : 400', async () => {
		const { promise } = call('teacher', '{oups');
		expect((await promise).status).toBe(400);
	});
});
