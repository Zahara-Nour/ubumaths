/**
 * Chantier perf du 2026-10-19 : les raccourcis du recalcul (`perf-switches.ts`)
 * ne changent RIEN à ce que l'élève voit.
 *
 * Une suite de modifications tirée au hasard, graine fixe, sur la figure de
 * 24 objets du banc (`fixtures/figure-24.ts`) : après chaque pas, l'état de
 * l'atelier (sauvegarde, statuts, messages, attentes), les réponses de Calcul,
 * ce que disent les cartes et les points dessinés dans la vue Géométrie.
 *
 * 1. Raccourcis allumés puis éteints : mêmes états, pas à pas.
 * 2. Un atelier NEUF restauré depuis la sauvegarde, à chaque pas : mêmes états
 *    (les mémos d'un atelier qui a vécu ne gardent rien de périmé).
 * 3. Une photo (`serialize`), d'autres modifications, puis `restore(photo)` :
 *    l'atelier est celui qu'on obtient en restaurant la photo dans un neuf
 *    (ce que fera « Annuler », lot 5).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { valueAnswerOf } from '../calcul';
import { figureSummaryOf, followsOf } from '../card-state';
import { AtelierFigure, syncFigure } from '../figure-sync';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { isFigureObject } from '../types';
import { perfSwitches } from '../perf-switches';
import { figure24 } from './fixtures/figure-24';

// =============================================================================
// Outils
// =============================================================================

/** Générateur pseudo-aléatoire à graine (mulberry32) : la même suite à chaque passage. */
function random(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

type Step = (atelier: Atelier) => void;

/** Les gestes de l'élève tirés au hasard : curseurs, points déplacés, définitions changées. */
function stepsOf(seed: number, count: number, withAngleUnit: boolean): Step[] {
	const next = random(seed);
	const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
	const small = () => String(Math.floor(next() * 7) - 2);
	const gestures: (() => Step)[] = [
		() => {
			const v = Math.round(next() * 100) / 100;
			return (a) => void a.slideTo('a', v);
		},
		() => {
			const v = Math.round(next() * 40) / 10;
			return (a) => void a.slideTo('b', v);
		},
		() => {
			const name = pick(['A', 'B', 'C']);
			const text = `(${small()} ; ${small()})`;
			return (a) => void a.update(name, text, 'text');
		},
		() => {
			const text = `cercle(${pick(['A', 'B', 'I'])} ; ${pick(['1', '2', '3', 'AM', 'b'])})`;
			return (a) => void a.update('c', text, 'text');
		},
		() => {
			const text = `intersection(${pick(['s', 'h', 'd'])}, c, ${pick(['1', '2'])})`;
			return (a) => void a.update('F', text, 'text');
		},
		() => {
			const text = pick(['AM', 'AK', 'aire(A ; B ; C)', 'L', 'angle(M, A, C)', 'a + 1']);
			return (a) => void a.update('L', text, 'text');
		},
		() => {
			const text = pick(['point_sur(s ; a)', 'point_sur(t ; a)', 'point_sur(c ; a)']);
			return (a) => void a.update('M', text, 'text');
		},
		() => (a) => {
			if (a.get('N') !== undefined) a.remove('N');
			else a.create({ kind: 'point', name: 'N', definition: '(b ; 1)' }, 'text');
		}
	];
	if (withAngleUnit) {
		gestures.push(() => {
			const unit = pick(['deg', 'rad'] as const);
			return (a) => a.setAngleUnit(unit);
		});
	}
	return Array.from({ length: count }, () => pick(gestures)());
}

/** Les points dessinés dans la vue Géométrie, arrondis. */
function drawnPoints(atelier: Atelier): Record<string, [number, number] | null> {
	const target = new AtelierFigure();
	syncFigure(atelier, target);
	const drawn: Record<string, [number, number] | null> = {};
	for (const el of target.figure.getAllElements()) {
		if (!el.visible || el.label === undefined || el.label === '') continue;
		const p = target.figure.getPosition(el.id);
		drawn[el.label] = p ? [round(geoToNumber(p.x)), round(geoToNumber(p.y))] : null;
	}
	return drawn;
}

function round(v: number): number {
	return Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 : v;
}

/** Tout ce que l'élève voit, en données comparables. */
function snapshot(atelier: Atelier): unknown {
	const session = { atelier, engine: new WebReplEngine(), seed: () => 1 };
	return {
		saved: atelier.serialize(),
		objects: atelier.objects.map((o) => ({
			name: o.name,
			kind: o.kind,
			status: o.status,
			message: o.message,
			missing: o.missing,
			dependents: atelier.dependents(o.name),
			card:
				o.kind === 'value'
					? valueAnswerOf(atelier, o.name)
					: isFigureObject(o)
						? { summary: figureSummaryOf(atelier, o.name), follows: followsOf(atelier, o) }
						: null
		})),
		calcul: ['S', 'L * 2', 'U + T', 'Q', 'AM'].map((line) => runInput(session, line)),
		drawn: drawnPoints(atelier)
	};
}

function allSwitches(on: boolean): void {
	perfSwitches.readCache = on;
	perfSwitches.scopedBindings = on;
	perfSwitches.refsMemo = on;
}

afterEach(() => allSwitches(true));

// =============================================================================
// 1. Raccourcis allumés / éteints
// =============================================================================

describe('les raccourcis du recalcul rendent exactement le chemin long', () => {
	// 28 : t = [BC] devient un point (B = C) alors que M = point_sur(t ; a) et des
	// mesures citent M — le seul cas trouvé sur 40 graines où le message de M
	// dépendait de l'ordre des calculs, avant `#constructions` (voir son commentaire)
	for (const seed of [1, 7, 28, 2026]) {
		// Le chemin long est LENT (c'est la raison du chantier) : délai large
		it(`graine ${seed} : 40 gestes, mêmes états pas à pas`, { timeout: 60_000 }, () => {
			const steps = stepsOf(seed, 40, true);

			allSwitches(true);
			const fast = figure24();
			const fastStates = steps.map((step) => {
				step(fast);
				return snapshot(fast);
			});

			allSwitches(false);
			const slow = figure24();
			steps.forEach((step, i) => {
				step(slow);
				expect(snapshot(slow), `pas ${i + 1}`).toEqual(fastStates[i]);
			});
		});
	}
});

// =============================================================================
// 2. Un atelier qui a vécu = un atelier neuf restauré
// =============================================================================

describe('un atelier qui a vécu vaut un atelier neuf restauré depuis sa sauvegarde', () => {
	for (const seed of [3, 11]) {
		it(`graine ${seed} : 30 gestes`, { timeout: 60_000 }, () => {
			const atelier = figure24();
			stepsOf(seed, 30, false).forEach((step, i) => {
				step(atelier);
				const fresh = new Atelier();
				fresh.restore(atelier.serialize());
				expect(snapshot(fresh), `pas ${i + 1}`).toEqual(snapshot(atelier));
			});
		});
	}
});

// =============================================================================
// 3. restore(photo) après d'autres modifications (Annuler, lot 5)
// =============================================================================

describe('restore(photo) rend l’atelier de la photo, quoi qu’on ait fait depuis', () => {
	for (const seed of [5, 13, 21]) {
		it(`graine ${seed}`, { timeout: 60_000 }, () => {
			const atelier = figure24();
			const [before, after] = [stepsOf(seed, 15, false), stepsOf(seed + 100, 15, false)];
			for (const step of before) step(atelier);
			const photo = atelier.serialize();
			// Les réponses lues AVANT les autres modifications : les mémos s'en remplissent
			snapshot(atelier);
			for (const step of after) step(atelier);
			snapshot(atelier);

			atelier.restore(photo);
			const fresh = new Atelier();
			fresh.restore(photo);
			expect(snapshot(atelier)).toEqual(snapshot(fresh));
		});
	}
});
