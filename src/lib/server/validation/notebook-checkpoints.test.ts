/**
 * Tests for notebook checkpoint validation schemas.
 */

import { describe, it, expect } from 'vitest';
import {
	upsertCheckpointRunSchema,
	checkpointStatusSchema,
	MAX_CELL_ID_LENGTH,
	MAX_ERROR_MESSAGE_LENGTH
} from './notebook-checkpoints';

describe('checkpointStatusSchema', () => {
	it("accepts 'passed' and 'failed'", () => {
		expect(checkpointStatusSchema.parse('passed')).toBe('passed');
		expect(checkpointStatusSchema.parse('failed')).toBe('failed');
	});

	it('rejects any other value', () => {
		expect(() => checkpointStatusSchema.parse('not_run')).toThrow();
		expect(() => checkpointStatusSchema.parse('pending')).toThrow();
		expect(() => checkpointStatusSchema.parse('')).toThrow();
		expect(() => checkpointStatusSchema.parse('PASSED')).toThrow();
	});
});

describe('upsertCheckpointRunSchema — happy paths', () => {
	it('accepts a passed run with no error_message', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'passed'
		});
		expect(result.success).toBe(true);
	});

	it('accepts a failed run with an error_message', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'failed',
			error_message: 'AssertionError: expected 6, got 5'
		});
		expect(result.success).toBe(true);
	});

	it('accepts a long error message just below the limit', () => {
		const longMessage = 'x'.repeat(MAX_ERROR_MESSAGE_LENGTH);
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'failed',
			error_message: longMessage
		});
		expect(result.success).toBe(true);
	});
});

describe('upsertCheckpointRunSchema — cell_id validation', () => {
	it('rejects an empty cell_id', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: '',
			status: 'passed'
		});
		expect(result.success).toBe(false);
	});

	it('rejects a missing cell_id', () => {
		const result = upsertCheckpointRunSchema.safeParse({ status: 'passed' });
		expect(result.success).toBe(false);
	});

	it('rejects a cell_id longer than MAX_CELL_ID_LENGTH', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'x'.repeat(MAX_CELL_ID_LENGTH + 1),
			status: 'passed'
		});
		expect(result.success).toBe(false);
	});

	it('accepts a cell_id at MAX_CELL_ID_LENGTH', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'x'.repeat(MAX_CELL_ID_LENGTH),
			status: 'passed'
		});
		expect(result.success).toBe(true);
	});
});

describe('upsertCheckpointRunSchema — error_message coherence with status', () => {
	it('rejects a passed run with an error_message (inconsistent)', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'passed',
			error_message: 'should not be here'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['error_message']);
		}
	});

	it('rejects a failed run without an error_message', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'failed'
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['error_message']);
		}
	});

	it('rejects a failed run with an empty error_message', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'failed',
			error_message: ''
		});
		expect(result.success).toBe(false);
	});

	it('rejects an error_message exceeding MAX_ERROR_MESSAGE_LENGTH', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'failed',
			error_message: 'x'.repeat(MAX_ERROR_MESSAGE_LENGTH + 1)
		});
		expect(result.success).toBe(false);
	});
});

describe('upsertCheckpointRunSchema — status validation', () => {
	it('rejects an invalid status', () => {
		const result = upsertCheckpointRunSchema.safeParse({
			cell_id: 'cell-123',
			status: 'not_run'
		});
		expect(result.success).toBe(false);
	});

	it('rejects a missing status', () => {
		const result = upsertCheckpointRunSchema.safeParse({ cell_id: 'cell-123' });
		expect(result.success).toBe(false);
	});
});
