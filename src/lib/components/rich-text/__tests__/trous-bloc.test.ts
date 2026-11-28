/**
 * Bloc ```trous dans l'éditeur riche : un bloc de code `trous` porte le texte
 * source (comme ```associer), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```trous — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `trous` avec son texte', () => {
		const json = markdownToTipTap('```trous\nA [x], B [y].\nintrus: z\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'trous' },
			content: [{ type: 'text', text: 'A [x], B [y].\nintrus: z' }]
		});
	});

	it('repart en ```trous identique', () => {
		const md =
			'Complète.\n\n```trous\nUne suite définie par $u_{n+1} = u_n + r$ est [arithmétique], de raison [$r$].\nintrus: géométrique ; $u_0$\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```trous\nSans trou.\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'trous' });
	});
});
