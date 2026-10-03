/**
 * Onglet « Vecteur » du clavier virtuel : les touches attendues, et chaque
 * insertion relue par la correction (aller-retour touche → jugement).
 */

import { describe, it, expect } from 'vitest';
import type { VirtualKeyboardKeycap } from 'mathlive';
import { buildVectorsKeyboardLayout, VECTORS_LAYOUT_ID } from '../keyboard-vectors';
import { judgeVectorAnswer } from '../vector-answer';

function keycaps(): Partial<VirtualKeyboardKeycap>[] {
	const layout = buildVectorsKeyboardLayout();
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

describe('onglet « Vecteur »', () => {
	it('identifiant et libellé', () => {
		const layout = buildVectorsKeyboardLayout();
		expect(layout.id).toBe(VECTORS_LAYOUT_ID);
		expect(layout.label).toBe('Vecteur');
	});

	it.each([
		['Vecteur du plan, en colonne', ['2', '-3'], '(2;-3)'],
		['Coordonnées en ligne', ['\\frac{1}{2}', '\\sqrt{2}'], '(\\frac12;\\sqrt2)'],
		['Vecteur de l’espace, en colonne', ['1', '0', '-1'], '(1;0;-1)']
	])('%s : relue par la correction', (tooltip, values, expected) => {
		expect(judgeVectorAnswer(filled(tooltip, values), expected).status).toBe('correct');
	});
});
