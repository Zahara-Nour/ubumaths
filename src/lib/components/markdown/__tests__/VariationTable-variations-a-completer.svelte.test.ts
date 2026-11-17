/**
 * VariationTable — ligne variation: à compléter (chantier `variations-a-completer`)
 * ==============================================================================
 *
 * Valeur cachée : case vide à sa hauteur. Flèche cachée : case vide, AUCUNE flèche
 * dessinée, et les deux valeurs qui l'encadrent au milieu (leur hauteur dirait la
 * réponse). `hiddenCells="filled"` : le tableau juste, la flèche écrite dans sa case.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VariationTable from '../nodes/VariationTable.svelte';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

// Constantes
/** Cubique : ↗ jusqu'à 4 en -2, ↘ (cachée) jusqu'à -4 en 2, ↗ */
const CUBIQUE = [
	'variable: x',
	'domain: -inf, -2, 2, +inf',
	'',
	'variation: f(x)',
	'  -inf: -inf, bottom',
	'  -2: ?4, top',
	'  2: -4, bottom',
	'  +inf: +inf, top',
	'  -2,2: ?flèche'
];

// Functions
function parsed(lines: string[]): VariationTableNode {
	const { node, errors } = parseVariationTableContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

/** Classe de position de la valeur de la colonne `k` (0 = première valeur de x) */
function positionOf(root: Element, k: number): string | undefined {
	const cells = root.querySelectorAll('.vt-variation-value-cell');
	const container = cells[k]?.querySelector('.vt-value-container');
	return [...(container?.classList ?? [])].find((c) => c.startsWith('vt-pos-'));
}

describe('VariationTable — ligne variation: à compléter', () => {
	it('par défaut : cases vides, la flèche cachée n’est pas dessinée', async () => {
		const screen = await render(VariationTable, { props: { node: parsed(CUBIQUE) } });
		const root = screen.container;
		const cases = [...root.querySelectorAll('[data-vt-case]')];
		expect(cases.map((c) => c.textContent?.trim())).toEqual(['', '']);
		expect(root.querySelectorAll('.vt-case-vide')).toHaveLength(2);
		// Trois intervalles, deux flèches dessinées (la cachée non)
		expect(root.querySelectorAll('svg.vt-arrow')).toHaveLength(2);
		expect(root.textContent).not.toContain('4,');
	});

	it('les valeurs qui encadrent la flèche cachée sont au milieu, les autres non', async () => {
		const screen = await render(VariationTable, { props: { node: parsed(CUBIQUE) } });
		const root = screen.container;
		expect(positionOf(root, 0)).toBe('vt-pos-bottom');
		expect(positionOf(root, 1)).toBe('vt-pos-center');
		expect(positionOf(root, 2)).toBe('vt-pos-center');
		expect(positionOf(root, 3)).toBe('vt-pos-top');
	});

	it('hiddenCells="filled" : le tableau juste, la flèche écrite dans sa case', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(CUBIQUE), hiddenCells: 'filled' }
		});
		const root = screen.container;
		const cases = [...root.querySelectorAll('[data-vt-case]')];
		expect(cases.map((c) => c.textContent?.trim())).toEqual(['4', '↘']);
		expect(positionOf(root, 1)).toBe('vt-pos-top');
		expect(positionOf(root, 2)).toBe('vt-pos-bottom');
	});
});
