/**
 * Page de modération : les messages marqués automatiquement arrivent-ils chez le prof ?
 * ===================================================================================
 *
 * ⚠️ Écart T21 : un message marqué par le filtre de gros mots (`is_flagged`)
 * n'apparaissait sur aucun écran de modération. La page les liste, lus avec le
 * client du prof : la RLS de `messages` borne la liste aux conversations qu'il
 * peut déjà ouvrir (aucun accès nouveau).
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

const FLAGGED = {
	id: '550e8400-e29b-41d4-a716-446655440060',
	conversation_id: '550e8400-e29b-41d4-a716-446655440061',
	plain_text: 'un message grossier',
	flag_reason: 'Profanité détectée automatiquement',
	created_at: '2026-11-20T10:00:00.000Z',
	sender: { firstname: 'Camille', lastname: 'Exemple' },
	conversation: { name: 'Groupe fictif', is_group: true }
};

async function runLoad(messages: FakeResult) {
	const { client, chains } = createWriteVerdictSupabase({
		user_restrictions: { awaited: { data: [], error: null } },
		moderation_logs: { awaited: { data: [], error: null } },
		messages: { awaited: messages }
	});
	client.rpc.mockImplementation(async (name: string) => {
		if (name === 'get_reports_for_moderation') return { data: [], error: null };
		if (name === 'get_pending_reports_count') return { data: 0, error: null };
		throw new Error(`RPC inattendue dans le test : ${name}`);
	});

	const { load } = await import('../+page.server');
	const result = await load({
		locals: {
			supabase: client,
			user: { id: TEACHER_ID },
			profile: { id: TEACHER_ID, role: 'teacher' }
		}
	} as never);
	if (!result) throw new Error('load n’a rien rendu');
	return { data: result, chains };
}

describe('modération : messages marqués automatiquement', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('nominal : le message marqué est rendu avec son auteur et sa conversation', async () => {
		const { data, chains } = await runLoad({ data: [FLAGGED], error: null });

		expect(data.flaggedMessagesLoadFailed).toBe(false);
		expect(data.flaggedMessages).toEqual([
			{
				id: FLAGGED.id,
				conversationId: FLAGGED.conversation_id,
				text: 'un message grossier',
				reason: 'Profanité détectée automatiquement',
				createdAt: FLAGGED.created_at,
				senderName: 'Camille Exemple',
				conversationName: 'Groupe fictif',
				isGroup: true
			}
		]);
		// Seuls les messages marqués sont demandés.
		expect(chains.messages?.eq).toHaveBeenCalledWith('is_flagged', true);
	});

	it('auteur ou conversation masqués : la ligne reste, sans nom', async () => {
		const { data } = await runLoad({
			data: [{ ...FLAGGED, sender: null, conversation: null, plain_text: null }],
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

	it('aucun message marqué : liste vide, aucun échec annoncé', async () => {
		const { data } = await runLoad({ data: [], error: null });

		expect(data.flaggedMessages).toEqual([]);
		expect(data.flaggedMessagesLoadFailed).toBe(false);
	});

	it('lecture en échec : l’échec est annoncé, jamais « aucun message »', async () => {
		const { data } = await runLoad({ data: null, error: { message: 'lecture refusée' } });

		expect(data.flaggedMessagesLoadFailed).toBe(true);
		expect(data.flaggedMessages).toEqual([]);
	});
});
