/**
 * Garde de la section admin — retour après l'élévation
 * ====================================================
 *
 * Un professeur non élevé qui ouvre une page de l'admin est envoyé vers l'élévation ;
 * l'adresse de retour garde les paramètres (filtres de la liste des modèles), sinon il
 * revient sur la page sans ses filtres (vu le 2026-11-08 : `?grades=1_SPE&minLevel=6`
 * ignoré, 42 pages au lieu de 11 modèles).
 */
import { describe, it, expect } from 'vitest';
import { load } from '../+layout.server';
import { safeElevationRedirect } from '$lib/server/elevation-redirect';

type LoadEvent = Parameters<typeof load>[0];

async function redirectionFor(path: string): Promise<string> {
	const event = {
		url: new URL(`http://localhost${path}`),
		locals: { user: { id: 'u' }, profile: { role: 'teacher' }, adminElevation: null }
	} as unknown as LoadEvent;
	try {
		await load(event);
	} catch (thrown) {
		const location = (thrown as { location?: string }).location;
		if (location) return location;
		throw thrown;
	}
	throw new Error('aucune redirection');
}

describe('garde admin : retour après l’élévation', () => {
	it('garde les paramètres de l’adresse', async () => {
		const target = '/dashboard/admin/questions?grades=1_SPE&minLevel=6&maxLevel=6';
		const location = await redirectionFor(target);

		expect(location).toBe(`/dashboard/elevate?redirect=${encodeURIComponent(target)}`);
		const back = new URL(`http://localhost${location}`).searchParams.get('redirect');
		expect(safeElevationRedirect(back)).toBe(target);
	});

	it('sans paramètres : le chemin seul', async () => {
		expect(await redirectionFor('/dashboard/admin/questions')).toBe(
			`/dashboard/elevate?redirect=${encodeURIComponent('/dashboard/admin/questions')}`
		);
	});

	it('l’accueil admin avec paramètres reste un retour admis', () => {
		expect(safeElevationRedirect('/dashboard/admin?onglet=x')).toBe('/dashboard/admin?onglet=x');
	});
});
