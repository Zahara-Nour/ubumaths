/**
 * Python Debug Store
 *
 * Svelte 5 reactive store for Python debug session state management.
 * Manages debug mode, breakpoints, execution snapshots, and history navigation.
 *
 * Uses a circular buffer for snapshot history to enable step-back functionality
 * while maintaining memory efficiency.
 *
 * @example
 * ```svelte
 * <script>
 * import { debugStore } from '$lib/stores/pythonDebug.svelte';
 *
 * function handleToggleBreakpoint(line: number) {
 *   debugStore.toggleBreakpoint(line);
 * }
 *
 * function handleStep() {
 *   // Step action is handled by executor
 * }
 * </script>
 *
 * <p>Mode: {debugStore.mode}</p>
 * <p>State: {debugStore.sessionState}</p>
 * ```
 */

import type {
	DebugMode,
	DebugSessionState,
	DebugSnapshot,
	Breakpoint,
	DebugPauseReason,
	WorkerBreakpoint
} from '$lib/shared/python/debug/types';
import { DEBUG_CONFIG } from '$lib/shared/python/debug/types';

// =============================================================================
// Python Debug Store Class
// =============================================================================

/**
 * Reactive store for Python debug session state.
 *
 * Manages:
 * - Debug mode (execute vs debug)
 * - Session state machine (idle -> running -> paused -> finished)
 * - Breakpoints with enable/disable and conditions
 * - Snapshot history with circular buffer for step-back
 * - Current execution position and pause reason
 */
class PythonDebugStore {
	// ===========================================================================
	// Mode and Session State (Svelte 5 runes)
	// ===========================================================================

	/** Current debug mode: 'execute' for normal run, 'debug' for step-by-step */
	mode = $state<DebugMode>('execute');

	/** Current debug session state */
	sessionState = $state<DebugSessionState>('idle');

	/**
	 * True while a full-trace recording is in flight ("Exécuter & enregistrer").
	 * Lets the UI show a lightweight progress indicator instead of re-rendering
	 * the (expensive) memory diagram on every recorded step.
	 */
	isRecording = $state(false);

	// ===========================================================================
	// Breakpoints
	// ===========================================================================

	/** List of all breakpoints */
	breakpoints = $state<Breakpoint[]>([]);

	// ===========================================================================
	// Snapshot History (Circular Buffer)
	// ===========================================================================

	/** Execution snapshots for the full trace (stored most-recent-first) */
	private _snapshots = $state<DebugSnapshot[]>([]);

	/** True when the recording hit STEP_BUDGET and the trace was cut short */
	private _traceTruncated = $state(false);

	/** Current position in snapshot history (0 = most recent, higher = older) */
	historyIndex = $state(0);

	// ===========================================================================
	// Current Execution Info
	// ===========================================================================

	/** Current line number being executed (null when not debugging) */
	currentLine = $state<number | null>(null);

	/** Reason why execution is paused (null when not paused) */
	pauseReason = $state<DebugPauseReason | null>(null);

	// ===========================================================================
	// Derived State
	// ===========================================================================

	/** Whether debug mode is active */
	isDebugging = $derived(this.mode === 'debug');

	/** Whether execution is paused and waiting for user action */
	isPaused = $derived(this.sessionState === 'paused');

	/** Whether code is running (executing or stepping) */
	isRunning = $derived(this.sessionState === 'running' || this.sessionState === 'stepping');

	/** Whether we can step back in history */
	canStepBack = $derived(this.historyIndex < this._snapshots.length - 1);

	/** Whether we can step forward in history */
	canStepForward = $derived(this.historyIndex > 0);

	/** Current snapshot at history index (null if no snapshots) */
	currentSnapshot = $derived(this._snapshots[this.historyIndex] ?? null);

	/** Heap objects in the current snapshot (empty when no heap or no snapshot) */
	currentHeap = $derived(this.currentSnapshot?.heap ?? []);

	/** Total number of snapshots in history */
	snapshotCount = $derived(this._snapshots.length);

	/** All snapshots (most recent first) - for history visualization */
	allSnapshots = $derived([...this._snapshots]);

	// ---------------------------------------------------------------------------
	// Chronological scrubbing layer (first step first). Sits on top of the
	// internal most-recent-first storage so existing consumers keep working.
	// ---------------------------------------------------------------------------

	/** Chronological trace (first step first) — the scrubber timeline */
	trace = $derived([...this._snapshots].reverse());

	/** Current position as a chronological step index (0 = first step) */
	stepIndex = $derived(
		this._snapshots.length > 0 ? this._snapshots.length - 1 - this.historyIndex : 0
	);

	/** Total number of recorded steps (chronological alias of snapshotCount) */
	stepCount = $derived(this._snapshots.length);

	/** True when the recording was cut short at STEP_BUDGET */
	traceTruncated = $derived(this._traceTruncated);

	/** True when the trace has reached the step budget (no room left to record) */
	isTraceFull = $derived(this._snapshots.length >= DEBUG_CONFIG.STEP_BUDGET);

	/**
	 * Chronological event markers for the scrubber track.
	 *
	 * The worker's tracer tags every step `'line'` (or `'start'`/`'exception'`); it
	 * does NOT emit `'call'`/`'return'`. So we DERIVE those from call-stack depth
	 * changes between consecutive steps: depth up = a function was entered (call),
	 * depth down = a function returned. Exceptions come straight from the event
	 * field. Line steps are not surfaced (they would clutter the timeline).
	 */
	eventMarkers = $derived.by(() => {
		const chrono = this.trace;
		const markers: { index: number; event: 'call' | 'return' | 'exception' }[] = [];
		let prevDepth = 0;
		for (let i = 0; i < chrono.length; i++) {
			const snapshot = chrono[i];
			const depth = snapshot.callStack.length;
			if (snapshot.event === 'exception') {
				markers.push({ index: i, event: 'exception' });
			} else if (i > 0 && depth > prevDepth) {
				markers.push({ index: i, event: 'call' });
			} else if (i > 0 && depth < prevDepth) {
				markers.push({ index: i, event: 'return' });
			}
			prevDepth = depth;
		}
		return markers;
	});

	/** True when an enabled breakpoint matches at least one step in the trace. */
	hasBreakpointInTrace = $derived.by(() => {
		const lines = new Set(this.breakpoints.filter((b) => b.enabled).map((b) => b.lineNumber));
		if (lines.size === 0) return false;
		return this.trace.some((s) => lines.has(s.lineNumber));
	});

	/** Number of enabled breakpoints */
	enabledBreakpointCount = $derived(this.breakpoints.filter((bp) => bp.enabled).length);

	// ===========================================================================
	// Mode Methods
	// ===========================================================================

	/**
	 * Toggle between execute and debug modes.
	 * Resets session state when switching modes.
	 */
	toggleMode(): void {
		this.mode = this.mode === 'execute' ? 'debug' : 'execute';
		this.resetSession();
	}

	/**
	 * Set debug mode explicitly.
	 *
	 * @param mode - The mode to set
	 */
	setMode(mode: DebugMode): void {
		if (this.mode !== mode) {
			this.mode = mode;
			this.resetSession();
		}
	}

	// ===========================================================================
	// Breakpoint Methods
	// ===========================================================================

	/**
	 * Add a breakpoint at the specified line.
	 * If a breakpoint already exists at that line, does nothing.
	 *
	 * @param lineNumber - Line number (1-based)
	 * @param condition - Optional condition expression
	 */
	addBreakpoint(lineNumber: number, condition?: string): void {
		if (this.hasBreakpointAt(lineNumber)) {
			return;
		}

		const breakpoint: Breakpoint = {
			id: `bp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			lineNumber,
			enabled: true,
			condition
		};

		this.breakpoints = [...this.breakpoints, breakpoint];
	}

	/**
	 * Remove a breakpoint at the specified line.
	 *
	 * @param lineNumber - Line number (1-based)
	 */
	removeBreakpoint(lineNumber: number): void {
		this.breakpoints = this.breakpoints.filter((bp) => bp.lineNumber !== lineNumber);
	}

	/**
	 * Toggle a breakpoint at the specified line.
	 * If no breakpoint exists, adds one. If one exists, removes it.
	 *
	 * @param lineNumber - Line number (1-based)
	 */
	toggleBreakpoint(lineNumber: number): void {
		if (this.hasBreakpointAt(lineNumber)) {
			this.removeBreakpoint(lineNumber);
		} else {
			this.addBreakpoint(lineNumber);
		}
	}

	/**
	 * Toggle the enabled state of a breakpoint at the specified line.
	 *
	 * @param lineNumber - Line number (1-based)
	 */
	toggleBreakpointEnabled(lineNumber: number): void {
		this.breakpoints = this.breakpoints.map((bp) =>
			bp.lineNumber === lineNumber ? { ...bp, enabled: !bp.enabled } : bp
		);
	}

	/**
	 * Update the condition of a breakpoint.
	 *
	 * @param lineNumber - Line number (1-based)
	 * @param condition - New condition expression (undefined to clear)
	 */
	updateBreakpointCondition(lineNumber: number, condition?: string): void {
		this.breakpoints = this.breakpoints.map((bp) =>
			bp.lineNumber === lineNumber ? { ...bp, condition } : bp
		);
	}

	/**
	 * Clear all breakpoints.
	 */
	clearAllBreakpoints(): void {
		this.breakpoints = [];
	}

	/**
	 * Check if a breakpoint exists at the specified line.
	 *
	 * @param lineNumber - Line number (1-based)
	 * @returns true if a breakpoint exists at that line
	 */
	hasBreakpointAt(lineNumber: number): boolean {
		return this.breakpoints.some((bp) => bp.lineNumber === lineNumber);
	}

	/**
	 * Get the breakpoint at the specified line.
	 *
	 * @param lineNumber - Line number (1-based)
	 * @returns The breakpoint or undefined
	 */
	getBreakpointAt(lineNumber: number): Breakpoint | undefined {
		return this.breakpoints.find((bp) => bp.lineNumber === lineNumber);
	}

	/**
	 * Convert breakpoints to worker format (without id).
	 * Only includes enabled breakpoints.
	 *
	 * @returns Array of worker breakpoints
	 */
	getBreakpointsForWorker(): WorkerBreakpoint[] {
		return this.breakpoints
			.filter((bp) => bp.enabled)
			.map((bp) => ({
				lineNumber: bp.lineNumber,
				enabled: bp.enabled,
				condition: bp.condition
			}));
	}

	// ===========================================================================
	// Snapshot History Methods
	// ===========================================================================

	/**
	 * Append a new snapshot to the trace.
	 *
	 * The trace is a full chronological recording (no circular dropping) so the
	 * scrubber can jump to any past step. It is bounded by STEP_BUDGET: once the
	 * budget is reached, further snapshots are ignored and `traceTruncated` flips
	 * to true (the executor stops recording at that point).
	 *
	 * Internally snapshots are stored most-recent-first (index 0 = newest) to keep
	 * the existing step-back/forward semantics; chronological access goes through
	 * `stepIndex` / `goToStep` / `eventMarkers`.
	 *
	 * @param snapshot - The debug snapshot to add
	 */
	pushSnapshot(snapshot: DebugSnapshot): void {
		// Full trace: stop at the step budget instead of dropping the oldest step.
		if (this._snapshots.length >= DEBUG_CONFIG.STEP_BUDGET) {
			this._traceTruncated = true;
			return;
		}

		// Add to front of array (most recent first)
		this._snapshots = [snapshot, ...this._snapshots];
		this.historyIndex = 0;

		// Update current line from snapshot
		this.currentLine = snapshot.lineNumber;
	}

	/**
	 * Move back one step in snapshot history.
	 * No-op if already at the oldest snapshot.
	 */
	stepBack(): void {
		if (this.canStepBack) {
			this.historyIndex++;
			const snapshot = this._snapshots[this.historyIndex];
			if (snapshot) {
				this.currentLine = snapshot.lineNumber;
			}
		}
	}

	/**
	 * Move forward one step in snapshot history.
	 * No-op if already at the most recent snapshot.
	 */
	stepForward(): void {
		if (this.canStepForward) {
			this.historyIndex--;
			const snapshot = this._snapshots[this.historyIndex];
			if (snapshot) {
				this.currentLine = snapshot.lineNumber;
			}
		}
	}

	/**
	 * Jump to a specific snapshot in history.
	 *
	 * @param index - Index in snapshot array (0 = most recent)
	 */
	goToSnapshot(index: number): void {
		if (index >= 0 && index < this._snapshots.length) {
			this.historyIndex = index;
			const snapshot = this._snapshots[this.historyIndex];
			if (snapshot) {
				this.currentLine = snapshot.lineNumber;
			}
		}
	}

	/**
	 * Jump to a chronological step index (0 = first step). Thin wrapper over
	 * `goToSnapshot` that converts from chronological to internal (newest-first)
	 * indexing. Used by the scrubber slider.
	 *
	 * @param stepIndex - Chronological step index (0 = first step)
	 */
	goToStep(stepIndex: number): void {
		if (this._snapshots.length === 0) return;
		this.goToSnapshot(this._snapshots.length - 1 - stepIndex);
	}

	/**
	 * Move the scrubber to the next step (chronologically after the current one)
	 * whose line carries an enabled breakpoint. No-op if there is no such step.
	 */
	goToNextBreakpointStep(): void {
		const lines = new Set(this.breakpoints.filter((b) => b.enabled).map((b) => b.lineNumber));
		if (lines.size === 0) return;
		const chrono = this.trace;
		for (let i = this.stepIndex + 1; i < chrono.length; i++) {
			if (lines.has(chrono[i].lineNumber)) {
				this.goToStep(i);
				return;
			}
		}
	}

	/**
	 * Move the scrubber to the previous step (chronologically before the current
	 * one) whose line carries an enabled breakpoint. No-op if there is none.
	 */
	goToPrevBreakpointStep(): void {
		const lines = new Set(this.breakpoints.filter((b) => b.enabled).map((b) => b.lineNumber));
		if (lines.size === 0) return;
		const chrono = this.trace;
		for (let i = this.stepIndex - 1; i >= 0; i--) {
			if (lines.has(chrono[i].lineNumber)) {
				this.goToStep(i);
				return;
			}
		}
	}

	/**
	 * "Step over": advance to the next step at the current call-stack depth or
	 * shallower. If the current line calls a function, its internals (deeper
	 * frames) are skipped and the scrubber lands on the next line in the current
	 * frame. Falls back to the last step when nothing shallower lies ahead.
	 */
	goToStepOver(): void {
		const chrono = this.trace;
		if (chrono.length === 0) return;
		const currentDepth = chrono[this.stepIndex]?.callStack.length ?? 0;
		for (let i = this.stepIndex + 1; i < chrono.length; i++) {
			if (chrono[i].callStack.length <= currentDepth) {
				this.goToStep(i);
				return;
			}
		}
		this.goToStep(chrono.length - 1);
	}

	/**
	 * Clear all snapshots in history.
	 */
	clearSnapshots(): void {
		this._snapshots = [];
		this.historyIndex = 0;
		this._traceTruncated = false;
	}

	// ===========================================================================
	// Session State Methods
	// ===========================================================================

	/**
	 * Start a new debug session.
	 * Sets session state to 'running' and clears previous snapshots.
	 */
	startSession(): void {
		this.sessionState = 'running';
		this.clearSnapshots();
		this.pauseReason = null;
		this.currentLine = null;
		this.isRecording = false;
	}

	/**
	 * Pause the current session.
	 * Called when execution hits a breakpoint or completes a step.
	 *
	 * @param reason - Why execution paused
	 * @param lineNumber - Line number where paused
	 */
	pauseSession(reason: DebugPauseReason, lineNumber: number): void {
		this.sessionState = 'paused';
		this.pauseReason = reason;
		this.currentLine = lineNumber;
	}

	/**
	 * Resume the session after being paused.
	 * Sets state to 'running' for continue, 'stepping' for step commands.
	 *
	 * @param stepping - Whether resuming for a step command
	 */
	resumeSession(stepping = false): void {
		this.sessionState = stepping ? 'stepping' : 'running';
		this.pauseReason = null;
	}

	/**
	 * Mark the session as finished.
	 * Called when execution completes normally.
	 */
	finishSession(): void {
		this.sessionState = 'finished';
		this.pauseReason = null;
	}

	/**
	 * Reset all debug session state.
	 * Called when stopping a session or switching modes.
	 */
	resetSession(): void {
		this.sessionState = 'idle';
		this.clearSnapshots();
		this.currentLine = null;
		this.pauseReason = null;
		this.isRecording = false;
	}

	// ===========================================================================
	// Utility Methods
	// ===========================================================================

	/**
	 * Check if the store is in a state where debugging can start.
	 *
	 * @returns true if ready to start debugging
	 */
	canStartDebugging(): boolean {
		return this.mode === 'debug' && this.sessionState === 'idle';
	}

	/**
	 * Check if step commands are available.
	 *
	 * @returns true if step commands can be executed
	 */
	canStep(): boolean {
		return this.mode === 'debug' && this.sessionState === 'paused';
	}
}

// =============================================================================
// Export Singleton
// =============================================================================

/**
 * Singleton instance of the Python debug store.
 *
 * Use this in components to access debug state and methods.
 */
export const debugStore = new PythonDebugStore();
