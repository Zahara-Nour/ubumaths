import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_CONFIG, NUMBERING_SCHEMES } from '../list-numbering';

describe('list numbering — hiérarchie a) 1) i)', () => {
	it('defines the a) 1) i) scheme', () => {
		expect(NUMBERING_SCHEMES['a-1-i'].levels).toEqual([
			{ style: 'alpha', separator: ')' },
			{ style: 'numeric', separator: ')' },
			{ style: 'roman', separator: ')' }
		]);
	});

	it('uses it by default for nested lists, letters for flat ones', () => {
		// Même hiérarchie que le PDF (ubumark/generators/typst-generator.ts)
		expect(DEFAULT_CONFIG.schemeWithNesting).toBe('a-1-i');
		expect(NUMBERING_SCHEMES[DEFAULT_CONFIG.schemeWithoutNesting].levels[0].style).toBe('alpha');
	});

	it('styles the scheme in CSS, or the screen falls back to nothing', () => {
		// ListNode pose `scheme-a-1-i` et coupe la puce native (`list-style: none`) :
		// sans règle CSS, les questions s'afficheraient sans aucun numéro.
		const css = readFileSync('src/lib/styles/list-numbering.css', 'utf8');
		const rule = (selector: string) => {
			// Le sélecteur peut ouvrir la règle (` {`) ou ouvrir une liste (`,`)
			const at = css.search(new RegExp(`${selector.replace(/[.]/g, '\\.')} > li::before[ ,]`));
			return at === -1 ? '' : css.slice(at, css.indexOf('}', at));
		};
		expect(rule('.scheme-a-1-i.enumerate-depth-1')).toContain('lower-alpha');
		expect(rule('.scheme-a-1-i .enumerate-depth-2')).toMatch(/content: counter\(enum2\) '\) '/);
		expect(rule('.scheme-a-1-i .enumerate-depth-3')).toContain('lower-roman');
	});
});
