/**
 * Points du programme d'une évaluation (cahier de texte, Q29), calculés en
 * TypeScript à la place de `assessment_curriculum_points()`.
 */
import { describe, it, expect } from 'vitest';
import { evaluationCurriculumPoints } from '../curriculum-coverage';
import { createFakeSupabase, type Call } from './helpers/fake-supabase';

const EVALUATION = '55555555-5555-4555-8555-555555555555';
const LEGACY = '99999999-9999-4999-8999-999999999999';
const CATEGORY = { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 };

function rangeOf(calls: Call[]): [number, number] | null {
	const range = calls.find((c) => c.method === 'range');
	return range ? (range.args as [number, number]) : null;
}

describe('evaluationCurriculumPoints', () => {
	it('ancien id d’assessment cité : trouvé par legacy_assessment_id', async () => {
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				const or = calls.find((c) => c.method === 'or');
				const matches = String(or?.args[0]).includes(`legacy_assessment_id.in.(${LEGACY})`);
				return {
					data: matches
						? [{ id: EVALUATION, series: { categories: [{ category: CATEGORY }] } }]
						: []
				};
			}
			if (table === 'question_templates') {
				return { data: rangeOf(calls)?.[0] === 0 ? [{ id: 't1', ...CATEGORY }] : [] };
			}
			return { data: [{ point_id: 'p1' }] };
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [LEGACY])).toEqual(['p1']);
	});

	it('lit TOUS les modèles, page par page (plafond de PostgREST à 1000)', async () => {
		const page1 = Array.from({ length: 1000 }, (_, i) => ({
			id: `autre-${i}`,
			...CATEGORY,
			level: 9
		}));
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				return { data: [{ id: EVALUATION, series: { categories: [{ category: CATEGORY }] } }] };
			}
			if (table === 'question_templates') {
				const [from] = rangeOf(calls) ?? [0];
				if (from === 0) return { data: page1 };
				if (from === 1000) return { data: [{ id: 't-loin', ...CATEGORY }] };
				return { data: [] };
			}
			const ids = calls.find((c) => c.method === 'in')?.args[1] as string[];
			return { data: ids.includes('t-loin') ? [{ point_id: 'p-loin' }] : [] };
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [EVALUATION])).toEqual([
			'p-loin'
		]);
	});

	it('niveau comparé comme le SQL (texte) : « 3 » et 3 se correspondent', async () => {
		const fake = createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				return {
					data: [
						{
							id: EVALUATION,
							series: { categories: [{ category: { ...CATEGORY, level: '3' } }] }
						}
					]
				};
			}
			if (table === 'question_templates') {
				return { data: rangeOf(calls)?.[0] === 0 ? [{ id: 't1', ...CATEGORY }] : [] };
			}
			return { data: [{ point_id: 'p1' }] };
		});

		expect(await evaluationCurriculumPoints(fake.client as never, [EVALUATION])).toEqual(['p1']);
	});
});
