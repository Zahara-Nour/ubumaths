import { describe, it, expect } from 'vitest';
import { PYTHON_EXAMPLES } from './index';
import { validateExamples } from './utils';

describe('PYTHON_EXAMPLES catalog', () => {
	it('contains the expected initial volume', () => {
		expect(PYTHON_EXAMPLES.length).toBeGreaterThanOrEqual(30);
	});

	it('passes full schema + uniqueness validation', () => {
		const result = validateExamples(PYTHON_EXAMPLES);
		expect(result.errors).toEqual([]);
		expect(result.valid).toBe(true);
	});

	it('every example has at least one level tag (college/lycee/nsi/superieur)', () => {
		const levels = new Set(['college', 'lycee', 'nsi', 'superieur']);
		const missing = PYTHON_EXAMPLES.filter((ex) => !ex.tags.some((t) => levels.has(t)));
		expect(missing.map((m) => m.id)).toEqual([]);
	});

	it('every example has non-trivial code (>= 30 chars)', () => {
		const tooShort = PYTHON_EXAMPLES.filter((ex) => ex.code.length < 30);
		expect(tooShort.map((m) => m.id)).toEqual([]);
	});
});
