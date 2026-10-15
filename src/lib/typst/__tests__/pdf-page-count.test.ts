/**
 * Nombre de pages d'un PDF compilé (aperçu de la fiche, ADR 0030 lot 4)
 *
 * Les PDF de Typst écrivent chaque page en clair (`/Type /Page`), et
 * l'arbre des pages une fois (`/Type /Pages`), qui ne compte pas.
 */
import { describe, expect, it } from 'vitest';
import { pdfPageCount } from '../pdf-page-count';

function pdf(text: string): Uint8Array {
	return new TextEncoder().encode(text);
}

describe('pdfPageCount', () => {
	it('compte les pages, pas l’arbre des pages', () => {
		const three = pdf(
			'%PDF-1.7\n1 0 obj\n<< /Type /Pages /Count 3 >>\n2 0 obj\n<< /Type /Page >>\n' +
				'3 0 obj\n<</Type/Page/Parent 1 0 R>>\n4 0 obj\n<<\n  /Type /Page\n  /Parent 1 0 R\n>>'
		);
		expect(pdfPageCount(three)).toBe(3);
	});

	it('PDF vide ou sans page : 0', () => {
		expect(pdfPageCount(new Uint8Array())).toBe(0);
		expect(pdfPageCount(pdf('%PDF-1.7\n<< /Type /Pages /Count 0 >>'))).toBe(0);
	});
});
