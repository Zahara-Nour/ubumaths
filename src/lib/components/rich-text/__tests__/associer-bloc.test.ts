/**
 * Bloc ```associer dans l'éditeur riche : un bloc de code `associer` porte le texte
 * source (comme ```ranger), y compris un bloc en erreur.
 */
import { describe, expect, it } from 'vitest';
import { markdownToTipTap } from '../markdown-import';
import { tipTapToMarkdown } from '../markdown-export';

describe('bloc ```associer — aller-retour de l’éditeur riche', () => {
	it('arrive en bloc de code `associer` avec son texte', () => {
		const json = markdownToTipTap('```associer\n- a -> 1\n- b -> 2\n- -> 3\n```');
		expect(json.content?.[0]).toEqual({
			type: 'codeBlock',
			attrs: { language: 'associer' },
			content: [{ type: 'text', text: '- a -> 1\n- b -> 2\n- -> 3' }]
		});
	});

	it('repart en ```associer identique', () => {
		const md =
			'Associe.\n\n```associer\n- $u_{n+1}=2u_n$ -> géométrique\n- $u_{n+1}=u_n+2$ -> arithmétique\n- -> ni l’une ni l’autre\n```';
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});

	it('garde un bloc en erreur au lieu de le faire disparaître', () => {
		const json = markdownToTipTap('```associer\n- seul -> 1\n```');
		expect(json.content?.[0]?.attrs).toEqual({ language: 'associer' });
	});

	it('lot 2 : une courbe dans un élément repart en ````associer identique', () => {
		const md = [
			'Associe.',
			'',
			'````associer',
			'- ```courbe',
			'  x: -3 ; 3',
			'  y: -3 ; 3',
			'  f(x) = 2*x',
			'  ```',
			'  -> linéaire',
			'- $x^2$ -> carré',
			'- -> constante',
			'````'
		].join('\n');
		expect(tipTapToMarkdown(markdownToTipTap(md)).trim()).toBe(md);
	});
});
