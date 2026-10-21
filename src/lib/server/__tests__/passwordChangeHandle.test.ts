/**
 * Mot de passe provisoire à changer (PR 3, R3)
 * ===========================================
 *
 * Après une réinitialisation par le prof, l'élève doit choisir son propre mot de passe avant
 * tout : chaque page le renvoie vers /auth/update-password ; API et écritures → 403.
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { passwordChangeHandle } from '../passwordChangeHandle';

function evenement(routeId: string | null, methode: string, marque: unknown): RequestEvent {
	const chemin = routeId ?? '/inconnue';
	return {
		url: new URL(`http://localhost${chemin}`),
		route: { id: routeId },
		request: new Request(`http://localhost${chemin}`, { method: methode }),
		locals: {
			user:
				marque === undefined
					? null
					: { id: 'eleve', app_metadata: { must_change_password: marque } }
		}
	} as unknown as RequestEvent;
}

async function passe(
	event: RequestEvent
): Promise<{ passe: boolean; status?: number; location?: string }> {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	try {
		const response = await passwordChangeHandle({ event, resolve });
		return { passe: resolve.mock.calls.length === 1, status: response.status };
	} catch (e) {
		const r = e as { status: number; location: string };
		return { passe: false, status: r.status, location: r.location };
	}
}

describe('passwordChangeHandle', () => {
	it('marque posée : une page renvoie vers le changement de mot de passe', async () => {
		expect(await passe(evenement('/(protected)/dashboard', 'GET', true))).toEqual({
			passe: false,
			status: 303,
			location: '/auth/update-password'
		});
	});

	it('marque posée : API et écritures → 403', async () => {
		expect(await passe(evenement('/api/messages/send', 'POST', true))).toMatchObject({
			passe: false,
			status: 403
		});
		expect(await passe(evenement('/api/stats', 'GET', true))).toMatchObject({
			passe: false,
			status: 403
		});
		expect(await passe(evenement('/(protected)/dashboard/profile', 'POST', true))).toMatchObject({
			passe: false,
			status: 403
		});
	});

	it.each([
		['/(public)/auth/update-password', 'GET'],
		['/(public)/auth/update-password', 'POST'],
		['/(public)/auth/logout', 'POST'],
		['/api/errors/log', 'POST']
	])('marque posée : %s (%s) reste ouvert', async (routeId, methode) => {
		expect((await passe(evenement(routeId, methode, true))).passe).toBe(true);
	});

	it('sans marque, marque à false ou non booléenne, visiteur : rien ne change', async () => {
		expect((await passe(evenement('/(protected)/dashboard', 'GET', false))).passe).toBe(true);
		expect((await passe(evenement('/(protected)/dashboard', 'GET', 'true'))).passe).toBe(true);
		expect((await passe(evenement('/(protected)/dashboard', 'GET', undefined))).passe).toBe(true);
	});

	it('route inconnue (404) : laissée à SvelteKit', async () => {
		expect((await passe(evenement(null, 'GET', true))).passe).toBe(true);
	});
});
