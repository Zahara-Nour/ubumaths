import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, NUMBERING_SCHEMES } from '../list-numbering';

describe('list numbering — hiérarchie 1) a) i)', () => {
	it('defines the 1) a) i) scheme', () => {
		expect(NUMBERING_SCHEMES['1-a-i'].levels).toEqual([
			{ style: 'numeric', separator: ')' },
			{ style: 'alpha', separator: ')' },
			{ style: 'roman', separator: ')' }
		]);
	});

	it('uses it by default for nested and flat lists', () => {
		// Même hiérarchie que le PDF (ubumark/generators/typst-generator.ts) ;
		// une liste à un seul niveau est numérotée 1) 2) 3) (choix de David, 2026-10-18)
		expect(DEFAULT_CONFIG.schemeWithNesting).toBe('1-a-i');
		expect(DEFAULT_CONFIG.schemeWithoutNesting).toBe('1-a-i');
	});

	it('styles the scheme in CSS, or the screen falls back to nothing', () => {
		// ListNode pose `scheme-1-a-i` et coupe la puce native (`list-style: none`) :
		// sans règle CSS, les questions s'afficheraient sans aucun numéro.
		const css = readFileSync('src/lib/styles/list-numbering.css', 'utf8');
		const rule = (selector: string) => {
			// Le sélecteur peut ouvrir la règle (` {`) ou ouvrir une liste (`,`)
			const at = css.search(new RegExp(`${selector.replace(/[.]/g, '\\.')} > li::before[ ,]`));
			return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
		};
		expect(rule('.scheme-1-a-i.enumerate-depth-1')).toMatch(/content: counter\(enum1\) '\) '/);
		expect(rule('.scheme-1-a-i .enumerate-depth-2')).toContain('lower-alpha');
		expect(rule('.scheme-1-a-i .enumerate-depth-3')).toContain('lower-roman');
	});
});
