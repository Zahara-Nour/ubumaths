/**
 * Bloc ```solide : plans donnés (`plans:`) — chantier `solides-3d`, lot 7b
 * (comportements 70, 73 à 75, 77 à 80, 83 du journal ; question (c) : le bord
 * du plan en tirets là où une face du solide passe devant)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { EspaceNode, SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	labelBox,
	polyhedronVertices,
	solideLabel,
	solidePoints3,
	solideTopology,
	type Point3,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import {
	planeInSolid,
	turnVue,
	VUE_DE_DEPART,
	type EspaceVue
} from '#lib/ubumark/utils/espace-vue.ts';

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors;
const scene = (...lines: string[]) => buildSolideScene(spec(...lines));
const plansOf = (s: SolideScene) => s.plans ?? [];

const distance = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y);
const close = (p: EspacePoint, q: EspacePoint) => distance(p, q) < 1e-6;
/** Les mêmes points, à l'ordre près */
const samePoints = (a: EspacePoint[], b: EspacePoint[]) =>
	a.length === b.length && a.every((p) => b.some((q) => close(p, q)));
/** Le point est-il dans le polygone convexe (bord compris) ? */
const inPolygon = (p: EspacePoint, polygon: EspacePoint[]) => {
	const signs = polygon.map((a, i) => {
		const b = polygon[(i + 1) % polygon.length];
		return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
	});
	return signs.every((s) => s > -1e-6) || signs.every((s) => s < 1e-6);
};

/** Le segment [a, b] passe-t-il dans la boîte [lo, hi] ? */
const hitsBox = (a: EspacePoint, b: EspacePoint, lo: EspacePoint, hi: EspacePoint) => {
	let t0 = 0;
	let t1 = 1;
	for (const [d, from, min, max] of [
		[b.x - a.x, a.x, lo.x, hi.x],
		[b.y - a.y, a.y, lo.y, hi.y]
	]) {
		if (Math.abs(d) < 1e-12) {
			if (from < min || from > max) return false;
			continue;
		}
		const [near, far] = [(min - from) / d, (max - from) / d].sort((p, q) => p - q);
		t0 = Math.max(t0, near);
		t1 = Math.min(t1, far);
	}
	return t0 <= t1;
};
/** Tous les traits de la scène : arêtes, droites, bords des plans */
const traits = (s: SolideScene): [EspacePoint, EspacePoint][] =>
	[...s.lines, ...(s.droites ?? []).flat(), ...plansOf(s).flatMap((plan) => plan.border)].flatMap(
		(l) => l.points.slice(1).map((q, i): [EspacePoint, EspacePoint] => [l.points[i], q])
	);

/** Une vue droite tournée (hors du passage depuis la cavalière) */
const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);

const GRID: EspaceVue[] = [VUE_DE_DEPART, { ...VUE_DE_DEPART, oblique: 0.5 }];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -100; pitch <= 100; pitch += 25) {
		GRID.push(turned((yaw * Math.PI) / 180, (pitch * Math.PI) / 180));
	}
}

describe('```solide — plans: (lecture)', () => {
	it('sans la clé : la spécification ne porte pas de plans', () => {
		expect('plans' in spec(...CUBE)).toBe(false);
	});

	it('un plan par trois points nommés, sommets ou points déclarés', () => {
		const s = spec(...CUBE, 'points: I milieu AE', 'plans: (BDE), (IBG)');
		expect(s.plans).toEqual([
			{ through: [1, 3, 4], name: null },
			{ through: [8, 1, 6], name: null }
		]);
	});

	it('un plan peut porter un nom ; les parenthèses sont facultatives', () => {
		const s = spec(...CUBE, 'plans: P = (BDE), Q’ = ACG');
		expect(s.plans).toEqual([
			{ through: [1, 3, 4], name: 'P' },
			{ through: [0, 2, 6], name: "Q'" }
		]);
	});

	it('erreurs : point inconnu, deux points, quatre points', () => {
		expect(errors(...CUBE, 'plans: (ABZ)')[0]).toMatch(/aucun point ne s’appelle Z/);
		expect(errors(...CUBE, 'plans: (AB)')[0]).toMatch(/un plan se désigne par trois points/);
		expect(errors(...CUBE, 'plans: (ABCD)')[0]).toMatch(/un plan se désigne par trois points/);
	});

	it('erreurs : trois points alignés, ou deux fois le même', () => {
		// I milieu de [AE] : A, I, E sont alignés
		expect(errors(...CUBE, 'points: I milieu AE', 'plans: (AIE)')[0]).toMatch(/alignés/);
		expect(errors(...CUBE, 'plans: (ABA)')[0]).toMatch(/alignés/);
	});

	it('erreurs : nom mal écrit, donné deux fois, déjà pris par un point', () => {
		expect(errors(...CUBE, 'plans: p = (BDE)')[0]).toMatch(/un nom de plan est une majuscule/);
		expect(errors(...CUBE, 'plans: P = (BDE), P = (ACG)')[0]).toMatch(/« P » deux fois/);
		expect(errors(...CUBE, 'plans: A = (BDE)')[0]).toMatch(/« A » est déjà le nom d’un point/);
		expect(errors(...CUBE, 'points: I milieu AE', 'plans: I = (BDE)')[0]).toMatch(
			/« I » est déjà le nom d’un point/
		);
	});

	it('erreurs : le même plan deux fois, même écrit par d’autres points', () => {
		expect(errors(...CUBE, 'plans: (BDE), (EBD)')[0]).toMatch(/même plan/);
		// A, B, C, D sont dans la face du bas
		expect(errors(...CUBE, 'plans: (ABC), (BCD)')[0]).toMatch(/même plan/);
	});

	it('au plus 2 plans', () => {
		expect(errors(...CUBE, 'plans: (BDE), (ACG), (ABG)')[0]).toMatch(/au plus 2 plans/);
	});

	it('erreurs : solide rond, sommets sans nom, section: ou tracer: dans le bloc', () => {
		expect(errors('forme: cylindre 2 3', 'plans: (ABC)')[0]).toMatch(/polyèdres seulement/);
		expect(errors('forme: cube 2', 'plans: (ABC)')[0]).toMatch(/nomme les sommets/);
		expect(errors(...CUBE, 'section: parallele dessous 1', 'plans: (BDE)').join(' ')).toMatch(
			/plans: ne va pas encore avec section:/
		);
		expect(errors(...CUBE, 'tracer: vecteur AB + AD', 'plans: (BDE)').join(' ')).toMatch(
			/plans: ne va pas encore avec tracer:/
		);
	});

	it('droites et plans vont ensemble', () => {
		const s = spec(...CUBE, 'points: I milieu AE', 'droites: (IG)', 'plans: (BDE)');
		expect(s.droites).toHaveLength(1);
		expect(s.plans).toHaveLength(1);
	});
});

describe('moteur de vue — planeInSolid (la partie du plan dans le solide)', () => {
	const cube = polyhedronVertices('cube', [2]);
	const topology = solideTopology('cube');
	const same3 = (p: Point3, q: Point3) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-9;
	const cut = (a: Point3, b: Point3, c: Point3) => planeInSolid(cube, topology.edges, a, b, c);
	const mid = (i: number, j: number): Point3 => ({
		x: (cube[i].x + cube[j].x) / 2,
		y: (cube[i].y + cube[j].y) / 2,
		z: (cube[i].z + cube[j].z) / 2
	});

	it('(BDE) d’un cube : le triangle BDE', () => {
		const polygon = cut(cube[1], cube[3], cube[4]);
		expect(polygon).toHaveLength(3);
		for (const i of [1, 3, 4]) expect(polygon.some((p) => same3(p, cube[i]))).toBe(true);
	});

	it('(ABG) d’un cube : le rectangle ABGH', () => {
		const polygon = cut(cube[0], cube[1], cube[6]);
		expect(polygon).toHaveLength(4);
		for (const i of [0, 1, 6, 7]) expect(polygon.some((p) => same3(p, cube[i]))).toBe(true);
	});

	it('(ABC) d’un cube : la face ABCD', () => {
		const polygon = cut(cube[0], cube[1], cube[2]);
		expect(polygon).toHaveLength(4);
		for (const i of [0, 1, 2, 3]) expect(polygon.some((p) => same3(p, cube[i]))).toBe(true);
	});

	it('par les milieux de [AB], [BC] et [CG] : un hexagone', () => {
		const polygon = cut(mid(0, 1), mid(1, 2), mid(2, 6));
		expect(polygon).toHaveLength(6);
	});

	it('témoin : sur 7 polyèdres, un sommet du polygone par arête traversée ou sommet touché, dans l’ordre du tour', () => {
		const shapes: [Parameters<typeof polyhedronVertices>[0], number[]][] = [
			['cube', [2]],
			['pave', [4, 2, 3]],
			['prisme-triangle', [3, 2, 4]],
			['prisme-triangle-rectangle', [3, 2, 4]],
			['pyramide-carree', [3, 4]],
			['pyramide-rectangle', [4, 2, 3]],
			['pyramide-triangle', [3, 4]]
		];
		let checked = 0;
		for (const [form, dims] of shapes) {
			const vertices = polyhedronVertices(form, dims);
			const { edges } = solideTopology(form);
			// Les points nommables : sommets et milieux des arêtes
			const named = [
				...vertices,
				...edges.map(([i, j]) => ({
					x: (vertices[i].x + vertices[j].x) / 2,
					y: (vertices[i].y + vertices[j].y) / 2,
					z: (vertices[i].z + vertices[j].z) / 2
				}))
			];
			for (let i = 0; i < named.length; i++) {
				for (let j = i + 1; j < named.length; j++) {
					for (let k = j + 1; k < named.length; k++) {
						const [a, b, c] = [named[i], named[j], named[k]];
						const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
						const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
						const n = {
							x: u.y * v.z - u.z * v.y,
							y: u.z * v.x - u.x * v.z,
							z: u.x * v.y - u.y * v.x
						};
						const length = Math.hypot(n.x, n.y, n.z);
						if (length < 1e-6) continue;
						const side = (p: Point3) =>
							((p.x - a.x) * n.x + (p.y - a.y) * n.y + (p.z - a.z) * n.z) / length;
						const sides = vertices.map(side);
						const touched = sides.filter((s) => Math.abs(s) < 1e-7).length;
						const crossed = edges.filter(
							([p, q]) =>
								sides[p] * sides[q] < 0 && Math.min(Math.abs(sides[p]), Math.abs(sides[q])) > 1e-7
						).length;
						const polygon = planeInSolid(vertices, edges, a, b, c);
						expect(polygon).toHaveLength(touched + crossed);
						expect(polygon.length).toBeGreaterThanOrEqual(3);
						// Chaque sommet est dans le plan
						for (const p of polygon) expect(Math.abs(side(p))).toBeLessThan(1e-7);
						// Dans l'ordre du tour : convexe, on tourne toujours du même côté
						const turns = polygon.map((p, m) => {
							const q = polygon[(m + 1) % polygon.length];
							const r = polygon[(m + 2) % polygon.length];
							const e = { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z };
							const f = { x: r.x - q.x, y: r.y - q.y, z: r.z - q.z };
							return (
								((e.y * f.z - e.z * f.y) * n.x +
									(e.z * f.x - e.x * f.z) * n.y +
									(e.x * f.y - e.y * f.x) * n.z) /
								length
							);
						});
						expect(turns.every((t) => t > -1e-7) || turns.every((t) => t < 1e-7)).toBe(true);
						checked++;
					}
				}
			}
		}
		expect(checked).toBeGreaterThan(3000);
	});
});

describe('```solide — plans: (scène)', () => {
	it('sans plans : la scène ne porte pas de plans', () => {
		expect('plans' in scene(...CUBE)).toBe(false);
		expect('plans' in scene(...CUBE, 'droites: (AG)')).toBe(false);
	});

	it('(BDE) : la partie du plan dans le cube, le triangle BDE, bord fermé', () => {
		const s = scene(...CUBE, 'plans: (BDE)');
		const [plan] = plansOf(s);
		expect(samePoints(plan.fill, [s.vertices[1], s.vertices[3], s.vertices[4]])).toBe(true);
		// Le bord fait le tour : chaque côté du triangle est couvert par ses morceaux
		const pieces = plan.border;
		for (const piece of pieces) expect(piece.points).toHaveLength(2);
		const length = pieces.reduce((sum, p) => sum + distance(p.points[0], p.points[1]), 0);
		const perimeter = plan.fill.reduce(
			(sum, p, i) => sum + distance(p, plan.fill[(i + 1) % plan.fill.length]),
			0
		);
		expect(length).toBeCloseTo(perimeter, 6);
	});

	it('(BDE) en cavalière : [BE] dans la face de devant est plein, [BD] et [DE] sont en tirets', () => {
		const s = scene(...CUBE, 'plans: (BDE)');
		const [plan] = plansOf(s);
		const [b, d, e] = [s.vertices[1], s.vertices[3], s.vertices[4]];
		const dashedOf = (p: EspacePoint, q: EspacePoint) =>
			plan.border
				.filter(
					(piece) =>
						(close(piece.points[0], p) && close(piece.points[1], q)) ||
						(close(piece.points[0], q) && close(piece.points[1], p))
				)
				.map((piece) => piece.dashed);
		expect(dashedOf(b, e)).toEqual([false]);
		expect(dashedOf(b, d)).toEqual([true]);
		expect(dashedOf(d, e)).toEqual([true]);
	});

	it('cachees: non : tout le bord en trait plein', () => {
		const s = scene(...CUBE, 'cachees: non', 'plans: (BDE)');
		expect(plansOf(s)[0].border.every((piece) => !piece.dashed)).toBe(true);
	});

	it('un plan qui contient une face la teinte (comportement 75)', () => {
		const s = scene(...CUBE, 'plans: (ABC)');
		expect(samePoints(plansOf(s)[0].fill, s.vertices.slice(0, 4))).toBe(true);
	});

	it('le plan ne change ni le cadre ni les arêtes ni les noms des sommets', () => {
		const bare = scene(...CUBE);
		const s = scene(...CUBE, 'plans: (BDE)');
		expect(s.width).toBe(bare.width);
		expect(s.height).toBe(bare.height);
		expect(s.lines).toEqual(bare.lines);
		expect(s.labels).toEqual(bare.labels);
	});

	it('plan nommé : « (P) » ne touche ni un trait ni un autre nom, dans le plan ou à côté', () => {
		for (const lines of [
			[...CUBE, 'plans: P = (BDE)'],
			[...CUBE, 'plans: P = (ABG)'],
			[...CUBE, 'points: I milieu AE', 'droites: (IG)', 'plans: P = (BDE)'],
			['forme: pave 4 2 3', 'sommets: A B C D E F G H', 'plans: P = (ACG), Q = (BDE)'],
			['forme: pyramide carree 3 4', 'sommets: S A B C D', 'plans: P = (SAC)'],
			// Plan vu presque par la tranche, tout près des noms des sommets et des cotes (revue)
			['forme: pave 5 3 2', 'sommets: A B C D E F G H', 'plans: P = (ABF)'],
			['forme: pave 5 3 2', 'sommets: A B C D E F G H', 'plans: P = (BCG)'],
			['forme: prisme triangle 4 3 5', 'sommets: A B C D E F', 'plans: P = (ABC)'],
			['forme: prisme triangle 4 3 5', 'sommets: A B C D E F', 'cotes: cm', 'plans: P = (ABC)'],
			['forme: pave 5 3 2', 'sommets: A B C D E F G H', 'plans: P = (ABF)', 'tourner: oui'],
			['forme: pave 1 1 6', 'sommets: A B C D E F G H', 'plans: P = (EFG)']
		]) {
			const s = scene(...lines);
			plansOf(s).forEach((plan, k) => {
				const label = s.labels.find((l) => l.text === `(${['P', 'Q'][k]})`);
				expect(label, lines.join(' | ')).toBeDefined();
				if (label === undefined) return;
				const [lo, hi] = labelBox(label);
				const touched = traits(s).some(([a, b]) => hitsBox(a, b, lo, hi));
				expect(touched, `${lines.join(' | ')} : ${label.text} touche un trait`).toBe(false);
				// À côté du plan : tout contre son bord
				if (!inPolygon(label.at, plan.fill)) {
					const near = Math.min(
						...plan.fill.map((p, i) => {
							const q = plan.fill[(i + 1) % plan.fill.length];
							const t = Math.min(
								1,
								Math.max(
									0,
									((label.at.x - p.x) * (q.x - p.x) + (label.at.y - p.y) * (q.y - p.y)) /
										(distance(p, q) ** 2 || 1)
								)
							);
							return distance(label.at, { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
						})
					);
					expect(near, lines.join(' | ')).toBeLessThan(1);
				}
				for (const other of s.labels) {
					if (other === label) continue;
					const [olo, ohi] = labelBox(other);
					const apart = hi.x < olo.x || ohi.x < lo.x || hi.y < olo.y || ohi.y < lo.y;
					expect(apart, `${lines.join(' | ')} : ${label.text} touche ${other.text}`).toBe(true);
				}
			});
		}
	});

	it('le nom est dans le plan quand il y a la place, à côté quand le plan est trop mince', () => {
		const wide = scene(...CUBE, 'plans: P = (ABG)');
		const inWide = wide.labels.find((l) => l.text === '(P)');
		expect(inWide !== undefined && inPolygon(inWide.at, plansOf(wide)[0].fill)).toBe(true);
		// (BDE) d'un cube, en cavalière : vu presque par la tranche
		const thin = scene(...CUBE, 'plans: P = (BDE)');
		const byThin = thin.labels.find((l) => l.text === '(P)');
		expect(byThin !== undefined && inPolygon(byThin.at, plansOf(thin)[0].fill)).toBe(false);
	});

	it('plan sans nom : aucune étiquette de plus', () => {
		expect(scene(...CUBE, 'plans: (BDE)').labels).toHaveLength(8);
	});

	it('tourner: oui — sous tous les angles, le polygone suit les sommets et le nom reste dans le plan', () => {
		const s = spec(...CUBE, 'plans: P = (ABG)', 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		for (const vue of GRID) {
			const at = buildSolideScene(s, vue, rest.labelOffsets);
			const [plan] = plansOf(at);
			expect(
				samePoints(plan.fill, [at.vertices[0], at.vertices[1], at.vertices[6], at.vertices[7]])
			).toBe(true);
			const label = at.labels.find((l) => l.text === '(P)');
			expect(label).toBeDefined();
			if (label !== undefined) expect(inPolygon(label.at, plan.fill)).toBe(true);
			// Le cadre est celui de la figure au repos
			expect(at.width).toBeCloseTo(rest.width, 9);
			expect(at.height).toBeCloseTo(rest.height, 9);
		}
	});

	it('tourner: oui — un nom écrit à côté du plan suit son bord et reste dans le cadre', () => {
		const s = spec(...CUBE, 'plans: P = (BDE)', 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		for (const vue of GRID) {
			const at = buildSolideScene(s, vue, rest.labelOffsets);
			const label = at.labels.find((l) => l.text === '(P)');
			expect(label).toBeDefined();
			if (label === undefined) continue;
			const [lo, hi] = labelBox(label);
			expect(lo.x).toBeGreaterThanOrEqual(-1e-9);
			expect(lo.y).toBeGreaterThanOrEqual(-1e-9);
			expect(hi.x).toBeLessThanOrEqual(at.width + 1e-9);
			expect(hi.y).toBeLessThanOrEqual(at.height + 1e-9);
			// Jamais loin du bord du plan : à moins d'un centimètre d'un de ses côtés
			const [plan] = plansOf(at);
			const near = Math.min(
				...plan.fill.flatMap((p, i) => {
					const q = plan.fill[(i + 1) % plan.fill.length];
					return [0, 0.25, 0.5, 0.75, 1].map((t) =>
						distance(label.at, { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
					);
				})
			);
			expect(near).toBeLessThan(1);
			expect(at.width).toBeCloseTo(rest.width, 9);
		}
	});

	it('tourner: oui — le bord visible est celui des faces tournées vers l’œil (témoin : l’arête qu’il recouvre)', () => {
		// (ABC) : le bord du plan recouvre les quatre arêtes du bas ; chacune a l'état de son arête
		const s = spec(...CUBE, 'plans: (ABC)', 'tourner: oui');
		let compared = 0;
		for (const vue of GRID) {
			const at = buildSolideScene(s, vue);
			const [plan] = plansOf(at);
			for (const piece of plan.border) {
				const edge = at.lines.find(
					(l) =>
						l.points.length === 2 &&
						((close(l.points[0], piece.points[0]) && close(l.points[1], piece.points[1])) ||
							(close(l.points[0], piece.points[1]) && close(l.points[1], piece.points[0])))
				);
				// Vue par la tranche : deux arêtes se dessinent l'une sur l'autre, pas de témoin
				if (edge === undefined) continue;
				const [p, q] = piece.points;
				if (distance(p, q) < 1e-3) continue;
				const twins = at.lines.filter(
					(l) =>
						l.points.length === 2 &&
						((close(l.points[0], p) && close(l.points[1], q)) ||
							(close(l.points[0], q) && close(l.points[1], p)))
				);
				if (twins.length !== 1) continue;
				expect(piece.dashed).toBe(edge.dashed);
				compared++;
			}
		}
		expect(compared).toBeGreaterThan(400);
	});

	it('les points du plan sont ceux de l’espace : le polygone passe par les points donnés', () => {
		const s = spec(...CUBE, 'points: I milieu AE, J milieu CG', 'plans: (IBJ)');
		const at = buildSolideScene(s);
		const named3 = solidePoints3(s.form, s.dims, s.points);
		expect(named3).toHaveLength(10);
		const [plan] = plansOf(at);
		// I, B, J et H : un losange
		expect(plan.fill).toHaveLength(4);
		for (const p of [at.points[0], at.vertices[1], at.points[1], at.vertices[7]]) {
			expect(plan.fill.some((q) => close(p, q))).toBe(true);
		}
	});
});

describe('```solide — plans: (nom accessible, PDF)', () => {
	it('lecteur d’écran : « plan (BDE) », jamais une position relative', () => {
		const label = solideLabel(
			spec(...CUBE, 'points: I milieu AE', 'droites: (IG)', 'plans: (BDE), P = (ACG)')
		);
		expect(label).toContain('plan (BDE)');
		expect(label).toContain('plan P égal à (ACG)');
		expect(label).not.toMatch(/sécant|parall|coupe|perce/);
	});

	it('PDF : le plan teinté, son bord en couleur, tirets pour le bord caché', () => {
		const node = read(...CUBE, 'plans: P = (BDE)') as EspaceNode;
		const typst = generateEspaceTypst(node);
		expect(typst).toContain('polygon(fill: rgb(179, 219, 196)');
		const border = typst.split('\n').filter((l) => l.includes('paint: rgb(1, 134, 57)'));
		expect(border).toHaveLength(3);
		expect(border.filter((l) => l.includes('dash:'))).toHaveLength(2);
		expect(typst).toContain('(P)');
	});

	it('PDF sans plans : rien de changé', () => {
		const typst = generateEspaceTypst(read(...CUBE) as EspaceNode);
		expect(typst).not.toContain('rgb(179, 219, 196)');
	});
});
