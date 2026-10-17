/**
 * Administration des classes : les entrées du formulaire sont-elles validées ?
 * ============================================================================
 *
 * Les actions lisaient le formulaire par `formData.get(...) as string` : un
 * identifiant qui n'est pas un UUID, un nom de 10 000 caractères ou un code de
 * classe à espaces partaient tels quels vers la base. Une entrée invalide rend
 * 400 AVANT toute requête.
 *
 * @module routes/admin/classes/validation-entrees.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440030';

function adminLocals(client: unknown) {
	return {
		supabase: client,
		user: { id: ADMIN_ID },
		profile: { id: ADMIN_ID, role: 'admin' }
	};
}

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

const CREATE_FIELDS = {
	name: '3e B',
	description: '',
	school_id: '',
	grade: '',
	join_code: 'math3b'
};

const UPDATE_FIELDS = { ...CREATE_FIELDS, id: CLASS_ID, join_code: 'ABC123', is_active: 'true' };

type ActionName = 'create' | 'update' | 'deactivate' | 'activate';

/** Lance l'action avec un client dont on vérifie qu'il n'a pas été interrogé. */
async function runRejected(action: ActionName, fields: Record<string, string>) {
	const { client } = createWriteVerdictSupabase({});
	const { actions } = await import('../+page.server');
	const result = await actions[action]({
		request: formRequest(fields),
		locals: adminLocals(client)
	} as never);
	return { result, client };
}

describe('admin/classes : entrée invalide → 400, sans requête', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it.each([
		['nom vide', { name: '   ' }],
		['nom de plus de 100 caractères', { name: 'x'.repeat(101) }],
		['description de plus de 500 caractères', { description: 'x'.repeat(501) }],
		['école qui n’est pas un UUID', { school_id: 'pas-un-uuid' }],
		['niveau inconnu', { grade: 'septième' }],
		['code de classe avec espace', { join_code: 'MATH 3B' }],
		['code de classe de plus de 10 caractères', { join_code: 'ABCDEFGHIJK' }]
	])('create : %s', async (_label, override) => {
		const { result, client } = await runRejected('create', { ...CREATE_FIELDS, ...override });
		expect(result).toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
		expect(client.rpc).not.toHaveBeenCalled();
	});

	it.each([
		['identifiant qui n’est pas un UUID', { id: 'abc' }],
		['code de classe vide', { join_code: '' }],
		['nom de plus de 100 caractères', { name: 'x'.repeat(101) }]
	])('update : %s', async (_label, override) => {
		const { result, client } = await runRejected('update', { ...UPDATE_FIELDS, ...override });
		expect(result).toMatchObject({ status: 400 });
		expect(client.from).not.toHaveBeenCalled();
	});

	it.each(['deactivate', 'activate'] as const)(
		'%s : identifiant qui n’est pas un UUID',
		async (action) => {
			const { result, client } = await runRejected(action, { id: "1' OR '1'='1" });
			expect(result).toMatchObject({ status: 400 });
			expect(client.from).not.toHaveBeenCalled();
		}
	);
});

describe('admin/classes : entrée valide → écrite normalisée', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('create : champs vides ou blancs → null, code en majuscules', async () => {
		const { client, chains } = createWriteVerdictSupabase({
			classes: {
				// Test d'unicité du code : aucune classe ne le porte.
				single: { data: null, error: { code: 'PGRST116' } },
				awaited: { data: null, error: null }
			}
		});
		const { actions } = await import('../+page.server');
		const result = await actions.create({
			request: formRequest({
				...CREATE_FIELDS,
				description: '   ',
				school_id: SCHOOL_ID,
				grade: '6'
			}),
			locals: adminLocals(client)
		} as never);

		expect(result).toEqual({ success: true });
		expect(chains.classes.insert).toHaveBeenCalledWith({
			name: '3e B',
			description: null,
			school_id: SCHOOL_ID,
			grade: '6',
			join_code: 'MATH3B',
			is_active: true
		});
	});
});
