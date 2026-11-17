/**
 * GET regularity : la grille de régularité, réservée au prof de la classe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

const { requireTeacherOfClass, getClassRegularityGrid } = vi.hoisted(() => ({
	requireTeacherOfClass: vi.fn(),
	getClassRegularityGrid: vi.fn()
}));

vi.mock('$lib/server/stats/teacher-class-auth', () => ({ requireTeacherOfClass }));
vi.mock('$lib/server/stats', () => ({ getClassRegularityGrid }));

import { GET } from '../+server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const GRID = {
	weeks: [{ start: '2026-11-09', holiday: false }],
	students: [{ id: 's1', display_name: 'Alice', tiers: [2] }]
};

async function call(classId = CLASS_ID) {
	return GET({
		params: { classId },
		locals: { supabase: {} }
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET regularity', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireTeacherOfClass.mockResolvedValue({ classRow: { id: CLASS_ID } });
		getClassRegularityGrid.mockResolvedValue(GRID);
	});

	it('rend la grille de la classe', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(GRID);
		expect(getClassRegularityGrid).toHaveBeenCalledWith(expect.anything(), CLASS_ID);
	});

	it('400 quand la classe n’est pas un uuid', async () => {
		const res = await call('pas-un-uuid');
		expect(res.status).toBe(400);
		expect(getClassRegularityGrid).not.toHaveBeenCalled();
	});

	it('refus de la garde (pas prof) : rien n’est lu', async () => {
		requireTeacherOfClass.mockImplementation(async () => error(403, 'Accès refusé'));
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(getClassRegularityGrid).not.toHaveBeenCalled();
	});
});
