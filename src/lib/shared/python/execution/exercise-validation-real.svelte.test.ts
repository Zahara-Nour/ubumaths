/**
 * Exercise Validation — Real Pyodide Integration Tests
 * ======================================================
 *
 * Unlike base-executor.svelte.test.ts which mocks the Worker, this file lets
 * BasePythonExecutor spawn the actual pyodide.worker.ts and load Pyodide
 * from the CDN inside the chromium browser project. Tests cover:
 *
 * - happy / sad paths for the AST + behavior pipeline
 * - isolation guarantees added in commit 4d39ceaf5
 * - the 9-case matrix from `docs/wip/python-validation-refactor-spec.md`
 *
 * Pyodide is loaded once in beforeAll (~5-15s on first run, cached afterwards).
 * All tests share a single executor; cleanup via destroy() in afterAll.
 *
 * Imported through the $lib/shared/python barrel to avoid the TDZ that hits
 * when base-executor's barrel import triggers playground-executor before
 * BasePythonExecutor has finished evaluating (same workaround as
 * base-executor.svelte.test.ts).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BasePythonExecutor, type ExerciseValidationConfigV2 } from '$lib/shared/python';

// =============================================================================
// Test harness
// =============================================================================

class TestExecutor extends BasePythonExecutor {
	getContextId(): string | undefined {
		return undefined;
	}
	isPersistentContext(): boolean {
		return false;
	}
	protected onExecutionComplete(_duration: number): void {
		// no-op
	}
	protected onExecutionError(_message: string, _line?: number): void {
		// no-op
	}
}

const PYODIDE_LOAD_TIMEOUT_MS = 90_000;
const POLL_INTERVAL_MS = 50;
const TEST_TIMEOUT_MS = 30_000;

async function waitForReady(
	executor: TestExecutor,
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
	executor: TestExecutor,
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

// =============================================================================
// Test Suite
// =============================================================================

describe('Exercise validation strategies (real Pyodide)', () => {
	let executor: TestExecutor;

	beforeAll(async () => {
		executor = new TestExecutor();
		executor.initPyodide();
		await waitForReady(executor);
	}, PYODIDE_LOAD_TIMEOUT_MS);

	afterAll(() => {
		executor?.destroy();
	});

	// ===========================================================================
	// A. Behavior: output
	// ===========================================================================

	describe('output behavior', () => {
		it(
			'exact: passes when stdout matches byte-for-byte',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'hello\n' }]
					}
				};
				const result = await executor.validateExercise('print("hello")', config);

				expect(result.valid).toBe(true);
				expect(result.failed_layer).toBeNull();
				expect(result.behavior_kind).toBe('output');
				expect(result.test_results).toHaveLength(1);
				expect(result.test_results[0].passed).toBe(true);
				expect(result.test_results[0].actual).toBe('hello\n');
			},
			TEST_TIMEOUT_MS
		);

		it(
			'exact: fails when stdout does not match, with diff message',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'ok\n' }]
					}
				};
				const result = await executor.validateExercise('print("ko")', config);

				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('behavior');
				expect(result.test_results[0].passed).toBe(false);
				expect(result.test_results[0].actual).toBe('ko\n');
				expect(result.test_results[0].expected).toBe('ok\n');
				expect(result.test_results[0].diff).toBeDefined();
			},
			TEST_TIMEOUT_MS
		);

		it(
			'text/collapsed: ignores leading/trailing/internal whitespace differences',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'text', whitespace: 'collapsed' },
						test_cases: [{ input: '', expected_output: '  ok  ' }]
					}
				};
				const result = await executor.validateExercise('print("ok", end="")', config);

				expect(result.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'numeric: tolerance accepts long-decimal output of math.sqrt',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'numeric',
							shape: 'flat',
							eps_abs: 1e-2,
							eps_rel: 1e-2
						},
						test_cases: [{ input: '', expected_output: '1.41' }]
					}
				};
				const result = await executor.validateExercise('import math\nprint(math.sqrt(2))', config);

				expect(result.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'numeric: tighter tolerance rejects same case, with informative diff',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'numeric',
							shape: 'flat',
							eps_abs: 1e-9,
							eps_rel: 1e-9
						},
						test_cases: [{ input: '', expected_output: '1.41' }]
					}
				};
				const result = await executor.validateExercise('import math\nprint(math.sqrt(2))', config);

				expect(result.valid).toBe(false);
				expect(result.test_results[0].diff).toMatch(/écart|tolérance/i);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'hidden output test passing: input/expected/actual/diff are redacted',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [
							{ input: '', expected_output: 'visible\n' },
							{ input: '', expected_output: 'secret\n', hidden: true }
						]
					}
				};
				const result = await executor.validateExercise('print("visible")\nprint("secret")', config);
				// First test (visible) — full data
				expect(result.test_results[0].passed).toBe(false); // print prints both → mismatch
				// Second test (hidden) — only passed + hidden, nothing else
				const hidden = result.test_results[1];
				expect(hidden.hidden).toBe(true);
				expect(hidden.input).toBeUndefined();
				expect(hidden.expected).toBeUndefined();
				expect(hidden.actual).toBeUndefined();
				expect(hidden.diff).toBeUndefined();
			},
			TEST_TIMEOUT_MS
		);

		it(
			'custom comparator: returns True → passed',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: 'def compare(expected, actual, stdin):\n    return actual.strip() == expected.strip()\n'
						},
						test_cases: [{ input: '', expected_output: 'hello' }]
					}
				};
				const result = await executor.validateExercise('print("hello")', config);
				expect(result.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'custom comparator: returns dict with diff → diff surfaced',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: `def compare(expected, actual, stdin):
    e = set(expected.split())
    a = set(actual.split())
    if e == a:
        return {'passed': True}
    missing = e - a
    extra = a - e
    msg = []
    if missing: msg.append(f"manque: {sorted(missing)}")
    if extra: msg.append(f"en trop: {sorted(extra)}")
    return {'passed': False, 'diff': ', '.join(msg)}
`
						},
						test_cases: [{ input: '', expected_output: '1 2 3' }]
					}
				};
				// Order-independent: prints "3 1 2" should still pass.
				const okResult = await executor.validateExercise('print("3 1 2")', config);
				expect(okResult.valid).toBe(true);

				const badResult = await executor.validateExercise('print("1 2 4")', config);
				expect(badResult.valid).toBe(false);
				expect(badResult.test_results[0].diff).toMatch(/manque|en trop/);
			},
			TEST_TIMEOUT_MS * 2
		);

		it(
			'custom comparator: crash inside compare() → reports error',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: 'def compare(expected, actual, stdin):\n    return 1/0\n'
						},
						test_cases: [{ input: '', expected_output: 'x' }]
					}
				};
				const result = await executor.validateExercise('print("x")', config);
				expect(result.valid).toBe(false);
				expect(result.test_results[0].error).toMatch(/comparateur|division/i);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'custom comparator: missing compare function → clear error',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: '# no compare function defined\nx = 42\n'
						},
						test_cases: [{ input: '', expected_output: 'x' }]
					}
				};
				const result = await executor.validateExercise('print("x")', config);
				expect(result.valid).toBe(false);
				expect(result.test_results[0].error).toMatch(/compare/i);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'custom comparator: isolated from student namespace',
			async () => {
				// The student leaks an attractive nuisance into globals; if the
				// comparator's namespace were shared, it could read it.
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: `def compare(expected, actual, stdin):
    # Try to read a name set by student code; it must NOT be visible.
    try:
        leak = student_secret  # noqa: F821
        return {'passed': False, 'diff': f'leak: {leak}'}
    except NameError:
        return {'passed': True}
`
						},
						test_cases: [{ input: '', expected_output: 'ok' }]
					}
				};
				const result = await executor.validateExercise(
					'student_secret = "WIN"\nprint("ok")\n',
					config
				);
				expect(result.valid).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'hidden output test failing: diff is redacted too',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'numeric', shape: 'flat', eps_abs: 1e-9, eps_rel: 1e-9 },
						test_cases: [
							{ input: '', expected_output: '1.0' },
							{ input: '', expected_output: '99.0', hidden: true }
						]
					}
				};
				const result = await executor.validateExercise('print(1.0)', config);
				const hidden = result.test_results[1];
				expect(hidden.passed).toBe(false);
				expect(hidden.hidden).toBe(true);
				expect(hidden.diff).toBeUndefined();
				expect(hidden.expected).toBeUndefined();
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// B. Behavior: unit_test
	// ===========================================================================

	describe('unit_test behavior', () => {
		it(
			'passes when student function returns expected values',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'add',
						test_cases: [
							{ args: [1, 2], expected: 3 },
							{ args: [-1, 1], expected: 0 },
							{ args: [0, 0], expected: 0 }
						]
					}
				};
				const result = await executor.validateExercise(
					'def add(a, b):\n    return a + b\n',
					config
				);

				expect(result.valid).toBe(true);
				expect(result.behavior_kind).toBe('unit_test');
				expect(result.test_results).toHaveLength(3);
				expect(result.test_results.every((r) => r.passed)).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		it(
			"reports a clear error when the function isn't defined",
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'add',
						test_cases: [{ args: [1, 2], expected: 3 }]
					}
				};
				const result = await executor.validateExercise('pass', config);

				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('behavior');
				expect(result.test_results).toHaveLength(1);
				expect(result.test_results[0].passed).toBe(false);
				expect(result.test_results[0].error).toMatch(/'add'.*n'est pas definie/);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'fails per test case when student function returns wrong values',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'add',
						test_cases: [
							{ args: [1, 2], expected: 3 },
							{ args: [2, 2], expected: 4 }
						]
					}
				};
				// Wrong impl: multiplies instead of adds
				const result = await executor.validateExercise(
					'def add(a, b):\n    return a * b\n',
					config
				);

				expect(result.valid).toBe(false);
				expect(result.test_results).toHaveLength(2);
				expect(result.test_results[0].passed).toBe(false); // 1*2 = 2 ≠ 3
				expect(result.test_results[1].passed).toBe(true); // 2*2 = 4 = 4 (lucky)
			},
			TEST_TIMEOUT_MS
		);

		it(
			'hidden unit_test case redacts args/expected/actual',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'square',
						test_cases: [
							{ args: [3], expected: 9 },
							{ args: [42], expected: 1764, hidden: true }
						]
					}
				};
				const result = await executor.validateExercise(
					'def square(n):\n    return n * n\n',
					config
				);
				expect(result.valid).toBe(true);
				const hidden = result.test_results[1];
				expect(hidden.passed).toBe(true);
				expect(hidden.hidden).toBe(true);
				expect(hidden.input).toBeUndefined();
				expect(hidden.expected).toBeUndefined();
				expect(hidden.actual).toBeUndefined();
			},
			TEST_TIMEOUT_MS
		);
	});

	// ===========================================================================
	// C. AST requirements
	// ===========================================================================

	describe('ast requirements', () => {
		it(
			'passes when AST requirement is satisfied',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Tu dois utiliser une boucle' }]
				};
				const result = await executor.validateExercise('for i in range(3):\n    pass\n', config);

				expect(result.valid).toBe(true);
				expect(result.failed_layer).toBeNull();
				expect(result.behavior_kind).toBeUndefined();
				expect(result.ast_issues).toEqual([]);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'fails with the configured message when requirement is not met',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Tu dois utiliser une boucle' }]
				};
				const result = await executor.validateExercise('pass', config);

				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('ast');
				expect(result.ast_issues).toEqual(['Tu dois utiliser une boucle']);
			},
			TEST_TIMEOUT_MS
		);

		it(
			'runs behavior after AST checks pass and combines both verdicts',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [
						{
							type: 'defines_function',
							name: 'greet',
							message: 'Définis greet(name)'
						}
					],
					behavior: {
						kind: 'output',
						test_cases: [{ input: '', expected_output: 'hello\n' }],
						comparison: { kind: 'exact' }
					}
				};

				// AST passes (greet defined) AND output matches
				const ok = await executor.validateExercise(
					'def greet(name):\n    print(f"hello")\n\ngreet("x")\n',
					config
				);
				expect(ok.valid).toBe(true);
				expect(ok.failed_layer).toBeNull();
				expect(ok.test_results).toHaveLength(1);
				expect(ok.test_results[0].passed).toBe(true);

				// AST passes but output mismatches
				const wrongOutput = await executor.validateExercise(
					'def greet(name):\n    print(f"hi")\n\ngreet("x")\n',
					config
				);
				expect(wrongOutput.valid).toBe(false);
				expect(wrongOutput.failed_layer).toBe('behavior');
				expect(wrongOutput.ast_issues).toEqual([]); // AST OK, no issues
				expect(wrongOutput.test_results[0].passed).toBe(false); // output KO
			},
			TEST_TIMEOUT_MS * 2 // two validations in this test
		);
	});

	// ===========================================================================
	// D. Isolation guarantees (the point of commit 4d39ceaf5)
	// ===========================================================================

	describe('isolation', () => {
		it(
			'playground-defined functions are NOT visible inside validateExercise',
			async () => {
				// Pollute the playground namespace
				executor.execute(
					'def factorielle(n):\n    return 1 if n <= 0 else n * factorielle(n - 1)\n'
				);
				await waitForExecuteComplete(executor);

				// Now validate WITHOUT defining factorielle in the student code.
				// Before the namespace isolation fix, this passed (false positive).
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'factorielle',
						test_cases: [{ args: [5], expected: 120 }]
					}
				};
				const result = await executor.validateExercise('pass', config);

				expect(result.valid).toBe(false);
				expect(result.test_results[0].error).toMatch(/'factorielle'.*n'est pas definie/);
			},
			TEST_TIMEOUT_MS * 2
		);

		it(
			'variables defined inside validateExercise are NOT visible from playground',
			async () => {
				// Run a validation that intentionally creates a marker variable
				// inside the validation namespace.
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'done\n' }]
					}
				};
				await executor.validateExercise(
					'_ubumaths_validation_marker = "polluted"\nprint("done")\n',
					config
				);

				// Probe the playground namespace for the marker. Before the fix,
				// the marker would still be in pyodide.globals here.
				executor.execute('print("LEAK" if "_ubumaths_validation_marker" in dir() else "CLEAN")');
				await waitForExecuteComplete(executor);

				expect(executor.stdout.trim()).toBe('CLEAN');
			},
			TEST_TIMEOUT_MS * 2
		);

		it(
			'no leakage between consecutive validations',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'double',
						test_cases: [{ args: [3], expected: 6 }]
					}
				};

				// First validation defines `double` inside its namespace
				const first = await executor.validateExercise('def double(x):\n    return 2 * x\n', config);
				expect(first.valid).toBe(true);

				// Second validation has empty student code; the previous validation's
				// namespace was destroyed, so `double` must not be findable here.
				const second = await executor.validateExercise('pass', config);

				expect(second.valid).toBe(false);
				expect(second.test_results[0].error).toMatch(/'double'.*n'est pas definie/);
			},
			TEST_TIMEOUT_MS * 2
		);
	});

	// ===========================================================================
	// E. AST + behavior matrix (9 cases from the refactor spec)
	// ===========================================================================

	describe('AST + behavior pipeline matrix', () => {
		// Case 1 — AST + behavior, everything passes
		it(
			'case 1: AST + behavior all pass → valid, failed_layer null, behavior_kind set',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Use a loop' }],
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: '0\n1\n2\n' }]
					}
				};
				const result = await executor.validateExercise(
					'for i in range(3):\n    print(i)\n',
					config
				);
				expect(result.valid).toBe(true);
				expect(result.failed_layer).toBeNull();
				expect(result.behavior_kind).toBe('output');
				expect(result.ast_issues).toEqual([]);
				expect(result.test_results.every((r) => r.passed)).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		// Case 2 — AST fails → behavior NOT executed; behavior_kind still set
		it(
			'case 2: AST fails → short-circuit, behavior_kind still surfaced',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Use a loop' }],
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: '0\n' }]
					}
				};
				const result = await executor.validateExercise('print(0)\n', config);
				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('ast');
				expect(result.behavior_kind).toBe('output'); // surfaced even when behavior didn't run
				expect(result.ast_issues).toEqual(['Use a loop']);
				expect(result.test_results).toEqual([]);
			},
			TEST_TIMEOUT_MS
		);

		// Case 3 — AST passes, behavior fails
		it(
			'case 3: AST passes, behavior fails → failed_layer behavior, ast_issues empty',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Use a loop' }],
					behavior: {
						kind: 'unit_test',
						function_name: 'sum_n',
						test_cases: [{ args: [3], expected: 6 }]
					}
				};
				const result = await executor.validateExercise(
					'def sum_n(n):\n    s = 0\n    for i in range(n + 1):\n        s += i + 100\n    return s\n',
					config
				);
				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('behavior');
				expect(result.behavior_kind).toBe('unit_test');
				expect(result.ast_issues).toEqual([]);
				expect(result.test_results.some((r) => !r.passed)).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		// Case 4 — AST only (no behavior)
		it(
			'case 4: AST only (no behavior) → behavior_kind undefined',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'defines_function', name: 'f', message: 'Define f' }]
				};
				const ok = await executor.validateExercise('def f():\n    pass\n', config);
				expect(ok.valid).toBe(true);
				expect(ok.failed_layer).toBeNull();
				expect(ok.behavior_kind).toBeUndefined();
				expect(ok.test_results).toEqual([]);

				const ko = await executor.validateExercise('x = 1\n', config);
				expect(ko.valid).toBe(false);
				expect(ko.failed_layer).toBe('ast');
				expect(ko.behavior_kind).toBeUndefined();
			},
			TEST_TIMEOUT_MS * 2
		);

		// Case 5 — behavior only (no AST)
		it(
			'case 5: behavior only (no AST) → ast_issues absent, behavior_kind set',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'unit_test',
						function_name: 'double',
						test_cases: [{ args: [4], expected: 8 }]
					}
				};
				const ok = await executor.validateExercise('def double(x):\n    return 2 * x\n', config);
				expect(ok.valid).toBe(true);
				expect(ok.failed_layer).toBeNull();
				expect(ok.behavior_kind).toBe('unit_test');
				expect(ok.ast_issues).toBeUndefined();
			},
			TEST_TIMEOUT_MS
		);

		// Case 6 — SyntaxError + AST configured → dedicated message, ast layer
		it(
			'case 6: SyntaxError with AST configured → failed_layer ast, dedicated message',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'uses_loop', message: 'Use a loop' }],
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'x\n' }]
					}
				};
				const result = await executor.validateExercise('def broken(:\n    pass\n', config);
				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('ast');
				expect(result.behavior_kind).toBe('output');
				expect(result.ast_issues).toBeDefined();
				expect(result.ast_issues?.[0]).toMatch(/Erreur de syntaxe Python/);
				expect(result.test_results).toEqual([]);
			},
			TEST_TIMEOUT_MS
		);

		// Case 7 — SyntaxError without AST → behavior runs, runtime error surfaces
		it(
			'case 7: SyntaxError without AST → behavior layer surfaces the error',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'x\n' }]
					}
				};
				const result = await executor.validateExercise('def broken(:\n    pass\n', config);
				expect(result.valid).toBe(false);
				expect(result.failed_layer).toBe('behavior');
				expect(result.behavior_kind).toBe('output');
				expect(result.ast_issues).toBeUndefined();
				// At least one test case should report a runtime error
				expect(result.test_results.some((r) => r.error)).toBe(true);
			},
			TEST_TIMEOUT_MS
		);

		// Case 9 — custom comparator covered by output behavior tests already; this
		// just sanity-checks it works inside the new pipeline alongside AST checks.
		it(
			'case 9: custom comparator runs inside the behavior layer with AST',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					ast_requirements: [{ type: 'no_print', message: 'No print()' }],
					behavior: {
						kind: 'output',
						comparison: {
							kind: 'custom',
							code: 'def compare(expected, actual, stdin):\n    return True\n'
						},
						test_cases: [{ input: '', expected_output: 'whatever' }]
					}
				};
				// Code without print(), so AST passes; comparator returns True regardless.
				const result = await executor.validateExercise('x = 1 + 1\n', config);
				expect(result.valid).toBe(true);
				expect(result.behavior_kind).toBe('output');
			},
			TEST_TIMEOUT_MS
		);

		// Case 8 — Global timeout. Placed last because Pyodide.runPythonAsync is
		// not interruptible from JS without a SharedArrayBuffer interrupt buffer:
		// the JS-side Promise.race timeout in the worker can fire, but the running
		// Python loop will keep the worker thread blocked. In practice the
		// executor's safety-net rejects the promise. We assert at that level.
		it(
			'case 8: infinite-loop student code → executor rejects with timeout error',
			async () => {
				const config: ExerciseValidationConfigV2 = {
					behavior: {
						kind: 'output',
						comparison: { kind: 'exact' },
						test_cases: [{ input: '', expected_output: 'never\n' }]
					},
					timeout_ms: 200
				};
				await expect(executor.validateExercise('while True:\n    pass\n', config)).rejects.toThrow(
					/délai|timeout/i
				);
			},
			TEST_TIMEOUT_MS
		);
	});
});
