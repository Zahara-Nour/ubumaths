/**
 * Couverture d'une séance — cartes partagées entre deux référentiels.
 *
 * Une carte peut être rattachée à un point de Terminale spécialité (`T_SPE`)
 * ET à un point de maths complémentaires (`T_COMP`). La séance d'une classe de
 * T_SPE ne doit couvrir que le point T_SPE : sinon le point de l'autre
 * programme entre dans la couverture de la classe, et `coveredCount` du cahier
 * de texte est gonflé.
 *
 * Un tag dont le point est illisible (absent de la jointure) ne compte jamais.
 */
import { describe, it, expect } from 'vitest';
import { evaluationCurriculumPoints, reconcileAutoCoverage } from '../curriculum-coverage';
import { createFakeSupabase, type Call } from './helpers/fake-supabase';

const ENTRY = 'entry-1';
const EVALUATION = '55555555-5555-4555-8555-555555555555';
const T_PARTAGEE = '66666666-6666-4666-8666-666666666661';
const T_SEULE = '66666666-6666-4666-8666-666666666662';

/** Tag d'un point lisible, avec son programme. */
function tag(templateId: string, pointId: string, grade: string) {
	return {
		template_id: templateId,
		point_id: pointId,
		curriculum_points: { grade }
	};
}

/** Tag d'un point illisible : la jointure ne rend rien. */
function hiddenTag(templateId: string, pointId: string) {
	return { template_id: templateId, point_id: pointId, curriculum_points: null };
}

/**
 * `t-partagee` : un point T_SPE et un point T_COMP (le cas visé).
 * `t-seule` : un seul point, de T_COMP (non-régression).
 * Chacune porte en plus un point illisible, que la couverture ne doit jamais retenir.
 */
const TAGS = [
	tag(T_PARTAGEE, 'p-spe', 'T_SPE'),
	tag(T_PARTAGEE, 'p-comp', 'T_COMP'),
	tag(T_SEULE, 'p-comp-seul', 'T_COMP'),
	hiddenTag(T_PARTAGEE, 'p-masque-partagee'),
	hiddenTag(T_SEULE, 'p-masque-seule')
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
							question_template_id: T_PARTAGEE,
							evaluation_id: null
						},
						{
							kind: 'question',
							exercise_id: null,
							question_template_id: T_SEULE,
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
			case 'curriculum_points': {
				const ids = calls.find((c) => c.method === 'in')?.args[1] as string[];
				return { data: ids.map((id) => ({ id, archived_at: null })) };
			}
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

// Comparaisons INTÉGRALES : chaque carte porte aussi un point illisible (TAGS), que la
// couverture écarte. Sans ce filtre, « sans niveau » gagnerait les points illisibles.
describe('reconcileAutoCoverage — niveau de la classe', () => {
	it('classe de T_SPE : la carte partagée ne couvre que son point T_SPE', async () => {
		expect(await reconciledPoints('T_SPE')).toEqual(['p-comp-seul', 'p-spe']);
	});

	it('classe de T_COMP : seulement le point T_COMP de la carte partagée', async () => {
		expect(await reconciledPoints('T_COMP')).toEqual(['p-comp', 'p-comp-seul']);
	});

	it('classe sans niveau : tous les points lisibles', async () => {
		expect(await reconciledPoints(null)).toEqual(['p-comp', 'p-comp-seul', 'p-spe']);
	});
});

describe('evaluationCurriculumPoints — niveau de la classe', () => {
	function evaluationFake() {
		return createFakeSupabase((table, calls) => {
			if (table === 'evaluations') {
				return {
					data: [
						{
							id: EVALUATION,
							series: {
								items: [
									{ templateId: T_PARTAGEE, quantity: 1, delay: 20 },
									{ templateId: T_SEULE, quantity: 1, delay: 20 }
								]
							}
						}
					]
				};
			}
			if (table === 'question_templates') {
				const range = calls.find((c) => c.method === 'range')?.args as [number, number];
				return {
					data: range[0] === 0 ? [{ id: T_PARTAGEE }, { id: T_SEULE }] : []
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
