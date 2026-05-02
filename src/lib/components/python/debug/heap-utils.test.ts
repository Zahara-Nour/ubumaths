/**
 * Tests for heap-utils.ts — display helpers for the memory diagram.
 */

import { describe, it, expect } from 'vitest';
import {
	parseVariableValue,
	isHeapRef,
	isTruncated,
	isEntryRef,
	shortHeapId,
	colorForHeapId,
	formatInline,
	heapTypeLabel
} from './heap-utils';
import type { HeapEntry, HeapObject } from '$lib/shared/python/debug/types';

describe('parseVariableValue', () => {
	it('parses an inline primitive', () => {
		const result = parseVariableValue('{"type":"int","value":"42"}');
		expect(result).toEqual({ type: 'int', value: '42' });
	});

	it('parses a heap ref', () => {
		const result = parseVariableValue('{"type":"ref","objectId":"140111"}');
		expect(result).toEqual({ type: 'ref', objectId: '140111' });
	});

	it('parses a truncated value', () => {
		const result = parseVariableValue('{"type":"truncated","value":"depth"}');
		expect(result).toEqual({ type: 'truncated', value: 'depth' });
	});

	it('returns null on invalid JSON', () => {
		expect(parseVariableValue('not json')).toBeNull();
	});

	it('returns null on JSON that is not the expected shape', () => {
		expect(parseVariableValue('123')).toBeNull();
		expect(parseVariableValue('"hello"')).toBeNull();
		expect(parseVariableValue('{"foo":"bar"}')).toBeNull();
	});
});

describe('isHeapRef', () => {
	it('detects a HeapRef', () => {
		expect(isHeapRef({ type: 'ref', objectId: '1' })).toBe(true);
	});

	it('rejects an InlineValue', () => {
		expect(isHeapRef({ type: 'int', value: '42' })).toBe(false);
	});

	it('rejects a TruncatedValue', () => {
		expect(isHeapRef({ type: 'truncated', value: 'depth' })).toBe(false);
	});
});

describe('isTruncated', () => {
	it('detects a TruncatedValue', () => {
		expect(isTruncated({ type: 'truncated', value: 'depth' })).toBe(true);
	});

	it('rejects an InlineValue', () => {
		expect(isTruncated({ type: 'str', value: "'x'" })).toBe(false);
	});
});

describe('isEntryRef', () => {
	it('detects entry holding a HeapRef', () => {
		const e: HeapEntry = { value: { type: 'ref', objectId: '1' } };
		expect(isEntryRef(e)).toBe(true);
	});

	it('rejects entry holding an InlineValue', () => {
		const e: HeapEntry = { value: { type: 'int', value: '1' } };
		expect(isEntryRef(e)).toBe(false);
	});
});

describe('shortHeapId', () => {
	it('produces a 5-char string starting with #', () => {
		const result = shortHeapId('140234567');
		expect(result).toMatch(/^#[0-9a-z]{4}$/);
	});

	it('is deterministic for the same id', () => {
		expect(shortHeapId('140234567')).toBe(shortHeapId('140234567'));
	});

	it('produces different short ids for different inputs (most of the time)', () => {
		const a = shortHeapId('140234567');
		const b = shortHeapId('140234568');
		// Hash collisions are theoretically possible but extremely unlikely here
		expect(a).not.toBe(b);
	});
});

describe('colorForHeapId', () => {
	it('returns a color from the palette', () => {
		const color = colorForHeapId('140111');
		expect(color).toHaveProperty('stroke');
		expect(color).toHaveProperty('text');
		expect(color).toHaveProperty('bg');
		expect(color).toHaveProperty('dark');
	});

	it('is deterministic for the same id (alias safety)', () => {
		const a = colorForHeapId('140111');
		const b = colorForHeapId('140111');
		expect(a).toBe(b);
	});
});

describe('formatInline', () => {
	it('renders None as "None"', () => {
		expect(formatInline({ type: 'NoneType', value: 'None' })).toBe('None');
	});

	it('renders an int verbatim', () => {
		expect(formatInline({ type: 'int', value: '42' })).toBe('42');
	});

	it('renders a string with its repr quotes', () => {
		expect(formatInline({ type: 'str', value: "'hello'" })).toBe("'hello'");
	});

	it('renders a depth-truncated value as ellipsis', () => {
		expect(formatInline({ type: 'truncated', value: 'depth' })).toBe('…');
	});

	it('renders other truncated reasons with the reason in parens', () => {
		expect(formatInline({ type: 'truncated', value: 'items' })).toBe('… (items)');
	});
});

describe('heapTypeLabel', () => {
	const make = (type: HeapObject['type'], length: number): HeapObject => ({
		id: '1',
		type,
		length,
		entries: []
	});

	it('formats containers as type[length]', () => {
		expect(heapTypeLabel(make('list', 3))).toBe('list[3]');
		expect(heapTypeLabel(make('dict', 2))).toBe('dict[2]');
		expect(heapTypeLabel(make('set', 0))).toBe('set[0]');
		expect(heapTypeLabel(make('tuple', 4))).toBe('tuple[4]');
	});

	it('formats user-class instances with just the class name', () => {
		expect(heapTypeLabel(make('instance:Point', 2))).toBe('Point');
		expect(heapTypeLabel(make('instance:Tree', 3))).toBe('Tree');
	});
});
