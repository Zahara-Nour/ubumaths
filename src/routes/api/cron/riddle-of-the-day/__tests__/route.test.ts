/**
 * Cron « énigme du jour » : jeton `CRON_SECRET` exigé (constat 9bis), sélection écrite par
 * le client service (la policy d'INSERT de `riddle_of_the_day` refuse un automate sans
 * compte), journal tenu.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../+server';
import { checkAndAutoSelectToday } from '$lib/server/riddle-auto-select';
import { getEnv } from '$lib/server/env';

vi.mock('$lib/server/env', () => ({ getEnv: vi.fn() }));
vi.mock('$lib/server/riddle-auto-select', () => ({ checkAndAutoSelectToday: vi.fn() }));

const rpc = vi.fn();
const serviceClient = { rpc, from: vi.fn() };
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: () => serviceClient
}));

const SECRET = 'test-secret-12345678901234567890';

function event(headers: Record<string, string> = {}) {
	return {
		request: new Request('https://example.com/api/cron/riddle-of-the-day', { headers })
	} as never;
}

const withToken = () => event({ authorization: `Bearer ${SECRET}` });

beforeEach(() => {
	vi.clearAllMocks();
	vi.unstubAllEnvs();
	vi.mocked(getEnv).mockReturnValue({ CRON_SECRET: SECRET } as ReturnType<typeof getEnv>);
	rpc.mockResolvedValue({ data: 'run-1', error: null });
});

describe('api/cron/riddle-of-the-day — accès', () => {
	it('sans jeton : 401, ni journal ni sélection', async () => {
		for (const handler of [GET, POST]) {
			await expect(handler(event())).rejects.toMatchObject({ status: 401 });
		}
		expect(rpc).not.toHaveBeenCalled();
		expect(checkAndAutoSelectToday).not.toHaveBeenCalled();
	});

	it('l’en-tête x-vercel-cron seul ne suffit pas', async () => {
		await expect(GET(event({ 'x-vercel-cron': '1' }))).rejects.toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it('un mauvais jeton : 401', async () => {
		await expect(GET(event({ authorization: 'Bearer faux' }))).rejects.toMatchObject({
			status: 401
		});
		expect(rpc).not.toHaveBeenCalled();
	});

	it('l’ancienne clé VITE_RIDDLE_AUTO_SELECT_API_KEY n’ouvre pas la route', async () => {
		vi.stubEnv('VITE_RIDDLE_AUTO_SELECT_API_KEY', 'ancienne-cle');
		await expect(GET(event({ authorization: 'Bearer ancienne-cle' }))).rejects.toMatchObject({
			status: 401
		});
		expect(rpc).not.toHaveBeenCalled();
	});
});

describe('api/cron/riddle-of-the-day — avec le jeton', () => {
	it('GET (cron Vercel) et POST (admin) sélectionnent avec le client service', async () => {
		vi.mocked(checkAndAutoSelectToday).mockResolvedValue({
			success: true,
			message: 'Énigme du jour sélectionnée automatiquement: riddle-123'
		});
		for (const handler of [GET, POST]) {
			const response = await handler(withToken());
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual({
				success: true,
				message: 'Énigme du jour sélectionnée automatiquement: riddle-123'
			});
		}
		// Le client de l'appelant (sans compte) est refusé par la policy d'INSERT.
		expect(checkAndAutoSelectToday).toHaveBeenCalledWith(serviceClient);
		expect(rpc).toHaveBeenCalledWith('start_job_run', { p_job_name: 'auto_select_daily_riddle' });
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
		const response = await GET(withToken());
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
		const response = await GET(withToken());
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

	it('erreur inattendue : 500 « Erreur serveur », journal en échec', async () => {
		vi.mocked(checkAndAutoSelectToday).mockRejectedValue(new Error('boum'));
		const response = await GET(withToken());
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ success: false, message: 'Erreur serveur' });
		expect(rpc).toHaveBeenCalledWith(
			'complete_job_run',
			expect.objectContaining({ p_status: 'failed', p_error_message: 'boum' })
		);
	});
});
