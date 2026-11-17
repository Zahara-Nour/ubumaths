/**
 * Cote de la hauteur d'une pyramide (` ```solide ` `cotes:`) — n° 17 de `docs/wip/outils-manquants.md`
 *
 * Constat (2026-11-05) : la cote, posée au milieu de la hauteur, dans le solide, était traversée
 * par une arête — pyramide carrée : SB ou SC dans les 143 cas du modèle publié « Volume d'une
 * pyramide » (a 2..12, h 3..15) ; tétraèdre : SC pour 5 dimensions sur 8.
 * Décision (David, 2026-11-06, aperçu à trois colonnes) : ligne de renvoi — un trait fin part du
 * milieu de la hauteur vers la droite, le texte au bout, hors du solide.
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { SolideSpec } from '$lib/ubumark/types/espace';
import type { EspacePoint } from '$lib/ubumark/utils/espace-scene';
import { ESPACE_STROKE } from '$lib/ubumark/utils/espace-scene';
import {
	buildSolideScene,
	labelBox,
	solideLineStroke,
	type SolideLabel,
	type SolideScene
} from '$lib/ubumark/utils/espace-solides';

// ============================================================================
// OUTILS
// ============================================================================

const sceneOf = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'solide');
	expect(node.errors).toEqual([]);
	return buildSolideScene(node.spec as SolideSpec);
};

const near = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;

/** Le segment [a, b] passe-t-il dans la boîte ? (échantillonné) */
function crosses(a: EspacePoint, b: EspacePoint, [lo, hi]: EspacePoint[]): boolean {
	for (let t = 0; t <= 1; t += 0.005) {
		const x = a.x + (b.x - a.x) * t;
		const y = a.y + (b.y - a.y) * t;
		if (x > lo.x && x < hi.x && y > lo.y && y < hi.y) return true;
	}
	return false;
}

const touch = (a: SolideLabel, b: SolideLabel) => {
	const [a0, a1] = labelBox(a);
	const [b0, b1] = labelBox(b);
	return a0.x < b1.x && b0.x < a1.x && a0.y < b1.y && b0.y < a1.y;
};

/** La ligne de renvoi, la hauteur et le texte de sa cote */
function heightCote(s: SolideScene) {
	const leaders = s.lines.filter((l) => l.thin);
	expect(leaders).toHaveLength(1);
	const [from, to] = leaders[0].points;
	const apex = s.vertices[0];
	// La hauteur : le trait en tirets depuis S dont le renvoi part du milieu (SD aussi est en tirets)
	const height = s.lines.find(
		(l) =>
			l.dashed &&
			near(l.points[0], apex) &&
			near(from, { x: (apex.x + l.points[1].x) / 2, y: (apex.y + l.points[1].y) / 2 })
	);
	expect(height, 'le renvoi ne part pas du milieu de la hauteur').toBeDefined();
	const label = [...s.labels].sort(
		(p, q) => Math.hypot(p.at.x - to.x, p.at.y - to.y) - Math.hypot(q.at.x - to.x, q.at.y - to.y)
	)[0];
	return { leader: leaders[0], from, to, height: height!, label };
}

/** Tout ce qu'une cote de hauteur doit tenir */
function expectClear(s: SolideScene, what: string) {
	const { leader, label } = heightCote(s);
	// Le texte : hors du solide (à droite de tous les sommets)
	const box = labelBox(label);
	expect(box[0].x, `${what} : texte dans le solide`).toBeGreaterThan(
		Math.max(...s.vertices.map((v) => v.x))
	);
	// … traversé par aucun trait
	for (const line of s.lines)
		for (let k = 0; k + 1 < line.points.length; k++) {
			if (line === leader) continue;
			expect(crosses(line.points[k], line.points[k + 1], box), `${what} : texte traversé`).toBe(
				false
			);
		}
	// … ne touche aucune autre étiquette, et le renvoi ne traverse aucune
	for (const other of s.labels) {
		if (other === label) continue;
		expect(touch(label, other), `${what} : touche « ${other.text} »`).toBe(false);
		expect(
			crosses(leader.points[0], leader.points[1], labelBox(other)),
			`${what} : renvoi sur « ${other.text} »`
		).toBe(false);
	}
}

// ============================================================================
// TESTS
// ============================================================================

describe('pyramide carrée : cote de la hauteur hors du solide, par un renvoi', () => {
	it('les 143 cas du modèle « Volume d’une pyramide » (a 2..12, h 3..15)', () => {
		for (let a = 2; a <= 12; a++)
			for (let h = 3; h <= 15; h++)
				expectClear(
					sceneOf(`forme: pyramide carree ${a} ${h}`, 'sommets: S A B C D', 'cotes: cm'),
					`carrée ${a} ${h}`
				);
	});

	it('sans noms de sommets ni unité (`cotes: oui`)', () => {
		expectClear(sceneOf('forme: pyramide carree 6 9', 'cotes: oui'), 'carrée 6 9 sans noms');
	});
});

describe('tétraèdre : cote de la hauteur hors du solide', () => {
	for (const dims of ['4 1.5', '4 2', '4 3', '4 3.27', '4 4', '6 4', '4 6', '3 5'])
		it(`pyramide triangle ${dims}`, () => {
			expectClear(
				sceneOf(`forme: pyramide triangle ${dims}`, 'sommets: S A B C', 'cotes: cm'),
				`triangle ${dims}`
			);
		});
});

describe('pyramide à base rectangle : cote de la hauteur hors du solide', () => {
	for (const dims of ['6 4 5', '4 6 5', '8 3 2', '3 3 10'])
		it(`pyramide rectangle ${dims}`, () => {
			expectClear(
				sceneOf(`forme: pyramide rectangle ${dims}`, 'sommets: S A B C D', 'cotes: cm'),
				`rectangle ${dims}`
			);
		});
});

describe('renvoi : trait fin, jamais pris pour une arête', () => {
	it('plus fin qu’une arête ; aucun renvoi sans `cotes:`', () => {
		const s = sceneOf('forme: pyramide carree 6 9', 'cotes: cm');
		const { leader } = heightCote(s);
		expect(solideLineStroke(leader)).toBeLessThan(ESPACE_STROKE);
		expect(sceneOf('forme: pyramide carree 6 9').lines.some((l) => l.thin)).toBe(false);
	});

	it('le prisme garde sa cote de hauteur sur le trait (pas de renvoi)', () => {
		const s = sceneOf('forme: prisme triangle 4 3 5', 'cotes: cm');
		expect(s.lines.some((l) => l.thin)).toBe(false);
	});
});
