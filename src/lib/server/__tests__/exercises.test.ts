/**
 * Server Functions Tests - Exercise Bank
 * =======================================
 *
 * Unit tests for exercise server functions.
 * These tests use mocked Supabase client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, type Mock } from 'vitest';
import {
	getExercises,
	getExercise,
	createExercise,
	updateExercise,
	deleteExercise,
	getTeacherExercises,
	EXERCISE_NOT_DELETED
} from '../exercises';
import type { Database } from '#lib/types/database.ts';
import type { ExerciseVersionContent } from '#lib/types/database-helpers.ts';

// Stub the tag-resolution helpers so tests don't need to mock junction queries.
// Individual tests that need specific return values can override via mockResolvedValueOnce.
vi.mock('#lib/server/resource-tags.ts', () => ({
	syncResourceTags: vi.fn().mockResolvedValue(undefined),
	fetchResourceTagNames: vi.fn().mockResolvedValue([]),
	fetchTagNamesForResources: vi.fn().mockResolvedValue(new Map()),
	fetchResourceIdsByAnyTag: vi.fn().mockResolvedValue([])
}));

import { fetchResourceIdsByAnyTag, fetchResourceTagNames } from '#lib/server/resource-tags.ts';

// Un exercice tel que le code le rend : fiche d'identité + contenu de sa version (ADR 0044)
type ExerciseRow = Database['public']['Tables']['exercises']['Row'] & ExerciseVersionContent;

// Mock Supabase client
const createMockSupabase = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		neq: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		overlaps: vi.fn().mockReturnThis(),
		textSearch: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis()
	};

	// Table `exercise_versions` (ADR 0044) : le contenu d'un exercice y vit, pas sur `exercises`.
	// `order` rend les versions lues (dernière d'abord), `select` rend la ligne écrite.
	const versionsQuery = {
		select: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis()
	};

	// RPC `latest_exercise_versions` : la base rend UNE ligne par exercice (la dernière version).
	const latestQuery = { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
	// RPC `save_exercise_with_version` : identité + contenu écrits ensemble, rend la version écrite.
	const saveQuery = {
		select: vi.fn().mockReturnThis(),
		single: vi.fn().mockResolvedValue({ data: null, error: null })
	};
	const rpc = vi.fn((name: string) =>
		name === 'latest_exercise_versions' ? latestQuery : saveQuery
	);

	return {
		from: vi.fn((table: string) => (table === 'exercise_versions' ? versionsQuery : mockQuery)),
		rpc,
		__latestQuery: latestQuery,
		__saveQuery: saveQuery,
		__mockQuery: mockQuery, // For internal test access
		__versionsQuery: versionsQuery
	};
};

/** Une ligne d'`exercise_versions` telle que les lectures la rendent. */
function versionRow(exerciseId: string, overrides: Record<string, unknown> = {}) {
	return {
		id: `version-${exerciseId}`,
		number: 1,
		exercise_id: exerciseId,
		variations: [
			{ label: 'default', statement_md: 'Énoncé de la version', solution_md: 'Corrigé' }
		],
		shared: null,
		generic_functions: null,
		...overrides
	};
}

describe('getExercises', () => {
	it('should fetch exercises with default pagination', async () => {
		const mockSupabase = createMockSupabase() as any;
		const mockData: ExerciseRow[] = [
			{
				id: '1',
				title: 'Test Exercise',
				source: 'Test Book',
				source_type_id: null,
				category: 'automatisme',
				grades: ['3'],
				topic: 'Algèbre',
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				created_by: 'user-123',
				distribution_mode: 'on_demand',
				is_public: false,
				search_indexed: false,
				variables: {},
				resources: {},
				slug: null,
				generic_functions: null,
				translations: null,
				shared: null,
				variations: [
					{
						label: 'default',
						statement_md: 'Test statement',
						solution_md: 'Test solution'
					}
				]
			}
		];

		// Return result with count metadata
		mockSupabase.__mockQuery.range.mockResolvedValue({
			data: mockData,
			error: null,
			count: 1
		});
		// Le contenu vient de la dernière version, pas des anciennes colonnes de la ligne
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('1', { number: 2, variations: [{ label: 'v2' }] })],
			error: null
		});

		const result = await getExercises(mockSupabase, {}, { page: 1, limit: 50 });

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.rpc).toHaveBeenCalledWith('latest_exercise_versions', {
			p_exercise_ids: ['1']
		});
		expect(result.data?.[0].variations).toEqual([{ label: 'v2' }]);
		expect(result.error).toBeNull();
		expect(result.count).toBe(1);
		expect(result.page).toBe(1);
		expect(result.limit).toBe(50);
	});

	it('should apply category filter', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { category: 'automatisme' });

		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('category', 'automatisme');
	});

	it('should apply tags filter via junction (fetchResourceIdsByAnyTag)', async () => {
		const mockSupabase = createMockSupabase() as any;
		// fetchResourceIdsByAnyTag returns matching ids; then .in() restricts the query.
		(fetchResourceIdsByAnyTag as Mock).mockResolvedValueOnce(['ex-1', 'ex-2']);
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { tags: ['algèbre', 'équations'] });

		// Signature unifiée : le type de ressource remplace les deux noms de tables.
		expect(fetchResourceIdsByAnyTag).toHaveBeenCalledWith(mockSupabase, 'exercise', [
			'algèbre',
			'équations'
		]);
		expect(mockSupabase.__mockQuery.in).toHaveBeenCalledWith('id', ['ex-1', 'ex-2']);
	});

	it('should apply grades filter with overlaps', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { grades: ['3', '2'] });

		expect(mockSupabase.__mockQuery.overlaps).toHaveBeenCalledWith('grades', ['3', '2']);
	});

	it('should handle pagination correctly', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 100 });

		const result = await getExercises(mockSupabase, {}, { page: 2, limit: 20 });

		expect(mockSupabase.__mockQuery.range).toHaveBeenCalledWith(20, 39);
		expect(result.page).toBe(2);
		expect(result.limit).toBe(20);
		expect(result.totalPages).toBe(5); // 100 / 20
	});

	it('should enforce max limit of 100', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		const result = await getExercises(mockSupabase, {}, { page: 1, limit: 200 });

		expect(result.limit).toBe(100);
		expect(mockSupabase.__mockQuery.range).toHaveBeenCalledWith(0, 99);
	});
});

describe('getExercise', () => {
	it('should fetch a single exercise by ID and include tags from junction', async () => {
		const mockSupabase = createMockSupabase() as any;
		const mockExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Test Exercise',
			source: 'Test Book',
			source_type_id: null,
			category: 'automatisme',
			grades: ['3'],
			topic: 'Algèbre',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test statement',
					solution_md: 'Test solution'
				}
			]
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: mockExercise, error: null });
		// La base rend UNE ligne par exercice : la dernière version (numéro 2) fait foi pour le contenu
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123', { number: 2, variations: [{ label: 'v2' }] })],
			error: null
		});
		// Simulate the junction returning a resolved tag name.
		(fetchResourceTagNames as Mock).mockResolvedValueOnce(['algèbre']);

		const result = await getExercise(mockSupabase, 'ex-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('id', 'ex-123');
		// Contenu : celui de la dernière version, pas l'ancien `variations` de la ligne
		expect(mockExercise.variations).not.toEqual([{ label: 'v2' }]);
		expect(result.data?.variations).toEqual([{ label: 'v2' }]);
		expect(mockSupabase.rpc).toHaveBeenCalledWith('latest_exercise_versions', {
			p_exercise_ids: ['ex-123']
		});
		// Tags come from the junction helper, not the row column.
		expect(result.data?.tags).toEqual(['algèbre']);
		expect(result.error).toBeNull();
	});

	it('should handle not found error', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: null,
			error: { message: 'Not found' }
		});

		const result = await getExercise(mockSupabase, 'nonexistent');

		expect(result.data).toBeNull();
		expect(result.error).toBeDefined();
	});
});

describe('createExercise', () => {
	it('should create a new exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const newExercise = {
			category: 'automatisme' as const,
			tags: ['algèbre'],
			variations: [
				{
					label: 'default',
					statement_md: 'Test statement',
					solution_md: 'Test solution'
				}
			]
		};

		const createdExercise: ExerciseRow = {
			id: 'new-ex-123',
			category: 'automatisme',
			title: null,
			source: null,
			source_type_id: null,
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test statement',
					solution_md: 'Test solution'
				}
			]
		};

		// L'identité est insérée dans `exercises` (sans contenu : l'ancien `variations` de la ligne
		// rendue ne doit pas ressortir), la version 1 dans `exercise_versions`.
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: { ...createdExercise, variations: [{ label: 'ancien' }] },
			error: null
		});
		mockSupabase.__versionsQuery.select.mockResolvedValue({
			data: [versionRow('new-ex-123', { variations: newExercise.variations })],
			error: null
		});

		const result = await createExercise(mockSupabase, newExercise, 'user-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.from).toHaveBeenCalledWith('exercise_versions');
		// Le contenu part dans la version 1, numéro 1
		expect(mockSupabase.__versionsQuery.insert).toHaveBeenCalledWith({
			exercise_id: 'new-ex-123',
			number: 1,
			created_by: 'user-123',
			variations: newExercise.variations,
			shared: null,
			generic_functions: null
		});
		expect(result.data?.variations).toEqual(newExercise.variations);
		// `tags` is stripped from the INSERT — it goes through the junction instead.
		expect(mockSupabase.__mockQuery.insert).toHaveBeenCalledWith({
			category: newExercise.category,
			distribution_mode: 'on_demand', // Default value
			variables: undefined, // Empty variables array becomes undefined
			created_by: 'user-123',
			search_indexed: false, // « Afficher sur Google » : jamais coché implicitement
			slug: expect.any(String) // Auto-generated slug
		});
		// Le contenu ne part PAS sur la ligne d'`exercises`
		const insertedIdentity = mockSupabase.__mockQuery.insert.mock.calls[0][0];
		expect(insertedIdentity).not.toHaveProperty('variations');
		expect(insertedIdentity).not.toHaveProperty('shared');
		// Result carries `tags` from the original input (merged in after junction sync).
		expect(result.data).toMatchObject({ id: createdExercise.id, tags: newExercise.tags });
		expect(result.error).toBeNull();
	});
});

describe('updateExercise', () => {
	it('should update an existing exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Original Title',
			source: 'Original Source',
			source_type_id: null,
			category: 'automatisme',
			grades: ['3'],
			topic: 'Algèbre',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Original statement',
					solution_md: 'Original solution'
				}
			]
		};

		const newVariations = [
			{ label: 'default', statement_md: 'Nouvel énoncé', solution_md: 'Nouveau corrigé' }
		];
		const updates = {
			title: 'Updated Title',
			category: 'automatisme' as const,
			variations: newVariations
		};

		// Mock getExercise call, puis la relecture de la ligne après l'écriture (sans contenu)
		mockSupabase.__mockQuery.single
			.mockResolvedValueOnce({ data: existingExercise, error: null })
			.mockResolvedValueOnce({
				data: { ...existingExercise, title: 'Updated Title', variations: [{ label: 'ancien' }] },
				error: null
			});
		// Dernière version lue par getExercise
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123', { id: 'v-last', number: 3 })],
			error: null
		});
		// Écriture groupée : la base rend la version écrite
		mockSupabase.__saveQuery.single.mockResolvedValue({
			data: versionRow('ex-123', { id: 'v-last', number: 3, variations: newVariations }),
			error: null
		});

		const result = await updateExercise(mockSupabase, 'ex-123', updates, 'user-123');

		expect(result.error).toBeNull();
		expect(result.data?.title).toBe('Updated Title');
		expect(result.data?.category).toBe('automatisme');
		// Identité ET contenu partent ensemble dans UN appel de la base (tout ou rien)...
		const saveCalls = mockSupabase.rpc.mock.calls.filter(
			(c: unknown[]) => c[0] === 'save_exercise_with_version'
		);
		expect(saveCalls).toHaveLength(1);
		const args = saveCalls[0][1];
		expect(args.p_exercise_id).toBe('ex-123');
		expect(args.p_content).toEqual({ variations: newVariations });
		// ... l'identité ne porte pas le contenu
		expect(args.p_identity).not.toHaveProperty('variations');
		expect(args.p_identity).toMatchObject({ title: 'Updated Title' });
		// Pas de version ciblée : la base prend la dernière
		expect(args).not.toHaveProperty('p_version_id');
		// Plus d'écriture directe sur `exercises`
		expect(mockSupabase.__mockQuery.update).not.toHaveBeenCalled();
		// Le contenu rendu est celui de la version écrite
		expect(result.data?.variations).toEqual(newVariations);
	});

	it("sans contenu fourni : seule l'identité est écrite, aucune version modifiée", async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise = {
			id: 'ex-123',
			title: 'Avant',
			created_by: 'user-123',
			is_public: false
		};
		mockSupabase.__mockQuery.single
			.mockResolvedValueOnce({ data: existingExercise, error: null })
			.mockResolvedValueOnce({ data: { ...existingExercise, title: 'Après' }, error: null });
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123', { variations: [{ label: 'v1' }] })],
			error: null
		});
		mockSupabase.__saveQuery.single.mockResolvedValue({
			data: versionRow('ex-123', { variations: [{ label: 'v1' }] }),
			error: null
		});

		const result = await updateExercise(mockSupabase, 'ex-123', { title: 'Après' }, 'user-123');

		expect(result.error).toBeNull();
		// Seule l'identité est écrite : le contenu passé à la base est vide (aucune version modifiée)
		const args = mockSupabase.rpc.mock.calls.find(
			(c: unknown[]) => c[0] === 'save_exercise_with_version'
		)[1];
		expect(args.p_content).toEqual({});
		expect(args.p_identity).toMatchObject({ title: 'Après' });
		expect(result.data?.variations).toEqual([{ label: 'v1' }]);
	});

	it('should reject update from non-owner', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Test',
			source: null,
			source_type_id: null,
			category: 'automatisme',
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'owner-456',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test',
					solution_md: 'Test'
				}
			]
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: existingExercise, error: null });
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123')],
			error: null
		});

		const result = await updateExercise(mockSupabase, 'ex-123', { title: 'Hacked' }, 'hacker-789');

		expect(result.error).toBeDefined();
		expect(result.error?.message).toBe('Unauthorized');
		expect(result.data).toBeNull();
	});
});

describe('deleteExercise', () => {
	it('should delete an exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'To Delete',
			source: null,
			source_type_id: null,
			category: 'automatisme',
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test',
					solution_md: 'Test'
				}
			]
		};

		// getExercise : .select('*').eq().single() rend l'exercice
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({ data: existingExercise, error: null });
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123')],
			error: null
		});
		// Suppression : .delete().eq().eq().select('id') rend la ligne supprimée
		mockSupabase.__mockQuery.select
			.mockReturnValueOnce(mockSupabase.__mockQuery)
			.mockResolvedValueOnce({ data: [{ id: 'ex-123' }], error: null });

		const result = await deleteExercise(mockSupabase, 'ex-123', 'user-123');

		expect(mockSupabase.__mockQuery.delete).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	// RLS silencieuse : un DELETE refusé rend 0 ligne et aucune erreur.
	it('rend une erreur quand la base ne supprime aucune ligne (refus RLS silencieux)', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise = {
			id: 'ex-123',
			created_by: 'user-123',
			variations: []
		};
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({ data: existingExercise, error: null });
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123')],
			error: null
		});
		mockSupabase.__mockQuery.select
			.mockReturnValueOnce(mockSupabase.__mockQuery)
			.mockResolvedValueOnce({ data: [], error: null });

		const result = await deleteExercise(mockSupabase, 'ex-123', 'user-123');

		expect(mockSupabase.__mockQuery.delete).toHaveBeenCalled();
		expect(mockSupabase.__mockQuery.select).toHaveBeenLastCalledWith('id');
		expect(result.error?.message).toBe(EXERCISE_NOT_DELETED);
	});

	it('should reject delete from non-owner', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Protected',
			source: null,
			source_type_id: null,
			category: 'automatisme',
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'owner-456',
			distribution_mode: 'on_demand',
			is_public: false,
			search_indexed: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			translations: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test',
					solution_md: 'Test'
				}
			]
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: existingExercise, error: null });
		mockSupabase.__latestQuery.select.mockResolvedValue({
			data: [versionRow('ex-123')],
			error: null
		});

		const result = await deleteExercise(mockSupabase, 'ex-123', 'hacker-789');

		expect(result.error).toBeDefined();
		expect(result.error?.message).toBe('Unauthorized');
	});
});

describe('getTeacherExercises', () => {
	it('should fetch exercises for a specific teacher', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getTeacherExercises(mockSupabase, 'teacher-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('created_by', 'teacher-123');
	});

	it('should combine teacher filter with other filters, using junction for tags', async () => {
		const mockSupabase = createMockSupabase() as any;
		(fetchResourceIdsByAnyTag as Mock).mockResolvedValueOnce(['ex-1']);
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getTeacherExercises(mockSupabase, 'teacher-123', {
			category: 'automatisme',
			tags: ['algèbre']
		});

		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('created_by', 'teacher-123');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('category', 'automatisme');
		// Tags are resolved via the junction, not via .contains() on a column.
		expect(fetchResourceIdsByAnyTag).toHaveBeenCalledWith(mockSupabase, 'exercise', ['algèbre']);
		expect(mockSupabase.__mockQuery.in).toHaveBeenCalledWith('id', ['ex-1']);
	});
});
