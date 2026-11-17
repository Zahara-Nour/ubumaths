/**
 * VariationTable — cellules cachées (`?`, tableau de signes à compléter)
 * =====================================================================
 *
 * Chantier `docs/archive/wip/tableau-signes-progress.md`, PR 3. Le nœud garde la vraie
 * valeur des cellules cachées (corrigé, éditeur) : rendu sans saisie, elles
 * restent VIDES par défaut — un aperçu ou un renderer ordinaire ne montre jamais
 * la réponse. `hiddenCells="filled"` les remplit (éditeur, bonne réponse).
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VariationTable from '../nodes/VariationTable.svelte';
import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
import type { VariationTableNode } from '$lib/ubumark/types/variation-table';

// Constantes
const PRODUIT = [
	'variable: x',
	'domain: -inf, ?-3, 2, +inf',
	'',
	'sign: (x+3)(x-2)',
	'  -inf,-3: ?+',
	'  -3: ?z',
	'  -3,2: -',
	'  2: z',
	'  2,+inf: ?+',
	'',
	'sign: x-2',
	'  -inf,2: -',
	'  2: ?rien',
	'  2,+inf: +'
];

// Functions
function parsed(lines: string[]): VariationTableNode {
	const { node, errors } = parseVariationTableContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

function cellTexts(root: Element): (string | undefined)[] {
	return [...root.querySelectorAll('[data-vt-case]')].map((cell) => cell.textContent?.trim());
}

describe('VariationTable — cellules cachées', () => {
	it('par défaut : cases vides, aucune réponse affichée', async () => {
		const screen = await render(VariationTable, { props: { node: parsed(PRODUIT) } });
		const root = screen.container;
		expect(cellTexts(root)).toEqual(['', '', '', '', '']);
		expect(root.querySelector('thead')!.textContent).not.toContain('-3');
		expect(root.querySelectorAll('.vt-case-vide')).toHaveLength(5);
		// Les cellules non cachées restent : le 0 en 2, le signe − entre -3 et 2
		expect(root.querySelectorAll('.vt-zero')).toHaveLength(1);
	});

	it('hiddenCells="filled" : les cellules remplies de la réponse', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(PRODUIT), hiddenCells: 'filled' }
		});
		expect(cellTexts(screen.container)).toEqual(['-3', '+', '0', '+', '']);
	});

	it('double barre cachée remplie : la double barre', async () => {
		const node = parsed([
			'variable: x',
			'domain: -inf, 1, +inf',
			'',
			'sign: 1/(x-1)',
			'  -inf,1: -',
			'  1: ?||',
			'  1,+inf: +'
		]);
		const screen = await render(VariationTable, { props: { node, hiddenCells: 'filled' } });
		expect(screen.container.querySelectorAll('[data-vt-case] .vt-asymptote-bar')).toHaveLength(1);
	});

	it('tableau sans ? : aucune case', async () => {
		const plain = PRODUIT.map((line) => line.replace('?', ''));
		const screen = await render(VariationTable, { props: { node: parsed(plain) } });
		expect(screen.container.querySelectorAll('[data-vt-case]')).toHaveLength(0);
		expect(screen.container.querySelector('thead')!.textContent).toContain('-3');
	});
});
