/**
 * Debug Trace Recording — Real Pyodide Integration Tests
 * =======================================================
 *
 * Verifies the sys.settrace-based debug tracer (`_chiphre_record_trace` in
 * pyodide.worker.ts): it must step INTO user-defined function calls, produce a
 * real call stack, and emit call/return/line events — the capabilities the
 * legacy AST interpreter lacked.
 *
 * Real Pyodide runs in the chromium browser project; these `*-real` tests are
 * excluded from the normal suite and run in the nightly job (RUN_PYODIDE_REAL=1).
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BasePythonExecutor } from '$lib/shared/python';
import type { DebugSnapshot, DebugPauseReason } from '$lib/shared/python/debug/types';

// =============================================================================
// Recording executor — drives the debug session to completion, collecting every
// snapshot (the same record-then-replay loop the playground uses).
// =============================================================================

class RecordingExecutor extends BasePythonExecutor {
	snapshots: DebugSnapshot[] = [];
	private done = false;

	getContextId(): string | undefined {
		return undefined;
	}
	isPersistentContext(): boolean {
		return false;
	}
	protected onExecutionComplete(_duration: number): void {}
	protected onExecutionError(_message: string, _line?: number): void {}

	protected onDebugSnapshot(snapshot: DebugSnapshot): void {
		this.snapshots.push(snapshot);
	}
	protected onDebugPaused(_reason: DebugPauseReason): void {
		// Auto-advance to record the whole trace.
		this.debugStep('step');
	}
	protected onDebugFinished(_duration: number): void {
		this.done = true;
	}

	isDone(): boolean {
		return this.done;
	}
	resetRecording(): void {
		this.snapshots = [];
		this.done = false;
	}
}

const PYODIDE_LOAD_TIMEOUT_MS = 90_000;
const RECORD_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 50;

async function waitForReady(executor: RecordingExecutor): Promise<void> {
	const start = Date.now();
	while (executor.state !== 'ready') {
		if (executor.state === 'error') throw new Error(`Pyodide failed: ${executor.stderr}`);
		if (Date.now() - start > PYODIDE_LOAD_TIMEOUT_MS) {
			throw new Error(`Pyodide load timeout — state: ${executor.state}`);
		}
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
}

async function record(executor: RecordingExecutor, code: string): Promise<DebugSnapshot[]> {
	executor.resetRecording();
	executor.startDebugSession(code, []);
	const start = Date.now();
	while (!executor.isDone()) {
		if (Date.now() - start > RECORD_TIMEOUT_MS) throw new Error('Debug record timeout');
		await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
	}
	return executor.snapshots;
}

// =============================================================================
// Tests
// =============================================================================

describe('Debug trace recording (real Pyodide, sys.settrace)', () => {
	let executor: RecordingExecutor;

	beforeAll(async () => {
		executor = new RecordingExecutor();
		executor.initPyodide();
		await waitForReady(executor);
	}, PYODIDE_LOAD_TIMEOUT_MS);

	afterAll(() => {
		executor?.destroy();
	});

	it(
		'steps INTO a user function (call stack depth > 1, call/return events)',
		async () => {
			const code = [
				'def somme(n):',
				'    total = 0',
				'    for i in range(n):',
				'        total += i',
				'    return total',
				'r = somme(3)'
			].join('\n');

			const snapshots = await record(executor, code);

			expect(snapshots.length).toBeGreaterThan(0);

			// No snapshot is dropped by Zod: every lineNumber is valid (>= 1). The
			// module-level 'call' at lineno 0 must have been skipped.
			expect(snapshots.every((s) => s.lineNumber >= 1)).toBe(true);

			// We must have stepped inside somme(): at least one snapshot has 2 frames.
			const maxDepth = Math.max(...snapshots.map((s) => s.callStack.length));
			expect(maxDepth).toBeGreaterThanOrEqual(2);

			// The inner frame is named "somme".
			const insideSomme = snapshots.some((s) =>
				s.callStack.some((f) => f.functionName === 'somme')
			);
			expect(insideSomme).toBe(true);

			// Real call/return events are emitted (they drive the timeline markers).
			expect(snapshots.some((s) => s.event === 'call')).toBe(true);
			expect(snapshots.some((s) => s.event === 'return')).toBe(true);
		},
		RECORD_TIMEOUT_MS + PYODIDE_LOAD_TIMEOUT_MS
	);

	it(
		'records recursion as nested frames',
		async () => {
			const code = [
				'def fact(n):',
				'    if n <= 1:',
				'        return 1',
				'    return n * fact(n - 1)',
				'r = fact(4)'
			].join('\n');

			const snapshots = await record(executor, code);

			// Recursion → several stacked frames of fact() at once.
			const maxDepth = Math.max(...snapshots.map((s) => s.callStack.length));
			expect(maxDepth).toBeGreaterThanOrEqual(3);
		},
		RECORD_TIMEOUT_MS
	);

	it(
		'does not descend into library functions',
		async () => {
			// range()/len() are C/stdlib — must not appear as user frames.
			const code = ['xs = [1, 2, 3]', 'n = len(xs)', 'print(n)'].join('\n');

			const snapshots = await record(executor, code);

			expect(snapshots.length).toBeGreaterThan(0);
			// Flat script: every frame stays at module depth 1.
			const maxDepth = Math.max(...snapshots.map((s) => s.callStack.length));
			expect(maxDepth).toBe(1);
		},
		RECORD_TIMEOUT_MS
	);
});
