import { beforeEach, describe, expect, it, vi } from 'vitest';

// `dev` réglable par test : faux = build (Vercel, aperçu), vrai = pnpm dev.
const env = vi.hoisted(() => ({ dev: true }));

vi.mock('$app/environment', () => ({
	browser: false,
	building: false,
	get dev() {
		return env.dev;
	},
	version: 'test'
}));

vi.mock('$lib/utils/logger', () => ({
	createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

vi.mock('$lib/server/rateLimiter', () => ({
	checkLoginRateLimitByIP: vi.fn(async () => ({ allowed: false, message: 'Trop de tentatives.' })),
	checkLoginRateLimitByEmail: vi.fn(async () => ({
		allowed: false,
		message: 'Trop de tentatives.'
	})),
	checkOAuthRateLimitByIP: vi.fn(async () => ({ allowed: true }))
}));

const { actions } = await import('../+page.server');
const { checkLoginRateLimitByIP, checkLoginRateLimitByEmail } =
	await import('$lib/server/rateLimiter');

async function login(ip: string, email = 'eleve@exemple.fr') {
	const signInWithPassword = vi.fn(async () => ({
		error: { message: 'Invalid login credentials' }
	}));
	const form = new FormData();
	form.set('email', email);
	form.set('password', 'secret');
	const res = await actions.login({
		request: new Request('http://localhost/auth/login', { method: 'POST', body: form }),
		locals: { supabase: { auth: { signInWithPassword } } },
		getClientAddress: () => ip
	} as never);
	return { res, signInWithPassword };
}

beforeEach(() => {
	env.dev = true;
	vi.mocked(checkLoginRateLimitByIP).mockClear();
	vi.mocked(checkLoginRateLimitByEmail).mockClear();
});

describe('/auth/login — limiteur levé sur le serveur de dev local', () => {
	it.each(['127.0.0.1', '::1', '::ffff:127.0.0.1'])(
		'sous pnpm dev depuis %s : aucun des deux limiteurs n’est consulté',
		async (ip) => {
			const { res, signInWithPassword } = await login(ip);
			expect(checkLoginRateLimitByIP).not.toHaveBeenCalled();
			expect(checkLoginRateLimitByEmail).not.toHaveBeenCalled();
			expect(signInWithPassword).toHaveBeenCalled();
			expect(res).toMatchObject({ status: 400, data: { error: 'Identifiants invalides.' } });
		}
	);

	it('hors pnpm dev, depuis 127.0.0.1 : le limiteur s’applique', async () => {
		env.dev = false;
		const { res, signInWithPassword } = await login('127.0.0.1');
		expect(checkLoginRateLimitByIP).toHaveBeenCalledWith('127.0.0.1');
		expect(signInWithPassword).not.toHaveBeenCalled();
		expect(res).toMatchObject({ status: 429 });
	});

	it('sous pnpm dev depuis une IP du réseau local : le limiteur s’applique', async () => {
		const { res, signInWithPassword } = await login('192.168.1.20');
		expect(checkLoginRateLimitByIP).toHaveBeenCalledWith('192.168.1.20');
		expect(signInWithPassword).not.toHaveBeenCalled();
		expect(res).toMatchObject({ status: 429 });
	});

	it('sous pnpm dev depuis 127.0.0.1 : une saisie invalide reste refusée sans appeler l’auth', async () => {
		const { res, signInWithPassword } = await login('127.0.0.1', ' - ');
		expect(res).toMatchObject({ status: 400 });
		expect(signInWithPassword).not.toHaveBeenCalled();
	});
});
