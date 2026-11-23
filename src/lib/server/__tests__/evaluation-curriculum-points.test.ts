/**
 * Points du programme d'une évaluation (cahier de texte, Q29), calculés en
 * TypeScript à la place de `assessment_curriculum_points()`.
 */
import { describe, it, expect } from 'vitest';
import { evaluationCurriculumPoints } from '../curriculum-coverage';
import { createFakeSupabase, type Call } from './helpers/fake-supabase';

const EVALUATION = '55555555-5555-4555-8555-555555555555';
const LEGACY = '99999999-9999-4999-8999-999999999999';
const T1 = '77777777-7777-4777-8777-777777777771';
const T_LOIN = '77777777-7777-4777-8777-777777777772';
const ITEMS = [{ templateId: T1, quantity: 1, delay: 20 }];

function rangeOf(calls: Call[]): [number, number] | null {
	const range = calls.find((c) => c.method === 'range');
	return range ? (range.args as [number, number]) : null;
}

/** Tag d'un point neuf (il porte un nœud) : le seul que la couverture compte. */
function programmeTag(pointId: string) {
	return {
		point_id: pointId,
		curriculum_points: { node_id: 'noeud-1', grade: null }
	};
}

describe('evaluationCurriculumPoints', () => {
	it('ancien id d’assessment cité : trouvé par legacy_assessment_id', async () => {
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				const or = calls.find((c) => c.method === 'or');
				const matches = String(or?.args[0]).includes(`legacy_assessment_id.in.(${LEGACY})`);
				return {
					data: matches ? [{ id: EVALUATION, series: { items: ITEMS } }] : []
				};
			}
			if (table === 'question_templates') {
				return { data: rangeOf(calls)?.[0] === 0 ? [{ id: T1 }] : [] };
			}
			return { data: [programmeTag('p1')] };
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [LEGACY])).toEqual(['p1']);
	});

	it('lit TOUS les modèles, page par page (plafond de PostgREST à 1000)', async () => {
		const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `autre-${i}` }));
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				return {
					data: [
						{
							id: EVALUATION,
							series: {
								items: [
									{ templateId: T1, quantity: 1, delay: 20 },
									{ templateId: T_LOIN, quantity: 1, delay: 20 }
								]
							}
						}
					]
				};
			}
			if (table === 'question_templates') {
				const [from] = rangeOf(calls) ?? [0];
				if (from === 0) return { data: page1 };
				if (from === 1000) return { data: [{ id: T_LOIN }] };
				return { data: [] };
			}
			const ids = calls.find((c) => c.method === 'in')?.args[1] as string[];
			return { data: ids.includes(T_LOIN) ? [programmeTag('p-loin')] : [] };
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [EVALUATION])).toEqual([
			'p-loin'
		]);
	});

	it('seuls les modèles lus (publiés) comptent : le modèle de la série est demandé par son id', async () => {
		const fake = createFakeSupabase((table) => {
			if (table === 'evaluations') {
				return { data: [{ id: EVALUATION, series: { items: ITEMS } }] };
			}
			// Modèle repassé en brouillon : la lecture des publiés ne le rend pas
			if (table === 'question_templates') return { data: [] };
			throw new Error(`Table inattendue : ${table}`);
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [EVALUATION])).toEqual([]);
		const read = fake.on('question_templates')[0].calls;
		expect(read.find((c) => c.method === 'eq')?.args).toEqual(['status', 'published']);
		expect(read.find((c) => c.method === 'in')?.args).toEqual(['id', [T1]]);
	});

	it('ancienne série par catégories : plus relue, aucun point (et pas d’erreur)', async () => {
		const fake = createFakeSupabase((table) => {
			if (table === 'evaluations') {
				return {
					data: [
						{
							id: EVALUATION,
							series: {
								items: [{ category: { level: '3' }, quantity: 1, delay: 20 }]
							}
						}
					]
				};
			}
			throw new Error(`Table inattendue : ${table}`);
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [EVALUATION])).toEqual([]);
	});
});
