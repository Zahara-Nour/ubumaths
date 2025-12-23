/**
 * Tests for Debug Message Zod Schemas
 *
 * Validates the Zod schemas for debug-related messages
 * sent to/from the Python worker.
 */

import { describe, it, expect } from 'vitest';
import {
	// Debug schemas
	debugStepActionSchema,
	debugTraceEventSchema,
	debugPauseReasonSchema,
	workerBreakpointSchema,
	debugVariableSchema,
	debugStackFrameSchema,
	debugLoopInfoSchema,
	debugSnapshotSchema,
	// Message schemas
	debugStartMessageSchema,
	debugStepMessageSchema,
	debugStopMessageSchema,
	debugSnapshotMessageSchema,
	debugPausedMessageSchema,
	debugFinishedMessageSchema,
	// Union schemas
	toWorkerMessageSchema,
	fromWorkerMessageSchema
} from './messages';

// =============================================================================
// Debug Step Action Schema
// =============================================================================

describe('debugStepActionSchema', () => {
	it('accepts valid step actions', () => {
		const actions = ['step', 'step-over', 'step-out', 'continue', 'run-to-end'];
		for (const action of actions) {
			const result = debugStepActionSchema.safeParse(action);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid actions', () => {
		const result = debugStepActionSchema.safeParse('invalid-action');
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Trace Event Schema
// =============================================================================

describe('debugTraceEventSchema', () => {
	it('accepts valid trace events', () => {
		const events = ['line', 'call', 'return', 'exception'];
		for (const event of events) {
			const result = debugTraceEventSchema.safeParse(event);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid events', () => {
		const result = debugTraceEventSchema.safeParse('invalid');
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Pause Reason Schema
// =============================================================================

describe('debugPauseReasonSchema', () => {
	it('accepts valid pause reasons', () => {
		const reasons = ['breakpoint', 'step', 'exception', 'start'];
		for (const reason of reasons) {
			const result = debugPauseReasonSchema.safeParse(reason);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid reasons', () => {
		const result = debugPauseReasonSchema.safeParse('invalid');
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Worker Breakpoint Schema
// =============================================================================

describe('workerBreakpointSchema', () => {
	it('accepts valid breakpoint without condition', () => {
		const bp = { lineNumber: 10, enabled: true };
		const result = workerBreakpointSchema.safeParse(bp);
		expect(result.success).toBe(true);
	});

	it('accepts valid breakpoint with condition', () => {
		const bp = { lineNumber: 10, enabled: true, condition: 'x > 5' };
		const result = workerBreakpointSchema.safeParse(bp);
		expect(result.success).toBe(true);
	});

	it('rejects line number less than 1', () => {
		const bp = { lineNumber: 0, enabled: true };
		const result = workerBreakpointSchema.safeParse(bp);
		expect(result.success).toBe(false);
	});

	it('rejects condition longer than 500 chars', () => {
		const bp = { lineNumber: 10, enabled: true, condition: 'x'.repeat(501) };
		const result = workerBreakpointSchema.safeParse(bp);
		expect(result.success).toBe(false);
	});

	it('rejects missing enabled field', () => {
		const bp = { lineNumber: 10 };
		const result = workerBreakpointSchema.safeParse(bp);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Variable Schema
// =============================================================================

describe('debugVariableSchema', () => {
	it('accepts valid primitive variable', () => {
		const variable = {
			name: 'x',
			value: '42',
			type: 'int',
			isBuiltin: true,
			isChanged: false
		};
		const result = debugVariableSchema.safeParse(variable);
		expect(result.success).toBe(true);
	});

	it('accepts variable with optional fields', () => {
		const variable = {
			name: 'my_list',
			value: '[1, 2, 3]',
			type: 'list',
			isBuiltin: true,
			isChanged: true,
			isNew: true,
			objectId: 'obj-123'
		};
		const result = debugVariableSchema.safeParse(variable);
		expect(result.success).toBe(true);
	});

	it('rejects empty name', () => {
		const variable = {
			name: '',
			value: '42',
			type: 'int',
			isBuiltin: true,
			isChanged: false
		};
		const result = debugVariableSchema.safeParse(variable);
		expect(result.success).toBe(false);
	});

	it('rejects name longer than 200 chars', () => {
		const variable = {
			name: 'x'.repeat(201),
			value: '42',
			type: 'int',
			isBuiltin: true,
			isChanged: false
		};
		const result = debugVariableSchema.safeParse(variable);
		expect(result.success).toBe(false);
	});

	it('rejects value longer than 10000 chars', () => {
		const variable = {
			name: 'x',
			value: 'x'.repeat(10001),
			type: 'str',
			isBuiltin: true,
			isChanged: false
		};
		const result = debugVariableSchema.safeParse(variable);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Stack Frame Schema
// =============================================================================

describe('debugStackFrameSchema', () => {
	it('accepts valid stack frame', () => {
		const frame = {
			functionName: '<module>',
			filename: '<exec>',
			lineNumber: 5,
			locals: [],
			isCurrentFrame: true
		};
		const result = debugStackFrameSchema.safeParse(frame);
		expect(result.success).toBe(true);
	});

	it('accepts stack frame with locals', () => {
		const frame = {
			functionName: 'calculate',
			filename: '<exec>',
			lineNumber: 15,
			locals: [
				{ name: 'a', value: '5', type: 'int', isBuiltin: true, isChanged: false },
				{ name: 'b', value: '3', type: 'int', isBuiltin: true, isChanged: true }
			],
			isCurrentFrame: false
		};
		const result = debugStackFrameSchema.safeParse(frame);
		expect(result.success).toBe(true);
	});

	it('rejects empty function name', () => {
		const frame = {
			functionName: '',
			filename: '<exec>',
			lineNumber: 5,
			locals: [],
			isCurrentFrame: true
		};
		const result = debugStackFrameSchema.safeParse(frame);
		expect(result.success).toBe(false);
	});

	it('rejects too many locals (more than 500)', () => {
		const frame = {
			functionName: '<module>',
			filename: '<exec>',
			lineNumber: 5,
			locals: Array(501).fill({
				name: 'x',
				value: '1',
				type: 'int',
				isBuiltin: true,
				isChanged: false
			}),
			isCurrentFrame: true
		};
		const result = debugStackFrameSchema.safeParse(frame);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Loop Info Schema
// =============================================================================

describe('debugLoopInfoSchema', () => {
	it('accepts valid for loop', () => {
		const loop = {
			loopId: 'loop-1',
			iterationCount: 3,
			maxIterations: 10,
			loopType: 'for',
			lineNumber: 7
		};
		const result = debugLoopInfoSchema.safeParse(loop);
		expect(result.success).toBe(true);
	});

	it('accepts while loop without maxIterations', () => {
		const loop = {
			loopId: 'loop-2',
			iterationCount: 5,
			loopType: 'while',
			lineNumber: 15
		};
		const result = debugLoopInfoSchema.safeParse(loop);
		expect(result.success).toBe(true);
	});

	it('rejects invalid loop type', () => {
		const loop = {
			loopId: 'loop-1',
			iterationCount: 3,
			loopType: 'do-while',
			lineNumber: 7
		};
		const result = debugLoopInfoSchema.safeParse(loop);
		expect(result.success).toBe(false);
	});

	it('rejects iteration count less than 1', () => {
		const loop = {
			loopId: 'loop-1',
			iterationCount: 0,
			loopType: 'for',
			lineNumber: 7
		};
		const result = debugLoopInfoSchema.safeParse(loop);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Snapshot Schema
// =============================================================================

describe('debugSnapshotSchema', () => {
	it('accepts valid snapshot', () => {
		const snapshot = {
			id: 'snap-001',
			lineNumber: 10,
			timestamp: 1234567890,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 10,
					locals: [{ name: 'x', value: '42', type: 'int', isBuiltin: true, isChanged: false }],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line'
		};
		const result = debugSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(true);
	});

	it('accepts snapshot with all fields populated', () => {
		const snapshot = {
			id: 'snap-002',
			lineNumber: 15,
			timestamp: 1234567900,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 5,
					locals: [],
					isCurrentFrame: false
				},
				{
					functionName: 'my_func',
					filename: '<exec>',
					lineNumber: 15,
					locals: [{ name: 'n', value: '5', type: 'int', isBuiltin: true, isChanged: true }],
					isCurrentFrame: true
				}
			],
			globals: [{ name: 'PI', value: '3.14', type: 'float', isBuiltin: true, isChanged: false }],
			loops: [
				{
					loopId: 'loop-1',
					iterationCount: 3,
					maxIterations: 10,
					loopType: 'for',
					lineNumber: 12
				}
			],
			stdout: 'Hello\nWorld\n',
			event: 'line'
		};
		const result = debugSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(true);
	});

	it('rejects snapshot with empty call stack', () => {
		const snapshot = {
			id: 'snap-001',
			lineNumber: 10,
			timestamp: 1234567890,
			callStack: [],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line'
		};
		const result = debugSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(false);
	});

	it('rejects snapshot with invalid event', () => {
		const snapshot = {
			id: 'snap-001',
			lineNumber: 10,
			timestamp: 1234567890,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 10,
					locals: [],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [],
			stdout: '',
			event: 'invalid'
		};
		const result = debugSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(false);
	});

	it('rejects snapshot with negative timestamp', () => {
		const snapshot = {
			id: 'snap-001',
			lineNumber: 10,
			timestamp: -1,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 10,
					locals: [],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line'
		};
		const result = debugSnapshotSchema.safeParse(snapshot);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Start Message Schema
// =============================================================================

describe('debugStartMessageSchema', () => {
	it('accepts valid debug start message', () => {
		const msg = {
			type: 'debug-start',
			code: 'print("hello")',
			id: 'exec-123',
			breakpoints: [{ lineNumber: 5, enabled: true }]
		};
		const result = debugStartMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug start with empty breakpoints', () => {
		const msg = {
			type: 'debug-start',
			code: 'x = 1',
			id: 'exec-456',
			breakpoints: []
		};
		const result = debugStartMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug start with conditional breakpoint', () => {
		const msg = {
			type: 'debug-start',
			code: 'for i in range(10): print(i)',
			id: 'exec-789',
			breakpoints: [{ lineNumber: 1, enabled: true, condition: 'i > 5' }]
		};
		const result = debugStartMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('rejects too many breakpoints (more than 100)', () => {
		const msg = {
			type: 'debug-start',
			code: 'x = 1',
			id: 'exec-123',
			breakpoints: Array(101).fill({ lineNumber: 1, enabled: true })
		};
		const result = debugStartMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});

	it('rejects empty id', () => {
		const msg = {
			type: 'debug-start',
			code: 'x = 1',
			id: '',
			breakpoints: []
		};
		const result = debugStartMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Step Message Schema
// =============================================================================

describe('debugStepMessageSchema', () => {
	it('accepts valid step message', () => {
		const msg = {
			type: 'debug-step',
			id: 'exec-123',
			action: 'step'
		};
		const result = debugStepMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts all valid actions', () => {
		const actions = ['step', 'step-over', 'step-out', 'continue', 'run-to-end'];
		for (const action of actions) {
			const msg = { type: 'debug-step', id: 'exec-123', action };
			const result = debugStepMessageSchema.safeParse(msg);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid action', () => {
		const msg = {
			type: 'debug-step',
			id: 'exec-123',
			action: 'invalid'
		};
		const result = debugStepMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Stop Message Schema
// =============================================================================

describe('debugStopMessageSchema', () => {
	it('accepts valid stop message', () => {
		const msg = {
			type: 'debug-stop',
			id: 'exec-123'
		};
		const result = debugStopMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('rejects empty id', () => {
		const msg = {
			type: 'debug-stop',
			id: ''
		};
		const result = debugStopMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Snapshot Message Schema
// =============================================================================

describe('debugSnapshotMessageSchema', () => {
	it('accepts valid snapshot message', () => {
		const msg = {
			type: 'debug-snapshot',
			id: 'exec-123',
			snapshot: {
				id: 'snap-001',
				lineNumber: 10,
				timestamp: 1234567890,
				callStack: [
					{
						functionName: '<module>',
						filename: '<exec>',
						lineNumber: 10,
						locals: [],
						isCurrentFrame: true
					}
				],
				globals: [],
				loops: [],
				stdout: '',
				event: 'line'
			}
		};
		const result = debugSnapshotMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});
});

// =============================================================================
// Debug Paused Message Schema
// =============================================================================

describe('debugPausedMessageSchema', () => {
	it('accepts valid paused message', () => {
		const msg = {
			type: 'debug-paused',
			id: 'exec-123',
			reason: 'breakpoint'
		};
		const result = debugPausedMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts all valid reasons', () => {
		const reasons = ['breakpoint', 'step', 'exception', 'start'];
		for (const reason of reasons) {
			const msg = { type: 'debug-paused', id: 'exec-123', reason };
			const result = debugPausedMessageSchema.safeParse(msg);
			expect(result.success).toBe(true);
		}
	});

	it('rejects invalid reason', () => {
		const msg = {
			type: 'debug-paused',
			id: 'exec-123',
			reason: 'invalid'
		};
		const result = debugPausedMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Debug Finished Message Schema
// =============================================================================

describe('debugFinishedMessageSchema', () => {
	it('accepts valid finished message', () => {
		const msg = {
			type: 'debug-finished',
			id: 'exec-123',
			duration: 1500
		};
		const result = debugFinishedMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts zero duration', () => {
		const msg = {
			type: 'debug-finished',
			id: 'exec-123',
			duration: 0
		};
		const result = debugFinishedMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('rejects negative duration', () => {
		const msg = {
			type: 'debug-finished',
			id: 'exec-123',
			duration: -1
		};
		const result = debugFinishedMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});

	it('rejects duration exceeding max', () => {
		const msg = {
			type: 'debug-finished',
			id: 'exec-123',
			duration: 300001
		};
		const result = debugFinishedMessageSchema.safeParse(msg);
		expect(result.success).toBe(false);
	});
});

// =============================================================================
// Union Schema Integration
// =============================================================================

describe('toWorkerMessageSchema with debug messages', () => {
	it('accepts debug-start message', () => {
		const msg = {
			type: 'debug-start',
			code: 'print("test")',
			id: 'exec-123',
			breakpoints: []
		};
		const result = toWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug-step message', () => {
		const msg = {
			type: 'debug-step',
			id: 'exec-123',
			action: 'step'
		};
		const result = toWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug-stop message', () => {
		const msg = {
			type: 'debug-stop',
			id: 'exec-123'
		};
		const result = toWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});
});

describe('fromWorkerMessageSchema with debug messages', () => {
	it('accepts debug-snapshot message', () => {
		const msg = {
			type: 'debug-snapshot',
			id: 'exec-123',
			snapshot: {
				id: 'snap-001',
				lineNumber: 10,
				timestamp: 1234567890,
				callStack: [
					{
						functionName: '<module>',
						filename: '<exec>',
						lineNumber: 10,
						locals: [],
						isCurrentFrame: true
					}
				],
				globals: [],
				loops: [],
				stdout: '',
				event: 'line'
			}
		};
		const result = fromWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug-paused message', () => {
		const msg = {
			type: 'debug-paused',
			id: 'exec-123',
			reason: 'breakpoint'
		};
		const result = fromWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});

	it('accepts debug-finished message', () => {
		const msg = {
			type: 'debug-finished',
			id: 'exec-123',
			duration: 1500
		};
		const result = fromWorkerMessageSchema.safeParse(msg);
		expect(result.success).toBe(true);
	});
});
