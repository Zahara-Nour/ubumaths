/**
 * GET success-rate : taux de réussite par notion et par point, réservé au prof
 * de la classe.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

const { requireTeacherOfClass, getClassSuccessRates } = vi.hoisted(() => ({
	requireTeacherOfClass: vi.fn(),
	getClassSuccessRates: vi.fn()
}));

vi.mock('$lib/server/stats/teacher-class-auth', () => ({ requireTeacherOfClass }));
vi.mock('$lib/server/stats', () => ({ getClassSuccessRates }));

import { GET } from '../+server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const RATES = {
	notions: [
		{
			id: 'n1',
			name: 'Fractions',
			branch_name: 'Nombres',
			rate: 0.64,
			students: 18,
			onlyDeclared: false,
			points: [{ id: 'p1', name: 'Simplifier', rate: 0.64, students: 18, onlyDeclared: false }]
		}
	]
};

async function call(classId = CLASS_ID) {
	return GET({
		params: { classId },
		locals: { supabase: {} }
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET success-rate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireTeacherOfClass.mockResolvedValue({ classRow: { id: CLASS_ID } });
		getClassSuccessRates.mockResolvedValue(RATES);
	});

	it('rend les taux de la classe', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(RATES);
		expect(requireTeacherOfClass).toHaveBeenCalledWith(expect.anything(), CLASS_ID);
		expect(getClassSuccessRates).toHaveBeenCalledWith(expect.anything(), CLASS_ID);
	});

	it('400 quand la classe n’est pas un uuid', async () => {
		const res = await call('pas-un-uuid');
		expect(res.status).toBe(400);
		expect(requireTeacherOfClass).not.toHaveBeenCalled();
		expect(getClassSuccessRates).not.toHaveBeenCalled();
	});

	it('refus de la garde (pas prof) : rien n’est lu', async () => {
		requireTeacherOfClass.mockImplementation(async () => error(403, 'Accès refusé'));
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(getClassSuccessRates).not.toHaveBeenCalled();
	});
});
