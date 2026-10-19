/**
 * POST /api/short-links — le lien court d'une série, pour son QR code. Prof et admin.
 * Phase 0 : docs/wip/liens-courts-phase0.md (comportements 1, 3, 7).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../+server';

const TEACHER = '22222222-2222-4222-8222-222222222222';
const TARGET = '/automaths/panier?categories=%255B%257B%2522a%2522%253A1%257D%255D';

type RpcResult = { data: unknown; error: { code: string; message: string } | null };

function call(
	role: 'student' | 'teacher' | 'admin' | null,
	body: unknown,
	rpcResult: RpcResult = { data: 'Xk7pQ2mZ', error: null }
) {
	const rpc = vi.fn(async () => rpcResult);
	const profileQuery = {
		select: () => profileQuery,
		eq: () => profileQuery,
		single: async () => ({ data: { id: TEACHER, role }, error: null })
	};
	const request = new Request('http://localhost/api/short-links', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
	const promise = POST({
		request,
		locals: {
			supabase: { rpc, from: () => profileQuery },
			safeGetSession: async () =>
				role === null ? { user: null, session: null } : { user: { id: TEACHER }, session: {} }
		}
	} as never);
	return { promise, rpc };
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/short-links', () => {
	it('prof : le code et le chemin court, la cible transmise telle quelle', async () => {
		const { promise, rpc } = call('teacher', { target: TARGET });
		const response = await promise;
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ code: 'Xk7pQ2mZ', path: '/l/Xk7pQ2mZ' });
		expect(rpc).toHaveBeenCalledWith('create_short_link', { p_target: TARGET });
	});

	it('admin : autorisé', async () => {
		const { promise } = call('admin', { target: TARGET });
		expect((await promise).status).toBe(200);
	});

	it('élève : 403, la base n’est pas appelée', async () => {
		const { promise, rpc } = call('student', { target: TARGET });
		await expect(promise).rejects.toMatchObject({ status: 403 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it('anonyme : 401, la base n’est pas appelée', async () => {
		const { promise, rpc } = call(null, { target: TARGET });
		await expect(promise).rejects.toMatchObject({ status: 401 });
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['un autre site', 'https://piege.example/x'],
		['un autre site sans schéma', '//piege.example/x'],
		['une barre oblique inverse', '/\\piege.example/x'],
		['une espace', '/automaths/panier?a b'],
		['un retour à la ligne', '/x\r\nSet-Cookie: a=b'],
		['de l’Unicode', '/∕piege.example'],
		['un chemin relatif', 'automaths/panier'],
		['une chaîne vide', '']
	])('cible avec %s : 400 en français, rien d’enregistré', async (_cas, target) => {
		const { promise, rpc } = call('teacher', { target });
		const response = await promise;
		expect(response.status).toBe(400);
		expect((await response.json()).error).toBe('Un lien court mène à une adresse du site');
		expect(rpc).not.toHaveBeenCalled();
	});

	it.each([
		['la connexion', '/auth/login?redirectTo=/x'],
		['le glossaire', '/glossaire'],
		['le panier sans requête', '/automaths/panier'],
		['un chemin qui ressort du panier', '/automaths/panier/../auth/logout?x'],
		['un faux panier', '/automaths/paniers?categories=x']
	])(
		'cible interne qui n’est pas une série (%s) : 400, rien d’enregistré',
		async (_cas, target) => {
			const { promise, rpc } = call('teacher', { target });
			const response = await promise;
			expect(response.status).toBe(400);
			expect((await response.json()).error).toBe('Un lien court mène seulement à une série');
			expect(rpc).not.toHaveBeenCalled();
		}
	);

	it('série lancée sous une forme (/automaths/test) : acceptée', async () => {
		const target = '/automaths/test?categories=%255B%255D&mode=course&time=300';
		const { promise, rpc } = call('teacher', { target });
		expect((await promise).status).toBe(200);
		expect(rpc).toHaveBeenCalledWith('create_short_link', { p_target: target });
	});

	it('cible de plus de 16 384 caractères : 400', async () => {
		const { promise, rpc } = call('teacher', {
			target: `/automaths/panier?categories=${'a'.repeat(16384)}`
		});
		expect((await promise).status).toBe(400);
		expect(rpc).not.toHaveBeenCalled();
	});

	it('champ en trop ou cible absente : 400', async () => {
		expect((await call('teacher', { target: TARGET, code: 'Xk7pQ2mZ' }).promise).status).toBe(400);
		expect((await call('teacher', {}).promise).status).toBe(400);
	});

	it('corps illisible : 400', async () => {
		expect((await call('teacher', '{oups').promise).status).toBe(400);
	});

	it('refus de la base (22023) : 400', async () => {
		const { promise } = call(
			'teacher',
			{ target: TARGET },
			{ data: null, error: { code: '22023', message: 'cible' } }
		);
		expect((await promise).status).toBe(400);
	});

	it('panne de la base : 500 sans le message brut', async () => {
		const { promise } = call(
			'teacher',
			{ target: TARGET },
			{ data: null, error: { code: 'P0001', message: 'détail interne' } }
		);
		const response = await promise;
		expect(response.status).toBe(500);
		expect((await response.json()).error).toBe('Lien court impossible à créer');
	});
});
