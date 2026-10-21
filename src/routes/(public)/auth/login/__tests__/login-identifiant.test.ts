import { describe, expect, it, vi } from 'vitest';
import { CHILD_ACCOUNT_DOMAIN } from '$lib/utils/child-account';

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

vi.mock('$lib/server/rateLimiter', () => ({
	checkLoginRateLimitByIP: vi.fn(async () => ({ allowed: true })),
	checkLoginRateLimitByEmail: vi.fn(async () => ({ allowed: true })),
	checkOAuthRateLimitByIP: vi.fn(async () => ({ allowed: true }))
}));

const { actions } = await import('../+page.server');

async function login(identifier: string) {
	const signInWithPassword = vi.fn(async () => ({
		error: { message: 'Invalid login credentials' }
	}));
	const form = new FormData();
	form.set('email', identifier);
	form.set('password', 'secret');
	const res = await actions.login({
		request: new Request('http://localhost/auth/login', { method: 'POST', body: form }),
		locals: { supabase: { auth: { signInWithPassword } } },
		getClientAddress: () => '127.0.0.1'
	} as never);
	return { res, signInWithPassword };
}

describe('/auth/login — identifiant de l’enfant', () => {
	it('connecte un identifiant par l’adresse du domaine fictif', async () => {
		const { signInWithPassword } = await login('Noélie42');
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: `noelie42@${CHILD_ACCOUNT_DOMAIN}`,
			password: 'secret'
		});
	});

	it('garde le chemin par adresse', async () => {
		const { signInWithPassword } = await login('Eleve@Exemple.fr');
		expect(signInWithPassword).toHaveBeenCalledWith({
			email: 'eleve@exemple.fr',
			password: 'secret'
		});
	});

	it('rend le même message d’échec unique', async () => {
		const { res } = await login('noelie42');
		expect(res).toMatchObject({ status: 400, data: { error: 'Identifiants invalides.' } });
	});

	it('réaffiche ce que l’enfant a tapé, pas l’adresse fictive', async () => {
		const { res } = await login('Noélie42');
		expect(res).toMatchObject({ data: { email: 'Noélie42' } });
	});

	it('refuse un champ vide sans appeler l’auth', async () => {
		const { res, signInWithPassword } = await login(' - ');
		expect(res).toMatchObject({ status: 400 });
		expect(signInWithPassword).not.toHaveBeenCalled();
	});
});
