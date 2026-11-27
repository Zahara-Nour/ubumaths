/**
 * Bloc ```solide : cylindre, cône et boule que l'on peut tourner (`tourner: oui`)
 * — chantier `solides-3d`, lot 3 (ADR 0045, comportements 16 à 26 du journal)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import {
	SOLIDE_ROUND_TILT,
	buildSolideScene,
	labelBox,
	solideTilt,
	type SolideLine,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import {
	VUE_DE_DEPART,
	VUE_DROITE_PITCH,
	turnVue,
	type EspaceVue
} from '#lib/ubumark/utils/espace-vue.ts';

type Point = { x: number; y: number };

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	expect(node.rotationErrors).toBeUndefined();
	return node.spec as SolideSpec;
};

const CYLINDRE = spec('forme: cylindre 2 5', "sommets: O O'", 'tourner: oui');
const CONE = spec('forme: cone 2 4', 'sommets: S O', 'tourner: oui');
const BOULE = spec('forme: boule 3', 'sommets: O', 'tourner: oui');

const FORMS = [
	['forme: cylindre 2 5', "sommets: O O'"],
	['forme: cylindre 3 1', "sommets: O O'"],
	['forme: cylindre 1 8'],
	['forme: cone 2 4', 'sommets: S O'],
	['forme: cone 4 2.1', 'sommets: S O', 'marquer: sommet S'],
	['forme: cone 1 9'],
	['forme: boule 3', 'sommets: O'],
	['forme: cylindre 2 5', "sommets: O O'", 'cachees: non']
];

/** Inclinaison du regard au repos : celle dont l'ovale « à plat » est la vraie vue */
const REST = SOLIDE_ROUND_TILT.atRest;
const deg = (d: number) => (d * Math.PI) / 180;

/** La vraie vue (hors du passage), regardée de `elevation` au-dessus de l'horizontale */
const from = (elevation: number, yaw = 0): EspaceVue => ({
	yaw,
	pitch: elevation - REST,
	oblique: 0
});

/** Vues essayées : du dessous au dessus, un tour complet, passage compris */
const GRID: EspaceVue[] = [];
for (const oblique of [0, 0.5, 1]) {
	for (let elevation = -90; elevation <= 90; elevation += 15) {
		for (const yaw of [0, 1, -2.5]) GRID.push({ ...from(deg(elevation), yaw), oblique });
	}
}

const drawn = (scene: SolideScene) => [
	...scene.lines.flatMap((l) => l.points),
	...scene.dots,
	...scene.vertices,
	...scene.labels.flatMap(labelBox)
];

/** Centre du cadre d'une scène tournée : le centre du solide */
const pivot = (scene: SolideScene): Point => ({ x: scene.width / 2, y: scene.height / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
/** Échelle du dessin fixe : sa hauteur dessinée (cylindre, cône) ou son diamètre (boule) */
const scaleOf = (s: SolideSpec) => {
	const fixed = buildSolideScene(s);
	return s.dims.length === 1
		? fixed.drawingWidth / (2 * s.dims[0])
		: distance(fixed.vertices[0], fixed.vertices[1]) / s.dims[1];
};
const straight = (l: SolideLine) => l.points.length === 2;
const curves = (scene: SolideScene) => scene.lines.filter((l) => !straight(l));

describe('```solide rond — tourner:', () => {
	it.each([['forme: cylindre 2 5'], ['forme: cone 2 4'], ['forme: boule 3']])(
		'%s : tourner: oui allume la rotation',
		(form) => {
			const node = read(form, 'tourner: oui');
			expect(node.errors).toEqual([]);
			expect(node.rotationErrors).toBeUndefined();
			expect((node.spec as SolideSpec).rotate).toBe(true);
		}
	);

	it.each([
		['forme: cylindre 2 5', 'section: perpendiculaire 2', 'section:'],
		['forme: boule 3', 'section: 1', 'section:'],
		['forme: cone 2 4', 'cotes: cm', 'cotes:']
	])('%s avec %s : pas encore, figure fixe (comportement 26)', (form, line, key) => {
		const node = read(form, line, 'tourner: oui');
		expect(node.errors).toEqual([]);
		expect(node.spec).not.toHaveProperty('rotate');
		expect(node.rotationErrors).toHaveLength(1);
		expect(node.rotationErrors?.[0]).toContain('Ligne 3');
		expect(node.rotationErrors?.[0]).toContain(key);
	});

	it('PDF : la vue de départ, la même fiche qu’un cylindre sans la clé', () => {
		const lines = ['forme: cylindre 2 5', "sommets: O O'"];
		expect(generateEspaceTypst(read(...lines, 'tourner: oui'))).toBe(
			generateEspaceTypst(read(...lines))
		);
	});

	it('un solide rond coupé ou coté à qui l’on donne une vue reste le dessin fixe', () => {
		const cut = read('forme: cylindre 2 5', 'section: perpendiculaire 2').spec as SolideSpec;
		expect(buildSolideScene(cut, from(deg(60)))).toEqual(buildSolideScene(cut));
	});
});

describe('```solide rond — bascule bornée', () => {
	it('polyèdre : la bascule de la cavalière ; solide rond : celle de son ovale à plat', () => {
		expect(solideTilt('pave')).toEqual({ atRest: 0, straight: VUE_DROITE_PITCH });
		expect(solideTilt('cylindre')).toBe(SOLIDE_ROUND_TILT);
		expect(solideTilt('cone')).toBe(SOLIDE_ROUND_TILT);
		expect(solideTilt('boule')).toBe(SOLIDE_ROUND_TILT);
		expect(Math.sin(REST)).toBeCloseTo(0.3, 12);
		expect(SOLIDE_ROUND_TILT.straight).toBe(REST);
	});

	it('s’arrête à la vue de dessus et à la vue de dessous, passage compris', () => {
		for (const oblique of [1, 0.5, 0]) {
			const start = { yaw: 0, pitch: 0, oblique };
			expect(turnVue(start, 0, 10, SOLIDE_ROUND_TILT).pitch + REST).toBeCloseTo(Math.PI / 2, 12);
			expect(turnVue(start, 0, -10, SOLIDE_ROUND_TILT).pitch + REST).toBeCloseTo(-Math.PI / 2, 12);
		}
	});
});

describe('```solide rond — scène tournée', () => {
	it.each(FORMS)('%s : à la vue de départ, le dessin fixe, déplacé en bloc', (...lines) => {
		const s = spec(...lines, 'tourner: oui');
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
		expect(rest.lines.map((l) => [l.dashed, l.thick])).toEqual(
			fixed.lines.map((l) => [l.dashed, l.thick])
		);
		close(rest.dots, fixed.dots);
		close(
			rest.labels.map((l) => l.at),
			fixed.labels.map((l) => l.at)
		);
		expect(rest.labels.map((l) => l.text)).toEqual(fixed.labels.map((l) => l.text));
	});

	it('le dessin fixe d’un bloc avec la clé est celui du bloc sans la clé', () => {
		const lines = ['forme: cone 2 4', 'sommets: S O'];
		expect(buildSolideScene(spec(...lines, 'tourner: oui'))).toEqual(
			buildSolideScene(spec(...lines))
		);
	});

	it.each(FORMS)('%s : cadre fixe, tout le dessin dedans à chaque angle', (...lines) => {
		const s = spec(...lines, 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		expect(rest.width).toBeCloseTo(rest.height, 9);
		for (const vue of [VUE_DE_DEPART, ...GRID]) {
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
		}
	});

	it('tourner à gauche ou à droite ne change rien au dessin (Q5 : accepté)', () => {
		for (const s of [CYLINDRE, CONE, BOULE]) {
			expect(buildSolideScene(s, from(deg(40), 1.2))).toEqual(buildSolideScene(s, from(deg(40))));
		}
	});

	it('le passage à la vraie vue garde les ovales et raccourcit la hauteur d’environ 5 %', () => {
		const k = scaleOf(CYLINDRE);
		const height = (scene: SolideScene) => distance(scene.vertices[0], scene.vertices[1]);
		const rest = buildSolideScene(CYLINDRE, VUE_DE_DEPART);
		const droite = buildSolideScene(CYLINDRE, { ...VUE_DE_DEPART, oblique: 0 });
		expect(height(rest)).toBeCloseTo(5 * k, 9);
		expect(height(droite)).toBeCloseTo(5 * k * Math.cos(REST), 9);
		expect(height(droite) / height(rest)).toBeGreaterThan(0.95);
		// Les ovales : toujours 0,3 fois plus hauts que larges
		for (const scene of [rest, droite]) {
			const top = scene.vertices[1];
			const ys = scene.lines.flatMap((l) => l.points).map((p) => top.y - p.y);
			expect(Math.max(...ys)).toBeCloseTo(0.3 * 2 * k, 9);
		}
	});
});

describe('cylindre qui tourne (comportements 18 et 19)', () => {
	const k = scaleOf(CYLINDRE);

	it('vu de dessus : un seul cercle, du rayon du cylindre', () => {
		const scene = buildSolideScene(CYLINDRE, from(deg(90)));
		const c = pivot(scene);
		for (const line of curves(scene)) {
			for (const p of line.points) expect(distance(p, c)).toBeCloseTo(2 * k, 9);
		}
		expect(distance(scene.vertices[0], scene.vertices[1])).toBeCloseTo(0, 9);
	});

	it('de profil : un rectangle (diamètre × hauteur)', () => {
		const scene = buildSolideScene(CYLINDRE, from(0));
		const c = pivot(scene);
		const points = scene.lines.flatMap((l) => l.points);
		expect(Math.max(...points.map((p) => Math.abs(p.x - c.x)))).toBeCloseTo(2 * k, 9);
		for (const p of points) expect(Math.abs(Math.abs(p.y - c.y) - 2.5 * k)).toBeLessThan(1e-9);
	});

	it('vu de dessus : la moitié arrière du cercle du bas en tirets, rien d’autre', () => {
		const scene = buildSolideScene(CYLINDRE, from(deg(50)));
		const dashed = scene.lines.filter((l) => l.dashed);
		expect(dashed).toHaveLength(1);
		const bottom = scene.vertices[0];
		// Écran : y vers le bas ; le fond du cercle du bas est AU-DESSUS de son centre
		for (const p of dashed[0].points) expect(p.y).toBeLessThanOrEqual(bottom.y + 1e-9);
		expect(Math.min(...dashed[0].points.map((p) => p.y))).toBeCloseTo(
			bottom.y - 2 * k * Math.sin(deg(50)),
			9
		);
	});

	it('vu de dessous : la moitié arrière du cercle du haut en tirets, rien d’autre', () => {
		const scene = buildSolideScene(CYLINDRE, from(deg(-50)));
		const dashed = scene.lines.filter((l) => l.dashed);
		expect(dashed).toHaveLength(1);
		const top = scene.vertices[1];
		// Vu de dessous, le fond du cercle du haut est SOUS son centre
		for (const p of dashed[0].points) expect(p.y).toBeGreaterThanOrEqual(top.y - 1e-9);
		expect(Math.max(...dashed[0].points.map((p) => p.y))).toBeCloseTo(
			top.y + 2 * k * Math.sin(deg(50)),
			9
		);
	});

	it('le haut reste en haut, vu de dessus comme de dessous', () => {
		for (const elevation of [-80, -30, 30, 80]) {
			const scene = buildSolideScene(CYLINDRE, from(deg(elevation)));
			expect(scene.vertices[1].y).toBeLessThan(scene.vertices[0].y);
			expect(distance(scene.vertices[0], scene.vertices[1])).toBeCloseTo(
				5 * k * Math.cos(deg(elevation)),
				9
			);
		}
	});

	it('les deux traits des côtés joignent les deux ovales, à un rayon de l’axe', () => {
		const scene = buildSolideScene(CYLINDRE, from(deg(35)));
		const sides = scene.lines.filter(straight);
		expect(sides).toHaveLength(2);
		const [bottom, top] = scene.vertices;
		for (const side of sides) {
			expect(side.dashed).toBe(false);
			const ys = side.points.map((p) => p.y).sort((a, b) => a - b);
			expect(ys[0]).toBeCloseTo(top.y, 9);
			expect(ys[1]).toBeCloseTo(bottom.y, 9);
			for (const p of side.points) expect(Math.abs(p.x - top.x)).toBeCloseTo(2 * k, 9);
		}
	});

	it('cachees: non : tout en trait plein à chaque angle', () => {
		const s = spec('forme: cylindre 2 5', 'cachees: non', 'tourner: oui');
		for (const vue of GRID) {
			expect(buildSolideScene(s, vue).lines.every((l) => !l.dashed)).toBe(true);
		}
	});
});

describe('cône qui tourne (comportement 20, Q6)', () => {
	const k = scaleOf(CONE);

	it('les deux traits partent du sommet et touchent l’ovale sans le couper', () => {
		for (const elevation of [-40, -10, 10, 30, 50]) {
			const scene = buildSolideScene(CONE, from(deg(elevation)));
			const [apex, center] = scene.vertices;
			const sides = scene.lines.filter(straight);
			expect(sides).toHaveLength(2);
			const oval = curves(scene).flatMap((l) => l.points);
			for (const side of sides) {
				expect(side.dashed).toBe(false);
				const foot = side.points.find((p) => distance(p, apex) > 1e-9) as Point;
				expect(side.points.some((p) => distance(p, apex) < 1e-9)).toBe(true);
				// Le pied est sur l'ovale
				const u = (foot.x - center.x) / (2 * k);
				const v = (foot.y - center.y) / (2 * k * Math.sin(deg(Math.abs(elevation))));
				expect(u * u + v * v).toBeCloseTo(1, 9);
				// Tangent : tout l'ovale est du même côté du trait
				const cross = oval.map(
					(p) => (foot.x - apex.x) * (p.y - apex.y) - (foot.y - apex.y) * (p.x - apex.x)
				);
				const side0 = Math.sign(cross.find((c) => Math.abs(c) > 1e-6) ?? 0);
				for (const c of cross) expect(c * side0).toBeGreaterThanOrEqual(-1e-9);
			}
		}
	});

	it('vu d’assez haut, le sommet tombe dans l’ovale : plus de traits, l’ovale entier en trait plein', () => {
		// Cône 2 × 4 : le sommet entre dans l'ovale quand tan(inclinaison) dépasse 4 / 2
		for (const elevation of [65, 80, 90]) {
			const scene = buildSolideScene(CONE, from(deg(elevation)));
			expect(scene.lines.filter(straight)).toHaveLength(0);
			expect(scene.lines.every((l) => !l.dashed)).toBe(true);
			const [apex, center] = scene.vertices;
			const u = (apex.x - center.x) / (2 * k);
			const v = (apex.y - center.y) / (2 * k * Math.sin(deg(elevation)));
			expect(u * u + v * v).toBeLessThan(1);
			// Le sommet NOMMÉ garde un point (son nom flotterait), comme le centre nommé
			expect(scene.dots).toHaveLength(2);
			expect(scene.dots.some((d) => distance(d, apex) < 1e-9)).toBe(true);
			// Q6 : sans nom, aucun point ajouté au sommet
			const bare = spec('forme: cone 2 4', 'tourner: oui');
			expect(buildSolideScene(bare, from(deg(elevation))).dots).toHaveLength(0);
		}
		// Tant que les deux traits montrent le sommet : pas de point, comme sur le dessin fixe
		expect(buildSolideScene(CONE, from(deg(60))).dots).toHaveLength(1);
		expect(buildSolideScene(CONE, from(deg(60))).lines.filter(straight)).toHaveLength(2);
	});

	it('vu de dessus : l’arc du fond, entre les deux traits, en tirets', () => {
		const scene = buildSolideScene(CONE, from(deg(40)));
		const dashed = scene.lines.filter((l) => l.dashed);
		expect(dashed).toHaveLength(1);
		const [apex, center] = scene.vertices;
		for (const p of dashed[0].points) expect(p.y).toBeLessThan(center.y);
		// Pas toute la moitié arrière : l'arc s'arrête aux pieds des deux traits
		const feet = scene.lines
			.filter(straight)
			.map((l) => l.points.find((p) => distance(p, apex) > 1e-9) as Point);
		const ends = [dashed[0].points[0], dashed[0].points[dashed[0].points.length - 1]];
		for (const end of ends) {
			expect(Math.min(...feet.map((f) => distance(f, end)))).toBeCloseTo(0, 9);
		}
		expect(distance(ends[0], ends[1])).toBeGreaterThan(0.5);
	});

	it('vu de dessous : le disque de base entier en trait plein', () => {
		for (const elevation of [-20, -50, -75, -90]) {
			const scene = buildSolideScene(CONE, from(deg(elevation)));
			expect(scene.lines.every((l) => !l.dashed)).toBe(true);
		}
	});

	it('vu de dessus à la verticale : un cercle, sommet et centre confondus', () => {
		const scene = buildSolideScene(CONE, from(deg(90)));
		const [apex, center] = scene.vertices;
		expect(distance(apex, center)).toBeCloseTo(0, 9);
		for (const p of scene.lines.flatMap((l) => l.points)) {
			expect(distance(p, center)).toBeCloseTo(2 * k, 9);
		}
	});

	it('cône très plat : les traits disparaissent dès que l’on bascule un peu (comportement 25)', () => {
		const flat = spec('forme: cone 4 2.1', 'tourner: oui');
		expect(buildSolideScene(flat, VUE_DE_DEPART).lines.filter(straight)).toHaveLength(2);
		expect(buildSolideScene(flat, from(deg(35))).lines.filter(straight)).toHaveLength(0);
	});
});

describe('boule qui tourne (comportement 21)', () => {
	const k = scaleOf(BOULE);

	it('le contour reste un cercle sous tous les angles', () => {
		for (const vue of GRID) {
			const scene = buildSolideScene(BOULE, vue);
			const c = pivot(scene);
			expect(distance(scene.vertices[0], c)).toBeCloseTo(0, 9);
			const far = scene.lines.flatMap((l) => l.points).map((p) => distance(p, c));
			expect(Math.max(...far)).toBeCloseTo(3 * k, 9);
			expect(
				scene.lines.some((l) => l.points.every((p) => Math.abs(distance(p, c) - 3 * k) < 1e-9))
			).toBe(true);
		}
	});

	it('l’équateur s’ouvre quand on bascule ; sa moitié arrière en tirets', () => {
		const opening = (elevation: number) => {
			const scene = buildSolideScene(BOULE, from(deg(elevation)));
			const c = pivot(scene);
			const dashed = scene.lines.filter((l) => l.dashed);
			expect(dashed).toHaveLength(1);
			// Vu de dessus, le fond de l'équateur est au-dessus du centre ; de dessous, en dessous
			for (const p of dashed[0].points) {
				expect((c.y - p.y) * Math.sign(elevation)).toBeGreaterThanOrEqual(-1e-9);
			}
			return Math.max(...dashed[0].points.map((p) => Math.abs(p.y - c.y)));
		};
		expect(opening(20)).toBeCloseTo(3 * k * Math.sin(deg(20)), 9);
		expect(opening(60)).toBeCloseTo(3 * k * Math.sin(deg(60)), 9);
		expect(opening(-60)).toBeCloseTo(3 * k * Math.sin(deg(60)), 9);
	});

	it('vu de dessus : l’équateur se confond avec le contour', () => {
		const scene = buildSolideScene(BOULE, from(deg(90)));
		const c = pivot(scene);
		for (const p of scene.lines.flatMap((l) => l.points)) {
			expect(distance(p, c)).toBeCloseTo(3 * k, 9);
		}
	});
});

describe('```solide rond — noms (comportement 22)', () => {
	it('les noms des centres et du sommet suivent, un point sur chaque centre nommé', () => {
		for (const elevation of [-70, -20, 45, 80]) {
			const cone = buildSolideScene(CONE, from(deg(elevation)));
			expect(cone.labels.map((l) => l.text)).toEqual(['S', 'O']);
			expect(cone.dots).toHaveLength(Math.abs(elevation) > 64 ? 2 : 1);
			const cylindre = buildSolideScene(CYLINDRE, from(deg(elevation)));
			expect(cylindre.labels.map((l) => l.text)).toEqual(['O', "O'"]);
			expect(cylindre.dots).toHaveLength(2);
			expect(cylindre.labelOffsets).toHaveLength(2);
		}
	});

	it('places tenues : chaque nom garde sa place par rapport à son point', () => {
		const held = buildSolideScene(CONE, VUE_DE_DEPART).labelOffsets as Point[];
		expect(held).toHaveLength(2);
		for (const elevation of [-60, 10, 70, 90]) {
			const scene = buildSolideScene(CONE, from(deg(elevation)), held);
			scene.labels.forEach((label, i) => {
				expect(label.at.x - scene.vertices[i].x).toBeCloseTo(held[i].x, 9);
				expect(label.at.y - scene.vertices[i].y).toBeCloseTo(held[i].y, 9);
			});
			for (const p of drawn(scene)) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
			}
		}
	});

	it('dessin fixe : aucune place de nom rendue (scène inchangée)', () => {
		expect(buildSolideScene(CONE)).not.toHaveProperty('labelOffsets');
	});
});
