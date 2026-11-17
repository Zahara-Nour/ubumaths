/**
 * Création d'une classe : elle prend l'année active de son école.
 * ===============================================================
 *
 * Avant ce correctif, `create` n'écrivait jamais `school_year_id` : toute classe
 * créée depuis la Phase 1 de la bascule d'année (2026-09-13) restait sans année,
 * donc absente de « Composer une classe ».
 *
 * @module routes/admin/classes/create-annee-active.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase, type FakeResult } from '$tests/helpers/write-verdict-supabase';

const ADMIN_ID = '550e8400-e29b-41d4-a716-446655440001';
const SCHOOL_ID = '550e8400-e29b-41d4-a716-446655440030';
const YEAR_ID = '550e8400-e29b-41d4-a716-446655440040';

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

function setup(activeYear: FakeResult) {
	return createWriteVerdictSupabase(
		{
			school_years: { maybeSingle: activeYear },
			classes: { awaited: { data: null, error: null } }
		},
		{ data: 'ABCD1234', error: null }
	);
}

const CREATE_FIELDS = { name: 'NOELIE', description: '', grade: '', join_code: '' };

describe('admin/classes create : année de la classe', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	it('pose l’année active de l’école', async () => {
		const { client, chains } = setup({ data: { id: YEAR_ID }, error: null });
		const { actions } = await import('../+page.server');
		const result = await actions.create({
			request: formRequest({ ...CREATE_FIELDS, school_id: SCHOOL_ID }),
			locals: adminLocals(client)
		} as never);

		expect(result).toEqual({ success: true });
		expect(chains.school_years.eq).toHaveBeenCalledWith('school_id', SCHOOL_ID);
		expect(chains.school_years.eq).toHaveBeenCalledWith('is_active', true);
		expect(chains.classes.insert).toHaveBeenCalledWith(
			expect.objectContaining({ school_id: SCHOOL_ID, school_year_id: YEAR_ID })
		);
	});

	it('école sans année active : classe créée sans année, avec un avertissement', async () => {
		const { client, chains } = setup({ data: null, error: null });
		const { actions } = await import('../+page.server');
		const result = await actions.create({
			request: formRequest({ ...CREATE_FIELDS, school_id: SCHOOL_ID }),
			locals: adminLocals(client)
		} as never);

		expect(result).toMatchObject({
			success: true,
			warning: expect.stringContaining('Aucune année active')
		});
		expect(chains.classes.insert).toHaveBeenCalledWith(
			expect.objectContaining({ school_year_id: null })
		);
	});

	it('classe sans école : ni lecture d’année, ni avertissement', async () => {
		const { client, chains } = setup({ data: null, error: null });
		const { actions } = await import('../+page.server');
		const result = await actions.create({
			request: formRequest({ ...CREATE_FIELDS, school_id: '' }),
			locals: adminLocals(client)
		} as never);

		expect(result).toEqual({ success: true });
		expect(chains.school_years.maybeSingle).not.toHaveBeenCalled();
		expect(chains.classes.insert).toHaveBeenCalledWith(
			expect.objectContaining({ school_year_id: null })
		);
	});

	it('lecture de l’année en échec : 500, aucune classe créée', async () => {
		const { client, chains } = setup({ data: null, error: { message: 'boom' } });
		const { actions } = await import('../+page.server');
		const result = await actions.create({
			request: formRequest({ ...CREATE_FIELDS, school_id: SCHOOL_ID }),
			locals: adminLocals(client)
		} as never);

		expect(result).toMatchObject({ status: 500 });
		expect(chains.classes.insert).not.toHaveBeenCalled();
	});
});
