/**
 * Carnet de liaison — page du parent (B1-B5, E5)
 * ==============================================
 *
 * Accessible SANS COMPTE. Ce que la route garantit :
 *  - un jeton mal formé → 404, SANS appeler la base ni la limite de débit ;
 *  - lien mort ou carnet fermé (révoqué, expiré, partage coupé, élève sorti
 *    de la classe) → le MÊME 404, la même phrase (B4) ;
 *  - `noindex`, pas de cache partagé ;
 *  - une limite de débit par adresse IP avant toute lecture ;
 *  - arrêt et reprise des courriels par le lien ; le carnet reste ouvert.
 *
 * Le module serveur est simulé : il est prouvé par ses propres tests.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const readCarnet = vi.fn();
const setStopped = vi.fn();
vi.mock('#lib/server/carnet/carnet.ts', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/carnet/carnet.ts')>()),
	readCarnetByToken: (...a: unknown[]) => readCarnet(...a),
	setParentEmailsStopped: (...a: unknown[]) => setStopped(...a)
}));

const rateLimit = vi.fn();
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...a: unknown[]) => rateLimit(...a)
}));

const { load, actions } = await import('../+page.server');
const { INVALID_CARNET_LINK } = await import('#lib/server/carnet/carnet.ts');

const JETON = 'A'.repeat(43);

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['stopEmails']>[0];

function evenement<T>(token: string) {
	const headers: Record<string, string> = {};
	const ev = {
		params: { token },
		url: new URL(`http://localhost/carnet/${token}`),
		getClientAddress: () => '198.51.100.7',
		setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
	} as unknown as T;
	return { ev, headers };
}

async function statut(p: unknown): Promise<{ status: number; message?: string }> {
	try {
		await p;
	} catch (e) {
		const err = e as { status: number; body?: { message?: string } };
		return { status: err.status, message: err.body?.message };
	}
	return { status: 200 };
}

const CARNET = {
	firstname: 'Léa',
	weeks: [],
	revisions: { overdue: 0 },
	evaluations: [],
	classes: [],
	emails_stopped: false
};

beforeEach(() => {
	readCarnet.mockReset();
	setStopped.mockReset();
	rateLimit.mockReset();
});

describe('load', () => {
	it('jeton mal formé → 404 sans base ni limite de débit', async () => {
		const { ev, headers } = evenement<LoadEvent>('court');
		expect(await statut(load(ev))).toEqual({ status: 404, message: INVALID_CARNET_LINK });
		expect(readCarnet).not.toHaveBeenCalled();
		expect(rateLimit).not.toHaveBeenCalled();
		expect(headers['X-Robots-Tag']).toBe('noindex, nofollow');
	});

	it('lien mort → le même 404, la même phrase', async () => {
		readCarnet.mockResolvedValue(null);
		const { ev } = evenement<LoadEvent>(JETON);
		expect(await statut(load(ev))).toEqual({ status: 404, message: INVALID_CARNET_LINK });
	});

	it('lien valide → le carnet et le jeton ; limite de débit par IP avant la lecture', async () => {
		readCarnet.mockResolvedValue(CARNET);
		const { ev, headers } = evenement<LoadEvent>(JETON);
		const data = await load(ev);
		expect(data).toEqual({ carnet: CARNET });
		expect(rateLimit).toHaveBeenCalledWith(expect.stringContaining('198.51.100.7'), 30, 60_000);
		expect(rateLimit.mock.invocationCallOrder[0]).toBeLessThan(
			readCarnet.mock.invocationCallOrder[0]
		);
		expect(headers['X-Robots-Tag']).toBe('noindex, nofollow');
		expect(headers['Cache-Control']).toBe('private, no-store');
	});

	it('limite de débit atteinte → la lecture n’a pas lieu', async () => {
		rateLimit.mockRejectedValue({ status: 429 });
		const { ev } = evenement<LoadEvent>(JETON);
		expect((await statut(load(ev))).status).toBe(429);
		expect(readCarnet).not.toHaveBeenCalled();
	});
});

describe('actions des courriels', () => {
	it('stopEmails → arrête, et le dit', async () => {
		setStopped.mockResolvedValue(true);
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await actions.stopEmails(ev)).toEqual({ emails: 'stopped' });
		expect(setStopped).toHaveBeenCalledWith(JETON, true);
		expect(rateLimit).toHaveBeenCalled();
	});

	it('resumeEmails → reprend', async () => {
		setStopped.mockResolvedValue(true);
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await actions.resumeEmails(ev)).toEqual({ emails: 'resumed' });
		expect(setStopped).toHaveBeenCalledWith(JETON, false);
	});

	it('lien mort → 404, la même phrase', async () => {
		setStopped.mockResolvedValue(false);
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await statut(actions.stopEmails(ev))).toEqual({
			status: 404,
			message: INVALID_CARNET_LINK
		});
	});

	it('jeton mal formé → 404 sans base', async () => {
		const { ev } = evenement<ActionEvent>('court');
		expect((await statut(actions.resumeEmails(ev))).status).toBe(404);
		expect(setStopped).not.toHaveBeenCalled();
	});
});
