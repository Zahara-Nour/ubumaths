/**
 * Couverture AUTOMATIQUE d'une séance — jamais un point archivé
 * ======================================================================
 *
 * Comportement validé par David (C5, étape 3, B3, 2026-10-21) : la réconciliation
 * suit la même règle que le coché manuel. Un exercice, un modèle ou une évaluation
 * cités dans une séance ne cochent que des points NON archivés ; une ligne
 * auto déjà posée sur un point devenu archivé disparaît à la réconciliation
 * suivante (les cochés manuels restent).
 */
import { describe, it, expect } from 'vitest';
import { reconcileAutoCoverage } from '../curriculum-coverage';
import { createFakeSupabase, type Call } from './helpers/fake-supabase';

const ENTRY = 'entry-1';
const STAMP = '2026-10-01T00:00:00Z';

/** Points en base : deux actifs, deux archivés. */
const POINTS = [
	{ id: 'p-modele', node_id: 'n-1', archived_at: null },
	{ id: 'p-modele-archive', node_id: 'n-1', archived_at: STAMP },
	{ id: 'p-exercice', node_id: 'n-2', archived_at: null },
	{ id: 'p-exercice-archive', node_id: 'n-2', archived_at: STAMP }
];

function inIds(calls: Call[]): string[] {
	return (calls.find((c) => c.method === 'in')?.args[1] as string[]) ?? [];
}

async function reconcile(existing: { point_id: string; source: string }[] = []) {
	const fake = createFakeSupabase((table, calls) => {
		switch (table) {
			case 'journal_entry_activities':
				return {
					data: [
						{
							kind: 'question',
							exercise_id: null,
							question_template_id: 't-1',
							evaluation_id: null
						},
						{
							kind: 'exercise',
							exercise_id: 'e-1',
							question_template_id: null,
							evaluation_id: null
						}
					]
				};
			case 'class_journal_entries':
				return { data: { lesson_content: null, classes: { grade: '5' } } };
			case 'journal_entry_homework':
				return { data: [] };
			case 'question_template_points':
				return {
					data: ['p-modele', 'p-modele-archive'].map((point_id) => ({
						template_id: 't-1',
						point_id,
						curriculum_points: { grade: '5' }
					}))
				};
			case 'exercise_curriculum_points':
				return { data: [{ point_id: 'p-exercice' }, { point_id: 'p-exercice-archive' }] };
			case 'curriculum_points':
				return { data: POINTS.filter((p) => inIds(calls).includes(p.id)) };
			case 'journal_entry_points':
				return { data: calls.some((c) => c.method === 'select') ? existing : [] };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
	await reconcileAutoCoverage(fake.client as never, ENTRY);
	return fake;
}

function callsOf(fake: Awaited<ReturnType<typeof reconcile>>, method: string) {
	return fake
		.on('journal_entry_points')
		.flatMap((q) => q.calls)
		.filter((c) => c.method === method);
}

describe('reconcileAutoCoverage — points archivés (B3)', () => {
	it('ne coche que les points non archivés, quelle que soit la source', async () => {
		const fake = await reconcile();
		const rows = (callsOf(fake, 'upsert')[0]?.args[0] ?? []) as { point_id: string }[];
		expect(rows.map((r) => r.point_id).sort()).toEqual(['p-exercice', 'p-modele']);
	});

	it('une ligne auto sur un point devenu archivé est retirée ; un coché manuel reste', async () => {
		const fake = await reconcile([
			{ point_id: 'p-modele-archive', source: 'auto' },
			{ point_id: 'p-exercice-archive', source: 'manual' }
		]);
		const removed = callsOf(fake, 'in').find((c) => c.args[0] === 'point_id')?.args[1];
		expect(removed).toEqual(['p-modele-archive']);
	});
});
