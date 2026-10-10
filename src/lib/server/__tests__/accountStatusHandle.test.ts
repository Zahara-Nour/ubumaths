/**
 * Garde du statut de compte (constat B6)
 * ======================================
 *
 * Un compte « en attente » ou « refusé » était arrêté par le layout `(protected)` — donc
 * sur les PAGES seulement : les API (`requireAuth` ne lit pas le statut) et les actions
 * de formulaire (qui ne passent pas par le load du layout) restaient ouvertes.
 *
 * Décision de David (2026-10-10) : un seul garde, dans le hook, après le chargement du
 * profil. Un compte non approuvé reçoit 403 sur toute API et toute écriture, sauf
 * déconnexion, export et suppression de compte (droits RGPD art. 15, 17, 20).
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { accountStatusHandle } from '../accountStatusHandle';

// ============================================================================
// HELPERS
// ============================================================================

function evenement(
	chemin: string,
	methode: string,
	statut: 'approved' | 'pending' | 'rejected' | null
): RequestEvent {
	return {
		url: new URL(`http://localhost${chemin}`),
		request: new Request(`http://localhost${chemin}`, { method: methode }),
		locals: {
			user: statut ? { id: 'compte' } : null,
			profile: statut ? { id: 'compte', status: statut } : null
		}
	} as unknown as RequestEvent;
}

async function passe(event: RequestEvent): Promise<{ passe: boolean; status: number }> {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	const response = await accountStatusHandle({ event, resolve });
	return { passe: resolve.mock.calls.length === 1, status: response.status };
}

// ============================================================================
// TESTS
// ============================================================================

describe('accountStatusHandle', () => {
	it.each(['pending', 'rejected'] as const)('compte %s : une API répond 403', async (statut) => {
		expect(await passe(evenement('/api/messages/send', 'POST', statut))).toEqual({
			passe: false,
			status: 403
		});
		expect(await passe(evenement('/api/marketplace/listings', 'GET', statut))).toEqual({
			passe: false,
			status: 403
		});
	});

	it.each(['pending', 'rejected'] as const)(
		'compte %s : une action de formulaire (POST sur une page) répond 403',
		async (statut) => {
			expect(await passe(evenement('/dashboard/profile', 'POST', statut))).toEqual({
				passe: false,
				status: 403
			});
		}
	);

	it('compte en attente : une page en GET passe (le layout le renvoie vers l’attente)', async () => {
		expect((await passe(evenement('/dashboard', 'GET', 'pending'))).passe).toBe(true);
	});

	it.each(['/auth/logout', '/api/account/delete', '/api/account/export'])(
		'compte refusé : %s reste ouvert (déconnexion, droits RGPD)',
		async (chemin) => {
			expect((await passe(evenement(chemin, 'POST', 'rejected'))).passe).toBe(true);
		}
	);

	it('compte approuvé : tout passe', async () => {
		expect((await passe(evenement('/api/messages/send', 'POST', 'approved'))).passe).toBe(true);
		expect((await passe(evenement('/dashboard/profile', 'POST', 'approved'))).passe).toBe(true);
	});

	it('visiteur non connecté : le garde ne s’en mêle pas', async () => {
		expect((await passe(evenement('/api/auth/whatever', 'POST', null))).passe).toBe(true);
	});
});
