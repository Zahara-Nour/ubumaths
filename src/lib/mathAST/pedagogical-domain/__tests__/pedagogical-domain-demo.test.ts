/**
 * Snapshot test for the pedagogical domain demo CLI.
 *
 * One snapshot per (category, case) pair, covering all school levels and
 * verbosities at once via `presentDomain`. The default `'latex'` output
 * keeps snapshots stable across changes to the custom-syntax pretty-printer.
 *
 * Adding new categories or cases is automatic — they show up here as new
 * snapshots that need approval (`vitest -u` or interactive review).
 */

import { describe, expect, it } from 'vitest';
import { ALL_CATEGORIES, presentDomain } from '../index';

describe('Pedagogical domain demo cases (LaTeX format)', () => {
	for (const category of ALL_CATEGORIES) {
		describe(category.name, () => {
			for (const testCase of category.cases) {
				it(`renders: ${testCase.label}`, () => {
					expect(presentDomain(testCase, 'latex')).toMatchSnapshot();
				});
			}
		});
	}
});
