/**
 * Copies par élève (lot 5) : la page reçoit les élèves de l'affectation
 * ====================================================================
 *
 * La liste vient de la route de l'affectation (`…/students`), qui la réserve
 * au prof créateur et à l'admin : son refus est celui de la page. Les élèves
 * arrivent dans l'ordre d'impression (nom puis prénom, tri français), chacun
 * une fois. Noms fictifs.
 */
import { describe, expect, it, vi } from 'vitest';
import { load } from '../+page.server';
import { tableMock } from '$lib/server/worksheets/__tests__/table-mock';

const WORKSHEET_ID = '550e8400-e29b-41d4-a716-446655440011';
const ASSIGNMENT_ID = '550e8400-e29b-41d4-a716-446655440010';
const S1 = '550e8400-e29b-41d4-a716-446655440601';
const S2 = '550e8400-e29b-41d4-a716-446655440602';
const S3 = '550e8400-e29b-41d4-a716-446655440603';

function event(response: Response, assignmentId = ASSIGNMENT_ID) {
	const fetch = vi.fn(async () => response);
	return {
		fetch,
		event: {
			params: { id: WORKSHEET_ID, assignmentId },
			locals: { safeGetSession: async () => ({ user: { id: 'prof' } }) },
			fetch
		} as never
	};
}

async function statusOf(run: () => unknown): Promise<number | null> {
	try {
		await run();
		return null;
	} catch (e) {
		return (e as { status?: number }).status ?? null;
	}
}

describe('copies par élève : chargement de la page', () => {
	it('élèves de l’affectation, dans l’ordre d’impression, chacun une fois', async () => {
		const students = [
			{ id: S3, first_name: 'Félix', last_name: 'Fougère', class_name: '3e Lune' },
			{ id: S2, first_name: 'Élise', last_name: 'Écureuil', class_name: null },
			{ id: S1, first_name: 'Ondine', last_name: 'Abricot', class_name: '3e Lune' },
			{ id: S1, first_name: 'Ondine', last_name: 'Abricot', class_name: null }
		];
		const { fetch, event: e } = event(new Response(JSON.stringify({ students })));
		const data = (await load(e)) as {
			students: { id: string }[];
			worksheetId: string;
			assignmentId: string;
		};
		expect(fetch).toHaveBeenCalledWith(`/api/worksheets/assignments/${ASSIGNMENT_ID}/students`);
		expect(data.students.map((s) => s.id)).toEqual([S1, S2, S3]);
		expect(data).toMatchObject({ worksheetId: WORKSHEET_ID, assignmentId: ASSIGNMENT_ID });
	});

	it('refus de la route (un élève, un autre prof) : la page est refusée', async () => {
		expect(await statusOf(() => load(event(new Response('{}', { status: 403 })).event))).toBe(403);
		expect(await statusOf(() => load(event(new Response('{}', { status: 404 })).event))).toBe(404);
		expect(await statusOf(() => load(event(new Response('{}', { status: 500 })).event))).toBe(500);
	});

	it('identifiant d’affectation invalide : 400, sans rien demander', async () => {
		const { fetch, event: e } = event(new Response('{}'), 'pas-un-uuid');
		expect(await statusOf(() => load(e))).toBe(400);
		expect(fetch).not.toHaveBeenCalled();
	});

	it('sans session : 401', async () => {
		const e = {
			params: { id: WORKSHEET_ID, assignmentId: ASSIGNMENT_ID },
			locals: { safeGetSession: async () => ({ user: null }) },
			fetch: vi.fn()
		} as never;
		expect(await statusOf(() => load(e))).toBe(401);
	});

	it('chaque élève porte sa taille du texte ; sans réglage, la normale', async () => {
		const students = [
			{ id: S1, first_name: 'Ondine', last_name: 'Abricot', class_name: '3e Lune' },
			{ id: S2, first_name: 'Élise', last_name: 'Écureuil', class_name: null }
		];
		const fetch = vi.fn(async () => new Response(JSON.stringify({ students })));
		const supabase = tableMock({
			student_print_settings: { data: [{ student_id: S2, text_size: 'x_large' }], error: null }
		}).client;
		const data = (await load({
			params: { id: WORKSHEET_ID, assignmentId: ASSIGNMENT_ID },
			locals: { safeGetSession: async () => ({ user: { id: 'prof' } }), supabase },
			fetch
		} as never)) as { students: { id: string; text_size: string }[] };
		expect(data.students.map((s) => [s.id, s.text_size])).toEqual([
			[S1, 'normal'],
			[S2, 'x_large']
		]);
	});
});
