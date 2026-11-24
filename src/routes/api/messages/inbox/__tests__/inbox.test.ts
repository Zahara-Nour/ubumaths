/**
 * GET /api/messages/inbox — la boîte de réception (et les archives).
 *
 * Avant (écart V104) : la page appelle `?status=inbox` sans dossier, ni limite,
 * ni décalage ; la route passait les `null` de `searchParams.get` au schéma, qui
 * les refusait (400). Derrière, les lignes de get_user_inbox étaient validées
 * avec un schéma qu'elles ne remplissent pas (id, sender_email, created_at) :
 * 500 dès le premier message. Les mocks rendent ici la forme RÉELLE de la RPC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';

const USER = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const MESSAGE = '33333333-3333-4333-8333-333333333333';
const FOLDER = '55555555-5555-4555-8555-555555555555';

vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireAuth: vi.fn(async () => ({ user: { id: USER } }))
}));

const CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Une ligne de get_user_inbox, telle que la rend PostgREST. */
function inboxRow(overrides: Record<string, unknown> = {}) {
	return {
		message_id: MESSAGE,
		sender_id: TEACHER,
		sender_name: 'M. Prof',
		sender_avatar_url: null,
		subject: 'Devoir de lundi',
		content: CONTENT,
		plain_text: 'Bonjour',
		sent_at: '2026-10-10T09:15:00.123456+00:00',
		read_at: null,
		is_starred: false,
		status: 'inbox',
		is_group_message: false,
		recipient_count: 1,
		has_attachments: false,
		attachment_count: 0,
		...overrides
	};
}

type RpcResult = { data: unknown; error: { message: string } | null };

function call(query: string, result: RpcResult) {
	const rpcSpy = vi.fn(async (_name: string, _args: Record<string, unknown>) => result);
	const promise = GET({
		url: new URL(`http://localhost/api/messages/inbox${query}`),
		locals: { supabase: { rpc: rpcSpy } }
	} as never);
	return { promise, rpcSpy };
}

/** Le statut d'une erreur levée par `error()` de SvelteKit. */
async function statusOf(promise: Response | Promise<Response>): Promise<number> {
	try {
		return (await promise).status;
	} catch (err) {
		if (err && typeof err === 'object' && 'status' in err && typeof err.status === 'number')
			return err.status;
		throw err;
	}
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/messages/inbox', () => {
	it('appel de la page (`?status=inbox` seul) : 200 et le message, avec id et sans adresse', async () => {
		const { promise, rpcSpy } = call('?status=inbox', { data: [inboxRow()], error: null });

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			id: MESSAGE,
			message_id: MESSAGE,
			sender_id: TEACHER,
			sender_name: 'M. Prof',
			sender_avatar_url: null,
			subject: 'Devoir de lundi',
			content: CONTENT,
			plain_text: 'Bonjour',
			sent_at: '2026-10-10T09:15:00.123456+00:00',
			read_at: null,
			is_starred: false,
			status: 'inbox',
			is_group_message: false,
			recipient_count: 1,
			has_attachments: false,
			attachment_count: 0
		});
		expect(messages[0]).not.toHaveProperty('sender_email');

		// Défauts : 50 messages, depuis le premier, tous dossiers, pour soi seulement
		expect(rpcSpy).toHaveBeenCalledWith('get_user_inbox', {
			p_user_id: USER,
			p_status: 'inbox',
			p_folder_id: undefined,
			p_limit: 50,
			p_offset: 0
		});
	});

	it('archives (`?status=archived`) : 200', async () => {
		const { promise, rpcSpy } = call('?status=archived', {
			data: [inboxRow({ status: 'archived', read_at: '2026-10-11T08:00:00+00:00' })],
			error: null
		});

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages[0]).toMatchObject({ status: 'archived', read_at: '2026-10-11T08:00:00+00:00' });
		expect(rpcSpy.mock.calls[0][1]).toMatchObject({ p_status: 'archived' });
	});

	it('sans aucun paramètre : boîte de réception par défaut', async () => {
		const { promise, rpcSpy } = call('', { data: [], error: null });

		const response = await promise;
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [] });
		expect(rpcSpy.mock.calls[0][1]).toMatchObject({ p_status: 'inbox', p_limit: 50, p_offset: 0 });
	});

	it('boîte vide (la RPC rend null) : 200 et aucune ligne', async () => {
		const { promise } = call('?status=inbox', { data: null, error: null });

		const response = await promise;
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [] });
	});

	it('expéditeur sans nom : un libellé, pas une ligne refusée', async () => {
		const { promise } = call('?status=inbox', {
			data: [inboxRow({ sender_name: null })],
			error: null
		});

		const { messages } = await (await promise).json();
		expect(messages[0].sender_name).toBe('Expéditeur inconnu');
	});

	it('dossier, limite et décalage donnés : transmis à la RPC', async () => {
		const { promise, rpcSpy } = call(`?status=inbox&folderId=${FOLDER}&limit=10&offset=20`, {
			data: [],
			error: null
		});

		expect((await promise).status).toBe(200);
		expect(rpcSpy.mock.calls[0][1]).toMatchObject({
			p_folder_id: FOLDER,
			p_limit: 10,
			p_offset: 20
		});
	});

	it.each([
		['dossier qui n’est pas un identifiant', '?folderId=abc'],
		['limite négative', '?limit=-1'],
		['limite nulle', '?limit=0'],
		['limite au-delà de 100', '?limit=101'],
		['décalage négatif', '?offset=-1'],
		['décalage au-delà de 100 000', '?offset=100001'],
		['statut inconnu', '?status=tout']
	])('%s : 400, la RPC n’est pas appelée', async (_label, query) => {
		const { promise, rpcSpy } = call(query, { data: [], error: null });

		expect(await statusOf(promise)).toBe(400);
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it('colonnes à défaut rendues nulles par la base : le défaut, pas un 500', async () => {
		const { promise } = call('?status=inbox', {
			data: [inboxRow({ is_starred: null, is_group_message: null, recipient_count: null })],
			error: null
		});

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages[0]).toMatchObject({
			is_starred: false,
			is_group_message: false,
			recipient_count: 1
		});
	});

	it('erreur de la base : 500', async () => {
		const { promise } = call('?status=inbox', { data: null, error: { message: 'boom' } });

		expect(await statusOf(promise)).toBe(500);
	});
});
