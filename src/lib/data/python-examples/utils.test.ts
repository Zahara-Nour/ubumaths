import { describe, it, expect } from 'vitest';
import { filterExamples, getAllTagsFromExamples, validateExamples, groupByCategory } from './utils';
import type { PythonExample } from './types';

const examples: PythonExample[] = [
	{
		id: 'hello-world',
		title: 'Hello World',
		description: 'Premier programme Python',
		category: 'bases',
		tags: ['print', 'college'],
		code: 'print("hello")'
	},
	{
		id: 'listes-base',
		title: 'Listes',
		description: 'Manipuler des listes en Python',
		category: 'bases',
		tags: ['list', 'lycee'],
		code: 'xs = [1, 2, 3]\nprint(xs)'
	},
	{
		id: 'tri-bulles',
		title: 'Tri à bulles',
		description: 'Algorithme de tri pédagogique',
		category: 'algorithmes',
		tags: ['tri', 'nsi'],
		code: 'def tri_bulles(xs):\n    pass'
	},
	{
		id: 'numpy-vecteurs',
		title: 'Vecteurs avec NumPy',
		description: 'Opérations vectorielles',
		category: 'maths',
		tags: ['numpy', 'superieur'],
		code: 'import numpy as np'
	}
];

describe('filterExamples', () => {
	it('returns all examples when query is empty and no tags selected', () => {
		const result = filterExamples(examples, '', []);
		expect(result).toHaveLength(4);
	});

	it('matches title case-insensitively', () => {
		const result = filterExamples(examples, 'HELLO', []);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('hello-world');
	});

	it('matches description substring', () => {
		const result = filterExamples(examples, 'tri', []);
		const ids = result.map((e) => e.id);
		expect(ids).toContain('tri-bulles');
	});

	it('matches tag substring', () => {
		const result = filterExamples(examples, 'numpy', []);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('numpy-vecteurs');
	});

	it('trims whitespace in query', () => {
		const result = filterExamples(examples, '   listes   ', []);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('listes-base');
	});

	it('filters by single tag', () => {
		const result = filterExamples(examples, '', ['nsi']);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('tri-bulles');
	});

	it('filters by multiple tags using OR logic', () => {
		const result = filterExamples(examples, '', ['nsi', 'superieur']);
		const ids = result.map((e) => e.id).sort();
		expect(ids).toEqual(['numpy-vecteurs', 'tri-bulles']);
	});

	it('combines query AND tags (intersection)', () => {
		const result = filterExamples(examples, 'liste', ['lycee']);
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('listes-base');
	});

	it('returns empty when query AND tags do not intersect', () => {
		const result = filterExamples(examples, 'hello', ['nsi']);
		expect(result).toHaveLength(0);
	});
});

describe('getAllTagsFromExamples', () => {
	it('extracts unique tags across examples', () => {
		const tags = getAllTagsFromExamples(examples);
		expect(tags).toContain('print');
		expect(tags).toContain('list');
		expect(tags).toContain('numpy');
		expect(new Set(tags).size).toBe(tags.length);
	});

	it('returns tags sorted alphabetically', () => {
		const tags = getAllTagsFromExamples(examples);
		const sorted = [...tags].sort();
		expect(tags).toEqual(sorted);
	});

	it('returns empty array for no examples', () => {
		expect(getAllTagsFromExamples([])).toEqual([]);
	});

	it('does not mutate the input array', () => {
		const snapshot = JSON.stringify(examples);
		getAllTagsFromExamples(examples);
		expect(JSON.stringify(examples)).toBe(snapshot);
	});
});

describe('validateExamples', () => {
	it('accepts well-formed examples', () => {
		const result = validateExamples(examples);
		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it('detects duplicate ids', () => {
		const dup = [...examples, { ...examples[0] }];
		const result = validateExamples(dup);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => e.includes('hello-world'))).toBe(true);
	});

	it('rejects empty tags', () => {
		const bad = [{ ...examples[0], tags: [] }];
		const result = validateExamples(bad as PythonExample[]);
		expect(result.valid).toBe(false);
	});

	it('rejects invalid id format', () => {
		const bad = [{ ...examples[0], id: 'Not Kebab Case' }];
		const result = validateExamples(bad as PythonExample[]);
		expect(result.valid).toBe(false);
	});

	it('rejects empty code', () => {
		const bad = [{ ...examples[0], code: '' }];
		const result = validateExamples(bad as PythonExample[]);
		expect(result.valid).toBe(false);
	});

	it('rejects duplicate tags within a single example', () => {
		const bad = [{ ...examples[0], tags: ['print', 'print'] }];
		const result = validateExamples(bad as PythonExample[]);
		expect(result.valid).toBe(false);
		expect(result.errors.some((e) => /unique/i.test(e))).toBe(true);
	});
});

describe('groupByCategory', () => {
	it('groups examples into category buckets', () => {
		const groups = groupByCategory(examples);
		expect(groups.bases).toHaveLength(2);
		expect(groups.algorithmes).toHaveLength(1);
		expect(groups.maths).toHaveLength(1);
	});

	it('omits categories with no examples', () => {
		const groups = groupByCategory(examples);
		expect(groups.oop).toBeUndefined();
		expect(groups.io).toBeUndefined();
	});
});
