/**
 * Pedagogical Integration — Demo snapshot tests.
 *
 * Runs the pedagogical pipeline on every demo case across every supported
 * level × verbosity and snapshots the formatted output. Snapshot updates are
 * intentional and require eyeballed review.
 */

import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES_INTEGRATION } from '../demo-cases';
import { presentIntegral } from '../demo-helpers';

describe('pedagogical-integration demo cases', () => {
	for (const category of ALL_CATEGORIES_INTEGRATION) {
		describe(`category: ${category.name}`, () => {
			for (const testCase of category.cases) {
				it(`renders ${testCase.label}`, () => {
					const output = presentIntegral(testCase, 'latex');
					expect(output).toMatchSnapshot();
				});
			}
		});
	}
});
