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

	// ===========================================================================
	// Breakpoints
	// ===========================================================================

	/** List of all breakpoints */
	breakpoints = $state<Breakpoint[]>([]);

	// ===========================================================================
	// Snapshot History (Circular Buffer)
	// ===========================================================================

	/** Execution snapshots for step-back functionality */
	private _snapshots = $state<DebugSnapshot[]>([]);

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

	/** Total number of snapshots in history */
	snapshotCount = $derived(this._snapshots.length);

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
	 * Add a new snapshot to the history.
	 * Uses a circular buffer with MAX_HISTORY_SIZE limit.
	 * Resets history index to 0 (most recent) when adding.
	 *
	 * @param snapshot - The debug snapshot to add
	 */
	pushSnapshot(snapshot: DebugSnapshot): void {
		// Add to front of array (most recent first)
		const newSnapshots = [snapshot, ...this._snapshots];

		// Trim to max size (circular buffer)
		if (newSnapshots.length > DEBUG_CONFIG.MAX_HISTORY_SIZE) {
			newSnapshots.pop();
		}

		this._snapshots = newSnapshots;
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
	 * Clear all snapshots in history.
	 */
	clearSnapshots(): void {
		this._snapshots = [];
		this.historyIndex = 0;
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
