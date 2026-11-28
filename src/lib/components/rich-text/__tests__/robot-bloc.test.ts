/**
 * Bloc ```robot dans l'éditeur riche : un bloc de code `robot` porte le texte source (comme
 * ```tortue), y compris un bloc en erreur — sinon le bloc disparaîtrait à l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```robot\nquadrillage: 8 x 5\ndépart: 2, 1\narrivée: 6, 4\nproduire: oui\n```';

describe('bloc ```robot — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `robot` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'robot' },
			content: [
				{ type: 'text', text: 'quadrillage: 8 x 5\ndépart: 2, 1\narrivée: 6, 4\nproduire: oui' }
			]
		});
	});

	it('repart en ```robot identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```robot\nquadrillage: 99\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'robot' });
	});

	it('garde un bloc ```robot dans un item de liste', () => {
		const md = '1. Regarde :\n\n   ```robot\n   quadrillage: 4 x 4\n   départ: 1, 1\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```robot');
		expect(out).toContain('départ: 1, 1');
	});
});
