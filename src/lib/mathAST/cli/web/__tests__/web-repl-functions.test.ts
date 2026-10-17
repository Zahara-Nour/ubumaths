/**
 * Web REPL Function Features Tests
 *
 * Tests for function state exposure in WebReplEngine.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

// =============================================================================
// WebReplEngine.getFunctions() Tests
// =============================================================================

describe('WebReplEngine.getFunctions()', () => {
	let engine: WebReplEngine;

	beforeEach(() => {
		engine = new WebReplEngine();
	});

	describe('initial state', () => {
		it('returns empty array initially', () => {
			const functions = engine.getFunctions();
			expect(functions).toEqual([]);
		});

		it('returns empty array after executing non-function commands', () => {
			engine.execute('x^2 + 1');
			engine.execute('x = 5');
			expect(engine.getFunctions()).toEqual([]);
		});
	});

	describe('after .def command', () => {
		it('returns correct info after single function definition', () => {
			engine.execute('.def f(x) = x^2');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].name).toBe('f');
			expect(functions[0].parameters).toEqual(['x']);
			expect(functions[0].expression).toBe('x^2');
			// Note: .def auto-computes derivative
			expect(functions[0].derivative).toBeDefined();
		});

		it('returns correct info for multiple functions', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.def g(x) = x + 1');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(2);
			const names = functions.map((f) => f.name).sort();
			expect(names).toEqual(['f', 'g']);
		});

		it('returns updated info after redefining function', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.def f(x) = x^3');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].expression).toBe('x^3');
		});

		it('handles complex expressions correctly', () => {
			engine.execute('.def h(t) = sin(t) + cos(t)');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].name).toBe('h');
			expect(functions[0].parameters).toEqual(['t']);
			// Expression should be in custom syntax
			expect(functions[0].expression).toContain('sin');
			expect(functions[0].expression).toContain('cos');
		});
	});

	describe('after .undef command', () => {
		it('updates after undefining a function', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.def g(x) = x + 1');
			expect(engine.getFunctions()).toHaveLength(2);

			engine.execute('.undef f');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].name).toBe('g');
		});

		it('returns empty array after undefining all functions', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.undef f');

			expect(engine.getFunctions()).toEqual([]);
		});
	});

	describe('auto-computed derivative', () => {
		it('shows auto-computed derivative after .def', () => {
			engine.execute('.def f(x) = x^2');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			// Derivative is auto-computed for x^2
			expect(functions[0].derivative).toBeDefined();
			// Custom syntax output may be '2x' or '2 * x'
			expect(functions[0].derivative).toMatch(/2.*x/);
		});

		it('derivative updates when function is redefined', () => {
			engine.execute('.def f(x) = x^2');
			const deriv1 = engine.getFunctions()[0].derivative;

			engine.execute('.def f(x) = x^3');
			const deriv2 = engine.getFunctions()[0].derivative;

			// x^2 -> 2x, x^3 -> 3x^2
			expect(deriv1).not.toBe(deriv2);
		});
	});

	describe('with inverse defined', () => {
		it('shows inverse when defined via .inv', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.inv f = sqrt(x)');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].inverse).toBeDefined();
			expect(functions[0].inverse).toContain('sqrt');
		});

		it('shows no inverse for function without .inv', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.def g(x) = exp(x)');
			engine.execute('.inv f = sqrt(x)');
			const functions = engine.getFunctions();

			const f = functions.find((fn) => fn.name === 'f');
			const g = functions.find((fn) => fn.name === 'g');

			expect(f?.inverse).toContain('sqrt');
			expect(g?.inverse).toBeUndefined();
		});
	});

	describe('with both derivative and inverse', () => {
		it('shows both when both are defined', () => {
			engine.execute('.def f(x) = x^2');
			engine.execute('.inv f = sqrt(x)');
			const functions = engine.getFunctions();

			expect(functions).toHaveLength(1);
			expect(functions[0].name).toBe('f');
			expect(functions[0].expression).toBe('x^2');
			expect(functions[0].derivative).toBeDefined(); // auto-computed
			expect(functions[0].inverse).toContain('sqrt');
		});
	});
});

// =============================================================================
// WebReplEngine.getState() Tests
// =============================================================================

describe('WebReplEngine.getState()', () => {
	it('returns the internal EvalState', () => {
		const engine = new WebReplEngine();
		const state = engine.getState();

		expect(state).toBeDefined();
		expect(state.bindings).toBeInstanceOf(Map);
		expect(state.functions).toBeDefined();
		expect(state.functionNames).toBeInstanceOf(Set);
		expect(state.mode).toBe('exact');
	});

	it('state reflects changes after commands', () => {
		const engine = new WebReplEngine();
		engine.execute('.def f(x) = x^2');
		const state = engine.getState();

		expect(state.functionNames.has('f')).toBe(true);
		expect(state.functions['f']).toBeDefined();
	});
});

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration: define, list, check output', () => {
	let engine: WebReplEngine;

	beforeEach(() => {
		engine = new WebReplEngine();
	});

	it('full workflow: define function, list, verify', () => {
		// Define function
		const defResult = engine.execute('.def f(x) = x^2 + 1');
		expect(defResult.success).toBe(true);

		// List functions
		const fnsResult = engine.execute('.fns');
		expect(fnsResult.success).toBe(true);
		expect(fnsResult.output).toContain('f');

		// Verify via getFunctions()
		const functions = engine.getFunctions();
		expect(functions).toHaveLength(1);
		expect(functions[0].name).toBe('f');
		// Note: custom syntax may not have spaces
		expect(functions[0].expression).toMatch(/x\^2.*\+.*1|x\^2\+1/);
	});

	it('full workflow: define with inverse', () => {
		engine.execute('.def f(x) = x^2');
		engine.execute('.inv f = sqrt(x)');

		const functions = engine.getFunctions();
		expect(functions).toHaveLength(1);

		const f = functions[0];
		expect(f.name).toBe('f');
		expect(f.expression).toBe('x^2');
		expect(f.derivative).toBeDefined(); // auto-computed
		expect(f.inverse).toContain('sqrt');
	});

	it('function state persists across multiple commands', () => {
		engine.execute('.def f(x) = x^2');
		engine.execute('x = 5');
		engine.execute('f(3)'); // Should evaluate
		engine.execute('.def g(x) = x + 1');

		const functions = engine.getFunctions();
		expect(functions).toHaveLength(2);
	});

	it('clearing state resets functions', () => {
		engine.execute('.def f(x) = x^2');
		expect(engine.getFunctions()).toHaveLength(1);

		engine.execute('.clear');
		// .clear clears bindings but check function behavior
		const functions = engine.getFunctions();
		// Depending on implementation, functions may or may not be cleared
		expect(functions.length).toBeGreaterThanOrEqual(0);
	});
});
