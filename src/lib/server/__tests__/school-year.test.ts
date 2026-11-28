/**
 * L38 : une seule règle pour l'année scolaire. Les dates de l'école si elle en
 * a saisi une qui contient le jour ; sinon du 1er septembre au 31 août.
 */
import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '#lib/types/database.ts';
import {
	classSchoolYearExpiry,
	currentSchoolYear,
	defaultSchoolYear,
	schoolYearExpiry
} from '../school-year';

// Client factice : rend `row` à l'appel de la fonction `current_school_year`
function fakeClient(row: { start_date: string; end_date: string } | null, fail = false) {
	const rpc = vi.fn(() => ({
		maybeSingle: async () =>
			fail ? { data: null, error: { message: 'panne' } } : { data: row, error: null }
	}));
	return { client: { rpc } as unknown as SupabaseClient<Database>, rpc };
}

describe('defaultSchoolYear', () => {
	it('en novembre : du 1er septembre de cette année au 31 août suivant', () => {
		expect(defaultSchoolYear(new Date('2026-11-28T10:00:00Z'))).toEqual({
			start: '2026-09-01',
			end: '2027-08-31'
		});
	});

	it('en août : l’année commencée en septembre précédent', () => {
		expect(defaultSchoolYear(new Date('2027-08-31T10:00:00Z'))).toEqual({
			start: '2026-09-01',
			end: '2027-08-31'
		});
	});

	it('le 1er septembre : la nouvelle année', () => {
		expect(defaultSchoolYear(new Date('2027-09-01T10:00:00Z')).start).toBe('2027-09-01');
	});
});

describe('schoolYearExpiry', () => {
	const now = new Date('2026-11-28T10:00:00Z');

	it("fin du dernier jour de l'année saisie par l'école (UTC)", async () => {
		const { client } = fakeClient({ start_date: '2026-09-01', end_date: '2027-07-15' });
		expect((await schoolYearExpiry(client, 'school-1', now)).toISOString()).toBe(
			'2027-07-15T23:59:59.000Z'
		);
	});

	it('école sans dates, ou sans école : fin du 31 août', async () => {
		const { client } = fakeClient(null);
		expect((await schoolYearExpiry(client, 'school-1', now)).toISOString()).toBe(
			'2027-08-31T23:59:59.000Z'
		);
		expect((await schoolYearExpiry(client, null, now)).toISOString()).toBe(
			'2027-08-31T23:59:59.000Z'
		);
	});

	it("en été, année de l'école finie : le 31 août qui vient", async () => {
		const { client } = fakeClient({ start_date: '2026-09-01', end_date: '2027-07-15' });
		const july = new Date('2027-07-20T10:00:00Z');
		expect((await schoolYearExpiry(client, 'school-1', july)).toISOString()).toBe(
			'2027-08-31T23:59:59.000Z'
		);
	});
});

describe('classSchoolYearExpiry', () => {
	const now = new Date('2026-11-28T10:00:00Z');

	function classClient(row: { school_id: string | null } | null, fail = false) {
		const { client, rpc } = fakeClient({ start_date: '2026-09-01', end_date: '2027-07-15' });
		const eq = vi.fn(() => ({
			maybeSingle: async () =>
				fail ? { data: null, error: { message: 'panne' } } : { data: row, error: null }
		}));
		const from = vi.fn(() => ({ select: () => ({ eq }) }));
		Object.assign(client, { from });
		return { client, rpc, from, eq };
	}

	it("lit l'école de la classe, puis sa fin d'année", async () => {
		const { client, rpc, from, eq } = classClient({ school_id: 'school-1' });
		expect((await classSchoolYearExpiry(client, 'classe-1', now)).toISOString()).toBe(
			'2027-07-15T23:59:59.000Z'
		);
		expect(from).toHaveBeenCalledWith('classes');
		expect(eq).toHaveBeenCalledWith('id', 'classe-1');
		expect(rpc).toHaveBeenCalledWith('current_school_year', { p_school_id: 'school-1' });
	});

	it('classe illisible ou introuvable : lève', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		await expect(classSchoolYearExpiry(classClient(null, true).client, 'c', now)).rejects.toThrow();
		await expect(classSchoolYearExpiry(classClient(null).client, 'c', now)).rejects.toThrow();
	});
});

describe('currentSchoolYear', () => {
	const now = new Date('2026-11-28T10:00:00Z');

	it('les dates saisies par l’école (fonction current_school_year)', async () => {
		const { client, rpc } = fakeClient({ start_date: '2026-09-02', end_date: '2027-07-04' });
		expect(await currentSchoolYear(client, 'school-1', now)).toEqual({
			start: '2026-09-02',
			end: '2027-07-04'
		});
		expect(rpc).toHaveBeenCalledWith('current_school_year', { p_school_id: 'school-1' });
	});

	it('année de l’école finie (nouvelle année non saisie) : du 1er septembre au 31 août', async () => {
		const { client } = fakeClient({ start_date: '2025-09-01', end_date: '2026-06-30' });
		expect(await currentSchoolYear(client, 'school-1', now)).toEqual({
			start: '2026-09-01',
			end: '2027-08-31'
		});
	});

	it('école sans année saisie : du 1er septembre au 31 août', async () => {
		const { client } = fakeClient(null);
		expect(await currentSchoolYear(client, 'school-1', now)).toEqual({
			start: '2026-09-01',
			end: '2027-08-31'
		});
	});

	it('classe sans école : du 1er septembre au 31 août, sans lecture', async () => {
		const { client, rpc } = fakeClient(null);
		expect(await currentSchoolYear(client, null, now)).toEqual({
			start: '2026-09-01',
			end: '2027-08-31'
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it('lecture en panne : une erreur, pas une année inventée', async () => {
		const { client } = fakeClient(null, true);
		await expect(currentSchoolYear(client, 'school-1', now)).rejects.toThrow();
	});
});
