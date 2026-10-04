/**
 * Export PDF d'un carnet d'ÉLÈVE lu par quelqu'un d'autre (audit du 2026-10-04) :
 * le markdown de l'élève passerait par Typst et ses images externes seraient
 * téléchargées par le navigateur du prof. La fonction refuse, avant toute
 * préparation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PythonNotebook } from '$lib/types/notebook';

const generatePdfFromTypst = vi.hoisted(() =>
	vi.fn(async () => ({ success: true as const, data: new Uint8Array([1]) }))
);
const getTypstService = vi.hoisted(() => vi.fn());

vi.mock('../pdf-generator', () => ({ generatePdfFromTypst }));
vi.mock('../service', () => ({ getTypstService }));

import { FOREIGN_NOTEBOOK_PDF_ERROR, generateNotebookPdf } from '../notebook-pdf';

const notebook = {
	id: '00000000-0000-4000-8000-000000000001',
	title: 'Carnet',
	content: {
		cells: [
			{
				id: 'm1',
				type: 'markdown',
				source: '![piège](https://exemple.invalid/x.png)',
				execution_count: null,
				outputs: [],
				state: 'idle'
			}
		]
	}
} as unknown as PythonNotebook;

beforeEach(() => {
	generatePdfFromTypst.mockClear();
	getTypstService.mockClear();
});

describe('generateNotebookPdf — carnet d’élève lu par autrui', () => {
	it('refuse sans rien préparer ni compiler', async () => {
		const result = await generateNotebookPdf({
			notebook,
			options: {} as never,
			foreignStudentNotebook: true
		});
		expect(result).toEqual({ success: false, error: FOREIGN_NOTEBOOK_PDF_ERROR });
		expect(generatePdfFromTypst).not.toHaveBeenCalled();
		expect(getTypstService).not.toHaveBeenCalled();
	});

	it('carnet de l’auteur : l’export part', async () => {
		const result = await generateNotebookPdf({
			notebook,
			options: {} as never,
			foreignStudentNotebook: false
		});
		expect(result.success).toBe(true);
		expect(generatePdfFromTypst).toHaveBeenCalledTimes(1);
	});
});
