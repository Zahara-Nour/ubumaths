/**
 * Bloc ```solide : un trait posé sur une arête (bord d'un plan, droite) prend
 * l'état de cette arête, y compris quand sa face est vue exactement par la
 * tranche (butée de la vue de dessus ou de dessous) — chantier `solides-3d`,
 * tranché par David le 2026-11-27 après le lot 7b
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	polyhedronVertices,
	solideTopology,
	type Point3
} from '#lib/ubumark/utils/espace-solides.ts';
import {
	hiddenEdges,
	hiddenStretches,
	turnVue,
	VUE_DE_DEPART,
	vueProjection,
	type EspaceVue
} from '#lib/ubumark/utils/espace-vue.ts';

const spec = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'solide');
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};

const FORMS: [SolideSpec['form'], number[]][] = [
	['cube', [3]],
	['pave', [6, 2, 1]],
	['prisme-triangle', [3.3, 2.1, 4.7]],
	['prisme-triangle-rectangle', [3, 4, 6]],
	['pyramide-carree', [4, 6]],
	['pyramide-rectangle', [4, 2, 3]],
	['pyramide-triangle', [4, 3]]
];

/** Les butées : tirer jusqu'au bout vers le dessus (+) ou le dessous (−), tous les 15° de tour */
const STOPS: EspaceVue[] = [];
for (const oblique of [0, 0.5, 1]) {
	for (let yaw = -180; yaw < 180; yaw += 15) {
		for (const pitch of [-Math.PI, Math.PI]) {
			STOPS.push(turnVue({ ...VUE_DE_DEPART, oblique }, (yaw * Math.PI) / 180, pitch));
		}
	}
}

/** Des vues quelconques, entre les butées */
const GRID: EspaceVue[] = [VUE_DE_DEPART, { ...VUE_DE_DEPART, oblique: 0.5 }];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -75; pitch <= 75; pitch += 25) {
		GRID.push(
			turnVue({ ...VUE_DE_DEPART, oblique: 0 }, (yaw * Math.PI) / 180, (pitch * Math.PI) / 180)
		);
	}
}

const center3 = (vertices: Point3[]): Point3 => ({
	x: vertices.reduce((s, p) => s + p.x, 0) / vertices.length,
	y: vertices.reduce((s, p) => s + p.y, 0) / vertices.length,
	z: vertices.reduce((s, p) => s + p.z, 0) / vertices.length
});

/** Aire du polygone dessiné (nulle quand il est vu par la tranche) */
const area = (polygon: EspacePoint[]) =>
	Math.abs(
		polygon.reduce((s, p, i) => {
			const q = polygon[(i + 1) % polygon.length];
			return s + p.x * q.y - q.x * p.y;
		}, 0)
	) / 2;

describe('moteur de vue — un trait posé sur une arête a l’état de cette arête', () => {
	it('aux butées de la vue de dessus et de dessous, sur 7 polyèdres', () => {
		let compared = 0;
		for (const [form, dims] of FORMS) {
			const vertices = polyhedronVertices(form, dims);
			const { faces, edges } = solideTopology(form);
			for (const vue of STOPS) {
				const view = vueProjection(vue, center3(vertices));
				const hidden = hiddenEdges(vertices, faces, edges, view);
				edges.forEach(([i, j], k) => {
					const stretches = hiddenStretches(vertices, faces, edges, vertices[i], vertices[j], view);
					expect(stretches, `${form}, arête ${i}-${j}, vue ${JSON.stringify(vue)}`).toEqual([
						{ from: 0, to: 1, hidden: hidden[k] }
					]);
					compared++;
				});
			}
		}
		expect(compared).toBeGreaterThan(5000);
	});

	it('sous les autres angles aussi', () => {
		for (const [form, dims] of FORMS) {
			const vertices = polyhedronVertices(form, dims);
			const { faces, edges } = solideTopology(form);
			for (const vue of GRID) {
				const view = vueProjection(vue, center3(vertices));
				const hidden = hiddenEdges(vertices, faces, edges, view);
				edges.forEach(([i, j], k) => {
					const stretches = hiddenStretches(vertices, faces, edges, vertices[i], vertices[j], view);
					expect(stretches, `${form}, arête ${i}-${j}, vue ${JSON.stringify(vue)}`).toEqual([
						{ from: 0, to: 1, hidden: hidden[k] }
					]);
				});
			}
		}
	});

	it('la diagonale d’une face vue par la tranche est en plein, comme les arêtes de cette face', () => {
		const vertices = polyhedronVertices('cube', [2]);
		const { faces, edges } = solideTopology('cube');
		let flat = 0;
		for (const vue of STOPS) {
			const view = vueProjection(vue, center3(vertices));
			for (const face of faces) {
				// Face vue par la tranche : son dessin n'a pas d'aire
				if (area(face.map((i) => view.project(vertices[i]))) > 1e-9) continue;
				flat++;
				const stretches = hiddenStretches(
					vertices,
					faces,
					edges,
					vertices[face[0]],
					vertices[face[2]],
					view
				);
				expect(stretches).toEqual([{ from: 0, to: 1, hidden: false }]);
			}
		}
		expect(flat).toBeGreaterThan(100);
	});

	it('la diagonale d’une face du fond reste cachée, même quand ses arêtes sont en plein', () => {
		// Vue de dessus : la face du dessous a ses quatre arêtes en plein (celles des
		// faces de côté, vues par la tranche), mais elle-même tourne le dos à l'œil
		const vertices = polyhedronVertices('cube', [2]);
		const { faces, edges } = solideTopology('cube');
		const vue = turnVue({ ...VUE_DE_DEPART, oblique: 0 }, 0.3, Math.PI);
		const view = vueProjection(vue, center3(vertices));
		const lowest = Math.min(...vertices.map((p) => p.y));
		const bottom = faces.find((face) => face.every((i) => vertices[i].y === lowest));
		expect(bottom).toBeDefined();
		if (bottom === undefined) return;
		const hidden = hiddenEdges(vertices, faces, edges, view);
		edges.forEach(([i, j], k) => {
			if (bottom.includes(i) && bottom.includes(j)) expect(hidden[k]).toBe(false);
		});
		expect(
			hiddenStretches(vertices, faces, edges, vertices[bottom[0]], vertices[bottom[2]], view)
		).toEqual([{ from: 0, to: 1, hidden: true }]);
	});
});

describe('```solide — bord d’un plan et droite sur une face vue par la tranche', () => {
	const PRISME = ['forme: prisme triangle 3,3 2,1 4,7', 'sommets: A B C D E F'];

	it('cas témoin : (ABC) d’un prisme, en butée, a tout son bord en trait plein', () => {
		const s = spec(...PRISME, 'plans: (ABC)', 'tourner: oui');
		let flat = 0;
		for (const vue of STOPS) {
			const at = buildSolideScene(s, vue);
			const [plan] = at.plans ?? [];
			if (area(plan.fill) > 1e-9) continue;
			flat++;
			expect(
				plan.border.filter((piece) => piece.dashed),
				JSON.stringify(vue)
			).toEqual([]);
		}
		expect(flat).toBeGreaterThan(20);
	});

	it('une droite posée sur une arête de cette face, en butée, est en trait plein', () => {
		const s = spec(...PRISME, 'droites: (AB), (BC)', 'plans: (ABC)', 'tourner: oui');
		let flat = 0;
		for (const vue of STOPS) {
			const at = buildSolideScene(s, vue);
			const [plan] = at.plans ?? [];
			if (area(plan.fill) > 1e-9) continue;
			flat++;
			for (const pieces of at.droites ?? []) {
				expect(
					pieces.filter((piece) => piece.dashed),
					JSON.stringify(vue)
				).toEqual([]);
			}
		}
		expect(flat).toBeGreaterThan(20);
	});
});
