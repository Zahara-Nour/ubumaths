/**
 * Page de modération : une lecture en échec se voit-elle ?
 * =======================================================
 *
 * ⚠️ Écart T20 : quand `get_reports_for_moderation` échouait, la page rendait
 * une liste vide, donc « aucun signalement », alors que des signalements
 * d'élèves pouvaient attendre. La page doit dire que la lecture a échoué.
 *
 * @module routes/dashboard/teacher/moderation/gestion/lecture-en-echec.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWriteVerdictSupabase } from '#tests/helpers/write-verdict-supabase.ts';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';

vi.mock('#lib/server/students.ts', () => ({
	getTeacherClassesWithStudents: vi.fn().mockResolvedValue([])
}));

const RPC_FAILURE = { data: null, error: { message: 'lecture refusée' } };

const REPORT = {
	id: '550e8400-e29b-41d4-a716-446655440050',
	reason: 'harassment',
	status: 'pending'
};

type RpcResult = { data: unknown; error: unknown };

async function runLoad(rpc: { reports: RpcResult; count: RpcResult }) {
	const { client } = createWriteVerdictSupabase({
		user_restrictions: { awaited: { data: [], error: null } },
		moderation_logs: { awaited: { data: [], error: null } },
		messages: { awaited: { data: [], error: null } }
	});
	client.rpc.mockImplementation(async (name: string) => {
		if (name === 'get_reports_for_moderation') return rpc.reports;
		if (name === 'get_pending_reports_count') return rpc.count;
		// Messages marqués du prof (écart T21) : hors sujet ici, liste vide.
		if (name === 'get_flagged_messages_for_teacher') return { data: [], error: null };
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
	return result;
}

describe('modération : lecture des signalements', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	it('nominal : signalements et compteur rendus, aucun échec annoncé', async () => {
		const data = await runLoad({
			reports: { data: [REPORT], error: null },
			count: { data: 1, error: null }
		});

		expect(data.reports).toHaveLength(1);
		expect(data.reportsLoadFailed).toBe(false);
		expect(data.pendingReportsCount).toBe(1);
	});

	it('aucun signalement : liste vide, compteur 0, aucun échec annoncé', async () => {
		const data = await runLoad({
			reports: { data: [], error: null },
			count: { data: 0, error: null }
		});

		expect(data.reports).toEqual([]);
		expect(data.reportsLoadFailed).toBe(false);
		expect(data.pendingReportsCount).toBe(0);
	});

	it('lecture des signalements en échec : l’échec est annoncé à la page', async () => {
		const data = await runLoad({ reports: RPC_FAILURE, count: { data: 2, error: null } });

		expect(data.reportsLoadFailed).toBe(true);
		expect(data.reports).toEqual([]);
	});

	it('compteur en échec : il vaut null (inconnu), pas 0', async () => {
		const data = await runLoad({ reports: { data: [REPORT], error: null }, count: RPC_FAILURE });

		expect(data.pendingReportsCount).toBeNull();
		expect(data.reportsLoadFailed).toBe(false);
		expect(data.reports).toHaveLength(1);
	});
});
