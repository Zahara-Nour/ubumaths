/**
 * Couverture d'une séance — cartes partagées entre deux référentiels.
 *
 * Une carte peut être rattachée à un point de Terminale spécialité (`T_SPE`)
 * ET à un point de maths complémentaires (`T_COMP`). La séance d'une classe de
 * T_SPE ne doit couvrir que le point T_SPE : sinon le point de l'autre
 * programme entre dans la couverture de la classe, et `coveredCount` du cahier
 * de texte est gonflé.
 *
 * Depuis l'étape 2 de C5, les mêmes cartes portent aussi des tags de points
 * NEUFS (un nœud de l'arbre, pas d'objectif) : la couverture, qui compte les
 * points de l'ancien référentiel, les ignore jusqu'à la bascule du code.
 */
import { describe, it, expect } from 'vitest';
import { evaluationCurriculumPoints, reconcileAutoCoverage } from '../curriculum-coverage';
import { createFakeSupabase, type Call } from './helpers/fake-supabase';

const ENTRY = 'entry-1';
const EVALUATION = '55555555-5555-4555-8555-555555555555';
const CATEGORY = { theme: 'Calcul', domain: 'Tables', subdomain: null, level: 3 };

/** Tag d'un point d'ANCIENNE génération : il porte un objectif, qui porte le niveau. */
function tag(templateId: string, pointId: string, grade: string) {
	return {
		template_id: templateId,
		point_id: pointId,
		curriculum_points: {
			objective_id: `objectif-${grade}`,
			curriculum_objectives: { curriculum_themes: { grade } }
		}
	};
}

/** Tag d'un point NEUF (étape 2 de C5) : ni objectif ni thème. */
function freshTag(templateId: string, pointId: string) {
	return {
		template_id: templateId,
		point_id: pointId,
		curriculum_points: { objective_id: null, curriculum_objectives: null }
	};
}

/**
 * `t-partagee` : un point T_SPE et un point T_COMP (le cas visé).
 * `t-seule` : un seul point, de T_COMP (non-régression).
 * Chacune porte en plus un point neuf, que la couverture ne doit jamais retenir.
 */
const TAGS = [
	tag('t-partagee', 'p-spe', 'T_SPE'),
	tag('t-partagee', 'p-comp', 'T_COMP'),
	tag('t-seule', 'p-comp-seul', 'T_COMP'),
	freshTag('t-partagee', 'p-neuf-partagee'),
	freshTag('t-seule', 'p-neuf-seule')
];

function tagsFor(calls: Call[]) {
	const ids = calls.find((c) => c.method === 'in')?.args[1] as string[];
	return { data: TAGS.filter((t) => ids.includes(t.template_id)) };
}

/** Réconciliation d'une séance citant les deux cartes. */
async function reconcile(classGrade: string | null) {
	const fake = createFakeSupabase((table, calls) => {
		switch (table) {
			case 'journal_entry_activities':
				return {
					data: [
						{
							kind: 'question',
							exercise_id: null,
							question_template_id: 't-partagee',
							evaluation_id: null
						},
						{
							kind: 'question',
							exercise_id: null,
							question_template_id: 't-seule',
							evaluation_id: null
						}
					]
				};
			case 'class_journal_entries':
				return { data: { lesson_content: null, classes: { grade: classGrade } } };
			case 'journal_entry_homework':
				return { data: [] };
			case 'question_template_points':
				return tagsFor(calls);
			case 'journal_entry_points':
				return { data: [] };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});

	await reconcileAutoCoverage(fake.client as never, ENTRY);
	return fake;
}

/** Points que la réconciliation insère pour une séance citant les deux cartes. */
async function reconciledPoints(classGrade: string | null): Promise<string[]> {
	const fake = await reconcile(classGrade);
	const upsert = fake
		.on('journal_entry_points')
		.flatMap((q) => q.calls)
		.find((c) => c.method === 'upsert');
	const rows = (upsert?.args[0] ?? []) as { point_id: string }[];
	return rows.map((r) => r.point_id).sort();
}

describe('reconcileAutoCoverage — points neufs (étape 2 de C5)', () => {
	it('filtre provisoire : aucun point neuf dans la couverture, quel que soit le niveau', async () => {
		for (const grade of ['T_SPE', 'T_COMP', null]) {
			const points = await reconciledPoints(grade);
			expect(
				points.filter((p) => p.startsWith('p-neuf')),
				String(grade)
			).toEqual([]);
		}
	});

	it('la requête lit `objective_id` du point : sans lui, tout tag serait écarté', async () => {
		const fake = await reconcile(null);
		const select = fake
			.on('question_template_points')
			.flatMap((q) => q.calls)
			.find((c) => c.method === 'select');
		expect(String(select?.args[0])).toMatch(/curriculum_points\(objective_id,/);
	});
});

describe('reconcileAutoCoverage — niveau de la classe', () => {
	it('classe de T_SPE : la carte partagée ne couvre que son point T_SPE', async () => {
		expect(await reconciledPoints('T_SPE')).toEqual(['p-comp-seul', 'p-spe']);
	});

	it('classe de T_COMP : seulement le point T_COMP de la carte partagée', async () => {
		expect(await reconciledPoints('T_COMP')).toEqual(['p-comp', 'p-comp-seul']);
	});

	it('classe sans niveau : tous les points, comme avant', async () => {
		expect(await reconciledPoints(null)).toEqual(['p-comp', 'p-comp-seul', 'p-spe']);
	});
});

describe('evaluationCurriculumPoints — niveau de la classe', () => {
	function evaluationFake() {
		return createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				return { data: [{ id: EVALUATION, series: { categories: [{ category: CATEGORY }] } }] };
			}
			if (table === 'question_templates') {
				const range = calls.find((c) => c.method === 'range')?.args as [number, number];
				return {
					data:
						range[0] === 0
							? [
									{ id: 't-partagee', ...CATEGORY },
									{ id: 't-seule', ...CATEGORY }
								]
							: []
				};
			}
			return tagsFor(calls);
		});
	}

	it('niveau donné : les points de l’autre programme sont écartés', async () => {
		const points = await evaluationCurriculumPoints(
			evaluationFake().client as never,
			[EVALUATION],
			'T_SPE'
		);
		expect(points.sort()).toEqual(['p-comp-seul', 'p-spe']);
	});

	it('sans niveau : tous les points, comme avant', async () => {
		const points = await evaluationCurriculumPoints(evaluationFake().client as never, [EVALUATION]);
		expect(points.sort()).toEqual(['p-comp', 'p-comp-seul', 'p-spe']);
	});
});
