/**
 * Notebook outline — Markdown heading extractor.
 *
 * Walks the cells of a notebook, picks out h1 / h2 / h3 headings from
 * markdown cells, and returns a flat list suitable for rendering a
 * Colab-style table of contents in a sidebar. The renderer indents each
 * entry by `depth`, with click-to-scroll wiring on `cellId`.
 *
 * Headings deeper than h3 are clamped to depth 3 so very nested docs
 * still render readably in a 280-px column.
 *
 * Code, checkpoint, and HTML-only markdown cells contribute nothing.
 * If a markdown cell has multiple headings, each becomes its own entry —
 * they all link to the same cell (the scroll target is the cell, not the
 * heading line itself).
 */

import type { NotebookCell } from '$lib/types/notebook';

export interface OutlineEntry {
	cellId: string;
	depth: 1 | 2 | 3;
	text: string;
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

/**
 * Extract outline entries from notebook cells.
 *
 * @returns Headings in document order. Empty when no markdown headings exist.
 */
export function extractOutline(cells: NotebookCell[]): OutlineEntry[] {
	const entries: OutlineEntry[] = [];

	for (const cell of cells) {
		if (cell.type !== 'markdown') continue;
		if (!cell.source) continue;

		// Split on either CR/LF or LF — notebooks sometimes round-trip via
		// Jupyter files that normalise to either.
		const lines = cell.source.split(/\r?\n/);

		for (const rawLine of lines) {
			const line = rawLine.trim();
			if (!line.startsWith('#')) continue;

			const match = HEADING_RE.exec(line);
			if (!match) continue;

			const hashCount = match[1].length;
			const text = match[2].trim();
			if (text.length === 0) continue;

			const depth: 1 | 2 | 3 = hashCount === 1 ? 1 : hashCount === 2 ? 2 : 3;

			entries.push({ cellId: cell.id, depth, text });
		}
	}

	return entries;
}
