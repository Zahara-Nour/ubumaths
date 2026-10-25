/**
 * Atelier — une fonction définie sur un intervalle : les suites décidées par
 * David le 2026-10-13 (journal de `docs/archive/wip/atelier-intervalle-phase0.md`,
 * décisions a, b, d, e, f, g ; c = futur chantier).
 *
 * Tout passe par les vrais chemins : `CalcDesk.submit` (la vue Calcul),
 * `CalcDesk.image`, `syncPlots` (le tracé), `atelierFromCurves` (le lien).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import type { Entry } from '../desk.svelte';
import {
	areaRefusal,
	intervalFieldLatex,
	intervalLabelOf,
	plotRestrictionOf,
	tangentRefusal
} from '../interval';
import { atelierFromCurves } from '../grapheur-link';
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

// =============================================================================
// a) .domaine
// =============================================================================

describe('a) .domaine d’une fonction définie sur un intervalle', () => {
	it('l’ensemble choisi, puis celui qu’elle aurait sans ce choix', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.domaine f');
		expect(last(d).failed).toBe(false);
		expect(last(d).text).toBe(
			'f est définie sur [0 ; +∞[ (ensemble choisi) ; sans ce choix, elle le serait sur ℝ.'
		);
	});

	it('`f(x)` tapé avec son argument : pareil', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.domaine f(x)');
		expect(last(d).text).toContain('f est définie sur [0 ; +∞[ (ensemble choisi)');
	});

	it('ensemble choisi = domaine naturel : pas de redite', () => {
		const d = desk('k(x) = ln(x) sur ]0;+∞[');
		d.submit('.domaine k');
		expect(last(d).text).toBe('k est définie sur ]0 ; +∞[ (ensemble choisi).');
	});

	it('sans intervalle : inchangé', () => {
		const d = desk('m(x) = x^2');
		d.submit('.domaine m');
		expect(last(d).text).toBe('D = ℝ');
	});
});

// =============================================================================
// b) .intégrer, .évaluer hors de l'ensemble
// =============================================================================

describe('b) .intégrer et .évaluer hors de l’ensemble : refus comme f(5)', () => {
	it('.évaluer f en x=5 avec f sur [0;2]', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.submit('.évaluer f en x=5');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("5 n'est pas dans l'ensemble de définition de f, [0 ; 2].");
		d.submit('.évaluer f en x=1');
		expect(last(d).failed).toBe(false);
	});

	it('.intégrer : la borne qui sort est nommée', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.intégrer f de -1 à 2');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("-1 n'est pas dans l'ensemble de définition de f, [0 ; +∞[.");
		d.submit('.intégrer f(x) de 0 à 3');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('9');
	});

	it('.intégrer : les deux bornes dedans, un trou entre elles', () => {
		const d = desk('h(x) = x sur [-1;1] \\cup [2;3]');
		d.submit('.intégrer h de 0 à 3');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe(
			"Une partie de [0 ; 3], ]1 ; 2[, n'est pas dans l'ensemble de définition de h, [−1 ; 1] ∪ [2 ; 3]."
		);
	});

	it('une borne π s’écrit π dans le refus (revue)', () => {
		const d = desk('f(x) = x^2 sur [0;3]');
		d.submit('.intégrer f de 0 à π');
		expect(last(d).text).toBe("π n'est pas dans l'ensemble de définition de f, [0 ; 3].");
	});

	it('une borne ouverte ne compte pas : x² sur ]0;2], de 0 à 2 → 8/3', () => {
		const d = desk('f(x) = x^2 sur ]0;2]');
		d.submit('.intégrer f de 0 à 2');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('\\dfrac{8}{3}');
	});

	it('un point exclu ne compte pas : x² sur [0;1[ ∪ ]1;2], de 0 à 2 → 8/3', () => {
		const d = desk('p(x) = x^2 sur [0;1[ \\cup ]1;2]');
		d.submit('.intégrer p de 0 à 2');
		expect(last(d).failed).toBe(false);
		expect(last(d).latex).toBe('\\dfrac{8}{3}');
	});

	it('1/(x−1) hors de 1 : la divergence est dite par .intégrer, pas par l’ensemble', () => {
		const d = desk('q(x) = 1/(x-1) sur ]-∞;1[ \\cup ]1;+∞[');
		d.submit('.intégrer q de 0 à 2');
		expect(last(d).text).not.toContain("n'est pas dans l'ensemble");
		expect(last(d).text).toContain('diverge');
	});

	it('bornes dans l’ordre inverse : même jugement', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.submit('.intégrer f de 2 à 0');
		expect(last(d).failed).toBe(false);
	});
});

// =============================================================================
// d) une fonction qui cite f hérite de son ensemble
// =============================================================================

describe('d) une fonction qui cite une fonction à intervalle en hérite', () => {
	it('g(x) = f(x) + 1 : définie sur [0 ; +∞[', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		expect(label(d, 'g')).toBe('[0 ; +∞[');
	});

	it('l’incohérence disparaît : .résoudre g(x)=5 et f(x)+1=5 donnent 2', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		d.submit('.résoudre g(x)=5');
		expect(last(d).latex).toBe('x = 2');
		d.submit('.résoudre f(x)+1=5');
		expect(last(d).latex).toBe('x = 2');
	});

	it('g(−2) refusé, g(1) calculé', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		d.submit('g(-2)');
		expect(last(d).failed).toBe(true);
		expect(last(d).text).toBe("-2 n'est pas dans l'ensemble de définition de g, [0 ; +∞[.");
		d.submit('g(1)');
		expect(last(d).latex).toBe('2');
	});

	it('tracé restreint', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		expect(plotted(d, 'g').restriction).toEqual([
			{ from: 0, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});

	it('plusieurs fonctions citées : l’intersection', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'h(x) = x sur ]-∞;3]', 'k(x) = f(x) + h(x)');
		expect(label(d, 'k')).toBe('[0 ; 3]');
	});

	it('son propre « sur » : l’intersection avec l’héritage', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1 sur [-5;1]');
		expect(label(d, 'g')).toBe('[0 ; 1]');
		// Le champ garde ce que l'élève a écrit, pas l'héritage
		expect(d.atelier.get('g')).toMatchObject({ interval: '[-5;1]' });
	});

	it('recalculé quand f change, disparaît avec son ensemble', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		d.submit('f(x) = x^2 sur [1;2]');
		expect(label(d, 'g')).toBe('[1 ; 2]');
		d.submit('f(x) = x^2');
		expect(label(d, 'g')).toBeNull();
	});

	it('en chaîne, et jusqu’à la dérivée', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1', 'h(x) = 2g(x)');
		expect(label(d, 'h')).toBe('[0 ; +∞[');
		d.submit('.dériver g');
		expect(label(d, "g'")).toBe('[0 ; +∞[');
	});

	it('f appelée sur un nombre : g n’hérite de rien', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(2) + x');
		expect(label(d, 'g')).toBeNull();
	});

	it('f(2x) : g en erreur, pas calculée sur ℝ en silence (décision c)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('g(x) = f(2x)');
		const g = d.atelier.get('g');
		expect(g?.status).toBe('error');
		expect(g?.message).toContain('f(2x)');
	});

	it('ensembles cités sans nombre en commun : erreur qui le dit, et .domaine ne l’affirme pas (revue)', () => {
		const d = desk('f(x) = x sur [0;1]', 'h(x) = x sur [2;3]');
		d.submit('k(x) = f(x) + h(x)');
		const k = d.atelier.get('k');
		expect(k?.status).toBe('error');
		expect(k?.message).toBe(
			"k n'est définie nulle part : les ensembles des fonctions qu'elle cite n'ont aucun nombre en commun."
		);
		d.submit('.domaine k');
		expect(last(d).text).not.toContain('ensemble choisi');
	});

	it('son « sur » hors de l’héritage : erreur qui nomme l’ensemble hérité', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('g(x) = f(x) + 1 sur [-5;-1]');
		expect(d.atelier.get('g')?.message).toBe(
			"g n'est définie nulle part : les fonctions qu'elle cite ne le sont que sur [0 ; +∞[."
		);
	});

	it('le champ de la carte garde le « sur » de l’élève, pas l’héritage (revue)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1 sur [-1;5]');
		const field = intervalFieldLatex(d.atelier.get('g')!);
		expect(field).toContain('[-1;5]');
	});

	it('.domaine g : l’ensemble hérité se dit hérité (revue)', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		d.submit('.domaine g');
		expect(last(d).text).toBe(
			'g est définie sur [0 ; +∞[ (ensemble hérité) ; sans cet héritage, elle le serait sur ℝ.'
		);
	});

	it('l’héritage n’est pas sauvegardé : il se relit sur f', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[', 'g(x) = f(x) + 1');
		const saved = d.atelier.serialize().objects.find((o) => o.name === 'g');
		expect(saved).toBeDefined();
		expect(saved).not.toHaveProperty('interval');
		const restored = new Atelier();
		restored.restore(d.atelier.serialize());
		expect(intervalLabelOf(restored.get('g')!)).toBe('[0 ; +∞[');
	});
});

// =============================================================================
// e) .variations … dans [a;b] gardé
// =============================================================================

describe('e) .variations … dans [a;b]', () => {
	it('sur l’ensemble croisé avec `dans`', () => {
		const d = desk('f(x) = x^2 sur [0;+∞[');
		d.submit('.variations f dans [-3;2]');
		expect(last(d).table?.domain).toEqual([{ expression: '0' }, { expression: '2' }]);
	});
});

// =============================================================================
// f) tangente et aire du graphique
// =============================================================================

describe('f) tangente et aire hors de l’ensemble', () => {
	it('tangente : refusée hors de l’ensemble, acceptée à une borne fermée', () => {
		const d = desk('f(x) = x^2 sur [0;2[');
		const f = d.atelier.get('f');
		expect(tangentRefusal(f, -1)).toBe(
			"x₀ = −1 n'est pas dans l'ensemble de définition de f, [0 ; 2[."
		);
		expect(tangentRefusal(f, 0)).toBeNull();
		expect(tangentRefusal(f, 1)).toBeNull();
		expect(tangentRefusal(f, 2)).not.toBeNull();
	});

	it('aire : refusée si [a ; b] sort de l’ensemble', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		const f = d.atelier.get('f');
		expect(areaRefusal(f, 0, 2)).toBeNull();
		expect(areaRefusal(f, 1, 3)).toBe("3 n'est pas dans l'ensemble de définition de f, [0 ; 2].");
	});

	it('aire sur ]0;2] de 0 à 2 : acceptée (borne ouverte, longueur nulle)', () => {
		const d = desk('f(x) = x^2 sur ]0;2]');
		expect(areaRefusal(d.atelier.get('f'), 0, 2)).toBeNull();
		expect(tangentRefusal(d.atelier.get('f'), 0)).not.toBeNull();
	});

	it('sans ensemble : tout est permis', () => {
		const d = desk('f(x) = x^2');
		expect(tangentRefusal(d.atelier.get('f'), -1)).toBeNull();
		expect(areaRefusal(d.atelier.get('f'), -5, 5)).toBeNull();
	});

	it('le grapheur ne reçoit ni la tangente ni l’aire refusées', () => {
		const d = desk('f(x) = x^2 sur [0;2]');
		d.atelier.setDisplay('f', { tangentAt: -1, integral: { from: 1, to: 3 } });
		const curve = plotted(d, 'f');
		expect(curve.tangentAt).toBeNull();
		expect(curve.integral).toBeNull();
		d.atelier.setDisplay('f', { tangentAt: 1, integral: { from: 0, to: 2 } });
		const graph = new GrapheurStore();
		syncPlots(d.atelier, graph);
		const again = graph.functions.filter(isExplicitFunction).at(-1)!;
		expect(again.tangentAt).toBe(1);
		expect(again.integral).toEqual({ from: 0, to: 2 });
	});
});

// =============================================================================
// g) le lien ?f=… sur …
// =============================================================================

describe('ℝ\\{1} écrit collé (revue de #1337)', () => {
	it('se lit comme ℝ \\ {1}', () => {
		const d = desk('g(x) = x^2 sur ℝ\\{1}');
		expect(label(d, 'g')).toBe(label(desk('g(x) = x^2 sur ℝ \\ {1}'), 'g'));
		expect(label(d, 'g')).not.toBeNull();
	});
});

describe('g) le lien de projection lit « sur »', () => {
	it('?f=x^2 sur [0;+∞[ : tracée sur l’ensemble', () => {
		const built = atelierFromCurves(['x^2 sur [0;+∞[']);
		expect(built.ok).toBe(true);
		if (!built.ok) return;
		const f = built.atelier.get('f');
		expect(f?.plotted).toBe(true);
		expect(plotRestrictionOf(f)).toEqual([
			{ from: 0, to: Infinity, fromClosed: true, toClosed: false }
		]);
	});

	it('un ensemble illisible : le lien est refusé avec le message de l’atelier', () => {
		const built = atelierFromCurves(['x^2 sur [0,+oo']);
		expect(built.ok).toBe(false);
	});
});
