/**
 * Cases dans une formule que le parseur ne sait pas lire (`\vec`, `\overrightarrow`).
 *
 * Le parseur refuse ces commandes ; sans repli, la formule était rendue
 * statique et l'élève ne voyait aucune case (A-01 géométrie repérée).
 */
import { describe, expect, it } from 'vitest';
import { extractPromptIndices, hasPrompts } from '../math-utils';

describe('cases dans une formule non lue par le parseur', () => {
	it('trouve les deux cases de $\\vec{n}\\begin{pmatrix}?\\\\?\\end{pmatrix}$', () => {
		const latex = String.raw`\vec{n}\begin{pmatrix}\placeholder[0]{}\\\placeholder[1]{}\end{pmatrix}`;
		expect(hasPrompts(latex, 'latex')).toBe(true);
		expect(extractPromptIndices(latex, 'latex')).toEqual([0, 1]);
	});

	it('trouve la case après un produit scalaire de vecteurs \\overrightarrow', () => {
		const latex = String.raw`\overrightarrow{AB}\cdot\overrightarrow{AC}=\placeholder[3]{}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([3]);
	});

	it('dédoublonne et trie les indices', () => {
		const latex = String.raw`\vec{u}\begin{pmatrix}\placeholder[2]{}\\\placeholder[1]{}\end{pmatrix}+\vec{v}\placeholder[2]{}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([1, 2]);
	});

	it('formule non lue sans case : aucune case', () => {
		expect(hasPrompts(String.raw`\vec{n}\begin{pmatrix}2\\3\end{pmatrix}`, 'latex')).toBe(false);
	});

	it('formule lue normalement : inchangé', () => {
		expect(extractPromptIndices(String.raw`x+\placeholder[0]{}=3`, 'latex')).toEqual([0]);
	});
});

/**
 * Formule refusée par le parseur pour sa taille (> 10 000 caractères :
 * `SecurityError`) : la détection des cases ne doit pas lever — elle est
 * appelée au RENDU d'un paragraphe (ParagraphNode), avant tout filtrage ; une
 * exception y faisait tomber tout le rendu (un message de chat de 20 000
 * caractères, 2026-10-05).
 */
describe('formule trop longue pour le parseur', () => {
	it('ne lève pas ; repli sur le repérage textuel des cases', () => {
		const long = 'x+'.repeat(10_000);
		expect(() => hasPrompts(long, 'latex')).not.toThrow();
		expect(hasPrompts(long, 'latex')).toBe(false);
		expect(hasPrompts(long, 'custom')).toBe(false);
		expect(extractPromptIndices(`${long}\\placeholder[4]{}`, 'latex')).toEqual([4]);
	});
});
