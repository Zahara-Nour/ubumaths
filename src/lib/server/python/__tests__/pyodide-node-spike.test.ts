/**
 * SPIKE (Phase 1b) — Feasibility of running the headless validation core under
 * Node via the `pyodide` npm package (v0.26.2, pinned to match the client CDN).
 *
 * Goal: prove that `runExerciseValidation(pyodide, code, config)` — extracted in
 * Phase 1a — executes faithfully with a Pyodide instance loaded in Node (not a
 * browser Web Worker). This de-risks the server-side re-check: same engine as the
 * client → same verdict.
 *
 * Not a permanent test. Measures cold-start load time for the Vercel-function
 * feasibility assessment. Run with: pnpm test:server <this file>.
 */

import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { loadPyodide } from 'pyodide';
import { runExerciseValidation } from '$lib/shared/python/validation-core';
import type { ExerciseValidationConfig, PyodideInterface } from '$lib/shared/python';

// Resolve the real pyodide dist dir (where pyodide.asm.wasm / python_stdlib.zip /
// pyodide-lock.json live) so loadPyodide doesn't mis-derive its indexURL under the
// test transformer. In a Vercel function these files must likewise be bundled and
// indexURL set explicitly — a key Pyodide-in-Node deployment constraint.
const require = createRequire(import.meta.url);
const PYODIDE_INDEX_URL = dirname(require.resolve('pyodide'));

describe('SPIKE: Pyodide-in-Node runs the headless validation core', () => {
	let pyodide: PyodideInterface;

	beforeAll(async () => {
		const t0 = performance.now();
		// loadPyodide() finds its wasm/stdlib in node_modules/pyodide; basic exec
		// needs no CDN round-trip.
		const instance = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
		pyodide = instance as unknown as PyodideInterface;
		// eslint-disable-next-line no-console
		console.log(`[spike] Pyodide loaded in Node in ${Math.round(performance.now() - t0)}ms`);
	}, 120_000);

	it('nominal: exact output match → valid', async () => {
		const config: ExerciseValidationConfig = {
			behavior: {
				kind: 'output',
				comparison: { kind: 'exact' },
				test_cases: [{ input: '', expected_output: 'hello\n' }]
			}
		};
		const t0 = performance.now();
		const result = await runExerciseValidation(pyodide, 'print("hello")', config);
		// eslint-disable-next-line no-console
		console.log(`[spike] nominal validation ran in ${Math.round(performance.now() - t0)}ms`);

		expect(result.valid).toBe(true);
		expect(result.failed_layer).toBeNull();
		expect(result.behavior_kind).toBe('output');
		expect(result.test_results[0]?.passed).toBe(true);
	}, 30_000);

	it('forged: mismatching stdout → invalid (this is the cheat the re-check must catch)', async () => {
		const config: ExerciseValidationConfig = {
			behavior: {
				kind: 'output',
				comparison: { kind: 'exact' },
				test_cases: [{ input: '', expected_output: 'hello\n' }]
			}
		};
		const result = await runExerciseValidation(pyodide, 'print("WRONG ANSWER")', config);

		expect(result.valid).toBe(false);
		expect(result.failed_layer).toBe('behavior');
	}, 30_000);

	it('variable_check with float tolerance → valid', async () => {
		const config: ExerciseValidationConfig = {
			behavior: {
				kind: 'variable_check',
				// expected 0.3 vs actual 0.1 + 0.2 = 0.30000000000000004 → passes via
				// the default float tolerance (proves the comparison engine runs in Node).
				expected_vars: { x: 0.3 }
			}
		};
		const result = await runExerciseValidation(pyodide, 'x = 0.1 + 0.2', config);

		expect(result.valid).toBe(true);
	}, 30_000);
});
