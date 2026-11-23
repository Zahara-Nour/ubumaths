/**
 * Bloc ```schema-barres dans l'éditeur riche : un bloc de code `schema-barres`
 * porte le texte source (comme ```partage), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```schema-barres — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `schema-barres` avec son texte', () => {
		const json = markdownToTipTap('```schema-barres\nOr : ? (4) ; 70 (2)\ntotal : 320 €\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'schema-barres' },
			content: [{ type: 'text', text: 'Or : ? (4) ; 70 (2)\ntotal : 320 €' }]
		});
	});

	it('repart en ```schema-barres identique', () => {
		const md = '```schema-barres\nOr : ? (4) ; -70 (2) = 9 €\nArgent : ? (4)\ntotal : 320 €\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```schema-barres\nsans deux-points\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'schema-barres' });
	});

	it('garde un bloc ```schema-barres dans un item de liste', () => {
		const md = '1. Combien ?\n\n   ```schema-barres\n   A : ? (4)\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```schema-barres');
		expect(out).toContain('A : ? (4)');
	});
});
