/**
 * Tests for the long-output fold helper.
 */

import { describe, it, expect } from 'vitest';
import { foldOutput, DEFAULT_MAX_VISIBLE_LINES } from './output-fold';

describe('foldOutput', () => {
	it('returns the input untouched when text is empty', () => {
		const result = foldOutput('');
		expect(result.isLong).toBe(false);
		expect(result.hidden).toBe(0);
		expect(result.preview).toBe('');
	});

	it('returns the input untouched for a single line', () => {
		const result = foldOutput('hello');
		expect(result.isLong).toBe(false);
		expect(result.preview).toBe('hello');
	});

	it('returns the input untouched at exactly the cap', () => {
		const lines = Array.from({ length: DEFAULT_MAX_VISIBLE_LINES }, (_, i) => `line ${i}`);
		const text = lines.join('\n');
		const result = foldOutput(text);
		expect(result.isLong).toBe(false);
		expect(result.preview).toBe(text);
		expect(result.hidden).toBe(0);
	});

	it('folds when the input exceeds the cap by one line', () => {
		const lines = Array.from({ length: DEFAULT_MAX_VISIBLE_LINES + 1 }, (_, i) => `line ${i}`);
		const text = lines.join('\n');
		const result = foldOutput(text);
		expect(result.isLong).toBe(true);
		// 21 lines total - 10 head - 5 tail = 6 hidden
		expect(result.hidden).toBe(6);
		expect(result.preview).toContain('line 0');
		expect(result.preview).toContain('line 9'); // last of head
		expect(result.preview).toContain('line 16'); // first of tail
		expect(result.preview).toContain('line 20'); // last of tail
		expect(result.preview).toContain('6 lignes masquées');
	});

	it('keeps exactly the head + tail in the preview', () => {
		const lines = Array.from({ length: 100 }, (_, i) => `L${i}`);
		const result = foldOutput(lines.join('\n'));
		// Head: L0..L9, Tail: L95..L99
		expect(result.preview).toContain('L0\n');
		expect(result.preview).toContain('L9\n');
		expect(result.preview).toContain('L95');
		expect(result.preview).toContain('L99');
		// Middle lines (L10..L94) must NOT appear
		expect(result.preview).not.toContain('L50');
		expect(result.preview).not.toContain('L80');
		expect(result.hidden).toBe(85);
	});

	it('respects a custom maxVisibleLines threshold', () => {
		const text = 'a\nb\nc\nd\ne';
		expect(foldOutput(text, 10).isLong).toBe(false);
		expect(foldOutput(text, 4).isLong).toBe(true);
	});

	it("preserves Windows-style line breaks when they don't trigger folding", () => {
		// V1: we split on \n only; a CRLF input is treated as a single long
		// line at split time, so it stays under the cap.
		const text = 'a\r\nb\r\nc';
		const result = foldOutput(text);
		expect(result.isLong).toBe(false);
		expect(result.preview).toBe(text);
	});
});
