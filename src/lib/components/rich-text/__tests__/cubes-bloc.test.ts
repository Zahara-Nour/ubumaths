/**
 * Bloc ```cubes dans l'éditeur riche : un bloc de code `cubes` porte le
 * texte source (comme ```partage), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```cubes — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `cubes` avec son texte', () => {
		const json = markdownToTipTap('```cubes\nhauteurs: 2 1 / 1 0\nvue: face\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'cubes' },
			content: [{ type: 'text', text: 'hauteurs: 2 1 / 1 0\nvue: face' }]
		});
	});

	it('repart en ```cubes identique', () => {
		const md = '```cubes\nhauteurs: 2 1 1 / 1 0 1\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```cubes\nhauteurs: 9\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'cubes' });
	});

	it('garde un bloc ```cubes dans un item de liste', () => {
		const md = '1. Combien de cubes ?\n\n   ```cubes\n   hauteurs: 2 1\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```cubes');
		expect(out).toContain('hauteurs: 2 1');
	});
});

describe('bloc ```patron — aller-retour de l’éditeur riche', () => {
	it('repart en ```patron identique, grille en retrait comprise', () => {
		const md =
			'```patron\nsolide: cube\nforme:\n  . X . .\n  X X X X\n  . . X .\nsommets: A B C D E ? G H\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});
});

describe('bloc ```solide — aller-retour de l’éditeur riche', () => {
	it('repart en ```solide identique, en erreur aussi', () => {
		const md = '```solide\nforme: pave 4 2 3\nsommets: A B C D E F G H\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
		const json = markdownToTipTap('```solide\nforme: sphere 3\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'solide' });
	});
});
