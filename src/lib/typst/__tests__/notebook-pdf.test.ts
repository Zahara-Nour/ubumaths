/**
 * Tests for `buildNotebookPdfFilename`.
 *
 * The full `generateNotebookPdf` pipeline isn't unit-testable here (it
 * requires the Typst WASM runtime); that's covered by manual e2e + the
 * shared `generatePdfFromTypst` test suite.
 */

import { describe, it, expect } from 'vitest';
import { buildNotebookPdfFilename } from '../notebook-pdf';

describe('buildNotebookPdfFilename', () => {
	const FIXED_DATE = new Date('2026-06-04T12:00:00.000Z');

	it('appends YYYY-MM-DD before the extension', () => {
		const name = buildNotebookPdfFilename('My Notebook', FIXED_DATE);
		expect(name).toMatch(/_2026-06-04\.pdf$/);
	});

	it('strips French diacritics', () => {
		const name = buildNotebookPdfFilename('Démo statistiques', FIXED_DATE);
		expect(name).toBe('Demo_statistiques_2026-06-04.pdf');
	});

	it('squashes consecutive special characters into a single underscore', () => {
		const name = buildNotebookPdfFilename('Mon // notebook !! TP', FIXED_DATE);
		expect(name).toBe('Mon_notebook_TP_2026-06-04.pdf');
	});

	it('trims leading and trailing underscores', () => {
		const name = buildNotebookPdfFilename('  /test/  ', FIXED_DATE);
		expect(name).toBe('test_2026-06-04.pdf');
	});

	it('falls back to "notebook" when the sanitized title is empty', () => {
		const name = buildNotebookPdfFilename('!!!', FIXED_DATE);
		expect(name).toBe('notebook_2026-06-04.pdf');
	});

	it('truncates very long titles to 80 chars before the date', () => {
		const name = buildNotebookPdfFilename('x'.repeat(200), FIXED_DATE);
		expect(name).toMatch(/^x{80}_2026-06-04\.pdf$/);
	});

	it('preserves underscores and dashes already in the title', () => {
		const name = buildNotebookPdfFilename('TP-1_intro', FIXED_DATE);
		expect(name).toBe('TP-1_intro_2026-06-04.pdf');
	});
});
