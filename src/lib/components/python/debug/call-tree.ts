/**
 * Call / recursion tree builder.
 *
 * Turns a recorded debug trace into a forest of call nodes: each `call` event
 * opens a node (function name + bound arguments), the matching `return` event
 * closes it (return value), and nesting follows the call stack. Recursion shows
 * up as a chain/tree of nodes, and identical `(function, args)` pairs can be
 * tinted downstream to teach memoization.
 *
 * Pure and framework-free → unit-testable; the same structure feeds the elkjs
 * tree layout and the SVG rendering.
 */

import type { DebugSnapshot } from '$lib/shared/python/debug/types';

export interface CallArg {
	name: string;
	/** JSON-serialized value (formatted for display by the renderer). */
	value: string;
}

export interface CallTreeNode {
	id: string;
	functionName: string;
	args: CallArg[];
	/** repr of the returned value; absent while the call is still open. */
	returnValue?: string;
	/** true when the call ended in an exception. */
	raisedException?: boolean;
	children: CallTreeNode[];
	/** trace step index of the `call` (for scrubber sync). */
	callStepIndex: number;
	/** trace step index of the `return`, if it returned. */
	returnStepIndex?: number;
}

/**
 * Build the call-tree forest (top-level calls) from a chronological trace.
 */
export function buildCallTree(trace: DebugSnapshot[]): CallTreeNode[] {
	const roots: CallTreeNode[] = [];
	const stack: CallTreeNode[] = [];
	let seq = 0;

	trace.forEach((snapshot, index) => {
		if (snapshot.event === 'call') {
			// The deepest frame is the just-entered function; its locals are the
			// arguments bound at call time.
			const frame = snapshot.callStack[snapshot.callStack.length - 1];
			const node: CallTreeNode = {
				id: `call-${seq++}`,
				functionName: frame?.functionName ?? '?',
				args: (frame?.locals ?? []).map((v) => ({ name: v.name, value: v.value })),
				children: [],
				callStepIndex: index
			};
			(stack.length > 0 ? stack[stack.length - 1].children : roots).push(node);
			stack.push(node);
		} else if (snapshot.event === 'return') {
			const node = stack.pop();
			if (node) {
				node.returnValue = snapshot.returnValue;
				node.returnStepIndex = index;
			}
		} else if (snapshot.event === 'exception') {
			if (stack.length > 0) stack[stack.length - 1].raisedException = true;
		}
	});

	return roots;
}

/**
 * Prune a call tree to what has happened up to `step`: drop calls that haven't
 * started yet, and hide the return value of calls that haven't returned yet
 * (shown as "in progress"). Lets the tree **build up** as the scrubber advances,
 * with return values filling in as calls unwind.
 */
export function pruneTree(tree: CallTreeNode[], step: number): CallTreeNode[] {
	const pruneNode = (n: CallTreeNode): CallTreeNode | null => {
		if (n.callStepIndex > step) return null; // not started yet at this step
		const returned = n.returnStepIndex !== undefined && n.returnStepIndex <= step;
		return {
			...n,
			returnValue: returned ? n.returnValue : undefined,
			returnStepIndex: returned ? n.returnStepIndex : undefined,
			children: n.children.map(pruneNode).filter((c): c is CallTreeNode => c !== null)
		};
	};
	return tree.map(pruneNode).filter((n): n is CallTreeNode => n !== null);
}
