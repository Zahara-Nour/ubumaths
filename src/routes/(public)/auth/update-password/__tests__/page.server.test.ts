import { describe, expect, it, vi } from 'vitest';
import { actions } from '../+page.server';

type ActionResult = { status: number; data: { error: string } };

function event({
	user = true,
	password = 'Motdepasse1!',
	confirm = 'Motdepasse1!',
	updateError = null as null | { code?: string; message: string }
} = {}) {
	const form = new FormData();
	form.set('password', password);
	form.set('confirmPassword', confirm);
	return {
		request: new Request('http://localhost/auth/update-password', { method: 'POST', body: form }),
		locals: {
			safeGetSession: vi.fn(async () => ({ user: user ? { email: 'e@x.fr' } : null })),
			supabase: { auth: { updateUser: vi.fn(async () => ({ error: updateError })) } }
		}
	} as never;
}

async function run(opts: Parameters<typeof event>[0]): Promise<ActionResult> {
	return (await actions.updatePassword(event(opts))) as unknown as ActionResult;
}

describe('/auth/update-password — messages en français', () => {
	it('sans session : le lien a expiré', async () => {
		const res = await run({ user: false });
		expect(res.status).toBe(401);
		expect(res.data.error).toMatch(/lien a expiré/);
	});

	it('mots de passe différents', async () => {
		const res = await run({ confirm: 'Autrechose1!' });
		expect(res.data.error).toBe('Les deux mots de passe ne correspondent pas.');
	});

	it('erreur Supabase connue : traduite', async () => {
		const res = await run({
			updateError: {
				code: 'same_password',
				message: 'New password should be different from the old password.'
			}
		});
		expect(res.data.error).toMatch(/différent de l’ancien/);
	});

	it('erreur Supabase inconnue : jamais le message anglais brut', async () => {
		const res = await run({ updateError: { message: 'Database error updating user' } });
		expect(res.data.error).not.toMatch(/Database|error|user/i);
	});
});
