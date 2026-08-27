import { describe, it, expect } from 'vitest';
import { buildCallTree, pruneTree } from '../call-tree';
import type { DebugSnapshot, DebugStackFrame, DebugVariable } from '$lib/shared/python/debug/types';

// --- helpers -----------------------------------------------------------------

function variable(name: string, value: string): DebugVariable {
	return { name, value, type: 'int', isBuiltin: true, isChanged: false };
}
function frame(fn: string, args: [string, string][]): DebugStackFrame {
	return {
		functionName: fn,
		filename: '<exec>',
		lineNumber: 1,
		locals: args.map(([n, v]) => variable(n, v)),
		isCurrentFrame: true
	};
}
function snap(
	event: DebugSnapshot['event'],
	deepest?: DebugStackFrame,
	returnValue?: string
): DebugSnapshot {
	return {
		id: 's',
		lineNumber: 1,
		timestamp: 0,
		callStack: deepest ? [deepest] : [],
		globals: [],
		loops: [],
		stdout: '',
		event,
		heap: [],
		...(returnValue !== undefined ? { returnValue } : {})
	};
}
const callSnap = (fn: string, args: [string, string][]) => snap('call', frame(fn, args));
const returnSnap = (v: string) => snap('return', undefined, v);
const lineSnap = () => snap('line', frame('<module>', []));
const excSnap = () => snap('exception');

// --- tests -------------------------------------------------------------------

describe('buildCallTree', () => {
	it('empty trace → empty forest', () => {
		expect(buildCallTree([])).toEqual([]);
	});

	it('no call events → empty forest', () => {
		expect(buildCallTree([lineSnap(), lineSnap()])).toEqual([]);
	});

	it('single call + return → one node with args and return value', () => {
		const tree = buildCallTree([callSnap('f', [['n', '3']]), lineSnap(), returnSnap('6')]);

		expect(tree).toHaveLength(1);
		expect(tree[0].functionName).toBe('f');
		expect(tree[0].args).toEqual([{ name: 'n', value: '3' }]);
		expect(tree[0].returnValue).toBe('6');
		expect(tree[0].callStepIndex).toBe(0);
		expect(tree[0].returnStepIndex).toBe(2);
		expect(tree[0].children).toEqual([]);
	});

	it('recursion → nested chain with propagated return values', () => {
		// fact(3) → fact(2) → fact(1)
		const tree = buildCallTree([
			callSnap('fact', [['n', '3']]),
			callSnap('fact', [['n', '2']]),
			callSnap('fact', [['n', '1']]),
			returnSnap('1'),
			returnSnap('2'),
			returnSnap('6')
		]);

		expect(tree).toHaveLength(1);
		const f3 = tree[0];
		expect(f3.args).toEqual([{ name: 'n', value: '3' }]);
		expect(f3.returnValue).toBe('6');
		const f2 = f3.children[0];
		expect(f2.returnValue).toBe('2');
		const f1 = f2.children[0];
		expect(f1.args).toEqual([{ name: 'n', value: '1' }]);
		expect(f1.returnValue).toBe('1');
		expect(f1.children).toEqual([]);
	});

	it('branching recursion → siblings under the same parent', () => {
		// fib(2) → [fib(1)=1, fib(0)=0]
		const tree = buildCallTree([
			callSnap('fib', [['n', '2']]),
			callSnap('fib', [['n', '1']]),
			returnSnap('1'),
			callSnap('fib', [['n', '0']]),
			returnSnap('0'),
			returnSnap('1')
		]);

		expect(tree).toHaveLength(1);
		expect(tree[0].children).toHaveLength(2);
		expect(tree[0].children.map((c) => c.returnValue)).toEqual(['1', '0']);
		expect(tree[0].returnValue).toBe('1');
	});

	it('exception marks the open call and leaves no return value', () => {
		const tree = buildCallTree([callSnap('boom', []), excSnap()]);

		expect(tree).toHaveLength(1);
		expect(tree[0].raisedException).toBe(true);
		expect(tree[0].returnValue).toBeUndefined();
	});

	it('two top-level calls → two roots', () => {
		const tree = buildCallTree([
			callSnap('f', [['x', '1']]),
			returnSnap('1'),
			callSnap('g', [['y', '2']]),
			returnSnap('2')
		]);

		expect(tree).toHaveLength(2);
		expect(tree.map((n) => n.functionName)).toEqual(['f', 'g']);
	});
});

describe('pruneTree (progressive build-up)', () => {
	const full = buildCallTree([
		callSnap('fact', [['n', '3']]),
		callSnap('fact', [['n', '2']]),
		callSnap('fact', [['n', '1']]),
		returnSnap('1'),
		returnSnap('2'),
		returnSnap('6')
	]);

	const deepest = (nodes: ReturnType<typeof buildCallTree>) => {
		let n = nodes[0];
		let depth = 1;
		while (n.children.length) {
			n = n.children[0];
			depth++;
		}
		return { node: n, depth };
	};

	it('first step → only the outermost call, not yet returned', () => {
		const t = pruneTree(full, 0);
		expect(t).toHaveLength(1);
		expect(t[0].children).toEqual([]);
		expect(t[0].returnValue).toBeUndefined();
	});

	it('mid-descent → full chain, none returned', () => {
		const t = pruneTree(full, 2);
		expect(deepest(t).depth).toBe(3);
		expect(t[0].returnValue).toBeUndefined();
		expect(t[0].children[0].returnValue).toBeUndefined();
	});

	it('return values fill in as calls unwind', () => {
		const t = pruneTree(full, 3); // fact(1) has returned
		expect(deepest(t).node.returnValue).toBe('1');
		expect(t[0].returnValue).toBeUndefined();
	});

	it('last step → whole tree with all return values', () => {
		const t = pruneTree(full, 5);
		expect(t[0].returnValue).toBe('6');
		expect(t[0].children[0].returnValue).toBe('2');
		expect(t[0].children[0].children[0].returnValue).toBe('1');
	});
});
