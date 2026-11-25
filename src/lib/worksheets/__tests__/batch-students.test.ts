import { describe, it, expect, vi } from 'vitest';
import { fetchBatchStudents } from '../batch-students';

const A1 = '11111111-1111-4111-8111-111111111111';
const A2 = '22222222-2222-4222-8222-222222222222';
const ZOE = '33333333-3333-4333-8333-333333333333';
const ADAM = '44444444-4444-4444-8444-444444444444';
const EMMA = '55555555-5555-4555-8555-555555555555';

function student(id: string, first: string, last: string, className: string | null = '6e A') {
	return { id, first_name: first, last_name: last, class_id: null, class_name: className };
}

function fetcherFor(lists: Record<string, unknown>): typeof fetch {
	return vi.fn(async (input: RequestInfo | URL) => {
		const url = String(input);
		const id = Object.keys(lists).find((key) => url.includes(key));
		if (id === undefined) return new Response('{}', { status: 404 });
		return new Response(JSON.stringify(lists[id]), { status: 200 });
	}) as unknown as typeof fetch;
}

describe('fetchBatchStudents — les élèves de l’onglet « Lot »', () => {
	it('aucune affectation : aucun élève, aucune demande', async () => {
		const fetcher = fetcherFor({});
		expect(await fetchBatchStudents(fetcher, [])).toEqual({ students: [], failedAssignments: 0 });
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('réunit les élèves de toutes les affectations, triés par nom, sans doublon', async () => {
		const fetcher = fetcherFor({
			[A1]: { students: [student(ZOE, 'Zoé', 'Martin'), student(ADAM, 'Adam', 'Bernard')] },
			[A2]: { students: [student(ZOE, 'Zoé', 'Martin', null), student(EMMA, 'Emma', 'Élie')] }
		});
		const result = await fetchBatchStudents(fetcher, [A1, A2]);
		expect(result.failedAssignments).toBe(0);
		expect(result.students.map((s) => `${s.last_name} ${s.first_name}`)).toEqual([
			'Bernard Adam',
			'Élie Emma',
			'Martin Zoé'
		]);
		expect(fetcher).toHaveBeenCalledWith(`/api/worksheets/assignments/${A1}/students`);
	});

	it('une même affectation donnée deux fois n’est lue qu’une fois', async () => {
		const fetcher = fetcherFor({ [A1]: { students: [student(ZOE, 'Zoé', 'Martin')] } });
		await fetchBatchStudents(fetcher, [A1, A1]);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('une affectation refusée ou en panne est comptée, les autres gardées', async () => {
		const fetcher = fetcherFor({ [A1]: { students: [student(ZOE, 'Zoé', 'Martin')] } });
		const result = await fetchBatchStudents(fetcher, [A1, A2]);
		expect(result.students).toHaveLength(1);
		expect(result.failedAssignments).toBe(1);
	});

	it('une réponse inattendue (identifiant qui n’est pas un UUID) est comptée en échec', async () => {
		const fetcher = fetcherFor({ [A1]: { students: [student('pas-un-uuid', 'Zoé', 'Martin')] } });
		expect(await fetchBatchStudents(fetcher, [A1])).toEqual({ students: [], failedAssignments: 1 });
	});

	it('une demande qui lève (réseau coupé) est comptée en échec', async () => {
		const fetcher = vi.fn(async () => {
			throw new Error('réseau');
		}) as unknown as typeof fetch;
		expect(await fetchBatchStudents(fetcher, [A1])).toEqual({ students: [], failedAssignments: 1 });
	});
});
