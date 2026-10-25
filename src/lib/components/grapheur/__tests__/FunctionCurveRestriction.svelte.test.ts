import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FunctionCurve from '../FunctionCurve.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction } from '$lib/grapheur/types';
import type { ExplicitFunction, Viewport } from '$lib/grapheur/types';
import type { Restriction } from '$lib/grapheur/restriction';

/**
 * Une courbe restreinte se dessine sur son ensemble seulement, avec ses
 * points de bord (lot 3 de `docs/archive/wip/atelier-intervalle-phase0.md`, I5).
 * On vérifie le RENDU : les cercles présents, leur remplissage, et les
 * abscisses réellement atteintes par le tracé.
 */
describe('FunctionCurve — restreinte à un ensemble', () => {
	const viewport: Viewport = { xMin: -5, xMax: 10, yMin: -5, yMax: 10 };
	const transformer = createTransformer(viewport, 600, 600);

	function curve(latex: string, restriction?: Restriction): ExplicitFunction {
		const g = new GrapheurStore();
		g.addFunction(latex);
		const func = g.functions.filter(isExplicitFunction)[0];
		return restriction === undefined ? func : { ...func, restriction };
	}

	async function draw(func: ExplicitFunction) {
		const { container } = await render(FunctionCurve, { func, viewport, transformer });
		const path = container.querySelector<SVGPathElement>('path.function-curve');
		if (!path) throw new Error('courbe non dessinée');
		const closed = [...container.querySelectorAll<SVGCircleElement>('circle.endpoint-closed')];
		const open = [...container.querySelectorAll<SVGCircleElement>('circle.endpoint-open')];
		// Abscisses (mathématiques) des points de passage du tracé
		const xs = (path.getAttribute('d') ?? '')
			.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?,-?\d+(?:\.\d+)?|-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?/g)
			?.map((pair) => transformer.svgToMath(Number(pair.split(/[ ,]/)[0]), 0).x);
		const moves = (path.getAttribute('d') ?? '').match(/M/g)?.length ?? 0;
		return { path, closed, open, xs: xs ?? [], moves };
	}

	const at = (c: SVGCircleElement) =>
		transformer.svgToMath(Number(c.getAttribute('cx')), Number(c.getAttribute('cy')));

	it('x+1 sur ]0;5] : creux en (0;1), plein en (5;6), tracé entre les deux', async () => {
		const { closed, open, xs } = await draw(
			curve('x+1', [{ from: 0, to: 5, fromClosed: false, toClosed: true }])
		);
		expect(open.map(at)).toEqual([{ x: expect.closeTo(0), y: expect.closeTo(1) }]);
		expect(closed.map(at)).toEqual([{ x: expect.closeTo(5), y: expect.closeTo(6) }]);
		expect(Math.min(...xs)).toBeGreaterThanOrEqual(-0.05);
		expect(Math.max(...xs)).toBeLessThanOrEqual(5.05);
	});

	it('le point plein prend la couleur de la courbe, le creux son contour', async () => {
		const { path, closed, open } = await draw(
			curve('x+1', [{ from: 0, to: 5, fromClosed: false, toClosed: true }])
		);
		const stroke = getComputedStyle(path).stroke;
		expect(getComputedStyle(closed[0]).fill).toBe(stroke);
		expect(getComputedStyle(open[0]).stroke).toBe(stroke);
		// L'intérieur du creux vaut le fond du graphe (le noir par défaut d'un cercle SVG ne passe pas)
		const probe = document.createElement('div');
		probe.style.color = 'var(--color-graph-bg)';
		document.body.append(probe);
		const background = getComputedStyle(probe).color;
		probe.remove();
		expect(getComputedStyle(open[0]).fill).toBe(background);
		expect(background).not.toBe('rgb(0, 0, 0)');
	});

	it('1/x sur ]0;5] : un seul point, plein, en 5', async () => {
		const { closed, open } = await draw(
			curve('\\frac{1}{x}', [{ from: 0, to: 5, fromClosed: false, toClosed: true }])
		);
		expect(open).toEqual([]);
		expect(closed.map(at)).toEqual([{ x: expect.closeTo(5), y: expect.closeTo(0.2) }]);
	});

	it('x sur [−1;1] ∪ [2;3] : deux morceaux, quatre points pleins', async () => {
		const { closed, open, moves, xs } = await draw(
			curve('x', [
				{ from: -1, to: 1, fromClosed: true, toClosed: true },
				{ from: 2, to: 3, fromClosed: true, toClosed: true }
			])
		);
		expect(closed).toHaveLength(4);
		expect(open).toEqual([]);
		expect(moves).toBe(2);
		expect(xs.some((x) => x > 1.05 && x < 1.95)).toBe(false);
	});

	it('sans restriction : aucun point, la fenêtre entière', async () => {
		const { closed, open, xs } = await draw(curve('x+1'));
		expect(closed).toEqual([]);
		expect(open).toEqual([]);
		expect(Math.min(...xs)).toBeLessThan(-4.9);
	});
});
