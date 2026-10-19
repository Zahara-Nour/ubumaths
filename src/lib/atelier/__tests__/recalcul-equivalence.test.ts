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
import { figureFonctions } from './fixtures/figure-fonctions';

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

/** Les gestes sur la seconde figure : fonctions, dérivée, réciproque, suites, renommages. */
function functionStepsOf(seed: number, count: number): Step[] {
	const next = random(seed);
	const pick = <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)];
	const gestures: (() => Step)[] = [
		() => {
			const v = Math.round(next() * 12 - 6) / 2;
			return (a) => void a.slideTo(a.get('a') ? 'a' : 't', v);
		},
		() => {
			const text = pick(['a x^2', 'a x^3 + b', 'x^2 + c_2', 'k(x) + 1']);
			return (a) => void a.update('f', text.replace(/\ba\b/g, a.get('a') ? 'a' : 't'), 'text');
		},
		() => {
			const text = pick(['a x + b', '3x - b', 'x^2', 'a x']);
			return (a) => void a.update('k', text.replace(/\ba\b/g, a.get('a') ? 'a' : 't'), 'text');
		},
		() => {
			const text = pick(['2n + b', 'n^2 - b', 'u(n) + 1']);
			return (a) => void a.update('v', text, 'text');
		},
		() => {
			const first = pick(['a', 'b', '2']);
			return (a) =>
				void a.setSequence('u', { firstTerm: first === 'a' && !a.get('a') ? 't' : first });
		},
		() => (a) => {
			if (a.get('g') !== undefined) a.remove('g');
			else a.create({ kind: 'function', name: 'g', definition: "f'(x) + 1" }, 'text');
		},
		() => (a) => {
			if (a.get('a') !== undefined) a.rename('a', 't');
			else a.rename('t', 'a');
		},
		() => {
			const x = pick(['b', '1', 'c_2', 'm']);
			return (a) => void a.update('B', `(${x} ; 1)`, 'text');
		},
		() => {
			const text = pick(['AB + 1', 'AB * b', '2', 'aire(A ; B ; P)']);
			return (a) => void a.update('m', text, 'text');
		}
	];
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
const FIGURE_LINES = ['S', 'L * 2', 'U + T', 'Q', 'AM'];
const FUNCTION_LINES = ['r', 'g(2)', 'h(5)', 'u(3)', 'w(2)', 'm', 'c_2', "f'(1)", 'q'];

function snapshot(atelier: Atelier, lines: readonly string[] = FIGURE_LINES): unknown {
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
		calcul: lines.map((line) => runInput(session, line)),
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

// =============================================================================
// 4. La seconde figure : fonctions, dérivée, réciproque, suites (revue du chantier)
// =============================================================================

describe('fonctions, dérivée, réciproque, suites : les raccourcis rendent le chemin long', () => {
	for (const seed of [2, 9, 17, 30]) {
		it(`graine ${seed} : 30 gestes, allumés / éteints`, { timeout: 60_000 }, () => {
			const steps = functionStepsOf(seed, 30);
			allSwitches(true);
			const fast = figureFonctions();
			const fastStates = steps.map((step) => {
				step(fast);
				return snapshot(fast, FUNCTION_LINES);
			});
			allSwitches(false);
			const slow = figureFonctions();
			steps.forEach((step, i) => {
				step(slow);
				expect(snapshot(slow, FUNCTION_LINES), `pas ${i + 1}`).toEqual(fastStates[i]);
			});
		});

		it(`graine ${seed} : restore(photo) = atelier neuf restauré`, { timeout: 60_000 }, () => {
			const atelier = figureFonctions();
			const [before, after] = [functionStepsOf(seed, 12), functionStepsOf(seed + 100, 12)];
			for (const step of before) step(atelier);
			const photo = atelier.serialize();
			snapshot(atelier, FUNCTION_LINES);
			for (const step of after) step(atelier);
			snapshot(atelier, FUNCTION_LINES);
			atelier.restore(photo);
			const fresh = new Atelier();
			fresh.restore(photo);
			expect(snapshot(atelier, FUNCTION_LINES)).toEqual(snapshot(fresh, FUNCTION_LINES));
		});
	}
});

// =============================================================================
// 5. Le message d'un objet qui cite une construction en échec : l'ordre des cartes n'y fait rien
// =============================================================================

describe('t = [BC] réduit à un point : M = point_sur(t ; a) dit « Dépend de « t » »', () => {
	type Entry = ['value' | 'point' | 'curve', string, string];
	const a: Entry = ['value', 'a', '0,3'];
	const B: Entry = ['point', 'B', '(1 ; 1)'];
	const C: Entry = ['point', 'C', '(1 ; 1)'];
	const t: Entry = ['curve', 't', '[BC]'];
	const M: Entry = ['point', 'M', 'point_sur(t ; a)'];
	const A: Entry = ['point', 'A', '(0 ; 0)'];
	const L: Entry = ['value', 'L', 'AM'];
	for (const [label, entries] of [
		['t avant M', [a, B, C, t, M, L, A]],
		['M avant t', [a, M, B, C, t, A, L]]
	] as const) {
		it(label, () => {
			const atelier = new Atelier();
			for (const [kind, name, definition] of entries) {
				atelier.create({ kind, name, definition }, 'text');
			}
			expect(atelier.get('t')?.message).toBe(
				'Les deux points sont confondus : le segment est réduit à un point.'
			);
			expect(atelier.get('M')?.message).toBe('Dépend de « t », qui est en erreur.');
			expect(atelier.get('L')?.message).toBe('Dépend de « M », qui est en erreur.');
		});
	}
});
