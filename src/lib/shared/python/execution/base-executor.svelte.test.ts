/**
 * BasePythonExecutor Tests
 * ========================
 *
 * Tests for the abstract base executor, focused on the validateExercise flow
 * (Step 1 of the Python Exercises System integration).
 *
 * Uses a minimal concrete subclass (TestExecutor) plus a mocked Worker to
 * drive the message flow synchronously.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
// Import through the barrel to avoid a TDZ when base-executor's barrel import
// triggers playground-executor (which extends BasePythonExecutor) before
// base-executor has finished evaluating. The same pattern is used by
// pythonPlayground.svelte.test.ts (indirectly, via the store module).
import {
	BasePythonExecutor,
	type ExerciseValidationConfig,
	type ExerciseValidationResult
} from '$lib/shared/python';

// =============================================================================
// Mock Worker (mirrors the pattern in pythonPlayground.svelte.test.ts)
// =============================================================================

class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	private terminated = false;

	constructor(_url: URL, _options?: WorkerOptions) {
		MockWorker.instance = this;
	}

	postMessage(message: unknown): void {
		if (this.terminated) return;
		MockWorker.lastMessage = message;
		MockWorker.messages.push(message);
	}

	terminate(): void {
		this.terminated = true;
	}

	simulateMessage(data: unknown): void {
		if (this.onmessage && !this.terminated) {
			this.onmessage({ data } as MessageEvent);
		}
	}

	static lastMessage: unknown = null;
	static messages: unknown[] = [];
	static instance: MockWorker | null = null;

	static reset(): void {
		MockWorker.lastMessage = null;
		MockWorker.messages = [];
		MockWorker.instance = null;
	}
}

const OriginalWorker = globalThis.Worker;

// =============================================================================
// TestExecutor — minimal concrete subclass for testing the base
// =============================================================================

class TestExecutor extends BasePythonExecutor {
	completedDurations: number[] = [];
	errors: { message: string; line?: number }[] = [];

	getContextId(): string | undefined {
		return undefined;
	}
	isPersistentContext(): boolean {
		return false;
	}
	protected onExecutionComplete(duration: number): void {
		this.completedDurations.push(duration);
	}
	protected onExecutionError(message: string, line?: number): void {
		this.errors.push({ message, line });
	}
}

// =============================================================================
// Helpers
// =============================================================================

/** Find the first message of the given type in the mocked worker mailbox. */
function findMessage<T = unknown>(type: string): T | undefined {
	return MockWorker.messages.find((m) => (m as { type: string }).type === type) as T | undefined;
}

/** Build a minimal valid ExerciseValidationConfig (output strategy). */
function makeOutputConfig(timeoutMs?: number): ExerciseValidationConfig {
	return {
		type: 'output',
		test_cases: [{ input: '', expected_output: 'hi\n' }],
		...(timeoutMs !== undefined ? { timeout_ms: timeoutMs } : {})
	};
}

/** Build a minimal valid ExerciseValidationResult. */
function makeResult(overrides: Partial<ExerciseValidationResult> = {}): ExerciseValidationResult {
	return {
		valid: true,
		strategy: 'output',
		test_results: [{ passed: true, input: '', expected: 'hi\n', actual: 'hi\n' }],
		execution_time_ms: 12,
		...overrides
	};
}

/** Move the executor into the 'ready' state by simulating worker init. */
function readyUp(executor: TestExecutor): void {
	executor.initPyodide();
	MockWorker.instance?.simulateMessage({ type: 'pyodide-ready' });
	MockWorker.messages = [];
}

// =============================================================================
// Test Suite
// =============================================================================

describe('BasePythonExecutor.validateExercise', () => {
	let executor: TestExecutor;

	beforeEach(() => {
		MockWorker.reset();
		vi.clearAllMocks();
		globalThis.Worker = vi.fn().mockImplementation((url: URL, options?: WorkerOptions) => {
			return new MockWorker(url, options);
		}) as unknown as typeof Worker;
		executor = new TestExecutor();
	});

	afterEach(() => {
		executor?.destroy();
		globalThis.Worker = OriginalWorker;
		vi.useRealTimers();
	});

	// ===========================================================================
	// 1. Not-ready guards
	// ===========================================================================

	describe('when not ready', () => {
		it("rejects with 'Pyodide n'est pas prêt' if state is initial", async () => {
			expect(executor.state).toBe('initial');

			await expect(executor.validateExercise('print(1)', makeOutputConfig())).rejects.toThrow(
				/Pyodide n'est pas prêt/
			);
		});

		it('does not post any message to the worker when not ready', async () => {
			executor.initPyodide();
			MockWorker.messages = [];

			await expect(
				executor.validateExercise('print(1)', makeOutputConfig())
			).rejects.toBeInstanceOf(Error);

			expect(findMessage('validate-exercise')).toBeUndefined();
		});
	});

	// ===========================================================================
	// 2. Happy path
	// ===========================================================================

	describe('when ready', () => {
		it('posts a validate-exercise message with code, config, and a unique id', async () => {
			readyUp(executor);

			const config = makeOutputConfig();
			const promise = executor.validateExercise('print("hi")', config);

			const msg = findMessage<{ type: string; code: string; config: unknown; id: string }>(
				'validate-exercise'
			);
			expect(msg).toBeDefined();
			expect(msg?.code).toBe('print("hi")');
			expect(msg?.config).toEqual(config);
			expect(msg?.id).toMatch(/^[a-zA-Z0-9_-]+$/);

			// Resolve to avoid an unhandled rejection on cleanup
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: makeResult(),
				id: msg!.id
			});
			await promise;
		});

		it('resolves with the result when a matching validation-exercise-result arrives', async () => {
			readyUp(executor);

			const promise = executor.validateExercise('print("hi")', makeOutputConfig());
			const msg = findMessage<{ id: string }>('validate-exercise')!;

			const expected = makeResult({ valid: true });
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: expected,
				id: msg.id
			});

			await expect(promise).resolves.toEqual(expected);
		});

		it('passes through invalid (failed) results without rejecting the promise', async () => {
			readyUp(executor);

			const promise = executor.validateExercise('print("ko")', makeOutputConfig());
			const msg = findMessage<{ id: string }>('validate-exercise')!;

			const failed = makeResult({
				valid: false,
				test_results: [{ passed: false, input: '', expected: 'hi\n', actual: 'ko\n' }]
			});
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: failed,
				id: msg.id
			});

			const result = await promise;
			expect(result.valid).toBe(false);
			expect(result.test_results[0].passed).toBe(false);
		});

		it('does not modify stdout, stderr, plotData, or state during validation', async () => {
			readyUp(executor);

			expect(executor.state).toBe('ready');
			expect(executor.stdout).toBe('');
			expect(executor.stderr).toBe('');

			const promise = executor.validateExercise('print("hi")', makeOutputConfig());
			expect(executor.state).toBe('ready'); // not 'executing'
			expect(executor.stdout).toBe('');

			const msg = findMessage<{ id: string }>('validate-exercise')!;
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: makeResult(),
				id: msg.id
			});

			await promise;

			expect(executor.state).toBe('ready');
			expect(executor.stdout).toBe('');
			expect(executor.stderr).toBe('');
			expect(executor.plotData).toBe(null);
		});

		it('does not interfere with an in-flight execute() (state stays "executing")', async () => {
			readyUp(executor);

			executor.execute('print("running")');
			expect(executor.state).toBe('executing');

			const promise = executor.validateExercise('print("hi")', makeOutputConfig());
			expect(executor.state).toBe('executing');

			const validateMsg = MockWorker.messages.find(
				(m) => (m as { type: string }).type === 'validate-exercise'
			) as { id: string };
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: makeResult(),
				id: validateMsg.id
			});

			await promise;
			expect(executor.state).toBe('executing'); // execute() is still pending
			expect(executor.completedDurations).toEqual([]); // onExecutionComplete not called
		});
	});

	// ===========================================================================
	// 3. Id routing & concurrency
	// ===========================================================================

	describe('id routing', () => {
		it('routes concurrent validations by their respective ids', async () => {
			readyUp(executor);

			const p1 = executor.validateExercise('a', makeOutputConfig());
			const p2 = executor.validateExercise('b', makeOutputConfig());

			const msgs = MockWorker.messages.filter(
				(m) => (m as { type: string }).type === 'validate-exercise'
			) as { id: string; code: string }[];
			expect(msgs).toHaveLength(2);
			expect(msgs[0].id).not.toBe(msgs[1].id);

			const result1 = makeResult({ execution_time_ms: 1 });
			const result2 = makeResult({ execution_time_ms: 2 });

			// Resolve in reverse order to verify routing isn't FIFO
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: result2,
				id: msgs[1].id
			});
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: result1,
				id: msgs[0].id
			});

			await expect(p1).resolves.toEqual(result1);
			await expect(p2).resolves.toEqual(result2);
		});

		it('ignores results with an unknown id (no crash, no state change)', async () => {
			readyUp(executor);

			expect(() => {
				MockWorker.instance?.simulateMessage({
					type: 'validation-exercise-result',
					result: makeResult(),
					id: 'unknown-stale-id'
				});
			}).not.toThrow();

			expect(executor.state).toBe('ready');
		});
	});

	// ===========================================================================
	// 4. Safety-net timeout
	// ===========================================================================

	describe('safety-net timeout', () => {
		it("rejects with 'Délai d'exécution dépassé' if no result arrives within timeout_ms + buffer", async () => {
			vi.useFakeTimers();
			readyUp(executor);

			// timeout_ms = 5000, buffer = 5000 → total 10s
			const promise = executor.validateExercise('inf', makeOutputConfig(5000));
			const assertion = expect(promise).rejects.toThrow(/Délai d'exécution dépassé/);

			await vi.advanceTimersByTimeAsync(11_000);
			await assertion;
		});

		it('uses default 5000ms timeout when config.timeout_ms is omitted', async () => {
			vi.useFakeTimers();
			readyUp(executor);

			const promise = executor.validateExercise('inf', makeOutputConfig());
			const assertion = expect(promise).rejects.toThrow(/Délai d'exécution dépassé/);

			// 5000 (default) + 5000 (buffer) = 10000
			await vi.advanceTimersByTimeAsync(11_000);
			await assertion;
		});

		it('does not fire the safety-net timeout when result arrives in time', async () => {
			vi.useFakeTimers();
			readyUp(executor);

			const promise = executor.validateExercise('print("hi")', makeOutputConfig(5000));
			const msg = findMessage<{ id: string }>('validate-exercise')!;

			await vi.advanceTimersByTimeAsync(8_000);
			MockWorker.instance?.simulateMessage({
				type: 'validation-exercise-result',
				result: makeResult(),
				id: msg.id
			});

			await expect(promise).resolves.toBeDefined();

			// Advance past what would have been the safety net timeout
			await vi.advanceTimersByTimeAsync(10_000);
		});
	});

	// ===========================================================================
	// 5. Destroy cleanup
	// ===========================================================================

	describe('destroy', () => {
		it('rejects all pending validations on destroy', async () => {
			readyUp(executor);

			const p1 = executor.validateExercise('a', makeOutputConfig());
			const p2 = executor.validateExercise('b', makeOutputConfig());

			executor.destroy();

			await expect(p1).rejects.toThrow(/Worker destroyed/);
			await expect(p2).rejects.toThrow(/Worker destroyed/);
		});

		it('clears safety-net timeouts on destroy (no late rejection after destroy)', async () => {
			vi.useFakeTimers();
			readyUp(executor);

			const promise = executor.validateExercise('a', makeOutputConfig(5000));
			executor.destroy();

			// First (and only) rejection: from destroy
			await expect(promise).rejects.toThrow(/Worker destroyed/);

			// No second rejection should fire from the timeout
			await vi.advanceTimersByTimeAsync(20_000);
			// Reaching here without an unhandled rejection is success
		});
	});
});
