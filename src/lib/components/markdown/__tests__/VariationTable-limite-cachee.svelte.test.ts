/**
 * VariationTable — limite cachée (chantier `variation-limite-infinie`)
 * ===================================================================
 *
 * Une limite cachée autour de la double barre est une case, du côté où elle se
 * trouve, à sa hauteur ; l'autre limite reste écrite. Une limite infinie cachée au
 * bord du tableau est une case comme une valeur cachée.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import VariationTable from '../nodes/VariationTable.svelte';
import { parseVariationTableContent } from '#lib/ubumark/parser/variation-table-parser.ts';
import type { VariationTableNode } from '#lib/ubumark/types/variation-table.ts';

// Functions
function parsed(variation: string[]): VariationTableNode {
	const { node, errors } = parseVariationTableContent([
		'variable: x',
		'domain: -inf, 3, +inf',
		'variation: f(x)',
		...variation
	]);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

describe('VariationTable — limite cachée', () => {
	it('deux limites cachées autour de la double barre : deux cases, la barre entre elles', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(['  -inf: 2, top', '  3: ||, ?-inf, ?+inf', '  +inf: 2, bottom']) }
		});
		const limits = screen.container.querySelector('.vt-asymptote-limits')!;
		const cases = limits.querySelectorAll('[data-vt-case]');
		expect([...cases].map((c) => c.getAttribute('data-vt-case'))).toEqual(['0', '1']);
		expect(limits.querySelector('.vt-asymptote-bar')).not.toBeNull();
		// Ni l'une ni l'autre limite écrite
		expect(limits.textContent).not.toMatch(/∞/);
		// Hauteurs gardées : à gauche en bas, à droite en haut
		expect(cases[0].closest('.vt-limit')!.className).toMatch(/bottom/);
		expect(cases[1].closest('.vt-limit')!.className).toMatch(/top/);
	});

	it('une seule limite cachée : l’autre reste écrite', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(['  -inf: 2, top', '  3: ||, ?-inf, +inf', '  +inf: 2, bottom']) }
		});
		const limits = screen.container.querySelector('.vt-asymptote-limits')!;
		expect(limits.querySelectorAll('[data-vt-case]')).toHaveLength(1);
		expect(limits.querySelector('.vt-limit-left [data-vt-case]')).not.toBeNull();
		expect(limits.querySelector('.vt-limit-right [data-vt-case]')).toBeNull();
	});

	it('limite d’un seul côté (`||, left, ?-inf, bottom`) : la case à gauche de la barre', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(['  -inf: 2, top', '  3: ||, left, ?-inf, bottom']) }
		});
		expect(
			screen.container.querySelector('.vt-asymptote-single-left .vt-limit [data-vt-case]')
		).not.toBeNull();
	});

	it('hiddenCells="filled" : la limite affichée dans sa case', async () => {
		const screen = await render(VariationTable, {
			props: {
				node: parsed(['  -inf: 2, top', '  3: ||, ?-inf, +inf', '  +inf: 2, bottom']),
				hiddenCells: 'filled'
			}
		});
		const cell = screen.container.querySelector('[data-vt-case="0"]')!;
		expect(cell.innerHTML).toContain('infty');
	});

	it('limite infinie cachée au bord : une case à sa hauteur', async () => {
		const screen = await render(VariationTable, {
			props: { node: parsed(['  -inf: ?2, top', '  3: ||, -inf, +inf', '  +inf: ?-inf, bottom']) }
		});
		expect(screen.container.querySelectorAll('[data-vt-case]')).toHaveLength(2);
	});
});
