/**
 * Carnet de liaison — confirmation d'une adresse (A2, A5)
 * =======================================================
 *
 * Ce que la route garantit :
 *  - l'affichage n'appelle PAS la base : un antivirus de messagerie qui ouvre
 *    le lien ne consomme ni la confirmation ni le refus (tout passe par un
 *    bouton, donc un POST) ;
 *  - confirmer → lien émis et ENVOYÉ par courriel, jamais montré ni rendu par
 *    redirection (Q26 : un antivirus qui clique n'emporte rien) ;
 *  - confirmation refusée (utilisée, échue, inconnue) → la même réponse ;
 *  - « Je ne suis pas le parent » → l'adresse est effacée ;
 *  - limite de débit par IP avant chaque geste ; `noindex`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const confirm = vi.fn();
const refuse = vi.fn();
vi.mock('#lib/server/carnet/carnet.ts', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/carnet/carnet.ts')>()),
	refuseParentContact: (...a: unknown[]) => refuse(...a)
}));
vi.mock('#lib/server/carnet/envois.ts', () => ({
	confirmContactAndSendLink: (...a: unknown[]) => confirm(...a)
}));

const rateLimit = vi.fn();
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...a: unknown[]) => rateLimit(...a)
}));

const { load, actions } = await import('../+page.server');

const JETON = 'B'.repeat(43);

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['confirm']>[0];

function evenement<T>(token: string) {
	const headers: Record<string, string> = {};
	const ev = {
		params: { token },
		getClientAddress: () => '198.51.100.7',
		setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
	} as unknown as T;
	return { ev, headers };
}

async function issue(p: unknown): Promise<{ status: number; location?: string; data?: unknown }> {
	try {
		const data = await p;
		const echec = data as { status?: number; data?: unknown } | undefined;
		if (echec && typeof echec.status === 'number')
			return { status: echec.status, data: echec.data };
		return { status: 200, data };
	} catch (e) {
		const err = e as { status: number; location?: string };
		return { status: err.status, location: err.location };
	}
}

beforeEach(() => {
	confirm.mockReset();
	refuse.mockReset();
	rateLimit.mockReset();
});

describe('load', () => {
	it('affiche sans appeler la base', async () => {
		const { ev, headers } = evenement<LoadEvent>(JETON);
		await load(ev);
		expect(confirm).not.toHaveBeenCalled();
		expect(refuse).not.toHaveBeenCalled();
		expect(headers['X-Robots-Tag']).toBe('noindex, nofollow');
	});

	it('jeton mal formé → 404', async () => {
		const { ev } = evenement<LoadEvent>('court');
		expect((await issue(load(ev))).status).toBe(404);
	});
});

describe('confirm', () => {
	it('confirmée → « lien envoyé », sans redirection ni jeton du carnet (Q26)', async () => {
		confirm.mockResolvedValue({ linkSent: true });
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await issue(actions.confirm(ev))).toEqual({
			status: 200,
			data: { outcome: 'link_sent' }
		});
		expect(confirm).toHaveBeenCalledWith(JETON);
		expect(rateLimit).toHaveBeenCalledWith(expect.stringContaining('198.51.100.7'), 10, 60_000);
	});

	it('confirmée sans lien (partage coupé, Brevo en échec) → confirmée, sans lien', async () => {
		confirm.mockResolvedValue({ linkSent: false });
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await issue(actions.confirm(ev))).toEqual({
			status: 200,
			data: { outcome: 'confirmed' }
		});
	});

	it('confirmation refusée → 410, la même réponse dans tous les cas', async () => {
		confirm.mockResolvedValue(null);
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await issue(actions.confirm(ev))).toEqual({
			status: 410,
			data: { outcome: 'invalid' }
		});
	});

	it('jeton mal formé → 410 sans base ni limite', async () => {
		const { ev } = evenement<ActionEvent>('court');
		expect((await issue(actions.confirm(ev))).status).toBe(410);
		expect(confirm).not.toHaveBeenCalled();
	});
});

describe('refuse', () => {
	it('« Je ne suis pas le parent » → effacée', async () => {
		refuse.mockResolvedValue(true);
		const { ev } = evenement<ActionEvent>(JETON);
		expect(await issue(actions.refuse(ev))).toEqual({
			status: 200,
			data: { outcome: 'refused' }
		});
		expect(refuse).toHaveBeenCalledWith(JETON);
		expect(rateLimit).toHaveBeenCalled();
	});

	it('jeton inconnu ou déjà traité → 410', async () => {
		refuse.mockResolvedValue(false);
		const { ev } = evenement<ActionEvent>(JETON);
		expect((await issue(actions.refuse(ev))).status).toBe(410);
	});
});
