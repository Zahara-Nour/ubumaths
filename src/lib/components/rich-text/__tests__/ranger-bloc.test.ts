/**
 * Bloc ```ranger dans l'éditeur riche : un bloc de code `ranger` porte le texte
 * source (comme ```choix), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```ranger — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `ranger` avec son texte', () => {
		const json = markdownToTipTap('```ranger\nsigne: >\n- 9\n- 5\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'ranger' },
			content: [{ type: 'text', text: 'signe: >\n- 9\n- 5' }]
		});
	});

	it('repart en ```ranger identique', () => {
		const md = 'Range ces nombres.\n\n```ranger\n- $\\frac{2}{7}$\n- $\\frac{3}{7}$\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```ranger\n- seul\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'ranger' });
	});
});
