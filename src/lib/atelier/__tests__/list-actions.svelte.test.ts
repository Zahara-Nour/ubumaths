/**
 * Les trois actions des listes — §3 de la Phase 0 du lot 4.
 *
 * Statistiques, nuage de points, ajustement affine. Les deux dernières ont
 * besoin de DEUX listes : l'atelier prend la suivante dans l'ordre du panneau,
 * et le dit.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isScatter } from '$lib/grapheur/types';

function deskWith(lists: Record<string, string>) {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return new CalcDesk(atelier);
}

describe('statistiques d’une liste', () => {
	it('écrit une ligne qui donne tout', () => {
		const d = deskWith({ L: '12 ; 15 ; 9 ; 20 ; 15' });

		d.runFromPanel('stats', 'L');

		const texte = d.entries[0].text;
		expect(texte).toContain('5'); // effectif
		expect(texte).toContain('14,2'); // moyenne, à la française
		expect(texte).toContain('11'); // étendue, absente de `.stats`
	});

	it('nomme ses statistiques en français', () => {
		const d = deskWith({ L: '12 ; 15 ; 9' });

		d.runFromPanel('stats', 'L');

		const texte = d.entries[0].text;
		expect(texte).toMatch(/moyenne/i);
		expect(texte).toMatch(/médiane/i);
		expect(texte).toMatch(/étendue/i);
		expect(texte).toMatch(/écart-type/i);
		// ⚠️ Pas « mean », « stdev » ni « Mediane » sans accent, comme `.stats`
		expect(texte).not.toMatch(/mean|stdev|Mediane\b/);
	});

	// §4 L2 : une absence, pas une erreur
	it('dit pourquoi sur une liste vide', () => {
		const d = deskWith({ L: '' });

		d.runFromPanel('stats', 'L');

		expect(d.entries[0].failed).toBe(true);
	});

	it('ne crée aucun objet', () => {
		const d = deskWith({ L: '12 ; 15' });

		d.runFromPanel('stats', 'L');

		expect(d.atelier.names).toEqual(['L']);
	});
});

describe('nuage de points', () => {
	it('pose un nuage dans le grapheur', () => {
		const d = deskWith({ L: '1 ; 2 ; 3', M: '2 ; 4 ; 6' });
		const graph = new GrapheurStore(null);

		d.runFromPanel('scatter', 'L', graph);

		expect(graph.functions.filter(isScatter).length).toBe(1);
	});

	it('prend la liste suivante comme ordonnées, et le dit', () => {
		const d = deskWith({ L: '1 ; 2 ; 3', M: '2 ; 4 ; 6' });
		const graph = new GrapheurStore(null);

		d.runFromPanel('scatter', 'L', graph);

		expect(d.entries[0].text).toContain('M');
	});

	// §4 L1 : seules les paires complètes, et on le dit
	it('signale les valeurs écartées quand les listes diffèrent', () => {
		const d = deskWith({ L: '1 ; 2 ; 3 ; 4 ; 5', M: '2 ; 4 ; 6' });
		const graph = new GrapheurStore(null);

		d.runFromPanel('scatter', 'L', graph);

		expect(d.entries[0].text).toMatch(/2 valeurs? (ignorée|écartée)/i);
	});

	// §3 L2 du nuage : il faut deux listes
	it('refuse quand l’atelier n’a qu’une liste', () => {
		const d = deskWith({ L: '1 ; 2 ; 3' });
		const graph = new GrapheurStore(null);

		d.runFromPanel('scatter', 'L', graph);

		expect(d.entries[0].failed).toBe(true);
		expect(d.entries[0].text).toMatch(/deux listes/i);
		expect(graph.functions.length).toBe(0);
	});
});

/**
 * §3 N2 : le nuage SUIT ses listes — l'option B du lot 2, appliquée aux
 * données. Sans ça, l'élève corrige une valeur et son nuage reste figé.
 */
describe('le nuage suit ses listes', () => {
	it('se met à jour quand une liste change', async () => {
		const { syncPlots } = await import('../plot-sync');
		const d = deskWith({ L: '1 ; 2', M: '2 ; 4' });
		const graph = new GrapheurStore(null);
		d.runFromPanel('scatter', 'L', graph);

		d.atelier.update('L', '1 ; 2 ; 3');
		d.atelier.update('M', '2 ; 4 ; 6');
		syncPlots(d.atelier, graph);

		const nuage = graph.functions.find(isScatter)!;
		expect(nuage.xs).toEqual([1, 2, 3]);
		expect(nuage.ys).toEqual([2, 4, 6]);
	});

	it('ne pose pas un second nuage en se synchronisant deux fois', async () => {
		const { syncPlots } = await import('../plot-sync');
		const d = deskWith({ L: '1 ; 2', M: '2 ; 4' });
		const graph = new GrapheurStore(null);
		d.runFromPanel('scatter', 'L', graph);

		syncPlots(d.atelier, graph);
		syncPlots(d.atelier, graph);

		expect(graph.functions.filter(isScatter).length).toBe(1);
	});

	it('disparaît quand on le retire', async () => {
		const { syncPlots } = await import('../plot-sync');
		const d = deskWith({ L: '1 ; 2', M: '2 ; 4' });
		const graph = new GrapheurStore(null);
		d.runFromPanel('scatter', 'L', graph);

		d.atelier.setPlotted('L', false);
		syncPlots(d.atelier, graph);

		expect(graph.functions.filter(isScatter).length).toBe(0);
	});
});

describe('l’élève choisit sa partenaire', () => {
	it('trace le nuage avec CELLE qu’il a cliquée', () => {
		const d = deskWith({ L: '1 ; 2', M: '9 ; 9', N: '3 ; 6' });
		const graph = new GrapheurStore(null);

		d.runFromPanel('scatter:N', 'L', graph);

		const nuage = graph.functions.find(isScatter)!;
		expect(nuage.ys).toEqual([3, 6]);
		expect(d.entries[0].text).toContain('N');
	});

	it('ajuste avec celle qu’il a cliquée', () => {
		const d = deskWith({ L: '1 ; 2 ; 3', M: '9 ; 9 ; 9', N: '2 ; 4 ; 6' });

		d.runFromPanel('fit:N', 'L');

		// La droite de L/N est y = 2x, pas la constante de L/M
		expect(d.entries[0].text).toContain('2');
	});
});

describe('ajustement affine', () => {
	it('crée une fonction traçable', () => {
		const d = deskWith({ L: '1 ; 2 ; 3 ; 4', M: '2 ; 4 ; 6 ; 8' });

		d.runFromPanel('fit', 'L');

		const créée = d.atelier.objects.find((o) => o.kind === 'function');
		expect(créée).toBeDefined();
		expect(créée!.status).toBe('ok');
	});

	it('écrit une définition que le grapheur saura tracer', () => {
		const d = deskWith({ L: '1 ; 2 ; 3 ; 4', M: '2 ; 4 ; 6 ; 8' });

		d.runFromPanel('fit', 'L');

		const créée = d.atelier.objects.find((o) => o.kind === 'function');
		// y = 2x + 0 : la définition doit contenir la pente
		expect(créée!.definition).toContain('2');
		expect(créée!.definition).toContain('x');
	});

	// §3 N3 : R² dit si l'ajustement vaut quelque chose
	it('annonce le coefficient de détermination', () => {
		const d = deskWith({ L: '1 ; 2 ; 3 ; 4', M: '2 ; 4 ; 6 ; 8' });

		d.runFromPanel('fit', 'L');

		expect(d.entries[0].text).toMatch(/R²/);
	});

	// §4 L3
	it('refuse avec moins de deux points', () => {
		const d = deskWith({ L: '1', M: '2' });

		d.runFromPanel('fit', 'L');

		expect(d.entries[0].failed).toBe(true);
		expect(d.atelier.objects.filter((o) => o.kind === 'function')).toEqual([]);
	});

	it('refuse des points alignés verticalement, en français', () => {
		const d = deskWith({ L: '2 ; 2 ; 2', M: '1 ; 5 ; 9' });

		d.runFromPanel('fit', 'L');

		expect(d.entries[0].failed).toBe(true);
		expect(d.entries[0].text).not.toMatch(/NaN|Infinity/);
	});
});
