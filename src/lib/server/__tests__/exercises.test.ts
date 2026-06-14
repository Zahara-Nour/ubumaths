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
	getTeacherExercises
} from '../exercises';
import type { Database } from '$lib/types/database';

// Stub the tag-resolution helpers so tests don't need to mock junction queries.
// Individual tests that need specific return values can override via mockResolvedValueOnce.
vi.mock('$lib/server/tags-resolution', () => ({
	resolveTagsToIds: vi.fn().mockResolvedValue([]),
	syncExerciseTagJunction: vi.fn().mockResolvedValue(undefined),
	fetchTagNamesForExercise: vi.fn().mockResolvedValue([]),
	fetchExerciseIdsByAnyTag: vi.fn().mockResolvedValue([])
}));

import { fetchExerciseIdsByAnyTag, fetchTagNamesForExercise } from '$lib/server/tags-resolution';

type ExerciseRow = Database['public']['Tables']['exercises']['Row'];

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

	return {
		from: vi.fn(() => mockQuery),
		__mockQuery: mockQuery // For internal test access
	};
};

describe('getExercises', () => {
	it('should fetch exercises with default pagination', async () => {
		const mockSupabase = createMockSupabase() as any;
		const mockData: ExerciseRow[] = [
			{
				id: '1',
				title: 'Test Exercise',
				source: 'Test Book',
				category: 'automatisme',
				tags: ['algèbre'],
				grades: ['3'],
				topic: 'Algèbre',
				created_at: '2024-01-01T00:00:00Z',
				updated_at: '2024-01-01T00:00:00Z',
				created_by: 'user-123',
				distribution_mode: 'on_demand',
				is_public: false,
				variables: {},
				resources: {},
				slug: null,
				generic_functions: null,
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

		const result = await getExercises(mockSupabase, {}, { page: 1, limit: 50 });

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
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

	it('should apply tags filter via junction (fetchExerciseIdsByAnyTag)', async () => {
		const mockSupabase = createMockSupabase() as any;
		// fetchExerciseIdsByAnyTag returns matching ids; then .in() restricts the query.
		(fetchExerciseIdsByAnyTag as Mock).mockResolvedValueOnce(['ex-1', 'ex-2']);
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { tags: ['algèbre', 'équations'] });

		expect(fetchExerciseIdsByAnyTag).toHaveBeenCalledWith(
			mockSupabase,
			['algèbre', 'équations'],
			'exercise_tags',
			'tags'
		);
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
			category: 'automatisme',
			tags: [], // column is dropped in DB; value from junction via fetchTagNamesForExercise
			grades: ['3'],
			topic: 'Algèbre',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
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
		// Simulate the junction returning a resolved tag name.
		(fetchTagNamesForExercise as Mock).mockResolvedValueOnce(['algèbre']);

		const result = await getExercise(mockSupabase, 'ex-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('id', 'ex-123');
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
			tags: ['algèbre'],
			title: null,
			source: null,
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test statement',
					solution_md: 'Test solution'
				}
			]
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: createdExercise, error: null });

		const result = await createExercise(mockSupabase, newExercise, 'user-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		// `tags` is stripped from the INSERT — it goes through the junction instead.
		expect(mockSupabase.__mockQuery.insert).toHaveBeenCalledWith({
			category: newExercise.category,
			distribution_mode: 'on_demand', // Default value
			variables: undefined, // Empty variables array becomes undefined
			created_by: 'user-123',
			slug: expect.any(String), // Auto-generated slug
			shared: undefined, // Passed through (JSONB)
			variations: newExercise.variations // Passed through (JSONB)
		});
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
			category: 'automatisme',
			tags: ['algèbre'],
			grades: ['3'],
			topic: 'Algèbre',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Original statement',
					solution_md: 'Original solution'
				}
			]
		};

		const updates = {
			title: 'Updated Title',
			category: 'automatisme' as const
		};

		// Mock getExercise call
		mockSupabase.__mockQuery.single
			.mockResolvedValueOnce({ data: existingExercise, error: null })
			.mockResolvedValueOnce({ data: { ...existingExercise, ...updates }, error: null });

		const result = await updateExercise(mockSupabase, 'ex-123', updates, 'user-123');

		expect(result.error).toBeNull();
		expect(result.data?.title).toBe('Updated Title');
		expect(result.data?.category).toBe('automatisme');
	});

	it('should reject update from non-owner', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Test',
			source: null,
			category: 'automatisme',
			tags: [],
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'owner-456',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
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
			category: 'automatisme',
			tags: [],
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
			shared: null,
			variations: [
				{
					label: 'default',
					statement_md: 'Test',
					solution_md: 'Test'
				}
			]
		};

		// Mock getExercise call - .single() returns the exercise
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({ data: existingExercise, error: null });
		// Mock delete operation - .eq() needs to be chained, so use mockReturnThis for intermediate calls
		// Then the final .eq() returns the result
		let eqCallCount = 0;
		mockSupabase.__mockQuery.eq.mockImplementation(() => {
			eqCallCount++;
			// First eq() is from getExercise - return this to continue chain
			if (eqCallCount === 1) return mockSupabase.__mockQuery;
			// Second eq() is first delete eq() - return this to continue chain
			if (eqCallCount === 2) return mockSupabase.__mockQuery;
			// Third eq() is final delete eq() - return the result
			return Promise.resolve({ error: null });
		});

		const result = await deleteExercise(mockSupabase, 'ex-123', 'user-123');

		expect(mockSupabase.__mockQuery.delete).toHaveBeenCalled();
		expect(result.error).toBeNull();
	});

	it('should reject delete from non-owner', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Protected',
			source: null,
			category: 'automatisme',
			tags: [],
			grades: null,
			topic: null,
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'owner-456',
			distribution_mode: 'on_demand',
			is_public: false,
			variables: {},
			resources: {},
			slug: null,
			generic_functions: null,
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
		(fetchExerciseIdsByAnyTag as Mock).mockResolvedValueOnce(['ex-1']);
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null, count: 0 });

		await getTeacherExercises(mockSupabase, 'teacher-123', {
			category: 'automatisme',
			tags: ['algèbre']
		});

		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('created_by', 'teacher-123');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('category', 'automatisme');
		// Tags are resolved via the junction, not via .contains() on a column.
		expect(fetchExerciseIdsByAnyTag).toHaveBeenCalledWith(
			mockSupabase,
			['algèbre'],
			'exercise_tags',
			'tags'
		);
		expect(mockSupabase.__mockQuery.in).toHaveBeenCalledWith('id', ['ex-1']);
	});
});
