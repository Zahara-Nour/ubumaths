/**
 * Pourcentage dans le PDF : `%` est un commentaire en Typst comme en LaTeX. La
 * formule `~20%~` doit donner « 20 % » (espace fine, symbole échappé), jamais un
 * `%` nu qui avalerait la fin de la ligne.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../../parser/markdown-parser';
import { generateTypst } from '../typst-generator';

describe('PDF (Typst) — pourcentage', () => {
	it.each([
		['Il reste ~20%~ du gâteau.', '20 thin \\%'],
		['Soit ~12.5%~ de remise.', '12","5 thin \\%'],
		['Calcule ~10% * 50~.', '10 thin \\%']
	])('%s', (source, expected) => {
		const typst = generateTypst(parseMarkdown(source), { includeSetup: false });
		expect(typst).toContain(expected);
		// aucun `%` non échappé : il commenterait la suite de la ligne
		expect(typst).not.toMatch(/(^|[^\\])%/m);
	});
});
