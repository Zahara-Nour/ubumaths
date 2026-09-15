/**
 * Tests pour `src/lib/server/progression/student-progression.ts`.
 *
 * Ce module est la SOURCE UNIQUE de l'agrégation de progression : la tuile du
 * dashboard et la page `/dashboard/student/progression` le consomment tous les
 * deux. Avant lui, `dashboard/+page.server.ts` ré-implémentait le calcul de
 * `student/objectifs/+page.server.ts` — et divergeait sur deux points, que les
 * cas A1/A2 et A5 ci-dessous verrouillent.
 *
 * Spec : docs/wip/progression-eleve-progress.md §Comportements attendus
 */

import { describe, it, expect, vi } from 'vitest';
import {
	aggregateObjectiveStats,
	getObjectivesProgression,
	getCompetencesProgression,
	type ObjectiveSummary
} from '../student-progression';

// =============================================================================
// Helpers
// =============================================================================

/** Objectif minimal ; les champs non pertinents au test ont des valeurs neutres. */
function objective(over: Partial<ObjectiveSummary> = {}): ObjectiveSummary {
	return {
		id: 'o1',
		name: 'Fractions',
		theme_id: 't1',
		theme_name: 'Nombres et calculs',
		display_order: 1,
		has_scale: false,
		rang_max_acquired: 0,
		acquired_count: 0,
		total_count: 3,
		has_remediation: false,
		fsrs_badge: 'non_commencee',
		...over
	};
}

type QueryResult = { data: unknown; error: unknown };
type TableHandler = () => QueryResult;

/** Mock Supabase qui dispatche sur le nom de la table (convention `stats/__tests__`). */
function buildMock(tableHandlers: Record<string, TableHandler>) {
	const from = vi.fn().mockImplementation((table: string) => {
		const handler = tableHandlers[table];
		if (!handler) throw new Error(`Table inattendue dans le mock : ${table}`);
		const terminal = Promise.resolve().then(handler);
		const qb = {
			select: vi.fn(),
			eq: vi.fn(),
			in: vi.fn(),
			is: vi.fn(),
			not: vi.fn(),
			order: vi.fn(),
			maybeSingle: vi.fn().mockImplementation(handler),
			single: vi.fn().mockImplementation(handler),
			then: (onFulfilled: (v: QueryResult) => unknown) => terminal.then(onFulfilled)
		};
		for (const key of ['select', 'eq', 'in', 'is', 'not', 'order'] as const) {
			qb[key].mockReturnValue(qb);
		}
		return qb;
	});
	return { from } as unknown as Parameters<typeof getObjectivesProgression>[0];
}

// =============================================================================
// A. Agrégation des objectifs
// =============================================================================

describe('aggregateObjectiveStats', () => {
	// ⚠️ Le cas qui comptait faux : aucun point de production ne porte de `rang`,
	// donc TOUS les objectifs réels passent par cette branche.
	it('A1 — objectif SANS échelle entièrement acquis compte « atteint »', () => {
		const stats = aggregateObjectiveStats([
			objective({ has_scale: false, acquired_count: 3, total_count: 3 })
		]);
		expect(stats.atteint).toBe(1);
		expect(stats.non_commence).toBe(0);
		expect(stats.en_cours).toBe(0);
	});

	it('A2 — objectif SANS échelle partiellement acquis compte « en cours »', () => {
		const stats = aggregateObjectiveStats([
			objective({ has_scale: false, acquired_count: 1, total_count: 3 })
		]);
		expect(stats.en_cours).toBe(1);
		expect(stats.atteint).toBe(0);
	});

	it('A2bis — objectif SANS échelle sans acquisition compte « non commencé »', () => {
		const stats = aggregateObjectiveStats([
			objective({ has_scale: false, acquired_count: 0, total_count: 3 })
		]);
		expect(stats.non_commence).toBe(1);
	});

	it('A3 — objectif À ÉCHELLE : rang 4 → maîtrisé, 3 → atteint, 1-2 → en cours', () => {
		const stats = aggregateObjectiveStats([
			objective({ id: 'a', has_scale: true, rang_max_acquired: 4 }),
			objective({ id: 'b', has_scale: true, rang_max_acquired: 3 }),
			objective({ id: 'c', has_scale: true, rang_max_acquired: 2 }),
			objective({ id: 'd', has_scale: true, rang_max_acquired: 1 }),
			objective({ id: 'e', has_scale: true, rang_max_acquired: 0 })
		]);
		expect(stats).toMatchObject({ mastery: 1, atteint: 1, en_cours: 2, non_commence: 1 });
	});

	it("A3bis — un objectif SANS échelle n'atteint jamais « maîtrisé »", () => {
		// « Aller au-delà de l'attendu » n'a de sens que si une échelle le définit.
		const stats = aggregateObjectiveStats([
			objective({ has_scale: false, acquired_count: 5, total_count: 5 })
		]);
		expect(stats.mastery).toBe(0);
		expect(stats.atteint).toBe(1);
	});

	it('A4 — objectif sans aucun point actif compte « non commencé » (pas de NaN)', () => {
		const stats = aggregateObjectiveStats([
			objective({ has_scale: false, acquired_count: 0, total_count: 0 })
		]);
		expect(stats.non_commence).toBe(1);
		expect(Number.isFinite(stats.total)).toBe(true);
	});

	it("A5 — le total est le nombre réel d'objectifs, jamais une constante", () => {
		const vingt = Array.from({ length: 20 }, (_, i) => objective({ id: `o${i}` }));
		expect(aggregateObjectiveStats(vingt).total).toBe(20);

		const quatorze = Array.from({ length: 14 }, (_, i) => objective({ id: `o${i}` }));
		expect(aggregateObjectiveStats(quatorze).total).toBe(14);

		expect(aggregateObjectiveStats([]).total).toBe(0);
	});

	it('A6 — remédiation : état explicite OU badge FSRS `a_remedier`', () => {
		const stats = aggregateObjectiveStats([
			objective({ id: 'a', has_remediation: true }),
			objective({ id: 'b', fsrs_badge: 'a_remedier' }),
			objective({ id: 'c', fsrs_badge: 'a_renforcer' })
		]);
		expect(stats.remediation_count).toBe(2);
		expect(stats.to_reinforce_count).toBe(1);
	});
});

// =============================================================================
// B. Élève sans référentiel — les 39 de production (1_GEN, T_SPE, sans niveau)
// =============================================================================

describe('getObjectivesProgression — élève sans référentiel', () => {
	it('B6 — niveau non couvert par le référentiel : hasReferentiel=false, total 0', async () => {
		const supabase = buildMock({
			// `curriculum_themes` ne couvre que 6, 2 et 1_SPE en production.
			curriculum_themes: () => ({ data: [], error: null }),
			student_point_state_v: () => ({ data: [], error: null })
		});
		const progression = await getObjectivesProgression(supabase, 'student-1', 'T_SPE');
		expect(progression.hasReferentiel).toBe(false);
		expect(progression.stats.total).toBe(0);
		expect(progression.themes).toEqual([]);
	});

	it('B7 — `grade` NULL : même comportement, sans interroger la base', async () => {
		const supabase = buildMock({});
		const progression = await getObjectivesProgression(supabase, 'student-1', null);
		expect(progression.hasReferentiel).toBe(false);
		expect(progression.stats.total).toBe(0);
	});

	it('B8 — référentiel présent mais aucune acquisition : hasReferentiel=true', async () => {
		const supabase = buildMock({
			curriculum_themes: () => ({
				data: [
					{
						id: 't1',
						name: 'Nombres et calculs',
						display_order: 1,
						curriculum_objectives: [
							{
								id: 'o1',
								name: 'Fractions',
								display_order: 1,
								theme_id: 't1',
								curriculum_points: [
									{ id: 'p1', rang: null, archived_at: null },
									{ id: 'p2', rang: null, archived_at: null }
								]
							}
						]
					}
				],
				error: null
			}),
			student_point_state_v: () => ({ data: [], error: null }),
			question_template_points: () => ({ data: [], error: null })
		});
		const progression = await getObjectivesProgression(supabase, 'student-1', '6');
		// Le référentiel EXISTE : c'est l'élève qui n'a rien commencé.
		expect(progression.hasReferentiel).toBe(true);
		expect(progression.stats.total).toBe(1);
		expect(progression.stats.non_commence).toBe(1);
	});

	it('B9 — objectif entièrement acquis, sans échelle : compté atteint de bout en bout', async () => {
		const supabase = buildMock({
			curriculum_themes: () => ({
				data: [
					{
						id: 't1',
						name: 'Nombres et calculs',
						display_order: 1,
						curriculum_objectives: [
							{
								id: 'o1',
								name: 'Fractions',
								display_order: 1,
								theme_id: 't1',
								curriculum_points: [
									{ id: 'p1', rang: null, archived_at: null },
									{ id: 'p2', rang: null, archived_at: null }
								]
							}
						]
					}
				],
				error: null
			}),
			student_point_state_v: () => ({
				data: [
					{ point_id: 'p1', is_acquired: true, needs_remediation: false },
					{ point_id: 'p2', is_acquired: true, needs_remediation: false }
				],
				error: null
			}),
			question_template_points: () => ({ data: [], error: null })
		});
		const progression = await getObjectivesProgression(supabase, 'student-1', '6');
		expect(progression.stats.atteint).toBe(1);
		expect(progression.stats.non_commence).toBe(0);
	});

	it('B10 — les points archivés sont exclus du total', async () => {
		const supabase = buildMock({
			curriculum_themes: () => ({
				data: [
					{
						id: 't1',
						name: 'Nombres et calculs',
						display_order: 1,
						curriculum_objectives: [
							{
								id: 'o1',
								name: 'Fractions',
								display_order: 1,
								theme_id: 't1',
								curriculum_points: [
									{ id: 'p1', rang: null, archived_at: null },
									{ id: 'p2', rang: null, archived_at: '2026-01-01T00:00:00Z' }
								]
							}
						]
					}
				],
				error: null
			}),
			student_point_state_v: () => ({
				data: [{ point_id: 'p1', is_acquired: true, needs_remediation: false }],
				error: null
			}),
			question_template_points: () => ({ data: [], error: null })
		});
		const progression = await getObjectivesProgression(supabase, 'student-1', '6');
		const objectif = progression.themes[0].objectives[0];
		expect(objectif.total_count).toBe(1);
		expect(objectif.acquired_count).toBe(1);
		expect(progression.stats.atteint).toBe(1);
	});
});

// =============================================================================
// C. Compétences mathématiques
// =============================================================================

describe('getCompetencesProgression', () => {
	const competences = [
		{
			id: 'c1',
			code: 'chercher',
			name: 'Chercher',
			gloss_for_student: 'essayer',
			display_order: 1
		},
		{
			id: 'c2',
			code: 'calculer',
			name: 'Calculer',
			gloss_for_student: 'calculer',
			display_order: 2
		}
	];

	it('C8 — niveaux lus depuis `student_competence_level`', async () => {
		const supabase = buildMock({
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({
				data: [
					{ math_competence_id: 'c1', niveau: 'tres_bonne', task_count: 4 },
					{ math_competence_id: 'c2', niveau: 'fragile', task_count: 2 }
				],
				error: null
			})
		});
		const progression = await getCompetencesProgression(supabase, 'student-1');
		expect(progression.items).toHaveLength(2);
		expect(progression.items[0]).toMatchObject({
			code: 'chercher',
			niveau: 'tres_bonne',
			task_count: 4
		});
		expect(progression.stats).toMatchObject({ tres_bonne: 1, fragile: 1, with_data: 2, total: 2 });
	});

	it('C9 — aucune tâche saisie : with_data = 0 et tous les niveaux à insuffisante', async () => {
		const supabase = buildMock({
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({ data: [], error: null })
		});
		const progression = await getCompetencesProgression(supabase, 'student-1');
		expect(progression.stats.with_data).toBe(0);
		expect(progression.items.every((i) => i.niveau === 'insuffisante')).toBe(true);
		expect(progression.items.every((i) => i.task_count === 0)).toBe(true);
	});

	// ⚠️ Décor calqué sur la PRODUCTION, pas sur une forme commode :
	// `student_competence_level.niveau` est NOT NULL, et
	// `update_student_competence_level` écrit 'insuffisante' dès qu'il y a moins
	// de deux tâches. Une ligne {niveau:'insuffisante', task_count:0} existe donc
	// bel et bien — et c'est elle qui faisait diverger la tuile du panneau.
	it("C10 — une ligne 'insuffisante' sous le seuil de tâches ne compte pas comme observée", async () => {
		const supabase = buildMock({
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({
				data: [
					{ math_competence_id: 'c1', niveau: 'satisfaisante', task_count: 3 },
					{ math_competence_id: 'c2', niveau: 'insuffisante', task_count: 0 }
				],
				error: null
			})
		});
		const progression = await getCompetencesProgression(supabase, 'student-1');
		expect(progression.stats.with_data).toBe(1);
		expect(progression.stats.satisfaisante).toBe(1);
		// La ligne présente mais non observée ne gonfle aucun compteur de niveau.
		expect(progression.stats.insuffisante).toBe(0);
	});

	it('C11 — une seule tâche ne suffit pas : le seuil est celui du SQL (2)', async () => {
		const supabase = buildMock({
			math_competences: () => ({ data: competences, error: null }),
			student_competence_level: () => ({
				data: [
					{ math_competence_id: 'c1', niveau: 'fragile', task_count: 1 },
					{ math_competence_id: 'c2', niveau: 'fragile', task_count: 2 }
				],
				error: null
			})
		});
		const progression = await getCompetencesProgression(supabase, 'student-1');
		expect(progression.stats.with_data).toBe(1);
		expect(progression.stats.fragile).toBe(1);
	});
});
