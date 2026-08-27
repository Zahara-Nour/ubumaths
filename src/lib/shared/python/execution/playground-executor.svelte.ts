/**
 * Playground Python Executor
 *
 * Concrete implementation of BasePythonExecutor for the Python Playground.
 * Uses isolated execution (no persistent context) - state is reset between runs.
 *
 * This executor is designed for the playground use case where:
 * - Each execution is independent
 * - Variables don't persist across runs (unless re-declared in code)
 * - Simple, straightforward execution model
 *
 * @example
 * ```typescript
 * const executor = new PlaygroundExecutor();
 * executor.initPyodide();
 * executor.execute('print("Hello, World!")');
 * ```
 */

import { BasePythonExecutor } from './base-executor.svelte';
import { debugStore } from '$lib/stores/pythonDebug.svelte';
import type { DebugSnapshot, DebugPauseReason } from '../debug/types';

// =============================================================================
// Playground Executor
// =============================================================================

/**
 * Python executor for playground mode (isolated execution).
 *
 * Features:
 * - No persistent context (contextId = undefined)
 * - State reset between executions
 * - Simple execution model suitable for quick code experiments
 *
 * Note: This executor handles the worker communication and state.
 * The PythonPlaygroundStore wraps this and adds additional features like:
 * - localStorage persistence
 * - Cloud save/load
 * - URL sharing
 * - Editor settings (theme, font size)
 */
export class PlaygroundExecutor extends BasePythonExecutor {
	// ===========================================================================
	// Abstract Method Implementations
	// ===========================================================================

	/**
	 * Get context ID for execution.
	 * Returns undefined for isolated execution (playground mode).
	 */
	getContextId(): string | undefined {
		return undefined;
	}

	/**
	 * Whether this executor uses persistent context.
	 * Playground mode does not persist state between runs.
	 */
	isPersistentContext(): boolean {
		return false;
	}

	/**
	 * Hook called when execution completes successfully.
	 * Playground doesn't need additional handling here.
	 *
	 * @param _duration - Execution time in milliseconds (unused)
	 */
	protected onExecutionComplete(_duration: number): void {
		// No additional handling needed for playground mode
		// The base class already updates executionTime
	}

	/**
	 * Hook called when execution encounters an error.
	 * Playground doesn't need additional handling here.
	 *
	 * @param _message - Error message (unused)
	 * @param _line - Optional line number (unused)
	 */
	protected onExecutionError(_message: string, _line?: number): void {
		// No additional handling needed for playground mode
		// The base class already updates stderr and errorLine
	}

	// ===========================================================================
	// Record-then-replay
	// ===========================================================================

	/** True while a full-trace recording ("Exécuter & enregistrer") is in flight. */
	private recording = false;

	/**
	 * Record the whole execution as an immutable trace, then let the student
	 * scrub through it.
	 *
	 * Reuses the existing debug protocol: starts a debug session and auto-drives
	 * `debugStep('step')` on every pause until the worker reports `debug-finished`
	 * (or the store's step budget is reached). No breakpoints are set — every line
	 * is recorded. The interactive `startDebugSession` path is left untouched.
	 *
	 * @param code - The Python code to record
	 */
	recordDebugSession(code: string): void {
		this.recording = true;
		debugStore.startSession();
		debugStore.isRecording = true;
		// Empty breakpoints: `step` records every line regardless of breakpoints.
		this.startDebugSession(code, []);
	}

	/**
	 * Wrap up a recording: stop driving the worker, mark the session finished, and
	 * place the scrubber at the first step so replay starts from the beginning.
	 * Idempotent — safe to call from both the normal-completion and budget paths.
	 */
	private finishRecording(): void {
		if (!this.recording) return;
		this.recording = false;
		// A budget bail-out may leave the worker session live; normal completion has
		// already cleared it, so this is a no-op there.
		this.stopDebugSession();
		debugStore.isRecording = false;
		debugStore.finishSession();
		debugStore.goToStep(0);
	}

	// ===========================================================================
	// Debug Hook Implementations
	// ===========================================================================

	/**
	 * Hook called when a debug snapshot is received.
	 * Appends it to the debugStore trace.
	 *
	 * @param snapshot - The debug snapshot from the worker
	 */
	protected onDebugSnapshot(snapshot: DebugSnapshot): void {
		debugStore.pushSnapshot(snapshot);
	}

	/**
	 * Hook called when execution is paused.
	 *
	 * Interactive mode: surface the paused state for stepping. Recording mode:
	 * don't surface it — auto-advance to the next step (or stop if the trace is
	 * full).
	 *
	 * @param reason - Why execution paused (breakpoint, step, etc.)
	 */
	protected onDebugPaused(reason: DebugPauseReason): void {
		if (this.recording) {
			if (debugStore.isTraceFull) {
				this.finishRecording();
			} else {
				this.debugStep('step');
			}
			return;
		}

		const currentLine = debugStore.currentSnapshot?.lineNumber ?? 1;
		debugStore.pauseSession(reason, currentLine);
	}

	/**
	 * Hook called when debug session finishes.
	 *
	 * @param _duration - Execution time in milliseconds (unused)
	 */
	protected onDebugFinished(_duration: number): void {
		if (this.recording) {
			this.finishRecording();
			return;
		}
		debugStore.finishSession();
	}
}
