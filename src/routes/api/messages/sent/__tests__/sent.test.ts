/**
 * GET /api/messages/sent — les messages envoyés.
 *
 * Avant (écart V105) : la page appelle la route sans paramètre ; le `null` de
 * `searchParams.get('limit')` devenait 0, refusé (400). Derrière, les lignes de
 * get_user_sent_messages étaient validées avec le schéma d'un message reçu (id,
 * sender_name, created_at), qu'elles ne remplissent pas : 500 dès le premier
 * message. Les mocks rendent ici la forme RÉELLE de la RPC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';

const USER = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const MESSAGE = '33333333-3333-4333-8333-333333333333';

vi.mock('#lib/server/middleware/auth.ts', () => ({
	requireAuth: vi.fn(async () => ({ user: { id: USER } }))
}));

const CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Une ligne de get_user_sent_messages, telle que la rend PostgREST. */
function sentRow(overrides: Record<string, unknown> = {}) {
	return {
		message_id: MESSAGE,
		subject: 'Devoir de lundi',
		content: CONTENT,
		plain_text: 'Bonjour',
		sent_at: '2026-10-10T09:15:00.123456+00:00',
		is_group_message: false,
		recipient_count: 1,
		has_attachments: false,
		recipients: [{ id: STUDENT, name: 'Élève Un', avatar_url: null }],
		...overrides
	};
}

type RpcResult = { data: unknown; error: { message: string } | null };

function call(query: string, result: RpcResult) {
	const rpcSpy = vi.fn(async (_name: string, _args: Record<string, unknown>) => result);
	const promise = GET({
		url: new URL(`http://localhost/api/messages/sent${query}`),
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

describe('GET /api/messages/sent', () => {
	it('appel de la page (sans paramètre) : 200 et le message, avec id et destinataires', async () => {
		const { promise, rpcSpy } = call('', { data: [sentRow()], error: null });

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages).toHaveLength(1);
		expect(messages[0]).toMatchObject({
			id: MESSAGE,
			message_id: MESSAGE,
			subject: 'Devoir de lundi',
			content: CONTENT,
			plain_text: 'Bonjour',
			sent_at: '2026-10-10T09:15:00.123456+00:00',
			is_group_message: false,
			recipient_count: 1,
			has_attachments: false,
			recipients: [{ id: STUDENT, name: 'Élève Un', avatar_url: null }]
		});

		expect(rpcSpy).toHaveBeenCalledWith('get_user_sent_messages', {
			p_user_id: USER,
			p_limit: 50,
			p_offset: 0
		});
	});

	it('aucun message envoyé (la RPC rend null) : 200 et aucune ligne', async () => {
		const { promise } = call('', { data: null, error: null });

		const response = await promise;
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ messages: [] });
	});

	it('message sans destinataire restant (recipients nul) et destinataire sans nom : 200', async () => {
		const { promise } = call('', {
			data: [
				sentRow({ recipients: null }),
				sentRow({
					message_id: '44444444-4444-4444-8444-444444444444',
					recipients: [{ id: STUDENT, name: null, avatar_url: null }]
				})
			],
			error: null
		});

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages[0].recipients).toEqual([]);
		expect(messages[1].recipients[0].name).toBe('Destinataire inconnu');
	});

	it('limite et décalage donnés : transmis à la RPC', async () => {
		const { promise, rpcSpy } = call('?limit=10&offset=20', { data: [], error: null });

		expect((await promise).status).toBe(200);
		expect(rpcSpy.mock.calls[0][1]).toMatchObject({ p_limit: 10, p_offset: 20 });
	});

	it.each([
		['limite négative', '?limit=-1'],
		['limite nulle', '?limit=0'],
		['limite au-delà de 100', '?limit=101'],
		['décalage négatif', '?offset=-1'],
		['décalage au-delà de 100 000', '?offset=100001']
	])('%s : 400, la RPC n’est pas appelée', async (_label, query) => {
		const { promise, rpcSpy } = call(query, { data: [], error: null });

		expect(await statusOf(promise)).toBe(400);
		expect(rpcSpy).not.toHaveBeenCalled();
	});

	it('colonnes à défaut rendues nulles par la base : le défaut, pas un 500', async () => {
		const { promise } = call('', {
			data: [sentRow({ is_group_message: null, recipient_count: null })],
			error: null
		});

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages[0]).toMatchObject({ is_group_message: false, recipient_count: 1 });
	});

	it('erreur de la base : 500', async () => {
		const { promise } = call('', { data: null, error: { message: 'boom' } });

		expect(await statusOf(promise)).toBe(500);
	});
});
