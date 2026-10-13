/**
 * Layout racine — données de travail du navigateur rattachées au compte (T17)
 * ==========================================================================
 *
 * Le module `work-data` est testé seul ; ce test prouve que le layout racine, qui tourne
 * à chaque page vue et à chaque changement de session, l'appelle bien avec le compte
 * vérifié par le serveur, et n'affiche rien quand la page doit être rechargée.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enforceWorkDataOwner, watchWorkDataOwnerOnce } from '$lib/utils/work-data';

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'http://localhost',
	PUBLIC_SUPABASE_ANON_KEY: 'anon'
}));
vi.mock('$lib/utils/work-data', () => ({
	enforceWorkDataOwner: vi.fn(),
	watchWorkDataOwnerOnce: vi.fn()
}));
vi.mock('@supabase/ssr', () => ({
	// `isBrowser` faux : le layout prend le client serveur, sans écouteur d'auth.
	isBrowser: () => false,
	createServerClient: () => ({}),
	createBrowserClient: () => ({}),
	parseCookieHeader: () => [],
	serializeCookieHeader: () => ''
}));

const { load } = await import('../+layout');

type LoadEvent = Parameters<typeof load>[0];

function event(user: { id: string } | null) {
	return {
		data: { user, profile: null, vipCardTemplates: [], cookies: [] },
		depends: vi.fn(),
		fetch: vi.fn()
	} as unknown as LoadEvent;
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('localStorage', {});
});

describe('layout racine — données de travail', () => {
	it('vérifie le propriétaire avec le compte connecté', async () => {
		vi.mocked(enforceWorkDataOwner).mockReturnValue(false);
		const result = await load(event({ id: 'eleve-a' }));
		expect(enforceWorkDataOwner).toHaveBeenCalledWith(
			'eleve-a',
			localStorage,
			expect.any(Function)
		);
		expect(result).toMatchObject({ user: { id: 'eleve-a' } });
		// Changement de compte dans un autre onglet.
		expect(watchWorkDataOwnerOnce).toHaveBeenCalledWith(expect.any(Function));
	});

	it('visiteur sans compte : vérifie avec null', async () => {
		vi.mocked(enforceWorkDataOwner).mockReturnValue(false);
		await load(event(null));
		expect(enforceWorkDataOwner).toHaveBeenCalledWith(null, localStorage, expect.any(Function));
	});

	it('données d’un autre effacées : le chargement ne se termine pas (rechargement en cours)', async () => {
		vi.mocked(enforceWorkDataOwner).mockReturnValue(true);
		const settled = vi.fn();
		void load(event({ id: 'eleve-b' })).then(settled);
		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(settled).not.toHaveBeenCalled();
	});
});
