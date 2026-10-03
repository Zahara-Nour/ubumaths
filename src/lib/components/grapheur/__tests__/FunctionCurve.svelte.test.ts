import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FunctionCurve from '../FunctionCurve.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction } from '$lib/grapheur/types';
import type { ExplicitFunction, Viewport } from '$lib/grapheur/types';

/**
 * Une courbe est peinte dans la variante de sa couleur pour le mode courant.
 *
 * On lit la couleur RENDUE (getComputedStyle) : une identité de palette n'a de
 * valeur qu'une fois le thème appliqué, et une variable absente du CSS se peint
 * en noir sans erreur. Spécification : docs/wip/grapheur-couleurs-theme-progress.md (4, 10).
 */
describe('FunctionCurve — couleur et thème', () => {
	const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };
	const transformer = createTransformer(viewport, 500, 500);

	/** Les courbes telles que le grapheur les pose : place attribuée, AST parsé */
	function curves(count: number): ExplicitFunction[] {
		const g = new GrapheurStore(null);
		for (let i = 0; i < count; i++) g.addFunction(`x+${i}`);
		return g.functions.filter(isExplicitFunction);
	}

	async function pathOf(func: ExplicitFunction): Promise<SVGPathElement> {
		const { container } = await render(FunctionCurve, { func, viewport, transformer });
		const path = container.querySelector<SVGPathElement>('path.function-curve');
		if (!path) throw new Error('courbe non dessinée');
		return path;
	}

	it('peint la 1ʳᵉ courbe en bleu clair, puis en bleu sombre quand le mode bascule', async () => {
		const root = document.documentElement;
		const path = await pathOf(curves(1)[0]);

		try {
			root.style.colorScheme = 'light';
			expect(getComputedStyle(path).stroke).toBe('rgb(1, 124, 183)'); // #017cb7
			root.style.colorScheme = 'dark';
			expect(getComputedStyle(path).stroke).toBe('rgb(34, 139, 199)'); // #228bc7
		} finally {
			root.style.colorScheme = '';
		}
	});

	it('trace la 5ᵉ courbe en bleu et en pointillés', async () => {
		const path = await pathOf(curves(5)[4]);

		expect(getComputedStyle(path).stroke).toBe('rgb(1, 124, 183)');
		expect(path.getAttribute('stroke-dasharray')).toBe('8,4');
	});

	it('trace la 1ʳᵉ courbe en trait plein', async () => {
		const path = await pathOf(curves(1)[0]);

		expect(path.getAttribute('stroke-dasharray')).toBe('none');
	});
});
