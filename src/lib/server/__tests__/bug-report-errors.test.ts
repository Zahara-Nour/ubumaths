/**
 * Erreurs récentes d'un signalement : lues par l'admin, au moment de la lecture.
 * ============================================================================
 *
 * À la création, la route lisait `error_logs` avec le client de l'auteur : la
 * RLS réserve cette table à l'admin, la lecture rendait zéro ligne sans erreur,
 * et aucun signalement d'élève n'a jamais porté d'erreur. Décision du
 * 2026-10-13 : ces erreurs ne sont lisibles que par l'admin. Elles ne sont donc
 * plus copiées dans le signalement (que son auteur peut relire), mais jointes
 * quand l'admin le lit : celles de l'auteur, dans les 5 minutes qui précèdent.
 *
 * @module lib/server/bug-report-errors.test
 */

import { describe, it, expect, vi } from 'vitest';
import type { Json } from '$lib/types/database';
import { attachReportErrors } from '../bug-report-errors';

const ELEVE = '550e8400-e29b-41d4-a716-446655440001';
const AUTRE = '550e8400-e29b-41d4-a716-446655440002';
const CREATED = '2026-10-13T10:00:00.000Z';

function logRow(over: Record<string, unknown>) {
	return {
		id: 'e1',
		user_id: ELEVE,
		error_type: 'javascript',
		message: 'x is undefined',
		severity: 'error',
		created_at: '2026-10-13T09:58:00.000Z',
		url: '/exercices',
		file_path: 'src/lib/a.ts',
		line_number: 12,
		stack_trace: 'at a.ts:12',
		response_time: null,
		status_code: null,
		...over
	};
}

function fakeClient(rows: unknown[], error: unknown = null) {
	const chain: Record<string, unknown> = {};
	for (const m of ['select', 'in', 'gte', 'lte', 'order', 'limit']) chain[m] = vi.fn(() => chain);
	chain.then = (resolve: (v: unknown) => unknown) =>
		Promise.resolve({ data: rows, error }).then(resolve);
	return { client: { from: vi.fn(() => chain) }, chain };
}

function report(over: Record<string, unknown> = {}) {
	return {
		id: 'r1',
		user_id: ELEVE,
		created_at: CREATED,
		session_context: { capturedAt: CREATED } as Json | null,
		...over
	};
}

describe('attachReportErrors', () => {
	it('joint les erreurs de l’auteur des 5 minutes qui précèdent, et seulement elles', async () => {
		const { client } = fakeClient([
			logRow({ id: 'dans-la-fenetre' }),
			logRow({ id: 'trop-ancienne', created_at: '2026-10-13T09:54:59.000Z' }),
			logRow({ id: 'apres', created_at: '2026-10-13T10:00:01.000Z' }),
			logRow({ id: 'autre-eleve', user_id: AUTRE })
		]);
		const r = report();
		await attachReportErrors(client as never, [r]);

		const ctx = r.session_context as unknown as { recentErrors: { id: string }[] };
		expect(ctx.recentErrors.map((e) => e.id)).toEqual(['dans-la-fenetre']);
	});

	it('range les requêtes lentes à part, pas parmi les erreurs', async () => {
		const { client } = fakeClient([
			logRow({ id: 'lente', error_type: 'performance', response_time: 4200, status_code: 200 })
		]);
		const r = report();
		await attachReportErrors(client as never, [r]);

		expect(r.session_context).toMatchObject({
			recentErrors: [],
			slowRequests: [{ url: '/exercices', duration: 4200, status: 200 }]
		});
	});

	it('remplace des erreurs déjà présentes dans le contexte (copie ancienne ou envoyée par le client)', async () => {
		const { client } = fakeClient([]);
		const r = report({
			session_context: { recentErrors: [{ id: 'fabriquee' }], slowRequests: [{ url: '/x' }] }
		});
		await attachReportErrors(client as never, [r]);

		expect(r.session_context).toMatchObject({ recentErrors: [], slowRequests: [] });
	});

	it('une seule lecture pour toute la liste', async () => {
		const { client, chain } = fakeClient([]);
		await attachReportErrors(client as never, [report(), report({ id: 'r2', user_id: AUTRE })]);

		expect(client.from).toHaveBeenCalledTimes(1);
		expect(client.from).toHaveBeenCalledWith('error_logs');
		expect(chain.in).toHaveBeenCalledWith('user_id', [ELEVE, AUTRE]);
	});

	it('lecture en panne : le contexte reste sans erreurs, rien ne casse', async () => {
		const { client } = fakeClient([], { code: '57014', message: 'timeout' });
		const r = report();
		await attachReportErrors(client as never, [r]);

		expect(r.session_context).toEqual({ capturedAt: CREATED });
	});

	it('liste vide : aucune lecture', async () => {
		const { client } = fakeClient([]);
		await attachReportErrors(client as never, []);
		expect(client.from).not.toHaveBeenCalled();
	});
});
