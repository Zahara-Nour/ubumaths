/**
 * Tests pour `src/lib/server/stats/class-knowledge.ts`.
 *
 * Couvre les 5 fonctions exposées avec un mock Supabase qui dispatche
 * sur le nom de la table. Focus sur les agrégations et les cas limites.
 */

import { describe, it, expect, vi } from 'vitest';
import {
	getClassCapacityGrid,
	getClassTopCapacitiesToRemediate,
	getStudentRetentionCurve,
	getClassActivityHeatmap,
	getStudentGradeHistogram
} from '../class-knowledge';

type QueryResult = { data: unknown; error: unknown };
type TableHandler = () => Promise<QueryResult> | QueryResult;
type MockSpec = Record<string, TableHandler>;

/**
 * Construit un mock Supabase qui invoque `tableHandlers[tableName]()` à la
 * fin de la chaîne de query builders. Toute la chaîne `.select().eq().in()
 * .gte().not().order().maybeSingle()` retourne `this` jusqu'au handler final.
 */
function buildMock(tableHandlers: MockSpec) {
	const fromMock = vi.fn().mockImplementation((table: string) => {
		// `classes` (niveau de la classe) : sans niveau par défaut, ce qui garde
		// tous les points des cartes — les tests qui ne parlent pas du niveau
		// n'ont pas à le déclarer.
		const handler =
			tableHandlers[table] ??
			(table === 'classes' ? () => ({ data: { grade: null }, error: null }) : undefined);
		if (!handler) {
			throw new Error(`Unexpected table in mock: ${table}`);
		}
		const terminalPromise = Promise.resolve().then(handler);
		const queryBuilder = {
			select: vi.fn(),
			eq: vi.fn(),
			in: vi.fn(),
			not: vi.fn(),
			is: vi.fn(),
			gte: vi.fn(),
			order: vi.fn(),
			maybeSingle: vi.fn(),
			single: vi.fn(),
			then: (onFulfilled: (value: QueryResult) => unknown) => terminalPromise.then(onFulfilled)
		};
		queryBuilder.select.mockReturnValue(queryBuilder);
		queryBuilder.eq.mockReturnValue(queryBuilder);
		queryBuilder.in.mockReturnValue(queryBuilder);
		queryBuilder.not.mockReturnValue(queryBuilder);
		queryBuilder.is.mockReturnValue(queryBuilder);
		queryBuilder.gte.mockReturnValue(queryBuilder);
		queryBuilder.order.mockReturnValue(queryBuilder);
		queryBuilder.maybeSingle.mockImplementation(handler);
		queryBuilder.single.mockImplementation(handler);
		return queryBuilder;
	});
	return { from: fromMock } as unknown as Parameters<typeof getClassCapacityGrid>[0];
}

// =============================================================================
// getClassCapacityGrid
// =============================================================================

describe('getClassCapacityGrid', () => {
	it('returns empty for class with no active members', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null })
		});
		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.students).toEqual([]);
		expect(grid.capacities).toEqual([]);
	});

	it('returns students but no capacities when no skill_attempts', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{
						student_id: 's1',
						profiles: { id: 's1', firstname: 'Alice', lastname: 'Z' }
					}
				],
				error: null
			}),
			skill_attempts: () => ({ data: [], error: null })
		});
		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.students.length).toBe(1);
		expect(grid.capacities).toEqual([]);
		expect(grid.cells).toEqual({});
	});

	it('builds a grid with one student, one capacity, one template (acquise)', async () => {
		const future = new Date(Date.now() + 7 * 86400000).toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{
						student_id: 's1',
						profiles: { id: 's1', firstname: 'Alice', lastname: 'Z' }
					}
				],
				error: null
			}),
			skill_attempts: () => ({
				data: [{ student_id: 's1', template_id: 't1' }],
				error: null
			}),
			question_template_points: () => ({
				data: [
					{
						template_id: 't1',
						point_id: 'cap1',
						curriculum_points: {
							id: 'cap1',
							name: 'Additionner',
							family: 'knowledge',
							objective_id: 'obj1',
							curriculum_objectives: {
								theme_id: 'th1',
								curriculum_themes: { name: 'Nombres', code: 'NUM' }
							}
						}
					}
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [
					{
						user_id: 's1',
						card_reference_id: 't1',
						state: 'review',
						next_review: future
					}
				],
				error: null
			})
		});

		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.students.length).toBe(1);
		expect(grid.capacities.length).toBe(1);
		expect(grid.capacities[0].name).toBe('Additionner');
		expect(grid.capacities[0].theme_code).toBe('NUM');
		expect(grid.cells['s1:cap1']).toBe('acquise_en_memoire');
		expect(grid.columnStats.cap1.acquise_pct).toBe(100);
		expect(grid.columnStats.cap1.remediate_pct).toBe(0);
	});

	it('aggregates badges across templates with worst-priority winning', async () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		const future = new Date(Date.now() + 7 * 86400000).toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{
						student_id: 's1',
						profiles: { id: 's1', firstname: 'Bob', lastname: 'A' }
					}
				],
				error: null
			}),
			skill_attempts: () => ({
				data: [
					{ student_id: 's1', template_id: 't1' },
					{ student_id: 's1', template_id: 't2' }
				],
				error: null
			}),
			question_template_points: () => ({
				data: [
					{
						template_id: 't1',
						point_id: 'cap1',
						curriculum_points: {
							id: 'cap1',
							name: 'Capacité X',
							family: 'knowledge',
							objective_id: null,
							curriculum_objectives: null
						}
					},
					{
						template_id: 't2',
						point_id: 'cap1',
						curriculum_points: {
							id: 'cap1',
							name: 'Capacité X',
							family: 'knowledge',
							objective_id: null,
							curriculum_objectives: null
						}
					}
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [
					{ user_id: 's1', card_reference_id: 't1', state: 'review', next_review: future },
					{ user_id: 's1', card_reference_id: 't2', state: 'learning', next_review: past }
				],
				error: null
			})
		});

		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.cells['s1:cap1']).toBe('a_remedier');
	});

	it('sorts students by display_name (alphabetic)', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [
					{ student_id: 's2', profiles: { id: 's2', firstname: 'Zoé', lastname: '' } },
					{ student_id: 's1', profiles: { id: 's1', firstname: 'Alice', lastname: '' } }
				],
				error: null
			}),
			skill_attempts: () => ({ data: [], error: null })
		});
		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.students.map((s) => s.display_name)).toEqual(['Alice', 'Zoé']);
	});

	it('falls back to "Élève sans nom" when both first and last are null', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: null, lastname: null } }],
				error: null
			}),
			skill_attempts: () => ({ data: [], error: null })
		});
		const grid = await getClassCapacityGrid(supabase, 'class-1');
		expect(grid.students[0].display_name).toBe('Élève sans nom');
	});
	describe('carte partagée entre deux référentiels', () => {
		function tag(templateId: string, pointId: string, grade: string) {
			return {
				template_id: templateId,
				point_id: pointId,
				curriculum_points: {
					id: pointId,
					name: `Point ${pointId}`,
					curriculum_objectives: {
						theme_id: `th-${grade}`,
						curriculum_themes: { name: `Thème ${grade}`, code: grade, grade }
					}
				}
			};
		}

		/**
		 * `t-partagee` : un point T_SPE ET un point T_COMP (le cas visé).
		 * `t-seule` : un seul point, de T_COMP (non-régression : une carte d'un
		 * autre niveau retravaillée par la classe garde sa colonne).
		 */
		function fixture(classGrade: string | null) {
			const past = new Date(Date.now() - 7 * 86400000).toISOString();
			return buildMock({
				class_members: () => ({
					data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'Alice', lastname: 'Z' } }],
					error: null
				}),
				classes: () => ({ data: { grade: classGrade }, error: null }),
				skill_attempts: () => ({
					data: [
						{ student_id: 's1', template_id: 't-partagee' },
						{ student_id: 's1', template_id: 't-seule' }
					],
					error: null
				}),
				question_template_points: () => ({
					data: [
						tag('t-partagee', 'p-spe', 'T_SPE'),
						tag('t-partagee', 'p-comp', 'T_COMP'),
						tag('t-seule', 'p-comp-seul', 'T_COMP')
					],
					error: null
				}),
				srs_card_stats: () => ({
					data: [
						{
							user_id: 's1',
							card_reference_id: 't-partagee',
							state: 'relearning',
							next_review: past
						}
					],
					error: null
				})
			});
		}

		it('classe de T_SPE : pas de colonne T_COMP pour la carte partagée', async () => {
			const grid = await getClassCapacityGrid(fixture('T_SPE'), 'class-1');
			expect(grid.capacities.map((c) => c.id).sort()).toEqual(['p-comp-seul', 'p-spe']);
			expect(grid.cells['s1:p-comp']).toBeUndefined();
		});

		it('classe de T_COMP : la carte partagée ne compte que sous son point T_COMP', async () => {
			const grid = await getClassCapacityGrid(fixture('T_COMP'), 'class-1');
			expect(grid.capacities.map((c) => c.id).sort()).toEqual(['p-comp', 'p-comp-seul']);
		});

		it('classe sans niveau : tous les points, comme avant', async () => {
			const grid = await getClassCapacityGrid(fixture(null), 'class-1');
			expect(grid.capacities.map((c) => c.id).sort()).toEqual(['p-comp', 'p-comp-seul', 'p-spe']);
		});

		it('top à remédier : la capacité de l’autre programme n’y figure pas', async () => {
			const top = await getClassTopCapacitiesToRemediate(fixture('T_SPE'), 'class-1');
			expect(top.map((r) => r.point_id)).toEqual(['p-spe']);
		});
	});
});

// =============================================================================
// getClassTopCapacitiesToRemediate
// =============================================================================

describe('getClassTopCapacitiesToRemediate', () => {
	it('returns empty when no capacities', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null })
		});
		const rows = await getClassTopCapacitiesToRemediate(supabase, 'class-1');
		expect(rows).toEqual([]);
	});

	it('excludes capacities with 0% remediate', async () => {
		const future = new Date(Date.now() + 86400000).toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [{ student_id: 's1', template_id: 't1' }],
				error: null
			}),
			question_template_points: () => ({
				data: [
					{
						template_id: 't1',
						point_id: 'cap1',
						curriculum_points: {
							id: 'cap1',
							name: 'X',
							family: 'knowledge',
							objective_id: null,
							curriculum_objectives: null
						}
					}
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [{ user_id: 's1', card_reference_id: 't1', state: 'review', next_review: future }],
				error: null
			})
		});
		const rows = await getClassTopCapacitiesToRemediate(supabase, 'class-1');
		expect(rows.length).toBe(0);
	});

	it('lists students concerned with their badge', async () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'Alice', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [{ student_id: 's1', template_id: 't1' }],
				error: null
			}),
			question_template_points: () => ({
				data: [
					{
						template_id: 't1',
						point_id: 'cap1',
						curriculum_points: {
							id: 'cap1',
							name: 'X',
							family: 'knowledge',
							objective_id: null,
							curriculum_objectives: null
						}
					}
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [{ user_id: 's1', card_reference_id: 't1', state: 'learning', next_review: past }],
				error: null
			})
		});
		const rows = await getClassTopCapacitiesToRemediate(supabase, 'class-1');
		expect(rows.length).toBe(1);
		expect(rows[0].remediate_pct).toBe(100);
		expect(rows[0].students_concerned[0].badge).toBe('a_remedier');
	});

	it('respects topN limit', async () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		const students = [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }];
		const attempts = Array.from({ length: 5 }, (_, i) => ({
			student_id: 's1',
			template_id: `t${i}`
		}));
		const tagMappings = Array.from({ length: 5 }, (_, i) => ({
			template_id: `t${i}`,
			point_id: `cap${i}`,
			curriculum_points: {
				id: `cap${i}`,
				name: `C${i}`,
				family: 'knowledge',
				objective_id: null,
				curriculum_objectives: null
			}
		}));
		const fsrs = Array.from({ length: 5 }, (_, i) => ({
			user_id: 's1',
			card_reference_id: `t${i}`,
			state: 'learning',
			next_review: past
		}));

		const supabase = buildMock({
			class_members: () => ({ data: students, error: null }),
			skill_attempts: () => ({ data: attempts, error: null }),
			question_template_points: () => ({ data: tagMappings, error: null }),
			srs_card_stats: () => ({ data: fsrs, error: null })
		});

		const rows = await getClassTopCapacitiesToRemediate(supabase, 'class-1', 3);
		expect(rows.length).toBe(3);
	});
});

// =============================================================================
// getStudentRetentionCurve
// =============================================================================

describe('getStudentRetentionCurve', () => {
	it('returns empty when no skill matches the theme', async () => {
		const supabase = buildMock({
			curriculum_points: () => ({ data: [], error: null })
		});
		const points = await getStudentRetentionCurve(supabase, 'student-1', 'NUM');
		expect(points).toEqual([]);
	});

	it('returns 8 weeks of zeros when no review history', async () => {
		const supabase = buildMock({
			curriculum_points: () => ({ data: [{ id: 'cap1' }], error: null }),
			question_template_points: () => ({ data: [{ template_id: 't1' }], error: null }),
			srs_card_stats: () => ({ data: [], error: null })
		});
		const points = await getStudentRetentionCurve(supabase, 'student-1', 'NUM');
		expect(points.length).toBe(8);
		expect(points.every((p) => p.review_count === 0)).toBe(true);
		expect(points.every((p) => p.retrievability_avg === 0)).toBe(true);
	});

	it('aggregates retrievability_avg from review_history', async () => {
		const now = Date.now();
		const supabase = buildMock({
			curriculum_points: () => ({ data: [{ id: 'cap1' }], error: null }),
			question_template_points: () => ({ data: [{ template_id: 't1' }], error: null }),
			srs_card_stats: () => ({
				data: [
					{
						review_history: [
							{
								date: new Date(now - 86400000).toISOString(),
								grade: 3,
								elapsedDays: 5,
								retrievability: 0.8
							},
							{
								date: new Date(now - 2 * 86400000).toISOString(),
								grade: 4,
								elapsedDays: 7,
								retrievability: 0.9
							}
						]
					}
				],
				error: null
			})
		});
		const points = await getStudentRetentionCurve(supabase, 'student-1', 'NUM');
		const totalReviews = points.reduce((acc, p) => acc + p.review_count, 0);
		expect(totalReviews).toBe(2);
	});
});

// =============================================================================
// getClassActivityHeatmap
// =============================================================================

describe('getClassActivityHeatmap', () => {
	it('returns empty when no class members', async () => {
		const supabase = buildMock({
			class_members: () => ({ data: [], error: null })
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1');
		expect(heatmap.days).toEqual([]);
		expect(heatmap.students).toEqual([]);
		expect(heatmap.cells).toEqual([]);
	});

	it('builds N days × M students cells with zeros when no attempts', async () => {
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({ data: [], error: null })
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1', 3);
		expect(heatmap.days.length).toBe(3);
		expect(heatmap.students.length).toBe(1);
		expect(heatmap.cells.length).toBe(3);
		expect(heatmap.cells.every((c) => c.review_count === 0)).toBe(true);
		expect(heatmap.students[0].is_alert).toBe(true);
	});

	it('flags is_alert=true when last_review > alertThresholdDays', async () => {
		const old = new Date(Date.now() - 10 * 86400000).toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [{ student_id: 's1', created_at: old, success: true, source: 'srs' }],
				error: null
			})
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1', 30, 5);
		expect(heatmap.students[0].is_alert).toBe(true);
		expect(heatmap.students[0].days_since_last_review).toBeGreaterThan(5);
	});

	it('counts success_pct per cell', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [
					{ student_id: 's1', created_at: today, success: true, source: 'srs' },
					{ student_id: 's1', created_at: today, success: false, source: 'srs' }
				],
				error: null
			})
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1', 1);
		expect(heatmap.cells[0].review_count).toBe(2);
		expect(heatmap.cells[0].success_pct).toBe(50);
	});

	// Décision B1 de David (2026-09-28) : une carte de cours compte comme
	// ACTIVITÉ (pas d'alerte d'inactivité) mais pas dans le taux de réussite
	// (l'élève s'est noté lui-même) — qu'elle vienne de l'entraînement libre
	// (`student_self`) ou d'un paquet de révision (`srs`).
	it('carte de cours : comptée comme activité, hors taux de réussite', async () => {
		const today = new Date().toISOString();
		const card = { type: 'course_card' };
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [
					{
						student_id: 's1',
						created_at: today,
						success: true,
						source: 'srs',
						question_templates: { type: 'fill_in_blanks' }
					},
					{
						student_id: 's1',
						created_at: today,
						success: false,
						source: 'srs',
						question_templates: { type: 'fill_in_blanks' }
					},
					{
						student_id: 's1',
						created_at: today,
						success: true,
						source: 'student_self',
						question_templates: card
					},
					{
						student_id: 's1',
						created_at: today,
						success: true,
						source: 'srs',
						question_templates: card
					}
				],
				error: null
			})
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1', 1);
		expect(heatmap.cells[0].review_count).toBe(4);
		expect(heatmap.cells[0].success_pct).toBe(50);
	});

	it('journée de cartes seulement : active, sans taux de réussite', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			class_members: () => ({
				data: [{ student_id: 's1', profiles: { id: 's1', firstname: 'A', lastname: '' } }],
				error: null
			}),
			skill_attempts: () => ({
				data: [
					{
						student_id: 's1',
						created_at: today,
						success: false,
						source: 'srs',
						question_templates: { type: 'course_card' }
					}
				],
				error: null
			})
		});
		const heatmap = await getClassActivityHeatmap(supabase, 'class-1', 1, 5);
		expect(heatmap.cells[0].review_count).toBe(1);
		expect(heatmap.cells[0].success_pct).toBeNull();
		expect(heatmap.students[0].is_alert).toBe(false);
	});
});

// =============================================================================
// getStudentGradeHistogram
// =============================================================================

describe('getStudentGradeHistogram', () => {
	it('returns 4 buckets with zeros when no attempts', async () => {
		const supabase = buildMock({
			skill_attempts: () => ({ data: [], error: null })
		});
		const buckets = await getStudentGradeHistogram(supabase, 'student-1');
		expect(buckets.length).toBe(4);
		expect(buckets.map((b) => b.grade)).toEqual([1, 2, 3, 4]);
		expect(buckets.every((b) => b.count === 0)).toBe(true);
	});

	it('counts grades correctly per bucket', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			skill_attempts: () => ({
				data: [
					{ grade: 1, created_at: today, template_id: 't1' },
					{ grade: 1, created_at: today, template_id: 't1' },
					{ grade: 3, created_at: today, template_id: 't1' },
					{ grade: 4, created_at: today, template_id: 't2' }
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [
					{ card_reference_id: 't1', stability: 5 },
					{ card_reference_id: 't2', stability: 10 }
				],
				error: null
			})
		});
		const buckets = await getStudentGradeHistogram(supabase, 'student-1');
		expect(buckets[0].count).toBe(2); // grade 1
		expect(buckets[1].count).toBe(0); // grade 2
		expect(buckets[2].count).toBe(1); // grade 3
		expect(buckets[3].count).toBe(1); // grade 4
	});

	// Décision A1 de David (2026-09-28) : une carte de cours ne mesure pas une
	// capacité — ses notes (auto-évaluation) restent hors de l'histogramme.
	it('ignore les notes des cartes de cours', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			skill_attempts: () => ({
				data: [
					{
						grade: 3,
						created_at: today,
						template_id: 't1',
						question_templates: { type: 'fill_in_blanks' }
					},
					{
						grade: 4,
						created_at: today,
						template_id: 'c1',
						question_templates: { type: 'course_card' }
					},
					{
						grade: 4,
						created_at: today,
						template_id: 'c1',
						question_templates: { type: 'course_card' }
					}
				],
				error: null
			}),
			srs_card_stats: () => ({ data: [{ card_reference_id: 't1', stability: 5 }], error: null })
		});
		const buckets = await getStudentGradeHistogram(supabase, 'student-1');
		expect(buckets[2].count).toBe(1); // grade 3
		expect(buckets[3].count).toBe(0); // grade 4 : cartes exclues
	});

	it('computes avg_stability_after using current stability as proxy', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			skill_attempts: () => ({
				data: [
					{ grade: 4, created_at: today, template_id: 't1' },
					{ grade: 4, created_at: today, template_id: 't2' }
				],
				error: null
			}),
			srs_card_stats: () => ({
				data: [
					{ card_reference_id: 't1', stability: 4 },
					{ card_reference_id: 't2', stability: 6 }
				],
				error: null
			})
		});
		const buckets = await getStudentGradeHistogram(supabase, 'student-1');
		expect(buckets[3].avg_stability_after).toBe(5); // (4+6)/2
	});

	it('ignores grades outside {1,2,3,4}', async () => {
		const today = new Date().toISOString();
		const supabase = buildMock({
			skill_attempts: () => ({
				data: [
					{ grade: 0, created_at: today, template_id: 't1' },
					{ grade: 5, created_at: today, template_id: 't1' },
					{ grade: null, created_at: today, template_id: 't1' }
				],
				error: null
			}),
			srs_card_stats: () => ({ data: [], error: null })
		});
		const buckets = await getStudentGradeHistogram(supabase, 'student-1');
		expect(buckets.every((b) => b.count === 0)).toBe(true);
	});
});
