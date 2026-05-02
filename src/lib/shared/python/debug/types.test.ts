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
	type HeapEntry,
	type HeapRef,
	type InlineValue,
	type TruncatedValue
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

describe('InlineValue', () => {
	it('represents a primitive int', () => {
		const v: InlineValue = { type: 'int', value: '42' };
		expect(v.type).toBe('int');
		expect(v.value).toBe('42');
	});

	it('represents None as NoneType', () => {
		const v: InlineValue = { type: 'NoneType', value: 'None' };
		expect(v.type).toBe('NoneType');
	});

	it('represents a string with repr quotes', () => {
		const v: InlineValue = { type: 'str', value: "'hello'" };
		expect(v.value).toBe("'hello'");
	});
});

describe('HeapRef', () => {
	it('points to a heap object by id', () => {
		const ref: HeapRef = { type: 'ref', objectId: '140234567' };
		expect(ref.type).toBe('ref');
		expect(ref.objectId).toBe('140234567');
	});
});

describe('TruncatedValue', () => {
	it('marks depth-truncated content', () => {
		const t: TruncatedValue = { type: 'truncated', value: 'depth' };
		expect(t.type).toBe('truncated');
		expect(t.value).toBe('depth');
	});

	it('marks items-truncated content', () => {
		const t: TruncatedValue = { type: 'truncated', value: 'items' };
		expect(t.value).toBe('items');
	});
});

describe('HeapEntry', () => {
	it('creates a list entry (no key) holding an inline value', () => {
		const e: HeapEntry = { value: { type: 'int', value: '1' } };
		expect(e.key).toBeUndefined();
		expect(e.value.type).toBe('int');
	});

	it('creates a dict entry with a key holding a heap ref', () => {
		const e: HeapEntry = { key: 'x', value: { type: 'ref', objectId: '42' } };
		expect(e.key).toBe('x');
		expect(e.value.type).toBe('ref');
	});

	it('creates an instance attribute entry', () => {
		const e: HeapEntry = { key: 'name', value: { type: 'str', value: "'Alice'" } };
		expect(e.key).toBe('name');
	});
});

describe('HeapObject', () => {
	it('creates a list heap object', () => {
		const obj: HeapObject = {
			id: '140234567',
			type: 'list',
			length: 3,
			entries: [
				{ value: { type: 'int', value: '1' } },
				{ value: { type: 'int', value: '2' } },
				{ value: { type: 'int', value: '3' } }
			]
		};

		expect(obj.type).toBe('list');
		expect(obj.length).toBe(3);
		expect(obj.entries).toHaveLength(3);
	});

	it('creates a dict heap object with mixed entries', () => {
		const obj: HeapObject = {
			id: '140234600',
			type: 'dict',
			length: 2,
			entries: [
				{ key: 'x', value: { type: 'int', value: '1' } },
				{ key: 'y', value: { type: 'ref', objectId: '140234700' } }
			]
		};

		expect(obj.type).toBe('dict');
		expect(obj.entries[0].key).toBe('x');
		expect(obj.entries[1].value.type).toBe('ref');
	});

	it('creates a user-class instance heap object', () => {
		const obj: HeapObject = {
			id: '140234800',
			type: 'instance:Point',
			length: 2,
			entries: [
				{ key: 'x', value: { type: 'int', value: '3' } },
				{ key: 'y', value: { type: 'int', value: '4' } }
			]
		};

		expect(obj.type).toBe('instance:Point');
	});

	it('creates a tuple holding a reference', () => {
		const obj: HeapObject = {
			id: '140234900',
			type: 'tuple',
			length: 2,
			entries: [
				{ value: { type: 'int', value: '1' } },
				{ value: { type: 'ref', objectId: '140235000' } }
			]
		};

		expect(obj.type).toBe('tuple');
		expect(obj.entries[1].value.type).toBe('ref');
	});

	it('represents a self-referential cycle', () => {
		// a = []; a.append(a)
		const obj: HeapObject = {
			id: '140235100',
			type: 'list',
			length: 1,
			entries: [{ value: { type: 'ref', objectId: '140235100' } }]
		};

		expect((obj.entries[0].value as HeapRef).objectId).toBe(obj.id);
	});
});

describe('DebugSnapshot.heap', () => {
	it('is empty when only primitives are in scope', () => {
		const snapshot: DebugSnapshot = {
			id: 'snap-x',
			lineNumber: 1,
			timestamp: 0,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 1,
					locals: [],
					isCurrentFrame: true
				}
			],
			globals: [],
			loops: [],
			stdout: '',
			event: 'line',
			heap: []
		};

		expect(snapshot.heap).toEqual([]);
	});

	it('holds heap objects referenced by aliased variables', () => {
		// a = [1, 2, 3]; b = a — both a and b point to id '140111'
		const snapshot: DebugSnapshot = {
			id: 'snap-y',
			lineNumber: 2,
			timestamp: 0,
			callStack: [
				{
					functionName: '<module>',
					filename: '<exec>',
					lineNumber: 2,
					locals: [],
					isCurrentFrame: true
				}
			],
			globals: [
				{
					name: 'a',
					value: '{"type":"ref","objectId":"140111"}',
					type: 'list',
					isBuiltin: true,
					isChanged: false,
					objectId: '140111'
				},
				{
					name: 'b',
					value: '{"type":"ref","objectId":"140111"}',
					type: 'list',
					isBuiltin: true,
					isChanged: false,
					objectId: '140111'
				}
			],
			loops: [],
			stdout: '',
			event: 'line',
			heap: [
				{
					id: '140111',
					type: 'list',
					length: 3,
					entries: [
						{ value: { type: 'int', value: '1' } },
						{ value: { type: 'int', value: '2' } },
						{ value: { type: 'int', value: '3' } }
					]
				}
			]
		};

		expect(snapshot.heap).toHaveLength(1);
		expect(snapshot.globals[0].objectId).toBe(snapshot.globals[1].objectId);
		expect(snapshot.globals[0].objectId).toBe(snapshot.heap[0].id);
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
