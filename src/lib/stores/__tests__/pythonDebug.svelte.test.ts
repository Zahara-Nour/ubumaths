/**
 * Python Debug Store Tests
 * =========================
 *
 * Tests for the Python Debug store, including:
 * - Mode management (execute/debug)
 * - Breakpoint management (add, remove, toggle, enable/disable)
 * - Snapshot history (circular buffer, step back/forward)
 * - Session state machine (idle -> running -> paused -> finished)
 * - Derived state computations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { debugStore } from '../pythonDebug.svelte';
import type { DebugSnapshot } from '$lib/shared/python/debug/types';
import { DEBUG_CONFIG } from '$lib/shared/python/debug/types';

// =============================================================================
// Test Setup
// =============================================================================

describe('PythonDebugStore', () => {
	beforeEach(() => {
		// Reset all state before each test
		debugStore.resetSession();
		debugStore.clearAllBreakpoints();
		debugStore.setMode('execute');
	});

	// ===========================================================================
	// 1. Initial State Tests
	// ===========================================================================

	describe('Initial State', () => {
		it('should have default mode as execute', () => {
			expect(debugStore.mode).toBe('execute');
		});

		it('should have session state as idle', () => {
			expect(debugStore.sessionState).toBe('idle');
		});

		it('should have no breakpoints', () => {
			expect(debugStore.breakpoints).toEqual([]);
		});

		it('should have no snapshots', () => {
			expect(debugStore.snapshotCount).toBe(0);
		});

		it('should have null current line', () => {
			expect(debugStore.currentLine).toBe(null);
		});

		it('should have null pause reason', () => {
			expect(debugStore.pauseReason).toBe(null);
		});

		it('should have correct initial derived states', () => {
			expect(debugStore.isDebugging).toBe(false);
			expect(debugStore.isPaused).toBe(false);
			expect(debugStore.isRunning).toBe(false);
			expect(debugStore.canStepBack).toBe(false);
			expect(debugStore.canStepForward).toBe(false);
			expect(debugStore.currentSnapshot).toBe(null);
			expect(debugStore.enabledBreakpointCount).toBe(0);
		});
	});

	// ===========================================================================
	// 2. Mode Management Tests
	// ===========================================================================

	describe('Mode Management', () => {
		it('should toggle mode from execute to debug', () => {
			expect(debugStore.mode).toBe('execute');

			debugStore.toggleMode();

			expect(debugStore.mode).toBe('debug');
		});

		it('should toggle mode from debug to execute', () => {
			debugStore.setMode('debug');

			debugStore.toggleMode();

			expect(debugStore.mode).toBe('execute');
		});

		it('should reset session when toggling mode', () => {
			// Set up some session state
			debugStore.setMode('debug');
			debugStore.startSession();
			expect(debugStore.sessionState).toBe('running');

			debugStore.toggleMode();

			expect(debugStore.sessionState).toBe('idle');
		});

		it('should update isDebugging derived when mode changes', () => {
			expect(debugStore.isDebugging).toBe(false);

			debugStore.setMode('debug');

			expect(debugStore.isDebugging).toBe(true);
		});

		it('should not reset session if setMode called with same mode', () => {
			debugStore.setMode('debug');
			debugStore.startSession();
			debugStore.pauseSession('breakpoint', 5);

			debugStore.setMode('debug'); // Same mode

			expect(debugStore.sessionState).toBe('paused');
		});

		it('should reset session if setMode called with different mode', () => {
			debugStore.setMode('debug');
			debugStore.startSession();

			debugStore.setMode('execute'); // Different mode

			expect(debugStore.sessionState).toBe('idle');
		});
	});

	// ===========================================================================
	// 3. Breakpoint Management Tests
	// ===========================================================================

	describe('Breakpoint Management', () => {
		describe('addBreakpoint', () => {
			it('should add a breakpoint at the specified line', () => {
				debugStore.addBreakpoint(5);

				expect(debugStore.breakpoints).toHaveLength(1);
				expect(debugStore.breakpoints[0].lineNumber).toBe(5);
				expect(debugStore.breakpoints[0].enabled).toBe(true);
			});

			it('should add breakpoint with condition', () => {
				debugStore.addBreakpoint(10, 'x > 5');

				expect(debugStore.breakpoints).toHaveLength(1);
				expect(debugStore.breakpoints[0].condition).toBe('x > 5');
			});

			it('should not add duplicate breakpoint at same line', () => {
				debugStore.addBreakpoint(5);
				debugStore.addBreakpoint(5);

				expect(debugStore.breakpoints).toHaveLength(1);
			});

			it('should generate unique breakpoint IDs', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);

				expect(debugStore.breakpoints[0].id).not.toBe(debugStore.breakpoints[1].id);
			});

			it('should update enabledBreakpointCount', () => {
				expect(debugStore.enabledBreakpointCount).toBe(0);

				debugStore.addBreakpoint(5);

				expect(debugStore.enabledBreakpointCount).toBe(1);
			});
		});

		describe('removeBreakpoint', () => {
			it('should remove a breakpoint at the specified line', () => {
				debugStore.addBreakpoint(5);
				expect(debugStore.breakpoints).toHaveLength(1);

				debugStore.removeBreakpoint(5);

				expect(debugStore.breakpoints).toHaveLength(0);
			});

			it('should do nothing if no breakpoint exists at line', () => {
				debugStore.addBreakpoint(5);

				debugStore.removeBreakpoint(10);

				expect(debugStore.breakpoints).toHaveLength(1);
			});

			it('should update enabledBreakpointCount', () => {
				debugStore.addBreakpoint(5);
				expect(debugStore.enabledBreakpointCount).toBe(1);

				debugStore.removeBreakpoint(5);

				expect(debugStore.enabledBreakpointCount).toBe(0);
			});
		});

		describe('toggleBreakpoint', () => {
			it('should add breakpoint if none exists', () => {
				debugStore.toggleBreakpoint(5);

				expect(debugStore.hasBreakpointAt(5)).toBe(true);
			});

			it('should remove breakpoint if one exists', () => {
				debugStore.addBreakpoint(5);

				debugStore.toggleBreakpoint(5);

				expect(debugStore.hasBreakpointAt(5)).toBe(false);
			});

			it('should toggle breakpoint multiple times', () => {
				debugStore.toggleBreakpoint(5);
				expect(debugStore.hasBreakpointAt(5)).toBe(true);

				debugStore.toggleBreakpoint(5);
				expect(debugStore.hasBreakpointAt(5)).toBe(false);

				debugStore.toggleBreakpoint(5);
				expect(debugStore.hasBreakpointAt(5)).toBe(true);
			});
		});

		describe('toggleBreakpointEnabled', () => {
			it('should toggle enabled state of breakpoint', () => {
				debugStore.addBreakpoint(5);
				expect(debugStore.breakpoints[0].enabled).toBe(true);

				debugStore.toggleBreakpointEnabled(5);

				expect(debugStore.breakpoints[0].enabled).toBe(false);
			});

			it('should toggle enabled state multiple times', () => {
				debugStore.addBreakpoint(5);

				debugStore.toggleBreakpointEnabled(5);
				expect(debugStore.breakpoints[0].enabled).toBe(false);

				debugStore.toggleBreakpointEnabled(5);
				expect(debugStore.breakpoints[0].enabled).toBe(true);
			});

			it('should do nothing if no breakpoint exists at line', () => {
				debugStore.toggleBreakpointEnabled(5);

				expect(debugStore.breakpoints).toHaveLength(0);
			});

			it('should update enabledBreakpointCount when toggling', () => {
				debugStore.addBreakpoint(5);
				expect(debugStore.enabledBreakpointCount).toBe(1);

				debugStore.toggleBreakpointEnabled(5);

				expect(debugStore.enabledBreakpointCount).toBe(0);
			});
		});

		describe('updateBreakpointCondition', () => {
			it('should update condition of breakpoint', () => {
				debugStore.addBreakpoint(5);

				debugStore.updateBreakpointCondition(5, 'x > 10');

				expect(debugStore.breakpoints[0].condition).toBe('x > 10');
			});

			it('should clear condition when undefined passed', () => {
				debugStore.addBreakpoint(5, 'x > 5');

				debugStore.updateBreakpointCondition(5, undefined);

				expect(debugStore.breakpoints[0].condition).toBeUndefined();
			});

			it('should do nothing if no breakpoint exists at line', () => {
				debugStore.updateBreakpointCondition(5, 'x > 5');

				expect(debugStore.breakpoints).toHaveLength(0);
			});
		});

		describe('clearAllBreakpoints', () => {
			it('should remove all breakpoints', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);
				debugStore.addBreakpoint(3);

				debugStore.clearAllBreakpoints();

				expect(debugStore.breakpoints).toHaveLength(0);
			});

			it('should reset enabledBreakpointCount to zero', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);
				expect(debugStore.enabledBreakpointCount).toBe(2);

				debugStore.clearAllBreakpoints();

				expect(debugStore.enabledBreakpointCount).toBe(0);
			});
		});

		describe('hasBreakpointAt', () => {
			it('should return true if breakpoint exists', () => {
				debugStore.addBreakpoint(5);

				expect(debugStore.hasBreakpointAt(5)).toBe(true);
			});

			it('should return false if no breakpoint exists', () => {
				expect(debugStore.hasBreakpointAt(5)).toBe(false);
			});

			it('should return true even if breakpoint is disabled', () => {
				debugStore.addBreakpoint(5);
				debugStore.toggleBreakpointEnabled(5);

				expect(debugStore.hasBreakpointAt(5)).toBe(true);
			});
		});

		describe('getBreakpointAt', () => {
			it('should return breakpoint if exists', () => {
				debugStore.addBreakpoint(5, 'x > 10');

				const bp = debugStore.getBreakpointAt(5);

				expect(bp).toBeDefined();
				expect(bp?.lineNumber).toBe(5);
				expect(bp?.condition).toBe('x > 10');
			});

			it('should return undefined if no breakpoint exists', () => {
				const bp = debugStore.getBreakpointAt(5);

				expect(bp).toBeUndefined();
			});
		});

		describe('getBreakpointsForWorker', () => {
			it('should return only enabled breakpoints', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);
				debugStore.toggleBreakpointEnabled(2); // Disable line 2

				const workerBreakpoints = debugStore.getBreakpointsForWorker();

				expect(workerBreakpoints).toHaveLength(1);
				expect(workerBreakpoints[0].lineNumber).toBe(1);
			});

			it('should return breakpoints without IDs', () => {
				debugStore.addBreakpoint(5, 'x > 10');

				const workerBreakpoints = debugStore.getBreakpointsForWorker();

				expect(workerBreakpoints[0]).not.toHaveProperty('id');
				expect(workerBreakpoints[0]).toEqual({
					lineNumber: 5,
					enabled: true,
					condition: 'x > 10'
				});
			});

			it('should return empty array if no enabled breakpoints', () => {
				debugStore.addBreakpoint(1);
				debugStore.toggleBreakpointEnabled(1);

				const workerBreakpoints = debugStore.getBreakpointsForWorker();

				expect(workerBreakpoints).toHaveLength(0);
			});
		});

		describe('enabledBreakpointCount', () => {
			it('should count only enabled breakpoints', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);
				debugStore.addBreakpoint(3);
				debugStore.toggleBreakpointEnabled(2); // Disable line 2

				expect(debugStore.enabledBreakpointCount).toBe(2);
			});

			it('should be zero when all breakpoints are disabled', () => {
				debugStore.addBreakpoint(1);
				debugStore.addBreakpoint(2);
				debugStore.toggleBreakpointEnabled(1);
				debugStore.toggleBreakpointEnabled(2);

				expect(debugStore.enabledBreakpointCount).toBe(0);
			});
		});
	});

	// ===========================================================================
	// 4. Snapshot History Tests (Circular Buffer)
	// ===========================================================================

	describe('Snapshot History', () => {
		// Helper to create a snapshot
		const createSnapshot = (lineNumber: number, id?: string): DebugSnapshot => ({
			id: id ?? `snapshot-${lineNumber}`,
			lineNumber,
			timestamp: Date.now(),
			callStack: [],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line',
			heap: []
		});

		describe('pushSnapshot', () => {
			it('should add snapshot to history', () => {
				const snapshot = createSnapshot(1);

				debugStore.pushSnapshot(snapshot);

				expect(debugStore.snapshotCount).toBe(1);
				expect(debugStore.currentSnapshot).toEqual(snapshot);
			});

			it('should add snapshot at the front (most recent first)', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});

			it('should reset historyIndex to 0 when pushing', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.stepBack(); // Move to index 1

				debugStore.pushSnapshot(createSnapshot(3));

				expect(debugStore.currentSnapshot?.lineNumber).toBe(3);
			});

			it('should update currentLine from snapshot', () => {
				debugStore.pushSnapshot(createSnapshot(5));

				expect(debugStore.currentLine).toBe(5);
			});

			it('should keep the full trace without dropping the oldest step', () => {
				// Push well beyond the old 10-item cap; nothing should be dropped.
				for (let i = 1; i <= 50; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				expect(debugStore.snapshotCount).toBe(50);
				expect(debugStore.traceTruncated).toBe(false);

				// Oldest step (line 1) is still reachable.
				debugStore.goToStep(0);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(1);
			});

			it('should stop at STEP_BUDGET and flag the trace as truncated', () => {
				for (let i = 1; i <= DEBUG_CONFIG.STEP_BUDGET + 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				expect(debugStore.snapshotCount).toBe(DEBUG_CONFIG.STEP_BUDGET);
				expect(debugStore.traceTruncated).toBe(true);
				expect(debugStore.isTraceFull).toBe(true);
			});

			it('should preserve the earliest steps when truncating (drop the overflow, not the head)', () => {
				for (let i = 1; i <= DEBUG_CONFIG.STEP_BUDGET + 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				// First recorded step (line 1) is retained; the overflow is dropped.
				debugStore.goToStep(0);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(1);
			});
		});

		describe('stepBack', () => {
			it('should move back one step in history', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.pushSnapshot(createSnapshot(3));

				debugStore.stepBack();

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});

			it('should update currentLine when stepping back', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				debugStore.stepBack();

				expect(debugStore.currentLine).toBe(1);
			});

			it('should do nothing if already at oldest snapshot', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				debugStore.stepBack(); // Move to snapshot 1
				debugStore.stepBack(); // Already at oldest, should do nothing

				expect(debugStore.currentSnapshot?.lineNumber).toBe(1);
			});

			it('should update canStepBack derived state', () => {
				debugStore.pushSnapshot(createSnapshot(1));

				expect(debugStore.canStepBack).toBe(false);

				debugStore.pushSnapshot(createSnapshot(2));

				expect(debugStore.canStepBack).toBe(true);
			});

			it('should allow stepping back through multiple snapshots', () => {
				for (let i = 1; i <= 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				debugStore.stepBack();
				expect(debugStore.currentSnapshot?.lineNumber).toBe(4);

				debugStore.stepBack();
				expect(debugStore.currentSnapshot?.lineNumber).toBe(3);

				debugStore.stepBack();
				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});
		});

		describe('stepForward', () => {
			it('should move forward one step in history', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.stepBack();

				debugStore.stepForward();

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});

			it('should update currentLine when stepping forward', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.stepBack();

				debugStore.stepForward();

				expect(debugStore.currentLine).toBe(2);
			});

			it('should do nothing if already at most recent snapshot', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				debugStore.stepForward(); // Already at most recent

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});

			it('should update canStepForward derived state', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				expect(debugStore.canStepForward).toBe(false);

				debugStore.stepBack();

				expect(debugStore.canStepForward).toBe(true);
			});

			it('should allow stepping forward through multiple snapshots', () => {
				for (let i = 1; i <= 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				debugStore.stepBack();
				debugStore.stepBack();
				debugStore.stepBack();

				debugStore.stepForward();
				expect(debugStore.currentSnapshot?.lineNumber).toBe(3);

				debugStore.stepForward();
				expect(debugStore.currentSnapshot?.lineNumber).toBe(4);
			});
		});

		describe('canStepBack and canStepForward', () => {
			it('should both be false when no snapshots', () => {
				expect(debugStore.canStepBack).toBe(false);
				expect(debugStore.canStepForward).toBe(false);
			});

			it('should both be false with single snapshot', () => {
				debugStore.pushSnapshot(createSnapshot(1));

				expect(debugStore.canStepBack).toBe(false);
				expect(debugStore.canStepForward).toBe(false);
			});

			it('should have correct values when in middle of history', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.pushSnapshot(createSnapshot(3));

				debugStore.stepBack(); // At snapshot 2

				expect(debugStore.canStepBack).toBe(true);
				expect(debugStore.canStepForward).toBe(true);
			});
		});

		describe('goToSnapshot', () => {
			it('should jump to specific snapshot index', () => {
				for (let i = 1; i <= 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				debugStore.goToSnapshot(3);

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2); // Index 3 is line 2
			});

			it('should update currentLine when jumping', () => {
				for (let i = 1; i <= 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				debugStore.goToSnapshot(2);

				expect(debugStore.currentLine).toBe(3); // Index 2 is line 3
			});

			it('should do nothing if index is negative', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				debugStore.goToSnapshot(-1);

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2); // Still at index 0
			});

			it('should do nothing if index is out of bounds', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				debugStore.goToSnapshot(10);

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2); // Still at index 0
			});
		});

		describe('clearSnapshots', () => {
			it('should remove all snapshots', () => {
				for (let i = 1; i <= 5; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}

				debugStore.clearSnapshots();

				expect(debugStore.snapshotCount).toBe(0);
			});

			it('should reset historyIndex to 0', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.stepBack();

				debugStore.clearSnapshots();

				expect(debugStore.currentSnapshot).toBe(null);
			});

			it('should reset canStepBack and canStepForward', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.stepBack();

				debugStore.clearSnapshots();

				expect(debugStore.canStepBack).toBe(false);
				expect(debugStore.canStepForward).toBe(false);
			});
		});

		describe('currentSnapshot', () => {
			it('should return null when no snapshots', () => {
				expect(debugStore.currentSnapshot).toBe(null);
			});

			it('should return most recent snapshot by default', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));

				expect(debugStore.currentSnapshot?.lineNumber).toBe(2);
			});

			it('should return correct snapshot at current index', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot(createSnapshot(2));
				debugStore.pushSnapshot(createSnapshot(3));

				debugStore.stepBack();
				debugStore.stepBack();

				expect(debugStore.currentSnapshot?.lineNumber).toBe(1);
			});
		});

		describe('Trace scrubbing (chronological)', () => {
			it('stepIndex should be 0 for the first step and grow with the trace', () => {
				debugStore.pushSnapshot(createSnapshot(10));
				expect(debugStore.stepIndex).toBe(0);

				debugStore.pushSnapshot(createSnapshot(20));
				debugStore.pushSnapshot(createSnapshot(30));

				// Newest step is the last chronological index.
				expect(debugStore.stepIndex).toBe(2);
				expect(debugStore.stepCount).toBe(3);
			});

			it('goToStep should jump to a chronological index (0 = first step)', () => {
				for (let i = 1; i <= 5; i++) debugStore.pushSnapshot(createSnapshot(i * 10));

				debugStore.goToStep(0);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(10);
				expect(debugStore.stepIndex).toBe(0);

				debugStore.goToStep(4);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(50);
				expect(debugStore.stepIndex).toBe(4);
			});

			it('goToStep should ignore out-of-range indices', () => {
				debugStore.pushSnapshot(createSnapshot(10));
				debugStore.pushSnapshot(createSnapshot(20));

				debugStore.goToStep(-1);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(20);

				debugStore.goToStep(99);
				expect(debugStore.currentSnapshot?.lineNumber).toBe(20);
			});

			it('stepBack/stepForward should move along the chronological stepIndex', () => {
				for (let i = 1; i <= 3; i++) debugStore.pushSnapshot(createSnapshot(i));

				expect(debugStore.stepIndex).toBe(2);
				debugStore.stepBack();
				expect(debugStore.stepIndex).toBe(1);
				debugStore.stepForward();
				expect(debugStore.stepIndex).toBe(2);
			});

			it('eventMarkers derives call/return from call-stack depth', () => {
				const withDepth = (line: number, depth: number): DebugSnapshot => ({
					...createSnapshot(line),
					callStack: Array.from({ length: depth }, (_unused, i) => ({
						functionName: i === 0 ? '<module>' : 'f',
						filename: '<exec>',
						lineNumber: line,
						locals: [],
						isCurrentFrame: i === depth - 1
					}))
				});
				// depths 1,1,2,2,1 → call at index 2 (1→2), return at index 4 (2→1)
				debugStore.pushSnapshot(withDepth(1, 1));
				debugStore.pushSnapshot(withDepth(2, 1));
				debugStore.pushSnapshot(withDepth(3, 2));
				debugStore.pushSnapshot(withDepth(4, 2));
				debugStore.pushSnapshot(withDepth(5, 1));

				expect(debugStore.eventMarkers).toEqual([
					{ index: 2, event: 'call' },
					{ index: 4, event: 'return' }
				]);
			});

			it('eventMarkers surfaces exception steps', () => {
				debugStore.pushSnapshot(createSnapshot(1));
				debugStore.pushSnapshot({ ...createSnapshot(2), event: 'exception' });

				expect(debugStore.eventMarkers).toContainEqual({ index: 1, event: 'exception' });
			});

			it('traceTruncated should reset on a new session', () => {
				for (let i = 1; i <= DEBUG_CONFIG.STEP_BUDGET + 2; i++) {
					debugStore.pushSnapshot(createSnapshot(i));
				}
				expect(debugStore.traceTruncated).toBe(true);

				debugStore.startSession();

				expect(debugStore.traceTruncated).toBe(false);
				expect(debugStore.isTraceFull).toBe(false);
				expect(debugStore.stepCount).toBe(0);
			});

			it('isRecording should reset on start/reset session', () => {
				debugStore.isRecording = true;
				debugStore.startSession();
				expect(debugStore.isRecording).toBe(false);

				debugStore.isRecording = true;
				debugStore.resetSession();
				expect(debugStore.isRecording).toBe(false);
			});
		});

		describe('Breakpoint navigation in trace', () => {
			// createSnapshot(i) → lineNumber i; chronological trace lines [1..6] at index [0..5].
			const seedSixSteps = () => {
				for (let i = 1; i <= 6; i++) debugStore.pushSnapshot(createSnapshot(i));
			};

			it('goToNextBreakpointStep jumps to the next step on a breakpoint line', () => {
				seedSixSteps();
				debugStore.addBreakpoint(4); // line 4 → chronological index 3
				debugStore.goToStep(0);

				debugStore.goToNextBreakpointStep();

				expect(debugStore.currentSnapshot?.lineNumber).toBe(4);
				expect(debugStore.stepIndex).toBe(3);
			});

			it('goToPrevBreakpointStep jumps to the previous breakpoint step', () => {
				seedSixSteps();
				debugStore.addBreakpoint(2); // line 2 → chronological index 1
				debugStore.goToStep(5);

				debugStore.goToPrevBreakpointStep();

				expect(debugStore.stepIndex).toBe(1);
			});

			it('breakpoint navigation is a no-op without a matching breakpoint', () => {
				for (let i = 1; i <= 3; i++) debugStore.pushSnapshot(createSnapshot(i));
				debugStore.goToStep(1);

				debugStore.goToNextBreakpointStep();
				expect(debugStore.stepIndex).toBe(1);

				debugStore.addBreakpoint(99); // no step is on line 99
				debugStore.goToNextBreakpointStep();
				expect(debugStore.stepIndex).toBe(1);
			});

			it('disabled breakpoints are ignored', () => {
				seedSixSteps();
				debugStore.addBreakpoint(4);
				debugStore.toggleBreakpointEnabled(4);
				debugStore.goToStep(0);

				debugStore.goToNextBreakpointStep();

				expect(debugStore.stepIndex).toBe(0);
			});

			it('hasBreakpointInTrace reflects whether a breakpoint matches a step', () => {
				for (let i = 1; i <= 3; i++) debugStore.pushSnapshot(createSnapshot(i));
				expect(debugStore.hasBreakpointInTrace).toBe(false);

				debugStore.addBreakpoint(2);
				expect(debugStore.hasBreakpointInTrace).toBe(true);
			});
		});

		describe('Step over (skip function internals)', () => {
			const withDepth = (line: number, depth: number): DebugSnapshot => ({
				...createSnapshot(line),
				callStack: Array.from({ length: depth }, (_unused, i) => ({
					functionName: i === 0 ? '<module>' : 'f',
					filename: '<exec>',
					lineNumber: line,
					locals: [],
					isCurrentFrame: i === depth - 1
				}))
			});

			it('skips deeper frames and lands on the next same-depth step', () => {
				// depths 1,1,2,2,1,1 (function entered at index 2, returns at index 4)
				[1, 1, 2, 2, 1, 1].forEach((depth, i) => debugStore.pushSnapshot(withDepth(i + 1, depth)));
				debugStore.goToStep(1); // depth 1, the "call" line

				debugStore.goToStepOver();

				// indices 2,3 (depth 2) are skipped → land on index 4 (depth 1)
				expect(debugStore.stepIndex).toBe(4);
			});

			it('behaves like a normal next step on a non-call line', () => {
				[1, 1, 1].forEach((depth, i) => debugStore.pushSnapshot(withDepth(i + 1, depth)));
				debugStore.goToStep(0);

				debugStore.goToStepOver();

				expect(debugStore.stepIndex).toBe(1);
			});

			it('falls back to the last step when nothing shallower lies ahead', () => {
				[1, 2, 3].forEach((depth, i) => debugStore.pushSnapshot(withDepth(i + 1, depth)));
				debugStore.goToStep(0); // depth 1

				debugStore.goToStepOver();

				expect(debugStore.stepIndex).toBe(2);
			});
		});
	});

	// ===========================================================================
	// 5. Session State Management Tests
	// ===========================================================================

	describe('Session State Management', () => {
		describe('startSession', () => {
			it('should set sessionState to running', () => {
				debugStore.startSession();

				expect(debugStore.sessionState).toBe('running');
			});

			it('should clear snapshots', () => {
				debugStore.pushSnapshot({
					id: 'snapshot-1',
					lineNumber: 1,
					timestamp: Date.now(),
					callStack: [],
					globals: [],
					loops: [],
					stdout: '',
					event: 'line',
					heap: []
				});

				debugStore.startSession();

				expect(debugStore.snapshotCount).toBe(0);
			});

			it('should clear pauseReason', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.startSession();

				expect(debugStore.pauseReason).toBe(null);
			});

			it('should clear currentLine', () => {
				debugStore.currentLine = 5;

				debugStore.startSession();

				expect(debugStore.currentLine).toBe(null);
			});

			it('should set isRunning to true', () => {
				debugStore.startSession();

				expect(debugStore.isRunning).toBe(true);
			});
		});

		describe('pauseSession', () => {
			it('should set sessionState to paused', () => {
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.sessionState).toBe('paused');
			});

			it('should set pauseReason', () => {
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.pauseReason).toBe('breakpoint');
			});

			it('should set currentLine', () => {
				debugStore.pauseSession('step', 10);

				expect(debugStore.currentLine).toBe(10);
			});

			it('should set isPaused to true', () => {
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.isPaused).toBe(true);
			});

			it('should handle different pause reasons', () => {
				debugStore.pauseSession('exception', 7);

				expect(debugStore.pauseReason).toBe('exception');
				expect(debugStore.currentLine).toBe(7);
			});
		});

		describe('resumeSession', () => {
			it('should set sessionState to running by default', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.resumeSession();

				expect(debugStore.sessionState).toBe('running');
			});

			it('should set sessionState to stepping when stepping is true', () => {
				debugStore.pauseSession('step', 5);

				debugStore.resumeSession(true);

				expect(debugStore.sessionState).toBe('stepping');
			});

			it('should clear pauseReason', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.resumeSession();

				expect(debugStore.pauseReason).toBe(null);
			});

			it('should set isPaused to false', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.resumeSession();

				expect(debugStore.isPaused).toBe(false);
			});

			it('should set isRunning to true', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.resumeSession();

				expect(debugStore.isRunning).toBe(true);
			});
		});

		describe('finishSession', () => {
			it('should set sessionState to finished', () => {
				debugStore.startSession();

				debugStore.finishSession();

				expect(debugStore.sessionState).toBe('finished');
			});

			it('should clear pauseReason', () => {
				debugStore.pauseSession('breakpoint', 5);

				debugStore.finishSession();

				expect(debugStore.pauseReason).toBe(null);
			});

			it('should set isRunning to false', () => {
				debugStore.startSession();

				debugStore.finishSession();

				expect(debugStore.isRunning).toBe(false);
			});
		});

		describe('resetSession', () => {
			it('should set sessionState to idle', () => {
				debugStore.startSession();

				debugStore.resetSession();

				expect(debugStore.sessionState).toBe('idle');
			});

			it('should clear all snapshots', () => {
				debugStore.pushSnapshot({
					id: 'snapshot-1',
					lineNumber: 1,
					timestamp: Date.now(),
					callStack: [],
					globals: [],
					loops: [],
					stdout: '',
					event: 'line',
					heap: []
				});

				debugStore.resetSession();

				expect(debugStore.snapshotCount).toBe(0);
			});

			it('should clear currentLine', () => {
				debugStore.currentLine = 5;

				debugStore.resetSession();

				expect(debugStore.currentLine).toBe(null);
			});

			it('should clear pauseReason', () => {
				debugStore.pauseReason = 'breakpoint';

				debugStore.resetSession();

				expect(debugStore.pauseReason).toBe(null);
			});

			it('should reset all derived states', () => {
				debugStore.startSession();
				debugStore.pauseSession('breakpoint', 5);

				debugStore.resetSession();

				expect(debugStore.isPaused).toBe(false);
				expect(debugStore.isRunning).toBe(false);
			});
		});
	});

	// ===========================================================================
	// 6. Derived State Tests
	// ===========================================================================

	describe('Derived States', () => {
		describe('isDebugging', () => {
			it('should be false when mode is execute', () => {
				debugStore.setMode('execute');

				expect(debugStore.isDebugging).toBe(false);
			});

			it('should be true when mode is debug', () => {
				debugStore.setMode('debug');

				expect(debugStore.isDebugging).toBe(true);
			});
		});

		describe('isPaused', () => {
			it('should be false when sessionState is not paused', () => {
				debugStore.sessionState = 'running';

				expect(debugStore.isPaused).toBe(false);
			});

			it('should be true when sessionState is paused', () => {
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.isPaused).toBe(true);
			});
		});

		describe('isRunning', () => {
			it('should be true when sessionState is running', () => {
				debugStore.startSession();

				expect(debugStore.isRunning).toBe(true);
			});

			it('should be true when sessionState is stepping', () => {
				debugStore.sessionState = 'stepping';

				expect(debugStore.isRunning).toBe(true);
			});

			it('should be false when sessionState is idle', () => {
				debugStore.sessionState = 'idle';

				expect(debugStore.isRunning).toBe(false);
			});

			it('should be false when sessionState is paused', () => {
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.isRunning).toBe(false);
			});

			it('should be false when sessionState is finished', () => {
				debugStore.finishSession();

				expect(debugStore.isRunning).toBe(false);
			});
		});
	});

	// ===========================================================================
	// 7. Utility Methods Tests
	// ===========================================================================

	describe('Utility Methods', () => {
		describe('canStartDebugging', () => {
			it('should return true when mode is debug and sessionState is idle', () => {
				debugStore.setMode('debug');
				debugStore.resetSession();

				expect(debugStore.canStartDebugging()).toBe(true);
			});

			it('should return false when mode is execute', () => {
				debugStore.setMode('execute');
				debugStore.resetSession();

				expect(debugStore.canStartDebugging()).toBe(false);
			});

			it('should return false when sessionState is not idle', () => {
				debugStore.setMode('debug');
				debugStore.startSession();

				expect(debugStore.canStartDebugging()).toBe(false);
			});
		});

		describe('canStep', () => {
			it('should return true when mode is debug and sessionState is paused', () => {
				debugStore.setMode('debug');
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.canStep()).toBe(true);
			});

			it('should return false when mode is execute', () => {
				debugStore.setMode('execute');
				debugStore.pauseSession('breakpoint', 5);

				expect(debugStore.canStep()).toBe(false);
			});

			it('should return false when sessionState is not paused', () => {
				debugStore.setMode('debug');
				debugStore.startSession();

				expect(debugStore.canStep()).toBe(false);
			});
		});
	});

	// ===========================================================================
	// 8. Integration Tests (Complex Scenarios)
	// ===========================================================================

	describe('Integration Scenarios', () => {
		it('should handle complete debug session lifecycle', () => {
			// Setup debug mode with breakpoints
			debugStore.setMode('debug');
			debugStore.addBreakpoint(5);
			debugStore.addBreakpoint(10);

			// Start session
			debugStore.startSession();
			expect(debugStore.sessionState).toBe('running');

			// Hit breakpoint
			debugStore.pauseSession('breakpoint', 5);
			expect(debugStore.isPaused).toBe(true);
			expect(debugStore.currentLine).toBe(5);

			// Add snapshot
			debugStore.pushSnapshot({
				id: 'snapshot-1',
				lineNumber: 5,
				timestamp: Date.now(),
				callStack: [],
				globals: [],
				loops: [],
				stdout: '',
				event: 'line',
				heap: []
			});

			// Resume execution
			debugStore.resumeSession();
			expect(debugStore.isRunning).toBe(true);

			// Finish execution
			debugStore.finishSession();
			expect(debugStore.sessionState).toBe('finished');

			// Reset for next run
			debugStore.resetSession();
			expect(debugStore.sessionState).toBe('idle');
			expect(debugStore.snapshotCount).toBe(0);
		});

		it('should handle step-back navigation during debugging', () => {
			debugStore.setMode('debug');
			debugStore.startSession();

			// Execute through multiple lines
			for (let i = 1; i <= 5; i++) {
				debugStore.pushSnapshot({
					id: `snapshot-${i}`,
					lineNumber: i,
					timestamp: Date.now(),
					callStack: [],
					globals: [],
					loops: [],
					stdout: '',
					event: 'line',
					heap: []
				});
			}

			// Navigate back through history
			expect(debugStore.currentLine).toBe(5);

			debugStore.stepBack();
			expect(debugStore.currentLine).toBe(4);

			debugStore.stepBack();
			expect(debugStore.currentLine).toBe(3);

			// Navigate forward
			debugStore.stepForward();
			expect(debugStore.currentLine).toBe(4);

			// Jump to specific point
			debugStore.goToSnapshot(4);
			expect(debugStore.currentLine).toBe(1);
		});

		it('should handle conditional breakpoints workflow', () => {
			debugStore.setMode('debug');

			// Add breakpoint with condition
			debugStore.addBreakpoint(10, 'x > 5');
			expect(debugStore.getBreakpointAt(10)?.condition).toBe('x > 5');

			// Update condition
			debugStore.updateBreakpointCondition(10, 'x > 10 and y < 20');
			expect(debugStore.getBreakpointAt(10)?.condition).toBe('x > 10 and y < 20');

			// Disable breakpoint temporarily
			debugStore.toggleBreakpointEnabled(10);
			expect(debugStore.enabledBreakpointCount).toBe(0);

			// Worker should not receive disabled breakpoint
			const workerBreakpoints = debugStore.getBreakpointsForWorker();
			expect(workerBreakpoints).toHaveLength(0);

			// Re-enable
			debugStore.toggleBreakpointEnabled(10);
			expect(debugStore.enabledBreakpointCount).toBe(1);

			// Clear condition
			debugStore.updateBreakpointCondition(10, undefined);
			expect(debugStore.getBreakpointAt(10)?.condition).toBeUndefined();
		});

		it('should record a full trace and stop at the step budget', () => {
			debugStore.setMode('debug');
			debugStore.startSession();

			// Record a long trace, past the budget.
			for (let i = 1; i <= DEBUG_CONFIG.STEP_BUDGET + 10; i++) {
				debugStore.pushSnapshot({
					id: `snapshot-${i}`,
					lineNumber: i,
					timestamp: Date.now(),
					callStack: [],
					globals: [],
					loops: [],
					stdout: '',
					event: 'line',
					heap: []
				});
			}

			expect(debugStore.snapshotCount).toBe(DEBUG_CONFIG.STEP_BUDGET);
			expect(debugStore.traceTruncated).toBe(true);

			// The scrubber can reach both ends of the recorded range.
			debugStore.goToStep(0);
			expect(debugStore.currentSnapshot?.lineNumber).toBe(1);

			debugStore.goToStep(DEBUG_CONFIG.STEP_BUDGET - 1);
			expect(debugStore.currentSnapshot?.lineNumber).toBe(DEBUG_CONFIG.STEP_BUDGET);
		});
	});
});
