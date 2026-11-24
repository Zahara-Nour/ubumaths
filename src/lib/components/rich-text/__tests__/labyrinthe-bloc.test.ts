/**
 * Bloc ```labyrinthe dans l'éditeur riche : un bloc de code `labyrinthe` porte le texte
 * source (comme ```robot), y compris un bloc en erreur — sinon le bloc disparaîtrait à
 * l'enregistrement.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

const BLOC = '```labyrinthe\ngrille: 6 x 4\nrègle: premier\nparcourir: oui\n```';

describe('bloc ```labyrinthe — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `labyrinthe` avec son texte', () => {
		expect(markdownToTipTap(BLOC).content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'labyrinthe' },
			content: [{ type: 'text', text: 'grille: 6 x 4\nrègle: premier\nparcourir: oui' }]
		});
	});

	it('repart en ```labyrinthe identique', () => {
		expect(tipTapToMarkdown(markdownToTipTap(BLOC)).trim()).toBe(BLOC);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```labyrinthe\ngrille: 99\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'labyrinthe' });
	});

	it('garde un bloc ```labyrinthe dans un item de liste', () => {
		const md = '1. Regarde :\n\n   ```labyrinthe\n   grille: 4 x 3\n   règle: premier\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```labyrinthe');
		expect(out).toContain('règle: premier');
	});
});
