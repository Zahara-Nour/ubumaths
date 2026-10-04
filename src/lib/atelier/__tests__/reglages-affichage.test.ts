/**
 * Les réglages d'affichage appartiennent à l'objet — lot 1 du passage de
 * `/grapheur` par l'atelier.
 *
 * Phase 0 : `docs/wip/atelier-grapheur-phase0.md` §1 (S1 à S5, L1). L'atelier
 * détient l'état (décision figée n° 1) : couleur, style, tangente, aire… sont
 * rangés sur l'objet et RECOPIÉS vers le grapheur, jamais l'inverse. Sinon un
 * réglage fait dans la carte serait écrasé à la synchronisation suivante.
 */

import { describe, it, expect, vi } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots, curveOf } from '../plot-sync';
import { isExplicitFunction, type ExplicitFunction } from '$lib/grapheur/types';
import { loadAtelier, saveAtelier, ATELIER_STORAGE_KEY, type AtelierState } from '../persistence';
import { encodeAtelier, decodeAtelier } from '../url';
import { mergeInto } from '../merge';
import { isFunction } from '../types';

// =============================================================================
// Décor
// =============================================================================

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, v)
	};
}

/** Un atelier avec `f` tracée. */
function withPlotted(definition = 'x^2'): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition });
	atelier.setPlotted('f', true);
	return atelier;
}

function displayOf(atelier: Atelier, name: string) {
	const object = atelier.get(name);
	if (!object || !isFunction(object)) throw new Error(`${name} n'est pas une fonction`);
	return object.display;
}

/** La seule courbe posée dans le grapheur. */
function onlyCurve(graph: GrapheurStore): ExplicitFunction {
	const curves = graph.functions.filter(isExplicitFunction);
	expect(curves).toHaveLength(1);
	return curves[0];
}

// =============================================================================
// Le modèle
// =============================================================================

describe('réglages d’affichage — attribution', () => {
	it('tracer une fonction lui donne une couleur, un style et une épaisseur', () => {
		const atelier = withPlotted();

		const display = displayOf(atelier, 'f');
		expect(display).toBeDefined();
		expect(display!.lineWidth).toBe(2);
		expect(display!.tangentAt).toBeNull();
		expect(display!.integral).toBeNull();
		expect(display!.showOsculating).toBe(false);
		expect(display!.showArcLength).toBe(false);
	});

	it('deux fonctions tracées ne reçoivent pas le même couple couleur/style', () => {
		const atelier = withPlotted();
		atelier.create({ kind: 'function', name: 'g', definition: 'x+1' });
		atelier.setPlotted('g', true);

		const f = displayOf(atelier, 'f')!;
		const g = displayOf(atelier, 'g')!;
		expect(`${g.color}|${g.lineStyle}`).not.toBe(`${f.color}|${f.lineStyle}`);
	});

	it('une fonction jamais tracée n’a pas de réglages (rien à ranger)', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		expect(displayOf(atelier, 'f')).toBeUndefined();
	});

	// Phase 0 §1 L1
	it('retirer puis retracer garde la couleur et les réglages', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3', tangentAt: 1.5 });

		atelier.setPlotted('f', false);
		atelier.setPlotted('f', true);

		expect(displayOf(atelier, 'f')).toMatchObject({ color: 'curve-3', tangentAt: 1.5 });
	});

	// Même famille que le curseur écrasé : `build()` fabrique un objet neuf
	it('modifier la définition garde les réglages', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3', integral: { from: 0, to: 2 } });

		atelier.update('f', 'x^3');

		expect(displayOf(atelier, 'f')).toMatchObject({
			color: 'curve-3',
			integral: { from: 0, to: 2 }
		});
	});
});

describe('réglages d’affichage — modification', () => {
	it('change chaque réglage', () => {
		const atelier = withPlotted();

		const result = atelier.setDisplay('f', {
			color: 'curve-3',
			lineStyle: 'dotted',
			lineWidth: 4,
			tangentAt: -1,
			integral: { from: -2, to: 3 },
			showOsculating: true,
			showArcLength: true
		});

		expect(result.ok).toBe(true);
		expect(displayOf(atelier, 'f')).toEqual({
			color: 'curve-3',
			lineStyle: 'dotted',
			lineWidth: 4,
			tangentAt: -1,
			integral: { from: -2, to: 3 },
			showOsculating: true,
			showArcLength: true
		});
	});

	it('retire la tangente et l’aire avec null', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { tangentAt: 2, integral: { from: 0, to: 1 } });

		atelier.setDisplay('f', { tangentAt: null, integral: null });

		expect(displayOf(atelier, 'f')).toMatchObject({ tangentAt: null, integral: null });
	});

	// Sinon la sauvegarde ne part pas : elle écoute `revision`
	it('compte comme une modification de l’atelier', () => {
		const atelier = withPlotted();
		const before = atelier.revision;

		atelier.setDisplay('f', { color: 'curve-3' });

		expect(atelier.revision).toBeGreaterThan(before);
	});

	it.each([
		['un objet absent', 'h', { color: 'curve-3' }],
		['une couleur hors palette', 'f', { color: '#ff0000' }],
		['une épaisseur hors liste', 'f', { lineWidth: 7 }],
		['un style inconnu', 'f', { lineStyle: 'wavy' }],
		['une abscisse de tangente infinie', 'f', { tangentAt: Infinity }],
		['une borne d’aire non numérique', 'f', { integral: { from: NaN, to: 1 } }]
	])('refuse %s, sans rien changer', (_, name, patch) => {
		const atelier = withPlotted();
		const before = displayOf(atelier, 'f');

		// Le patch vient d'un appelant non typé (relecture, URL) : on le force.
		const result = atelier.setDisplay(name, patch as never);

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).not.toBe('');
		expect(displayOf(atelier, 'f')).toEqual(before);
	});

	it('refuse un objet qui n’est pas une fonction', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });

		const result = atelier.setDisplay('a', { color: 'curve-3' });

		expect(result.ok).toBe(false);
	});
});

// =============================================================================
// Rangement, lien, fusion (S4)
// =============================================================================

describe('réglages d’affichage — rangés avec l’objet', () => {
	it('sont rangés, et relus à l’identique', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3', tangentAt: 1, showOsculating: true });

		const storage = memoryStorage();
		saveAtelier(storage, atelier.serialize());
		const loaded = loadAtelier(storage);
		expect(loaded.kind).toBe('loaded');

		const fresh = new Atelier();
		if (loaded.kind === 'loaded') fresh.restore(loaded.state);

		expect(displayOf(fresh, 'f')).toEqual(displayOf(atelier, 'f'));
		expect(fresh.get('f')?.plotted).toBe(true);
	});

	it('ne coûtent rien à une fonction qui n’en a pas', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });

		expect(atelier.serialize().objects[0]).not.toHaveProperty('display');
	});

	// Un réglage abîmé ne doit pas coûter la fonction elle-même
	it('un réglage illisible est oublié, l’objet est gardé', () => {
		const state = {
			version: 1,
			objects: [
				{
					name: 'f',
					kind: 'function',
					definition: 'x^2',
					plotted: true,
					display: { color: 'pas-une-couleur' }
				}
			]
		};
		const storage = memoryStorage();
		storage.setItem(ATELIER_STORAGE_KEY, JSON.stringify(state));

		const loaded = loadAtelier(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		expect(loaded.state.objects).toHaveLength(1);
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		// Tracée quand même : elle reçoit une couleur neuve
		expect(displayOf(fresh, 'f')?.color).toBeDefined();
	});

	it('voyagent dans le lien de partage', async () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3', integral: { from: 0, to: 2 } });

		const encoded = await encodeAtelier(atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const fresh = new Atelier();
		fresh.restore(decoded.state);
		expect(displayOf(fresh, 'f')).toEqual(displayOf(atelier, 'f'));
	});

	it('suivent l’objet quand un lien est fusionné dans un atelier', () => {
		const source = withPlotted();
		source.setDisplay('f', { color: 'curve-3' });
		const state: AtelierState = source.serialize();

		const target = new Atelier();
		target.create({ kind: 'function', name: 'f', definition: 'x' });
		const report = mergeInto(target, state);

		// `f` est pris : l'arrivant est renommé, ses réglages le suivent
		const arrived = report.renamed[0]?.to;
		expect(arrived).toBeDefined();
		expect(displayOf(target, arrived!)?.color).toBe('curve-3');
	});
});

// =============================================================================
// Synchronisation vers le grapheur (sens unique)
// =============================================================================

describe('réglages d’affichage — reportés sur la courbe', () => {
	it('la courbe prend la couleur, le style et l’épaisseur de l’objet', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3', lineStyle: 'dotted', lineWidth: 4 });
		const graph = new GrapheurStore(null);

		syncPlots(atelier, graph);

		expect(onlyCurve(graph)).toMatchObject({ color: 'curve-3', lineStyle: 'dotted', lineWidth: 4 });
	});

	it('suit un réglage modifié après le tracé', () => {
		const atelier = withPlotted();
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		atelier.setDisplay('f', {
			color: 'curve-3',
			tangentAt: 1.5,
			integral: { from: 0, to: 2 },
			showOsculating: true,
			showArcLength: true
		});
		syncPlots(atelier, graph);

		expect(onlyCurve(graph)).toMatchObject({
			color: 'curve-3',
			tangentAt: 1.5,
			integral: { from: 0, to: 2 },
			showOsculating: true,
			showArcLength: true
		});
	});

	it('la couleur de la carte est celle de la courbe', () => {
		const atelier = withPlotted();
		const graph = new GrapheurStore(null);

		syncPlots(atelier, graph);

		expect(onlyCurve(graph).color).toBe(displayOf(atelier, 'f')!.color);
		expect(onlyCurve(graph).lineStyle).toBe(displayOf(atelier, 'f')!.lineStyle);
	});

	// Phase 0 Q1 : la case « f′ » est supprimée, « Dériver » la remplace
	it('ne trace jamais la dérivée par la case du grapheur', () => {
		const atelier = withPlotted();
		const graph = new GrapheurStore(null);

		syncPlots(atelier, graph);

		expect(onlyCurve(graph).showDerivative).toBe(false);
	});

	// L'effet qui appelle `syncPlots` lit ce qu'il écrit : sans idempotence,
	// il boucle (`effect_update_depth_exceeded`)
	it('n’écrit rien quand aucun réglage n’a changé', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { tangentAt: 1, integral: { from: 0, to: 1 } });
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		const update = vi.spyOn(graph, 'updateFunction');
		syncPlots(atelier, graph);

		expect(update).not.toHaveBeenCalled();
	});

	// Un seul sens : un réglage fait dans le grapheur ne remonte pas
	it('ne relit jamais un réglage fait dans le grapheur', () => {
		const atelier = withPlotted();
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);
		const color = displayOf(atelier, 'f')!.color;

		graph.updateFunction(onlyCurve(graph).id, {
			color: color === 'curve-3' ? 'curve-2' : 'curve-3'
		});
		syncPlots(atelier, graph);

		expect(displayOf(atelier, 'f')!.color).toBe(color);
		expect(onlyCurve(graph).color).toBe(color);
	});
});

// =============================================================================
// Revue du lot 1
// =============================================================================

describe('réglages d’affichage — revue du lot 1', () => {
	// Finding 1 : zod 4 garde la clé `undefined` d'un `.partial()`. Le spread
	// posait alors `integral: undefined`, et `serialize()` jetait sur `.from`.
	it('une clé valant undefined ne touche pas au réglage', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { integral: { from: 0, to: 2 }, tangentAt: 1 });

		atelier.setDisplay('f', { integral: undefined, tangentAt: undefined });

		expect(displayOf(atelier, 'f')).toMatchObject({ integral: { from: 0, to: 2 }, tangentAt: 1 });
		expect(() => structuredClone(atelier.serialize())).not.toThrow();
	});

	// Finding 8 : `plainDisplay` sur un `integral` réel, dans `structuredClone`
	it('une aire posée se range sans proxy', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { integral: { from: -1, to: 1 } });

		const cloned = structuredClone(atelier.serialize());

		expect(cloned.objects[0].display?.integral).toEqual({ from: -1, to: 1 });
	});

	// Finding 2 : mêmes bornes que le grapheur, sinon le jour où il range ce
	// réglage, sa relecture refuse TOUT son état
	it.each([
		['une tangente au-delà de 1e9', { tangentAt: 1e10 }],
		['une borne d’aire au-delà de 1e9', { integral: { from: 0, to: -1e10 } }]
	])('refuse %s, comme le grapheur', (_, patch) => {
		const atelier = withPlotted();

		expect(atelier.setDisplay('f', patch).ok).toBe(false);
	});

	// Finding 8
	it('renommer garde les réglages', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { color: 'curve-3' });

		atelier.rename('f', 'h');

		expect(displayOf(atelier, 'h')?.color).toBe('curve-3');
	});

	// Finding 9 : rien à changer, donc rien à sauvegarder
	it('un réglage vide ne compte pas comme une modification', () => {
		const atelier = withPlotted();
		const before = atelier.revision;

		expect(atelier.setDisplay('f', {}).ok).toBe(true);

		expect(atelier.revision).toBe(before);
	});

	// Finding 4 : un nom qui pointait vers un nuage et désigne maintenant une
	// fonction doit redevenir une COURBE, pas rester un nuage invisible
	it('un nuage remplacé par une fonction du même nom est retracé en courbe', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4 ; 5 ; 6' });
		atelier.setPlotted('L', true, 'M');
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);
		expect(graph.functions.some((f) => f.type === 'scatter')).toBe(true);

		// Supprimée puis recréée en fonction AVANT que la synchro repasse
		atelier.remove('L');
		atelier.create({ kind: 'function', name: 'L', definition: 'x+1' });
		atelier.setPlotted('L', true);
		syncPlots(atelier, graph);

		expect(graph.functions.map((f) => f.type)).toEqual(['explicit']);
		expect(onlyCurve(graph).latex).toBe('x+1');
	});
});

// Finding 7, mesuré : sans compression (Safari < 16.4), 8 fonctions avec leurs
// réglages complets pesaient 2 332 caractères, au-delà de `MAX_URL_PAYLOAD`
describe('réglages d’affichage — rangement compact', () => {
	it('ne range que la couleur et le style d’un réglage par défaut', () => {
		const atelier = withPlotted();

		const stored = atelier.serialize().objects[0].display;

		expect(Object.keys(stored ?? {}).sort()).toEqual(['color', 'lineStyle']);
	});

	it('range aussi ce qui s’écarte du défaut', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { tangentAt: 0, showArcLength: true });

		const stored = atelier.serialize().objects[0].display;

		expect(stored).toMatchObject({ tangentAt: 0, showArcLength: true });
		expect(stored).not.toHaveProperty('integral');
	});

	it('se relit à l’identique', () => {
		const atelier = withPlotted();
		atelier.setDisplay('f', { lineWidth: 3, integral: { from: 0, to: 1 } });

		const storage = memoryStorage();
		saveAtelier(storage, atelier.serialize());
		const loaded = loadAtelier(storage);
		const fresh = new Atelier();
		if (loaded.kind === 'loaded') fresh.restore(loaded.state);

		expect(displayOf(fresh, 'f')).toEqual(displayOf(atelier, 'f'));
	});
});

// =============================================================================
// Lot 2b : la carte lit la courbe posée pour son objet
// =============================================================================

describe('la courbe d’un objet', () => {
	it('retrouve la courbe que la synchronisation a posée', () => {
		const atelier = withPlotted('x^2');
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		const curve = curveOf(atelier, graph, 'f');

		expect(curve?.id).toBe(onlyCurve(graph).id);
	});

	it('ne rend rien pour un objet non tracé', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		expect(curveOf(atelier, graph, 'f')).toBeUndefined();
	});

	it('ne rend rien pour un grapheur que l’atelier n’a jamais synchronisé', () => {
		const atelier = withPlotted();

		expect(curveOf(atelier, new GrapheurStore(null), 'f')).toBeUndefined();
	});
});
