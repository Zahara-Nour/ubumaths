/**
 * Bloc ```solide : droites données (`droites:`) — chantier `solides-3d`, lot 7a
 * (comportements 69, 73 à 75, 77 à 80, 83 du journal ; question (c) : en tirets
 * là où une face du solide passe devant la droite)
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
	solideTopology,
	type Point3,
	type SolideLine,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import {
	chordInSolid,
	hiddenStretches,
	turnVue,
	VUE_DE_DEPART,
	vueProjection,
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

const distance = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y);
/** Les bouts d'une droite dessinée : le début du premier morceau, la fin du dernier */
const ends = (pieces: SolideLine[]): [EspacePoint, EspacePoint] => [
	pieces[0].points[0],
	pieces[pieces.length - 1].points[1]
];
/** Le point est-il sur le segment [a, b] (au centième de millimètre) ? */
const onSegment = (p: EspacePoint, a: EspacePoint, b: EspacePoint) =>
	Math.abs(distance(a, p) + distance(p, b) - distance(a, b)) < 1e-6;
/** Les morceaux se suivent bout à bout, sans trou */
const expectContiguous = (pieces: SolideLine[]) => {
	for (const piece of pieces) expect(piece.points).toHaveLength(2);
	pieces.slice(1).forEach((piece, i) => {
		expect(distance(pieces[i].points[1], piece.points[0])).toBeLessThan(1e-9);
	});
};
const droitesOf = (s: SolideScene) => s.droites ?? [];

/** Une vue droite tournée (hors du passage depuis la cavalière) */
const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);

const GRID: EspaceVue[] = [VUE_DE_DEPART, { ...VUE_DE_DEPART, oblique: 0.5 }];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -100; pitch <= 100; pitch += 25) {
		GRID.push(turned((yaw * Math.PI) / 180, (pitch * Math.PI) / 180));
	}
}

describe('```solide — droites: (lecture)', () => {
	it('sans la clé : la spécification ne porte pas de droites', () => {
		expect('droites' in spec(...CUBE)).toBe(false);
	});

	it('une droite par deux points nommés, sommets ou points déclarés', () => {
		const s = spec(...CUBE, 'points: I milieu AE', 'droites: (IG), (AB)');
		expect(s.droites).toEqual([
			{ from: 8, to: 6, name: null },
			{ from: 0, to: 1, name: null }
		]);
	});

	it('une droite peut porter un nom ; les parenthèses sont facultatives', () => {
		const s = spec(...CUBE, 'droites: d = (AG), d1 = BH, d’ = (CE)');
		expect(s.droites).toEqual([
			{ from: 0, to: 6, name: 'd' },
			{ from: 1, to: 7, name: 'd1' },
			{ from: 2, to: 4, name: "d'" }
		]);
	});

	it('erreurs : point inconnu, deux fois le même point, trois points', () => {
		expect(errors(...CUBE, 'droites: (AZ)')[0]).toMatch(/aucun point ne s’appelle Z/);
		expect(errors(...CUBE, 'droites: (AA)')[0]).toMatch(/deux points distincts/);
		expect(errors(...CUBE, 'droites: (ABC)')[0]).toMatch(/une droite se désigne par deux points/);
	});

	it('erreurs : nom mal écrit, donné deux fois, déjà pris par un vecteur', () => {
		expect(errors(...CUBE, 'droites: D = (AG)')[0]).toMatch(/un nom de droite est une minuscule/);
		expect(errors(...CUBE, 'droites: d = (AG), d = (BH)')[0]).toMatch(/« d » deux fois/);
		expect(errors(...CUBE, 'vecteurs: u = AB', 'droites: u = (AG)')[0]).toMatch(
			/« u » est déjà le nom d’un vecteur/
		);
	});

	it('erreurs : la même droite deux fois, même écrite par d’autres points', () => {
		expect(errors(...CUBE, 'droites: (AG), (GA)')[0]).toMatch(/même droite/);
		// O centre du cube est sur (AG)
		expect(errors(...CUBE, 'points: O centre ABCDEFGH', 'droites: (AG), (AO)')[0]).toMatch(
			/même droite/
		);
	});

	it('erreurs : plus de 4 droites, solide rond, sommets sans nom', () => {
		expect(errors(...CUBE, 'droites: (AG), (BH), (CE), (DF), (AB)')[0]).toMatch(
			/au plus 4 droites/
		);
		expect(errors('forme: cylindre 2 3', "sommets: O O'", "droites: (OO')")[0]).toMatch(
			/polyèdres seulement/
		);
		expect(errors('forme: cube 2', 'droites: (AG)')[0]).toMatch(/nomme les sommets/);
	});

	it('pas dans ce lot : avec section: ou tracer:', () => {
		expect(errors(...CUBE, 'section: parallele ABCD 1', 'droites: (AG)').join(' ')).toMatch(
			/droites: ne va pas encore avec section:/
		);
		expect(errors(...CUBE, 'tracer: vecteur AB + AD', 'droites: (AG)').join(' ')).toMatch(
			/droites: ne va pas encore avec tracer:/
		);
	});

	it('lecteur d’écran : la droite est lue, jamais une position relative', () => {
		const label = solideLabel(spec(...CUBE, 'droites: (AG), d = (BH)'));
		expect(label).toContain('droite (AG)');
		expect(label).toContain('droite d égale à (BH)');
		expect(label).not.toMatch(/sécant|parall|coplan/);
	});
});

describe('moteur de vue — droite à travers un polyèdre', () => {
	const FORMS: [string, number[]][] = [
		['cube', [3]],
		['pave', [6, 2, 1]],
		['prisme-triangle', [4, 3, 5]],
		['prisme-triangle-rectangle', [3, 4, 6]],
		['pyramide-carree', [4, 6]],
		['pyramide-rectangle', [4, 2, 3]],
		['pyramide-triangle', [4, 3]]
	];
	const sub = (a: Point3, b: Point3) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
	const dot = (a: Point3, b: Point3) => a.x * b.x + a.y * b.y + a.z * b.z;
	const cross = (a: Point3, b: Point3) => ({
		x: a.y * b.z - a.z * b.y,
		y: a.z * b.x - a.x * b.z,
		z: a.x * b.y - a.y * b.x
	});
	const lerp = (a: Point3, b: Point3, t: number) => ({
		x: a.x + (b.x - a.x) * t,
		y: a.y + (b.y - a.y) * t,
		z: a.z + (b.z - a.z) * t
	});

	it('la corde : la droite entre dans le solide et en sort sur sa surface', () => {
		const vertices = polyhedronVertices('cube', [2]);
		const { faces } = solideTopology('cube');
		// (AG) : de A à G ; (A milieu de [CG]) : sort au milieu de [CG]
		const [enter, leave] = chordInSolid(vertices, faces, vertices[0], vertices[6]);
		expect(enter).toBeCloseTo(0, 9);
		expect(leave).toBeCloseTo(1, 9);
		const middle = lerp(vertices[2], vertices[6], 0.5);
		const half = lerp(vertices[0], middle, 0.5);
		const [from, to] = chordInSolid(vertices, faces, vertices[0], half);
		expect(from).toBeCloseTo(0, 9);
		expect(to).toBeCloseTo(2, 9);
	});

	it('chaque morceau est tout caché ou tout visible, sous tous les angles', () => {
		// Témoin indépendant : on avance pas à pas du point vers l'œil et on regarde
		// si l'on traverse le solide
		let checked = 0;
		for (const [form, dims] of FORMS) {
			const vertices = polyhedronVertices(form as SolideSpec['form'], dims);
			const { faces, edges } = solideTopology(form as SolideSpec['form']);
			const size = Math.max(...vertices.map((p) => Math.hypot(p.x, p.y, p.z))) * 2;
			const center = lerp(vertices[0], vertices[vertices.length - 1], 0.5);
			const pairs: [Point3, Point3][] = [
				[vertices[0], vertices[vertices.length - 1]],
				[vertices[1], vertices[2]],
				[lerp(vertices[0], vertices[1], 0.5), lerp(vertices[2], vertices[3], 0.3)]
			];
			for (const vue of GRID) {
				const view = vueProjection(vue, center);
				const turnedVertices = vertices.map(view.rotate);
				const middleOfSolid = turnedVertices.reduce(
					(s, p) => ({ x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }),
					{ x: 0, y: 0, z: 0 }
				);
				const inside3 = {
					x: middleOfSolid.x / vertices.length,
					y: middleOfSolid.y / vertices.length,
					z: middleOfSolid.z / vertices.length
				};
				const planes = faces.map((face) => {
					const [a, b, c] = face.map((i) => turnedVertices[i]);
					let normal = cross(sub(b, a), sub(c, a));
					if (dot(normal, sub(a, inside3)) < 0)
						normal = { x: -normal.x, y: -normal.y, z: -normal.z };
					const length = Math.hypot(normal.x, normal.y, normal.z);
					return { normal, at: a, length };
				});
				const inSolid = (p: Point3) =>
					planes.every((pl) => dot(pl.normal, sub(p, pl.at)) / pl.length < -size * 1e-4);
				const hiddenByMarching = (p: Point3) => {
					for (let k = 1; k <= 400; k++) {
						const s = (k / 400) * size * 2;
						const q = {
							x: p.x + view.toEye.x * s,
							y: p.y + view.toEye.y * s,
							z: p.z + view.toEye.z * s
						};
						if (inSolid(q)) return true;
					}
					return false;
				};
				for (const [a, b] of pairs) {
					const from = lerp(a, b, -0.4);
					const to = lerp(a, b, 1.4);
					const stretches = hiddenStretches(vertices, faces, edges, from, to, view);
					// Bout à bout, de 0 à 1
					expect(stretches[0].from).toBe(0);
					expect(stretches[stretches.length - 1].to).toBe(1);
					stretches.slice(1).forEach((s, i) => {
						expect(s.from).toBe(stretches[i].to);
						expect(s.hidden).not.toBe(stretches[i].hidden);
					});
					for (const stretch of stretches) {
						const width = stretch.to - stretch.from;
						// Près d'un bord, le témoin à pas fixes ne tranche pas : on reste au milieu
						if (width < 0.05) continue;
						for (const t of [0.3, 0.5, 0.7]) {
							const p = view.rotate(lerp(from, to, stretch.from + width * t));
							// Sur la surface vue de face (droite dans une face), le témoin ne
							// traverse rien : visible ; il n'est fiable que loin de la surface
							const marching = hiddenByMarching(p);
							if (marching) expect(stretch.hidden).toBe(true);
							else if (!inSolid(p)) {
								// Visible pour le témoin : la droite n'est pas cachée, sauf posée
								// sur une face du fond (le témoin part de la surface, sans la traverser)
								const onSurface = planes.some(
									(pl) => Math.abs(dot(pl.normal, sub(p, pl.at)) / pl.length) < size * 1e-4
								);
								if (!onSurface) expect(stretch.hidden).toBe(false);
							}
							checked++;
						}
					}
				}
			}
		}
		expect(checked).toBeGreaterThan(5000);
	});
});

describe('```solide — droites: (dessin fixe)', () => {
	it('sans droites : la scène ne porte pas de droites', () => {
		expect('droites' in scene(...CUBE)).toBe(false);
	});

	it('la droite passe par ses deux points et dépasse du solide des deux côtés', () => {
		const s = scene(...CUBE, 'droites: (AG)');
		const [pieces] = droitesOf(s);
		expectContiguous(pieces);
		const [start, end] = ends(pieces);
		const a = s.vertices[0];
		const g = s.vertices[6];
		expect(onSegment(a, start, end)).toBe(true);
		expect(onSegment(g, start, end)).toBe(true);
		// Un vrai dépassement : au moins 3 mm de chaque côté
		expect(distance(start, a)).toBeGreaterThan(0.3);
		expect(distance(end, g)).toBeGreaterThan(0.3);
	});

	it('diagonale du cube : en tirets dans le solide, en plein dehors', () => {
		const [pieces] = droitesOf(scene(...CUBE, 'droites: (AG)'));
		expect(pieces.map((p) => p.dashed)).toEqual([false, true, false]);
	});

	it('diagonale de la face de devant : rien ne la cache', () => {
		const [pieces] = droitesOf(scene(...CUBE, 'droites: (AF)'));
		expect(pieces.map((p) => p.dashed)).toEqual([false]);
	});

	it('diagonale de la face du fond : cachée tant que le solide passe devant, même hors du solide', () => {
		const s = scene(...CUBE, 'droites: (DG)');
		const [pieces] = droitesOf(s);
		// Au-delà de D, la droite est encore derrière la face de devant (sur le dessin,
		// elle n'en sortirait qu'en A) : son bout reste en tirets
		expect(pieces.map((p) => p.dashed)).toEqual([true, false]);
		const d = s.vertices[3];
		const hidden = pieces[0];
		expect(onSegment(d, hidden.points[0], hidden.points[1])).toBe(true);
		expect(distance(hidden.points[0], d)).toBeGreaterThan(0.3);
		// … et finit en G, sur le bord du dessin
		expect(distance(hidden.points[1], s.vertices[6])).toBeLessThan(1e-6);
	});

	it('droite qui suit une arête visible : en plein, elle la dépasse', () => {
		const s = scene(...CUBE, 'droites: (AB)');
		const [pieces] = droitesOf(s);
		expect(pieces.every((p) => !p.dashed)).toBe(true);
		const [start, end] = ends(pieces);
		expect(distance(start, end)).toBeGreaterThan(distance(s.vertices[0], s.vertices[1]) + 0.6);
	});

	it('cachees: non : tout en trait plein', () => {
		const pieces = droitesOf(scene(...CUBE, 'cachees: non', 'droites: (AG), (DG)')).flat();
		expect(pieces.every((p) => !p.dashed)).toBe(true);
	});

	it('le solide garde sa taille et sa forme ; tout tient dans la boîte', () => {
		const bare = scene(...CUBE);
		const s = scene(...CUBE, 'droites: (AG), d = (DG)');
		bare.vertices.forEach((p, i) => {
			expect(distance(s.vertices[i], s.vertices[0])).toBeCloseTo(distance(p, bare.vertices[0]), 9);
		});
		expect(s.drawingWidth).toBe(bare.drawingWidth);
		const drawn = [
			...droitesOf(s)
				.flat()
				.flatMap((l) => l.points),
			...s.labels.flatMap(labelBox)
		];
		for (const p of drawn) {
			expect(p.x).toBeGreaterThan(-1e-9);
			expect(p.y).toBeGreaterThan(-1e-9);
			expect(p.x).toBeLessThan(s.width + 1e-9);
			expect(p.y).toBeLessThan(s.height + 1e-9);
		}
	});

	it('le nom d’une droite s’écrit entre parenthèses, hors des traits', () => {
		const s = scene(...CUBE, 'droites: d = (AG)');
		const label = s.labels.find((l) => l.text === '(d)');
		expect(label).toBeDefined();
		// Le nom d'un sommet ne tombe pas sur la droite
		const [pieces] = droitesOf(s);
		const [start, end] = ends(pieces);
		for (const name of s.labels.filter((l) => l.text.length === 1)) {
			expect(onSegment(name.at, start, end)).toBe(false);
		}
	});

	it('point déclaré : la droite passe par lui', () => {
		const s = scene(...CUBE, 'points: I milieu AE', 'droites: (IG)');
		const [start, end] = ends(droitesOf(s)[0]);
		expect(onSegment(s.points[0], start, end)).toBe(true);
	});

	it('point par où passe une droite : son nom s’écarte du trait', () => {
		const s = scene(...CUBE, 'points: I milieu AE', 'droites: (IG)');
		const [start, end] = ends(droitesOf(s)[0]);
		const name = s.labels.find((l) => l.text === 'I');
		expect(name).toBeDefined();
		if (name === undefined) return;
		// Distance du milieu du nom à la droite : plus que la demi-hauteur d'une lettre
		const length = distance(start, end);
		const away =
			Math.abs(
				(end.x - start.x) * (name.at.y - start.y) - (end.y - start.y) * (name.at.x - start.x)
			) / length;
		const [lo, hi] = labelBox(name);
		expect(away).toBeGreaterThan((hi.y - lo.y) / 2);
		// Sans droites, le nom garde sa place d'avant
		const bare = scene(...CUBE, 'points: I milieu AE');
		expect(bare.labels.find((l) => l.text === 'I')?.at).toEqual(
			scene(...CUBE, 'points: I milieu AE', 'vecteurs: AB').labels.find((l) => l.text === 'I')?.at
		);
	});

	it('PDF : la droite en couleur, tirets compris ; sans droites, la fiche d’avant', () => {
		const node = (...lines: string[]): EspaceNode => read(...lines);
		const typst = generateEspaceTypst(node(...CUBE, 'droites: (AG)'));
		expect(typst).toContain('rgb(37, 99, 235)');
		expect(typst.split('rgb(37, 99, 235)').length - 1).toBe(3);
		expect(generateEspaceTypst(node(...CUBE))).not.toContain('rgb(37, 99, 235)');
	});
});

describe('```solide — droites: (figure que l’on peut tourner)', () => {
	const lines = [...CUBE, 'points: I milieu AE', 'droites: (IG), d = (DG), (AB)', 'tourner: oui'];

	it('sous tous les angles : droites entières, dans un cadre qui ne change pas', () => {
		const s = spec(...lines);
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		for (const vue of GRID) {
			const turnedScene = buildSolideScene(s, vue);
			expect(turnedScene.width).toBeCloseTo(rest.width, 9);
			expect(turnedScene.height).toBeCloseTo(rest.height, 9);
			const all = droitesOf(turnedScene);
			expect(all).toHaveLength(3);
			for (const pieces of all) {
				expectContiguous(pieces);
				for (const p of pieces.flatMap((l) => l.points)) {
					expect(p.x).toBeGreaterThan(-1e-9);
					expect(p.y).toBeGreaterThan(-1e-9);
					expect(p.x).toBeLessThan(turnedScene.width + 1e-9);
					expect(p.y).toBeLessThan(turnedScene.height + 1e-9);
				}
			}
			// La droite passe toujours par ses points
			const [start, end] = ends(all[0]);
			expect(onSegment(turnedScene.points[0], start, end)).toBe(true);
			expect(onSegment(turnedScene.vertices[6], start, end)).toBe(true);
		}
	});

	it('vue de derrière : la diagonale du fond passe devant, celle de devant est cachée', () => {
		const s = spec(...CUBE, 'droites: (DG), (AF)', 'tourner: oui');
		const behind = buildSolideScene(s, turned(Math.PI, 0));
		const [back, front] = droitesOf(behind);
		expect(back.every((p) => !p.dashed)).toBe(true);
		expect(front.some((p) => p.dashed)).toBe(true);
	});

	it('le dessin fixe d’un bloc avec tourner: est celui du bloc sans la clé', () => {
		const withKey = buildSolideScene(spec(...lines));
		const without = buildSolideScene(spec(...lines.slice(0, -1)));
		expect(withKey).toEqual(without);
	});

	it('noms tenus : une place de plus pour le nom de la droite, redonnée telle quelle', () => {
		const s = spec(...lines);
		const vue = turned(0.6, 0.3);
		const first = buildSolideScene(s, vue);
		// 8 sommets, I, (d)
		expect(first.labelOffsets).toHaveLength(10);
		// Une place redonnée repasse par une soustraction puis une addition : au dernier
		// chiffre près pour les noms, le reste à l'identique
		const again = buildSolideScene(s, vue, first.labelOffsets);
		expect(again.labels.map((l) => l.text)).toEqual(first.labels.map((l) => l.text));
		again.labels.forEach((label, i) => {
			expect(label.at.x).toBeCloseTo(first.labels[i].at.x, 9);
			expect(label.at.y).toBeCloseTo(first.labels[i].at.y, 9);
		});
		expect(again.droites).toEqual(first.droites);
		expect(again.lines).toEqual(first.lines);
		expect(again.width).toBe(first.width);
		expect(again.height).toBe(first.height);
	});
});
