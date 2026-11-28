/**
 * Bloc ```solide : point d'intersection demandé par l'auteur
 * (`points: K intersection (IG) (BDE)`) — chantier `solides-3d`, lot 7e
 * (comportements 84 à 98 du journal)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { EspaceNode, SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	labelBox,
	solideLabel,
	solidePoints3,
	type Point3
} from '#lib/ubumark/utils/espace-solides.ts';
import { turnVue, VUE_DE_DEPART, type EspaceVue } from '#lib/ubumark/utils/espace-vue.ts';

// Cube : A 0, B 1, C 2, D 3, E 4, F 5, G 6, H 7 ; les points déclarés à partir de 8
const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];
const REPERE = 'repere: A ; AB, AD, AE';
const PYRAMIDE = ['forme: pyramide carree 4 3', 'sommets: S A B C D'];
const K_IG_BDE = 'points: I milieu AE, K intersection (IG) (BDE)';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors;
const scene = (...lines: string[]) => buildSolideScene(spec(...lines));
const at3 = (s: SolideSpec) => solidePoints3(s.form, s.dims, s.points);

const close = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;
const close3 = (p: Point3, q: Point3) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-9;
/** A + x AB + y AD + z AE : le point de coordonnées (x ; y ; z) dans le repère du cube */
const inCube3 = (at: Point3[], [x, y, z]: number[]): Point3 => {
	const along = (pick: (p: Point3) => number) =>
		pick(at[0]) +
		x * (pick(at[1]) - pick(at[0])) +
		y * (pick(at[3]) - pick(at[0])) +
		z * (pick(at[4]) - pick(at[0]));
	return { x: along((p) => p.x), y: along((p) => p.y), z: along((p) => p.z) };
};
const inCube2 = (v: EspacePoint[], [x, y, z]: number[]): EspacePoint => {
	const along = (pick: (p: EspacePoint) => number) =>
		pick(v[0]) +
		x * (pick(v[1]) - pick(v[0])) +
		y * (pick(v[3]) - pick(v[0])) +
		z * (pick(v[4]) - pick(v[0]));
	return { x: along((p) => p.x), y: along((p) => p.y) };
};

const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);
const GRID: EspaceVue[] = [VUE_DE_DEPART, { ...VUE_DE_DEPART, oblique: 0.5 }];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -100; pitch <= 100; pitch += 25) {
		GRID.push(turned((yaw * Math.PI) / 180, (pitch * Math.PI) / 180));
	}
}

describe('```solide — points: K intersection (lecture)', () => {
	it('sans intersection : un point déclaré reste celui d’aujourd’hui (comportement 93)', () => {
		expect(spec(...CUBE, 'points: I milieu AE').points[0]).toEqual({
			name: 'I',
			of: [0, 4],
			label: 'milieu de [AE]'
		});
	});

	it('droite et plan : le point où la droite perce le plan (comportement 84)', () => {
		const s = spec(...CUBE, K_IG_BDE);
		expect(s.points[1]).toEqual({
			name: 'K',
			of: [],
			label: 'intersection de la droite (IG) et du plan (BDE)',
			meet: { line: [8, 6], other: [1, 3, 4] }
		});
		// I (0 ; 0 ; 0,5), G (1 ; 1 ; 1), plan x + y + z = 1 : K (0,2 ; 0,2 ; 0,6)
		const at = at3(s);
		expect(close3(at[9], inCube3(at, [0.2, 0.2, 0.6]))).toBe(true);
	});

	it('le plan d’abord, la droite ensuite : le même point', () => {
		const s = spec(...CUBE, 'points: I milieu AE, K intersection (BDE) (IG)');
		expect(s.points[1].meet).toEqual({ line: [8, 6], other: [1, 3, 4] });
		expect(s.points[1].label).toBe('intersection de la droite (IG) et du plan (BDE)');
	});

	it('deux droites : le point où elles se croisent (comportement 85)', () => {
		const s = spec(...CUBE, 'points: K intersection (AG) (BH)');
		expect(s.points[0]).toEqual({
			name: 'K',
			of: [],
			label: 'intersection des droites (AG) et (BH)',
			meet: { line: [0, 6], other: [1, 7] }
		});
		const at = at3(s);
		expect(close3(at[8], inCube3(at, [0.5, 0.5, 0.5]))).toBe(true);
	});

	it('deux droites qui se croisent hors de leurs deux points', () => {
		// (AC) et (BD) : le centre de la base ; (EI) avec I milieu de [AB] et (FB)… se croisent en bas
		const s = spec(...PYRAMIDE, 'points: O intersection (AC) (BD)');
		const at = at3(s);
		expect(
			close3(at[5], {
				x: (at[1].x + at[3].x) / 2,
				y: (at[1].y + at[3].y) / 2,
				z: (at[1].z + at[3].z) / 2
			})
		).toBe(true);
	});

	it('le point sert comme un autre : milieu, vecteur, droite, plan (comportement 86)', () => {
		const s = spec(
			...CUBE,
			'points: I milieu AE, K intersection (IG) (BDE), J milieu AK',
			'vecteurs: u = AK',
			'droites: (DK)',
			'plans: (ABK)'
		);
		expect(s.points[2].of).toEqual([0, 9]);
		expect(s.vectors[0]).toEqual({ from: 0, to: 9, name: 'u' });
		expect(s.droites?.[0]).toMatchObject({ from: 3, to: 9 });
		expect(s.plans?.[0].through).toEqual([0, 1, 9]);
		const at = at3(s);
		expect(close3(at[10], inCube3(at, [0.1, 0.1, 0.3]))).toBe(true);
	});

	it('une intersection d’intersections', () => {
		const s = spec(...CUBE, 'points: O intersection (AG) (BH), L intersection (EO) (ABC)');
		const at = at3(s);
		// E (0 ; 0 ; 1) vers O (0,5 ; 0,5 ; 0,5) : touche le bas en C (1 ; 1 ; 0)
		expect(close3(at[9], at[2])).toBe(true);
	});

	it('sur un sommet : accepté, deux noms au même endroit (comportement 90)', () => {
		const s = spec(...CUBE, 'points: K intersection (AG) (ABC)');
		const at = at3(s);
		expect(close3(at[8], at[0])).toBe(true);
	});

	it('hors du solide mais dans la marge : accepté (question (c))', () => {
		// I (0 ; 0 ; 0,5) vers M (−0,05 ; 0 ; 0,75) : perce le dessus en (−0,1 ; 0 ; 1)
		const s = spec(
			...CUBE,
			REPERE,
			'points: I milieu AE, M (-0,05 ; 0 ; 0,75), K intersection (IM) (EFG)'
		);
		const at = at3(s);
		expect(close3(at[10], inCube3(at, [-0.1, 0, 1]))).toBe(true);
	});

	it('avec un point à coordonnées', () => {
		const s = spec(...CUBE, REPERE, 'points: M (1 ; 0,5 ; 1), K intersection (AM) (BDE)');
		const at = at3(s);
		expect(close3(at[9], inCube3(at, [0.4, 0.2, 0.4]))).toBe(true);
	});

	it('le repère peut s’appuyer sur un point d’intersection déclaré avant les coordonnées', () => {
		const s = spec(
			...CUBE,
			'points: O intersection (AG) (BH), M (0,5 ; 0,5 ; 0)',
			'repere: O ; OA, OB, OE'
		);
		expect(s.repere).toEqual({ origin: 8, axes: [0, 1, 4] });
	});

	it('erreur : droite parallèle au plan, ou dans le plan (comportement 94)', () => {
		const parallel = errors(...CUBE, 'points: K intersection (EG) (ABC)');
		expect(parallel).toHaveLength(1);
		expect(parallel[0]).toContain('(EG) et (ABC) ne se coupent pas en un seul point');
		expect(parallel[0]).toContain('parallèle');
		const within = errors(...CUBE, 'points: K intersection (AC) (ABD)');
		expect(within).toHaveLength(1);
		expect(within[0]).toContain('(AC) et (ABD) ne se coupent pas en un seul point');
		expect(within[0]).toContain('dans le plan');
	});

	it('erreur : deux droites parallèles, confondues, non coplanaires (comportement 95)', () => {
		expect(errors(...CUBE, 'points: K intersection (AB) (HG)')[0]).toContain('parallèles');
		expect(errors(...CUBE, 'points: I milieu AG, K intersection (AG) (IA)')[0]).toContain(
			'même droite'
		);
		const skew = errors(...CUBE, 'points: K intersection (AB) (FG)');
		expect(skew).toHaveLength(1);
		expect(skew[0]).toContain('(AB) et (FG) ne se coupent pas');
		expect(skew[0]).toContain('même plan');
	});

	it('erreur : deux plans — leur intersection est une droite (question (a))', () => {
		expect(errors(...CUBE, 'points: K intersection (BDE) (ACG)')[0]).toContain('deux plans');
	});

	it('erreurs : point inconnu, points confondus ou alignés, nom déjà pris (comportement 96)', () => {
		expect(errors(...CUBE, 'points: K intersection (ZG) (BDE)')[0]).toContain(
			'aucun point ne s’appelle Z'
		);
		expect(errors(...CUBE, 'points: K intersection (IG) (BDE)')[0]).toContain(
			'aucun point ne s’appelle I'
		);
		// Les points se déclarent avant (comportement 91)
		expect(errors(...CUBE, 'points: K intersection (IG) (BDE), I milieu AE')[0]).toContain(
			'aucun point ne s’appelle I'
		);
		expect(errors(...CUBE, 'points: K intersection (KG) (BDE)')[0]).toContain(
			'aucun point ne s’appelle K'
		);
		expect(errors(...CUBE, 'points: K intersection (AA) (BDE)')[0]).toContain(
			'deux points distincts'
		);
		expect(errors(...CUBE, 'points: I milieu AE, K intersection (BG) (AIE)')[0]).toContain(
			'alignés'
		);
		expect(errors(...CUBE, 'points: G intersection (AG) (BH)')[0]).toContain(
			'déjà le nom d’un sommet'
		);
		expect(
			errors(...CUBE, 'points: K intersection (AG) (BH), K intersection (AG) (BDE)')[0]
		).toContain('deux fois');
	});

	it('erreurs : écriture non comprise', () => {
		for (const written of [
			'K intersection',
			'K intersection (IG)',
			'K intersection IG BDE',
			'K intersection (AG) (BH) (CE)',
			'K intersection (A) (BDE)',
			'K intersection (ABCD) (EG)',
			'K intersection (AG (BDE)'
		]) {
			const found = errors(...CUBE, `points: ${written}`);
			expect(found, written).toHaveLength(1);
			expect(found[0], written).toContain('ex. K intersection (IG) (BDE)');
		}
	});

	it('erreur : le point tombe hors de la figure (comportement 97)', () => {
		// (IG) perce le plan du bas en (−1 ; −1 ; 0), loin du cube
		const found = errors(...CUBE, 'points: I milieu AE, K intersection (IG) (ABC)');
		expect(found).toHaveLength(1);
		expect(found[0]).toContain('hors de la figure');
	});

	it('erreurs : solide rond, section: ou tracer: dans le bloc (comportement 98)', () => {
		expect(
			errors('forme: cylindre 2 4', "sommets: O O'", "points: K intersection (OO') (OO')")[0]
		).toContain('polyèdres seulement');
		expect(
			errors(...CUBE, 'points: K intersection (AG) (BH)', 'section: parallele ABCD 1')[0]
		).toContain('intersection ne va pas encore avec section:');
		expect(
			errors(...CUBE, 'points: K intersection (AG) (BH)', 'tracer: vecteur AB + AD')[0]
		).toContain('intersection ne va pas encore avec tracer:');
		// Sans intersection, points: va toujours avec tracer:
		expect(errors(...CUBE, 'points: I milieu AE', 'tracer: vecteur AB + AD')).toEqual([]);
	});

	it('au plus 8 points, intersections comprises (comportement 91)', () => {
		const many = Array.from({ length: 9 }, (_, i) => `K${i + 1} intersection (AG) (BH)`).join(', ');
		expect(errors(...CUBE, `points: ${many}`)[0]).toContain('au plus 8 points');
	});
});

describe('```solide — points: K intersection (scène)', () => {
	it('un disque et son nom, à sa place, sans dessiner ni la droite ni le plan (comportements 87, 89)', () => {
		const s = scene(...CUBE, K_IG_BDE);
		const expected = inCube2(s.vertices, [0.2, 0.2, 0.6]);
		expect(close(s.points[1], expected)).toBe(true);
		expect(s.dots.some((d) => close(d, expected))).toBe(true);
		expect(s.labels.some((l) => l.text === 'K')).toBe(true);
		expect(s.droites ?? []).toEqual([]);
		expect(s.plans ?? []).toEqual([]);
	});

	it('le point ne change ni le cadre, ni les arêtes', () => {
		const without = scene(...CUBE, 'points: I milieu AE');
		const withK = scene(...CUBE, K_IG_BDE);
		expect(withK.width).toBe(without.width);
		expect(withK.height).toBe(without.height);
		expect(withK.lines).toEqual(without.lines);
	});

	it('tourner: oui — sous tous les angles, le point suit, dans le cadre (comportement 88)', () => {
		const s = spec(...CUBE, K_IG_BDE, 'droites: (IG)', 'plans: (BDE)', 'tourner: oui');
		const sizes = new Set<string>();
		for (const vue of GRID) {
			const at = buildSolideScene(s, vue);
			expect(close(at.points[1], inCube2(at.vertices, [0.2, 0.2, 0.6]))).toBe(true);
			for (const p of [...at.points, ...at.labels.flatMap(labelBox)]) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(at.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(at.height + 1e-9);
			}
			if (vue.oblique === 0) sizes.add(`${at.width.toFixed(6)} ${at.height.toFixed(6)}`);
		}
		expect(sizes.size).toBe(1);
	});
});

describe('```solide — points: K intersection (nom accessible, PDF)', () => {
	it('lecteur d’écran : le point et ce qui se coupe (comportement 92)', () => {
		expect(solideLabel(spec(...CUBE, K_IG_BDE))).toContain(
			'point K intersection de la droite (IG) et du plan (BDE)'
		);
		expect(solideLabel(spec(...CUBE, 'points: K intersection (AG) (BH)'))).toContain(
			'point K intersection des droites (AG) et (BH)'
		);
	});

	it('PDF : le point est dessiné, là où un point déclaré autrement le serait', () => {
		const without = generateEspaceTypst(read(...CUBE) as EspaceNode);
		const typst = generateEspaceTypst(
			read(...CUBE, 'points: K intersection (AG) (BH)') as EspaceNode
		);
		const same = generateEspaceTypst(read(...CUBE, 'points: K centre ABCDEFGH') as EspaceNode);
		expect(typst).not.toBe(without);
		expect(typst).toBe(same);
	});
});
