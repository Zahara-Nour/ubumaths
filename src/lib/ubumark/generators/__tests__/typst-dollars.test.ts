/**
 * Fiches PDF : deux limites du découpage des formules (2026-10-13), sans exercice
 * concerné à cette date.
 *
 * - `\$` dans une formule affichait « ___ESCAPED_DOLLAR___ » ;
 * - une formule `$…$` dans le `\text{…}` d'une formule en ligne la coupait en morceaux.
 *
 * Les sorties attendues ont été compilées avec le compilateur de production.
 */

import { describe, it, expect } from 'vitest';
import { markdownToTypst } from '../typst-generator';

/** Corps du document Typst, sans le préambule */
async function body(markdown: string): Promise<string> {
	const typst = await markdownToTypst(markdown, { includeSetup: false, language: 'fr' });
	return typst.slice(typst.indexOf('\n', typst.indexOf('fin de l’en-tête')) + 1);
}

describe('formules du PDF : `\\$` et `$` dans un `\\text{…}`', () => {
	it('`\\$` dans une formule en ligne', async () => {
		expect(await body('Prix : $5\\$ + 3\\$$ fin.')).toBe('Prix : $5\\$ + 3\\$$ fin.');
	});

	it('`\\$` dans une formule de bloc', async () => {
		expect(await body('Bloc :\n\n$$5\\$$$\n')).toBe('Bloc :\n\n$ 5\\$ $');
	});

	it('formule dans le `\\text{…}` d’une formule en ligne', async () => {
		expect(await body('Soit $x = \\text{ si $a>0$ }$ fin.')).toBe('Soit $x = " si " a>0 " "$ fin.');
	});

	it('`\\$` hors formule (non-régression)', async () => {
		expect(await body('Texte 5\\$ seul.')).toBe('Texte 5\\$ seul.');
	});
});
