/**
 * Bloc ```monnaie dans l'éditeur riche : un bloc de code `monnaie` porte le
 * texte source (comme ```collection), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```monnaie — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `monnaie` avec son texte', () => {
		const json = markdownToTipTap('```monnaie\nbillets: 20 10\npièces: 2\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'monnaie' },
			content: [{ type: 'text', text: 'billets: 20 10\npièces: 2' }]
		});
	});

	it('repart en ```monnaie identique', () => {
		const md = '```monnaie\nbillets: ; 1×10\npièces: 10×1 ;\nlégendes: Léa ; Tom\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```monnaie\npièces: 3\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'monnaie' });
	});

	it('garde un bloc ```monnaie dans un item de liste', () => {
		const md = '1. Combien d’argent :\n\n   ```monnaie\n   montant: 48\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```monnaie');
		expect(out).toContain('montant: 48');
	});
});
