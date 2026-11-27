/**
 * Bloc ```solide : solides coupés (`section:`) et cotés (`cotes:`) que l'on peut
 * tourner (`tourner: oui`) — chantier `solides-3d`, lot 4 (ADR 0045,
 * comportements 27 à 37 du journal, Q1, Q7 et Q8)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import {
	SOLIDE_ROUND_TILT,
	buildSolideScene,
	labelBox,
	solideLabel,
	type SolideLine,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import { VUE_DE_DEPART, turnVue, type EspaceVue } from '#lib/ubumark/utils/espace-vue.ts';

type Point = { x: number; y: number };

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	expect(node.rotationErrors).toBeUndefined();
	return node.spec as SolideSpec;
};

const PAVE = ['forme: pave 4 2 3', 'sommets: A B C D E F G H'];

/** Solides coupés ou cotés : polyèdres, puis solides ronds */
const POLYEDRES = [
	[...PAVE, 'cotes: cm'],
	// Sommets D et F à deux angles libres égaux : le nom reste du côté du dessin fixe
	['forme: pave 3 1 4', 'sommets: A B C D E F G H', 'cotes: cm'],
	['forme: pave 6 1 1', 'sommets: A B C D E F G H', 'section: parallele dessus 0.5 IJKL'],
	[...PAVE, 'section: parallele dessus 1 IJKL'],
	[...PAVE, 'section: parallele ABFE 0.5 IJKL', 'cotes: cm'],
	['forme: cube 3', 'sommets: A B C D E F G H', 'section: parallele droite', 'cotes: oui'],
	['forme: prisme triangle 4 3 5', 'sommets: A B C D E F', 'cotes: cm'],
	['forme: prisme triangle-rectangle 3 4 6', 'cotes: m'],
	['forme: pyramide carree 4 6', 'sommets: S A B C D', 'cotes: cm'],
	['forme: pyramide rectangle 4 2 3', 'sommets: S A B C D', 'cotes: cm'],
	['forme: pyramide triangle 4 3', 'sommets: S A B C', 'cotes: cm']
];
const RONDS = [
	['forme: cylindre 2 5', "sommets: O O'", 'cotes: cm'],
	['forme: cylindre 2 5', 'section: perpendiculaire 2'],
	['forme: cylindre 2 5', "sommets: O O'", 'section: perpendiculaire 2', 'cotes: cm'],
	['forme: cylindre 2 5', 'section: parallele 1'],
	['forme: cylindre 3 2', "sommets: O O'", 'section: parallele 1', 'cotes: cm'],
	['forme: cylindre 2 5', 'section: parallele'],
	['forme: cone 2 4', 'sommets: S O', 'cotes: cm'],
	['forme: boule 3', 'sommets: O', 'cotes: cm'],
	['forme: boule 3', 'section: 1'],
	['forme: boule 3', 'sommets: O', 'section: 2', 'cotes: cm'],
	// Plan près du centre, cylindre étroit : le nom du centre s'écarte de la cote
	['forme: boule 6', 'sommets: O', 'section: 1.5', 'cotes: cm'],
	['forme: cylindre 1 8', "sommets: O O'", 'section: parallele 0.5', 'cotes: cm'],
	['forme: boule 3', 'section: oui']
];

const REST = SOLIDE_ROUND_TILT.atRest;
const deg = (d: number) => (d * Math.PI) / 180;

/** Solide rond : la vraie vue, regardée de `elevation` au-dessus de l'horizontale */
const from = (elevation: number, yaw = 0): EspaceVue => ({
	yaw,
	pitch: elevation - REST,
	oblique: 0
});
/** Polyèdre : une vue droite tournée */
const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);

const GRID_POLYEDRES: EspaceVue[] = [
	{ ...VUE_DE_DEPART, oblique: 0.5 },
	// En plein passage, déjà tournée
	{ yaw: 1.1, pitch: 0.4, oblique: 0.7 },
	{ yaw: -2, pitch: -0.6, oblique: 0.3 }
];
for (let yaw = -180; yaw < 180; yaw += 30) {
	for (let pitch = -100; pitch <= 100; pitch += 25)
		GRID_POLYEDRES.push(turned(deg(yaw), deg(pitch)));
}
const GRID_RONDS: EspaceVue[] = [];
for (const oblique of [0, 0.5, 1]) {
	for (let elevation = -90; elevation <= 90; elevation += 15) {
		for (const yaw of [0, 1, -2.5, Math.PI / 2]) {
			if (oblique === 1 && elevation === 0 && yaw === 0) continue;
			GRID_RONDS.push({ ...from(deg(elevation), yaw), oblique });
		}
	}
}

const drawn = (scene: SolideScene) => [
	...scene.lines.flatMap((l) => l.points),
	...(scene.section ?? []),
	...scene.dots,
	...scene.vertices,
	...scene.labels.flatMap(labelBox)
];
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const straight = (l: SolideLine) => l.points.length === 2;
/** Le texte d'une cote : un nombre, avec ou sans unité */
const isCote = (text: string) => /^\d/.test(text);
const cotesOf = (scene: SolideScene) => scene.labels.filter((l) => isCote(l.text));
/** Échelle du dessin fixe d'un cylindre ou d'un cône (cm de dessin par unité) */
const scaleOf = (s: SolideSpec) => {
	const fixed = buildSolideScene({ ...s, section: null, cotes: null });
	return s.dims.length === 1
		? fixed.drawingWidth / (2 * s.dims[0])
		: distance(fixed.vertices[0], fixed.vertices[1]) / s.dims[1];
};
const boundsOf = (points: Point[]) => ({
	minX: Math.min(...points.map((p) => p.x)),
	maxX: Math.max(...points.map((p) => p.x)),
	minY: Math.min(...points.map((p) => p.y)),
	maxY: Math.max(...points.map((p) => p.y))
});

describe('```solide coupé ou coté — tourner: (comportement 37)', () => {
	it.each([...POLYEDRES, ...RONDS])('%s %s %s : la figure tourne', (...lines) => {
		const node = read(...lines.filter((l) => l !== undefined), 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toBeUndefined();
		expect((node.spec as SolideSpec).rotate).toBe(true);
	});

	it('tracer: tourne depuis le lot 5 (comportement 52)', () => {
		const node = read(...PAVE, 'tracer: vecteur AB + AD', 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.rotationErrors).toBeUndefined();
		expect((node.spec as SolideSpec).rotate).toBe(true);
	});

	it('PDF : la vue de départ avec ses cotes, la même fiche que sans la clé (comportement 34)', () => {
		for (const lines of [POLYEDRES[2], RONDS[2], RONDS[9]]) {
			expect(generateEspaceTypst(read(...lines, 'tourner: oui'))).toBe(
				generateEspaceTypst(read(...lines))
			);
		}
	});

	it('lecteur d’écran : la même description, cotes comprises (comportement 36)', () => {
		const lines = [...PAVE, 'section: parallele dessus 1 IJKL', 'cotes: cm'];
		const label = solideLabel(spec(...lines, 'tourner: oui'));
		expect(label).toBe(`${solideLabel(spec(...lines))}, figure que l’on peut tourner`);
		expect(label).toContain('longueurs 4 cm, 2 cm, 3 cm');
		expect(label).toContain('section IJKL');
	});
});

describe('```solide coupé ou coté — au repos (comportement 27)', () => {
	it.each([...POLYEDRES, ...RONDS])('%s %s %s : le dessin fixe, déplacé en bloc', (...lines) => {
		const s = spec(...lines.filter((l) => l !== undefined), 'tourner: oui');
		const fixed = buildSolideScene(s);
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		const dx = rest.vertices[0].x - fixed.vertices[0].x;
		const dy = rest.vertices[0].y - fixed.vertices[0].y;
		const close = (a: Point[], b: Point[]) => {
			expect(a).toHaveLength(b.length);
			a.forEach((p, i) => {
				expect(p.x - dx).toBeCloseTo(b[i].x, 9);
				expect(p.y - dy).toBeCloseTo(b[i].y, 9);
			});
		};
		close(rest.vertices, fixed.vertices);
		expect(rest.lines).toHaveLength(fixed.lines.length);
		close(
			rest.lines.flatMap((l) => l.points),
			fixed.lines.flatMap((l) => l.points)
		);
		expect(rest.lines.map((l) => [l.dashed, l.thick, l.thin])).toEqual(
			fixed.lines.map((l) => [l.dashed, l.thick, l.thin])
		);
		close(rest.section ?? [], fixed.section ?? []);
		close(rest.dots, fixed.dots);
		close(
			rest.labels.map((l) => l.at),
			fixed.labels.map((l) => l.at)
		);
		expect(rest.labels.map((l) => l.text)).toEqual(fixed.labels.map((l) => l.text));
	});
});

describe('```solide coté — les longueurs s’effacent quand la figure tourne (comportement 28, Q1)', () => {
	const coted = [...POLYEDRES, ...RONDS].filter((lines) =>
		lines.some((l) => l.startsWith('cotes'))
	);

	it.each(coted)('%s %s %s : écrites au repos, effacées dès que la vue change', (...lines) => {
		const curved = /cylindre|cone|boule/.test(lines[0]);
		const s = spec(...lines.filter((l) => l !== undefined), 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		expect(cotesOf(rest).length).toBeGreaterThan(0);
		const names = rest.labels.filter((l) => !isCote(l.text)).map((l) => l.text);
		for (const vue of curved ? GRID_RONDS : GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue);
			expect(cotesOf(scene)).toEqual([]);
			expect(scene.labels.map((l) => l.text)).toEqual(names);
			// Le trait de renvoi d'une cote part avec elle
			expect(scene.lines.filter((l) => l.thin)).toEqual([]);
		}
	});

	it('une vue égale à la vue de départ, même reconstruite : les longueurs sont écrites', () => {
		const s = spec(...PAVE, 'cotes: cm', 'tourner: oui');
		expect(cotesOf(buildSolideScene(s, { yaw: 0, pitch: 0, oblique: 1 }))).toHaveLength(3);
	});

	it('pyramide : la cote renvoyée hors du solide tient dans le cadre au repos', () => {
		const s = spec('forme: pyramide carree 4 6', 'sommets: S A B C D', 'cotes: cm', 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		expect(rest.lines.filter((l) => l.thin)).toHaveLength(1);
		expect(rest.labels.map((l) => l.text)).toContain('6 cm');
	});
});

describe('```solide coupé ou coté — cadre fixe (comportement 24)', () => {
	it.each([...POLYEDRES, ...RONDS])(
		'%s %s %s : même cadre à chaque angle, tout le dessin dedans',
		(...lines) => {
			const curved = /cylindre|cone|boule/.test(lines[0]);
			const s = spec(...lines.filter((l) => l !== undefined), 'tourner: oui');
			const rest = buildSolideScene(s, VUE_DE_DEPART);
			const pivotOf = (scene: SolideScene) =>
				curved && s.form !== 'boule'
					? {
							x: (scene.vertices[0].x + scene.vertices[1].x) / 2,
							y: (scene.vertices[0].y + scene.vertices[1].y) / 2
						}
					: null;
			for (const vue of [VUE_DE_DEPART, ...(curved ? GRID_RONDS : GRID_POLYEDRES)]) {
				const scene = buildSolideScene(s, vue);
				expect(scene.width).toBe(rest.width);
				expect(scene.height).toBe(rest.height);
				for (const p of drawn(scene)) {
					expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
					expect(p.x).toBeGreaterThanOrEqual(-1e-9);
					expect(p.y).toBeGreaterThanOrEqual(-1e-9);
					expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
					expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
				}
				// Le centre du solide ne bouge pas dans le cadre
				const a = pivotOf(scene);
				const b = pivotOf(rest);
				if (a !== null && b !== null) {
					expect(a.x).toBeCloseTo(b.x, 9);
					expect(a.y).toBeCloseTo(b.y, 9);
				}
			}
		}
	);

	it('places tenues au repos (noms qui se replacent après le retour) : même cadre', () => {
		const s = spec('forme: pyramide carree 4 6', 'sommets: S A B C D', 'cotes: cm', 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		const held = buildSolideScene(s, turned(2, 0.4)).labelOffsets;
		const back = buildSolideScene(s, VUE_DE_DEPART, held);
		expect(back.width).toBe(rest.width);
		expect(back.height).toBe(rest.height);
		expect(cotesOf(back)).toHaveLength(2);
		// Les cotes et leur trait de renvoi sont déjà à leur place du repos : rien ne saute
		// quand les noms ont fini de se replacer
		expect(cotesOf(back)).toEqual(cotesOf(rest));
		expect(back.lines.filter((l) => l.thin)).toEqual(rest.lines.filter((l) => l.thin));
		for (const p of drawn(back)) {
			expect(p.x).toBeGreaterThanOrEqual(-1e-9);
			expect(p.y).toBeGreaterThanOrEqual(-1e-9);
			expect(p.x).toBeLessThanOrEqual(back.width + 1e-9);
			expect(p.y).toBeLessThanOrEqual(back.height + 1e-9);
		}
	});
});

describe('```solide coté — les traits des cotes restent et tournent (Q7)', () => {
	it('pyramide : la hauteur en tirets, du sommet au centre de la base, à chaque angle', () => {
		const s = spec('forme: pyramide carree 4 6', 'sommets: S A B C D', 'cotes: cm', 'tourner: oui');
		for (const vue of GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue);
			const [apex, ...base] = scene.vertices;
			const foot = {
				x: base.reduce((sum, p) => sum + p.x, 0) / 4,
				y: base.reduce((sum, p) => sum + p.y, 0) / 4
			};
			const height = scene.lines.filter(
				(l) =>
					straight(l) && distance(l.points[0], apex) < 1e-9 && distance(l.points[1], foot) < 1e-9
			);
			expect(height).toHaveLength(1);
			expect(height[0].dashed).toBe(true);
			// 8 arêtes et la hauteur
			expect(scene.lines).toHaveLength(9);
		}
	});

	it('cylindre : le rayon part du centre du haut et tourne quand on glisse de côté', () => {
		const s = spec('forme: cylindre 2 5', "sommets: O O'", 'cotes: cm', 'tourner: oui');
		const k = scaleOf(s);
		const radius = (scene: SolideScene) => {
			const top = scene.vertices[1];
			const found = scene.lines.filter((l) => straight(l) && distance(l.points[0], top) < 1e-9);
			expect(found).toHaveLength(1);
			return { x: found[0].points[1].x - top.x, y: found[0].points[1].y - top.y };
		};
		for (const yaw of [0, 0.7, Math.PI / 2, 2.4, -1]) {
			for (const elevation of [-60, -20, 10, 45, 90]) {
				const end = radius(buildSolideScene(s, from(deg(elevation), yaw)));
				expect(end.x).toBeCloseTo(2 * k * Math.cos(yaw), 9);
				// Le bout du rayon qui part vers le fond (yaw négatif) monte, vu de dessus
				expect(end.y).toBeCloseTo(2 * k * Math.sin(yaw) * Math.sin(deg(elevation)), 9);
			}
		}
		// De face : le rayon en vraie grandeur ; par le bout, vu de profil : un point
		expect(
			Math.hypot(...Object.values(radius(buildSolideScene(s, from(0, Math.PI / 2)))))
		).toBeLessThan(1e-9);
	});

	it('cylindre : le rayon du haut, vu de dessous, est en tirets (il est derrière le solide)', () => {
		const s = spec('forme: cylindre 2 5', 'cotes: cm', 'tourner: oui');
		const radiusLine = (scene: SolideScene) =>
			scene.lines.find((l) => straight(l) && distance(l.points[0], scene.vertices[1]) < 1e-9);
		expect(radiusLine(buildSolideScene(s, from(deg(40))))?.dashed).toBe(false);
		expect(radiusLine(buildSolideScene(s, from(deg(-40))))?.dashed).toBe(true);
		const plain = spec('forme: cylindre 2 5', 'cotes: cm', 'cachees: non', 'tourner: oui');
		expect(radiusLine(buildSolideScene(plain, from(deg(-40))))?.dashed).toBe(false);
	});

	it('cône : le rayon et la hauteur, en tirets, partent du centre de la base', () => {
		const s = spec('forme: cone 2 4', 'sommets: S O', 'cotes: cm', 'tourner: oui');
		const k = scaleOf(s);
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(s, vue);
			const [apex, center] = scene.vertices;
			const fromCenter = scene.lines.filter(
				(l) =>
					straight(l) &&
					l.dashed &&
					(distance(l.points[0], center) < 1e-9 || distance(l.points[1], center) < 1e-9)
			);
			expect(fromCenter).toHaveLength(2);
			const ends = fromCenter.map((l) =>
				distance(l.points[0], center) < 1e-9 ? l.points[1] : l.points[0]
			);
			expect(ends.some((p) => distance(p, apex) < 1e-9)).toBe(true);
			const rim = ends.find((p) => distance(p, apex) >= 1e-9) ?? ends[0];
			expect(Math.abs(rim.x - center.x)).toBeCloseTo(Math.abs(2 * k * Math.cos(vue.yaw)), 9);
		}
	});

	it('boule : le rayon en tirets tourne avec la boule et ne sort jamais du contour', () => {
		const s = spec('forme: boule 3', 'sommets: O', 'cotes: cm', 'tourner: oui');
		const fixed = buildSolideScene(s);
		const r = fixed.drawingWidth / 2;
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(s, vue);
			const center = scene.vertices[0];
			const radius = scene.lines.filter((l) => straight(l));
			expect(radius).toHaveLength(1);
			expect(radius[0].dashed).toBe(true);
			expect(distance(radius[0].points[0], center)).toBeLessThan(1e-9);
			expect(distance(radius[0].points[1], center)).toBeLessThanOrEqual(r + 1e-9);
			expect(radius[0].points[1].x - center.x).toBeCloseTo(r * Math.cos(vue.yaw), 9);
		}
		expect(buildSolideScene(s, from(deg(40), 1.2))).not.toEqual(buildSolideScene(s, from(deg(40))));
	});
});

describe('pavé coupé qui tourne (comportements 29 et 30, Q8)', () => {
	const s = spec(...PAVE, 'section: parallele dessus 1 IJKL', 'tourner: oui');

	it('la section suit : chaque point reste sur son arête, à la même proportion', () => {
		for (const vue of GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue);
			const v = scene.vertices;
			expect(scene.section).toHaveLength(4);
			// Face du dessus EFGH, à 1 sur une hauteur de 3 : au tiers de [EA], [FB], [GC], [HD]
			[
				[4, 0],
				[5, 1],
				[6, 2],
				[7, 3]
			].forEach(([top, bottom], i) => {
				const p = scene.section?.[i] as Point;
				expect(p.x).toBeCloseTo(v[top].x + (v[bottom].x - v[top].x) / 3, 9);
				expect(p.y).toBeCloseTo(v[top].y + (v[bottom].y - v[top].y) / 3, 9);
			});
		}
	});

	it('contour de la section : quatre traits épais, pleins, à chaque angle (même vue de derrière)', () => {
		for (const vue of GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue);
			const thick = scene.lines.filter((l) => l.thick);
			expect(thick).toHaveLength(4);
			expect(thick.every((l) => !l.dashed)).toBe(true);
			// Les arêtes du pavé gardent leurs tirets : trois cachées, sauf par la tranche
			const edges = scene.lines.filter((l) => !l.thick);
			expect(edges).toHaveLength(12);
			expect(edges.filter((l) => l.dashed).length).toBeLessThanOrEqual(3);
		}
		expect(
			buildSolideScene(s, turned(2.5, 0.3)).lines.filter((l) => l.dashed && !l.thick)
		).toHaveLength(3);
	});

	it('les noms I, J, K, L suivent leurs points', () => {
		for (const vue of GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue);
			['I', 'J', 'K', 'L'].forEach((name, i) => {
				const label = scene.labels.find((l) => l.text === name);
				expect(label).toBeDefined();
				expect(distance(label?.at as Point, scene.section?.[i] as Point)).toBeLessThan(0.6);
			});
		}
	});

	it('noms tenus : sommets et points de la section gardent leur place pendant la rotation', () => {
		const start = buildSolideScene(s, turned(0.3, 0.1));
		const held = start.labelOffsets;
		expect(held).toHaveLength(12);
		for (const vue of GRID_POLYEDRES) {
			const scene = buildSolideScene(s, vue, held);
			expect(scene.labels.map((l) => l.text)).toEqual(start.labels.map((l) => l.text));
			const anchors = [...scene.vertices, ...(scene.section ?? [])];
			scene.labels.forEach((label, i) => {
				expect(label.at.x - anchors[i].x).toBeCloseTo(held?.[i].x ?? NaN, 9);
				expect(label.at.y - anchors[i].y).toBeCloseTo(held?.[i].y ?? NaN, 9);
			});
			expect(scene.labelOffsets).toHaveLength(12);
		}
	});

	it('pavé coupé et coté, au repos : une place par nom (les cotes n’en ont pas), pour tenir les noms dès le départ', () => {
		const coted = spec(...PAVE, 'section: parallele dessus 1 IJKL', 'cotes: cm', 'tourner: oui');
		const rest = buildSolideScene(coted, VUE_DE_DEPART);
		expect(cotesOf(rest)).toHaveLength(4);
		expect(rest.labelOffsets).toHaveLength(12);
		// Tenues dès le premier mouvement : les noms ne sautent pas quand les cotes s'effacent
		const next = buildSolideScene(coted, { ...VUE_DE_DEPART, oblique: 0.9 }, rest.labelOffsets);
		const anchors = [...next.vertices, ...(next.section ?? [])];
		expect(next.labels).toHaveLength(12);
		next.labels.forEach((label, i) => {
			expect(label.at.x - anchors[i].x).toBeCloseTo(rest.labelOffsets?.[i].x ?? NaN, 9);
			expect(label.at.y - anchors[i].y).toBeCloseTo(rest.labelOffsets?.[i].y ?? NaN, 9);
		});
	});

	it('dessin fixe : aucune place de nom rendue (scène inchangée)', () => {
		expect(buildSolideScene(s).labelOffsets).toBeUndefined();
	});
});

describe('cylindre coupé qui tourne (comportements 31 et 32)', () => {
	it('coupe horizontale : un ovale centré sur l’axe, à la hauteur de la coupe, qui s’ouvre avec les bases', () => {
		const s = spec(
			'forme: cylindre 2 5',
			"sommets: O O'",
			'section: perpendiculaire 2',
			'tourner: oui'
		);
		const k = scaleOf(s);
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(s, vue);
			const [low, high] = scene.vertices;
			const box = boundsOf(scene.section ?? []);
			expect((box.minX + box.maxX) / 2).toBeCloseTo(low.x, 9);
			expect((box.minY + box.maxY) / 2).toBeCloseTo(low.y + ((high.y - low.y) * 2) / 5, 9);
			expect(box.maxX - box.minX).toBeCloseTo(4 * k, 9);
			const elevation = vue.pitch + REST;
			expect(box.maxY - box.minY).toBeCloseTo(4 * k * Math.abs(Math.sin(elevation)), 9);
			const thick = scene.lines.filter((l) => l.thick);
			expect(thick).toHaveLength(1);
			expect(thick[0].dashed).toBe(false);
		}
		// Tourner autour de l'axe ne change rien à une coupe horizontale
		expect(buildSolideScene(s, from(deg(40), 1.2))).toEqual(buildSolideScene(s, from(deg(40))));
	});

	it('coupe parallèle à l’axe : le rectangle tourne autour de l’axe quand on glisse de côté', () => {
		const s = spec('forme: cylindre 2 5', "sommets: O O'", 'section: parallele 1', 'tourner: oui');
		const k = scaleOf(s);
		const half = Math.sqrt(3) * k;
		const width = (scene: SolideScene) => {
			const box = boundsOf(scene.section ?? []);
			return box.maxX - box.minX;
		};
		// De face : la largeur de la corde, en vraie grandeur ; hauteur du cylindre
		const face = buildSolideScene(s, from(0));
		expect(face.section).toHaveLength(4);
		expect(width(face)).toBeCloseTo(2 * half, 9);
		const box = boundsOf(face.section ?? []);
		expect(box.maxY - box.minY).toBeCloseTo(5 * k, 9);
		// De profil (quart de tour) : un trait, à 1 de l'axe
		const profile = buildSolideScene(s, from(0, Math.PI / 2));
		expect(width(profile)).toBeLessThan(1e-9);
		expect(Math.abs((profile.section?.[0].x ?? 0) - profile.vertices[0].x)).toBeCloseTo(k, 9);
		// Entre les deux : la largeur suit le cosinus du tour
		for (const yaw of [0.4, 1, -2.5, 3]) {
			expect(width(buildSolideScene(s, from(deg(30), yaw)))).toBeCloseTo(
				2 * half * Math.abs(Math.cos(yaw)),
				9
			);
		}
		expect(buildSolideScene(s, from(deg(30), 1))).not.toEqual(buildSolideScene(s, from(deg(30))));
	});

	it('coupe parallèle vue de derrière : toujours teintée, contour plein (Q8)', () => {
		const s = spec('forme: cylindre 2 5', 'section: parallele 1', 'tourner: oui');
		const behind = buildSolideScene(s, from(deg(20), Math.PI));
		expect(behind.section).toHaveLength(4);
		const thick = behind.lines.filter((l) => l.thick);
		expect(thick).toHaveLength(1);
		expect(thick[0].dashed).toBe(false);
		// Derrière l'axe : vu de dessus, le rectangle est plus haut que l'axe
		const lowest = Math.max(...(behind.section ?? []).map((p) => p.y));
		expect(lowest).toBeLessThan(buildSolideScene(s, from(deg(20))).section?.[0].y ?? 0);
	});

	it('coupe parallèle cotée : le trait de la distance à l’axe reste, en tirets, du centre au rectangle', () => {
		const s = spec(
			'forme: cylindre 3 2',
			"sommets: O O'",
			'section: parallele 1',
			'cotes: cm',
			'tourner: oui'
		);
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(s, vue);
			const low = scene.vertices[0];
			const [a, b] = scene.section as Point[];
			const foot = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
			const line = scene.lines.filter(
				(l) =>
					straight(l) && distance(l.points[0], low) < 1e-9 && distance(l.points[1], foot) < 1e-9
			);
			expect(line).toHaveLength(1);
			expect(line[0].dashed).toBe(true);
		}
	});
});

describe('boule coupée qui tourne (comportement 33)', () => {
	const s = spec('forme: boule 3', 'sommets: O', 'section: 1', 'tourner: oui');

	it('le contour reste un cercle ; la section est un ovale qui s’ouvre, jusqu’au cercle vu de dessus', () => {
		const fixed = buildSolideScene(s);
		const r = fixed.drawingWidth / 2;
		const k = r / 3;
		const rho = Math.sqrt(8) * k;
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(s, vue);
			const center = scene.vertices[0];
			const elevation = vue.pitch + REST;
			// Le contour, et rien d'autre que la section : pas d'équateur
			const curves = scene.lines.filter((l) => !straight(l));
			expect(curves).toHaveLength(2);
			const contour = curves.find((l) => !l.thick);
			for (const p of contour?.points ?? []) expect(distance(p, center)).toBeCloseTo(r, 9);
			const box = boundsOf(scene.section ?? []);
			expect((box.minX + box.maxX) / 2).toBeCloseTo(center.x, 9);
			expect(box.maxX - box.minX).toBeCloseTo(2 * rho, 9);
			expect(box.maxY - box.minY).toBeCloseTo(2 * rho * Math.abs(Math.sin(elevation)), 9);
			// Le centre de la section monte de d × cos(inclinaison) au-dessus du centre
			expect(center.y - (box.minY + box.maxY) / 2).toBeCloseTo(k * Math.cos(elevation), 9);
			// La section reste dans la boule
			for (const p of scene.section ?? [])
				expect(distance(p, center)).toBeLessThanOrEqual(r + 1e-9);
		}
	});

	it('vue de dessus : un cercle, centré sur le centre de la boule', () => {
		const scene = buildSolideScene(s, from(deg(90)));
		const k = buildSolideScene(s).drawingWidth / 6;
		for (const p of scene.section ?? []) {
			expect(distance(p, scene.vertices[0])).toBeCloseTo(Math.sqrt(8) * k, 9);
		}
	});

	it('boule coupée et cotée : le trait de la distance, en tirets, du centre de la boule au centre de la section', () => {
		const coted = spec('forme: boule 3', 'sommets: O', 'section: 2', 'cotes: cm', 'tourner: oui');
		for (const vue of GRID_RONDS) {
			const scene = buildSolideScene(coted, vue);
			const center = scene.vertices[0];
			const box = boundsOf(scene.section ?? []);
			const middle = { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 };
			const lines = scene.lines.filter(
				(l) => straight(l) && l.dashed && distance(l.points[1], middle) < 1e-9
			);
			expect(lines).toHaveLength(1);
			expect(distance(lines[0].points[0], center)).toBeLessThan(1e-9);
		}
	});
});
