/**
 * Chargement de la collection de Mathoux (`loadMathouCollection`), base simulée.
 *
 * La logique de stade et de regroupement est testée dans
 * `src/lib/mathoux/__tests__/collection-logic.test.ts` ; ici, ce qui est lu,
 * avec quels filtres, et ce qui arrive quand une lecture échoue. La RLS réelle
 * est prouvée en intégration (`tests/integration/mathoux-collection.test.ts`).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/srs/capacity-badge', () => ({
	computePointBadges: vi.fn()
}));

// Écriture de la mémoire : le client service et `rememberMathoux` sont simulés ; la
// lecture (`readMathouMemory`) reste la vraie, au client de l'élève simulé ci-dessous.
const SERVICE_CLIENT = { service: true };
vi.mock('$lib/server/serviceRoleClient', () => ({
	createServiceRoleClient: vi.fn(() => SERVICE_CLIENT)
}));
vi.mock('../memory', async (importOriginal) => ({
	...(await importOriginal<typeof import('../memory')>()),
	rememberMathoux: vi.fn()
}));

import { computePointBadges } from '$lib/server/srs/capacity-badge';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { MathouMemoryWriteError, rememberMathoux } from '../memory';
import { loadMathouCollection, loadMathouCollectionWithNews } from '../collection';
import { resolveTestLaunch } from '$lib/utils/test-launch';
import { trainingQuery } from '$lib/mathoux/collection-logic';

// =============================================================================
// Mock Supabase : chaque requête enregistre ses filtres, le handler y répond
// =============================================================================

type QueryResult = { data: unknown; error: unknown };
type Call = [method: string, ...args: unknown[]];
type Handler = (calls: Call[]) => QueryResult;

const STUDENT = 'eleve-1';

function buildMock(
	handlers: Record<string, Handler>,
	ancestors: () => QueryResult = () => ok([]),
	authUser: () => { data: { user: { id: string } | null }; error: unknown } = () => ({
		data: { user: { id: STUDENT } },
		error: null
	})
) {
	const queries: { table: string; calls: Call[] }[] = [];
	const from = vi.fn().mockImplementation((table: string) => {
		const handler = handlers[table];
		if (!handler) throw new Error(`Table inattendue dans le mock : ${table}`);
		const calls: Call[] = [];
		queries.push({ table, calls });
		const qb: Record<string, unknown> = {};
		for (const method of ['select', 'eq', 'in', 'is', 'not', 'order', 'range']) {
			qb[method] = (...args: unknown[]) => {
				calls.push([method, ...args]);
				return qb;
			};
		}
		qb.then = (onFulfilled: (v: QueryResult) => unknown) =>
			Promise.resolve().then(() => onFulfilled(handler(calls)));
		return qb;
	});
	const rpc = vi.fn().mockImplementation(() => Promise.resolve(ancestors()));
	const getUser = vi.fn().mockImplementation(() => Promise.resolve(authUser()));
	const supabase = { from, rpc, auth: { getUser } } as unknown as Parameters<
		typeof loadMathouCollection
	>[0];
	return { supabase, from, rpc, queries, getUser };
}

function has(calls: Call[], method: string, ...args: unknown[]): boolean {
	return calls.some(
		([m, ...rest]) => m === method && JSON.stringify(rest) === JSON.stringify(args)
	);
}

function ok(data: unknown): QueryResult {
	return { data, error: null };
}

/** Décor : une branche, deux notions ; p1 et p2 sur n1 (p2 via sous-notion), p3 sur n2 non tagué. */
function nominalHandlers(over: Partial<Record<string, Handler>> = {}): Record<string, Handler> {
	return {
		curriculum_points: (calls) =>
			has(calls, 'eq', 'grade', '1_SPE')
				? ok([
						{ id: 'p1', node_id: 'n1', grade: '1_SPE' },
						{ id: 'p2', node_id: 's1', grade: '1_SPE' },
						{ id: 'p3', node_id: 'n2', grade: '1_SPE' }
					])
				: ok([]),
		question_template_points: () => ok([{ point_id: 'p1' }, { point_id: 'p2' }]),
		classification_nodes: (calls) =>
			has(calls, 'eq', 'kind', 'subnotion')
				? ok([{ id: 's1', kind: 'subnotion', parent_id: 'n1', name: 'Somme', position: 0 }])
				: ok([
						{ id: 'b1', kind: 'branch', parent_id: null, name: 'Nombres', position: 0 },
						{ id: 'n1', kind: 'notion', parent_id: 'b1', name: 'Fractions', position: 0 },
						{ id: 'n2', kind: 'notion', parent_id: 'b1', name: 'Dérivation', position: 1 }
					]),
		student_point_state: () =>
			ok([{ point_id: 'p1', is_acquired: true, total_successes: 2, last_success_at: null }]),
		student_mathoux: () => ok([]),
		...over
	} as Record<string, Handler>;
}

beforeEach(() => {
	vi.mocked(computePointBadges).mockReset();
	vi.mocked(computePointBadges).mockResolvedValue(new Map());
	vi.mocked(rememberMathoux).mockReset();
	vi.mocked(rememberMathoux).mockResolvedValue(new Map());
	vi.mocked(createServiceRoleClient).mockClear();
});

const T0 = '2026-10-18T10:00:00.000001+00:00';

// =============================================================================
// Tests
// =============================================================================

describe('loadMathouCollection', () => {
	it('sans niveau : collection vide, aucune requête', async () => {
		const { supabase, from } = buildMock({});
		const collection = await loadMathouCollection(supabase, STUDENT, null);
		expect(collection.races).toEqual([]);
		expect(from).not.toHaveBeenCalled();
	});

	it('lit les points du niveau, non archivés, rattachés à un nœud', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const points = queries.find((q) => q.table === 'curriculum_points');
		expect(points).toBeDefined();
		expect(has(points!.calls, 'eq', 'grade', '1_SPE')).toBe(true);
		expect(has(points!.calls, 'is', 'archived_at', null)).toBe(true);
		expect(has(points!.calls, 'not', 'node_id', 'is', null)).toBe(true);
	});

	it('lit les états de L’ÉLÈVE de la session seulement', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const states = queries.find((q) => q.table === 'student_point_state');
		expect(has(states!.calls, 'eq', 'student_id', STUDENT)).toBe(true);
	});

	it('nominal : la sous-notion compte pour sa notion, le point non tagué est ignoré', async () => {
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');

		expect(collection.races).toHaveLength(1);
		const mathoux = collection.races[0].mathoux;
		// n2 n'a que p3, non tagué : pas de Mathou
		expect(mathoux.map((m) => m.notionId)).toEqual(['n1']);
		expect(mathoux[0]).toMatchObject({
			name: 'le Mathou des Fractions',
			workablePoints: 2,
			acquiredPoints: 1,
			growth: 'matou',
			asleep: false
		});
		// Les badges ne sont demandés que pour les points travaillables
		expect(computePointBadges).toHaveBeenCalledWith(supabase, STUDENT, ['p1', 'p2']);
	});

	it('sieste : un badge a_renforcer ou a_remedier endort le Mathou', async () => {
		vi.mocked(computePointBadges).mockResolvedValue(new Map([['p2', 'a_remedier']]));
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].asleep).toBe(true);
		expect(collection.counts).toEqual({ born: 1, napping: 1, toDiscover: 0 });
	});

	it('une réussite datée sans compteur suffit pour un chaton', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				student_point_state: () =>
					ok([
						{
							point_id: 'p2',
							is_acquired: false,
							total_successes: 0,
							last_success_at: '2026-10-01T00:00:00Z'
						}
					])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].growth).toBe('chaton');
	});

	it('aucun point tagué : collection vide, pas de badges demandés', async () => {
		const { supabase } = buildMock(nominalHandlers({ question_template_points: () => ok([]) }));
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races).toEqual([]);
		expect(computePointBadges).not.toHaveBeenCalled();
	});

	it('une lecture d’états en échec lève (une panne ne se lit pas « Chatterie vide »)', async () => {
		const { supabase } = buildMock(
			nominalHandlers({ student_point_state: () => ({ data: null, error: { message: 'boom' } }) })
		);
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/boom/);
	});

	it('parcours : demande les niveaux antérieurs et lit les points de chacun', async () => {
		const { supabase, rpc, queries } = buildMock(nominalHandlers(), () => ok(['2', '3']));
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(rpc).toHaveBeenCalledWith('grade_ancestors', { p_grade: '1_SPE' });
		const grades = queries
			.filter((q) => q.table === 'curriculum_points')
			.map((q) => q.calls.find(([m, col]) => m === 'eq' && col === 'grade')?.[2]);
		expect(grades.sort()).toEqual(['1_SPE', '2', '3']);
	});

	it('parcours : une notion acquise en 1re spé reste grand matou pour un élève de Tle spé', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				curriculum_points: (calls) =>
					has(calls, 'eq', 'grade', '1_SPE')
						? ok([{ id: 'p1', node_id: 'n1', grade: '1_SPE' }])
						: has(calls, 'eq', 'grade', 'T_SPE')
							? ok([{ id: 'p2', node_id: 's1', grade: 'T_SPE' }])
							: ok([])
			}),
			() => ok(['1_SPE', '2'])
		);
		const collection = await loadMathouCollection(supabase, STUDENT, 'T_SPE');
		expect(collection.races[0].mathoux[0]).toMatchObject({
			growth: 'grand_matou',
			byGrade: [
				{ grade: '1_SPE', growth: 'grand_matou' },
				{ grade: 'T_SPE', growth: 'a_decouvrir' }
			]
		});
	});

	it('parcours illisible : lève (pas de repli silencieux sur le seul niveau courant)', async () => {
		const { supabase } = buildMock(nominalHandlers(), () => ({
			data: null,
			error: { message: 'rpc refusée' }
		}));
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/rpc refusée/);
	});

	it('travaillable = tagué par un modèle PUBLIÉ (un brouillon ne suffit pas)', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const tags = queries.filter((q) => q.table === 'question_template_points');
		expect(tags.length).toBeGreaterThan(0);
		for (const q of tags) {
			const select = q.calls.find(([m]) => m === 'select')?.[1];
			expect(select).toMatch(/question_templates!inner\(status[,)]/);
			expect(has(q.calls, 'eq', 'question_templates.status', 'published')).toBe(true);
		}
	});

	it('« Faire grandir » : les modèles viennent de la MÊME lecture des tags (aucune requête en plus)', async () => {
		const tpl = (id: string, domain: string) => ({
			status: 'published',
			theme: 'Nombres',
			domain,
			subdomain: null,
			level: 1,
			delay: null
		});
		const { supabase, queries } = buildMock(
			nominalHandlers({
				question_template_points: () =>
					ok([
						{ point_id: 'p1', template_id: 't1', question_templates: tpl('t1', 'Acquis') },
						{ point_id: 'p2', template_id: 't2', question_templates: tpl('t2', 'Non acquis') }
					])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const select = queries
			.find((q) => q.table === 'question_template_points')
			?.calls.find(([m]) => m === 'select')?.[1];
		expect(select).toMatch(
			/question_templates!inner\(status, theme, domain, subdomain, level, delay\)/
		);
		expect(queries.filter((q) => q.table === 'question_template_points')).toHaveLength(1);

		const [mathou] = collection.races[0].mathoux;
		const launch = resolveTestLaunch(
			new URLSearchParams(trainingQuery(mathou.trainingCategories) ?? '')
		);
		expect(launch.kind).toBe('start');
		if (launch.kind !== 'start') return;
		// p2 (non acquis) avant p1 (acquis)
		expect(launch.categories.map((c) => c.category.domain)).toEqual(['Non acquis', 'Acquis']);
	});

	it('une ligne de tag sans modèle lisible ne casse rien : pas de lien « Faire grandir »', async () => {
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].trainingCategories).toBeNull();
	});

	it('les états ne sont lus que pour les points travaillables', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const states = queries.filter((q) => q.table === 'student_point_state');
		const ids = states.flatMap(
			(q) => (q.calls.find(([m, col]) => m === 'in' && col === 'point_id')?.[2] as string[]) ?? []
		);
		expect(ids.sort()).toEqual(['p1', 'p2']);
	});

	it('tags lus par pages de 1 000 : un lot de plus de 1 000 lignes n’est pas tronqué', async () => {
		const page1 = Array.from({ length: 1000 }, () => ({ point_id: 'p1' }));
		const { supabase, queries } = buildMock(
			nominalHandlers({
				question_template_points: (calls) =>
					has(calls, 'range', 0, 999) ? ok(page1) : ok([{ point_id: 'p2' }])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		// p2 n'apparaît qu'en 2e page : sans pagination, il ne serait pas travaillable
		expect(collection.races[0].mathoux[0].workablePoints).toBe(2);
		const ranges = queries
			.filter((q) => q.table === 'question_template_points')
			.map((q) => q.calls.find(([m]) => m === 'range')?.slice(1));
		expect(ranges).toEqual([
			[0, 999],
			[1000, 1999]
		]);
	});

	it('une lecture des points en échec lève', async () => {
		const { supabase } = buildMock({
			curriculum_points: () => ({ data: null, error: { message: 'refus' } }),
			student_mathoux: () => ok([])
		});
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/refus/);
	});
	// ---------------------------------------------------------------------------
	// Mémoire (§ 9, « Changement d'année et oubli »)
	// ---------------------------------------------------------------------------

	it('mémoire : lit les lignes `student_mathoux` de L’ÉLÈVE, au client de l’élève', async () => {
		const { supabase, queries } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const memory = queries.find((q) => q.table === 'student_mathoux');
		expect(memory).toBeDefined();
		expect(has(memory!.calls, 'eq', 'student_id', STUDENT)).toBe(true);
	});

	it('mémoire : un matou mémorisé dont le calcul redescend reste matou (sans point perdu, il ne dort pas)', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				// p1 n'est plus acquis : le calcul dit chaton
				student_point_state: () =>
					ok([{ point_id: 'p1', is_acquired: false, total_successes: 2, last_success_at: null }]),
				student_mathoux: () =>
					ok([{ notion_id: 'n1', best_stage: 'matou', starred_grades: [], updated_at: T0 }])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0]).toMatchObject({ growth: 'matou', asleep: false });
		// Un stade en baisse n'apprend rien à la mémoire : aucune écriture
		expect(createServiceRoleClient).not.toHaveBeenCalled();
		expect(rememberMathoux).not.toHaveBeenCalled();
	});

	it('mémoire : un Mathou né sans ligne est retenu, au client service, pour l’élève de la session', async () => {
		const { supabase } = buildMock(nominalHandlers());
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(rememberMathoux).toHaveBeenCalledTimes(1);
		expect(rememberMathoux).toHaveBeenCalledWith(
			SERVICE_CLIENT,
			STUDENT,
			[{ notionId: 'n1', bestStage: 'matou', starredGrades: [] }],
			new Map()
		);
	});

	it('mémoire : rien de nouveau → aucune écriture', async () => {
		const { supabase } = buildMock(
			nominalHandlers({
				student_mathoux: () =>
					ok([{ notion_id: 'n1', best_stage: 'matou', starred_grades: [], updated_at: T0 }])
			})
		);
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(createServiceRoleClient).not.toHaveBeenCalled();
		expect(rememberMathoux).not.toHaveBeenCalled();
	});

	it('mémoire : une écriture en échec ne casse pas l’affichage', async () => {
		vi.mocked(rememberMathoux).mockRejectedValue(new Error('écriture refusée'));
		const { supabase } = buildMock(nominalHandlers());
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].growth).toBe('matou');
	});

	it('nouveautés : ce que la mémoire a écrit est annoncé (naissance, premier passage)', async () => {
		vi.mocked(rememberMathoux).mockResolvedValue(new Map([['n1', null]]));
		const { supabase } = buildMock(nominalHandlers());
		const { news } = await loadMathouCollectionWithNews(supabase, STUDENT, '1_SPE');
		expect(news).toEqual({
			firstVisit: true,
			total: 1,
			items: [
				{
					kind: 'birth',
					notionId: 'n1',
					name: expect.any(String),
					raceIndex: 0,
					stage: 'matou',
					newStars: []
				}
			]
		});
	});

	it('nouveautés : une croissance par rapport à la mémoire lue', async () => {
		vi.mocked(rememberMathoux).mockResolvedValue(
			new Map([['n1', { bestStage: 'chaton', starredGrades: [] }]])
		);
		const { supabase } = buildMock(
			nominalHandlers({
				student_mathoux: () =>
					ok([{ notion_id: 'n1', best_stage: 'chaton', starred_grades: [], updated_at: T0 }])
			})
		);
		const { news } = await loadMathouCollectionWithNews(supabase, STUDENT, '1_SPE');
		expect(news.firstVisit).toBe(false);
		expect(news.items).toEqual([expect.objectContaining({ kind: 'growth', stage: 'matou' })]);
	});

	it('nouveautés : déjà écrite par un autre calcul → rien à annoncer', async () => {
		vi.mocked(rememberMathoux).mockResolvedValue(new Map());
		const { supabase } = buildMock(nominalHandlers());
		const { news } = await loadMathouCollectionWithNews(supabase, STUDENT, '1_SPE');
		expect(news).toEqual({ firstVisit: false, total: 0, items: [] });
	});

	it('nouveautés : une écriture en échec n’annonce rien', async () => {
		vi.mocked(rememberMathoux).mockRejectedValue(new Error('écriture refusée'));
		const { supabase } = buildMock(nominalHandlers());
		const { collection, news } = await loadMathouCollectionWithNews(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0].growth).toBe('matou');
		expect(news.total).toBe(0);
	});

	it('nouveautés : une panne APRÈS une naissance écrite annonce quand même la naissance', async () => {
		vi.mocked(rememberMathoux).mockRejectedValue(
			new MathouMemoryWriteError(new Error('mise à jour refusée'), new Map([['n1', null]]))
		);
		const { supabase } = buildMock(nominalHandlers());
		const { news } = await loadMathouCollectionWithNews(supabase, STUDENT, '1_SPE');
		expect(news.items).toEqual([expect.objectContaining({ kind: 'birth', notionId: 'n1' })]);
	});

	it('nouveautés : sans niveau, rien', async () => {
		const { supabase } = buildMock({});
		const { news } = await loadMathouCollectionWithNews(supabase, STUDENT, null);
		expect(news.total).toBe(0);
	});

	it('mémoire : une lecture de la mémoire en échec lève', async () => {
		const { supabase } = buildMock(
			nominalHandlers({ student_mathoux: () => ({ data: null, error: { message: 'mémoire' } }) })
		);
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(/mémoire/);
	});

	it('mémoire : un Mathou mémorisé sans point travaillable reste affiché, sans lire d’états', async () => {
		const { supabase, queries } = buildMock(
			nominalHandlers({
				question_template_points: () => ok([]),
				student_mathoux: () =>
					ok([
						{ notion_id: 'n2', best_stage: 'grand_matou', starred_grades: ['2'], updated_at: T0 }
					])
			})
		);
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux).toEqual([
			expect.objectContaining({
				notionId: 'n2',
				growth: 'grand_matou',
				stars: ['2'],
				asleep: false
			})
		]);
		expect(queries.some((q) => q.table === 'student_point_state')).toBe(false);
		expect(computePointBadges).not.toHaveBeenCalled();
	});
	// ---------------------------------------------------------------------------
	// Identité (audit) : l'élève passé est l'utilisateur du client, sinon rien n'est écrit
	// ---------------------------------------------------------------------------

	it('identité : un studentId qui n’est pas l’utilisateur du client lève, sans écrire', async () => {
		const { supabase, getUser } = buildMock(nominalHandlers(), undefined, () => ({
			data: { user: { id: 'un-autre-eleve' } },
			error: null
		}));
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(
			/n’est pas l’utilisateur de la session/
		);
		expect(getUser).toHaveBeenCalled();
		expect(createServiceRoleClient).not.toHaveBeenCalled();
		expect(rememberMathoux).not.toHaveBeenCalled();
	});

	it('identité : un client sans utilisateur (ou en erreur) lève, sans écrire', async () => {
		const { supabase } = buildMock(nominalHandlers(), undefined, () => ({
			data: { user: null },
			error: { message: 'jeton expiré' }
		}));
		await expect(loadMathouCollection(supabase, STUDENT, '1_SPE')).rejects.toThrow(
			/n’est pas l’utilisateur de la session/
		);
		expect(rememberMathoux).not.toHaveBeenCalled();
	});
	// ---------------------------------------------------------------------------
	// Point perdu (règle d'oubli, David 2026-10-18) : seuil du régime atteint, non acquis
	// ---------------------------------------------------------------------------

	function lostCase(regime: string, state: Record<string, unknown>) {
		return buildMock(
			nominalHandlers({
				curriculum_points: (calls) =>
					has(calls, 'eq', 'grade', '1_SPE')
						? ok([{ id: 'p1', node_id: 'n1', grade: '1_SPE', regime_acquisition: regime }])
						: ok([]),
				question_template_points: () => ok([{ point_id: 'p1' }]),
				student_point_state: () =>
					ok([
						{
							point_id: 'p1',
							is_acquired: false,
							total_successes: 0,
							distinct_template_successes: 0,
							last_success_at: '2026-10-01T00:00:00Z',
							...state
						}
					])
			})
		);
	}

	it('point perdu : lit le régime du point et les réussites distinctes', async () => {
		const { supabase, queries } = lostCase('diversite', {});
		await loadMathouCollection(supabase, STUDENT, '1_SPE');
		const points = queries.find((q) => q.table === 'curriculum_points');
		expect(points!.calls.find(([m]) => m === 'select')?.[1]).toMatch(/regime_acquisition/);
		const states = queries.find((q) => q.table === 'student_point_state');
		expect(states!.calls.find(([m]) => m === 'select')?.[1]).toMatch(/distinct_template_successes/);
	});

	it('point perdu, régime diversité (2 modèles réussis, non acquis) → sieste', async () => {
		const { supabase } = lostCase('diversite', {
			distinct_template_successes: 2,
			total_successes: 2
		});
		const collection = await loadMathouCollection(supabase, STUDENT, '1_SPE');
		expect(collection.races[0].mathoux[0]).toMatchObject({ growth: 'chaton', asleep: true });
	});

	it('point perdu, régime répétition (5 réussites, non acquis) → sieste ; 4 → pas de sieste', async () => {
		const perdu = lostCase('fluence', { total_successes: 5, distinct_template_successes: 1 });
		const c1 = await loadMathouCollection(perdu.supabase, STUDENT, '1_SPE');
		expect(c1.races[0].mathoux[0].asleep).toBe(true);
		const enCours = lostCase('fluence', { total_successes: 4, distinct_template_successes: 4 });
		const c2 = await loadMathouCollection(enCours.supabase, STUDENT, '1_SPE');
		expect(c2.races[0].mathoux[0].asleep).toBe(false);
	});
});
