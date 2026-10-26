/**
 * Atelier — la composée f(u(x)) d'une fonction définie sur un ensemble.
 *
 * Phase 0 `docs/wip/composees-progress.md` (validée par David le 2026-10-26) :
 * avec f définie sur I et u affine (`2x`, `x − 3`, `−x`, `2x + 1`), f(u(x))
 * est définie sur {x : u(x) ∈ I}, bornes exactes (Q1) ; toute autre u reste
 * refusée. `.domaine` dit la condition (Q2), `.résoudre` l'écrit en étape (Q3).
 *
 * Tout passe par les vrais chemins : `CalcDesk.submit`, `syncPlots`.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import type { Entry } from '../desk.svelte';
import { intervalLabelOf } from '../interval';
import { syncPlots } from '../plot-sync';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction, type ExplicitFunction } from '$lib/grapheur/types';

// =============================================================================
// Décor
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

function label(d: CalcDesk, name: string): string | null {
	const object = d.atelier.get(name);
	if (object === undefined) throw new Error(`pas d'objet ${name}`);
	return intervalLabelOf(object);
}

/** La courbe posée pour `name`, après synchronisation. */
function plotted(d: CalcDesk, name: string): ExplicitFunction {
	const graph = new GrapheurStore();
	d.atelier.setPlotted(name, true);
	syncPlots(d.atelier, graph);
	const found = graph.functions.filter(isExplicitFunction).at(-1);
	if (found === undefined) throw new Error(`${name} non tracée`);
	return found;
}

const F = 'f(x) = x^2 sur [0;+∞[';

// =============================================================================
// Définitions g(x) = f(u(x))
// =============================================================================

describe('g(x) = f(u(x)), u affine : g hérite de {x : u(x) ∈ I}', () => {
	it('N1 f(2x) : [0 ; +∞[, g calculée', () => {
		const d = desk(F, 'g(x) = f(2x)');
		expect(d.atelier.get('g')?.status).toBe('ok');
		expect(label(d, 'g')).toBe('[0 ; +∞[');
	});

	it('N2 f(x − 3) : [3 ; +∞[', () => {
		const d = desk(F, 'g(x) = f(x-3)');
		expect(label(d, 'g')).toBe('[3 ; +∞[');
	});

	it('N2 f(−x) : a < 0, bornes échangées', () => {
		const d = desk(F, 'g(x) = f(-x)');
		expect(label(d, 'g')).toBe(']−∞ ; 0]');
	});

	it('N7 bornes exactes : f sur [0 ; 2], f(2x + 1) → [−1/2 ; 1/2]', () => {
		const d = desk('f(x) = x sur [0;2]', 'g(x) = f(2x+1)', 'h(x) = x sur [-1/2;1/2]');
		expect(label(d, 'g')).toBe(label(d, 'h'));
	});

	it('N7 bornes ouvertes gardées, π gardé exact', () => {
		const d = desk('f(x) = x sur ]0;π]', 'g(x) = f(2x)', 'h(x) = x sur ]0;π/2]');
		expect(label(d, 'g')).toBe(label(d, 'h'));
	});

	it('N8 f sur ℝ \\ {1} : f(2x) → ℝ \\ {1/2}', () => {
		const d = desk('f(x) = x sur ℝ\\{1}', 'g(x) = f(2x)', 'h(x) = x sur ℝ\\{1/2}');
		expect(label(d, 'g')).toBe(label(d, 'h'));
	});

	it('N9 f(x) + f(x − 1) : l’intersection [1 ; +∞[', () => {
		const d = desk(F, 'g(x) = f(x) + f(x-1)');
		expect(label(d, 'g')).toBe('[1 ; +∞[');
	});

	it('g(−1) refusé, g(1) calculé', () => {
		const d = desk(F, 'g(x) = f(2x)');
		d.submit('g(-1)');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("-1 n'est pas dans l'ensemble de définition de g, [0 ; +∞[.");
		d.submit('g(1)');
		expect(last(d).latex).toBe('4');
	});

	it('tracé restreint', () => {
		const d = desk(F, 'g(x) = f(x-3)');
		expect(plotted(d, 'g').restriction).toEqual([
			{ from: 3, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});

	it('en chaîne : h(x) = g(x) + 1 hérite de g', () => {
		const d = desk(F, 'g(x) = f(x-3)', 'h(x) = g(x) + 1');
		expect(label(d, 'h')).toBe('[3 ; +∞[');
	});

	it('L3 ensemble vide : g en erreur, « définie nulle part »', () => {
		const d = desk('f(x) = x sur [0;1]');
		d.submit('g(x) = f(x) + f(x+5)');
		const g = d.atelier.get('g');
		expect(g?.status).toBe('error');
		expect(g?.message).toContain("n'est définie nulle part");
	});
});

describe('u non affine ou à paramètre : refus gardé (Q1, L2)', () => {
	it.each(['g(x) = f(x^2)', 'g(x) = f(ln(x))', 'g(x) = f(1/x)'])('%s : g en erreur', (typed) => {
		const d = desk(F);
		d.submit(typed);
		const g = d.atelier.get('g');
		expect(g?.status).toBe('error');
		// E1 : le message dit quelle expression devrait être dans quel ensemble
		expect(g?.message).toContain('[0 ; +∞[');
	});

	it('f(ax) avec a une lettre libre : refus', () => {
		const d = desk(F);
		d.submit('.résoudre f(a x) = 4');
		expect(last(d).failed).toBe(true);
	});
});

// =============================================================================
// Q2 : .domaine dit la condition
// =============================================================================

describe('Q2 .domaine g dit d’où vient l’ensemble', () => {
	it('f(2x) : « 2x doit être dans [0 ; +∞[ »', () => {
		const d = desk(F, 'g(x) = f(2x)');
		d.submit('.domaine g');
		expect(last(d).text).toBe(
			'g est définie sur [0 ; +∞[ (ensemble hérité : 2x doit être dans [0 ; +∞[) ; sans cet héritage, elle le serait sur ℝ.'
		);
	});

	it('f = √ : l’ensemble EST le domaine de √(2x), la seconde moitié se tait', () => {
		const d = desk('f(x) = sqrt(x) sur [0;+∞[', 'g(x) = f(2x)');
		d.submit('.domaine g');
		expect(last(d).text).toBe(
			'g est définie sur [0 ; +∞[ (ensemble hérité : 2x doit être dans [0 ; +∞[).'
		);
	});

	it('le moins s’écrit −, comme dans les ensembles', () => {
		const d = desk(F, 'g(x) = f(-3x+1)');
		d.submit('.domaine g');
		expect(last(d).text).toContain('(ensemble hérité : −3x+1 doit être dans [0 ; +∞[)');
	});

	it('g(x) = f(x) + 1 : phrase inchangée', () => {
		const d = desk(F, 'g(x) = f(x) + 1');
		d.submit('.domaine g');
		expect(last(d).text).toBe(
			'g est définie sur [0 ; +∞[ (ensemble hérité) ; sans cet héritage, elle le serait sur ℝ.'
		);
	});
});

// =============================================================================
// Commandes sur f(u(x))
// =============================================================================

describe('commandes sur f(u(x))', () => {
	it('N3 .résoudre f(2x) = 4 : x = 1, avec l’étape de l’ensemble (Q3)', () => {
		const d = desk(F);
		d.submit('.résoudre f(2x)=4');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('x = 1');
		const titles = (last(d).steps ?? []).map((s) => s.title);
		expect(titles[0]).toBe('2x doit être dans [0 ; +∞[, donc x est dans [0 ; +∞[');
		expect(titles.at(-1)).toBe('On ne garde que les solutions qui sont dans [0 ; +∞[');
	});

	it('N3 .résoudre g(x) = 4 avec g(x) = f(2x) : même réponse', () => {
		const d = desk(F, 'g(x) = f(2x)');
		d.submit('.résoudre g(x)=4');
		expect(last(d).latex).toBe('x = 1');
	});

	// `.limite (x-3)^2 en +∞` répondait « Je ne sais pas calculer cette limite »
	// (composition sans cas puissance, V66) : pas de tableau
	it('N4 .variations f(x − 3) avec f(x) = x² : tableau sur [3 ; +∞[', () => {
		const d = desk(F);
		d.submit('.variations f(x-3)');
		expect(last(d).failed).toBe(false);
		expect(last(d).table?.domain).toEqual([{ expression: '3' }, { expression: '+\\infty' }]);
	});

	it('N4 .variations f(x − 3) : tableau sur [3 ; +∞[', () => {
		const d = desk('f(x) = sqrt(x) sur [0;+∞[');
		d.submit('.variations f(x-3)');
		expect(last(d).failed).toBe(false);
		expect(last(d).table?.domain).toEqual([{ expression: '3' }, { expression: '+\\infty' }]);
	});

	it('N5 .limite f(2x) en −1 : refus ; en 0 : côté intérieur', () => {
		const d = desk(F);
		d.submit('.limite f(2x) en -1');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain("n'est pas dans l'ensemble");
		d.submit('.limite f(2x) en 0');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toContain('0^+');
	});

	it('N6 .intégrer f(2x) de −1 à 1 : refus ; de 0 à 1 : calculée', () => {
		const d = desk(F);
		d.submit('.intégrer f(2x) de -1 à 1');
		expect(last(d).failed).toBe(true);
		d.submit('.intégrer f(2x) de 0 à 1');
		expect(last(d).failed).toBe(false);
	});

	it('N6 .évaluer f(2x) en x=−1 : refus', () => {
		const d = desk(F);
		d.submit('.évaluer f(2x) en x=-1');
		expect(last(d).failed).toBe(true);
	});
});

describe('f⁻¹(u(x)) : même règle sur l’ensemble de départ de f⁻¹', () => {
	// Sans étapes : `ln(2x) = 0` n'est pas rédigé, le moteur répond seul
	it('f(x) = eˣ : .résoudre f⁻¹(2x) = 0 → x = 1/2', () => {
		const d = desk('f(x) = e^x');
		d.submit('.résoudre f^-1(2x)=0');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('x = \\dfrac{1}{2}');
	});

	it('f(x) = x + 1 sur [0 ; +∞[ : f⁻¹(2x) sur [1/2 ; +∞[', () => {
		const d = desk('f(x) = x+1 sur [0;+∞[', 'g(x) = f^-1(2x)', 'h(x) = x sur [1/2;+∞[');
		expect(label(d, 'g')).toBe(label(d, 'h'));
	});

	it('f⁻¹(x²) : refus, u non affine', () => {
		const d = desk('f(x) = e^x');
		d.submit('.résoudre f^-1(x^2)=0');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toContain('ax + b');
	});
});

describe('suites de revue', () => {
	it('u à valeur interdite simplifiée ((x²−1)/(x−1)) : 1 exclu, pas annoncé dans l’ensemble', () => {
		const d = desk(F, 'g(x) = f((x^2-1)/(x-1))');
		expect(label(d, 'g')).toBe('[−1 ; +∞[ \\ {1}');
	});

	it('g(t) = f(2t) : la condition dit 2t, la lettre de l’élève', () => {
		const d = desk(F, 'g(t) = f(2t)');
		d.submit('.domaine g');
		expect(last(d).text).toContain('2t doit être dans [0 ; +∞[');
	});

	it('identifiants d’étapes distincts, à partir de 1', () => {
		const d = desk(F);
		for (const typed of ['.résoudre f(2x)=4', '.résoudre f(x)=4']) {
			d.submit(typed);
			const ids = (last(d).steps ?? []).map((s) => s.id);
			expect(ids.length).toBeGreaterThan(1);
			expect(new Set(ids).size).toBe(ids.length);
			expect(ids[0]).toBe(1);
		}
	});

	it('a < 0 : points exclus dans l’ordre croissant', () => {
		const d = desk('f(x) = x sur ℝ\\{1;2}', 'g(x) = f(-x)', 'h(x) = x sur ℝ\\{-2;-1}');
		expect(label(d, 'g')).toBe(label(d, 'h'));
	});
});
