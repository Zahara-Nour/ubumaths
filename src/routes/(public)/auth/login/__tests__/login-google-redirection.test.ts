/**
 * Connexion Google : la redirection vers l'écran de consentement sort du site.
 *
 * SvelteKit 3 refuse un `redirect()` vers une autre origine sans `{ external }`.
 * L'adresse rendue par Supabase (`/auth/v1/authorize` du projet) doit passer ;
 * toute autre origine reste refusée (liste blanche, pas `external: true`).
 */
import { isRedirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL } from '$app/env/public';
import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/utils/logger.ts', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

vi.mock('#lib/server/rateLimiter.ts', () => ({
	checkLoginRateLimitByIP: vi.fn(async () => ({ allowed: true })),
	checkLoginRateLimitByEmail: vi.fn(async () => ({ allowed: true })),
	checkOAuthRateLimitByIP: vi.fn(async () => ({ allowed: true }))
}));

vi.mock('#lib/config/google-login.ts', () => ({ GOOGLE_LOGIN_ENABLED: true }));

const { actions } = await import('../+page.server');

// Lance l'action avec un client Supabase qui rend `oauthUrl`, et renvoie ce qui est levé
async function googleSignIn(oauthUrl: string): Promise<unknown> {
	const signInWithOAuth = vi.fn(async () => ({ data: { url: oauthUrl }, error: null }));
	try {
		await actions.googleSignIn({
			request: new Request('http://localhost/auth/login', { method: 'POST' }),
			url: new URL('http://localhost/auth/login'),
			locals: { supabase: { auth: { signInWithOAuth } } },
			getClientAddress: () => '203.0.113.7'
		} as never);
	} catch (thrown) {
		return thrown;
	}
	return undefined;
}

describe('/auth/login — redirection vers Google', () => {
	it('redirige vers l’adresse d’autorisation du projet Supabase', async () => {
		const oauthUrl = `${PUBLIC_SUPABASE_URL}/auth/v1/authorize?provider=google`;
		const thrown = await googleSignIn(oauthUrl);
		expect(isRedirect(thrown)).toBe(true);
		expect(thrown).toMatchObject({ status: 303, location: oauthUrl });
	});

	it('refuse une adresse d’une autre origine', async () => {
		const thrown = await googleSignIn('https://ailleurs.example/auth/v1/authorize');
		expect(isRedirect(thrown)).toBe(false);
		// Refus de la liste blanche de kit, pas une autre exception
		expect(thrown).toBeInstanceOf(Error);
		expect((thrown as Error).message).toMatch(/allowlist/);
	});
});
