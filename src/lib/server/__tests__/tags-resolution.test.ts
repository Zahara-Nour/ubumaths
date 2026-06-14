/**
 * Tests for tags-resolution helpers (math + Python).
 *
 * Mocks Supabase by exposing a shared __mockQuery whose chainable methods
 * return `this`; terminal methods (the last call in each helper) are stubbed
 * per-test via `mockResolvedValueOnce`.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	resolveTagsToIds,
	syncExerciseTagJunction,
	fetchTagNamesForExercise,
	fetchExerciseIdsByAnyTag
} from '../tags-resolution';

const createMockSupabase = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		not: vi.fn().mockReturnThis(),
		in: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		upsert: vi.fn().mockReturnThis()
	};
	return {
		from: vi.fn(() => mockQuery),
		__mockQuery: mockQuery
	};
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('resolveTagsToIds', () => {
	it('returns empty array when input is empty', async () => {
		const supabase = createMockSupabase() as any;
		const result = await resolveTagsToIds(supabase, [], 'tags');
		expect(result).toEqual([]);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns empty array when input is whitespace-only', async () => {
		const supabase = createMockSupabase() as any;
		const result = await resolveTagsToIds(supabase, ['', '   '], 'tags');
		expect(result).toEqual([]);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns ids for all-existing tags without inserting', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [
				{ id: 'id-a', name: 'algebra' },
				{ id: 'id-b', name: 'geometry' }
			],
			error: null
		});

		const result = await resolveTagsToIds(supabase, ['algebra', 'geometry'], 'tags');

		expect(result).toEqual(['id-a', 'id-b']);
		expect(supabase.__mockQuery.insert).not.toHaveBeenCalled();
	});

	it('auto-creates missing tags and merges them with existing ones', async () => {
		const supabase = createMockSupabase() as any;
		// Chain 1: .from('tags').select('id, name').in('name', unique)
		//   `.select` (middle) → this ; `.in` (terminal) → existing rows.
		supabase.__mockQuery.select.mockReturnValueOnce(supabase.__mockQuery);
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [{ id: 'id-a', name: 'algebra' }],
			error: null
		});
		// Chain 2: .from('tags').insert(...).select('id, name')
		//   `.select` (terminal) → created rows.
		supabase.__mockQuery.select.mockResolvedValueOnce({
			data: [{ id: 'id-new', name: 'arithmetic' }],
			error: null
		});

		const result = await resolveTagsToIds(supabase, ['algebra', 'arithmetic'], 'tags');

		expect(result).toEqual(['id-a', 'id-new']);
		expect(supabase.__mockQuery.insert).toHaveBeenCalledWith([{ name: 'arithmetic' }]);
	});

	it('falls back to a re-lookup if insert errors (race condition)', async () => {
		const supabase = createMockSupabase() as any;
		// Chain 1 lookup: .select() → this ; .in() → empty
		supabase.__mockQuery.select.mockReturnValueOnce(supabase.__mockQuery);
		supabase.__mockQuery.in.mockResolvedValueOnce({ data: [], error: null });
		// Chain 2 insert: .insert().select() → duplicate-key error
		supabase.__mockQuery.select.mockResolvedValueOnce({
			data: null,
			error: { message: 'duplicate key' }
		});
		// Chain 3 refresh: .select() → this ; .in() → row that arrived in the meantime
		supabase.__mockQuery.select.mockReturnValueOnce(supabase.__mockQuery);
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [{ id: 'id-late', name: 'topology' }],
			error: null
		});

		const result = await resolveTagsToIds(supabase, ['topology'], 'tags');

		expect(result).toEqual(['id-late']);
	});

	it('throws when the catalog lookup fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: null,
			error: { message: 'connection lost' }
		});

		await expect(resolveTagsToIds(supabase, ['x'], 'tags')).rejects.toMatchObject({
			message: 'connection lost'
		});
	});

	it('deduplicates input names before lookup', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [{ id: 'id-a', name: 'a' }],
			error: null
		});

		const result = await resolveTagsToIds(supabase, ['a', 'a', 'a'], 'tags');

		expect(result).toEqual(['id-a']);
		// `unique` was deduplicated to a single name before .in()
		expect(supabase.__mockQuery.in).toHaveBeenCalledWith('name', ['a']);
	});
});

describe('syncExerciseTagJunction', () => {
	it('deletes all rows for the exercise when tagIds is empty', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.eq.mockResolvedValueOnce({ error: null });

		await syncExerciseTagJunction(supabase, 'ex-1', [], 'exercise_tags');

		expect(supabase.__mockQuery.delete).toHaveBeenCalled();
		expect(supabase.__mockQuery.eq).toHaveBeenCalledWith('exercise_id', 'ex-1');
		expect(supabase.__mockQuery.upsert).not.toHaveBeenCalled();
	});

	it('removes stale rows then upserts the desired set', async () => {
		const supabase = createMockSupabase() as any;
		// 1. delete().eq().not()  → terminal is .not()
		supabase.__mockQuery.not.mockResolvedValueOnce({ error: null });
		// 2. upsert(...)            → terminal is .upsert()
		supabase.__mockQuery.upsert.mockResolvedValueOnce({ error: null });

		await syncExerciseTagJunction(supabase, 'ex-1', ['t1', 't2'], 'exercise_tags');

		expect(supabase.__mockQuery.delete).toHaveBeenCalled();
		expect(supabase.__mockQuery.not).toHaveBeenCalledWith('tag_id', 'in', '(t1,t2)');
		expect(supabase.__mockQuery.upsert).toHaveBeenCalledWith(
			[
				{ exercise_id: 'ex-1', tag_id: 't1' },
				{ exercise_id: 'ex-1', tag_id: 't2' }
			],
			{ onConflict: 'exercise_id,tag_id', ignoreDuplicates: true }
		);
	});

	it('throws when the stale-row delete fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.not.mockResolvedValueOnce({
			error: { message: 'rls denied' }
		});

		await expect(
			syncExerciseTagJunction(supabase, 'ex-1', ['t1'], 'exercise_tags')
		).rejects.toMatchObject({ message: 'rls denied' });
	});

	it('throws when the upsert fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.not.mockResolvedValueOnce({ error: null });
		supabase.__mockQuery.upsert.mockResolvedValueOnce({
			error: { message: 'fk violation' }
		});

		await expect(
			syncExerciseTagJunction(supabase, 'ex-1', ['t1'], 'exercise_tags')
		).rejects.toMatchObject({ message: 'fk violation' });
	});
});

describe('fetchTagNamesForExercise', () => {
	it('returns sorted tag names from the junction', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.eq.mockResolvedValueOnce({
			data: [{ tags: { name: 'zeta' } }, { tags: { name: 'alpha' } }],
			error: null
		});

		const result = await fetchTagNamesForExercise(supabase, 'ex-1', 'exercise_tags', 'tags');

		expect(result).toEqual(['alpha', 'zeta']);
	});

	it('returns empty array when junction has no rows', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.eq.mockResolvedValueOnce({ data: [], error: null });

		const result = await fetchTagNamesForExercise(supabase, 'ex-1', 'exercise_tags', 'tags');

		expect(result).toEqual([]);
	});

	it('throws when the junction query fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.eq.mockResolvedValueOnce({
			data: null,
			error: { message: 'timeout' }
		});

		await expect(
			fetchTagNamesForExercise(supabase, 'ex-1', 'exercise_tags', 'tags')
		).rejects.toMatchObject({ message: 'timeout' });
	});
});

describe('fetchExerciseIdsByAnyTag', () => {
	it('returns empty array when the input list is empty', async () => {
		const supabase = createMockSupabase() as any;
		const result = await fetchExerciseIdsByAnyTag(supabase, [], 'exercise_tags', 'tags');
		expect(result).toEqual([]);
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it('returns deduplicated exercise ids from the junction', async () => {
		const supabase = createMockSupabase() as any;
		// 1. lookup tag ids in catalog
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [{ id: 't1' }, { id: 't2' }],
			error: null
		});
		// 2. lookup junction rows by tag ids
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: [
				{ exercise_id: 'e1' },
				{ exercise_id: 'e2' },
				{ exercise_id: 'e1' } // duplicate
			],
			error: null
		});

		const result = await fetchExerciseIdsByAnyTag(
			supabase,
			['for', 'while'],
			'exercise_tags',
			'tags'
		);

		expect(result.sort()).toEqual(['e1', 'e2']);
	});

	it('returns empty array when no tag names exist in the catalog', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in.mockResolvedValueOnce({ data: [], error: null });

		const result = await fetchExerciseIdsByAnyTag(supabase, ['unknown'], 'exercise_tags', 'tags');

		expect(result).toEqual([]);
	});

	it('throws when the catalog lookup fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in.mockResolvedValueOnce({
			data: null,
			error: { message: 'rls denied' }
		});

		await expect(
			fetchExerciseIdsByAnyTag(supabase, ['x'], 'exercise_tags', 'tags')
		).rejects.toMatchObject({ message: 'rls denied' });
	});

	it('throws when the junction lookup fails', async () => {
		const supabase = createMockSupabase() as any;
		supabase.__mockQuery.in
			.mockResolvedValueOnce({
				data: [{ id: 't1' }],
				error: null
			})
			.mockResolvedValueOnce({
				data: null,
				error: { message: 'fk error' }
			});

		await expect(
			fetchExerciseIdsByAnyTag(supabase, ['x'], 'exercise_tags', 'tags')
		).rejects.toMatchObject({ message: 'fk error' });
	});
});

afterEach(() => {
	consoleErrorSpy?.mockRestore();
});
