/**
 * Onglet « Matrice » du clavier virtuel : les touches attendues, et chaque
 * gabarit relu par la correction (aller-retour touche → jugement).
 */

import { describe, it, expect } from 'vitest';
import type { VirtualKeyboardKeycap } from 'mathlive';
import { buildMatricesKeyboardLayout, MATRICES_LAYOUT_ID } from '../keyboard-matrices';
import { judgeMatrixAnswer } from '../matrix-answer';

function keycaps(): Partial<VirtualKeyboardKeycap>[] {
	const layout = buildMatricesKeyboardLayout();
	const rows = 'rows' in layout ? layout.rows : [];
	return rows
		.flat()
		.filter((key): key is Partial<VirtualKeyboardKeycap> => typeof key !== 'string');
}

/** Insertion d'une touche, cases remplies dans l'ordre par `values` */
function filled(tooltip: string, values: string[]): string {
	const key = keycaps().find((candidate) => candidate.tooltip === tooltip);
	if (!key?.insert) throw new Error(`touche absente : ${tooltip}`);
	let index = 0;
	return key.insert.replace(/#[0?]/g, () => values[index++]);
}

describe('onglet « Matrice »', () => {
	it('identifiant et libellé', () => {
		const layout = buildMatricesKeyboardLayout();
		expect(layout.id).toBe(MATRICES_LAYOUT_ID);
		expect(layout.label).toBe('Matrice');
	});

	it.each([
		[
			'Matrice 2 × 2',
			['1', '-2', '\\frac{1}{2}', '0'],
			'\\begin{pmatrix}1&-2\\\\0.5&0\\end{pmatrix}'
		],
		[
			'Matrice 3 × 3',
			['1', '0', '0', '0', '1', '0', '0', '0', '1'],
			'\\begin{pmatrix}1&0&0\\\\0&1&0\\\\0&0&1\\end{pmatrix}'
		],
		['Matrice colonne (2 lignes)', ['3', '4'], '\\begin{pmatrix}3\\\\4\\end{pmatrix}'],
		['Matrice ligne (2 colonnes)', ['0.4', '0.6'], '\\begin{pmatrix}0.4&0.6\\end{pmatrix}']
	])('%s : relue par la correction', (tooltip, values, expected) => {
		expect(judgeMatrixAnswer(filled(tooltip, values), expected).status).toBe('correct');
	});

	it('ajout de ligne et de colonne : commandes de MathLive', () => {
		const commands = keycaps().flatMap((key) => (key.command ? [key.command] : []));
		expect(commands).toEqual([
			['performWithFeedback', 'addRowAfter'],
			['performWithFeedback', 'addColumnAfter']
		]);
	});
});
