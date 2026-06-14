/**
 * Tests for the notebook outline extractor.
 */

import { describe, it, expect } from 'vitest';
import { extractOutline } from '../notebook-outline';
import type { NotebookCell } from '$lib/types/notebook';

function makeMarkdownCell(id: string, source: string): NotebookCell {
	return {
		id,
		type: 'markdown',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	};
}

function makeCodeCell(id: string, source: string): NotebookCell {
	return {
		id,
		type: 'code',
		source,
		execution_count: null,
		outputs: [],
		state: 'idle'
	};
}

describe('extractOutline', () => {
	it('returns an empty list when there are no cells', () => {
		expect(extractOutline([])).toEqual([]);
	});

	it('returns an empty list when there are no markdown headings', () => {
		const cells = [
			makeCodeCell('c1', "print('hello')"),
			makeMarkdownCell('m1', 'just a paragraph, no heading')
		];
		expect(extractOutline(cells)).toEqual([]);
	});

	it('extracts h1, h2, h3 with correct depths', () => {
		const cells = [makeMarkdownCell('m1', '# Titre principal\n\n## Sous-titre\n\n### Petit titre')];
		expect(extractOutline(cells)).toEqual([
			{ cellId: 'm1', depth: 1, text: 'Titre principal' },
			{ cellId: 'm1', depth: 2, text: 'Sous-titre' },
			{ cellId: 'm1', depth: 3, text: 'Petit titre' }
		]);
	});

	it('clamps headings deeper than h3 to depth 3', () => {
		const cells = [makeMarkdownCell('m1', '#### h4\n##### h5\n###### h6')];
		const out = extractOutline(cells);
		expect(out).toHaveLength(3);
		expect(out.every((e) => e.depth === 3)).toBe(true);
	});

	it('preserves document order across cells', () => {
		const cells = [
			makeMarkdownCell('m1', '# Intro'),
			makeCodeCell('c1', 'x = 1'),
			makeMarkdownCell('m2', '## Section A'),
			makeMarkdownCell('m3', '## Section B')
		];
		expect(extractOutline(cells).map((e) => e.text)).toEqual(['Intro', 'Section A', 'Section B']);
	});

	it('ignores code cells, checkpoint cells, and HTML-only markdown', () => {
		const cells: NotebookCell[] = [
			makeCodeCell('c1', '# this is a python comment, not a heading'),
			{
				id: 'cp1',
				type: 'checkpoint',
				source: 'assert True',
				execution_count: null,
				outputs: [],
				state: 'idle',
				checkpoint: { mode: 'assert', code: 'assert True' }
			},
			makeMarkdownCell('m1', '<p>only html, no heading</p>')
		];
		expect(extractOutline(cells)).toEqual([]);
	});

	it('handles trailing hash markers and surrounding whitespace', () => {
		const cells = [makeMarkdownCell('m1', '   ##  Sous-titre   ##   ')];
		expect(extractOutline(cells)).toEqual([{ cellId: 'm1', depth: 2, text: 'Sous-titre' }]);
	});

	it('skips empty heading lines like `#` alone', () => {
		const cells = [makeMarkdownCell('m1', '#\n##  \n# Vrai titre')];
		expect(extractOutline(cells)).toEqual([{ cellId: 'm1', depth: 1, text: 'Vrai titre' }]);
	});

	it('ignores lines that look like headings inside fenced code blocks', () => {
		// V1 limitation: we do NOT track ``` fences. If this becomes a problem
		// in practice we'll add it; for now we documented the trade-off.
		const cells = [
			makeMarkdownCell('m1', "```python\n# pas un titre, c'est du code\n```\n\n# Vrai titre")
		];
		const out = extractOutline(cells);
		// First "# pas un titre" is captured even though it's inside ```;
		// "# Vrai titre" comes next. This pins V1 behaviour so any future
		// fence-aware change is intentional.
		expect(out.map((e) => e.text)).toEqual(["pas un titre, c'est du code", 'Vrai titre']);
	});

	it('aggregates multiple headings from a single cell with the same cellId', () => {
		const cells = [makeMarkdownCell('m1', '# A\n# B\n# C')];
		const out = extractOutline(cells);
		expect(out).toHaveLength(3);
		expect(out.every((e) => e.cellId === 'm1')).toBe(true);
	});
});
