/**
 * Moteur de vue des figures de l'espace — chantier `solides-3d`, lot 1 (ADR 0045)
 *
 * Au repos : la perspective cavalière de l'ADR 0034, au chiffre près. En
 * rotation : une vue droite (projection orthogonale), arêtes cachées
 * recalculées à chaque angle.
 */
import { describe, expect, it } from 'vitest';
import { polyhedronVertices, solideTopology } from '#lib/ubumark/utils/espace-solides.ts';
import {
	VUE_DE_DEPART,
	VUE_DROITE_PITCH,
	VUE_DROITE_YAW,
	hiddenEdges,
	turnVue,
	vueProjection,
	type EspaceVue,
	type Point3
} from '#lib/ubumark/utils/espace-vue.ts';

// ============================================================================
// OUTILS
// ============================================================================

/** Déport d'une fuyante de profondeur 1 : 0,5 × arête, à 45° */
const K = 0.5 * Math.SQRT1_2;

const ORIGIN: Point3 = { x: 0, y: 0, z: 0 };

/** Vue droite (sans fuyantes), tournée de `yaw` et `pitch` depuis la vue de départ */
const droite = (yaw = 0, pitch = 0): EspaceVue => ({ yaw, pitch, oblique: 0 });

const centroid = (points: Point3[]): Point3 => ({
	x: points.reduce((s, p) => s + p.x, 0) / points.length,
	y: points.reduce((s, p) => s + p.y, 0) / points.length,
	z: points.reduce((s, p) => s + p.z, 0) / points.length
});

/** Les arêtes cachées d'une forme sous une vue, écrites « a-b » */
function hiddenOf(form: 'cube' | 'pyramide-triangle', dims: number[], vue: EspaceVue): string[] {
	const vertices = polyhedronVertices(form, dims);
	const { faces, edges } = solideTopology(form);
	const hidden = hiddenEdges(vertices, faces, edges, vueProjection(vue, centroid(vertices)));
	return edges.filter((_, i) => hidden[i]).map(([a, b]) => `${a}-${b}`);
}

// ============================================================================
// TESTS
// ============================================================================

describe('vue de départ : la cavalière de l’ADR 0034', () => {
	const view = vueProjection(VUE_DE_DEPART, { x: 1.3, y: 0.7, z: 2.1 });

	it('ne tourne rien : le point rendu est le point donné', () => {
		const p = { x: 0.1, y: 0.2, z: 0.3 };
		expect(view.rotate(p)).toBe(p);
	});

	it('projette comme avant, au chiffre près (fuyantes à 45°, réduites de moitié)', () => {
		for (const p of [
			{ x: 0.1, y: 0.2, z: 0.3 },
			{ x: 4, y: 3, z: 2 },
			{ x: 1 / 3, y: Math.SQRT2, z: 7.77 }
		]) {
			expect(view.project(p)).toEqual({ x: p.x + p.z * K, y: p.y + p.z * K });
		}
	});

	it('cube : les trois arêtes du sommet du fond, en bas à gauche, sont cachées', () => {
		expect(hiddenOf('cube', [3], VUE_DE_DEPART)).toEqual(['2-3', '0-3', '3-7']);
	});
});

describe('vue droite : sans déformation', () => {
	it('garde les fuyantes de la cavalière au moment où la figure commence à tourner', () => {
		const view = vueProjection(droite(), ORIGIN);
		const depth = view.project({ x: 0, y: 0, z: 1 });
		expect(depth.x).toBeCloseTo(K, 12);
		expect(depth.y).toBeCloseTo(K, 12);
	});

	it('cache les mêmes arêtes que la cavalière au moment où la figure commence à tourner', () => {
		expect(hiddenOf('cube', [3], droite())).toEqual(hiddenOf('cube', [3], VUE_DE_DEPART));
	});

	it('ne déplace pas le pivot, quel que soit l’angle', () => {
		const pivot = { x: 2, y: 1.5, z: 1 };
		const rest = vueProjection(droite(), pivot).project(pivot);
		for (const [yaw, pitch] of [
			[0.4, 0.2],
			[2, -1],
			[-3, 0.9]
		]) {
			const p = vueProjection(droite(yaw, pitch), pivot).project(pivot);
			expect(p.x).toBeCloseTo(rest.x, 12);
			expect(p.y).toBeCloseTo(rest.y, 12);
		}
	});

	it('garde les longueurs dans l’espace et ne les allonge jamais à l’écran', () => {
		const a = { x: 0, y: 0, z: 0 };
		const b = { x: 4, y: 3, z: 2 };
		const length = Math.hypot(4, 3, 2);
		for (const [yaw, pitch] of [
			[0, 0],
			[0.7, 0.3],
			[2.5, -0.8],
			[-1.2, 1.1]
		]) {
			const view = vueProjection(droite(yaw, pitch), ORIGIN);
			const ra = view.rotate(a);
			const rb = view.rotate(b);
			expect(Math.hypot(rb.x - ra.x, rb.y - ra.y, rb.z - ra.z)).toBeCloseTo(length, 12);
			const pa = view.project(a);
			const pb = view.project(b);
			expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeLessThanOrEqual(length + 1e-12);
		}
	});

	it('glisser vers la droite amène la face de gauche devant', () => {
		// Le sommet de devant à gauche (A) passe à droite du pivot après un quart de tour
		const vertices = polyhedronVertices('cube', [3]);
		const pivot = centroid(vertices);
		const turned = vueProjection(turnVue(droite(), -Math.PI / 2, 0), pivot);
		expect(turned.project(vertices[0]).x).toBeGreaterThan(turned.project(pivot).x);
	});
});

describe('arêtes cachées recalculées à chaque angle', () => {
	it('cube vu de derrière (demi-tour) : les arêtes cachées partent du sommet opposé', () => {
		expect(hiddenOf('cube', [3], droite(Math.PI)).sort()).toEqual(['0-1', '1-2', '1-5']);
	});

	it('cube vu par-dessous : ce sont les arêtes du dessus, au fond à gauche, qui sont cachées', () => {
		const below = droite(0, -0.5 - VUE_DROITE_PITCH);
		expect(hiddenOf('cube', [3], below).sort()).toEqual(['3-7', '4-7', '6-7']);
	});

	it('tétraèdre : aucune arête cachée, une seule, ou les trois d’un même sommet (une face vue)', () => {
		const counts = new Set<number>();
		for (let yaw = 0.1; yaw < 6.3; yaw += 0.37) {
			for (const pitch of [-1.3, -0.6, 0.05, 0.5, 1.0]) {
				const hidden = hiddenOf('pyramide-triangle', [3, 4], droite(yaw, pitch));
				counts.add(hidden.length);
				expect([0, 1, 3]).toContain(hidden.length);
				if (hidden.length === 3) {
					const ends = hidden.flatMap((e) => e.split('-'));
					expect(ends.some((v) => ends.filter((w) => w === v).length === 3)).toBe(true);
				}
			}
		}
		// Les trois cas se rencontrent bien en tournant
		expect([...counts].sort()).toEqual([0, 1, 3]);
	});

	it('cube : trois arêtes cachées qui se rejoignent en un sommet, sous tous les angles essayés', () => {
		for (let yaw = 0.1; yaw < 6.3; yaw += 0.37) {
			for (const pitch of [-1.3, -0.6, 0.05, 0.5, 1.0]) {
				const hidden = hiddenOf('cube', [3], droite(yaw, pitch));
				expect(hidden).toHaveLength(3);
				const ends = hidden.flatMap((e) => e.split('-'));
				const shared = ends.filter((v) => ends.filter((w) => w === v).length === 3);
				expect(new Set(shared).size).toBe(1);
			}
		}
	});
});

describe('tourner la vue', () => {
	it('ajoute les angles', () => {
		const vue = turnVue(turnVue(droite(), 0.3, 0.1), 0.2, -0.4);
		expect(vue.yaw).toBeCloseTo(0.5, 12);
		expect(vue.pitch).toBeCloseTo(-0.3, 12);
		expect(vue.oblique).toBe(0);
	});

	it('s’arrête à la vue de dessus et à la vue de dessous : le haut reste en haut', () => {
		expect(turnVue(droite(), 0, 10).pitch + VUE_DROITE_PITCH).toBeCloseTo(Math.PI / 2, 12);
		expect(turnVue(droite(), 0, -10).pitch + VUE_DROITE_PITCH).toBeCloseTo(-Math.PI / 2, 12);
	});

	it('vue de dessus : le dessus du cube est un vrai carré', () => {
		const vertices = polyhedronVertices('cube', [3]);
		const view = vueProjection(turnVue(droite(-VUE_DROITE_YAW), 0, 10), centroid(vertices));
		const [e, f, g] = [4, 5, 6].map((i) => view.project(vertices[i]));
		expect(Math.hypot(f.x - e.x, f.y - e.y)).toBeCloseTo(3, 9);
		expect(Math.hypot(g.x - f.x, g.y - f.y)).toBeCloseTo(3, 9);
	});
});
