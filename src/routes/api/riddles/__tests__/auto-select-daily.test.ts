/**
 * POST /api/riddles/auto-select-daily : jeton `CRON_SECRET` exigé (constat 9bis).
 * Sans lui, n'importe qui faisait écrire le journal des tâches par le client service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { POST } from '../auto-select-daily/+server';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';
import { getEnv } from '$lib/server/env';

vi.mock('$lib/server/env', () => ({ getEnv: vi.fn() }));
vi.mock('$lib/server/riddle-auto-select', () => ({ checkAndAutoSelectToday: vi.fn() }));

const rpc = vi.fn();
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => ({ rpc })
}));

const SECRET = 'test-secret-12345678901234567890';
const supabase = { from: vi.fn() } as unknown as SupabaseClient;

function event(headers: Record<string, string> = {}) {
	return {
		request: new Request('https://example.com/api/riddles/auto-select-daily', {
			method: 'POST',
			headers
		}),
		locals: { supabase }
	} as never;
}

const withToken = () => event({ authorization: `Bearer ${SECRET}` });

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	vi.mocked(getEnv).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof getEnv>);
	rpc.mockResolvedValue({ data: 'run-1', error: null });
});

describe('POST /api/riddles/auto-select-daily — accès', () => {
	it('sans jeton : 401, ni journal ni sélection', async () => {
		await expect(POST(event())).rejects.toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
		expect(checkAndAutoSelectToday).not.toHaveBeenCalled();
	});

	it('l’en-tête x-vercel-cron seul ne suffit pas', async () => {
		await expect(POST(event({ 'x-vercel-cron': '1' }))).rejects.toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it('un mauvais jeton : 401', async () => {
		await expect(POST(event({ authorization: 'Bearer faux' }))).rejects.toMatchObject({
			status: 401
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it('l’ancienne clé VITE_RIDDLE_AUTO_SELECT_API_KEY n’ouvre plus la route', async () => {
		vi.stubEnv('VITE_RIDDLE_AUTO_SELECT_API_KEY', 'ancienne-cle');
		await expect(POST(event({ authorization: 'Bearer ancienne-cle' }))).rejects.toMatchObject({
			status: 401
		});
		expect(rpc).not.toHaveBeenCalled();
	});
});

describe('POST /api/riddles/auto-select-daily — avec le jeton', () => {
	it('sélectionne l’énigme et tient le journal', async () => {
		vi.mocked(checkAndAutoSelectToday).mockResolvedValue({
			success: true,
			message: 'Énigme du jour sélectionnée automatiquement: riddle-123'
		});
		const response = await POST(withToken());
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			success: true,
			message: 'Énigme du jour sélectionnée automatiquement: riddle-123'
		});
		expect(rpc).toHaveBeenCalledWith('start_job_run', expect.anything());
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_status: 'success' })
		);
	});

	it('énigme déjà programmée : succès sans sélection', async () => {
		vi.mocked(checkAndAutoSelectToday).mockResolvedValue({
			success: true,
			message: 'Énigme du jour déjà définie'
		});
		const response = await POST(withToken());
		expect(await response.json()).toEqual({
			success: true,
			message: 'Énigme du jour déjà définie'
		});
	});

	it('échec de la sélection : 500 et journal en échec', async () => {
		vi.mocked(checkAndAutoSelectToday).mockResolvedValue({
			success: false,
			message: 'Aucune énigme éligible disponible'
		});
		const response = await POST(withToken());
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			success: false,
			message: 'Aucune énigme éligible disponible'
		});
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_status: 'failed' })
		);
	});

	it('erreur inattendue : 500 « Erreur serveur »', async () => {
		vi.mocked(checkAndAutoSelectToday).mockRejectedValue(new Error('boum'));
		const response = await POST(withToken());
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ success: false, message: 'Erreur serveur' });
	});
});
