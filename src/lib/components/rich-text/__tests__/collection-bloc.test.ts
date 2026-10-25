/**
 * Bloc ```collection dans l'éditeur riche : un bloc de code `collection` porte le
 * texte source (comme ```qr), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```collection — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `collection` avec son texte', () => {
		const json = markdownToTipTap('```collection\ndizaines: 3\nunités: 5\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'collection' },
			content: [{ type: 'text', text: 'dizaines: 3\nunités: 5' }]
		});
	});

	it('repart en ```collection identique', () => {
		const md = '```collection\nunités: 12 ; 21\nlégendes: Léa ; Tom\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```collection\nunités: 101\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'collection' });
	});

	it('garde un bloc ```collection dans un item de liste', () => {
		const md = '1. Combien de jetons :\n\n   ```collection\n   unités: 9\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```collection');
		expect(out).toContain('unités: 9');
	});
});
