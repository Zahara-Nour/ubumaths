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
	importExercisesFromJSON,
	DUPLICATE_SCAN_PAGE_SIZE
} from '../exercise-import-export';
import { validateExerciseExport } from '#lib/exercises/validation.ts';
import type { Exercise } from '#lib/exercises/types.ts';

// Stub tag-resolution helpers: importExerciseFromJSON calls createExercise()
// which uses syncResourceTags + syncResourceTags after the DB insert.
vi.mock('#lib/server/resource-tags.ts', () => ({
	syncResourceTags: vi.fn().mockResolvedValue(undefined),
	fetchResourceTagNames: vi.fn().mockResolvedValue([]),
	fetchTagNamesForResources: vi.fn().mockResolvedValue(new Map()),
	fetchResourceIdsByAnyTag: vi.fn().mockResolvedValue([])
}));

// Sample exercise for testing (with variations - single source of truth)
const sampleExercise: Exercise = {
	id: 'ex-123',
	title: 'Test Exercise',
	source: 'Test Book',
	category: 'automatisme',
	tags: ['algèbre', 'équations'],
	grades: ['3', '2'],
	topic: 'Algèbre',
	created_at: '2024-01-01T00:00:00Z',
	updated_at: '2024-01-01T00:00:00Z',
	created_by: 'user-123',
	distribution_mode: 'on_demand',
	is_public: false,
	variables: [],
	// Content is in variations (single source of truth)
	variations: [
		{
			label: 'default',
			statement_md: 'Résoudre $x^2 = 4$',
			solution_md: '$x = \\pm 2$'
		}
	]
};

// Mock Supabase client
const createMockSupabase = () => {
	const mockQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		range: vi.fn().mockReturnThis(),
		insert: vi.fn().mockReturnThis(),
		update: vi.fn().mockReturnThis(),
		single: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockReturnThis()
	};

	const versions = createVersionsQuery();

	return {
		from: vi.fn((table: string) => (table === 'exercise_versions' ? versions : mockQuery)),
		__mockQuery: mockQuery,
		__versions: versions
	};
};

/** Une ligne d'`exercise_versions` (ADR 0044) : le contenu d'un exercice vit là, pas sur `exercises`. */
function versionRow(exerciseId: string, variations: unknown, shared: unknown = null) {
	return {
		id: `version-${exerciseId}`,
		number: 1,
		exercise_id: exerciseId,
		variations,
		shared,
		generic_functions: null
	};
}

/**
 * Table `exercise_versions` : `order` rend les versions lues (`select().in().order()`),
 * `select()` en fin d'écriture (`insert/update … .select()`) rend une ligne écrite.
 */
function createVersionsQuery() {
	const q = {
		in: vi.fn(),
		eq: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		order: vi.fn().mockResolvedValue({ data: [], error: null }),
		select: vi.fn()
	};
	q.in.mockReturnValue(q);
	q.eq.mockReturnValue(q);
	q.insert.mockReturnValue(q);
	q.update.mockReturnValue(q);
	q.select.mockImplementation(() =>
		Object.assign(Promise.resolve({ data: [versionRow('written', [])], error: null }), q)
	);
	return q;
}

/** Client dont `exercises` suit l'ordre des requêtes données, `exercise_versions` la table dédiée. */
function clientWithQueues(exercisesQueries: unknown[], versions = createVersionsQuery()) {
	const queue = [...exercisesQueries];
	return {
		client: {
			from: vi.fn((table: string) => (table === 'exercise_versions' ? versions : queue.shift()))
		} as any,
		versions
	};
}

describe('exportExerciseToJSON', () => {
	it('should export exercise to JSON format', () => {
		const json = exportExerciseToJSON(sampleExercise);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('2.0');
		expect(parsed.category).toBe('automatisme');
		expect(parsed.tags).toEqual(['algèbre', 'équations']);
		expect(parsed.statement_md).toBe('Résoudre $x^2 = 4$');
		expect(parsed.solution_md).toBe('$x = \\pm 2$');
		expect(parsed.title).toBe('Test Exercise');
		expect(parsed.source).toBe('Test Book');
		expect(parsed.grades).toEqual(['3', '2']);
		expect(parsed.topic).toBe('Algèbre');
		// v2.0 includes variations
		expect(parsed.variations).toEqual([
			{ label: 'default', statement_md: 'Résoudre $x^2 = 4$', solution_md: '$x = \\pm 2$' }
		]);
	});

	it('should export with pretty print by default', () => {
		const json = exportExerciseToJSON(sampleExercise);

		expect(json).toContain('\n'); // Formatted JSON has newlines
		expect(json).toContain('  '); // And indentation
	});

	it('should export without pretty print when specified', () => {
		const json = exportExerciseToJSON(sampleExercise, false);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('2.0');
		expect(json).not.toContain('\n  '); // No indentation
	});

	it('should handle exercise with minimal fields', () => {
		const minimalExercise: Exercise = {
			id: 'ex-min',
			category: 'automatisme',
			tags: [],
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			variations: [
				{ label: 'default', statement_md: 'Simple question', solution_md: 'Simple answer' }
			]
		};

		const json = exportExerciseToJSON(minimalExercise);
		const parsed = JSON.parse(json);

		expect(parsed.version).toBe('2.0');
		expect(parsed.category).toBe('automatisme');
		expect(parsed.tags).toEqual([]);
		// Optional fields that are undefined in source are not included in export
		expect(parsed.title).toBeUndefined();
		expect(parsed.source).toBeUndefined();
		// Content from variations
		expect(parsed.statement_md).toBe('Simple question');
		expect(parsed.solution_md).toBe('Simple answer');
	});
});

describe('exportExerciseToMarkdown', () => {
	it('should export exercise to markdown format', () => {
		const markdown = exportExerciseToMarkdown(sampleExercise);

		expect(markdown).toContain('---');
		expect(markdown).toContain('version:');
		expect(markdown).toContain('2.0');
		expect(markdown).toContain('category: automatisme');
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
			category: 'automatisme',
			tags: [],
			created_at: '2024-01-01T00:00:00Z',
			updated_at: '2024-01-01T00:00:00Z',
			created_by: 'user-123',
			distribution_mode: 'on_demand',
			variations: [{ label: 'default', statement_md: 'Q', solution_md: 'A' }]
		};

		const markdown = exportExerciseToMarkdown(minimalExercise);

		expect(markdown).toContain('category: automatisme');
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
			category: 'automatisme',
			tags: ['test'],
			statement_md: 'Question',
			solution_md: 'Answer',
			title: 'Imported Exercise'
		};

		// Mock no duplicates found (range returns empty array)
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null });
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
			category: 'automatisme',
			tags: [],
			statement_md: 'Duplicate Question',
			solution_md: 'Answer',
			title: 'Duplicate'
		};

		// Doublon trouvé : l'identité sur `exercises`, le contenu comparé sur sa dernière version
		mockSupabase.__mockQuery.range.mockResolvedValue({
			data: [{ id: 'existing-ex-id', title: 'Duplicate' }],
			error: null
		});
		mockSupabase.__versions.order.mockResolvedValue({
			data: [
				versionRow('existing-ex-id', [
					{ label: 'default', statement_md: 'Duplicate Question', solution_md: 'Answer' }
				])
			],
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
			category: 'automatisme',
			tags: ['updated'],
			statement_md: 'Updated Question',
			solution_md: 'Updated Answer',
			title: 'Updated Title'
		};

		// Doublon trouvé (même titre ; contenu lu sur la dernière version, ancien `variations`
		// encore posé sur la ligne d'`exercises` pour prouver qu'il n'est pas lu)
		mockSupabase.__mockQuery.range.mockResolvedValueOnce({
			data: [
				{
					id: 'existing-ex-id',
					title: 'Updated Title',
					variations: [{ label: 'default', statement_md: 'Ancien', solution_md: 'Ancien' }]
				}
			],
			error: null
		});
		mockSupabase.__versions.order.mockResolvedValue({
			data: [
				versionRow('existing-ex-id', [
					{ label: 'default', statement_md: 'Updated Question', solution_md: 'Updated Answer' }
				])
			],
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
				category: 'automatisme',
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
		// Le contenu remplacé part vers la version existante, pas vers la ligne d'`exercises`
		const identityUpdate = mockSupabase.__mockQuery.update.mock.calls[0][0];
		expect(identityUpdate).not.toHaveProperty('variations');
		expect(identityUpdate).not.toHaveProperty('shared');
		expect(mockSupabase.__versions.update).toHaveBeenCalledTimes(1);
		const versionUpdate = mockSupabase.__versions.update.mock.calls[0][0];
		expect(JSON.stringify(versionUpdate.variations)).toContain('Updated Question');
		expect(mockSupabase.__versions.eq).toHaveBeenCalledWith('id', 'version-existing-ex-id');
		expect(mockSupabase.__versions.eq).toHaveBeenCalledWith('exercise_id', 'existing-ex-id');
	});

	it('should reject replace when user does not own the exercise', async () => {
		const mockSupabase = createMockSupabase() as any;
		const jsonData = {
			version: '1.0',
			category: 'automatisme',
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer',
			title: 'Title'
		};

		// Doublon trouvé : identité sur `exercises`, contenu sur la version
		mockSupabase.__mockQuery.range.mockResolvedValueOnce({
			data: [{ id: 'other-user-ex-id', title: 'Title' }],
			error: null
		});
		mockSupabase.__versions.order.mockResolvedValue({
			data: [
				versionRow('other-user-ex-id', [
					{ label: 'default', statement_md: 'Question', solution_md: 'Answer' }
				])
			],
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
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [
					{
						id: 'existing-ex-id',
						title: 'Original Title'
					}
				],
				error: null
			})
		};
		const versions = createVersionsQuery();
		versions.order.mockResolvedValue({
			data: [
				versionRow('existing-ex-id', [
					{ label: 'default', statement_md: 'Duplicate Question', solution_md: 'Answer' }
				])
			],
			error: null
		});

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
					category: 'automatisme',
					tags: ['test'],
					statement_md: 'Duplicate Question',
					solution_md: 'Answer',
					created_by: 'user-123'
				},
				error: null
			})
		};

		const { client: mockSupabase } = clientWithQueues(
			[mockQuery1, mockQuery2, mockQuery3],
			versions
		);

		const jsonData = {
			version: '1.0',
			category: 'automatisme',
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
			order: vi.fn().mockReturnThis(),
			range: vi.fn().mockResolvedValue({
				data: [
					{
						id: 'existing-ex-id',
						title: 'Title'
					}
				],
				error: null
			})
		};
		const versions = createVersionsQuery();
		versions.order.mockResolvedValue({
			data: [
				versionRow('existing-ex-id', [
					{ label: 'default', statement_md: 'Question', solution_md: 'Answer' }
				])
			],
			error: null
		});

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
					category: 'automatisme',
					tags: [],
					statement_md: 'Question',
					solution_md: 'Answer',
					created_by: 'user-123'
				},
				error: null
			})
		};

		const { client: mockSupabase } = clientWithQueues(
			[mockQuery1, mockQuery2, mockQuery3],
			versions
		);

		const jsonData = {
			version: '1.0',
			category: 'automatisme',
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
			category: 'invalid_category', // Invalid
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer'
		};

		const result = await importExerciseFromJSON(mockSupabase, invalidData, 'user-123');

		expect(result.success).toBe(false);
		expect(result.error).toBeDefined();
		// Union validation fails when category is invalid
		expect(result.error).toContain('invalide');
	});

	it('should skip validation when validate is false', async () => {
		const mockSupabase = createMockSupabase() as any;
		const dataWithInvalidDifficulty = {
			version: '1.0',
			category: 'invalid_category',
			tags: [],
			statement_md: 'Question',
			solution_md: 'Answer'
		};

		// Mock no duplicates
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null });
		// Mock successful insert (would fail validation normally)
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: { id: 'new-id', category: 'invalid_category', created_by: 'user-123' },
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
category: 'automatisme'
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
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null });
		// Mock successful insert
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: {
				id: 'markdown-ex-id',
				title: 'Markdown Import',
				category: 'automatisme',
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
				category: 'automatisme',
				tags: [],
				statement_md: 'Q1',
				solution_md: 'A1'
			},
			{
				version: '1.0',
				category: 'automatisme',
				tags: [],
				statement_md: 'Q2',
				solution_md: 'A2'
			}
		];

		// Mock no duplicates for both
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null });
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
				category: 'automatisme',
				tags: [],
				statement_md: 'Success',
				solution_md: 'A'
			},
			{
				version: '1.0',
				category: 'automatisme',
				tags: [],
				statement_md: 'Duplicate',
				solution_md: 'A',
				title: 'Dup'
			},
			{
				version: '1.0',
				category: 'invalid_category', // Invalid
				tags: [],
				statement_md: 'Error',
				solution_md: 'A'
			}
		];

		// First: no duplicate, successful insert
		mockSupabase.__mockQuery.range.mockResolvedValueOnce({ data: [], error: null });
		mockSupabase.__mockQuery.single.mockResolvedValueOnce({ data: { id: 'ex-1' }, error: null });

		// Second: duplicate found
		mockSupabase.__mockQuery.range.mockResolvedValueOnce({
			data: [{ id: 'existing', title: 'Dup' }],
			error: null
		});
		mockSupabase.__versions.order.mockResolvedValue({
			data: [
				versionRow('existing', [{ label: 'default', statement_md: 'Duplicate', solution_md: 'A' }])
			],
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
		// Union validation fails when category is invalid
		expect(result.errors[0].error).toContain('invalide');
	});

	it('should reject non-array input', async () => {
		const mockSupabase = createMockSupabase() as any;
		const notAnArray = {
			version: '1.0',
			category: 'automatisme',
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

describe('doublons à l’import : TOUS les exercices de l’auteur', () => {
	it('trouve un doublon au-delà de la première page (lecture paginée et ordonnée)', async () => {
		const mockSupabase = createMockSupabase() as any;
		const otherRows = Array.from({ length: DUPLICATE_SCAN_PAGE_SIZE }, (_, i) => ({
			id: `other-${i}`,
			title: `Autre ${i}`
		}));
		mockSupabase.__mockQuery.range
			.mockResolvedValueOnce({ data: otherRows, error: null })
			.mockResolvedValueOnce({
				data: [{ id: 'dup-page-2', title: 'Tardif' }],
				error: null
			});
		// Contenu : les versions lues par paquets d'identifiants (l'adresse de la requête est bornée)
		let askedIds: string[] = [];
		mockSupabase.__versions.in.mockImplementation((_column: string, ids: string[]) => {
			askedIds = ids;
			return mockSupabase.__versions;
		});
		mockSupabase.__versions.order.mockImplementation(async () => ({
			data: askedIds.map((id) =>
				versionRow(id, [
					{
						label: 'default',
						statement_md: id === 'dup-page-2' ? 'Question tardive' : `Énoncé ${id}`,
						solution_md: 'R'
					}
				])
			),
			error: null
		}));

		const result = await importExerciseFromJSON(
			mockSupabase,
			{
				version: '1.0',
				category: 'automatisme',
				tags: [],
				statement_md: 'Question tardive',
				solution_md: 'R',
				title: 'Tardif'
			},
			'user-123',
			{ onDuplicate: 'skip' }
		);

		expect(result).toMatchObject({ success: true, skipped: true, exerciseId: 'dup-page-2' });
		expect(mockSupabase.__mockQuery.order).toHaveBeenCalledWith('id', { ascending: true });
		expect(mockSupabase.__mockQuery.range).toHaveBeenNthCalledWith(
			2,
			DUPLICATE_SCAN_PAGE_SIZE,
			2 * DUPLICATE_SCAN_PAGE_SIZE - 1
		);
	});
});

describe('export : fonctions génériques, ressources, mode de distribution', () => {
	const fullExercise: Exercise = {
		...sampleExercise,
		slug: 'pythagore-unique',
		generic_functions: ['f', 'P'],
		resources: [{ type: 'video', url: 'https://example.org/v', title: 'Vidéo' }],
		distribution_mode: 'per_student'
	};

	it('les porte dans le JSON, sans le slug (qui doit rester unique)', () => {
		const parsed = JSON.parse(exportExerciseToJSON(fullExercise));

		expect(parsed.generic_functions).toEqual(['f', 'P']);
		expect(parsed.resources).toEqual([
			{ type: 'video', url: 'https://example.org/v', title: 'Vidéo' }
		]);
		expect(parsed.distribution_mode).toBe('per_student');
		expect(parsed.slug).toBeUndefined();
	});

	it('l’import les relit (validation Zod)', () => {
		const parsed = JSON.parse(exportExerciseToJSON(fullExercise));
		const validation = validateExerciseExport(parsed);

		expect(validation.success).toBe(true);
		expect(validation.data).toMatchObject({
			generic_functions: ['f', 'P'],
			resources: [{ type: 'video', url: 'https://example.org/v', title: 'Vidéo' }],
			distribution_mode: 'per_student'
		});
	});

	it('l’import refuse un mode de distribution inconnu ou une fonction mal nommée', () => {
		const parsed = JSON.parse(exportExerciseToJSON(fullExercise));

		expect(validateExerciseExport({ ...parsed, distribution_mode: 'tous' }).success).toBe(false);
		expect(validateExerciseExport({ ...parsed, generic_functions: ['1f'] }).success).toBe(false);
		expect(
			validateExerciseExport({
				...parsed,
				resources: [{ type: 'video', url: 'javascript:alert(1)', title: 'x' }]
			}).success
		).toBe(false);
	});

	it('l’import transmet ces champs à la création', async () => {
		const mockSupabase = createMockSupabase() as any;
		mockSupabase.__mockQuery.range.mockResolvedValue({ data: [], error: null });
		mockSupabase.__mockQuery.single.mockResolvedValue({
			data: { id: 'new-ex-id', created_by: 'user-123' },
			error: null
		});

		const result = await importExerciseFromJSON(
			mockSupabase,
			JSON.parse(exportExerciseToJSON(fullExercise)),
			'user-123'
		);

		expect(result.success).toBe(true);
		expect(mockSupabase.__mockQuery.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				resources: [{ type: 'video', url: 'https://example.org/v', title: 'Vidéo' }],
				distribution_mode: 'per_student'
			})
		);
		// Les fonctions de l'exercice sont du contenu : elles partent dans la version 1, pas sur la ligne
		expect(mockSupabase.__mockQuery.insert.mock.calls[0][0]).not.toHaveProperty(
			'generic_functions'
		);
		expect(mockSupabase.__versions.insert).toHaveBeenCalledWith(
			expect.objectContaining({
				exercise_id: 'new-ex-id',
				number: 1,
				generic_functions: ['f', 'P']
			})
		);
	});
});
