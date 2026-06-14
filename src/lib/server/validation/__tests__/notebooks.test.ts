/**
 * Regression tests for the notebook PUT validation schema.
 *
 * The notebook PUT endpoint silently 400'd every save attempt that
 * carried a cell, because the original schema required `id: z.uuid()`
 * (but the store generates `cell-${Date.now()}-${rand}` ids) and the
 * `type` enum did not include `'checkpoint'`. These tests pin the
 * accepted shape so future schema edits can't reintroduce either bug.
 */

import { describe, it, expect } from 'vitest';
import { updateNotebookSchema } from '../notebooks';

const VALID_TS = '2026-06-03T10:00:00.000Z';

function makeContent(cells: unknown[]): unknown {
	return {
		version: '1.0',
		metadata: { title: 'T', created_at: VALID_TS, updated_at: VALID_TS },
		cells
	};
}

function makeCodeCell(overrides: Record<string, unknown> = {}): unknown {
	return {
		id: 'cell-1780500000000-abc123',
		type: 'code',
		source: "print('hello')",
		execution_count: 1,
		outputs: [{ output_type: 'stream', name: 'stdout', text: 'hello\n' }],
		state: 'success',
		...overrides
	};
}

describe('updateNotebookSchema — cell id', () => {
	it('accepts the store-generated `cell-<ts>-<rand>` id (NOT a UUID)', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell()])
		});
		expect(result.success).toBe(true);
	});

	it('rejects an empty id', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell({ id: '' })])
		});
		expect(result.success).toBe(false);
	});

	it('rejects an id longer than 100 chars', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell({ id: 'x'.repeat(101) })])
		});
		expect(result.success).toBe(false);
	});
});

describe('updateNotebookSchema — cell type', () => {
	it('accepts code cells', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell()])
		});
		expect(result.success).toBe(true);
	});

	it('accepts markdown cells', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell({ type: 'markdown', source: '# Title', outputs: [] })])
		});
		expect(result.success).toBe(true);
	});

	it('accepts checkpoint cells with mode = assert', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-cp',
					type: 'checkpoint',
					source: 'assert x == 6',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'assert', code: 'assert x == 6' },
					title: 'Étape 1'
				}
			])
		});
		expect(result.success).toBe(true);
	});

	it('accepts checkpoint cells with mode = unit_test', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-ut',
					type: 'checkpoint',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: {
						mode: 'unit_test',
						function_name: 'moyenne',
						test_cases: [{ args: [[1, 2, 3]], expected: 2 }]
					}
				}
			])
		});
		expect(result.success).toBe(true);
	});

	it('accepts checkpoint cells with mode = variable_check', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-vc',
					type: 'checkpoint',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'variable_check', expected_vars: { x: 6, y: 7 } }
				}
			])
		});
		expect(result.success).toBe(true);
	});

	it('rejects an unknown cell type', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([makeCodeCell({ type: 'sql' })])
		});
		expect(result.success).toBe(false);
	});

	it('rejects a checkpoint cell with an unknown mode', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-bad',
					type: 'checkpoint',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'output', code: 'print()' }
				}
			])
		});
		expect(result.success).toBe(false);
	});
});

describe('updateNotebookSchema — hint field', () => {
	it('accepts a checkpoint with a hint', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-cp',
					type: 'checkpoint',
					source: 'assert x == 6',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'assert', code: 'assert x == 6' },
					hint: 'Pense à la formule moyenne = somme / nombre.'
				}
			])
		});
		expect(result.success).toBe(true);
	});

	it('rejects a hint longer than 2000 chars', () => {
		const result = updateNotebookSchema.safeParse({
			content: makeContent([
				{
					id: 'cell-1780500000000-cp',
					type: 'checkpoint',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle',
					checkpoint: { mode: 'assert', code: 'assert True' },
					hint: 'x'.repeat(2001)
				}
			])
		});
		expect(result.success).toBe(false);
	});
});

describe('updateNotebookSchema — partial updates still work', () => {
	it('accepts a title-only update without content', () => {
		const result = updateNotebookSchema.safeParse({ title: 'Nouveau titre' });
		expect(result.success).toBe(true);
	});

	it('accepts an is_public-only update without content', () => {
		const result = updateNotebookSchema.safeParse({ is_public: true });
		expect(result.success).toBe(true);
	});
});
