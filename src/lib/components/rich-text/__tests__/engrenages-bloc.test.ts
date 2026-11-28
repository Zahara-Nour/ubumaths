/**
 * Bloc ```engrenages dans l'éditeur riche : un bloc de code `engrenages` porte le texte
 * source (comme ```qr), y compris un bloc en erreur — sinon le bloc disparaîtrait à
 * l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```engrenages\nroues: 12 ; 18\nlégendes: A ; B\n```';

describe('bloc ```engrenages — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `engrenages` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'engrenages' },
			content: [{ type: 'text', text: 'roues: 12 ; 18\nlégendes: A ; B' }]
		});
	});

	it('repart en ```engrenages identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```engrenages\nroues: 12\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'engrenages' });
	});

	it('garde un bloc ```engrenages dans un item de liste', () => {
		const md = '1. Regarde :\n\n   ```engrenages\n   roues: 10 ; 15\n   légendes: P ; Q\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```engrenages');
		expect(out).toContain('légendes: P ; Q');
	});
});
