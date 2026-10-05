import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/rateLimiter', () => ({
	checkPasswordResetRateLimitByIP: vi.fn(async () => ({ allowed: true })),
	checkPasswordResetRateLimitByEmail: vi.fn(async () => ({ allowed: true }))
}));

const { actions } = await import('../+page.server');

describe('/auth/reset-password — message en français', () => {
	it('confirme l’envoi en français, sans dire si le compte existe', async () => {
		const form = new FormData();
		form.set('email', 'eleve@exemple.fr');
		const res = (await actions.resetPassword({
			request: new Request('http://localhost/auth/reset-password', { method: 'POST', body: form }),
			url: new URL('http://localhost/auth/reset-password'),
			getClientAddress: () => '127.0.0.1',
			locals: {
				supabase: { auth: { resetPasswordForEmail: vi.fn(async () => ({ error: null })) } }
			}
		} as never)) as { message: string };
		expect(res.message).toBe(
			'Si un compte existe avec cette adresse, tu vas recevoir un lien pour choisir un nouveau mot de passe.'
		);
	});
});
