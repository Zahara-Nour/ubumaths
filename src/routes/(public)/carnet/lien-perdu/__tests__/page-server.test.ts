/**
 * Carnet de liaison — « J'ai perdu mon lien » (A6)
 * ================================================
 *
 * Ce que la route garantit :
 *  - la MÊME réponse qu'une adresse soit connue ou non ; l'envoi tourne après
 *    la réponse ;
 *  - limite de débit par IP AVANT tout, puis par adresse (clé = empreinte,
 *    jamais l'adresse en clair) ;
 *  - adresse mal formée → 400, sans envoi.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const resend = vi.fn();
vi.mock('#lib/server/carnet/envois.ts', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/server/carnet/envois.ts')>()),
	resendLostLinks: (...a: unknown[]) => resend(...a)
}));
vi.mock('#lib/server/serviceRoleClient.ts', () => ({ createServiceRoleClient: () => ({}) }));

const rateLimit = vi.fn();
vi.mock('#lib/server/middleware/rateLimit.ts', () => ({
	rateLimit: (...a: unknown[]) => rateLimit(...a)
}));

const after = vi.fn();
vi.mock('#lib/server/after-response.ts', () => ({
	runAfterResponse: (...a: unknown[]) => after(...a)
}));

const { actions } = await import('../+page.server');

type ActionEvent = Parameters<(typeof actions)['default']>[0];

function evenement(email: string) {
	const body = new FormData();
	body.set('email', email);
	return {
		request: new Request('http://localhost/carnet/lien-perdu', { method: 'POST', body }),
		getClientAddress: () => '198.51.100.7'
	} as unknown as ActionEvent;
}

beforeEach(() => {
	resend.mockReset().mockResolvedValue(undefined);
	rateLimit.mockReset();
	after.mockReset();
});

describe('lien perdu', () => {
	it('adresse valide → « envoyé », envoi lancé après la réponse avec l’adresse normalisée', async () => {
		expect(await actions.default(evenement('  Parent.Lea@Exemple.TEST '))).toEqual({ sent: true });
		expect(resend).toHaveBeenCalledWith('parent.lea@exemple.test');
		expect(after).toHaveBeenCalledTimes(1);
	});

	it('limites : IP d’abord, puis adresse par son empreinte (jamais en clair)', async () => {
		await actions.default(evenement('parent.lea@exemple.test'));
		expect(rateLimit.mock.calls[0][0]).toBe('carnet-lost:198.51.100.7');
		const cle = rateLimit.mock.calls[1][0] as string;
		expect(cle).toMatch(/^carnet-lost-email:[0-9a-f]{64}$/);
		expect(cle).not.toContain('parent');
	});

	it('adresse mal formée → 400, aucun envoi', async () => {
		const res = (await actions.default(evenement('pas une adresse'))) as { status: number };
		expect(res.status).toBe(400);
		expect(resend).not.toHaveBeenCalled();
	});

	it('IP au-delà de la limite → 429 avant de lire le formulaire', async () => {
		rateLimit.mockRejectedValueOnce({ status: 429 });
		await expect(actions.default(evenement('parent.lea@exemple.test'))).rejects.toEqual({
			status: 429
		});
		expect(resend).not.toHaveBeenCalled();
	});
});
