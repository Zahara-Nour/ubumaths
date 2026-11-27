/**
 * Bloc ```cubes : assemblage que l'on peut tourner (`tourner: oui`) — chantier
 * `solides-3d`, lot 6 (ADR 0045 ; journal, § 15) : la clé, la scène tournée,
 * son cadre fixe
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { CubesSpec } from '#lib/ubumark/types/espace.ts';
import {
	buildEspaceScene,
	cubesFaces,
	espaceLabel,
	type EspacePoint,
	type EspacePolygon,
	type EspaceScene
} from '#lib/ubumark/utils/espace-scene.ts';
import {
	VUE_DE_DEPART,
	turnVue,
	vueProjection,
	type EspaceVue
} from '#lib/ubumark/utils/espace-vue.ts';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'));
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as CubesSpec;
};
const SIX = 'hauteurs: 2 1 1 / 1 0 1';

/** Une vue droite tournée (hors du passage depuis la cavalière) */
const turned = (yawDeg: number, pitchDeg: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, (yawDeg * Math.PI) / 180, (pitchDeg * Math.PI) / 180);

const kinds = (scene: EspaceScene, kind: string) =>
	scene.polygons.filter((p) => p.kind === kind).length;

/** Aire signée d'un polygone */
const area = (points: EspacePoint[]) =>
	points.reduce((sum, p, i) => {
		const q = points[(i + 1) % points.length];
		return sum + (p.x * q.y - q.x * p.y) / 2;
	}, 0);

/** Les sommets d'un polygone, triés et arrondis, depuis le premier sommet de la scène */
const shape = (polygon: EspacePolygon, origin: EspacePoint) =>
	polygon.points
		.map((p) =>
			`${(p.x - origin.x).toFixed(9)},${(p.y - origin.y).toFixed(9)}`.replace(/-0\./g, '0.')
		)
		.sort()
		.join(' ');

/** Le point est-il strictement dans le polygone convexe ? */
function inside(point: EspacePoint, polygon: EspacePoint[]): boolean {
	const signs = polygon.map((a, i) => {
		const b = polygon[(i + 1) % polygon.length];
		return (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
	});
	return signs.every((s) => s > 1e-9) || signs.every((s) => s < -1e-9);
}

describe('```cubes — la clé tourner:', () => {
	it('tourner: oui → spec.rotate, sans erreur', () => {
		const node = read(SIX, 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toBeUndefined();
		expect((node.spec as CubesSpec).rotate).toBe(true);
	});

	it('sans la clé, ou tourner: non : rien de plus dans le spec', () => {
		expect(spec(SIX)).toEqual(spec(SIX, 'tourner: non'));
		expect('rotate' in spec(SIX)).toBe(false);
	});

	it('Oui, OUI : accepté comme oui', () => {
		expect(spec(SIX, 'tourner: Oui').rotate).toBe(true);
	});

	it('autre chose que oui ou non : phrase pour l’auteur, bloc dessiné, fixe (65)', () => {
		const node = read(SIX, 'tourner: un peu');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toEqual(['Ligne 2 : tourner « un peu » : oui ou non']);
		expect(node.spec).not.toBeNull();
		expect('rotate' in (node.spec as CubesSpec)).toBe(false);
	});

	it.each(['dessus', 'face', 'droite', 'gauche'])(
		'avec vue: %s (dessin à plat) : phrase pour l’auteur, vue fixe (66)',
		(view) => {
			const node = read(SIX, `vue: ${view}`, 'tourner: oui');
			expect(node.errors).toEqual([]);
			expect(node.rotationErrors).toHaveLength(1);
			expect(node.rotationErrors![0]).toContain('Ligne 3');
			expect(node.rotationErrors![0]).toContain(`vue: ${view}`);
			expect((node.spec as CubesSpec).view).toBe(view);
			expect('rotate' in (node.spec as CubesSpec)).toBe(false);
		}
	);

	it('avec vue: perspective : la figure tourne', () => {
		expect(spec(SIX, 'vue: perspective', 'tourner: oui').rotate).toBe(true);
	});

	it('avec retrouver: (perspective cachée) : phrase pour l’auteur, geste inchangé (67)', () => {
		const node = read('hauteurs: 2 1 / 1 2', 'retrouver: face, droite', 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toHaveLength(1);
		expect(node.rotationErrors![0]).toContain('retrouver:');
		expect(node.spec).toEqual(spec('hauteurs: 2 1 / 1 2', 'retrouver: face, droite'));
	});

	it('avec dessiner: : phrase pour l’auteur, geste inchangé, perspective fixe (68)', () => {
		const node = read(SIX, 'dessiner: face', 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toHaveLength(1);
		expect(node.rotationErrors![0]).toContain('dessiner:');
		expect(node.spec).toEqual(spec(SIX, 'dessiner: face'));
	});

	it('tourner: non avec une vue à plat ou un geste : aucune phrase', () => {
		expect(read(SIX, 'vue: face', 'tourner: non').rotationErrors).toBeUndefined();
		expect(read(SIX, 'dessiner: face', 'tourner: non').rotationErrors).toBeUndefined();
	});

	it('tourner: donnée deux fois : erreur du bloc, comme toute clé répétée', () => {
		expect(read(SIX, 'tourner: oui', 'tourner: non').errors).toHaveLength(1);
	});

	it('bloc en erreur par ailleurs : pas de phrase sur tourner: en plus', () => {
		const node = read('hauteurs: 2 1 / 1', 'tourner: peut-être');
		expect(node.spec).toBeNull();
		expect(node.rotationErrors).toBeUndefined();
	});
});

describe('```cubes — la scène tournée', () => {
	it('sans vue : le dessin d’aujourd’hui, que la clé soit là ou non (53)', () => {
		expect(buildEspaceScene(spec(SIX, 'tourner: oui'))).toEqual(buildEspaceScene(spec(SIX)));
	});

	it.each([SIX, 'hauteurs: 1', 'hauteurs: 3 0 2 / 0 1 0 / 2 0 4', 'hauteurs: 6 6 / 6 6'])(
		'à la vue de départ : le dessin fixe, déplacé en bloc (54) — %s',
		(heights) => {
			const fixed = buildEspaceScene(spec(heights));
			const rest = buildEspaceScene(spec(heights, 'tourner: oui'), VUE_DE_DEPART);
			expect(rest.polygons.map((p) => p.kind)).toEqual(fixed.polygons.map((p) => p.kind));
			// Le dessin fixe part de (0, 0) ; le dessin au repos, du coin de sa boîte
			const points = rest.polygons.flatMap((p) => p.points);
			const corner = {
				x: Math.min(...points.map((p) => p.x)),
				y: Math.min(...points.map((p) => p.y))
			};
			rest.polygons.forEach((polygon, i) => {
				expect(shape(polygon, corner)).toBe(shape(fixed.polygons[i], { x: 0, y: 0 }));
			});
		}
	);

	it('le cadre est un carré, le même à chaque angle, et tout y tient (61)', () => {
		const cubes = spec('hauteurs: 3 0 2 / 0 1 0 / 2 0 4', 'tourner: oui');
		const rest = buildEspaceScene(cubes, VUE_DE_DEPART);
		expect(rest.width).toBeCloseTo(rest.height, 9);
		const vues: EspaceVue[] = [];
		for (let yaw = -180; yaw < 180; yaw += 15) {
			for (let pitch = -100; pitch <= 100; pitch += 20) vues.push(turned(yaw, pitch));
		}
		// Le passage de la cavalière à la vue droite, en tournant
		for (let k = 0; k <= 10; k++) {
			vues.push(turnVue({ ...VUE_DE_DEPART, oblique: k / 10 }, k * 0.3, k * 0.1 - 0.5));
		}
		for (const vue of vues) {
			const scene = buildEspaceScene(cubes, vue);
			expect(scene.width).toBe(rest.width);
			expect(scene.height).toBe(rest.height);
			for (const p of scene.polygons.flatMap((polygon) => polygon.points)) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
			}
		}
	});

	it('un cube : trois faces vues à chaque angle, jamais retournées', () => {
		const one = spec('hauteurs: 1', 'tourner: oui');
		for (const [yaw, pitch] of [
			[40, 10],
			[130, -50],
			[-100, 30],
			[-20, -70]
		]) {
			const scene = buildEspaceScene(one, turned(yaw, pitch));
			expect(scene.polygons).toHaveLength(3);
			expect(new Set(scene.polygons.map((p) => p.kind)).size).toBe(3);
			for (const polygon of scene.polygons)
				expect(Math.abs(area(polygon.points))).toBeGreaterThan(0);
		}
	});

	it('un demi-tour : l’arrière a la teinte du devant, la gauche celle de la droite (58)', () => {
		const row = spec('hauteurs: 1 1 1', 'tourner: oui');
		const rest = buildEspaceScene(row, VUE_DE_DEPART);
		// Demi-tour sans changer la bascule : mêmes nombres de faces de chaque teinte
		const back = buildEspaceScene(row, { yaw: Math.PI, pitch: 0, oblique: 1 });
		for (const kind of ['devant', 'dessus', 'cote']) {
			expect(kinds(back, kind)).toBe(kinds(rest, kind));
		}
		expect(kinds(rest, 'devant')).toBe(3);
		expect(kinds(rest, 'cote')).toBe(1);
	});

	it('vu par-dessous : on voit les dessous, de la teinte du dessus (58, 60)', () => {
		// Piles de 2 et de 1 : leurs dessus ne se touchent pas (8 coins), leurs dessous sont
		// côte à côte au sol (6 coins)
		const piles = spec('hauteurs: 2 1', 'tourner: oui');
		const corners = (scene: EspaceScene) =>
			new Set(
				scene.polygons
					.filter((p) => p.kind === 'dessus')
					.flatMap((p) => p.points.map((pt) => `${pt.x.toFixed(6)},${pt.y.toFixed(6)}`))
			).size;
		const above = buildEspaceScene(piles, turned(0, 30));
		const below = buildEspaceScene(piles, turned(0, -60));
		expect(kinds(above, 'dessus')).toBe(2);
		expect(kinds(below, 'dessus')).toBe(2);
		expect(corners(above)).toBe(8);
		expect(corners(below)).toBe(6);
	});

	it('vu de l’arrière : seules les faces libres sont dessinées, pas celles collées à un cube (56)', () => {
		// 2 1 1 / 1 0 1 vu de l'arrière, par-dessus : 5 dessus ; à l'arrière, les 4 cubes de la
		// rangée du fond (ceux de devant sont collés à elle, les faces du trou tournent le dos)
		const scene = buildEspaceScene(spec(SIX, 'tourner: oui'), turned(180, 0));
		expect(kinds(scene, 'dessus')).toBe(5);
		expect(kinds(scene, 'devant')).toBe(4);
	});

	it('ordre du peintre : une face dessinée par-dessus une autre est plus près de l’œil (56)', () => {
		const cubes = spec('hauteurs: 3 0 2 / 0 1 0 / 2 0 4', 'tourner: oui');
		const vues = [
			turned(35, 20),
			turned(160, -40),
			turned(-110, 55),
			turned(75, -15),
			VUE_DE_DEPART
		];
		let checked = 0;
		for (const vue of vues) {
			const { toEye } = vueProjection(vue, { x: 0, y: 0, z: 0 });
			const faces = cubesFaces(cubes.heights, vue);
			/** Profondeur (vers l'œil) du point de la face qui se dessine en `at` */
			const depthAt = (face: (typeof faces)[number], at: EspacePoint) => {
				const [a, b, , d] = face.points;
				const [a3, b3, , d3] = face.corners;
				const ux = b.x - a.x;
				const uy = b.y - a.y;
				const vx = d.x - a.x;
				const vy = d.y - a.y;
				const det = ux * vy - uy * vx;
				const u = ((at.x - a.x) * vy - (at.y - a.y) * vx) / det;
				const v = (ux * (at.y - a.y) - uy * (at.x - a.x)) / det;
				const at3 = {
					x: a3.x + u * (b3.x - a3.x) + v * (d3.x - a3.x),
					y: a3.y + u * (b3.y - a3.y) + v * (d3.y - a3.y),
					z: a3.z + u * (b3.z - a3.z) + v * (d3.z - a3.z)
				};
				return at3.x * toEye.x + at3.y * toEye.y + at3.z * toEye.z;
			};
			faces.forEach((face, i) => {
				const middle = {
					x: face.points.reduce((sum, p) => sum + p.x, 0) / 4,
					y: face.points.reduce((sum, p) => sum + p.y, 0) / 4
				};
				for (const earlier of faces.slice(0, i)) {
					if (!inside(middle, earlier.points)) continue;
					checked++;
					expect(depthAt(earlier, middle)).toBeLessThan(depthAt(face, middle) + 1e-9);
				}
				// Et rien de ce qui est dessiné APRÈS ne passe derrière elle
				for (const later of faces.slice(i + 1)) {
					if (!inside(middle, later.points)) continue;
					checked++;
					expect(depthAt(later, middle)).toBeGreaterThan(depthAt(face, middle) - 1e-9);
				}
			});
		}
		// Des faces se recouvrent bien dans ces vues : le test compare quelque chose
		expect(checked).toBeGreaterThan(20);
	});

	it('le plus gros assemblage : au plus trois faces par cube de surface, calcul rapide (62)', () => {
		const rows = Array.from({ length: 6 }, () => '6 6 6 6 6 6').join(' / ');
		const big = spec(`hauteurs: ${rows}`, 'tourner: oui');
		const start = performance.now();
		for (let k = 0; k < 60; k++) buildEspaceScene(big, turned(k * 6, k - 30));
		expect((performance.now() - start) / 60).toBeLessThan(20);
		expect(buildEspaceScene(big, turned(30, 20)).polygons).toHaveLength(3 * 36);
	});
});

describe('```cubes — nom accessible et fiche', () => {
	it('figure que l’on peut tourner : le nom le dit, jamais le nombre de cubes (63)', () => {
		expect(espaceLabel(spec(SIX, 'tourner: oui'))).toBe(
			'Assemblage de cubes en perspective, figure que l’on peut tourner'
		);
		expect(espaceLabel(spec(SIX))).toBe('Assemblage de cubes en perspective');
	});

	it('fiche PDF : la vue de départ, la même que sans la clé (59)', () => {
		expect(generateEspaceTypst(read(SIX, 'tourner: oui'))).toBe(generateEspaceTypst(read(SIX)));
	});
});
