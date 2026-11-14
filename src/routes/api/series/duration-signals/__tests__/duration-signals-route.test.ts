/**
 * GET /api/series/duration-signals — durées trop courtes d'un panier. Prof et admin.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '../+server';
import { createFakeSupabase } from '$lib/server/__tests__/helpers/fake-supabase';
import { getDurationSignals } from '$lib/server/stats/duration-signals';

vi.mock('$lib/server/stats/duration-signals', () => ({ getDurationSignals: vi.fn() }));
vi.mock('$lib/server/test-mode', () => ({ getTeacherTestMode: vi.fn(async () => true) }));

// Constantes
const TEACHER = '22222222-2222-4222-8222-222222222222';
const T1 = '4d5e6f70-4444-4444-8444-444444444444';
const T2 = '5e6f7081-5555-4555-8555-555555555555';

// Functions
function call(role: 'student' | 'teacher' | 'admin', templates: string | null) {
	const fake = createFakeSupabase((table) =>
		table === 'profiles' ? { data: { id: TEACHER, role } } : { data: [] }
	);
	const url = new URL('http://localhost/api/series/duration-signals');
	if (templates !== null) url.searchParams.set('templates', templates);
	return GET({
		url,
		locals: {
			supabase: fake.client,
			safeGetSession: async () => ({ user: { id: TEACHER }, session: {} })
		}
	} as never);
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	vi.mocked(getDurationSignals).mockReset();
	vi.mocked(getDurationSignals).mockResolvedValue({ status: 'ok', signals: {} });
});

describe('GET /api/series/duration-signals', () => {
	it('prof : 200, les signaux des modèles demandés, en mode test', async () => {
		const signals = {
			[T1]: [{ delaySeconds: 20, students: 6, unansweredInTime: 4, tooShort: true }]
		};
		vi.mocked(getDurationSignals).mockResolvedValue({ status: 'ok', signals });
		const response = await call('teacher', `${T1},${T2}`);
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(signals);
		expect(vi.mocked(getDurationSignals).mock.calls[0].slice(1)).toEqual([[T1, T2], true]);
	});

	it('admin : autorisé', async () => {
		expect((await call('admin', T1)).status).toBe(200);
	});

	it('élève : refusé (403), rien de lu', async () => {
		await expect(call('student', T1)).rejects.toMatchObject({ status: 403 });
		expect(getDurationSignals).not.toHaveBeenCalled();
	});

	it.each([
		['absent', null],
		['vide', ''],
		['pas un UUID', 'abc'],
		['un UUID suivi d’un vide', `${T1},`],
		['plus de 100 modèles', Array.from({ length: 101 }, () => T1).join(',')]
	])('liste %s : 400', async (_, templates) => {
		await expect(call('teacher', templates)).rejects.toMatchObject({ status: 400 });
		expect(getDurationSignals).not.toHaveBeenCalled();
	});

	it('lecture en échec : 500 avec le message, sans détail', async () => {
		vi.mocked(getDurationSignals).mockResolvedValue({ status: 'error', message: 'Impossible' });
		await expect(call('teacher', T1)).rejects.toMatchObject({ status: 500 });
	});
});
