/**
 * Tests pour `src/lib/server/progression/student-progression.ts`.
 *
 * Ce module est la SOURCE UNIQUE de l'agrégation de progression : la tuile du
 * dashboard et la page `/dashboard/student/progression` le consomment tous les
 * deux.
 *
 * Axe 1 sur l'arbre des notions (C5, étape 3, PR D — validé par David le
 * 2026-10-21) : le programme du niveau de l'élève par branche > notion ; points
 * archivés exclus ; points sans modèle tagué comptés (Q1) ; pas de « maîtrisé »
 * (aucun point neuf ne porte de rang, Q3).
 *
 * Spec : docs/archive/wip/progression-eleve-progress.md §Comportements attendus
 */

import { describe, it, expect, vi } from 'vitest';
import { createFakeSupabase, type Call } from '$lib/server/__tests__/helpers/fake-supabase';
import {
	answerProgramme,
	P_ADDITION,
	P_SANS_NIVEAU,
	P_DECIMAL,
	P_FRACTION,
	P_QUATRIEME,
	P_TRIANGLE_ARCHIVE
} from '$lib/server/__tests__/helpers/fake-programme';
import {
	aggregateNotionStats,
	getNotionsProgression,
	getNotionDetail,
	getCompetencesProgression,
	type NotionSummary
} from '../student-progression';

// =============================================================================
// Helpers
// =============================================================================

/** Notion minimale ; les champs non pertinents au test ont des valeurs neutres. */
function notion(over: Partial<NotionSummary> = {}): NotionSummary {
	return {
		id: 'n1',
		name: 'Fractions',
		branch_id: 'b1',
		branch_name: 'Nombres',
		acquired_count: 0,
		total_count: 3,
		has_remediation: false,
		fsrs_badge: 'non_commencee',
		...over
	};
}

type StateRow = { point_id: string; is_acquired: boolean; needs_remediation: boolean };

/**
 * Faux client : l'arbre de `fake-programme` (5e : Fractions avec sous-notion
 * Addition, Décimaux ; Triangles n'a qu'un point archivé), l'état de l'élève,
 * les tags donnés et les listes d'automatismes.
 */
function programmeClient(
	states: StateRow[] = [],
	{
		taggedPointIds = [] as string[],
		automatismes = [] as { point_id: string; grade: string }[]
	} = {}
) {
	return createFakeSupabase((table, calls: Call[]) => {
		if (table === 'curriculum_points' && calls[0]?.args[0] === 'id, kind') {
			const ids = (calls.find((c) => c.method === 'in')?.args[1] as string[]) ?? [];
			return {
				data: ids.map((id) => ({ id, kind: id === P_ADDITION ? 'algorithme' : 'savoir_faire' }))
			};
		}
		const programme = answerProgramme(table, calls);
		if (programme) return programme;
		switch (table) {
			case 'student_point_state_v':
				return { data: states };
			case 'question_template_points':
				return {
					data: taggedPointIds.map((point_id) => ({ point_id, template_id: `t-${point_id}` }))
				};
			case 'srs_card_stats':
				return { data: [] };
			case 'curriculum_point_automatismes':
				return { data: automatismes };
			default:
				throw new Error(`Table inattendue : ${table}`);
		}
	});
}

// =============================================================================
// A. Agrégation des notions
// =============================================================================

describe('aggregateNotionStats', () => {
	it('A1 — notion entièrement acquise compte « atteint »', () => {
		const stats = aggregateNotionStats([notion({ acquired_count: 3, total_count: 3 })]);
		expect(stats).toMatchObject({ atteint: 1, en_cours: 0, non_commence: 0 });
	});

	it('A2 — notion partiellement acquise compte « en cours »', () => {
		const stats = aggregateNotionStats([notion({ acquired_count: 1, total_count: 3 })]);
		expect(stats).toMatchObject({ atteint: 0, en_cours: 1, non_commence: 0 });
	});

	it('A3 — notion sans acquisition compte « non commencé »', () => {
		const stats = aggregateNotionStats([notion({ acquired_count: 0, total_count: 3 })]);
		expect(stats.non_commence).toBe(1);
	});

	it('A4 — notion sans point compte « non commencé » (pas de NaN)', () => {
		const stats = aggregateNotionStats([notion({ acquired_count: 0, total_count: 0 })]);
		expect(stats.non_commence).toBe(1);
		expect(stats.total).toBe(1);
	});

	it('A5 — plus de compteur « maîtrisé » (Q3)', () => {
		expect(aggregateNotionStats([])).not.toHaveProperty('mastery');
	});

	it('A6 — remédiation : état explicite OU badge FSRS `a_remedier`', () => {
		const stats = aggregateNotionStats([
			notion({ id: 'a', has_remediation: true }),
			notion({ id: 'b', fsrs_badge: 'a_remedier' }),
			notion({ id: 'c', fsrs_badge: 'a_renforcer' })
		]);
		expect(stats.remediation_count).toBe(2);
		expect(stats.to_reinforce_count).toBe(1);
	});
});

// =============================================================================
// B. Programme de l'élève, branche > notion
// =============================================================================

describe('getNotionsProgression', () => {
	it("B1 — branche > notion du niveau de l'élève, archivés et autres niveaux exclus", async () => {
		const { client } = programmeClient();
		const progression = await getNotionsProgression(client, 'student-1', '5');

		expect(progression.hasProgramme).toBe(true);
		expect(progression.branches.map((b) => b.name)).toEqual(['Nombres']);
		const notions = progression.branches[0].notions;
		expect(notions.map((n) => n.name)).toEqual(['Fractions', 'Décimaux']);
		// Fractions : point posé sur la notion + point de sa sous-notion ; pas le point de 4e.
		expect(notions[0].total_count).toBe(2);
		expect(progression.stats.total).toBe(2);
	});

	it('B2 — les points sans modèle tagué comptent dans le total (Q1)', async () => {
		const { client } = programmeClient(
			[{ point_id: P_FRACTION, is_acquired: true, needs_remediation: false }],
			{ taggedPointIds: [P_FRACTION] }
		);
		const progression = await getNotionsProgression(client, 'student-1', '5');
		const fractions = progression.branches[0].notions[0];
		expect(fractions).toMatchObject({ acquired_count: 1, total_count: 2 });
		expect(progression.stats).toMatchObject({ en_cours: 1, non_commence: 1, atteint: 0 });
	});

	it('B3 — notion entièrement acquise : atteinte de bout en bout', async () => {
		const { client } = programmeClient([
			{ point_id: P_DECIMAL, is_acquired: true, needs_remediation: false }
		]);
		const progression = await getNotionsProgression(client, 'student-1', '5');
		expect(progression.stats).toMatchObject({ atteint: 1, non_commence: 1 });
	});

	it("B4 — l'état d'un point hors programme (sans niveau, archivé, autre niveau) ne compte pas", async () => {
		const { client } = programmeClient([
			{ point_id: P_SANS_NIVEAU, is_acquired: true, needs_remediation: true },
			{ point_id: P_TRIANGLE_ARCHIVE, is_acquired: true, needs_remediation: false },
			{ point_id: P_QUATRIEME, is_acquired: true, needs_remediation: false }
		]);
		const progression = await getNotionsProgression(client, 'student-1', '5');
		expect(progression.stats).toMatchObject({
			total: 2,
			atteint: 0,
			en_cours: 0,
			remediation_count: 0
		});
	});

	it("B5 — remédiation d'un point → notion à remédier", async () => {
		const { client } = programmeClient([
			{ point_id: P_ADDITION, is_acquired: false, needs_remediation: true }
		]);
		const progression = await getNotionsProgression(client, 'student-1', '5');
		expect(progression.branches[0].notions[0].has_remediation).toBe(true);
		expect(progression.stats.remediation_count).toBe(1);
	});

	it('B6 — niveau sans aucun point actif : hasProgramme=false, total 0', async () => {
		const { client } = programmeClient();
		const progression = await getNotionsProgression(client, 'student-1', 'T_SPE');
		expect(progression.hasProgramme).toBe(false);
		expect(progression.stats.total).toBe(0);
		expect(progression.branches).toEqual([]);
	});

	it('B7 — `grade` NULL : même comportement, sans interroger la base', async () => {
		const { client, queries } = programmeClient();
		const progression = await getNotionsProgression(client, 'student-1', null);
		expect(progression.hasProgramme).toBe(false);
		expect(queries).toEqual([]);
	});
});

// =============================================================================
// B bis. Page d'une notion
// =============================================================================

describe('getNotionDetail', () => {
	it("D1 — points de la notion dans l'ordre du BO, sous-notion nommée, état et entraînement", async () => {
		const { client } = programmeClient(
			[{ point_id: P_ADDITION, is_acquired: true, needs_remediation: false }],
			{ taggedPointIds: [P_ADDITION], automatismes: [{ point_id: P_FRACTION, grade: '5' }] }
		);
		const detail = await getNotionDetail(client, 'student-1', '5', 'n-fractions');

		expect(detail).not.toBeNull();
		expect(detail).toMatchObject({
			name: 'Fractions',
			branch_name: 'Nombres',
			acquired_count: 1,
			total_count: 2
		});
		expect(detail?.points.map((p) => [p.id, p.subnotionName, p.trainable, p.is_acquired])).toEqual([
			[P_FRACTION, null, false, false],
			[P_ADDITION, 'Addition', true, true]
		]);
		expect(detail?.points[0].automatisme_grades).toEqual(['5']);
		expect(detail?.points[1].kind).toBe('algorithme');
	});

	it("D2 — notion sans point actif du niveau de l'élève : null (404)", async () => {
		const { client } = programmeClient();
		// Triangles n'a qu'un point archivé ; Fractions n'est pas une notion de 6e ici.
		expect(await getNotionDetail(client, 'student-1', '5', 'n-triangles')).toBeNull();
		expect(await getNotionDetail(client, 'student-1', '6', 'n-fractions')).toBeNull();
		expect(await getNotionDetail(client, 'student-1', '5', 'inconnue')).toBeNull();
	});

	it('D3 — élève sans niveau : null, sans interroger la base', async () => {
		const { client, queries } = programmeClient();
		expect(await getNotionDetail(client, 'student-1', null, 'n-fractions')).toBeNull();
		expect(queries).toEqual([]);
	});
});

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
	return { from } as unknown as Parameters<typeof getCompetencesProgression>[0];
}

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
