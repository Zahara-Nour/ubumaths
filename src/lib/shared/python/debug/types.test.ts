/**
 * Tests for Python Debug Types
 *
 * Validates that type definitions work correctly and that
 * the DEBUG_CONFIG constants are properly defined.
 */

import { describe, it, expect } from 'vitest';
import {
	DEBUG_CONFIG,
	type DebugMode,
	type DebugSessionState,
	type DebugStepAction,
	type DebugVariable,
	type DebugStackFrame,
	type DebugLoopInfo,
	type DebugSnapshot,
	type Breakpoint,
	type WorkerBreakpoint,
	type DebugTraceEvent,
	type DebugPauseReason,
	type HeapObject,
	type DebugVisualization
} from './types';

describe('Debug Types', () => {
	describe('DebugMode', () => {
		it('accepts execute mode', () => {
			const mode: DebugMode = 'execute';
			expect(mode).toBe('execute');
		});

		it('accepts debug mode', () => {
			const mode: DebugMode = 'debug';
			expect(mode).toBe('debug');
		});
	});

	describe('DebugSessionState', () => {
		it('accepts all valid states', () => {
			const states: DebugSessionState[] = ['idle', 'running', 'paused', 'stepping', 'finished'];
			expect(states).toHaveLength(5);
		});
	});

	describe('DebugStepAction', () => {
		it('accepts all valid actions', () => {
			const actions: DebugStepAction[] = [
				'step',
				'step-over',
				'step-out',
				'continue',
				'run-to-end'
			];
			expect(actions).toHaveLength(5);
		});
	});

	describe('DebugTraceEvent', () => {
		it('accepts all valid trace events', () => {
			const events: DebugTraceEvent[] = ['line', 'call', 'return', 'exception'];
			expect(events).toHaveLength(4);
		});
	});

	describe('DebugPauseReason', () => {
		it('accepts all valid pause reasons', () => {
			const reasons: DebugPauseReason[] = ['breakpoint', 'step', 'exception', 'start'];
			expect(reasons).toHaveLength(4);
		});
	});
});

describe('DebugVariable', () => {
	it('creates a valid primitive variable', () => {
		const variable: DebugVariable = {
			name: 'x',
			value: '42',
			type: 'int',
			isBuiltin: true,
			isChanged: false
		};

		expect(variable.name).toBe('x');
		expect(variable.value).toBe('42');
		expect(variable.type).toBe('int');
		expect(variable.isBuiltin).toBe(true);
		expect(variable.isChanged).toBe(false);
	});

	it('creates a variable with change indicator', () => {
		const variable: DebugVariable = {
			name: 'counter',
			value: '10',
			type: 'int',
			isBuiltin: true,
			isChanged: true,
			isNew: false
		};

		expect(variable.isChanged).toBe(true);
		expect(variable.isNew).toBe(false);
	});

	it('creates a new variable', () => {
		const variable: DebugVariable = {
			name: 'result',
			value: '"hello"',
			type: 'str',
			isBuiltin: true,
			isChanged: false,
			isNew: true
		};

		expect(variable.isNew).toBe(true);
	});

	it('creates a variable with objectId for heap visualization', () => {
		const variable: DebugVariable = {
			name: 'my_list',
			value: '[1, 2, 3]',
			type: 'list',
			isBuiltin: true,
			isChanged: false,
			objectId: 'obj-123'
		};

		expect(variable.objectId).toBe('obj-123');
	});
});

describe('DebugStackFrame', () => {
	it('creates a module-level frame', () => {
		const frame: DebugStackFrame = {
			functionName: '<module>',
			filename: '<exec>',
			lineNumber: 5,
			locals: [],
			isCurrentFrame: true
		};

		expect(frame.functionName).toBe('<module>');
		expect(frame.isCurrentFrame).toBe(true);
		expect(frame.locals).toEqual([]);
	});

	it('creates a function frame with locals', () => {
		const frame: DebugStackFrame = {
			functionName: 'calculate_sum',
			filename: '<exec>',
			lineNumber: 12,
			locals: [
				{
					name: 'a',
					value: '5',
					type: 'int',
					isBuiltin: true,
					isChanged: false
				},
				{
					name: 'b',
					value: '3',
					type: 'int',
					isBuiltin: true,
					isChanged: false
				}
			],
			isCurrentFrame: false
		};

		expect(frame.functionName).toBe('calculate_sum');
		expect(frame.locals).toHaveLength(2);
		expect(frame.isCurrentFrame).toBe(false);
	});
});

describe('DebugLoopInfo', () => {
	it('creates a for loop with known iterations', () => {
		const loop: DebugLoopInfo = {
			loopId: 'loop-1',
			iterationCount: 3,
			maxIterations: 10,
			loopType: 'for',
			lineNumber: 7
		};

		expect(loop.loopType).toBe('for');
		expect(loop.iterationCount).toBe(3);
		expect(loop.maxIterations).toBe(10);
	});

	it('creates a while loop without max iterations', () => {
		const loop: DebugLoopInfo = {
			loopId: 'loop-2',
			iterationCount: 5,
			loopType: 'while',
			lineNumber: 15
		};

		expect(loop.loopType).toBe('while');
		expect(loop.maxIterations).toBeUndefined();
	});
});

describe('DebugSnapshot', () => {
	it('creates a complete snapshot', () => {
		const snapshot: DebugSnapshot = {
			id: 'snap-001',
			lineNumber: 10,
			timestamp: 1234567890,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 10,
					locals: [
						{
							name: 'x',
							value: '42',
							type: 'int',
							isBuiltin: true,
							isChanged: false
						}
					],
					isCurrentFrame: true
				}
			],
			globals: [
				{
					name: 'PI',
					value: '3.14159',
					type: 'float',
					isBuiltin: true,
					isChanged: false
				}
			],
			loops: [],
			stdout: 'Hello, World!\n',
			event: 'line'
		};

		expect(snapshot.id).toBe('snap-001');
		expect(snapshot.lineNumber).toBe(10);
		expect(snapshot.callStack).toHaveLength(1);
		expect(snapshot.globals).toHaveLength(1);
		expect(snapshot.event).toBe('line');
	});

	it('creates a snapshot with nested call stack', () => {
		const snapshot: DebugSnapshot = {
			id: 'snap-002',
			lineNumber: 25,
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
					functionName: 'outer',
					filename: '<exec>',
					lineNumber: 15,
					locals: [{ name: 'n', value: '5', type: 'int', isBuiltin: true, isChanged: false }],
					isCurrentFrame: false
				},
				{
					functionName: 'inner',
					filename: '<exec>',
					lineNumber: 25,
					locals: [{ name: 'x', value: '3', type: 'int', isBuiltin: true, isChanged: true }],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line'
		};

		expect(snapshot.callStack).toHaveLength(3);
		expect(snapshot.callStack[2].isCurrentFrame).toBe(true);
		expect(snapshot.callStack[2].locals[0].isChanged).toBe(true);
	});

	it('creates a snapshot with active loops', () => {
		const snapshot: DebugSnapshot = {
			id: 'snap-003',
			lineNumber: 8,
			timestamp: 1234567910,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 8,
					locals: [{ name: 'i', value: '2', type: 'int', isBuiltin: true, isChanged: true }],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [
				{
					loopId: 'loop-1',
					iterationCount: 3,
					maxIterations: 5,
					loopType: 'for',
					lineNumber: 7
				}
			],
			stdout: '0\n1\n2\n',
			event: 'line'
		};

		expect(snapshot.loops).toHaveLength(1);
		expect(snapshot.loops[0].iterationCount).toBe(3);
	});
});

describe('Breakpoint', () => {
	it('creates an enabled breakpoint', () => {
		const bp: Breakpoint = {
			id: 'bp-001',
			lineNumber: 10,
			enabled: true
		};

		expect(bp.id).toBe('bp-001');
		expect(bp.lineNumber).toBe(10);
		expect(bp.enabled).toBe(true);
		expect(bp.condition).toBeUndefined();
	});

	it('creates a conditional breakpoint', () => {
		const bp: Breakpoint = {
			id: 'bp-002',
			lineNumber: 15,
			enabled: true,
			condition: 'x > 10'
		};

		expect(bp.condition).toBe('x > 10');
	});

	it('creates a disabled breakpoint', () => {
		const bp: Breakpoint = {
			id: 'bp-003',
			lineNumber: 20,
			enabled: false
		};

		expect(bp.enabled).toBe(false);
	});
});

describe('WorkerBreakpoint', () => {
	it('creates a worker breakpoint without id', () => {
		const bp: WorkerBreakpoint = {
			lineNumber: 10,
			enabled: true
		};

		expect(bp.lineNumber).toBe(10);
		expect(bp.enabled).toBe(true);
	});
});

describe('HeapObject', () => {
	it('creates a primitive heap object', () => {
		const obj: HeapObject = {
			id: 'obj-1',
			type: 'int',
			value: '42'
		};

		expect(obj.type).toBe('int');
		expect(obj.value).toBe('42');
	});

	it('creates a list heap object with references', () => {
		const obj: HeapObject = {
			id: 'obj-2',
			type: 'list',
			value: [
				{ id: 'obj-3', type: 'int', value: '1' },
				{ id: 'obj-4', type: 'int', value: '2' }
			],
			references: ['obj-3', 'obj-4']
		};

		expect(obj.type).toBe('list');
		expect(Array.isArray(obj.value)).toBe(true);
		expect(obj.references).toHaveLength(2);
	});
});

describe('DebugVisualization', () => {
	it('creates a complete visualization', () => {
		const viz: DebugVisualization = {
			stack: [
				{
					frameName: '<module>',
					variables: [
						{ name: 'x', valueRef: '42' },
						{ name: 'my_list', valueRef: 'obj-1' }
					]
				}
			],
			heap: [
				{
					id: 'obj-1',
					type: 'list',
					value: [
						{ id: 'obj-2', type: 'int', value: '1' },
						{ id: 'obj-3', type: 'int', value: '2' }
					]
				}
			]
		};

		expect(viz.stack).toHaveLength(1);
		expect(viz.heap).toHaveLength(1);
		expect(viz.stack[0].variables).toHaveLength(2);
	});
});

describe('DEBUG_CONFIG', () => {
	it('has correct MAX_HISTORY_SIZE', () => {
		expect(DEBUG_CONFIG.MAX_HISTORY_SIZE).toBe(10);
	});

	it('has correct MAX_SERIALIZE_DEPTH', () => {
		expect(DEBUG_CONFIG.MAX_SERIALIZE_DEPTH).toBe(5);
	});

	it('has correct MAX_SERIALIZE_ITEMS', () => {
		expect(DEBUG_CONFIG.MAX_SERIALIZE_ITEMS).toBe(50);
	});

	it('has correct MAX_STRING_LENGTH', () => {
		expect(DEBUG_CONFIG.MAX_STRING_LENGTH).toBe(200);
	});

	it('has correct DEBUG_TIMEOUT_MS', () => {
		expect(DEBUG_CONFIG.DEBUG_TIMEOUT_MS).toBe(60_000);
	});

	it('is readonly (const assertion)', () => {
		// TypeScript will prevent modification at compile time
		// This test verifies the values are correct at runtime
		expect(Object.isFrozen(DEBUG_CONFIG)).toBe(false); // const assertion doesn't freeze
		expect(typeof DEBUG_CONFIG.MAX_HISTORY_SIZE).toBe('number');
	});
});
