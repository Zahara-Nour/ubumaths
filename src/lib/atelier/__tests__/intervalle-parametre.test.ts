/**
 * Atelier — une fonction définie sur un intervalle À PARAMÈTRE : `f(x) = x sur [k;5]`.
 *
 * Phase 0 du chantier `fonctions-morceaux` (validée par David le 2026-11-28) :
 * les bornes citent des valeurs de l'atelier (`k`, `k+1`, `-a`, `2k`), remplacées
 * à chaque recalcul ; le champ garde l'écriture. Un curseur qui rend l'ensemble
 * impossible (vide, un point, hors du domaine) met la carte en erreur, et elle
 * revient seule quand le curseur revient.
 */

import { describe, it, expect } from 'vitest';
import { CalcDesk } from '../desk.svelte';
import { Atelier } from '../atelier.svelte';
import { intervalFieldLatex, plotRestrictionOf, readInterval } from '../interval';
import { syncPlots } from '../plot-sync';
import { GrapheurStore } from '#lib/stores/grapheur.svelte.ts';
import { isExplicitFunction, type ExplicitFunction } from '#lib/grapheur/types.ts';
import type { Entry } from '../desk.svelte';
import { number } from '#lib/mathAST/factory.ts';

// =============================================================================
// Aides
// =============================================================================

function desk(...definitions: string[]): CalcDesk {
	const d = new CalcDesk(new Atelier());
	for (const definition of definitions) {
		d.submit(definition);
		if (d.entries.at(-1)?.failed) throw new Error(`définition refusée : ${definition}`);
	}
	return d;
}

function last(d: CalcDesk): Entry {
	const entry = d.entries.at(-1);
	if (entry === undefined) throw new Error('aucune ligne');
	return entry;
}

/** Le curseur de `name` posé sur `value` (le geste de l'élève). */
function slide(d: CalcDesk, name: string, value: number): void {
	const moved = d.atelier.slideTo(name, value);
	if (!moved.ok) throw new Error(moved.message);
}

/** La courbe posée pour `name`, après synchronisation. */
function plotted(d: CalcDesk, graph: GrapheurStore, name: string): ExplicitFunction {
	d.atelier.setPlotted(name, true);
	syncPlots(d.atelier, graph);
	const found = graph.functions.filter(isExplicitFunction).at(-1);
	if (found === undefined) throw new Error(`${name} non tracée`);
	return found;
}

const piece = (from: number, to: number, fromClosed = true, toClosed = true) => ({
	from,
	to,
	fromClosed,
	toClosed
});

// =============================================================================
// Cas normal
// =============================================================================

describe('le curseur déplace la borne', () => {
	it('k = 2 : f(x) = x sur [k;5] se trace de 2 à 5', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(2, 5)]);
	});

	it('le curseur à 3,5 : la courbe va de 3,5 à 5, aussitôt', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		const graph = new GrapheurStore();
		expect(plotted(d, graph, 'f').restriction).toEqual([piece(2, 5)]);
		slide(d, 'k', 3.5);
		syncPlots(d.atelier, graph);
		const curve = graph.functions.filter(isExplicitFunction).at(-1);
		expect(curve?.restriction).toEqual([piece(3.5, 5)]);
		expect(curve?.visible).toBe(true);
	});

	it('le champ de la carte garde l’écriture [k;5]', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		expect(intervalFieldLatex(d.atelier.get('f')!)).toBe('[k;5]');
	});

	it('.résoudre suit la valeur du moment', () => {
		const d = desk('k = 0', 'f(x) = x^2 sur [k;5]');
		d.submit('.résoudre f(x)=4');
		expect(last(d).latex).toBe('S = \\left\\{ 2 \\right\\}');
		slide(d, 'k', -3);
		d.submit('.résoudre f(x)=4');
		expect(last(d).latex).toBe('S = \\left\\{ -2 \\,;\\, 2 \\right\\}');
	});

	it('f(1) hors de [k;5] est refusé, accepté quand k descend', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		d.submit('f(1)');
		expect(last(d).failed).toBe(true);
		slide(d, 'k', 0);
		d.submit('f(1)');
		expect(last(d).failed).toBe(false);
	});

	it('g(x) = f(x) + 1 hérite de l’ensemble et suit le curseur', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'g(x) = f(x) + 1');
		expect(plotRestrictionOf(d.atelier.get('g'))).toEqual([piece(2, 5)]);
		slide(d, 'k', 3);
		expect(plotRestrictionOf(d.atelier.get('g'))).toEqual([piece(3, 5)]);
	});

	it('renommer k en m : l’intervalle suit', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		expect(d.atelier.rename('k', 'm').ok).toBe(true);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('ok');
		expect(f?.kind === 'function' && f.interval).toBe('[m;5]');
		expect(plotRestrictionOf(f)).toEqual([piece(2, 5)]);
	});
});

// =============================================================================
// Cas limites
// =============================================================================

describe('bornes calculées et noms absents', () => {
	it('[-a;a] avec a = 2', () => {
		const d = desk('a = 2', 'f(x) = x^2 sur [-a;a]');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(-2, 2)]);
	});

	it('[k+1;5[ et ]0;2k] avec k = 1', () => {
		const d = desk('k = 1', 'f(x) = x sur [k+1;5[', 'g(x) = x sur ]0;2k]');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(2, 5, true, false)]);
		expect(plotRestrictionOf(d.atelier.get('g'))).toEqual([piece(0, 2, false, true)]);
	});

	it('k pas encore défini : f l’attend, avec l’offre de curseur', () => {
		const d = desk('f(x) = x sur [k;5]');
		const f = d.atelier.get('f');
		expect(f?.status).toBe('pending');
		expect(f?.missing?.map((m) => m.name)).toEqual(['k']);
		d.submit('k = 2');
		expect(d.atelier.get('f')?.status).toBe('ok');
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(2, 5)]);
	});

	it('une borne en LaTeX (champ MathLive) : \\frac{k}{2}', () => {
		const d = desk('k = 4');
		const created = d.atelier.create(
			{ kind: 'function', name: 'f', definition: 'x', interval: '\\left[\\frac{k}{2};5\\right]' },
			'mathfield'
		);
		expect(created.ok).toBe(true);
		expect(plotRestrictionOf(d.atelier.get('f'))).toEqual([piece(2, 5)]);
	});
});

// =============================================================================
// Le curseur rend l'ensemble impossible
// =============================================================================

describe('un ensemble impossible met la carte en erreur', () => {
	it('k à 6 : vide, carte en erreur, courbe effacée ; k à 2 : elle revient', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		const graph = new GrapheurStore();
		plotted(d, graph, 'f');
		slide(d, 'k', 6);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toBe("L'intervalle est vide (k = 6).");
		syncPlots(d.atelier, graph);
		expect(graph.functions.filter(isExplicitFunction).at(-1)?.visible).toBe(false);

		slide(d, 'k', 2);
		expect(d.atelier.get('f')?.status).toBe('ok');
		syncPlots(d.atelier, graph);
		const back = graph.functions.filter(isExplicitFunction).at(-1);
		expect(back?.visible).toBe(true);
		expect(back?.restriction).toEqual([piece(2, 5)]);
	});

	it('k à 5 : réduit à un point', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		slide(d, 'k', 5);
		expect(d.atelier.get('f')?.message).toBe("L'intervalle est réduit à un point (k = 5).");
	});

	it('√x sur [k;5], k à −1 : hors du domaine', () => {
		const d = desk('k = 1', 'f(x) = \\sqrt{x} sur [k;5]');
		expect(d.atelier.get('f')?.status).toBe('ok');
		slide(d, 'k', -1);
		const f = d.atelier.get('f');
		expect(f?.status).toBe('error');
		expect(f?.message).toContain("n'est pas défini sur tout [−1 ; 5]");
		expect(f?.message).toContain('(k = −1)');
	});

	it('une valeur décimale s’écrit avec une virgule : k = 5,5', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		slide(d, 'k', 5.5);
		expect(d.atelier.get('f')?.message).toBe("L'intervalle est vide (k = 5,5).");
	});

	it('la fonction qui cite f passe en erreur avec elle', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]', 'g(x) = f(x) + 1');
		slide(d, 'k', 6);
		expect(d.atelier.get('g')?.status).toBe('error');
		slide(d, 'k', 2);
		expect(d.atelier.get('g')?.status).toBe('ok');
	});

	it('à la création, avec k déjà à 6 : refusé, rien de créé', () => {
		const d = desk('k = 6');
		d.submit('f(x) = x sur [k;5]');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain("L'intervalle est vide (k = 6).");
		expect(d.atelier.get('f')).toBeUndefined();
	});

	it('k à 6, puis rechargement : l’ensemble [k;5] reste écrit, f en erreur ; k à 2 : il revient', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		slide(d, 'k', 6);
		const fresh = new Atelier();
		const report = fresh.restore(d.atelier.serialize());
		expect(report.skipped).toEqual([]);
		const f = fresh.get('f');
		expect(f?.kind === 'function' && f.interval).toBe('[k;5]');
		expect(f?.status).toBe('error');
		expect(fresh.slideTo('k', 2).ok).toBe(true);
		expect(plotRestrictionOf(fresh.get('f'))).toEqual([piece(2, 5)]);
	});

	it('k à 6, un autre geste, puis Annuler : l’ensemble [k;5] n’est pas effacé', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		slide(d, 'k', 6);
		d.submit('g(x) = 1');
		d.undo();
		expect(d.atelier.get('g')).toBeUndefined();
		const f = d.atelier.get('f');
		expect(f?.kind === 'function' && f.interval).toBe('[k;5]');
		expect(f?.status).toBe('error');
	});

	it('k à 6 : la formule de f se modifie quand même, l’ensemble gardé', () => {
		const d = desk('k = 2', 'f(x) = x sur [k;5]');
		slide(d, 'k', 6);
		expect(d.atelier.update('f', 'x^3').ok).toBe(true);
		const f = d.atelier.get('f');
		expect(f?.kind === 'function' && f.interval).toBe('[k;5]');
		expect(f?.status).toBe('error');
		slide(d, 'k', 2);
		expect(d.atelier.get('f')?.status).toBe('ok');
	});

	it('une lettre qui n’est pas une valeur ([t;5] dans f(t)) reste illisible', () => {
		const d = desk();
		d.submit('f(t) = t sur [t;5]');
		expect(last(d).failed).toBe(true);
		expect(d.atelier.get('f')).toBeUndefined();
	});
});

describe('le champ de la carte se relit', () => {
	it(']0;k] \\ {1} écrit dans Calcul : le champ se relit, sans figer k', () => {
		const d = desk('k = 2', 'f(x) = 1/(x-1) sur ]0;k] \\ {1}');
		const latex = intervalFieldLatex(d.atelier.get('f')!);
		expect(latex).toContain('k');
		expect(readInterval(latex!, 'x', new Map([['k', number('2')]])).ok).toBe(true);
	});
});
