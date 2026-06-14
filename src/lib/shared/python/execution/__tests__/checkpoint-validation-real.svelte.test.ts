/**
 * Notebook Checkpoint Validation — Real Pyodide Integration Tests
 * ===============================================================
 *
 * Tests the worker's behavior when `validate-exercise` is sent with a
 * `contextId` (notebook checkpoint mode):
 *  - `assert` behavior runs against the persistent namespace
 *  - `unit_test` and `variable_check` use the persistent namespace
 *    instead of re-execing the top-level `code` parameter
 *  - non-existent contextId fails cleanly with an error
 *
 * Pre-requisite for these tests to mean anything: the worker must hold a
 * persistent context populated by previous `execute` calls. We send
 * `create-context` explicitly here (the NotebookExecutor lifecycle does
 * NOT yet call create-context — that wiring lands in Phase 4 when the
 * checkpoint UI is implemented).
 *
 * Pyodide is loaded once in beforeAll (~5-15s on first run, cached afterwards).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
	BasePythonExecutor,
	type ExerciseValidationConfig,
	type ToWorkerMessage
} from '$lib/shared/python';

// =============================================================================
// Test harness — a TestExecutor that holds a persistent context
// =============================================================================

const TEST_CONTEXT_ID = 'notebook_test-checkpoint-ctx';

class CheckpointTestExecutor extends BasePythonExecutor {
	getContextId(): string {
		return TEST_CONTEXT_ID;
	}
	isPersistentContext(): boolean {
		return true;
	}
	protected onExecutionComplete(_duration: number): void {
		// no-op
	}
	protected onExecutionError(_message: string, _line?: number): void {
		// no-op
	}

	/** Expose postToWorker so the test can send `create-context` directly. */
	sendCreateContext(): void {
		this.postToWorker({
			type: 'create-context',
			contextId: TEST_CONTEXT_ID,
			persistent: true
		} as ToWorkerMessage);
	}

	sendDestroyContext(): void {
		this.postToWorker({
			type: 'destroy-context',
			contextId: TEST_CONTEXT_ID
		} as ToWorkerMessage);
	}
}

const PYODIDE_LOAD_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 50;
const TEST_TIMEOUT_MS = 30_000;

async function waitForReady(
	executor: CheckpointTestExecutor,
	timeoutMs = PYODIDE_LOAD_TIMEOUT_MS
): Promise<void> {
	const start = Date.now();
	while (executor.state !== 'ready') {
		if (executor.state === 'error') {
			throw new Error(`Pyodide failed to load: ${executor.stderr}`);
		}
		if (Date.now() - start > timeoutMs) {
			throw new Error(`Pyodide load timeout — last state: ${executor.state}`);
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

async function waitForExecuteComplete(
	executor: CheckpointTestExecutor,
	timeoutMs = TEST_TIMEOUT_MS
): Promise<void> {
	const start = Date.now();
	while (executor.state === 'executing') {
		if (Date.now() - start > timeoutMs) {
			throw new Error(`execute() timeout — state: ${executor.state}`);
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

/**
 * Setup a clean persistent context with the given pre-loaded student code.
 * Destroys the previous context first to guarantee a fresh state.
 */
async function setupPersistentContext(
	executor: CheckpointTestExecutor,
	studentCode: string
): Promise<void> {
	executor.sendDestroyContext();
	// Give the worker a tick to process the destroy
	await new Promise((r) => setTimeout(r, 50));
	executor.sendCreateContext();
	await new Promise((r) => setTimeout(r, 50));
	executor.execute(studentCode);
	await waitForExecuteComplete(executor);
}

// =============================================================================
// Test Suite
// =============================================================================

describe('Notebook checkpoint validation (real Pyodide)', () => {
	let executor: CheckpointTestExecutor;

	beforeAll(async () => {
		executor = new CheckpointTestExecutor();
		executor.initPyodide();
		await waitForReady(executor);
	}, PYODIDE_LOAD_TIMEOUT_MS);

	afterAll(() => {
		executor?.destroy();
	});

	// ===========================================================================
	// assert behavior
	// ===========================================================================

	describe('assert behavior', () => {
		it(
			'passes when assertion holds against the persistent namespace',
			async () => {
				await setupPersistentContext(executor, 'def moyenne(lst): return sum(lst) / len(lst)');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert moyenne([1, 2, 3]) == 2'
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(true);
				expect(result.failed_layer).toBeNull();
				expect(result.behavior_kind).toBe('assert');
				expect(result.test_results).toHaveLength(1);
				expect(result.test_results[0].passed).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'fails with AssertionError when assertion does not hold',
			async () => {
				await setupPersistentContext(executor, 'def moyenne(lst): return 99');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert moyenne([1, 2, 3]) == 2'
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('behavior');
				expect(result.behavior_kind).toBe('assert');
				expect(result.test_results[0].passed).toBe(false);
				expect(result.test_results[0].error).toMatch(/AssertionError/i);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'fails when the referenced function is not defined',
			async () => {
				await setupPersistentContext(executor, 'x = 42');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert moyenne([1, 2, 3]) == 2'
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(false);
				expect(result.test_results[0].passed).toBe(false);
				expect(result.test_results[0].error).toMatch(/NameError|moyenne/i);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'sees variables accumulated across multiple execute calls',
			async () => {
				executor.sendDestroyContext();
				await new Promise((r) => setTimeout(r, 50));
				executor.sendCreateContext();
				await new Promise((r) => setTimeout(r, 50));

				executor.execute('a = 5');
				await waitForExecuteComplete(executor);
				executor.execute('b = 7');
				await waitForExecuteComplete(executor);
				executor.execute('total = a + b');
				await waitForExecuteComplete(executor);

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert total == 12'
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'returns a clean error when contextId does not exist',
			async () => {
				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert True'
					}
				};

				const result = await executor.validateExercise(
					'',
					config,
					'notebook_does-not-exist-anywhere'
				);

				expect(result.valid).toBe(false);
				expect(result.error).toMatch(/contexte|introuvable/i);
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// variable_check behavior in checkpoint mode
	// ===========================================================================

	describe('variable_check behavior (contextId mode)', () => {
		it(
			'reads variables from the persistent namespace without re-executing top-level code',
			async () => {
				await setupPersistentContext(executor, 'x = 6\ny = 7');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'variable_check',
						expected_vars: { x: 6, y: 7 }
					}
				};

				// The empty `code` is intentional — we want the runner to read
				// `x` and `y` from the namespace, not exec anything new.
				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(true);
				expect(result.test_results).toHaveLength(2);
				expect(result.test_results[0].passed).toBe(true);
				expect(result.test_results[1].passed).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'fails cleanly when a variable is missing from the persistent namespace',
			async () => {
				await setupPersistentContext(executor, 'x = 6');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'variable_check',
						expected_vars: { x: 6, y: 7 }
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(false);
				expect(result.test_results).toHaveLength(2);
				expect(result.test_results[0].passed).toBe(true);
				expect(result.test_results[1].passed).toBe(false);
				expect(result.test_results[1].diff).toMatch(/y.*pas définie|n'est pas définie/);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'does NOT re-execute the top-level code parameter (would otherwise overwrite the persistent state)',
			async () => {
				await setupPersistentContext(executor, 'x = 100');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'variable_check',
						expected_vars: { x: 100 }
					}
				};

				// If the runner exec'd this code, x would be overwritten to 0
				// and the assertion x == 100 would fail.
				const result = await executor.validateExercise('x = 0', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(true);
				expect(result.test_results[0].actual).toBe('100');
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// unit_test behavior in checkpoint mode
	// ===========================================================================

	describe('unit_test behavior (contextId mode)', () => {
		it(
			'calls a function defined in the persistent namespace',
			async () => {
				await setupPersistentContext(executor, 'def double(x): return x * 2');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'unit_test',
						function_name: 'double',
						test_cases: [
							{ args: [3], expected: 6 },
							{ args: [10], expected: 20 }
						]
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(true);
				expect(result.test_results).toHaveLength(2);
				expect(result.test_results.every((tr) => tr.passed)).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'reports the missing function when the persistent namespace lacks it',
			async () => {
				await setupPersistentContext(executor, 'x = 42');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'unit_test',
						function_name: 'never_defined',
						test_cases: [{ args: [1], expected: 1 }]
					}
				};

				const result = await executor.validateExercise('', config, TEST_CONTEXT_ID);

				expect(result.valid).toBe(false);
				expect(result.test_results[0].error).toMatch(/never_defined.*pas.*definie|n'est pas/);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'does NOT re-execute the top-level code parameter',
			async () => {
				await setupPersistentContext(executor, 'def f(x): return x + 1');

				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'unit_test',
						function_name: 'f',
						test_cases: [{ args: [10], expected: 11 }]
					}
				};

				// If the runner re-exec'd this, `f` would be overwritten.
				const result = await executor.validateExercise(
					'def f(x): return x * 100',
					config,
					TEST_CONTEXT_ID
				);

				expect(result.valid).toBe(true);
				expect(result.test_results[0].passed).toBe(true);
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// Persistence guarantee — namespace not destroyed after validation
	// ===========================================================================

	describe('namespace lifecycle (checkpoint mode)', () => {
		it(
			'preserves the namespace after a validation call (so subsequent cells still see the variables)',
			async () => {
				await setupPersistentContext(executor, 'persistent_var = 999');

				// First validation
				const config1: ExerciseValidationConfig = {
					behavior: {
						kind: 'variable_check',
						expected_vars: { persistent_var: 999 }
					}
				};
				const r1 = await executor.validateExercise('', config1, TEST_CONTEXT_ID);
				expect(r1.valid).toBe(true);

				// Second validation — would fail if the namespace had been destroyed
				const config2: ExerciseValidationConfig = {
					behavior: {
						kind: 'assert',
						code: 'assert persistent_var == 999'
					}
				};
				const r2 = await executor.validateExercise('', config2, TEST_CONTEXT_ID);
				expect(r2.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'still allows execute() to see the persistent state after a validation call',
			async () => {
				await setupPersistentContext(executor, 'base = 42');

				const config: ExerciseValidationConfig = {
					behavior: { kind: 'assert', code: 'assert base == 42' }
				};
				const r = await executor.validateExercise('', config, TEST_CONTEXT_ID);
				expect(r.valid).toBe(true);

				// After validation, a regular execute should still see `base`.
				executor.execute('derived = base + 1');
				await waitForExecuteComplete(executor);

				const checkAfter: ExerciseValidationConfig = {
					behavior: { kind: 'assert', code: 'assert derived == 43' }
				};
				const rAfter = await executor.validateExercise('', checkAfter, TEST_CONTEXT_ID);
				expect(rAfter.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// Defensive rejections — keeps the notebook namespace safe
	// ===========================================================================

	describe('checkpoint mode rejects unsupported V1 configurations', () => {
		it(
			"rejects 'output' behavior when contextId is set (would pollute namespace with stdin/stdout scaffolding)",
			async () => {
				await setupPersistentContext(executor, 'pass');
				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'x' }]
					}
				};
				const r = await executor.validateExercise('print("x")', config, TEST_CONTEXT_ID);
				expect(r.valid).toBe(false);
				expect(r.error).toMatch(/output.*non supporté|V1/);
			},
			TEST_TIMEOUT_MS
		);

		it(
			"rejects 'reference_solution' behavior when contextId is set",
			async () => {
				await setupPersistentContext(executor, 'pass');
				const config: ExerciseValidationConfig = {
					behavior: {
						kind: 'reference_solution',
						function_name: 'f',
						reference_code: 'def f(x): return x',
						fixed: { cases: [{ args: [1], expected: 1 }] }
					}
				};
				const r = await executor.validateExercise('def f(x): return x', config, TEST_CONTEXT_ID);
				expect(r.valid).toBe(false);
				expect(r.error).toMatch(/reference_solution.*non supporté|V1/);
			},
			TEST_TIMEOUT_MS
		);

		it(
			"rejects 'ast_requirements' when contextId is set (would apply to empty top-level code, not to the notebook cells)",
			async () => {
				await setupPersistentContext(executor, 'for i in range(3): pass');
				const config: ExerciseValidationConfig = {
					ast_requirements: [{ type: 'uses_loop', message: 'Tu dois utiliser une boucle' }],
					behavior: { kind: 'assert', code: 'assert True' }
				};
				const r = await executor.validateExercise('', config, TEST_CONTEXT_ID);
				expect(r.valid).toBe(false);
				expect(r.error).toMatch(/ast_requirements.*non supporté|V1/);
			},
			TEST_TIMEOUT_MS
		);
	});
});
