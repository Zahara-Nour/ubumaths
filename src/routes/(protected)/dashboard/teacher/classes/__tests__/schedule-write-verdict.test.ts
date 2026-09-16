/**
 * Les écritures de créneau rendent-elles compte de ce qu'elles ont écrit ?
 * =======================================================================
 *
 * ⚠️ Une opération refusée par la RLS ne rend pas d'erreur : elle rend **zéro
 * ligne**. `if (error) throw` ne peut donc pas se déclencher, et un `.update()`
 * ou `.delete()` sans `.select()` ne sait pas s'il a touché quoi que ce soit.
 *
 * Sans ce contrôle, l'écran annonce « Créneau supprimé avec succès » alors que
 * rien n'a bougé — exactement le mensonge corrigé côté client dans #338, mais
 * venu du serveur cette fois.
 *
 * @module routes/teacher/classes/schedule-write-verdict.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const TEACHER_ID = '550e8400-e29b-41d4-a716-446655440001';
const SCHEDULE_ID = '550e8400-e29b-41d4-a716-446655440010';
const CLASS_ID = '550e8400-e29b-41d4-a716-446655440020';

/**
 * Chaîne Supabase pilotable : chaque maillon se rechaîne, et le résultat final
 * est celui qu'on donne — soit par `.single()`, soit en attendant la chaîne
 * elle-même (ce que fait `.select()` en bout de `.delete()`).
 */
function createChain(finalResult: { data: unknown; error: unknown }) {
	const chain: Record<string, unknown> = {};
	for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'limit']) {
		chain[method] = vi.fn(() => chain);
	}
	chain.single = vi.fn().mockResolvedValue(finalResult);
	chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
	// Rend la chaîne « awaitable » : `await supabase.from(x).delete().eq(…).select()`
	chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(finalResult).then(resolve);
	return chain;
}

/**
 * Un client dont chaque `from(table)` rend la chaîne prévue pour cette table.
 */
function createSupabase(byTable: Record<string, { data: unknown; error: unknown }>) {
	const chains: Record<string, ReturnType<typeof createChain>> = {};
	for (const [table, result] of Object.entries(byTable)) {
		chains[table] = createChain(result);
	}
	return {
		client: { from: vi.fn((table: string) => chains[table]) },
		chains
	};
}

/** `requireRoles` lit le rôle dans `profiles`. */
function teacherLocals(supabase: unknown) {
	return {
		supabase,
		user: { id: TEACHER_ID },
		safeGetSession: vi.fn().mockResolvedValue({
			user: { id: TEACHER_ID },
			session: { access_token: 'token' }
		})
	};
}

function formRequest(fields: Record<string, string>): Request {
	const body = new FormData();
	for (const [k, v] of Object.entries(fields)) body.append(k, v);
	return new Request('http://localhost', { method: 'POST', body });
}

describe('écritures de créneau : le serveur vérifie ce qu’il a écrit', () => {
	beforeEach(() => {
		vi.resetModules();
	});

	// Le cas RLS : la ligne existe (le `.select().single()` de contrôle la voit),
	// mais la suppression n'en touche aucune.
	it('deleteScheduleEntry : zéro ligne supprimée n’est PAS un succès', async () => {
		const { client } = createSupabase({
			profiles: { data: { role: 'teacher' }, error: null },
			class_schedules: { data: [], error: null }
		});
		const { actions } = await import('../+page.server');

		const result = await actions.deleteScheduleEntry({
			request: formRequest({ id: SCHEDULE_ID }),
			locals: teacherLocals(client)
		} as never);

		expect(result).toMatchObject({ status: expect.any(Number) });
		expect(JSON.stringify(result)).not.toMatch(/succès/i);
	});

	it('deleteScheduleEntry : une ligne supprimée est un succès', async () => {
		const { client } = createSupabase({
			profiles: { data: { role: 'teacher' }, error: null },
			class_schedules: { data: [{ id: SCHEDULE_ID }], error: null }
		});
		const { actions } = await import('../+page.server');

		const result = await actions.deleteScheduleEntry({
			request: formRequest({ id: SCHEDULE_ID }),
			locals: teacherLocals(client)
		} as never);

		expect(result).toMatchObject({ success: true });
	});

	it('updateScheduleEntry : zéro ligne modifiée n’est PAS un succès', async () => {
		const { client } = createSupabase({
			profiles: { data: { role: 'teacher' }, error: null },
			class_schedules: { data: [], error: null }
		});
		const { actions } = await import('../+page.server');

		const result = await actions.updateScheduleEntry({
			request: formRequest({
				id: SCHEDULE_ID,
				day_of_week: '5',
				period_number: '1',
				start_time: '08:00',
				end_time: '08:55',
				subject: 'Maths',
				room: '',
				notes: ''
			}),
			locals: teacherLocals(client)
		} as never);

		expect(result).toMatchObject({ status: expect.any(Number) });
		expect(JSON.stringify(result)).not.toMatch(/succès/i);
	});

	it('createScheduleEntry : une ligne insérée est un succès', async () => {
		const { client } = createSupabase({
			profiles: { data: { role: 'teacher' }, error: null },
			classes: { data: { id: CLASS_ID }, error: null },
			class_schedules: { data: [{ id: SCHEDULE_ID }], error: null }
		});
		const { actions } = await import('../+page.server');

		const result = await actions.createScheduleEntry({
			request: formRequest({
				class_id: CLASS_ID,
				day_of_week: '5',
				period_number: '1',
				start_time: '08:00',
				end_time: '08:55',
				subject: 'Maths',
				room: '',
				notes: ''
			}),
			locals: teacherLocals(client)
		} as never);

		expect(result).toMatchObject({ success: true });
	});
});
