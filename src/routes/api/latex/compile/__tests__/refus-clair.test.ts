/**
 * POST /api/latex/compile : une formule refusée par la validation rend 400 (L111)
 * ===============================================================================
 *
 * Le refus de la validation était levé dans le `try` et repris par son `catch`,
 * qui le changeait en « erreur serveur 500 ». Il sort tel quel, et le service
 * distant n'est pas appelé.
 *
 * @module routes/api/latex/compile/refus-clair.test
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireAuth: vi.fn().mockResolvedValue({
		user: { id: '550e8400-e29b-41d4-a716-446655440001' },
		profile: { id: '550e8400-e29b-41d4-a716-446655440001', role: 'teacher' }
	})
}));

import { POST } from '../+server';

/** Le statut et le message de ce que la route lève */
async function thrownBy(form: FormData): Promise<{ status: number; message: string }> {
	try {
		await POST({
			locals: {},
			request: new Request('http://localhost/api/latex/compile', { method: 'POST', body: form })
		} as never);
	} catch (err) {
		const { status, body } = err as { status: number; body: { message: string } };
		return { status, message: body.message };
	}
	throw new Error('la route n’a rien levé');
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('POST /api/latex/compile', () => {
	it('formule vide : 400 avec le message de la validation, sans appel au service', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const form = new FormData();
		form.append('latex', '');
		expect(await thrownBy(form)).toEqual({ status: 400, message: 'Code LaTeX requis' });
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('format inconnu : 400', async () => {
		vi.stubGlobal('fetch', vi.fn());
		const form = new FormData();
		form.append('latex', 'x^2');
		form.append('format', 'docx');
		expect((await thrownBy(form)).status).toBe(400);
	});

	it('panne du service : toujours 500', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau coupé')));
		const form = new FormData();
		form.append('latex', 'x^2');
		expect(await thrownBy(form)).toEqual({
			status: 500,
			message: 'Compilation failed: réseau coupé'
		});
	});
});
