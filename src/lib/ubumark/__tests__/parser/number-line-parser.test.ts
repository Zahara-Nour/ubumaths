/**
 * Number Line Parser Tests
 * ========================
 */

import { describe, it, expect } from 'vitest';
import {
	isNumberLineBlockStart,
	findNumberLineBlocks,
	parseNumberLineContent,
	parseNumberLine
} from '../../parser/number-line-parser';

// ============================================================================
// DETECTION
// ============================================================================

describe('isNumberLineBlockStart', () => {
	it('accepts ```line', () => {
		expect(isNumberLineBlockStart('```line')).toBe(true);
	});

	it('accepts ```line with trailing space', () => {
		expect(isNumberLineBlockStart('```line ')).toBe(true);
	});

	it('rejects ```linear', () => {
		expect(isNumberLineBlockStart('```linear')).toBe(false);
	});

	it('rejects ```variation', () => {
		expect(isNumberLineBlockStart('```variation')).toBe(false);
	});

	it('rejects plain ```', () => {
		expect(isNumberLineBlockStart('```')).toBe(false);
	});
});

describe('findNumberLineBlocks', () => {
	it('finds a single block', () => {
		const lines = ['some text', '```line', 'start: 0', 'end: 10', 'step: 1', '```', 'more text'];
		const blocks = findNumberLineBlocks(lines);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({ startIndex: 1, endIndex: 5 });
	});

	it('finds multiple blocks', () => {
		const lines = [
			'```line',
			'start: 0',
			'end: 5',
			'step: 1',
			'```',
			'text',
			'```line',
			'start: -3',
			'end: 3',
			'step: 0.5',
			'```'
		];
		const blocks = findNumberLineBlocks(lines);
		expect(blocks).toHaveLength(2);
	});
});

// ============================================================================
// PARSING CONFIG
// ============================================================================

describe('parseNumberLineContent', () => {
	it('parses complete config', () => {
		const result = parseNumberLineContent([
			'start: -3',
			'end: 5',
			'step: 0.5',
			'major: 2',
			'arrows: true',
			'scale: linear'
		]);
		expect(result.errors).toHaveLength(0);
		expect(result.node).not.toBeNull();
		expect(result.node!.type).toBe('number-line');
		expect(result.node!.config.major).toBe(2);
		expect(result.node!.config.arrows).toBe(true);
		expect(result.node!.config.scale).toBe('linear');
	});

	it('uses defaults for optional fields', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 1']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.config.major).toBe(1);
		expect(result.node!.config.arrows).toBe(false);
		expect(result.node!.config.scale).toBe('linear');
		expect(result.node!.config.labels).toHaveLength(0);
		expect(result.node!.config.hidden).toHaveLength(0);
	});

	it('errors on missing required fields', () => {
		const result = parseNumberLineContent(['end: 5', 'step: 1']);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.node).toBeNull();
	});

	it('errors when start >= end', () => {
		const result = parseNumberLineContent(['start: 5', 'end: 3', 'step: 1']);
		expect(result.errors.some((e) => e.message.includes('start'))).toBe(true);
	});

	it('errors when step <= 0', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: -1']);
		expect(result.errors.some((e) => e.message.includes('step'))).toBe(true);
	});

	it('errors when step > range', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 5', 'step: 10']);
		expect(result.errors.some((e) => e.message.includes('step'))).toBe(true);
	});

	it('errors on log scale with start <= 0', () => {
		const result = parseNumberLineContent(['start: -1', 'end: 10', 'step: 1', 'scale: log']);
		expect(result.errors.some((e) => e.message.includes('Log scale'))).toBe(true);
	});

	it('warns on unknown keys', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 1', 'foo: bar']);
		expect(result.warnings.some((w) => w.message.includes('Unknown'))).toBe(true);
	});
});

// ============================================================================
// POINTS
// ============================================================================

describe('points parsing', () => {
	it('parses points with color', () => {
		const result = parseNumberLineContent([
			'start: -3',
			'end: 5',
			'step: 1',
			'points: A=2.5 red, B=-1 blue'
		]);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.points).toHaveLength(2);
		expect(result.node!.points[0].label).toBe('A');
		expect(result.node!.points[0].color).toBe('red');
		expect(result.node!.points[1].label).toBe('B');
		expect(result.node!.points[1].color).toBe('blue');
	});

	it('parses points without color', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 1', 'points: C=3']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.points).toHaveLength(1);
		expect(result.node!.points[0].label).toBe('C');
		expect(result.node!.points[0].color).toBeUndefined();
	});

	it('errors on point outside bounds', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 5', 'step: 1', 'points: A=10']);
		expect(result.errors.some((e) => e.message.includes('outside bounds'))).toBe(true);
	});
});

// ============================================================================
// SEGMENTS
// ============================================================================

describe('segments parsing', () => {
	it('parses closed segment', () => {
		const result = parseNumberLineContent([
			'start: -5',
			'end: 5',
			'step: 1',
			'segments: [-1, 3] green'
		]);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.segments).toHaveLength(1);
		expect(result.node!.segments[0].startOpen).toBe(false);
		expect(result.node!.segments[0].endOpen).toBe(false);
		expect(result.node!.segments[0].color).toBe('green');
	});

	it('parses open segment', () => {
		const result = parseNumberLineContent(['start: -5', 'end: 5', 'step: 1', 'segments: ]3, 5[']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.segments).toHaveLength(1);
		expect(result.node!.segments[0].startOpen).toBe(true);
		expect(result.node!.segments[0].endOpen).toBe(true);
	});

	it('parses half-open segment', () => {
		const result = parseNumberLineContent(['start: -5', 'end: 5', 'step: 1', 'segments: [-1, 3[']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.segments[0].startOpen).toBe(false);
		expect(result.node!.segments[0].endOpen).toBe(true);
	});
});

// ============================================================================
// MATH EXPRESSIONS
// ============================================================================

describe('math expression values', () => {
	it('parses fraction 1/3', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 1', 'step: 1/3', 'labels: 1/3']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.config.labels).toHaveLength(1);
		expect(result.node!.config.labels[0].expression).toBe('1/3');
	});

	it('parses sqrt(2)', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 2', 'step: 0.5', 'points: A=sqrt(2)']);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.points).toHaveLength(1);
		expect(result.node!.points[0].value.expression).toBe('sqrt(2)');
	});

	it('handles hidden labels', () => {
		const result = parseNumberLineContent([
			'start: 0',
			'end: 5',
			'step: 1',
			'labels: 0, 1, 2, 3, 4, 5',
			'hidden: 2, 4'
		]);
		expect(result.errors).toHaveLength(0);
		expect(result.node!.config.labels).toHaveLength(6);
		expect(result.node!.config.hidden).toHaveLength(2);
	});
});

// ============================================================================
// INTEGRATION WITH MARKDOWN PARSER
// ============================================================================

describe('parseNumberLine (block parsing)', () => {
	it('parses block from lines with start/end indices', () => {
		const lines = ['some text', '```line', 'start: 0', 'end: 10', 'step: 1', '```', 'more text'];
		const result = parseNumberLine(lines, 1, 5);
		expect(result.errors).toHaveLength(0);
		expect(result.node).not.toBeNull();
		expect(result.node!.type).toBe('number-line');
	});
});

describe('integration with markdown', () => {
	it('block line is detected in a document', () => {
		const lines = [
			'# Title',
			'',
			'Some text.',
			'',
			'```line',
			'start: -3',
			'end: 5',
			'step: 1',
			'```',
			'',
			'More text.'
		];
		const blocks = findNumberLineBlocks(lines);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toEqual({ startIndex: 4, endIndex: 8 });
	});
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
	it('empty block produces errors for missing required fields', () => {
		const result = parseNumberLineContent([]);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
		expect(result.node).toBeNull();
	});

	it('block with only comments produces errors', () => {
		const result = parseNumberLineContent(['# just a comment']);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
		expect(result.node).toBeNull();
	});

	it('major: 0 produces error', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 1', 'major: 0']);
		expect(result.errors.some((e) => e.message.includes('major'))).toBe(true);
	});

	it('major: -1 produces error', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 1', 'major: -1']);
		expect(result.errors.some((e) => e.message.includes('major'))).toBe(true);
	});

	it('too many graduations produces error', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 10', 'step: 0.001']);
		expect(result.errors.some((e) => e.message.includes('Too many graduations'))).toBe(true);
	});

	it('log scale with valid positive values succeeds', () => {
		const result = parseNumberLineContent(['start: 1', 'end: 100', 'step: 10', 'scale: log']);
		expect(result.errors).toHaveLength(0);
		expect(result.node).not.toBeNull();
		expect(result.node!.config.scale).toBe('log');
	});

	it('unclosed block is handled gracefully', () => {
		const lines = ['```line', 'start: 0', 'end: 10', 'step: 1'];
		const blocks = findNumberLineBlocks(lines);
		expect(blocks).toHaveLength(1);
		// endIndex should be lines.length - 1 (graceful fallback)
		expect(blocks[0].endIndex).toBe(3);
	});

	it('segment with start >= end produces error', () => {
		const result = parseNumberLineContent(['start: -5', 'end: 5', 'step: 1', 'segments: [3, 1]']);
		expect(result.errors.some((e) => e.message.includes('Segment start'))).toBe(true);
	});

	it('segment outside bounds produces warning', () => {
		const result = parseNumberLineContent(['start: 0', 'end: 5', 'step: 1', 'segments: [-2, 3]']);
		expect(result.warnings.some((w) => w.message.includes('outside bounds'))).toBe(true);
	});

	it('multiple segments without colors', () => {
		const result = parseNumberLineContent([
			'start: -5',
			'end: 5',
			'step: 1',
			'segments: [-3, -1] [1, 3]'
		]);
		// Should parse at least one segment (regex based)
		expect(result.errors).toHaveLength(0);
	});
});
