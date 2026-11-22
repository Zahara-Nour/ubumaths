/**
 * GET /api/web-vitals/releve : résultats calculés des mesures de performance, pour le
 * relevé mensuel. Protégée par un jeton dédié ; ne rend jamais les lignes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const TOKEN = 'jeton-de-test-'.repeat(3);

const readSamplesMock = vi.fn();
const rateLimitMock = vi.fn();
const env: { WEB_VITALS_RELEVE_TOKEN?: string } = {};

vi.mock('#lib/server/env.ts', () => ({ getEnv: () => env }));
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...args: unknown[]) => rateLimitMock(...args)
}));
vi.mock('#lib/server/web-vitals/releve.ts', async (original) => ({
	...(await original<typeof import('#lib/server/web-vitals/releve.ts')>()),
	readSamples: (...args: unknown[]) => readSamplesMock(...args)
}));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({
	createServiceRoleClient: () => {
		throw new Error('la route ne lit la base que par readSamples');
	}
}));

import { GET } from '../+server';

type GetEvent = Parameters<typeof GET>[0];

const safeGetSession = vi.fn();

function event(query = '', authorization: string | null = `Bearer ${TOKEN}`): GetEvent {
	const url = new URL(`http://localhost/api/web-vitals/releve${query}`);
	const headers = new Headers();
	if (authorization !== null) headers.set('authorization', authorization);
	return {
		request: new Request(url, { headers }),
		url,
		locals: { safeGetSession },
		getClientAddress: () => '203.0.113.7'
	} as unknown as GetEvent;
}

/** Statut d'une réponse ou de l'erreur levée par `error()` */
async function status(pending: ReturnType<typeof GET>): Promise<number> {
	try {
		return (await pending).status;
	} catch (err) {
		return (err as { status: number }).status;
	}
}

describe('GET /api/web-vitals/releve', () => {
	beforeEach(() => {
		env.WEB_VITALS_RELEVE_TOKEN = TOKEN;
		readSamplesMock.mockReset();
		readSamplesMock.mockResolvedValue({
			rows: [1000, 2000, 3000, 4000, 5000].map((value) => ({
				route: '/(public)',
				metric: 'LCP',
				value
			})),
			truncated: false
		});
		rateLimitMock.mockReset();
		safeGetSession.mockReset();
	});

	it('bon jeton : rend le relevé calculé, 28 jours par défaut', async () => {
		const response = await GET(event());

		expect(response.status).toBe(200);
		expect(readSamplesMock).toHaveBeenCalledWith(28);
		expect(await response.json()).toEqual({
			days: 28,
			total: 5,
			truncated: false,
			global: { LCP: { count: 5, p75: 4000 } },
			routes: [{ route: '/(public)', metrics: { LCP: { count: 5, p75: 4000 } } }]
		});
	});

	it('la réponse n’est gardée par aucun cache', async () => {
		const response = await GET(event());
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it('lit le nombre de jours demandé', async () => {
		await GET(event('?days=7'));
		expect(readSamplesMock).toHaveBeenCalledWith(7);
	});

	it.each(['?days=0', '?days=91', '?days=abc', '?days=1.5'])(
		'période invalide (%s) : 400, rien de lu',
		async (query) => {
			expect(await status(GET(event(query)))).toBe(400);
			expect(readSamplesMock).not.toHaveBeenCalled();
		}
	);

	it.each([
		['sans en-tête', null],
		['jeton faux', `Bearer ${'x'.repeat(TOKEN.length)}`],
		['sans « Bearer »', TOKEN]
	])('%s : 401, rien de lu', async (_cas, authorization) => {
		expect(await status(GET(event('', authorization)))).toBe(401);
		expect(readSamplesMock).not.toHaveBeenCalled();
	});

	it('jeton non configuré sur le serveur : 503, même avec un en-tête', async () => {
		delete env.WEB_VITALS_RELEVE_TOKEN;

		expect(await status(GET(event()))).toBe(503);
		expect(await status(GET(event('', 'Bearer undefined')))).toBe(503);
		expect(readSamplesMock).not.toHaveBeenCalled();
	});

	it('limite les appels par adresse avant de regarder le jeton, sans mettre l’adresse dans la clé', async () => {
		await status(GET(event('', 'Bearer faux')));

		const [key, max, windowMs] = rateLimitMock.mock.calls[0] as [string, number, number];
		expect(key.startsWith('web-vitals-releve:')).toBe(true);
		expect(key).not.toContain('203.0.113.7');
		expect([max, windowMs]).toEqual([10, 60_000]);
	});

	it('trop d’appels : 429, rien de lu', async () => {
		rateLimitMock.mockRejectedValue({ status: 429 });

		expect(await status(GET(event()))).toBe(429);
		expect(readSamplesMock).not.toHaveBeenCalled();
	});

	it('lecture en échec : 500, aucun relevé partiel', async () => {
		readSamplesMock.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });

		expect(await status(GET(event()))).toBe(500);
	});

	it('ne lit pas la session', async () => {
		await GET(event());
		expect(safeGetSession).not.toHaveBeenCalled();
	});
});
