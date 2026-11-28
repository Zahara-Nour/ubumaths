/**
 * Bloc ```yohaku dans l'éditeur riche : un bloc de code `yohaku` porte le texte source
 * (comme ```labyrinthe), y compris un bloc en erreur — sinon le bloc disparaîtrait à
 * l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```yohaku\nopération: produit\nligne: [x+2] | [x+3]\nligne: [2x+1] | x+1\n```';

describe('bloc ```yohaku — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `yohaku` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'yohaku' },
			content: [
				{ type: 'text', text: 'opération: produit\nligne: [x+2] | [x+3]\nligne: [2x+1] | x+1' }
			]
		});
	});

	it('repart en ```yohaku identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```yohaku\nopération: quotient\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'yohaku' });
	});

	it('garde un bloc ```yohaku dans un item de liste', () => {
		const md =
			'1. Remplis :\n\n   ```yohaku\n   opération: somme\n   ligne: [x] | 2\n   ligne: 3 | 4\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```yohaku');
		expect(out).toContain('opération: somme');
	});
});
