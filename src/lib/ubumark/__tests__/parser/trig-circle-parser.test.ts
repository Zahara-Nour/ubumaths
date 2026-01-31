/**
 * Trig Circle Parser Tests
 * ========================
 *
 * Unit tests for the trigonometric circle parsing module.
 * Tests cover detection, parsing, equation solving, and error handling.
 */

import { describe, it, expect } from 'vitest';
import {
	isTrigCircleBlockStart,
	isBlockEnd,
	findTrigCircleBlocks,
	parseTrigCircleContent,
	parseTrigCircle,
	parseAngleExpression,
	parseEquation
} from '../../parser/trig-circle-parser';

// ============================================================================
// DETECTION TESTS
// ============================================================================

describe('isTrigCircleBlockStart', () => {
	it('should identify trig block start', () => {
		expect(isTrigCircleBlockStart('```trig')).toBe(true);
		expect(isTrigCircleBlockStart('```trig ')).toBe(true);
	});

	it('should reject non-trig blocks', () => {
		expect(isTrigCircleBlockStart('```')).toBe(false);
		expect(isTrigCircleBlockStart('```typescript')).toBe(false);
		expect(isTrigCircleBlockStart('```trigonometry')).toBe(false);
		expect(isTrigCircleBlockStart('trig')).toBe(false);
		expect(isTrigCircleBlockStart('```variation')).toBe(false);
	});
});

describe('isBlockEnd', () => {
	it('should identify block end', () => {
		expect(isBlockEnd('```')).toBe(true);
		expect(isBlockEnd('``` ')).toBe(true);
	});

	it('should reject non-block-end', () => {
		expect(isBlockEnd('```trig')).toBe(false);
		expect(isBlockEnd('text')).toBe(false);
	});
});

// ============================================================================
// BLOCK FINDING TESTS
// ============================================================================

describe('findTrigCircleBlocks', () => {
	it('should find single trig block', () => {
		const lines = ['Text before', '```trig', 'preset: quarters', '```', 'Text after'];

		const blocks = findTrigCircleBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(1);
		expect(blocks[0].endIndex).toBe(3);
	});

	it('should find multiple trig blocks', () => {
		const lines = ['```trig', 'preset: all', '```', '', '```trig', 'preset: sixths', '```'];

		const blocks = findTrigCircleBlocks(lines);

		expect(blocks).toHaveLength(2);
		expect(blocks[0]).toEqual({ startIndex: 0, endIndex: 2 });
		expect(blocks[1]).toEqual({ startIndex: 4, endIndex: 6 });
	});

	it('should return empty array when no trig blocks', () => {
		const lines = ['Just', 'regular', 'text'];

		const blocks = findTrigCircleBlocks(lines);

		expect(blocks).toHaveLength(0);
	});

	it('should handle unclosed block', () => {
		const lines = ['```trig', 'preset: quarters'];

		const blocks = findTrigCircleBlocks(lines);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].startIndex).toBe(0);
		expect(blocks[0].endIndex).toBe(1);
	});

	it('should not match regular code blocks', () => {
		const lines = ['```typescript', 'const x = 1;', '```'];

		const blocks = findTrigCircleBlocks(lines);

		expect(blocks).toHaveLength(0);
	});
});

// ============================================================================
// ANGLE EXPRESSION PARSING
// ============================================================================

describe('parseAngleExpression', () => {
	it('should parse pi fractions', () => {
		const result = parseAngleExpression('pi/3');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo(Math.PI / 3, 10);
	});

	it('should parse multiples of pi', () => {
		const result = parseAngleExpression('2*pi/3');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo((2 * Math.PI) / 3, 10);
	});

	it('should parse pi alone', () => {
		const result = parseAngleExpression('pi');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo(Math.PI, 10);
	});

	it('should parse 2pi', () => {
		const result = parseAngleExpression('2pi');
		expect(result).not.toBeNull();
		// 2π is normalized to 0 since it's a full rotation
		expect(result!.radians).toBeCloseTo(0, 10);
		expect(result!.expression).toBe('2π');
	});

	it('should parse degrees', () => {
		const result = parseAngleExpression('90°');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo(Math.PI / 2, 10);
	});

	it('should parse numeric radians', () => {
		const result = parseAngleExpression('1.5708');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo(1.5708, 4);
	});

	it('should normalize angles to [0, 2pi)', () => {
		const result = parseAngleExpression('7*pi/6');
		expect(result).not.toBeNull();
		expect(result!.radians).toBeCloseTo((7 * Math.PI) / 6, 10);
		expect(result!.radians).toBeGreaterThanOrEqual(0);
		expect(result!.radians).toBeLessThan(2 * Math.PI);
	});

	it('should return null for invalid expressions', () => {
		expect(parseAngleExpression('invalid')).toBeNull();
		expect(parseAngleExpression('')).toBeNull();
	});
});

// ============================================================================
// EQUATION PARSING
// ============================================================================

describe('parseEquation', () => {
	it('should parse cos equality', () => {
		const result = parseEquation('cos(x) = 1/2');
		expect(result).not.toBeNull();
		expect(result!.func).toBe('cos');
		expect(result!.operator).toBe('=');
		expect(result!.numericValue).toBeCloseTo(0.5, 10);
	});

	it('should parse sin inequality', () => {
		const result = parseEquation('sin(x) > √2/2');
		expect(result).not.toBeNull();
		expect(result!.func).toBe('sin');
		expect(result!.operator).toBe('>');
		expect(result!.numericValue).toBeCloseTo(Math.SQRT2 / 2, 10);
	});

	it('should parse tan equation', () => {
		const result = parseEquation('tan(x) = 1');
		expect(result).not.toBeNull();
		expect(result!.func).toBe('tan');
		expect(result!.operator).toBe('=');
		expect(result!.numericValue).toBe(1);
	});

	it('should parse negative values', () => {
		const result = parseEquation('cos(x) = -1/2');
		expect(result).not.toBeNull();
		expect(result!.numericValue).toBeCloseTo(-0.5, 10);
	});

	it('should parse √3/2', () => {
		const result = parseEquation('cos(x) = √3/2');
		expect(result).not.toBeNull();
		expect(result!.numericValue).toBeCloseTo(Math.sqrt(3) / 2, 10);
	});

	it('should return null for invalid equations', () => {
		expect(parseEquation('invalid')).toBeNull();
		expect(parseEquation('f(x) = 1')).toBeNull();
		expect(parseEquation('')).toBeNull();
	});
});

// ============================================================================
// CONTENT PARSING
// ============================================================================

describe('parseTrigCircleContent', () => {
	it('should parse preset', () => {
		const result = parseTrigCircleContent('preset: quarters');

		expect(result.node).not.toBeNull();
		expect(result.node!.config.preset).toBe('quarters');
		expect(result.errors).toHaveLength(0);
	});

	it('should parse custom angles', () => {
		const result = parseTrigCircleContent(`preset: custom
angles: pi/5, 2*pi/3`);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.preset).toBe('custom');
		expect(result.node!.config.customAngles).toHaveLength(2);
	});

	it('should parse equation', () => {
		const result = parseTrigCircleContent(`equation: cos(x) = 1/2
mode: arc`);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.equation).toBeDefined();
		expect(result.node!.config.equation!.func).toBe('cos');
		expect(result.node!.config.mode).toBe('arc');
	});

	it('should parse display options', () => {
		const result = parseTrigCircleContent(`preset: all
display: circle+table
projections: true
color: red`);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.display).toBe('circle+table');
		expect(result.node!.config.showProjections).toBe(true);
		expect(result.node!.config.color).toBe('red');
	});

	it('should use default values', () => {
		const result = parseTrigCircleContent('');

		expect(result.node).not.toBeNull();
		expect(result.node!.config.preset).toBe('quarters');
		expect(result.node!.config.mode).toBe('points');
		expect(result.node!.config.display).toBe('circle');
		expect(result.node!.config.showProjections).toBe(false);
	});

	it('should report warnings for unknown keys', () => {
		const result = parseTrigCircleContent(`preset: quarters
unknownKey: value`);

		expect(result.node).not.toBeNull();
		expect(result.warnings).toHaveLength(1);
		expect(result.warnings[0].message).toContain('unknownKey');
	});
});

// ============================================================================
// FULL PARSING TESTS
// ============================================================================

describe('parseTrigCircle', () => {
	it('should parse complete trig block', () => {
		const lines = ['```trig', 'preset: sixths', 'projections: true', '```'];

		const result = parseTrigCircle(lines, 0, 3);

		expect(result.node).not.toBeNull();
		expect(result.node!.config.preset).toBe('sixths');
		expect(result.node!.config.showProjections).toBe(true);
		expect(result.node!.angles).toHaveLength(12); // sixths has 12 angles
	});

	it('should compute solutions for equations', () => {
		const lines = ['```trig', 'equation: cos(x) = 1/2', 'mode: arc', '```'];

		const result = parseTrigCircle(lines, 0, 3);

		expect(result.node).not.toBeNull();
		expect(result.node!.solution).toBeDefined();
		expect(result.node!.solution!.type).toBe('equation');
		expect(result.node!.solution!.angles).toHaveLength(2); // cos(x) = 1/2 has 2 solutions
	});

	it('should generate angles for preset', () => {
		const lines = ['```trig', 'preset: quarters', '```'];

		const result = parseTrigCircle(lines, 0, 2);

		expect(result.node).not.toBeNull();
		expect(result.node!.angles).toHaveLength(4); // quarters has 4 angles
	});

	it('should handle all preset', () => {
		const lines = ['```trig', 'preset: all', '```'];

		const result = parseTrigCircle(lines, 0, 2);

		expect(result.node).not.toBeNull();
		expect(result.node!.angles).toHaveLength(16); // all has 16 angles
	});

	it('should handle custom angles', () => {
		const lines = ['```trig', 'preset: custom', 'angles: pi/5', '```'];

		const result = parseTrigCircle(lines, 0, 3);

		expect(result.node).not.toBeNull();
		expect(result.node!.angles).toHaveLength(1);
	});
});

// ============================================================================
// INTEGRATION WITH MARKDOWN PARSER
// ============================================================================

describe('integration', () => {
	it('should be usable with markdown parser', async () => {
		// Dynamic import to test integration
		const { parseMarkdown } = await import('../../parser/markdown-parser');

		const markdown = `# Test

\`\`\`trig
preset: quarters
projections: true
\`\`\`

Some text after.`;

		const ast = parseMarkdown(markdown);

		expect(ast.children).toHaveLength(3); // heading, trig-circle, paragraph
		expect(ast.children[1].type).toBe('trig-circle');

		const trigNode = ast.children[1] as import('../../types/trig-circle').TrigCircleNode;
		expect(trigNode.config.preset).toBe('quarters');
		expect(trigNode.config.showProjections).toBe(true);
		expect(trigNode.angles).toHaveLength(4);
	});
});
