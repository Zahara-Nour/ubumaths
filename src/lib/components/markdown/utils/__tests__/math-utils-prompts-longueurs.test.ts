/**
 * Cases dans une formule maison à longueurs primées (`~A'B'=?~`, Thalès)
 *
 * En produit, `A'B'` est une erreur de lecture : la formule n'a pas de case repérée et
 * s'affiche figée. Dans une question lue en longueur, la case doit être trouvée.
 */
import { describe, expect, it } from 'vitest';
import { extractPromptIndices, hasPrompts } from '../math-utils';

describe('cases d’une formule maison à longueurs (sens de la question)', () => {
	it("mode longueur : ~A'B'=?~ a sa case", () => {
		// Comme `x=?` : la case de la syntaxe maison est numérotée à partir de 1
		expect(extractPromptIndices("A'B'=?", 'custom')).toEqual([]);
		expect(extractPromptIndices("A'B'=?", 'custom', 'length')).toEqual([1]);
		expect(hasPrompts("A'B'=?", 'custom', 'length')).toBe(true);
	});

	it("mode longueur : 2A'B'^2=?+? a ses deux cases", () => {
		expect(extractPromptIndices("2A'B'^2=?+?", 'custom', 'length')).toEqual([1, 2]);
	});

	it('sans sens (produit) : comportement d’avant, A’B’ illisible, aucune case', () => {
		expect(hasPrompts("A'B'=?", 'custom')).toBe(false);
		expect(extractPromptIndices('2AB^2=?', 'custom')).toEqual([1]);
	});
});
