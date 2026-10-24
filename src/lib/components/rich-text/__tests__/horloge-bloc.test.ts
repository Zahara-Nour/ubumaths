/**
 * Bloc ```horloge dans l'éditeur riche : un bloc de code `horloge` porte le
 * texte source (comme ```qr), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```horloge — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `horloge` avec son texte', () => {
		const json = markdownToTipTap('```horloge\nheure: 9 h 30\nchiffres: quarts\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'horloge' },
			content: [{ type: 'text', text: 'heure: 9 h 30\nchiffres: quarts' }]
		});
	});

	it('repart en ```horloge identique', () => {
		const md = '```horloge\nheure: 8 h 30 ; 8 h 45\nlégendes: Départ ; Arrivée\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```horloge\nheure: 25 h\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'horloge' });
	});

	it('garde un bloc ```horloge dans un item de liste', () => {
		const md = '1. Lis l’heure :\n\n   ```horloge\n   heure: 9 h\n   ```';
		const out = tipTapToMarkdown(markdownToTipTap(md));
		expect(out).toContain('```horloge');
		expect(out).toContain('heure: 9 h');
	});
});
