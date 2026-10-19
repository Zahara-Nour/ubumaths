/**
 * /l/<code> — redirige vers la cible du lien court, ou 404.
 * Phase 0 : docs/wip/liens-courts-phase0.md (comportements 2 et 6).
 */
import { describe, it, expect, vi } from 'vitest';
import { load } from '../+page.server';

const TARGET = '/automaths/test?categories=%255B%255D&mode=course&time=300';

function call(code: string, resolved: unknown) {
	const rpc = vi.fn(async () => ({ data: resolved, error: null }));
	const setHeaders = vi.fn();
	const promise = load({
		params: { code },
		locals: { supabase: { rpc } },
		setHeaders
	} as never);
	return { promise, rpc, setHeaders };
}

describe('/l/[code]', () => {
	it('code connu : redirection 302 vers la cible, non indexée', async () => {
		const { promise, rpc, setHeaders } = call('Xk7pQ2mZ', TARGET);
		await expect(promise).rejects.toMatchObject({ status: 302, location: TARGET });
		expect(rpc).toHaveBeenCalledWith('resolve_short_link', { p_code: 'Xk7pQ2mZ' });
		expect(setHeaders).toHaveBeenCalledWith({ 'X-Robots-Tag': 'noindex' });
	});

	it('code inconnu : 404 « Ce lien n’existe pas »', async () => {
		const { promise } = call('Xk7pQ2mZ', null);
		await expect(promise).rejects.toMatchObject({
			status: 404,
			body: { message: 'Ce lien n’existe pas' }
		});
	});

	it.each(['Xk7pQ2m', 'Xk7pQ2mZa', 'Xk7pQ2m0', 'Xk7pQ2ml', "Xk7pQ2m'", ''])(
		'code mal formé « %s » : la même 404, sans demander à la base',
		async (code) => {
			const { promise, rpc } = call(code, TARGET);
			await expect(promise).rejects.toMatchObject({
				status: 404,
				body: { message: 'Ce lien n’existe pas' }
			});
			expect(rpc).not.toHaveBeenCalled();
		}
	);

	it.each([
		'https://piege.example',
		'//piege.example',
		'/\\piege.example',
		'/auth/login?redirectTo=/x'
	])('cible relue hors du site (« %s ») : 404, jamais de redirection', async (target) => {
		const { promise } = call('Xk7pQ2mZ', target);
		await expect(promise).rejects.toMatchObject({ status: 404 });
	});
});
