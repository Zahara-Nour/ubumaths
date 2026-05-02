/**
 * Tests for the DSL domain restriction parser (`sur` and `avec` suffixes
 * on `courbe()` equations).
 */

import { describe, it, expect } from 'vitest';
import { splitDomainSuffix, parseDomainSuffix } from '../domain-parser';
import { SymbolTable } from '../symbol-table';

describe('splitDomainSuffix', () => {
	it('returns null suffix when no keyword is present', () => {
		const r = splitDomainSuffix('y = x^2');
		expect(r.keyword).toBe(null);
		expect(r.suffix).toBe(null);
		expect(r.core).toBe('y = x^2');
	});

	it('splits on " sur " keyword', () => {
		const r = splitDomainSuffix('y = x^2 sur [-2 ; 2]');
		expect(r.keyword).toBe('sur');
		expect(r.core).toBe('y = x^2');
		expect(r.suffix).toBe('[-2 ; 2]');
	});

	it('splits on " avec " keyword', () => {
		const r = splitDomainSuffix('y = x^2 avec a < x <= b');
		expect(r.keyword).toBe('avec');
		expect(r.core).toBe('y = x^2');
		expect(r.suffix).toBe('a < x <= b');
	});

	it('does not split inside parentheses (function calls)', () => {
		const r = splitDomainSuffix('y = sin(x sur something) + 1');
		// 'sur' is inside parens → treated as part of the core, no split
		expect(r.keyword).toBe(null);
	});

	it('does not split inside braces (piecewise blocks)', () => {
		const r = splitDomainSuffix('y = { -x sur ]-infini ; 0[ }');
		// 'sur' is inside braces → treated as inner piecewise syntax
		expect(r.keyword).toBe(null);
	});

	it('picks the LAST top-level keyword if multiple appear', () => {
		const r = splitDomainSuffix('y = x sur a sur ]0 ; 1[');
		expect(r.keyword).toBe('sur');
		expect(r.suffix).toBe(']0 ; 1[');
	});

	it('handles trailing whitespace', () => {
		const r = splitDomainSuffix('  y = x^2   sur   [0 ; 1]  ');
		expect(r.keyword).toBe('sur');
		expect(r.suffix).toBe('[0 ; 1]');
	});

	it('keyword without trailing content is not a split (no payload)', () => {
		const r = splitDomainSuffix('y = sur');
		// ' sur ' with no content after → no split (i + 5 < eq.length fails)
		expect(r.keyword).toBe(null);
	});
});

describe('parseDomainSuffix — interval form (sur)', () => {
	it('parses [a ; b] (closed-closed, numeric)', () => {
		const r = parseDomainSuffix('[-2 ; 2]', 'sur', undefined, 1);
		expect(r.domain.lowerType).toBe('closed');
		expect(r.domain.upperType).toBe('closed');
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: -2 });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 2 });
		expect(r.dependencies).toEqual([]);
	});

	it('parses ]a ; b[ (open-open)', () => {
		const r = parseDomainSuffix(']0 ; 5[', 'sur', undefined, 1);
		expect(r.domain.lowerType).toBe('open');
		expect(r.domain.upperType).toBe('open');
	});

	it('parses [a ; b[ (closed-open)', () => {
		const r = parseDomainSuffix('[0 ; 5[', 'sur', undefined, 1);
		expect(r.domain.lowerType).toBe('closed');
		expect(r.domain.upperType).toBe('open');
	});

	it('parses ]a ; b] (open-closed)', () => {
		const r = parseDomainSuffix(']0 ; 5]', 'sur', undefined, 1);
		expect(r.domain.lowerType).toBe('open');
		expect(r.domain.upperType).toBe('closed');
	});

	it('parses +infini and -infini', () => {
		const r = parseDomainSuffix(']-infini ; +infini[', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ infinity: '-' });
		expect(r.domain.upper).toEqual({ infinity: '+' });
	});

	it('parses ]−∞ ; +∞[ Unicode form', () => {
		const r = parseDomainSuffix(']-∞ ; +∞[', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ infinity: '-' });
		expect(r.domain.upper).toEqual({ infinity: '+' });
	});

	it('accepts decimal numbers', () => {
		const r = parseDomainSuffix('[1.5 ; 2.5]', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: 1.5 });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 2.5 });
	});

	it('accepts comma as legacy separator', () => {
		const r = parseDomainSuffix(']0, 5[', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: 0 });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 5 });
	});

	it('handles French decimals when ";" separator is used', () => {
		// `]0,5 ; 1,5[` should be parsed as French decimals 0.5 and 1.5
		// First, the symbolic-expression fallback parses "0,5" via parseCustom.
		// We verify success — exact bound representation is not the concern here.
		const r = parseDomainSuffix(']0,5 ; 1,5[', 'sur', undefined, 1);
		expect(r.domain.lowerType).toBe('open');
		expect(r.domain.upperType).toBe('open');
	});

	it('rejects ill-formed brackets', () => {
		expect(() => parseDomainSuffix('(0 ; 5)', 'sur', undefined, 1)).toThrow(/Domaine non reconnu/);
	});

	it('rejects missing separator', () => {
		expect(() => parseDomainSuffix('[0 5]', 'sur', undefined, 1)).toThrow(/Domaine non reconnu/);
	});

	it('rejects empty bound', () => {
		expect(() => parseDomainSuffix('[ ; 5]', 'sur', undefined, 1)).toThrow(/Domaine non reconnu/);
	});

	it('rejects lower > upper for static numeric bounds', () => {
		expect(() => parseDomainSuffix('[5 ; 0]', 'sur', undefined, 1)).toThrow(/Domaine invalide/);
	});

	it('does NOT reject lower > upper for symbolic / slider bounds (could be valid at runtime)', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl1' });
		symbols.set('b', { type: 'scalar', figureId: 'sl2' });
		// Won't throw because both are dynamic
		const r = parseDomainSuffix(']a ; b]', 'sur', symbols, 1);
		expect(r.dependencies).toContain('sl1');
		expect(r.dependencies).toContain('sl2');
	});
});

describe('parseDomainSuffix — condition form (avec)', () => {
	it('parses compound a < x <= b', () => {
		const r = parseDomainSuffix('-2 < x <= 2', 'avec', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: -2 });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 2 });
		expect(r.domain.lowerType).toBe('open');
		expect(r.domain.upperType).toBe('closed');
	});

	it('parses compound a <= x < b', () => {
		const r = parseDomainSuffix('0 <= x < 5', 'avec', undefined, 1);
		expect(r.domain.lowerType).toBe('closed');
		expect(r.domain.upperType).toBe('open');
	});

	it('parses single-sided x > a (lower bound, +∞ upper)', () => {
		const r = parseDomainSuffix('x > 0', 'avec', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: 0 });
		expect(r.domain.upper).toEqual({ infinity: '+' });
		expect(r.domain.lowerType).toBe('open');
		expect(r.domain.upperType).toBe('open');
	});

	it('parses single-sided x >= a', () => {
		const r = parseDomainSuffix('x >= 0', 'avec', undefined, 1);
		expect(r.domain.lowerType).toBe('closed');
	});

	it('parses single-sided x <= b (upper bound, -∞ lower)', () => {
		const r = parseDomainSuffix('x <= 5', 'avec', undefined, 1);
		expect(r.domain.lower).toEqual({ infinity: '-' });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 5 });
		expect(r.domain.upperType).toBe('closed');
	});

	it('parses reverse-order single-sided a < x', () => {
		const r = parseDomainSuffix('0 < x', 'avec', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: 0 });
		expect(r.domain.upper).toEqual({ infinity: '+' });
		expect(r.domain.lowerType).toBe('open');
	});

	it('parses reverse-order b >= x', () => {
		const r = parseDomainSuffix('5 >= x', 'avec', undefined, 1);
		expect(r.domain.lower).toEqual({ infinity: '-' });
		expect(r.domain.upper).toEqual({ kind: 'numeric', value: 5 });
		expect(r.domain.upperType).toBe('closed');
	});

	it('rejects mixed direction a > x < b (illogical)', () => {
		expect(() => parseDomainSuffix('5 > x < 10', 'avec', undefined, 1)).toThrow(
			/Encadrement attendu/
		);
	});

	it('rejects equality x = 5 (not an inequality)', () => {
		expect(() => parseDomainSuffix('x = 5', 'avec', undefined, 1)).toThrow(
			/Condition non reconnue/
		);
	});

	it('rejects non-x variable', () => {
		expect(() => parseDomainSuffix('y > 0', 'avec', undefined, 1)).toThrow(
			/Condition non reconnue/
		);
	});
});

describe('parseDomainSuffix — reactive variables (sliders)', () => {
	it('resolves slider-typed names to scalarRef and tracks dependencies', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });
		symbols.set('b', { type: 'scalar', figureId: 'sl_b' });

		const r = parseDomainSuffix(']a ; b]', 'sur', symbols, 1);
		expect(r.domain.lower).toEqual({ scalarRef: 'sl_a' });
		expect(r.domain.upper).toEqual({ scalarRef: 'sl_b' });
		expect(r.dependencies).toEqual(['sl_a', 'sl_b']);
	});

	it('resolves nombre-typed names to numeric value', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'nombre', value: 3 });

		const r = parseDomainSuffix(']a ; 5]', 'sur', symbols, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: 3 });
		expect(r.dependencies).toEqual([]);
	});

	it('deduplicates dependencies when same slider appears twice', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });

		const r = parseDomainSuffix('-a < x <= a', 'avec', symbols, 1);
		// Both bounds reference 'a' — sl_a should appear once after deduplication.
		// (Lower `-a` becomes a symbolic MathNode, but `getVariables` walks it and
		// surfaces 'a' as a dependency.)
		expect(r.dependencies.filter((d) => d === 'sl_a').length).toBe(1);
	});

	it('collects slider dependencies inside symbolic bound expressions like 2*a', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });

		const r = parseDomainSuffix('[0 ; 2*a]', 'sur', symbols, 1);
		expect(r.dependencies).toContain('sl_a');
	});

	it('works with reactive bounds in compound condition', () => {
		const symbols = new SymbolTable();
		symbols.set('a', { type: 'scalar', figureId: 'sl_a' });
		symbols.set('b', { type: 'scalar', figureId: 'sl_b' });

		const r = parseDomainSuffix('a < x <= b', 'avec', symbols, 1);
		expect(r.domain.lower).toEqual({ scalarRef: 'sl_a' });
		expect(r.domain.upper).toEqual({ scalarRef: 'sl_b' });
		expect(r.dependencies.sort()).toEqual(['sl_a', 'sl_b']);
	});
});

describe('parseDomainSuffix — symbolic expressions in bounds', () => {
	it('parses sqrt(2) as exact', () => {
		const r = parseDomainSuffix('[0 ; sqrt(2)]', 'sur', undefined, 1);
		expect(r.domain.upper).toMatchObject({ kind: 'exact' });
	});

	it('parses negative number directly', () => {
		const r = parseDomainSuffix('[-3 ; 3]', 'sur', undefined, 1);
		expect(r.domain.lower).toEqual({ kind: 'numeric', value: -3 });
	});

	it('rejects unparseable bound', () => {
		expect(() => parseDomainSuffix('[!@#$ ; 5]', 'sur', undefined, 1)).toThrow(
			/Borne non reconnue/
		);
	});
});
