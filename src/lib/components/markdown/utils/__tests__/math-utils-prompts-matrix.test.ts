/**
 * Cases dans une matrice à trous (2026-10-05) : `$A=\begin{pmatrix}?&?\\?&?\end{pmatrix}$`
 * générait ses cases, mais l'élève n'en voyait AUCUNE — la recherche des cases
 * ne parcourait pas les lignes (`rows`) d'un nœud `matrix`, la formule était
 * rendue statique.
 */
import { describe, expect, it } from 'vitest';
import { extractPromptIndices, hasPrompts } from '../math-utils';

const P = (n: number) => String.raw`\placeholder[${n}]{}`;

describe('cases dans une matrice', () => {
	it('2 × 2 : les quatre cases', () => {
		const latex = String.raw`\begin{pmatrix}${P(0)}&${P(1)}\\${P(2)}&${P(3)}\end{pmatrix}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([0, 1, 2, 3]);
	});

	it('nom devant, coefficients connus mêlés aux cases', () => {
		const latex = String.raw`A^{2}=\begin{pmatrix}1&${P(0)}\\${P(1)}&4\end{pmatrix}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([0, 1]);
	});

	it('colonne seule, sans \\vec', () => {
		const latex = String.raw`X=\begin{pmatrix}${P(0)}\\${P(1)}\end{pmatrix}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([0, 1]);
	});

	it('3 × 3 en bmatrix', () => {
		const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(P);
		const latex = String.raw`\begin{bmatrix}${cells.slice(0, 3).join('&')}\\${cells.slice(3, 6).join('&')}\\${cells.slice(6).join('&')}\end{bmatrix}`;
		expect(extractPromptIndices(latex, 'latex')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
	});

	it('matrice sans case : aucune case', () => {
		expect(hasPrompts(String.raw`\begin{pmatrix}1&2\\3&4\end{pmatrix}`, 'latex')).toBe(false);
	});
});
