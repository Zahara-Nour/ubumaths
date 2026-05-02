/**
 * Tests for the geometry-core DSL piecewise parser.
 */

import { describe, it, expect } from 'vitest';
import { parsePiecewise, isPiecewiseRhs } from '../piecewise-parser';
import { SymbolTable } from '../symbol-table';
import { isPiecewise } from '$lib/mathAST';
import { compile } from '$lib/mathAST/eval/compile';

describe('isPiecewiseRhs', () => {
	it('detects a piecewise rhs', () => {
		expect(isPiecewiseRhs('{ -x si x < 0, x^2 si x >= 0 }')).toBe(true);
	});

	it('rejects a non-piecewise rhs', () => {
		expect(isPiecewiseRhs('x^2 + 1')).toBe(false);
	});

	it('rejects unbalanced braces', () => {
		expect(isPiecewiseRhs('{ x^2')).toBe(false);
		expect(isPiecewiseRhs('x^2 }')).toBe(false);
	});

	it('rejects content after the closing brace', () => {
		expect(isPiecewiseRhs('{ x^2 } + 1')).toBe(false);
	});

	it('handles whitespace', () => {
		expect(isPiecewiseRhs('   { x si x < 1 }   ')).toBe(true);
	});
});

describe('parsePiecewise — condition form (si)', () => {
	it('parses |x| as piecewise with otherwise', () => {
		const r = parsePiecewise('{ -x si x < 0, x }', undefined, 1);
		expect(isPiecewise(r.node) && r.node.pieces).toHaveLength(1);
		expect(isPiecewise(r.node) && r.node.otherwise).toBeDefined();

		const f = compile(r.node);
		expect(f({ x: -3 })).toBe(3);
		expect(f({ x: 5 })).toBe(5);
	});

	it('parses two-branch absolute value', () => {
		const r = parsePiecewise('{ -x si x < 0, x si x >= 0 }', undefined, 1);
		expect(isPiecewise(r.node) && r.node.pieces).toHaveLength(2);
		const f = compile(r.node);
		expect(f({ x: -2 })).toBe(2);
		expect(f({ x: 2 })).toBe(2);
	});

	it('parses three-branch sign function with chained relations', () => {
		const r = parsePiecewise('{ -1 si x < 0, 0 si x = 0, 1 si x > 0 }', undefined, 1);
		const f = compile(r.node);
		expect(f({ x: -2 })).toBe(-1);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 5 })).toBe(1);
	});

	it('parses compound conditions', () => {
		// Manually compose `0 < x AND x < 5` as a chain (a < x < b nested form is preferred)
		// Using a chain: 0 < x < 5
		const r = parsePiecewise('{ 1 si 0 < x < 5 }', undefined, 1);
		const f = compile(r.node);
		expect(f({ x: 3 })).toBe(1);
		expect(Number.isNaN(f({ x: 0 }))).toBe(true);
		expect(Number.isNaN(f({ x: 7 }))).toBe(true);
	});
});

describe('parsePiecewise — interval form (sur)', () => {
	it('parses two-piece interval definition', () => {
		const r = parsePiecewise('{ -x sur ]-infini ; 0[, x^2 sur [0 ; +infini[ }', undefined, 1);
		expect(isPiecewise(r.node) && r.node.pieces).toHaveLength(2);
		const f = compile(r.node);
		expect(f({ x: -3 })).toBe(3);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 4 })).toBe(16);
	});

	it('parses bounded intervals', () => {
		const r = parsePiecewise('{ x sur [0 ; 5] }', undefined, 1);
		const f = compile(r.node);
		expect(f({ x: 3 })).toBe(3);
		expect(f({ x: 0 })).toBe(0);
		expect(f({ x: 5 })).toBe(5);
		expect(Number.isNaN(f({ x: -1 }))).toBe(true);
		expect(Number.isNaN(f({ x: 6 }))).toBe(true);
	});

	it('respects open/closed bracket semantics', () => {
		const r = parsePiecewise('{ x sur ]0 ; 1[ }', undefined, 1);
		const f = compile(r.node);
		expect(f({ x: 0.5 })).toBe(0.5);
		expect(Number.isNaN(f({ x: 0 }))).toBe(true);
		expect(Number.isNaN(f({ x: 1 }))).toBe(true);
	});
});

describe('parsePiecewise — bracket separator', () => {
	it('rejects comma as bound separator inside a piecewise interval (multi-piece)', () => {
		// With multiple pieces using comma in intervals, `splitPieces` splits on
		// the comma INSIDE [0, 5] so the segments are corrupt — error message
		// reflects the malformed interval state.
		expect(() => parsePiecewise('{ x sur [0, 5], -x sur [5, 10] }', undefined, 1)).toThrow(
			/Intervalle non reconnu/
		);
	});

	it('rejects comma as bound separator even on a single-piece interval', () => {
		// `splitPieces` splits on the comma at depth 0 → corrupted interval, error.
		expect(() => parsePiecewise('{ x sur [0, 5] }', undefined, 1)).toThrow(
			/Intervalle non reconnu/
		);
	});

	it('accepts ";" as bound separator', () => {
		const r = parsePiecewise('{ x sur [0 ; 5], -x sur [5 ; 10] }', undefined, 1);
		expect(isPiecewise(r.node) && r.node.pieces).toHaveLength(2);
		const f = compile(r.node);
		expect(f({ x: 3 })).toBe(3);
		expect(f({ x: 7 })).toBe(-7);
	});
});

describe('parsePiecewise — nested piecewise', () => {
	it('rejects nested piecewise with a clear error', () => {
		expect(() => parsePiecewise('{ x si x > 0, { y si y < 1, 0 } }', undefined, 1)).toThrow(
			/imbriqué/
		);
	});
});

describe('parsePiecewise — errors', () => {
	it('rejects mixing si and sur', () => {
		expect(() => parsePiecewise('{ x si x > 0, -x sur ]-infini ; 0[ }', undefined, 1)).toThrow(
			/Mélange de "si" et "sur"/
		);
	});

	it('rejects empty piecewise', () => {
		expect(() => parsePiecewise('{ }', undefined, 1)).toThrow(/vide/);
	});

	it('rejects malformed braces', () => {
		expect(() => parsePiecewise('not a piecewise', undefined, 1)).toThrow(/mal formé/);
	});

	it('rejects default branch not at the end', () => {
		expect(() => parsePiecewise('{ x, -x si x < 0 }', undefined, 1)).toThrow(
			/morceau par défaut.*dernier/
		);
	});

	it('rejects unbounded interval (no constraints)', () => {
		expect(() => parsePiecewise('{ x sur ]-infini ; +infini[ }', undefined, 1)).toThrow();
	});
});

describe('parsePiecewise — slider dependencies', () => {
	it('collects slider ids referenced in conditions', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });

		const r = parsePiecewise('{ -x si x < a, x si x >= a }', symbols, 1);
		expect(r.dependencies).toContain('sl_a');
	});

	it('collects slider ids referenced in interval bounds', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });
		symbols.set('b', { type: 'scalar', figureId: 'sl_b' });

		const r = parsePiecewise('{ x sur [a ; b], 0 sur ]b ; +infini[ }', symbols, 1);
		expect(r.dependencies).toContain('sl_a');
		expect(r.dependencies).toContain('sl_b');
	});

	it('collects slider ids referenced in branch values', () => {
		const symbols = new SymbolTable();
		symbols.set('k', { type: 'scalar', figureId: 'sl_k' });

		const r = parsePiecewise('{ k*x si x < 0, x }', symbols, 1);
		expect(r.dependencies).toContain('sl_k');
	});

	it('deduplicates dependencies', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });

		const r = parsePiecewise('{ a*x si x < a, a }', symbols, 1);
		expect(r.dependencies.filter((d) => d === 'sl_a').length).toBe(1);
	});
});
