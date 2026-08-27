/**
 * Behavior-layer runners for the exercise-validation pipeline.
 *
 * Runtime-agnostic: every runner takes an explicit `pyodide` handle and a
 * caller-provided `namespace` PyProxy, so this module runs unchanged in the
 * browser Web Worker and in a Node serverless function. Nothing here touches
 * `postMessage` or any browser global.
 */

import type { PyodideInterface, PyProxy, BehaviorCheck, TestCaseResult } from '$lib/shared/python';
import { compareOutputs } from '$lib/shared/python/validation/output-compare';
import {
	compareValue,
	type VariableCompareOptions
} from '$lib/shared/python/validation/variable-compare';

// =============================================================================
// Types
// =============================================================================

type GeneratorCaseResult =
	| {
			kind: 'compared';
			passed: boolean;
			argsRepr: string;
			expectedRepr: string;
			actualRepr: string;
	  }
	| {
			kind: 'student_error';
			argsRepr: string;
			error: string;
	  }
	| {
			kind: 'teacher_error';
			error: string;
	  };

// =============================================================================
// Functions
// =============================================================================

/**
 * Run the behavior layer of the new pipeline. Dispatches by `kind` and
 * returns `{ valid, test_results }` — the surrounding pipeline owns the
 * `failed_layer` / `behavior_kind` fields.
 *
 * `skipCodeExec` is set in notebook checkpoint mode: the namespace is already
 * populated by the notebook's prior cell executions, so `code` (top-level
 * parameter) should NOT be re-exec'd.
 */
export async function runBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: BehaviorCheck,
	namespace: PyProxy,
	skipCodeExec: boolean
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	if (behavior.kind === 'output') {
		return runOutputBehavior(pyodide, code, behavior, namespace);
	}
	if (behavior.kind === 'unit_test') {
		return runUnitTestBehavior(pyodide, code, behavior, namespace, skipCodeExec);
	}
	if (behavior.kind === 'assert') {
		return runAssertBehavior(pyodide, code, behavior, namespace, skipCodeExec);
	}
	if (behavior.kind === 'variable_check') {
		return runVariableCheckBehavior(pyodide, code, behavior, namespace, skipCodeExec);
	}
	return runReferenceSolutionBehavior(pyodide, code, behavior, namespace);
}

/**
 * Run an `assert` behavior. Execs the assertion code (`behavior.code`) against
 * the resolved namespace; a clean run is `passed`, any raised exception is
 * `failed`.
 *
 * In exercise mode (`skipCodeExec = false`), the top-level `code` is exec'd
 * first to populate the namespace, then the assertions are exec'd.
 * In checkpoint mode (`skipCodeExec = true`), the namespace is already
 * populated by the notebook's prior cell executions, so we only exec the
 * assertions.
 */
async function runAssertBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'assert' }>,
	namespace: PyProxy,
	skipCodeExec: boolean
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	// Exercise mode: exec student code first. A runtime error here aborts
	// before we even reach the assertion code (same semantics as
	// runVariableCheckBehavior — keeps the diff between the two minimal).
	if (!skipCodeExec) {
		try {
			await pyodide.runPythonAsync(code, { globals: namespace });
		} catch (error) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: error instanceof Error ? error.message : String(error)
					}
				]
			};
		}
	}

	try {
		await pyodide.runPythonAsync(behavior.code, { globals: namespace });
		return {
			valid: true,
			test_results: [{ passed: true }]
		};
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			valid: false,
			test_results: [
				{
					passed: false,
					error: message
				}
			]
		};
	}
}

/**
 * Run a teacher-defined Python `compare(expected, actual, stdin)` function in
 * an isolated namespace, normalise its return value, and enforce a dedicated
 * timeout. The comparator's namespace is separate from the student's: neither
 * can see the other's locals.
 *
 * Accepts either a bool return (treated as `{ passed: bool }`) or a dict with
 * `passed` (and optionally `diff`/`error`). Anything else degrades to a clear
 * `passed: false` with an explanatory error.
 */
async function compareWithCustomScript(
	pyodide: PyodideInterface,
	code: string,
	expected: string,
	actual: string,
	stdin: string,
	timeoutMs: number
): Promise<{ passed: boolean; diff?: string; error?: string }> {
	const namespace = pyodide.runPython('dict()') as PyProxy;

	try {
		// Load the comparator code into the isolated namespace.
		try {
			await pyodide.runPythonAsync(code, { globals: namespace });
		} catch (e) {
			return {
				passed: false,
				error: `Erreur dans le comparateur : ${e instanceof Error ? e.message : String(e)}`
			};
		}

		// Verify that `compare` exists and is callable.
		const hasCompare = (await pyodide.runPythonAsync(`'compare' in dir() and callable(compare)`, {
			globals: namespace
		})) as boolean;
		if (!hasCompare) {
			return {
				passed: false,
				error: "Le comparateur doit définir une fonction 'compare(expected, actual, stdin)'."
			};
		}

		// Inject args into the namespace (no string interpolation, safe).
		namespace.set('_chiphre_cmp_expected', expected);
		namespace.set('_chiphre_cmp_actual', actual);
		namespace.set('_chiphre_cmp_stdin', stdin);

		const compareCall = pyodide.runPythonAsync(
			`
import json as _chiphre_json
_chiphre_raw = compare(_chiphre_cmp_expected, _chiphre_cmp_actual, _chiphre_cmp_stdin)
if isinstance(_chiphre_raw, bool):
    _chiphre_payload = {'passed': _chiphre_raw}
elif isinstance(_chiphre_raw, dict):
    _chiphre_payload = {
        'passed': bool(_chiphre_raw.get('passed', False)),
    }
    if 'diff' in _chiphre_raw and _chiphre_raw['diff'] is not None:
        _chiphre_payload['diff'] = str(_chiphre_raw['diff'])
    if 'error' in _chiphre_raw and _chiphre_raw['error'] is not None:
        _chiphre_payload['error'] = str(_chiphre_raw['error'])
else:
    _chiphre_payload = {'passed': False, 'error': "Le comparateur doit retourner True/False ou un dict {'passed': ..., 'diff'?: ...}."}
_chiphre_json.dumps(_chiphre_payload)
`,
			{ globals: namespace }
		);

		const timeoutPromise = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error('CompareTimeout')), timeoutMs)
		);

		const jsonStr = (await Promise.race([compareCall, timeoutPromise])) as string;

		try {
			namespace.delete('_chiphre_cmp_expected');
			namespace.delete('_chiphre_cmp_actual');
			namespace.delete('_chiphre_cmp_stdin');
		} catch {
			// Ignore cleanup errors (keys may not exist on early failure)
		}

		const parsed = JSON.parse(jsonStr) as {
			passed?: boolean;
			diff?: string;
			error?: string;
		};
		return {
			passed: parsed.passed === true,
			...(parsed.diff ? { diff: parsed.diff } : {}),
			...(parsed.error ? { error: parsed.error } : {})
		};
	} catch (e) {
		if (e instanceof Error && e.message === 'CompareTimeout') {
			return { passed: false, error: 'Le comparateur a dépassé le temps imparti.' };
		}
		return {
			passed: false,
			error: `Erreur dans le comparateur : ${e instanceof Error ? e.message : String(e)}`
		};
	} finally {
		if (typeof (namespace as { destroy?: () => void }).destroy === 'function') {
			(namespace as { destroy: () => void }).destroy();
		}
	}
}

/**
 * Strip sensitive fields (input/expected/actual/diff) from a TestCaseResult
 * when the source test case is hidden. The student-visible result then only
 * contains `passed`, `hidden: true`, and `error` if there was a runtime crash.
 *
 * Done off the main thread (not on the client) so the redacted fields never
 * cross the postMessage boundary — even DevTools won't see them.
 */
function redactIfHidden(result: TestCaseResult, hidden: boolean): TestCaseResult {
	if (!hidden) return result;
	const redacted: TestCaseResult = { passed: result.passed, hidden: true };
	if (result.error !== undefined) redacted.error = result.error;
	return redacted;
}

/**
 * Validate using output comparison strategy.
 *
 * @param namespace Isolated Python dict where the student code runs and
 *   `_chiphre_test_*` scaffolding lives. Must be a fresh empty dict
 *   provided by the caller; not shared with the playground namespace.
 */
async function runOutputBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'output' }>,
	namespace: PyProxy
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	for (const testCase of behavior.test_cases) {
		try {
			// Set up stdin redirection with test input.
			// Note: sys.stdin/stdout swap is global Python state; restored on
			// every path (success and error) below.
			await pyodide.runPythonAsync(
				`
import sys
from io import StringIO

_chiphre_test_stdin = StringIO(${JSON.stringify(testCase.input)})
_chiphre_test_stdout = StringIO()
_chiphre_old_stdin = sys.stdin
_chiphre_old_stdout = sys.stdout
sys.stdin = _chiphre_test_stdin
sys.stdout = _chiphre_test_stdout
`,
				{ globals: namespace }
			);

			// Execute student code in the isolated namespace
			await pyodide.runPythonAsync(code, { globals: namespace });

			// Capture output
			const actualOutput = (await pyodide.runPythonAsync(
				`
_actual = _chiphre_test_stdout.getvalue()
sys.stdin = _chiphre_old_stdin
sys.stdout = _chiphre_old_stdout
_actual
`,
				{ globals: namespace }
			)) as string;

			// Compare outputs. Custom comparators run a teacher-defined Python
			// `compare()` in an isolated namespace; everything else uses the
			// JS-pure engine.
			const cmp = testCase.comparison ?? behavior.comparison;
			const compareResult =
				cmp.kind === 'custom'
					? await compareWithCustomScript(
							pyodide,
							cmp.code,
							testCase.expected_output,
							actualOutput,
							testCase.input,
							cmp.timeout_ms ?? 2000
						)
					: compareOutputs(testCase.expected_output, actualOutput, cmp);
			allPassed = allPassed && compareResult.passed;

			testResults.push(
				redactIfHidden(
					{
						passed: compareResult.passed,
						input: testCase.input,
						expected: testCase.expected_output,
						actual: actualOutput,
						...(compareResult.diff ? { diff: compareResult.diff } : {}),
						// Surface the comparator's error (crash / missing compare() /
						// timeout) — otherwise a buggy teacher comparator shows the
						// student a bare "failed" with no explanation.
						...(compareResult.error ? { error: compareResult.error } : {})
					},
					testCase.hidden === true
				)
			);
		} catch (error) {
			allPassed = false;
			testResults.push(
				redactIfHidden(
					{
						passed: false,
						input: testCase.input,
						expected: testCase.expected_output,
						error: error instanceof Error ? error.message : String(error)
					},
					testCase.hidden === true
				)
			);

			// Restore sys.stdin/stdout even on error
			try {
				await pyodide.runPythonAsync(
					`
import sys
sys.stdin = _chiphre_old_stdin
sys.stdout = _chiphre_old_stdout
`,
					{ globals: namespace }
				);
			} catch {
				// Ignore cleanup errors
			}
		}
	}

	return {
		valid: allPassed,
		test_results: testResults
	};
}

/**
 * Run the unit-test behavior layer.
 *
 * @param namespace Isolated Python dict where the student-defined function
 *   lives and is invoked. Test args/expected are also injected into this
 *   namespace via `namespace.set(...)` so they don't leak to globals.
 */
async function runUnitTestBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'unit_test' }>,
	namespace: PyProxy,
	skipCodeExec: boolean
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	try {
		// Exercise mode: exec student code to define the function in the namespace.
		// Checkpoint mode: the function is already defined by the notebook's
		// prior cell executions, so we skip the exec step entirely.
		if (!skipCodeExec) {
			await pyodide.runPythonAsync(code, { globals: namespace });
		}

		// Verify the function exists *in the isolated namespace*. dir() with no
		// args in our globals returns the namespace's keys.
		const functionExists = (await pyodide.runPythonAsync(`'${behavior.function_name}' in dir()`, {
			globals: namespace
		})) as boolean;

		if (!functionExists) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: `La fonction '${behavior.function_name}' n'est pas definie`
					}
				]
			};
		}

		// Run test cases
		for (const testCase of behavior.test_cases) {
			try {
				// Inject test args/expected into the isolated namespace
				namespace.set('_chiphre_test_args', testCase.args);
				namespace.set('_chiphre_test_expected', testCase.expected);
				namespace.set('_chiphre_eps_abs', behavior.tolerance?.eps_abs ?? 0);
				namespace.set('_chiphre_eps_rel', behavior.tolerance?.eps_rel ?? 0);

				// Call function and compare result, all within the namespace.
				// Recursive comparison handles:
				//   - tuple ↔ list (Pyodide tuples vs JSON arrays)
				//   - dict ↔ dict (same keys, value-wise)
				//   - numeric tolerance (when behavior.tolerance is set, e.g.
				//     for transcendentals like math.exp / math.log that aren't
				//     mandated correctly-rounded by IEEE 754 — bit-level drift
				//     between Pyodide and the test author's environment).
				//   - everything else: strict `==`.
				const result = (await pyodide.runPythonAsync(
					`
def _chiphre_to_py(v):
    """Force-convert a Pyodide JsProxy (JS array/object) into a real
    Python list/dict so that subsequent isinstance(..., (list, dict))
    checks recognise it. Plain Python values pass through."""
    return v.to_py() if hasattr(v, 'to_py') else v

def _chiphre_compare(a, b, eps_abs, eps_rel):
    a = _chiphre_to_py(a)
    b = _chiphre_to_py(b)
    if isinstance(a, (tuple, list)) and isinstance(b, (tuple, list)):
        if len(a) != len(b):
            return False
        return all(_chiphre_compare(x, y, eps_abs, eps_rel) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(_chiphre_compare(a[k], b[k], eps_abs, eps_rel) for k in a)
    # Booleans must be excluded from the numeric branch (bool is a subclass of int)
    if (
        isinstance(a, (int, float))
        and isinstance(b, (int, float))
        and not isinstance(a, bool)
        and not isinstance(b, bool)
    ):
        diff = abs(a - b)
        threshold = max(eps_abs, eps_rel * max(abs(a), abs(b)))
        return diff <= threshold
    return a == b

_args = _chiphre_test_args
_expected = _chiphre_test_expected
_actual = ${behavior.function_name}(*_args)
_passed = _chiphre_compare(_actual, _expected, _chiphre_eps_abs, _chiphre_eps_rel)
{
    'passed': _passed,
    'actual': _actual,
    'expected': _expected
}
`,
					{ globals: namespace }
				)) as PyProxy;

				const jsResult = result.toJs() as {
					passed: boolean;
					actual: unknown;
					expected: unknown;
				};

				// Clean up PyProxy
				if (typeof (result as { destroy?: () => void }).destroy === 'function') {
					(result as { destroy: () => void }).destroy();
				}

				allPassed = allPassed && jsResult.passed;

				testResults.push(
					redactIfHidden(
						{
							passed: jsResult.passed,
							expected: JSON.stringify(jsResult.expected),
							actual: JSON.stringify(jsResult.actual),
							input: `${behavior.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`
						},
						testCase.hidden === true
					)
				);

				// Clean up test args/expected from namespace
				namespace.delete('_chiphre_test_args');
				namespace.delete('_chiphre_test_expected');
				namespace.delete('_chiphre_eps_abs');
				namespace.delete('_chiphre_eps_rel');
			} catch (error) {
				allPassed = false;
				testResults.push(
					redactIfHidden(
						{
							passed: false,
							input: `${behavior.function_name}(${testCase.args.map((a) => JSON.stringify(a)).join(', ')})`,
							expected: JSON.stringify(testCase.expected),
							error: error instanceof Error ? error.message : String(error)
						},
						testCase.hidden === true
					)
				);

				// Clean up test args/expected on error too
				try {
					namespace.delete('_chiphre_test_args');
					namespace.delete('_chiphre_test_expected');
					namespace.delete('_chiphre_eps_abs');
					namespace.delete('_chiphre_eps_rel');
				} catch {
					// Ignore cleanup errors (key may not exist)
				}
			}
		}
	} catch (error) {
		return {
			valid: false,
			test_results: [
				{
					passed: false,
					error: error instanceof Error ? error.message : String(error)
				}
			]
		};
	}

	return {
		valid: allPassed,
		test_results: testResults
	};
}

/**
 * Run the variable_check behavior layer.
 *
 * Executes the student's code once in `namespace`, then for each entry in
 * `behavior.expected_vars` looks up the variable, converts its Pyodide value
 * to a plain JS structure (`toJs({ dict_converter: Object.fromEntries })`),
 * and compares against the teacher's declared value via the recursive engine
 * in `validation/variable-compare.ts`.
 *
 * One `TestCaseResult` is emitted per expected variable (Q2 = all errors
 * surfaced, no short-circuit). A failure to execute the student's code is a
 * single global error result. The student's `input` field carries the
 * variable name so the result UI can label each row.
 *
 * @param namespace Isolated Python dict (a fresh one is created per
 *   `runExerciseValidation` invocation by the surrounding pipeline).
 */
async function runVariableCheckBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'variable_check' }>,
	namespace: PyProxy,
	skipCodeExec: boolean
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	// 1. Exercise mode: exec student code to populate the namespace. A runtime
	//    error here is a single global failure (no point checking variables —
	//    they may not be assigned).
	// Checkpoint mode: the variables are already assigned by the notebook's
	//    prior cell executions, so we skip the exec step.
	if (!skipCodeExec) {
		try {
			await pyodide.runPythonAsync(code, { globals: namespace });
		} catch (error) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: error instanceof Error ? error.message : String(error)
					}
				]
			};
		}
	}

	const testResults: TestCaseResult[] = [];
	let allPassed = true;
	const opts: VariableCompareOptions = behavior.tolerance ?? {};

	for (const [name, expected] of Object.entries(behavior.expected_vars)) {
		const expectedDisplay = serializeForDisplay(expected);
		try {
			namespace.set('_chiphre_var_name', name);

			// Look up the variable inside the isolated namespace.
			// `dir()` with no args lists the namespace's keys when invoked
			// under `pyodide.runPythonAsync(code, { globals: namespace })`.
			// Using `eval(name)` rather than `globals()[name]` keeps the
			// helper symmetrical with how the student would inspect the
			// value in a REPL.
			const lookup = (await pyodide.runPythonAsync(
				`
_chiphre_name = _chiphre_var_name
if _chiphre_name in dir():
    _chiphre_lookup_result = {'exists': True, 'value': eval(_chiphre_name)}
else:
    _chiphre_lookup_result = {'exists': False, 'value': None}
_chiphre_lookup_result
`,
				{ globals: namespace }
			)) as PyProxy;

			const jsLookup = (
				lookup as PyProxy & {
					toJs: (opts: { dict_converter: typeof Object.fromEntries }) => unknown;
				}
			).toJs({ dict_converter: Object.fromEntries }) as {
				exists: boolean;
				value: unknown;
			};

			if (typeof (lookup as { destroy?: () => void }).destroy === 'function') {
				(lookup as { destroy: () => void }).destroy();
			}
			// Clean up the three scratch names the snippet wrote into the
			// student's namespace (same approach as the AST checker — keeps
			// the student's namespace pristine between iterations and avoids
			// surprising hits when `dir()` is consulted later).
			namespace.delete('_chiphre_var_name');
			namespace.delete('_chiphre_name');
			namespace.delete('_chiphre_lookup_result');

			if (!jsLookup.exists) {
				allPassed = false;
				testResults.push({
					passed: false,
					input: name,
					expected: expectedDisplay,
					diff: `La variable '${name}' n'est pas définie dans ton code.`
				});
				continue;
			}

			// Pyodide converts Python `None` to `undefined` when crossing the JS
			// boundary. The comparator treats `null` (= JSON for None) and
			// `undefined` as different types, so normalise here — at this point
			// `exists === true` guarantees the variable was assigned, so an
			// `undefined` slot can only mean the student wrote `x = None`.
			const actualJs = jsLookup.value === undefined ? null : jsLookup.value;

			const cmpResult = compareValue(expected, actualJs, opts);
			allPassed = allPassed && cmpResult.passed;
			testResults.push({
				passed: cmpResult.passed,
				input: name,
				expected: expectedDisplay,
				actual: serializeForDisplay(actualJs),
				...(cmpResult.diff ? { diff: cmpResult.diff } : {})
			});
		} catch (error) {
			try {
				namespace.delete('_chiphre_var_name');
				namespace.delete('_chiphre_name');
				namespace.delete('_chiphre_lookup_result');
			} catch {
				// Ignore cleanup errors
			}
			allPassed = false;
			testResults.push({
				passed: false,
				input: name,
				expected: expectedDisplay,
				error: error instanceof Error ? error.message : String(error)
			});
		}
	}

	return { valid: allPassed, test_results: testResults };
}

/**
 * Serialise a value for display in the validation result UI. Handles `Set`
 * (becomes an array preview) and `Map` (becomes a plain-object preview) so
 * that the JSON encoder doesn't choke. Anything else falls through to
 * `JSON.stringify`. On encoder failure (cyclic, PyProxy, …) returns the raw
 * string form so the UI never shows `undefined`.
 */
function serializeForDisplay(v: unknown): string {
	try {
		return JSON.stringify(v, (_, value) => {
			if (value instanceof Set) return Array.from(value);
			if (value instanceof Map) return Object.fromEntries(value);
			return value;
		});
	} catch {
		return String(v);
	}
}

/**
 * Run the reference_solution behavior layer (differential testing).
 *
 * Two phases:
 *   1. `fixed` cases — teacher-supplied `(args, expected)` pairs, run like
 *      `unit_test`. All errors are surfaced (no short-circuit) because the
 *      teacher chose those cases deliberately; the student deserves to see
 *      each verdict.
 *   2. `generator` cases — the teacher provides a Python expression that
 *      returns a tuple of args. We seed `random` with `seed + i` for each
 *      iteration (reproducibility across students). Both the reference
 *      function and the student function are called with deep-copied args
 *      (Q4: avoids in-place mutation contaminating the other call). We
 *      STOP at the first failure (Q1: counter-example focus, à la
 *      Hypothesis) and surface one explicit `TestCaseResult`. If all
 *      `count` generated cases pass, we emit a single synthetic
 *      "passed" result so the UI reflects that work happened.
 *
 * Reference code runs in a separate namespace (`refNs`) so the student's
 * code cannot inspect or shadow the teacher's helpers. The reference
 * function object is then injected back into the student's namespace
 * under `_chiphre_ref_func` for the per-case snippets to invoke side by
 * side.
 *
 * @param namespace Isolated Python dict for the student code.
 */
async function runReferenceSolutionBehavior(
	pyodide: PyodideInterface,
	code: string,
	behavior: Extract<BehaviorCheck, { kind: 'reference_solution' }>,
	namespace: PyProxy
): Promise<{ valid: boolean; test_results: TestCaseResult[] }> {
	const fnName = behavior.function_name;
	const epsAbs = behavior.tolerance?.eps_abs ?? 0;
	const epsRel = behavior.tolerance?.eps_rel ?? 0;
	const testResults: TestCaseResult[] = [];
	let allPassed = true;

	// 1. Sandbox namespace for the teacher reference. Cleaned up in `finally`.
	const refNs = pyodide.runPython('dict()') as PyProxy;

	try {
		// 2. Load reference_code into refNs. Errors here are teacher-side
		//    bugs: surface a single global error and stop everything.
		try {
			await pyodide.runPythonAsync(behavior.reference_code, { globals: refNs });
		} catch (error) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: `Solution de référence : ${
							error instanceof Error ? error.message : String(error)
						}`
					}
				]
			};
		}

		const refExists = (await pyodide.runPythonAsync(`'${fnName}' in dir()`, {
			globals: refNs
		})) as boolean;
		if (!refExists) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: `La fonction '${fnName}' n'est pas définie dans la solution de référence`
					}
				]
			};
		}

		// 3. Load student code into the validation namespace.
		try {
			await pyodide.runPythonAsync(code, { globals: namespace });
		} catch (error) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: error instanceof Error ? error.message : String(error)
					}
				]
			};
		}

		const studentExists = (await pyodide.runPythonAsync(`'${fnName}' in dir()`, {
			globals: namespace
		})) as boolean;
		if (!studentExists) {
			return {
				valid: false,
				test_results: [
					{
						passed: false,
						error: `La fonction '${fnName}' n'est pas définie`
					}
				]
			};
		}

		// 4. Inject the reference function + helpers into the student
		//    namespace so per-case snippets can call both side by side.
		const refFunc = refNs.get(fnName) as unknown;
		namespace.set('_chiphre_ref_func', refFunc as never);
		namespace.set('_chiphre_eps_abs', epsAbs);
		namespace.set('_chiphre_eps_rel', epsRel);

		await pyodide.runPythonAsync(
			`
import copy as _chiphre_copy
import random as _chiphre_random

def _chiphre_to_py(v):
    return v.to_py() if hasattr(v, 'to_py') else v

def _chiphre_compare(a, b, eps_abs, eps_rel):
    a = _chiphre_to_py(a)
    b = _chiphre_to_py(b)
    if isinstance(a, (tuple, list)) and isinstance(b, (tuple, list)):
        if len(a) != len(b):
            return False
        return all(_chiphre_compare(x, y, eps_abs, eps_rel) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        if set(a.keys()) != set(b.keys()):
            return False
        return all(_chiphre_compare(a[k], b[k], eps_abs, eps_rel) for k in a)
    if (
        isinstance(a, (int, float))
        and isinstance(b, (int, float))
        and not isinstance(a, bool)
        and not isinstance(b, bool)
    ):
        diff = abs(a - b)
        threshold = max(eps_abs, eps_rel * max(abs(a), abs(b)))
        return diff <= threshold
    return a == b
`,
			{ globals: namespace }
		);

		// 5. Run fixed cases — all errors surfaced (no short-circuit).
		if (behavior.fixed) {
			for (const tc of behavior.fixed.cases) {
				const result = await runOneFixedRefCase(pyodide, fnName, tc, namespace);
				allPassed = allPassed && result.passed;
				testResults.push(
					redactIfHidden(
						{
							passed: result.passed,
							input: `${fnName}(${tc.args.map((a) => JSON.stringify(a)).join(', ')})`,
							expected: JSON.stringify(tc.expected),
							...(result.actualJson !== undefined ? { actual: result.actualJson } : {}),
							...(result.diff ? { diff: result.diff } : {}),
							...(result.error ? { error: result.error } : {})
						},
						tc.hidden === true
					)
				);
			}
		}

		// 6. Run generator cases — STOP at first failure (Q1).
		if (behavior.generator) {
			const generator = behavior.generator;
			let aborted = false;

			for (let i = 0; i < generator.count; i++) {
				const result = await runOneGeneratorRefCase(
					pyodide,
					fnName,
					generator.code,
					generator.seed + i,
					namespace
				);

				if (result.kind === 'teacher_error') {
					// Generator or reference threw — global teacher-side error.
					testResults.push({ passed: false, error: result.error });
					allPassed = false;
					aborted = true;
					break;
				}

				if (result.kind === 'student_error') {
					testResults.push({
						passed: false,
						input: `${fnName}(${result.argsRepr})`,
						error: result.error
					});
					allPassed = false;
					aborted = true;
					break;
				}

				if (!result.passed) {
					testResults.push({
						passed: false,
						input: `${fnName}(${result.argsRepr})`,
						expected: result.expectedRepr,
						actual: result.actualRepr,
						diff: 'La solution de référence et ta fonction divergent sur cette entrée.'
					});
					allPassed = false;
					aborted = true;
					break;
				}
			}

			// All generated cases passed.
			// Only emit a synthetic OK when the generator is the sole source
			// of tests — otherwise the fixed cases already populate the
			// counter, and adding a synthetic row would make "N/N tests
			// passent" double-count (1 synthetic = 20 actual cases).
			if (!aborted && !behavior.fixed) {
				testResults.push({
					passed: true,
					input: `(${generator.count} cas générés, seed=${generator.seed})`
				});
			}
		}

		// Cleanup the helpers injected into the student namespace.
		try {
			namespace.delete('_chiphre_ref_func');
			namespace.delete('_chiphre_eps_abs');
			namespace.delete('_chiphre_eps_rel');
		} catch {
			// Ignore cleanup errors
		}

		return { valid: allPassed, test_results: testResults };
	} finally {
		if (typeof (refNs as { destroy?: () => void }).destroy === 'function') {
			(refNs as { destroy: () => void }).destroy();
		}
	}
}

/**
 * Run a single fixed-case for the reference_solution layer. Behaves like
 * the unit_test path: inject args + expected into the namespace, call the
 * student function, compare via `_chiphre_compare` (already injected by
 * the caller), and return `{passed, actualJson?, diff?, error?}`.
 */
async function runOneFixedRefCase(
	pyodide: PyodideInterface,
	fnName: string,
	tc: { args: unknown[]; expected: unknown },
	namespace: PyProxy
): Promise<{ passed: boolean; actualJson?: string; diff?: string; error?: string }> {
	try {
		namespace.set('_chiphre_fc_args', tc.args);
		namespace.set('_chiphre_fc_expected', tc.expected);

		const result = (await pyodide.runPythonAsync(
			`
_chiphre_fc_actual = ${fnName}(*_chiphre_fc_args)
_chiphre_fc_passed = _chiphre_compare(_chiphre_fc_actual, _chiphre_fc_expected, _chiphre_eps_abs, _chiphre_eps_rel)
{'passed': _chiphre_fc_passed, 'actual': _chiphre_fc_actual}
`,
			{ globals: namespace }
		)) as PyProxy;

		const jsResult = result.toJs() as { passed: boolean; actual: unknown };
		if (typeof (result as { destroy?: () => void }).destroy === 'function') {
			(result as { destroy: () => void }).destroy();
		}

		namespace.delete('_chiphre_fc_args');
		namespace.delete('_chiphre_fc_expected');
		namespace.delete('_chiphre_fc_actual');
		namespace.delete('_chiphre_fc_passed');

		return {
			passed: jsResult.passed,
			actualJson: JSON.stringify(jsResult.actual),
			...(jsResult.passed
				? {}
				: {
						diff: `attendu ${JSON.stringify(tc.expected)}, obtenu ${JSON.stringify(jsResult.actual)}`
					})
		};
	} catch (error) {
		try {
			namespace.delete('_chiphre_fc_args');
			namespace.delete('_chiphre_fc_expected');
			namespace.delete('_chiphre_fc_actual');
			namespace.delete('_chiphre_fc_passed');
		} catch {
			// Ignore cleanup
		}
		return {
			passed: false,
			error: error instanceof Error ? error.message : String(error)
		};
	}
}

/**
 * Run a single generated case: seed RNG, build args via the teacher's
 * generator code, deep-copy them, call reference and student
 * side-by-side, compare. Reference-side failures (bad generator,
 * reference throws) are flagged `teacher_error`; student-side failures
 * are `student_error`.
 */
async function runOneGeneratorRefCase(
	pyodide: PyodideInterface,
	fnName: string,
	generatorCode: string,
	seedValue: number,
	namespace: PyProxy
): Promise<GeneratorCaseResult> {
	namespace.set('_chiphre_seed_value', seedValue);

	// Step A — generate args + call reference (teacher-side errors flagged here).
	let argsRepr: string;
	try {
		const phaseA = (await pyodide.runPythonAsync(
			`
_chiphre_random.seed(_chiphre_seed_value)

def _chiphre_gen_inputs():
    return ${generatorCode}

_chiphre_args = _chiphre_gen_inputs()
if not isinstance(_chiphre_args, tuple):
    raise TypeError('Le générateur doit renvoyer un tuple d\\'arguments (utilise une virgule, ex: (x,))')

_chiphre_ref_args = _chiphre_copy.deepcopy(_chiphre_args)
_chiphre_expected = _chiphre_ref_func(*_chiphre_ref_args)
{'args_repr': repr(_chiphre_args), 'expected_repr': repr(_chiphre_expected)}
`,
			{ globals: namespace }
		)) as PyProxy;

		const phaseAjs = phaseA.toJs() as { args_repr: string; expected_repr: string };
		if (typeof (phaseA as { destroy?: () => void }).destroy === 'function') {
			(phaseA as { destroy: () => void }).destroy();
		}
		argsRepr = phaseAjs.args_repr;

		// Step B — call student with a fresh deepcopy (Q4) and compare.
		try {
			const phaseB = (await pyodide.runPythonAsync(
				`
_chiphre_stu_args = _chiphre_copy.deepcopy(_chiphre_args)
_chiphre_actual = ${fnName}(*_chiphre_stu_args)
_chiphre_passed = _chiphre_compare(_chiphre_actual, _chiphre_expected, _chiphre_eps_abs, _chiphre_eps_rel)
{'passed': _chiphre_passed, 'actual_repr': repr(_chiphre_actual)}
`,
				{ globals: namespace }
			)) as PyProxy;

			const phaseBjs = phaseB.toJs() as { passed: boolean; actual_repr: string };
			if (typeof (phaseB as { destroy?: () => void }).destroy === 'function') {
				(phaseB as { destroy: () => void }).destroy();
			}

			// Cleanup namespace from per-case scratch variables (best-effort).
			cleanupGenCaseScratch(namespace);

			return {
				kind: 'compared',
				passed: phaseBjs.passed,
				argsRepr,
				expectedRepr: phaseAjs.expected_repr,
				actualRepr: phaseBjs.actual_repr
			};
		} catch (error) {
			cleanupGenCaseScratch(namespace);
			return {
				kind: 'student_error',
				argsRepr,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	} catch (error) {
		cleanupGenCaseScratch(namespace);
		const message = error instanceof Error ? error.message : String(error);
		return {
			kind: 'teacher_error',
			error: `Solution de référence ou générateur (seed=${seedValue}) : ${message}`
		};
	}
}

function cleanupGenCaseScratch(namespace: PyProxy): void {
	// `_chiphre_gen_inputs` is the `def` injected per case — without
	// deleting it here, the function persists in the student's namespace
	// past the validation run, holding a closure over `_chiphre_ref_func`.
	for (const k of [
		'_chiphre_seed_value',
		'_chiphre_args',
		'_chiphre_ref_args',
		'_chiphre_stu_args',
		'_chiphre_expected',
		'_chiphre_actual',
		'_chiphre_passed',
		'_chiphre_gen_inputs'
	]) {
		try {
			namespace.delete(k);
		} catch {
			// Ignore — variable may not exist if the snippet failed early.
		}
	}
}
