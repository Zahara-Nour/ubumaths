/**
 * Bloc ```partage dans l'éditeur riche : un bloc de code `partage` porte le
 * texte source (comme ```horloge), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```partage — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `partage` avec son texte', () => {
		const json = markdownToTipTap('```partage\nforme: bande 8\ngris: 3\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'partage' },
			content: [{ type: 'text', text: 'forme: bande 8\ngris: 3' }]
		});
	});

	it('repart en ```partage identique', () => {
		const md = '```partage\nforme: grille 3×4\ngris: 1, 5, 9\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```partage\nforme: bande 99\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'partage' });
	});

	it('garde un bloc ```partage dans un item de liste', () => {
		const md = '1. Combien de parts ?\n\n   ```partage\n   forme: bande 4\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```partage');
		expect(out).toContain('forme: bande 4');
	});
});
