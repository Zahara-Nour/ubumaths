/**
 * Les suites sur le graphique et dans Calcul — lot 5b du passage de
 * `/grapheur` par l'atelier (phase 0 §5 U1 à U3).
 *
 * L'atelier détient l'état ; le grapheur reçoit une copie (`plot-sync`) : le
 * LaTeX de la suite, ses autres noms déjà remplacés, et le terme précédent
 * écrit `u_n` — la forme que le grapheur sait relire.
 */

import { describe, it, expect, vi } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { syncPlots } from '../plot-sync';
import { CalcDesk } from '../desk.svelte';
import { termsOf } from '../engine';
import { actionsFor } from '../actions';
import { isSequence } from '../types';
import type { SequencePlottable } from '$lib/grapheur/types';

// =============================================================================
// Décor
// =============================================================================

function recurrence(definition = '0,5u_n + 3', firstTerm = '2'): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'sequence', name: 'u', definition }, 'text');
	atelier.setSequence('u', { firstTerm });
	return atelier;
}

function displayOf(atelier: Atelier, name = 'u') {
	const o = atelier.get(name);
	if (!o || !isSequence(o)) throw new Error('pas une suite');
	return o.display;
}

function onlySequence(graph: GrapheurStore): SequencePlottable {
	const found = graph.functions.filter((p): p is SequencePlottable => p.type === 'sequence');
	expect(found).toHaveLength(1);
	return found[0];
}

// =============================================================================
// Réglages d'affichage (U2)
// =============================================================================

describe('réglages d’une suite', () => {
	it('tracer une suite lui donne ses réglages : nuage, 10 marches', () => {
		const atelier = recurrence();

		atelier.setPlotted('u', true);

		expect(displayOf(atelier)).toMatchObject({ representation: 'ranks', cobwebSteps: 10 });
	});

	it('l’escalier se règle sur une récurrence', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);

		const result = atelier.setSequenceDisplay('u', { representation: 'cobweb', cobwebSteps: 5 });

		expect(result.ok).toBe(true);
		expect(displayOf(atelier)).toMatchObject({ representation: 'cobweb', cobwebSteps: 5 });
	});

	it('l’escalier est refusé sur une suite explicite, avec sa raison', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n + 1' }, 'text');
		atelier.setPlotted('u', true);

		const result = atelier.setSequenceDisplay('u', { representation: 'cobweb' });

		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toContain('récurrence');
	});

	it.each([
		['zéro marche', { cobwebSteps: 0 }],
		['des marches non entières', { cobwebSteps: 2.5 }],
		['une couleur hors palette', { color: '#f00' }]
	])('refuse %s', (_, patch) => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);

		expect(atelier.setSequenceDisplay('u', patch as never).ok).toBe(false);
	});

	it('se range et se relit', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);
		atelier.setSequenceDisplay('u', { representation: 'cobweb', cobwebSteps: 4 });

		const fresh = new Atelier();
		fresh.restore(atelier.serialize());

		expect(displayOf(fresh)).toEqual(displayOf(atelier));
	});
});

// =============================================================================
// Synchronisation vers le grapheur (U2)
// =============================================================================

describe('la suite sur le graphique', () => {
	it('le grapheur reçoit une suite qu’il sait lire', () => {
		const atelier = recurrence('0,5u(n) + 3', '2');
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);

		syncPlots(atelier, graph);

		const plotted = onlySequence(graph);
		expect(plotted).toMatchObject({
			name: 'u',
			mode: 'recurrence',
			firstIndex: 0,
			firstTerm: 2,
			representation: 'ranks',
			parseError: undefined
		});
		expect(plotted.ast).toBeDefined();
	});

	it('suit le premier terme quand il est piloté par un curseur', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '4' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'u_n + 1' }, 'text');
		atelier.setSequence('u', { firstTerm: 'a' });
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		atelier.slideTo('a', 1);
		syncPlots(atelier, graph);

		expect(onlySequence(graph).firstTerm).toBe(1);
	});

	it('suit l’escalier et le nombre de marches', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		atelier.setSequenceDisplay('u', { representation: 'cobweb', cobwebSteps: 3 });
		syncPlots(atelier, graph);

		expect(onlySequence(graph)).toMatchObject({ representation: 'cobweb', cobwebSteps: 3 });
	});

	it('une suite explicite qui cite une valeur est lue', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'q', definition: '3' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: 'q*n' }, 'text');
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);

		syncPlots(atelier, graph);

		expect(onlySequence(graph)).toMatchObject({ mode: 'explicit', parseError: undefined });
	});

	it('n’écrit rien quand rien n’a changé', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		const update = vi.spyOn(graph, 'updateSequence');
		syncPlots(atelier, graph);

		expect(update).not.toHaveBeenCalled();
	});

	it('masque une suite qui ne peut rien produire, sans la retirer', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		atelier.setSequence('u', { firstTerm: 'b' });
		syncPlots(atelier, graph);

		expect(onlySequence(graph).visible).toBe(false);
	});

	it('retirer la suite la retire du graphique', () => {
		const atelier = recurrence();
		atelier.setPlotted('u', true);
		const graph = new GrapheurStore(null);
		syncPlots(atelier, graph);

		atelier.setPlotted('u', false);
		syncPlots(atelier, graph);

		expect(graph.functions.filter((p) => p.type === 'sequence')).toHaveLength(0);
	});
});

// =============================================================================
// U3 : « Premiers termes », et les actions d'une suite
// =============================================================================

describe('« Premiers termes »', () => {
	it('écrit les premiers termes dans Calcul', () => {
		const atelier = recurrence('2u_n', '1');
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('terms', 'u');

		const line = desk.entries.at(-1);
		expect(line?.failed).toBe(false);
		expect(line?.text).toContain('u(0) = 1');
		expect(line?.text).toContain('u(3) = 8');
	});

	it('dit pourquoi quand la suite ne peut rien produire', () => {
		const atelier = recurrence('2u_n', 'b');
		const desk = new CalcDesk(atelier);

		desk.runFromPanel('terms', 'u');

		expect(desk.entries.at(-1)?.failed).toBe(true);
	});

	it('les actions d’une suite : premiers termes, plus de « tracer en nuage / escalier »', () => {
		const atelier = recurrence();

		const ids = actionsFor(atelier.get('u')!, atelier).map((a) => [a.id, a.disabledReason]);

		expect(ids).toContainEqual(['terms', undefined]);
		expect(ids.map(([id]) => id)).not.toContain('plot-points');
		expect(ids.map(([id]) => id)).not.toContain('plot-cobweb');
	});
});

// Ce que MathLive écrit quand on tape `0,5u(n) + 3` dans la carte
describe('saisie MathLive d’une récurrence', () => {
	it('`0{,}5u\\left(n\\right)+3` donne les bons termes', () => {
		const atelier = new Atelier();
		atelier.create(
			{ kind: 'sequence', name: 'u', definition: '0{,}5u\\left(n\\right)+3' },
			'keyboard'
		);
		atelier.setSequence('u', { firstTerm: '2' });

		const terms = termsOf(atelier, 'u', 2);

		expect(atelier.get('u')).toMatchObject({ mode: 'recurrence', status: 'ok' });
		expect(terms.ok && terms.terms.map((t) => t.value)).toEqual([2, 4, 5]);
	});
});
