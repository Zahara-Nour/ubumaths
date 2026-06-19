/**
 * assertTypedConfirmation — unit tests
 * @module lib/server/__tests__/confirmAction
 */

import { describe, it, expect } from 'vitest';
import { assertTypedConfirmation } from '../confirmAction';

describe('assertTypedConfirmation', () => {
	it('passes on an exact match', () => {
		expect(() => assertTypedConfirmation('Lycée Voltaire', 'Lycée Voltaire')).not.toThrow();
	});

	it('passes when only surrounding whitespace differs (both trimmed)', () => {
		expect(() => assertTypedConfirmation('  Lycée Voltaire  ', 'Lycée Voltaire')).not.toThrow();
	});

	it('throws 400 on a value mismatch', () => {
		try {
			assertTypedConfirmation('Autre école', 'Lycée Voltaire');
			expect.fail('should have thrown');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(400);
		}
	});

	it('is case-sensitive', () => {
		try {
			assertTypedConfirmation('lycée voltaire', 'Lycée Voltaire');
			expect.fail('should have thrown');
		} catch (err: unknown) {
			expect((err as { status: number }).status).toBe(400);
		}
	});

	it('throws 400 when the value is missing or not a string', () => {
		for (const bad of [undefined, null, 42, {}, []]) {
			try {
				assertTypedConfirmation(bad, 'X');
				expect.fail(`should have thrown for ${String(bad)}`);
			} catch (err: unknown) {
				expect((err as { status: number }).status).toBe(400);
			}
		}
	});
});
