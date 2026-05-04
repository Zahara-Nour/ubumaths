/**
 * Pedagogical Linear Demo — Snapshot Tests
 *
 * Each equation has a snapshot file (in `__snapshots__/linear-demo.test.ts.snap`)
 * containing the expected output. The test calls `presentEquation(...)` and
 * compares byte-for-byte to the snapshot.
 *
 * - First run / new equation → vitest creates the snapshot, mark it for review.
 * - Output drift → test fails with a diff. Either fix the code, or update the
 *   snapshot via `pnpm test:server <path> -u`.
 *
 * The same `presentEquation` is consumed by `scripts/pedagogical-solve-demo.ts`
 * so the standalone CLI and the test always agree.
 *
 * @module mathAST/pedagogical-solve/__tests__/linear-demo
 */

import { describe, it, expect } from 'vitest';
import {
	presentEquation,
	EQ_2X_PLUS_3_EQ_7,
	EQ_3X_MINUS_2_EQ_MINUS_5X_PLUS_7
} from '../demo-helpers';

describe('Pedagogical linear demo — snapshot', () => {
	it('matches snapshot for 2x + 3 = 7', () => {
		expect(presentEquation('2x + 3 = 7', EQ_2X_PLUS_3_EQ_7)).toMatchSnapshot();
	});

	it('matches snapshot for 3x − 2 = −5x + 7', () => {
		expect(presentEquation('3x − 2 = −5x + 7', EQ_3X_MINUS_2_EQ_MINUS_5X_PLUS_7)).toMatchSnapshot();
	});
});
