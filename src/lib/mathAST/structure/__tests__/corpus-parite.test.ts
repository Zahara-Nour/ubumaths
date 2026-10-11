/**
 * Parité avec `toLatex` sur un corpus de saisies réalistes
 * ========================================================
 *
 * `fixtures/corpus-saisies.txt` : ~200 saisies plausibles d'élève ou d'auteur
 * (collège, lycée), une par ligne, toutes lues par le parseur. Pour chacune, le
 * LaTeX marqué redonne `toLatex`, sous-expression par sous-expression. Une
 * modification de `toLatex` (parenthèses, séparateurs) sans répercussion dans
 * `build-structure.ts` casse ce test : sinon la formule bougerait au survol.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toLatex } from '../../latex-generator';
import { parseLatexSafe } from '../../parser';
import { buildStructure, stripMarkers } from '..';

// Constantes
const CORPUS = readFileSync(new URL('./fixtures/corpus-saisies.txt', import.meta.url), 'utf8')
	.split('\n')
	.filter((line) => line.trim() !== '');

// Fonctions
/** `x^{2}` ≡ `x^2` : le marqueur d'un exposant exige les accolades */
function unbrace(latex: string): string {
	return latex.replace(/([\^_])\{([^{}\\]|\\[a-zA-Z]+)\}/g, '$1$2');
}

describe('corpus de saisies : rendu identique à toLatex', () => {
	it('le corpus est chargé', () => {
		expect(CORPUS.length).toBeGreaterThan(150);
	});

	it.each(CORPUS)('%s', (latex) => {
		const parsed = parseLatexSafe(latex);
		expect(parsed.errors).toEqual([]);
		const ast = parsed.ast;
		if (!ast) throw new Error(`${latex} : pas d'AST`);
		const structure = buildStructure(ast);
		expect(unbrace(stripMarkers(structure.latex))).toBe(unbrace(toLatex(ast)));
		for (const node of structure.nodes) {
			expect(unbrace(stripMarkers(node.latex))).toBe(unbrace(toLatex(node.ast)));
		}
	});
});
