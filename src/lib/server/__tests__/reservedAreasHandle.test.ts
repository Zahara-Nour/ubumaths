/**
 * Garde des espaces réservés `/dev` et `/aide-ecriture` (chantier demo-debug, PR 1)
 * =================================================================================
 *
 * Décision de David (2026-10-24) : la garde vit dans le hook, pas dans le layout. Un
 * layout ne protège ni les loads de page lancés en parallèle, ni les actions de
 * formulaire : une page déplacée plus tard sous `/dev` est ainsi gardée d'office.
 *
 * - `/dev` : admin seul (vrai compte admin, ou prof élevé). Prof non élevé → écran
 *   d'élévation, retour à la page demandée.
 * - `/aide-ecriture` : prof seul (élevé ou non). Un vrai compte admin est refusé
 *   (contenu pédagogique = prof, jamais l'admin).
 */
import { describe, it, expect, vi } from 'vitest';
import type { RequestEvent } from '@sveltejs/kit';
import { reservedAreasHandle } from '../reservedAreasHandle';

// ============================================================================
// HELPERS
// ============================================================================

type Compte = 'visiteur' | 'eleve' | 'prof' | 'prof-eleve' | 'admin';

function evenement(chemin: string, routeId: string | null, compte: Compte, methode = 'GET') {
	const connecte = compte !== 'visiteur';
	const role = compte === 'eleve' ? 'student' : compte === 'admin' ? 'admin' : 'teacher';
	const eleve = compte === 'prof-eleve';
	return {
		url: new URL(`http://localhost${chemin}`),
		route: { id: routeId },
		request: new Request(`http://localhost${chemin}`, { method: methode }),
		locals: {
			user: connecte ? { id: 'compte' } : null,
			profile: connecte ? { id: 'compte', role } : null,
			adminElevation: eleve ? { active: true, adminUserId: 'admin', expiresAt: 0 } : null,
			adminSupabase: eleve ? {} : undefined
		}
	} as unknown as RequestEvent;
}

type Issue =
	| { passe: true }
	| { passe: false; status: number; location?: string }
	| { passe: false; status: number; message?: string };

async function issue(event: RequestEvent): Promise<Issue> {
	const resolve = vi.fn().mockResolvedValue(new Response('ok'));
	try {
		const response = await reservedAreasHandle({ event, resolve });
		if (resolve.mock.calls.length === 1) return { passe: true };
		return { passe: false, status: response.status };
	} catch (e) {
		const thrown = e as { status: number; location?: string };
		return thrown.location
			? { passe: false, status: thrown.status, location: thrown.location }
			: { passe: false, status: thrown.status };
	}
}

const DEV = ['/dev', '/(protected)/dev'] as const;
const DEV_PAGE = ['/dev/polices', '/(protected)/dev/polices'] as const;
const AIDE = ['/aide-ecriture', '/(protected)/aide-ecriture'] as const;
const AIDE_PAGE = ['/aide-ecriture/geometrie', '/(protected)/aide-ecriture/geometrie'] as const;

// ============================================================================
// TESTS
// ============================================================================

describe('reservedAreasHandle — /dev (admin seul)', () => {
	it('un vrai compte admin passe', async () => {
		expect(await issue(evenement(...DEV, 'admin'))).toEqual({ passe: true });
		expect(await issue(evenement(...DEV_PAGE, 'admin'))).toEqual({ passe: true });
	});

	it('un prof élevé passe', async () => {
		expect(await issue(evenement(...DEV_PAGE, 'prof-eleve'))).toEqual({ passe: true });
	});

	it('un prof non élevé va sur l’écran d’élévation, avec la page demandée', async () => {
		expect(await issue(evenement(...DEV_PAGE, 'prof'))).toEqual({
			passe: false,
			status: 303,
			location: '/dashboard/elevate?redirect=%2Fdev%2Fpolices'
		});
	});

	it('un prof non élevé qui écrit (action de formulaire) reçoit 403, sans redirection', async () => {
		expect(await issue(evenement(...DEV_PAGE, 'prof', 'POST'))).toEqual({
			passe: false,
			status: 403
		});
	});

	it('un élève reçoit 403', async () => {
		expect(await issue(evenement(...DEV, 'eleve'))).toEqual({ passe: false, status: 403 });
		expect(await issue(evenement(...DEV_PAGE, 'eleve', 'POST'))).toEqual({
			passe: false,
			status: 403
		});
	});

	it('un visiteur va sur la page de connexion', async () => {
		expect(await issue(evenement(...DEV_PAGE, 'visiteur'))).toEqual({
			passe: false,
			status: 303,
			location: '/auth/login'
		});
	});

	it('un visiteur qui écrit reçoit 401', async () => {
		expect(await issue(evenement(...DEV_PAGE, 'visiteur', 'POST'))).toEqual({
			passe: false,
			status: 401
		});
	});

	it('la garde lit l’identifiant de route, pas le chemin brut (/%64ev atteint /dev)', async () => {
		expect(await issue(evenement('/%64ev/polices', '/(protected)/dev/polices', 'eleve'))).toEqual({
			passe: false,
			status: 403
		});
	});
});

describe('reservedAreasHandle — /aide-ecriture (prof seul)', () => {
	it('un prof passe, élevé ou non', async () => {
		expect(await issue(evenement(...AIDE, 'prof'))).toEqual({ passe: true });
		expect(await issue(evenement(...AIDE_PAGE, 'prof'))).toEqual({ passe: true });
		expect(await issue(evenement(...AIDE_PAGE, 'prof-eleve'))).toEqual({ passe: true });
	});

	it('un vrai compte admin reçoit 403 (contenu pédagogique = prof)', async () => {
		expect(await issue(evenement(...AIDE_PAGE, 'admin'))).toEqual({ passe: false, status: 403 });
	});

	it('un élève reçoit 403', async () => {
		expect(await issue(evenement(...AIDE_PAGE, 'eleve'))).toEqual({ passe: false, status: 403 });
	});

	it('un visiteur va sur la page de connexion', async () => {
		expect(await issue(evenement(...AIDE_PAGE, 'visiteur'))).toEqual({
			passe: false,
			status: 303,
			location: '/auth/login'
		});
	});
});

describe('reservedAreasHandle — hors des deux espaces', () => {
	it('une route qui commence seulement par « dev » passe', async () => {
		expect(await issue(evenement('/devoirs', '/(protected)/devoirs', 'eleve'))).toEqual({
			passe: true
		});
		expect(
			await issue(evenement('/aide-ecriture-x', '/(public)/aide-ecriture-x', 'visiteur'))
		).toEqual({ passe: true });
	});

	it('une adresse sans route (404) passe : SvelteKit répond 404', async () => {
		expect(await issue(evenement('/dev/xyz', null, 'visiteur'))).toEqual({ passe: true });
	});

	it('le reste du site n’est pas touché', async () => {
		expect(await issue(evenement('/atelier', '/(public)/atelier', 'visiteur'))).toEqual({
			passe: true
		});
		expect(
			await issue(evenement('/dashboard/admin', '/(protected)/dashboard/admin', 'eleve'))
		).toEqual({ passe: true });
	});
});
