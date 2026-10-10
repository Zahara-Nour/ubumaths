/**
 * GET /api/messages/thread — le fil de discussion d'un message.
 *
 * Avant : la route validait les lignes de get_message_thread avec le schéma d'un
 * message de boîte de réception (id, sender_email, is_group_message,
 * created_at…), que la RPC ne rend pas : tout fil non vide partait en 500
 * « Invalid response format ». Les mocks rendent ici la forme RÉELLE des RPC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../+server';

const USER = '11111111-1111-4111-8111-111111111111';
const TEACHER = '22222222-2222-4222-8222-222222222222';
const ROOT = '33333333-3333-4333-8333-333333333333';
const REPLY = '44444444-4444-4444-8444-444444444444';

vi.mock('$lib/server/middleware/auth', () => ({
	requireAuth: vi.fn(async () => ({ user: { id: USER } }))
}));

const CONTENT = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Une ligne de get_message_thread, telle que la rend PostgREST. */
function threadRow(id: string, senderId: string, level: number) {
	return {
		message_id: id,
		sender_id: senderId,
		sender_name: senderId === TEACHER ? 'M. Prof' : 'Élève',
		sender_avatar_url: null,
		subject: 'Question',
		content: CONTENT,
		sent_at: '2026-10-10T09:15:00.123456+00:00',
		edited_at: null,
		parent_message_id: level === 0 ? null : ROOT,
		level
	};
}

/** Une ligne de get_message_details (rôle et pièces jointes en plus). */
function detailsRow(id: string, senderId: string) {
	return {
		...threadRow(id, senderId, 0),
		sender_role: senderId === TEACHER ? 'teacher' : 'student',
		plain_text: 'Bonjour',
		is_group_message: false,
		recipient_count: 1,
		thread_root_id: id === ROOT ? null : ROOT,
		read_at: null,
		is_starred: false,
		status: 'read',
		attachments: id === REPLY ? [{ id: 'pj', file_name: 'figure.png' }] : null,
		recipients: null
	};
}

type RpcResult = { data: unknown; error: { message: string } | null };

function call(rpc: (name: string, args: Record<string, string>) => RpcResult) {
	const rpcSpy = vi.fn(async (name: string, args: Record<string, string>) => rpc(name, args));
	const promise = GET({
		url: new URL(`http://localhost/api/messages/thread?rootId=${ROOT}`),
		locals: { supabase: { rpc: rpcSpy } }
	} as never);
	return { promise, rpcSpy };
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GET /api/messages/thread', () => {
	it('fil de deux messages : 200, chaque message avec id, rôle de l’expéditeur et pièces jointes', async () => {
		const { promise } = call((name, args) => {
			if (name === 'get_message_thread')
				return { data: [threadRow(ROOT, TEACHER, 0), threadRow(REPLY, USER, 1)], error: null };
			const id = args.p_message_id;
			return { data: [detailsRow(id, id === ROOT ? TEACHER : USER)], error: null };
		});

		const response = await promise;
		expect(response.status).toBe(200);
		const { messages } = await response.json();
		expect(messages).toHaveLength(2);
		// L'ordre du fil (racine puis réponses) est celui de get_message_thread
		expect(messages[0]).toMatchObject({
			id: ROOT,
			sender_id: TEACHER,
			sender_role: 'teacher',
			subject: 'Question',
			content: CONTENT,
			sent_at: '2026-10-10T09:15:00.123456+00:00',
			level: 0,
			attachments: null
		});
		expect(messages[1]).toMatchObject({
			id: REPLY,
			sender_role: 'student',
			parent_message_id: ROOT,
			level: 1,
			attachments: [{ id: 'pj', file_name: 'figure.png' }]
		});
	});

	it('détails demandés pour l’utilisateur connecté, message par message', async () => {
		const { promise, rpcSpy } = call((name, args) => {
			if (name === 'get_message_thread')
				return { data: [threadRow(ROOT, TEACHER, 0)], error: null };
			return { data: [detailsRow(args.p_message_id, TEACHER)], error: null };
		});
		await promise;
		expect(rpcSpy).toHaveBeenCalledWith('get_message_thread', {
			p_thread_root_id: ROOT,
			p_user_id: USER
		});
		expect(rpcSpy).toHaveBeenCalledWith('get_message_details', {
			p_message_id: ROOT,
			p_user_id: USER
		});
	});

	it('fil vide : 200 et aucune requête de détails', async () => {
		const { promise, rpcSpy } = call(() => ({ data: [], error: null }));
		const response = await promise;
		expect(response.status).toBe(200);
		expect((await response.json()).messages).toEqual([]);
		expect(rpcSpy).toHaveBeenCalledTimes(1);
	});

	it('pas d’accès au fil : 403', async () => {
		const { promise } = call(() => ({
			data: null,
			error: { message: 'You do not have access to this message thread' }
		}));
		await expect(promise).rejects.toMatchObject({ status: 403 });
	});

	it('détails d’un message refusés : 500, jamais un fil partiel', async () => {
		const { promise } = call((name) =>
			name === 'get_message_thread'
				? { data: [threadRow(ROOT, TEACHER, 0)], error: null }
				: { data: null, error: { message: 'You do not have access to this message' } }
		);
		await expect(promise).rejects.toMatchObject({ status: 500 });
	});
});
