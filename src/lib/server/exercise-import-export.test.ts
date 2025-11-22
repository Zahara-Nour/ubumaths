/**
 * Exercise Import/Export Tests
 * =============================
 *
 * Unit tests for server-side exercise import/export functions.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	exportExerciseToJSON,
	exportExerciseToMarkdown,
	generateExportFilename,
	importExerciseFromJSON,
	importExerciseFromMarkdown,
	importExercisesFromJSON
} from './exercise-import-export';
import type { Exercise } from '$lib/exercises/types';

// Sample exercise for testing
const sampleExercise: Exercise = {
	id: 'ex-123',
	title: 'Test Exercise',
	source: 'Test Book',
	difficulty: 2,
	tags: ['algèbre', 'équations'],
	statement_md: 'Résoudre $x^2 = 4$',
	solution_md: '$x = \\pm 2$',
	grade_levels: ['3', '2'],
	topic: 'Algèbre',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	created_by: 'user-123',
	distribution_mode: 'on_demand',
	is_public: false,
	variables: []
};

// Mock Supabase client
const createMockSupabase = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockReturnThis()
	};

	return {
		from: vi.fn(() => mockQuery),
		__mockQuery: mockQuery
	};
};

describe('exportExerciseToJSON', () => {
	it('should export exercise to JSON format', () => {
		const json = exportExerciseToJSON(sampleExercise);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('1.0');
		expect(parsed.difficulty).toBe(2);
		expect(parsed.tags).toEqual(['algèbre', 'équations']);
		expect(parsed.statement_md).toBe('Résoudre $x^2 = 4$');
		expect(parsed.solution_md).toBe('$x = \\pm 2$');
		expect(parsed.title).toBe('Test Exercise');
		expect(parsed.source).toBe('Test Book');
		expect(parsed.grade_levels).toEqual(['3', '2']);
		expect(parsed.topic).toBe('Algèbre');
	});

	it('should export with pretty print by default', () => {
		const json = exportExerciseToJSON(sampleExercise);

		expect(json).toContain('\n'); // Formatted JSON has newlines
		expect(json).toContain('  '); // And indentation
	});

	it('should export without pretty print when specified', () => {
		const json = exportExerciseToJSON(sampleExercise, false);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('1.0');
		expect(json).not.toContain('\n  '); // No indentation
	});

	it('should handle exercise with minimal fields', () => {
		const minimalExercise: Exercise = {
			id: 'ex-min',
			difficulty: 1,
			tags: [],
			statement_md: 'Simple question',
			solution_md: 'Simple answer',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand'
		};

		const json = exportExerciseToJSON(minimalExercise);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('1.0');
		expect(parsed.difficulty).toBe(1);
		expect(parsed.tags).toEqual([]);
		// Optional fields that are undefined in source are not included in export
		expect(parsed.title).toBeUndefined();
		expect(parsed.source).toBeUndefined();
	});
});

describe('exportExerciseToMarkdown', () => {
	it('should export exercise to markdown format', () => {
		const markdown = exportExerciseToMarkdown(sampleExercise);

		expect(markdown).toContain('---');
		expect(markdown).toContain('version:');
		expect(markdown).toContain('1.0');
		expect(markdown).toContain('difficulty: 2');
		expect(markdown).toContain('title:');
		expect(markdown).toContain('Test Exercise');
		expect(markdown).toContain('- algèbre');
		expect(markdown).toContain('- équations');
		expect(markdown).toContain('# Énoncé');
		expect(markdown).toContain('Résoudre $x^2 = 4$');
		expect(markdown).toContain('# Solution');
		expect(markdown).toContain('$x = \\pm 2$');
	});

	it('should handle exercise with minimal fields', () => {
		const minimalExercise: Exercise = {
			id: 'ex-min',
			difficulty: 1,
			tags: [],
			statement_md: 'Q',
			solution_md: 'A',
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand'
		};

		const markdown = exportExerciseToMarkdown(minimalExercise);

		expect(markdown).toContain('difficulty: 1');
		expect(markdown).toContain('tags: []');
		expect(markdown).toContain('# Énoncé');
		expect(markdown).toContain('Q');
		expect(markdown).toContain('# Solution');
		expect(markdown).toContain('A');
		expect(markdown).not.toContain('title:');
		expect(markdown).not.toContain('source:');
	});
});

describe('generateExportFilename', () => {
	it('should generate filename with title and JSON extension', () => {
		const filename = generateExportFilename(sampleExercise, 'json');

		expect(filename).toContain('test-exercise');
		expect(filename).toMatch(/\.json$/);
	});

	it('should generate filename with title and markdown extension', () => {
		const filename = generateExportFilename(sampleExercise, 'md');

		expect(filename).toContain('test-exercise');
		expect(filename).toMatch(/\.md$/);
	});

	it('should use exercise ID when title is null', () => {
		const noTitleExercise = { ...sampleExercise, title: undefined };
		const filename = generateExportFilename(noTitleExercise, 'json');

		expect(filename).toContain('ex-123');
		expect(filename).toMatch(/\.json$/);
	});

	it('should sanitize title for filename', () => {
		const specialTitleExercise = {
			...sampleExercise,
			title: 'Test/Exercise: With? Special* Chars'
		};
		const filename = generateExportFilename(specialTitleExercise, 'json');

		expect(filename).not.toContain('/');
		expect(filename).not.toContain(':');
		expect(filename).not.toContain('?');
		expect(filename).not.toContain('*');
		expect(filename).toMatch(/\.json$/);
	});
});

describe('importExerciseFromJSON', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should import valid JSON exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const jsonData = {
			version: '1.0',
			difficulty: 2,
			tags: ['test'],
			statement_md: 'Question',
			solution_md: 'Answer',
			title: 'Imported Exercise'
		};

		// Mock no duplicates found (limit returns empty array)
		mockSupabase.__mockQuery.limit.mockResolvedValue({ data: [], error: null });
		// Mock successful insert
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: { id: 'new-ex-id', ...jsonData, created_by: 'user-123' },
			error: null
		});

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123');

		expect(result.success).toBe(true);
		expect(result.exerciseId).toBe('new-ex-id');
		expect(result.skipped).toBeUndefined(); // Not skipped, so field is undefined
		expect(result.error).toBeUndefined();
	});

	it('should skip duplicate when onDuplicate is "skip"', async () => {
		const mockSupabase = createMockSupabase() as any;
		const jsonData = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: 'Duplicate Question',
			solution_md: 'Answer',
			title: 'Duplicate'
		};

		// Mock duplicate found (limit returns the duplicate)
		mockSupabase.__mockQuery.limit.mockResolvedValue({
			data: [{ id: 'existing-ex-id', statement_md: 'Duplicate Question', title: 'Duplicate' }],
			error: null
		});

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123', {
			onDuplicate: 'skip'
		});

		expect(result.success).toBe(true);
		expect(result.skipped).toBe(true);
		expect(result.exerciseId).toBe('existing-ex-id'); // Returns the existing ID
	});

	it('should replace duplicate when onDuplicate is "replace" and user owns exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const jsonData = {
			version: '1.0',
			difficulty: 3,
			tags: ['updated'],
			statement_md: 'Updated Question',
			solution_md: 'Updated Answer',
			title: 'Updated Title'
		};

		// Mock duplicate found
		mockSupabase.__mockQuery.limit.mockResolvedValueOnce({
			data: [{ id: 'existing-ex-id', statement_md: 'Updated Question', title: 'Updated Title' }],
			error: null
		});

		// Mock ownership check (single() call to get created_by)
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({
			data: { created_by: 'user-123' },
			error: null
		});

		// Mock successful update
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({
			data: {
				id: 'existing-ex-id',
				difficulty: 3,
				tags: ['updated'],
				statement_md: 'Updated Question',
				solution_md: 'Updated Answer',
				title: 'Updated Title',
				created_by: 'user-123',
				updated_at: expect.any(String)
			},
			error: null
		});

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123', {
			onDuplicate: 'replace'
		});

		expect(result.success).toBe(true);
		expect(result.exerciseId).toBe('existing-ex-id');
		expect(result.skipped).toBeUndefined();
		// Verify update was called
		expect(mockSupabase.from).toHaveBeenCalledWith('exercises');
	});

	it('should reject replace when user does not own the exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const jsonData = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer',
			title: 'Title'
		};

		// Mock duplicate found
		mockSupabase.__mockQuery.limit.mockResolvedValueOnce({
			data: [{ id: 'other-user-ex-id', statement_md: 'Question', title: 'Title' }],
			error: null
		});

		// Mock ownership check - exercise belongs to another user
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({
			data: { created_by: 'other-user-456' },
			error: null
		});

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123', {
			onDuplicate: 'replace'
		});

		expect(result.success).toBe(false);
		expect(result.error).toContain('Cannot replace exercise owned by another user');
	});

	it('should create copy when onDuplicate is "create-copy"', async () => {
		// Create a fresh mock for this test with specific behavior
		const mockQuery1 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({
				data: [
					{ id: 'existing-ex-id', statement_md: 'Duplicate Question', title: 'Original Title' }
				],
				error: null
			})
		};

		const mockQuery2 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [{ title: 'Original Title' }],
				error: null
			})
		};

		const mockQuery3 = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					id: 'new-copy-id',
					title: 'Original Title (copie)',
					difficulty: 2,
					tags: ['test'],
					statement_md: 'Duplicate Question',
					solution_md: 'Answer',
					created_by: 'user-123'
				},
				error: null
			})
		};

		const mockSupabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(mockQuery1)
				.mockReturnValueOnce(mockQuery2)
				.mockReturnValueOnce(mockQuery3)
		} as any;

		const jsonData = {
			version: '1.0',
			difficulty: 2,
			tags: ['test'],
			statement_md: 'Duplicate Question',
			solution_md: 'Answer',
			title: 'Original Title'
		};

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123', {
			onDuplicate: 'create-copy'
		});

		expect(result.success).toBe(true);
		expect(result.exerciseId).toBe('new-copy-id');
		expect(result.skipped).toBeUndefined();
	});

	it('should create copy with incremented number when "copie" already exists', async () => {
		// Create a fresh mock for this test with specific behavior
		const mockQuery1 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue({
				data: [{ id: 'existing-ex-id', statement_md: 'Question', title: 'Title' }],
				error: null
			})
		};

		const mockQuery2 = {
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockResolvedValue({
				data: [{ title: 'Title' }, { title: 'Title (copie)' }, { title: 'Title (copie 2)' }],
				error: null
			})
		};

		const mockQuery3 = {
			insert: vi.fn().mockReturnThis(),
			select: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({
				data: {
					id: 'new-copy-id-3',
					title: 'Title (copie 3)',
					difficulty: 2,
					tags: [],
					statement_md: 'Question',
					solution_md: 'Answer',
					created_by: 'user-123'
				},
				error: null
			})
		};

		const mockSupabase = {
			from: vi
				.fn()
				.mockReturnValueOnce(mockQuery1)
				.mockReturnValueOnce(mockQuery2)
				.mockReturnValueOnce(mockQuery3)
		} as any;

		const jsonData = {
			version: '1.0',
			difficulty: 2,
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer',
			title: 'Title'
		};

		const result = await importExerciseFromJSON(mockSupabase, jsonData, 'user-123', {
			onDuplicate: 'create-copy'
		});

		expect(result.success).toBe(true);
		expect(result.exerciseId).toBe('new-copy-id-3');
	});

	it('should reject invalid JSON data', async () => {
		const mockSupabase = createMockSupabase() as any;
		const invalidData = {
			version: '1.0',
			difficulty: 99, // Invalid
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer'
		};

		const result = await importExerciseFromJSON(mockSupabase, invalidData, 'user-123');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		expect(result.error).toContain('difficulty');
	});

	it('should skip validation when validate is false', async () => {
		const mockSupabase = createMockSupabase() as any;
		const dataWithInvalidDifficulty = {
			version: '1.0',
			difficulty: 99,
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer'
		};

		// Mock no duplicates
		mockSupabase.__mockQuery.limit.mockResolvedValue({ data: [], error: null });
		// Mock successful insert (would fail validation normally)
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: { id: 'new-id', difficulty: 99, created_by: 'user-123' },
			error: null
		});

		const result = await importExerciseFromJSON(
			mockSupabase,
			dataWithInvalidDifficulty,
			'user-123',
			{
				validate: false,
				onDuplicate: 'skip'
			}
		);

		// Since validation is skipped, it proceeds to insert (which would work in this mock)
		expect(mockSupabase.from).toHaveBeenCalled();
		expect(result.success).toBe(true);
	});
});

describe('importExerciseFromMarkdown', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should import valid markdown exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const markdown = `---
version: "1.0"
difficulty: 2
tags:
  - test
title: "Markdown Import"
---

# Énoncé

Question from markdown

# Solution

Answer from markdown
`;

		// Mock no duplicates
		mockSupabase.__mockQuery.limit.mockResolvedValue({ data: [], error: null });
		// Mock successful insert
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: {
				id: 'markdown-ex-id',
				title: 'Markdown Import',
				difficulty: 2,
				created_by: 'user-123'
			},
			error: null
		});

		const result = await importExerciseFromMarkdown(mockSupabase, markdown, 'user-123');

		expect(result.success).toBe(true);
		expect(result.exerciseId).toBe('markdown-ex-id');
		expect(result.error).toBeUndefined();
	});

	it('should reject invalid markdown format', async () => {
		const mockSupabase = createMockSupabase() as any;
		const invalidMarkdown = `No frontmatter here

# Énoncé

Question

# Solution

Answer
`;

		const result = await importExerciseFromMarkdown(mockSupabase, invalidMarkdown, 'user-123');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
	});
});

describe('importExercisesFromJSON', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should import multiple exercises successfully', async () => {
		const mockSupabase = createMockSupabase() as any;
		const exercises = [
			{
				version: '1.0',
				difficulty: 1,
				tags: [],
				statement_md: 'Q1',
				solution_md: 'A1'
			},
			{
				version: '1.0',
				difficulty: 2,
				tags: [],
				statement_md: 'Q2',
				solution_md: 'A2'
			}
		];

		// Mock no duplicates for both
		mockSupabase.__mockQuery.limit.mockResolvedValue({ data: [], error: null });
		// Mock successful inserts
		mockSupabase.__mockQuery.single
			.mockResolvedValueOnce({ data: { id: 'ex-1' }, error: null })
			.mockResolvedValueOnce({ data: { id: 'ex-2' }, error: null });

		const result = await importExercisesFromJSON(mockSupabase, exercises, 'user-123');

		expect(result.success).toBe(true);
		expect(result.imported).toBe(2);
		expect(result.skipped).toBe(0);
		expect(result.failed).toBe(0);
		expect(result.importedIds).toEqual(['ex-1', 'ex-2']);
		expect(result.errors).toHaveLength(0);
	});

	it('should handle mix of success, skip, and errors', async () => {
		const mockSupabase = createMockSupabase() as any;
		const exercises = [
			{
				version: '1.0',
				difficulty: 1,
				tags: [],
				statement_md: 'Success',
				solution_md: 'A'
			},
			{
				version: '1.0',
				difficulty: 2,
				tags: [],
				statement_md: 'Duplicate',
				solution_md: 'A',
				title: 'Dup'
			},
			{
				version: '1.0',
				difficulty: 99, // Invalid
				tags: [],
				statement_md: 'Error',
				solution_md: 'A'
			}
		];

		// First: no duplicate, successful insert
		mockSupabase.__mockQuery.limit.mockResolvedValueOnce({ data: [], error: null });
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({ data: { id: 'ex-1' }, error: null });

		// Second: duplicate found
		mockSupabase.__mockQuery.limit.mockResolvedValueOnce({
			data: [{ id: 'existing', statement_md: 'Duplicate', title: 'Dup' }],
			error: null
		});

		// Third: validation error (handled before DB call)

		const result = await importExercisesFromJSON(mockSupabase, exercises, 'user-123');

		expect(result.success).toBe(false); // Because there were errors
		expect(result.imported).toBe(1);
		expect(result.skipped).toBe(1);
		expect(result.failed).toBe(1);
		expect(result.importedIds).toEqual(['ex-1']);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].index).toBe(2);
		expect(result.errors[0].error).toContain('difficulty');
	});

	it('should reject non-array input', async () => {
		const mockSupabase = createMockSupabase() as any;
		const notAnArray = {
			version: '1.0',
			difficulty: 1,
			tags: [],
			statement_md: 'Q',
			solution_md: 'A'
		};

		const result = await importExercisesFromJSON(mockSupabase, notAnArray as any, 'user-123');

		expect(result.success).toBe(false);
		expect(result.imported).toBe(0);
		expect(result.errors[0].error).toContain('array');
	});
});
