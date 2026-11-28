/**
 * Réécriture des constructions publiques (`scripts/constructions-prod/contenu.ts`)
 *
 * Chaque script réécrit se charge sans erreur et finit sur la figure annoncée par
 * ses consignes ; la liste des changements couvre les 9 constructions de la prod.
 */

import { describe, expect, it } from 'vitest';
import { ConstructionExecutor } from '#lib/constructions-v2/core/executor.ts';
import { geoToNumber } from '#lib/geometry-core/compute/to-number.ts';
import { isArc } from '#lib/geometry-core/types/elements.ts';
import {
	CHANGES,
	PARALLELOGRAMME,
	PARTAGE_TROIS,
	SYMETRIE_AXIALE
} from '../constructions-prod/contenu';
import {
	CARRE_ID,
	CHANGES as CHANGES_V76,
	carreBackup,
	ccwSweep,
	nameAndHideArcs
} from '../constructions-prod/arcs-carre';

// =============================================================================
// Décor
// =============================================================================

type Pt = { x: number; y: number };

/** Joue le script jusqu'au bout ; rend la position finale de chaque point nommé */
function play(script: string): Map<string, Pt> {
	const exec = new ConstructionExecutor();
	exec.load(script);
	expect(exec.loadError?.message ?? null).toBeNull();
	while (exec.step()) {
		// joue chaque pas jusqu’au bout
	}
	const points = new Map<string, Pt>();
	for (const el of exec.figure.getAllElements()) {
		const p = exec.figure.getPosition(el.id);
		if (p && el.label) points.set(el.label, { x: geoToNumber(p.x), y: geoToNumber(p.y) });
	}
	return points;
}

function at(points: Map<string, Pt>, name: string): Pt {
	const p = points.get(name);
	if (!p) throw new Error(`point ${name} absent de la figure`);
	return p;
}

const dist = (p: Pt, q: Pt) => Math.hypot(q.x - p.x, q.y - p.y);

// =============================================================================
// Tests
// =============================================================================

describe('constructions réécrites', () => {
	it('parallélogramme : O milieu de [AC] et de [BD]', () => {
		const pts = play(PARALLELOGRAMME);
		const [A, B, C, D, O] = ['A', 'B', 'C', 'D', 'O'].map((n) => at(pts, n));
		expect(O.x).toBeCloseTo((A.x + C.x) / 2, 9);
		expect(O.y).toBeCloseTo((A.y + C.y) / 2, 9);
		expect(D.x).toBeCloseTo(2 * O.x - B.x, 9);
		expect(D.y).toBeCloseTo(2 * O.y - B.y, 9);
	});

	it('partage : M et N sur [AB], AM = MN = NB', () => {
		const pts = play(PARTAGE_TROIS);
		const [A, B, M, N] = ['A', 'B', 'M', 'N'].map((n) => at(pts, n));
		const third = dist(A, B) / 3;
		expect(dist(A, M)).toBeCloseTo(third, 9);
		expect(dist(M, N)).toBeCloseTo(third, 9);
		expect(dist(N, B)).toBeCloseTo(third, 9);
	});

	it('symétrie axiale : M′ symétrique de M par rapport à (d)', () => {
		const pts = play(SYMETRIE_AXIALE);
		const [M, Ms, N, P] = ['M', 'Ms', 'N', 'P'].map((n) => at(pts, n));
		// N et P sont sur (d) : chacun est à égale distance de M et de M′, et M′ ≠ M
		expect(dist(M, Ms)).toBeGreaterThan(1);
		expect(dist(N, Ms)).toBeCloseTo(dist(N, M), 9);
		expect(dist(P, Ms)).toBeCloseTo(dist(P, M), 9);
	});

	it('les 9 constructions de la prod, une fois chacune', () => {
		expect(new Set(CHANGES.map((c) => c.id)).size).toBe(9);
		expect(CHANGES.filter((c) => !c.isPublic).map((c) => c.title)).toEqual([
			'Exercice de repérage de points'
		]);
	});
});

describe('V76 : les arcs de compas du carré s’effacent', () => {
	const change = CHANGES_V76[0];
	const before = carreBackup();
	const script = change.dslScript ?? '';

	/** Joue le script ; rend, après chaque pas, le nombre d'arcs visibles */
	function visibleArcsByStep(dsl: string): number[] {
		const exec = new ConstructionExecutor();
		exec.load(dsl);
		expect(exec.loadError?.message ?? null).toBeNull();
		const counts: number[] = [];
		while (exec.step()) {
			counts.push(
				exec.figure.getAllElements().filter((el) => isArc(el) && el.visible !== false).length
			);
		}
		return counts;
	}

	it('un seul changement, sur le carré, tiré du script de la sauvegarde', () => {
		expect(CHANGES_V76.map((c) => c.id)).toEqual([CARRE_ID]);
		expect(change.dslAvant).toBe(before.dslScript);
		expect(change.titreAvant).toBe(change.title);
	});

	it('les arcs du DSL sont ceux du JSON d’origine, dans le même ordre', () => {
		const arcs = [
			...before.dslScript.matchAll(/^arc\(\S+, rayon=(\S+), debut=(\S+), fin=(\S+)\)$/gm)
		];
		expect(arcs).toHaveLength(44);
		expect(before.drawArcs).toHaveLength(44);
		before.drawArcs.forEach((a, i) => {
			expect(Number(arcs[i][1])).toBeCloseTo(a.radius / 40, 2);
			expect(Number(arcs[i][2])).toBeCloseTo(-a.startAngle, 2);
			expect(Number(arcs[i][3])).toBeCloseTo(-a.endAngle, 2);
		});
	});

	it('seules les lignes des arcs et des @cacher changent', () => {
		const old = before.dslScript.split('\n');
		const next = script.split('\n');
		expect(next).toHaveLength(old.length);
		const changed = old.flatMap((line, i) => (line === next[i] ? [] : [`${line} → ${next[i]}`]));
		expect(changed).toHaveLength(88);
		expect(changed).toContain('@cacher("arc_9") → masque(_arc9)');
		expect(changed[0]).toBe(
			'arc(O, rayon=2.5, debut=10, fin=-10) → _arc9 = arc(O, rayon=2.5, debut=-10, fin=10)'
		);
		expect(script).not.toMatch(/@cacher\("arc_/);
	});

	it('avant : les 44 arcs restent ; après : tous s’effacent, un par un (un pas chacun)', () => {
		expect(visibleArcsByStep(before.dslScript).at(-1)).toBe(44);
		const counts = visibleArcsByStep(script);
		expect(Math.max(...counts)).toBeGreaterThan(0);
		expect(counts.at(-1)).toBe(0);
		// 44 baisses : un pas `masque` par arc (500 ms chacun)
		const drops = counts.filter((c, i) => i > 0 && c < counts[i - 1]).length;
		expect(drops).toBe(44);
	});

	it('les arcs retrouvent les 20° de l’auteur (balayage fin − début du JSON)', () => {
		const arcs = [
			...script.matchAll(/^_arc\d+ = arc\(\S+, rayon=\S+, debut=(\S+), fin=(\S+)\)$/gm)
		];
		expect(arcs).toHaveLength(44);
		arcs.forEach((m, i) => {
			const a = before.drawArcs[i];
			expect(ccwSweep(Number(m[1]), Number(m[2]))).toBeCloseTo(
				Math.abs(a.endAngle - a.startAngle),
				2
			);
		});
	});

	it('refuse un @cacher qui vise un arc inconnu, ou un nombre d’arcs différent', () => {
		expect(() => nameAndHideArcs('arc(O, rayon=1, debut=0, fin=10)', [])).toThrow('1 arcs');
		expect(() =>
			nameAndHideArcs('arc(O, rayon=1, debut=0, fin=10)\n@cacher("arc_2")', ['arc_1'])
		).toThrow('arc inconnu');
	});
});
