/**
 * Page de modération : les messages marqués automatiquement arrivent-ils chez le prof ?
 * ===================================================================================
 *
 * ⚠️ Écart T21 : un message marqué par le filtre de gros mots (`is_flagged`)
 * n'apparaissait sur aucun écran de modération.
 *
 * - Prof : la page appelle `get_flagged_messages_for_teacher` (décision de David,
 *   2026-11-25 : conversations à deux entre élèves et messages supprimés compris).
 *   Ce que la fonction rend vraiment est prouvé en base par
 *   `tests/integration/messages-marques-prof.test.ts` ; ici, seulement ce que la
 *   page en fait.
 * - Admin : accès inchangés, lecture de `messages` avec son client (RLS).
 *
 * @module routes/dashboard/teacher/moderation/gestion/messages-marques.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	createWriteVerdictSupabase,
	type FakeResult
} from '#tests/helpers/write-verdict-supabase.ts';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';

vi.mock('#lib/server/students.ts', () => ({
	getTeacherClassesWithStudents: vi.fn().mockResolvedValue([])
}));

const RPC_ROW = {
	id: '550e8400-e29b-41d4-a716-446655440060',
	conversation_id: '550e8400-e29b-41d4-a716-446655440061',
	plain_text: 'un message grossier',
	flag_reason: 'Profanité détectée automatiquement',
	created_at: '2026-11-20T10:00:00.000Z',
	deleted_at: null as string | null,
	deleted_by_moderation: false,
	sender_firstname: 'Camille' as string | null,
	sender_lastname: 'Exemple' as string | null,
	conversation_name: 'Groupe fictif' as string | null,
	is_group: true
};

const TABLE_ROW = {
	id: RPC_ROW.id,
	conversation_id: RPC_ROW.conversation_id,
	plain_text: 'un message grossier',
	flag_reason: 'Profanité détectée automatiquement',
	created_at: RPC_ROW.created_at,
	sender: { firstname: 'Camille', lastname: 'Exemple' },
	conversation: { name: 'Groupe fictif', is_group: true }
};

const RENDU = {
	id: RPC_ROW.id,
	conversationId: RPC_ROW.conversation_id,
	text: 'un message grossier',
	reason: 'Profanité détectée automatiquement',
	createdAt: RPC_ROW.created_at,
	senderName: 'Camille Exemple',
	conversationName: 'Groupe fictif',
	isGroup: true,
	deletedBy: null
};

/** `flagged` : ce que rend la fonction (prof) ou la lecture de `messages` (admin). */
async function runLoad(role: 'teacher' | 'admin', flagged: FakeResult) {
	const { client, chains } = createWriteVerdictSupabase({
		user_restrictions: { awaited: { data: [], error: null } },
		moderation_logs: { awaited: { data: [], error: null } },
		// Le prof ne lit jamais `messages` directement : une lecture rendrait une erreur.
		messages: {
			awaited: role === 'admin' ? flagged : { data: null, error: { message: 'inattendue' } }
		}
	});
	client.rpc.mockImplementation(async (name: string) => {
		if (name === 'get_reports_for_moderation') return { data: [], error: null };
		if (name === 'get_pending_reports_count') return { data: 0, error: null };
		if (name === 'get_flagged_messages_for_teacher' && role === 'teacher') return flagged;
		throw new Error(`RPC inattendue dans le test : ${name}`);
	});

	const { load } = await import('../+page.server');
	const result = await load({
		locals: {
			supabase: client,
			user: { id: TEACHER_ID },
			profile: { id: TEACHER_ID, role }
		}
	} as never);
	if (!result) throw new Error('load n’a rien rendu');
	return { data: result, chains, rpc: client.rpc };
}

describe('modération : messages marqués automatiquement', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('prof : fonction réservée', () => {
		it('nominal : le message marqué est rendu avec son auteur et sa conversation', async () => {
			const { data, rpc, chains } = await runLoad('teacher', { data: [RPC_ROW], error: null });

			expect(data.flaggedMessagesLoadFailed).toBe(false);
			expect(data.flaggedMessagesExtended).toBe(true);
			expect(data.flaggedMessages).toEqual([RENDU]);
			expect(rpc).toHaveBeenCalledWith('get_flagged_messages_for_teacher', { p_limit: 100 });
			// Le prof ne lit pas `messages` directement.
			expect(chains.messages?.select).not.toHaveBeenCalled();
		});

		it('conversation à deux entre élèves : ni nom de conversation, ni groupe', async () => {
			const { data } = await runLoad('teacher', {
				data: [{ ...RPC_ROW, conversation_name: null, is_group: false }],
				error: null
			});

			expect(data.flaggedMessages[0]).toMatchObject({ conversationName: null, isGroup: false });
		});

		it('message supprimé sans trace de modération : dit « untraced »', async () => {
			const { data } = await runLoad('teacher', {
				data: [{ ...RPC_ROW, deleted_at: '2026-11-21T08:00:00.000Z' }],
				error: null
			});

			expect(data.flaggedMessages[0]).toMatchObject({
				text: 'un message grossier',
				deletedBy: 'untraced'
			});
		});

		it('message supprimé par la modération : dit « moderation »', async () => {
			const { data } = await runLoad('teacher', {
				data: [{ ...RPC_ROW, deleted_at: '2026-11-21T08:00:00.000Z', deleted_by_moderation: true }],
				error: null
			});

			expect(data.flaggedMessages[0]).toMatchObject({ deletedBy: 'moderation' });
		});

		it('auteur supprimé, texte absent : la ligne reste, sans nom', async () => {
			const { data } = await runLoad('teacher', {
				data: [{ ...RPC_ROW, sender_firstname: null, sender_lastname: null, plain_text: null }],
				error: null
			});

			expect(data.flaggedMessages).toHaveLength(1);
			expect(data.flaggedMessages[0]).toMatchObject({ senderName: null, text: '' });
		});

		it('aucun message marqué : liste vide, aucun échec annoncé', async () => {
			const { data } = await runLoad('teacher', { data: [], error: null });

			expect(data.flaggedMessages).toEqual([]);
			expect(data.flaggedMessagesLoadFailed).toBe(false);
		});

		it('fonction en échec : l’échec est annoncé, jamais « aucun message »', async () => {
			const { data } = await runLoad('teacher', {
				data: null,
				error: { message: 'lecture refusée' }
			});

			expect(data.flaggedMessagesLoadFailed).toBe(true);
			expect(data.flaggedMessages).toEqual([]);
		});
	});

	describe('admin : accès inchangés (lecture de `messages` par la RLS)', () => {
		it('nominal : lit `messages`, sans appeler la fonction du prof', async () => {
			const { data, rpc, chains } = await runLoad('admin', { data: [TABLE_ROW], error: null });

			expect(data.flaggedMessagesExtended).toBe(false);
			expect(data.flaggedMessages).toEqual([RENDU]);
			expect(chains.messages?.eq).toHaveBeenCalledWith('is_flagged', true);
			expect(rpc).not.toHaveBeenCalledWith('get_flagged_messages_for_teacher', expect.anything());
		});

		it('auteur ou conversation masqués : la ligne reste, sans nom', async () => {
			const { data } = await runLoad('admin', {
				data: [{ ...TABLE_ROW, sender: null, conversation: null, plain_text: null }],
				error: null
			});

			expect(data.flaggedMessages).toHaveLength(1);
			expect(data.flaggedMessages[0]).toMatchObject({
				senderName: null,
				conversationName: null,
				isGroup: null,
				text: ''
			});
		});

		it('lecture en échec : l’échec est annoncé, jamais « aucun message »', async () => {
			const { data } = await runLoad('admin', { data: null, error: { message: 'refusée' } });

			expect(data.flaggedMessagesLoadFailed).toBe(true);
			expect(data.flaggedMessages).toEqual([]);
		});
	});
});
