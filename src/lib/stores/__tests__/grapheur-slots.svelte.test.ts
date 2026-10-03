/**
 * Le grapheur attribue à chaque nouveau tracé une place : une couleur et un style.
 *
 * Spécification : docs/wip/grapheur-couleurs-theme-progress.md (points 1-3, 8, 9).
 */

import { describe, it, expect } from 'vitest';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';

/** Un grapheur qui ne range rien : les tests ne doivent pas écrire de stockage. */
const graph = () => new GrapheurStore(null);

/** La place d'un tracé, telle qu'elle est enregistrée */
const slotOf = (g: GrapheurStore, i: number) => ({
	color: g.functions[i].color,
	lineStyle: g.functions[i].lineStyle
});

describe('places des tracés', () => {
	it('donne bleu, framboise, ocre, violet en trait plein aux 4 premières courbes', () => {
		const g = graph();
		for (let i = 0; i < 4; i++) g.addFunction(`x+${i}`);

		expect([0, 1, 2, 3].map((i) => slotOf(g, i))).toEqual([
			{ color: 'curve-1', lineStyle: 'solid' },
			{ color: 'curve-2', lineStyle: 'solid' },
			{ color: 'curve-3', lineStyle: 'solid' },
			{ color: 'curve-4', lineStyle: 'solid' }
		]);
	});

	it('passe en pointillés de la 5ᵉ à la 8ᵉ courbe', () => {
		const g = graph();
		for (let i = 0; i < 8; i++) g.addFunction(`x+${i}`);

		expect(slotOf(g, 4)).toEqual({ color: 'curve-1', lineStyle: 'dashed' });
		expect(slotOf(g, 7)).toEqual({ color: 'curve-4', lineStyle: 'dashed' });
	});

	it('recommence au bleu plein à la 9ᵉ courbe', () => {
		const g = graph();
		for (let i = 0; i < 9; i++) g.addFunction(`x+${i}`);

		expect(slotOf(g, 8)).toEqual({ color: 'curve-1', lineStyle: 'solid' });
	});

	it('reprend la place d’une courbe supprimée', () => {
		const g = graph();
		g.addFunction('x');
		const second = g.addFunction('2x');
		g.addFunction('3x');

		g.removeFunction(second);
		g.addFunction('4x');

		expect(slotOf(g, 2)).toEqual({ color: 'curve-2', lineStyle: 'solid' });
	});

	it('respecte le style choisi par l’élève : il libère la place qu’il quitte', () => {
		const g = graph();
		const first = g.addFunction('x');

		g.updateFunction(first, { lineStyle: 'dotted' });
		g.addFunction('2x');

		expect(slotOf(g, 0)).toEqual({ color: 'curve-1', lineStyle: 'dotted' });
		expect(slotOf(g, 1)).toEqual({ color: 'curve-1', lineStyle: 'solid' });
	});

	it('partage les places entre courbes, suites et nuages', () => {
		const g = graph();
		g.addFunction('x');
		g.addSequence('explicit', 'n');
		g.addScatter([1], [2], 'L / M');

		expect([0, 1, 2].map((i) => slotOf(g, i).color)).toEqual(['curve-1', 'curve-2', 'curve-3']);
	});
});
