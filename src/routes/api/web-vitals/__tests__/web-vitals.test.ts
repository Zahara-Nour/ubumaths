/**
 * POST /api/web-vitals : réception des mesures de performance des visiteurs.
 *
 * Route ouverte à tous, sans compte. Elle n'écrit qu'en prod, ne lit pas la session
 * et n'enregistre ni l'adresse du visiteur ni l'adresse réelle de la page.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const insertMock = vi.fn();
const fromMock = vi.fn((_table: string) => ({ insert: insertMock }));
const rateLimitMock = vi.fn();

vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => ({ from: fromMock })
}));
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...args: unknown[]) => rateLimitMock(...args)
}));

import { POST } from '../+server';

type PostEvent = Parameters<typeof POST>[0];

const safeGetSession = vi.fn();

function event(body: unknown, raw = false): PostEvent {
	return {
		request: new Request('http://localhost/api/web-vitals', {
			method: 'POST',
			body: raw ? (body as string) : JSON.stringify(body)
		}),
		locals: { safeGetSession },
		getClientAddress: () => '203.0.113.7'
	} as unknown as PostEvent;
}

const BATCH = {
	device_type: 'mobile',
	samples: [
		{ route: '/(public)', metric: 'LCP', value: 1200 },
		{ route: '/(public)/automaths', metric: 'CLS', value: 0.02 }
	]
};

/** Statut d'une réponse ou de l'erreur levée par `error()` */
async function status(pending: ReturnType<typeof POST>): Promise<number> {
	try {
		return (await pending).status;
	} catch (err) {
		return (err as { status: number }).status;
	}
}

describe('POST /api/web-vitals', () => {
	beforeEach(() => {
		insertMock.mockReset();
		insertMock.mockResolvedValue({ error: null });
		fromMock.mockClear();
		rateLimitMock.mockReset();
		safeGetSession.mockReset();
		vi.stubEnv('VERCEL_ENV', 'production');
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('écrit une ligne par mesure : route, indicateur, valeur, type d’appareil', async () => {
		expect(await status(POST(event(BATCH)))).toBe(204);

		expect(fromMock).toHaveBeenCalledWith('web_vital_samples');
		expect(insertMock).toHaveBeenCalledWith([
			{ route: '/(public)', metric: 'LCP', value: 1200, device_type: 'mobile' },
			{ route: '/(public)/automaths', metric: 'CLS', value: 0.02, device_type: 'mobile' }
		]);
	});

	it('n’écrit que les quatre colonnes permises, quoi que le navigateur envoie', async () => {
		await POST(
			event({
				device_type: 'desktop',
				samples: [
					{
						route: '/(public)',
						metric: 'LCP',
						value: 1200,
						created_at: '2020-01-01T00:00:00Z',
						id: '00000000-0000-4000-8000-000000000000',
						user_id: 'u1'
					}
				]
			})
		);

		const rows = insertMock.mock.calls[0][0] as Record<string, unknown>[];
		expect(Object.keys(rows[0]).sort()).toEqual(['device_type', 'metric', 'route', 'value']);
	});

	it('ne lit pas la session du visiteur', async () => {
		await POST(event(BATCH));
		expect(safeGetSession).not.toHaveBeenCalled();
	});

	it('limite les envois par adresse, sans mettre l’adresse dans la clé', async () => {
		await POST(event(BATCH));

		const [key, max, windowMs] = rateLimitMock.mock.calls[0] as [string, number, number];
		expect(key.startsWith('web-vitals:')).toBe(true);
		expect(key).not.toContain('203.0.113.7');
		expect([max, windowMs]).toEqual([30, 60_000]);
	});

	it('plafonne aussi les envois de tout le site, quelle que soit l’adresse', async () => {
		await POST(event(BATCH));

		expect(rateLimitMock).toHaveBeenCalledTimes(2);
		expect(rateLimitMock.mock.calls[1]).toEqual(['web-vitals:global', 2000, 3_600_000]);
	});

	it('plafond du site atteint : refusé, rien d’écrit', async () => {
		rateLimitMock.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ status: 429 });

		expect(await status(POST(event(BATCH)))).toBe(429);
		expect(insertMock).not.toHaveBeenCalled();
	});

	it('trop d’envois : refusé, rien d’écrit', async () => {
		rateLimitMock.mockRejectedValue({ status: 429 });

		expect(await status(POST(event(BATCH)))).toBe(429);
		expect(insertMock).not.toHaveBeenCalled();
	});

	it('hors prod : rien d’écrit, rien de compté', async () => {
		vi.stubEnv('VERCEL_ENV', 'preview');

		expect(await status(POST(event(BATCH)))).toBe(204);
		expect(insertMock).not.toHaveBeenCalled();
		expect(rateLimitMock).not.toHaveBeenCalled();
	});

	it('envoi mal formé : 400, rien d’écrit', async () => {
		expect(await status(POST(event({ device_type: 'tv', samples: BATCH.samples })))).toBe(400);
		expect(await status(POST(event('pas du JSON', true)))).toBe(400);
		expect(insertMock).not.toHaveBeenCalled();
	});

	it('page inconnue ou valeur absurde : écartée, le reste est écrit', async () => {
		await POST(
			event({
				device_type: 'tablet',
				samples: [
					{ route: '/cours/abcdef123456', metric: 'LCP', value: 1200 },
					{ route: '/(public)', metric: 'LCP', value: 5_648_992 },
					{ route: '/(public)', metric: 'TTFB', value: 90 }
				]
			})
		);

		expect(insertMock).toHaveBeenCalledWith([
			{ route: '/(public)', metric: 'TTFB', value: 90, device_type: 'tablet' }
		]);
	});

	it('aucune mesure valable : 204, rien d’écrit', async () => {
		const body = {
			device_type: 'mobile',
			samples: [{ route: '/cours/abcdef123456', metric: 'LCP', value: 1200 }]
		};

		expect(await status(POST(event(body)))).toBe(204);
		expect(insertMock).not.toHaveBeenCalled();
	});

	it('écriture refusée par la base : 500', async () => {
		insertMock.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });

		expect(await status(POST(event(BATCH)))).toBe(500);
	});
});
