/**
 * Server Functions Tests - Exercise Bank
 * =======================================
 *
 * Unit tests for exercise server functions.
 * These tests use mocked Supabase client.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import {
	getExercises,
	getExercise,
	createExercise,
	updateExercise,
	deleteExercise,
	getTeacherExercises
} from './exercises';
import type { Database } from '$lib/types/database';

type ExerciseRow = Database['public']['Tables']['exercises']['Row'];

// Mock Supabase client
const createMockSupabase = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		contains: vi.fn().mockReturnThis(),
		overlaps: vi.fn().mockReturnThis(),
		textSearch: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis()
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
				difficulty: 2,
				tags: ['algèbre'],
				statement_md: 'Test statement',
				solution_md: 'Test solution',
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
				variations: null
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

	it('should apply difficulty filter', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { difficulty: 2 });

		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('difficulty', 2);
	});

	it('should apply tags filter', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

		await getExercises(mockSupabase, { tags: ['algèbre', 'équations'] });

		expect(mockSupabase.__mockQuery.contains).toHaveBeenCalledWith('tags', [
			'algèbre',
			'équations'
		]);
	});

	it('should apply grades filter with overlaps', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

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
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

		const result = await getExercises(mockSupabase, {}, { page: 1, limit: 200 });

		expect(result.limit).toBe(100);
		expect(mockSupabase.__mockQuery.range).toHaveBeenCalledWith(0, 99);
	});
});

describe('getExercise', () => {
	it('should fetch a single exercise by ID', async () => {
		const mockSupabase = createMockSupabase() as any;
		const mockExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Test Exercise',
			source: 'Test Book',
			difficulty: 2,
			tags: ['algèbre'],
			statement_md: 'Test statement',
			solution_md: 'Test solution',
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
			variations: null
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: mockExercise, error: null });

		const result = await getExercise(mockSupabase, 'ex-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('id', 'ex-123');
		expect(result.data).toEqual(mockExercise);
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
			difficulty: 2 as const,
			tags: ['algèbre'],
			statement_md: 'Test statement',
			solution_md: 'Test solution'
		};

		const createdExercise: ExerciseRow = {
			id: 'new-ex-123',
			...newExercise,
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
			variations: null
		};

		mockSupabase.__mockQuery.single.mockResolvedValue({ data: createdExercise, error: null });

		const result = await createExercise(mockSupabase, newExercise, 'user-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.insert).toHaveBeenCalledWith({
			...newExercise,
			distribution_mode: 'on_demand', // Default value
			variables: undefined, // Empty variables array becomes undefined
			created_by: 'user-123',
			slug: expect.any(String), // Auto-generated slug
			shared: undefined, // Passed through (JSONB)
			variations: undefined // Passed through (JSONB)
		});
		expect(result.data).toEqual(createdExercise);
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
			difficulty: 2,
			tags: ['algèbre'],
			statement_md: 'Original statement',
			solution_md: 'Original solution',
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
			variations: null
		};

		const updates = {
			title: 'Updated Title',
			difficulty: 3 as const
		};

		// Mock getExercise call
		mockSupabase.__mockQuery.single
			.mockResolvedValueOnce({ data: existingExercise, error: null })
			.mockResolvedValueOnce({ data: { ...existingExercise, ...updates }, error: null });

		const result = await updateExercise(mockSupabase, 'ex-123', updates, 'user-123');

		expect(result.error).toBeNull();
		expect(result.data?.title).toBe('Updated Title');
		expect(result.data?.difficulty).toBe(3);
	});

	it('should reject update from non-owner', async () => {
		const mockSupabase = createMockSupabase() as any;
		const existingExercise: ExerciseRow = {
			id: 'ex-123',
			title: 'Test',
			source: null,
			difficulty: 2,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test',
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
			variations: null
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
			difficulty: 1,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test',
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
			variations: null
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
			difficulty: 1,
			tags: [],
			statement_md: 'Test',
			solution_md: 'Test',
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
			variations: null
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
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

		await getTeacherExercises(mockSupabase, 'teacher-123');

		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('created_by', 'teacher-123');
	});

	it('should combine teacher filter with other filters', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.single.mockResolvedValue({ data: [], error: null, count: 0 });

		await getTeacherExercises(mockSupabase, 'teacher-123', { difficulty: 3, tags: ['algèbre'] });

		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('created_by', 'teacher-123');
		expect(mockSupabase.__mockQuery.eq).toHaveBeenCalledWith('difficulty', 3);
		expect(mockSupabase.__mockQuery.contains).toHaveBeenCalledWith('tags', ['algèbre']);
	});
});
