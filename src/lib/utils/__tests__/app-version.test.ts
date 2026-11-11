import { describe, expect, it, vi } from 'vitest';
import { checkAppVersion, shouldReloadOnNavigate } from '../app-version';

// Réponse de `/_app/version.json` simulée
function fetchReturning(body: unknown, ok = true): typeof fetch {
	return vi.fn(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 404 }));
}

describe('checkAppVersion — onglet face au dernier déploiement', () => {
	it('même version : « same »', async () => {
		const fetchFn = fetchReturning({ version: '1794425823408' });
		expect(await checkAppVersion('1794425823408', fetchFn)).toBe('same');
	});

	it('version différente (déploiement depuis le chargement) : « new »', async () => {
		const fetchFn = fetchReturning({ version: '1794499999999' });
		expect(await checkAppVersion('1794425823408', fetchFn)).toBe('new');
	});

	it('lit le fichier de version sans cache', async () => {
		const fetchFn = fetchReturning({ version: 'a' });
		await checkAppVersion('a', fetchFn);
		expect(fetchFn).toHaveBeenCalledWith('/_app/version.json', { cache: 'no-cache' });
	});

	it('réseau coupé : « unknown »', async () => {
		const fetchFn = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		});
		expect(await checkAppVersion('a', fetchFn)).toBe('unknown');
	});

	it('fichier absent (dev) : « unknown »', async () => {
		expect(await checkAppVersion('a', fetchReturning({}, false))).toBe('unknown');
	});

	it('contenu inattendu : « unknown »', async () => {
		expect(await checkAppVersion('a', fetchReturning({ version: 42 }))).toBe('unknown');
		expect(await checkAppVersion('a', fetchReturning(null))).toBe('unknown');
	});
});

describe('shouldReloadOnNavigate — rechargement complet à la navigation', () => {
	const to = { url: new URL('https://www.chiph.re/dashboard') };

	it('nouvelle version + lien : rechargement', () => {
		expect(shouldReloadOnNavigate({ updated: true, willUnload: false, type: 'link', to })).toBe(
			true
		);
	});

	it('nouvelle version + bouton Précédent / Suivant : rechargement', () => {
		expect(shouldReloadOnNavigate({ updated: true, willUnload: false, type: 'popstate', to })).toBe(
			true
		);
	});

	it('nouvelle version + goto (code, en pleine activité) : rien', () => {
		expect(shouldReloadOnNavigate({ updated: true, willUnload: false, type: 'goto', to })).toBe(
			false
		);
	});

	it('nouvelle version + formulaire : rien', () => {
		expect(shouldReloadOnNavigate({ updated: true, willUnload: false, type: 'form', to })).toBe(
			false
		);
	});

	it('pas de nouvelle version : rien', () => {
		expect(shouldReloadOnNavigate({ updated: false, willUnload: false, type: 'link', to })).toBe(
			false
		);
	});

	it('la page se décharge déjà (lien externe, fermeture) : rien', () => {
		expect(shouldReloadOnNavigate({ updated: true, willUnload: true, type: 'link', to })).toBe(
			false
		);
	});

	it('pas de destination : rien', () => {
		expect(
			shouldReloadOnNavigate({ updated: true, willUnload: false, type: 'link', to: null })
		).toBe(false);
	});
});
