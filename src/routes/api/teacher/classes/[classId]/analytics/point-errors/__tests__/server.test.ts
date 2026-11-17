/**
 * GET point-errors : erreurs de la classe sur un point du programme, réservées
 * au prof de la classe (chantier `erreurs-frequentes`, PR 2).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { error } from '@sveltejs/kit';

const { requireTeacherOfClass, getClassPointErrors } = vi.hoisted(() => ({
	requireTeacherOfClass: vi.fn(),
	getClassPointErrors: vi.fn()
}));

vi.mock('$lib/server/stats/teacher-class-auth', () => ({ requireTeacherOfClass }));
vi.mock('$lib/server/stats/point-errors', () => ({ getClassPointErrors }));

import { GET } from '../+server';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const POINT_ID = '22222222-2222-4222-8222-222222222222';
const ERRORS = { status: 'ok', templates: [] };

async function call(classId = CLASS_ID, point: string | null = POINT_ID) {
	const url = new URL('http://localhost/api');
	if (point !== null) url.searchParams.set('point', point);
	return GET({
		params: { classId },
		url,
		locals: { supabase: {} }
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET point-errors', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireTeacherOfClass.mockResolvedValue({ classRow: { id: CLASS_ID } });
		getClassPointErrors.mockResolvedValue(ERRORS);
	});

	it('rend les erreurs du point pour la classe', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(ERRORS);
		expect(getClassPointErrors).toHaveBeenCalledWith(expect.anything(), CLASS_ID, POINT_ID);
	});

	it('400 quand la classe n’est pas un uuid', async () => {
		const res = await call('pas-un-uuid');
		expect(res.status).toBe(400);
		expect(getClassPointErrors).not.toHaveBeenCalled();
	});

	it('400 quand le point manque ou n’est pas un uuid', async () => {
		expect((await call(CLASS_ID, null)).status).toBe(400);
		expect((await call(CLASS_ID, 'x')).status).toBe(400);
		expect(getClassPointErrors).not.toHaveBeenCalled();
	});

	it('refus de la garde (pas prof, admin compris) : rien n’est lu', async () => {
		requireTeacherOfClass.mockImplementation(async () => error(403, 'Accès refusé'));
		await expect(call()).rejects.toMatchObject({ status: 403 });
		expect(getClassPointErrors).not.toHaveBeenCalled();
	});
});
