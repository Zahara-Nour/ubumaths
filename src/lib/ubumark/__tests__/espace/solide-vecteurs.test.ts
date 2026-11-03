/**
 * Bloc ```solide : points déclarés (`points:`) et vecteurs donnés (`vecteurs:`)
 * — chantier `solide-vecteur`, lot 1 (D-SV : Q1 points déclarés, Q3 `vecteurs:`)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { SolideSpec } from '$lib/ubumark/types/espace';
import { buildSolideScene, solideLabel } from '$lib/ubumark/utils/espace-solides';

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors;
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const samePoint = (p: { x: number; y: number }, q: { x: number; y: number }) =>
	near(p.x, q.x) && near(p.y, q.y);

describe('```solide — points:', () => {
	it('sans points: ni vecteurs: : listes vides', () => {
		const s = spec(...CUBE);
		expect(s.points).toEqual([]);
		expect(s.vectors).toEqual([]);
	});

	it('milieu d’un segment, centre d’une face (sommets dans l’ordre du tour)', () => {
		const s = spec(...CUBE, 'points: I milieu AE, O centre ACBD');
		expect(s.points).toEqual([
			{ name: 'I', of: [0, 4], label: 'milieu de [AE]' },
			{ name: 'O', of: [0, 1, 2, 3], label: 'centre de ABCD' }
		]);
	});

	it('milieu entre crochets ; milieu d’un point déjà déclaré ; centre du cube', () => {
		expect(spec(...CUBE, 'points: I milieu [AE]').points[0].of).toEqual([0, 4]);
		// I est le point n° 8 (après les 8 sommets)
		expect(spec(...CUBE, 'points: I milieu AE, J milieu IG').points[1].of).toEqual([8, 6]);
		expect(spec(...CUBE, 'points: O centre ABCDEFGH').points[0]).toEqual({
			name: 'O',
			of: [0, 1, 2, 3, 4, 5, 6, 7],
			label: 'centre du cube'
		});
	});

	it('tétraèdre : centre d’une face triangulaire', () => {
		const s = spec('forme: pyramide triangle 4 3', 'sommets: S A B C', 'points: G centre ABC');
		expect(s.points[0].of).toEqual([1, 2, 3]);
	});

	it('erreurs : sans sommets:, nom inconnu, nom pris, deux fois, mal écrit', () => {
		expect(errors('forme: cube 2', 'points: I milieu AE')[0]).toMatch(/nomme les sommets/);
		expect(errors(...CUBE, 'points: I milieu AZ')[0]).toMatch(/aucun point ne s’appelle Z/);
		expect(errors(...CUBE, 'points: A milieu BC')[0]).toMatch(/« A » est déjà le nom d’un sommet/);
		expect(errors(...CUBE, 'points: I milieu AE, I milieu BF')[0]).toMatch(/« I » deux fois/);
		expect(errors(...CUBE, 'points: i milieu AE')[0]).toMatch(/un nom de point est une majuscule/);
	});

	it('erreurs : milieu d’un seul point ou d’un point avec lui-même, centre hors face, mot inconnu', () => {
		expect(errors(...CUBE, 'points: I milieu A')[0]).toMatch(/milieu de deux points/);
		expect(errors(...CUBE, 'points: I milieu AA')[0]).toMatch(/milieu de deux points distincts/);
		expect(errors(...CUBE, 'points: O centre ABC')[0]).toMatch(/ABC n’est pas une face du cube/);
		expect(errors(...CUBE, 'points: I sur AE')[0]).toMatch(/milieu AE.*centre ABCD/);
		expect(
			errors('forme: pyramide carree 4 3', 'sommets: S A B C D', 'points: O centre SABCD')[0]
		).toMatch(/n’est pas une face/);
	});

	it('erreurs : un point deux fois dans un centre ou un milieu ; milieu sans points', () => {
		expect(errors(...CUBE, 'points: O centre ABCDEFGA')[0]).toMatch(/« A » deux fois/);
		expect(errors(...CUBE, 'points: O centre ABCA')[0]).toMatch(/« A » deux fois/);
		expect(errors(...CUBE, 'points: I milieu')[0]).toMatch(/milieu de quels points/);
	});

	it('erreurs : solide rond, trop de points', () => {
		expect(errors('forme: cylindre 2 5', "sommets: O O'", 'points: I milieu OO')[0]).toMatch(
			/polyèdres seulement/
		);
		const many =
			'points: ' +
			'IJKLMNPQR'
				.split('')
				.map((n) => `${n} milieu AB`)
				.join(', ');
		expect(errors(...CUBE, many)[0]).toMatch(/au plus 8 points/);
	});
});

describe('```solide — vecteurs:', () => {
	it('vecteurs entre points nommés, nommés ou non', () => {
		const s = spec(...CUBE, 'vecteurs: AB, AE, u = AD');
		expect(s.vectors).toEqual([
			{ from: 0, to: 1, name: null },
			{ from: 0, to: 4, name: null },
			{ from: 0, to: 3, name: 'u' }
		]);
	});

	it('vers un point déclaré ; nom avec chiffre', () => {
		const s = spec(...CUBE, 'points: I milieu EF', 'vecteurs: AI, u1 = IG');
		expect(s.vectors).toEqual([
			{ from: 0, to: 8, name: null },
			{ from: 8, to: 6, name: 'u1' }
		]);
	});

	it('erreurs : point inconnu, vecteur nul, pas deux points, nom mal écrit ou pris deux fois', () => {
		expect(errors(...CUBE, 'vecteurs: AZ')[0]).toMatch(/aucun point ne s’appelle Z/);
		expect(errors(...CUBE, 'vecteurs: AA')[0]).toMatch(/vecteur nul/);
		expect(errors(...CUBE, 'vecteurs: ABC')[0]).toMatch(/deux points/);
		expect(errors(...CUBE, 'vecteurs: U = AB')[0]).toMatch(/une minuscule/);
		expect(errors(...CUBE, 'vecteurs: u = AB, u = AE')[0]).toMatch(/« u » deux fois/);
	});

	it('erreurs : vecteur nul par la position (milieu confondu), solide rond, sans sommets:', () => {
		expect(errors(...CUBE, 'points: I milieu AG, J milieu BH', 'vecteurs: IJ')[0]).toMatch(
			/vecteur nul/
		);
		expect(errors('forme: cone 2 4', 'sommets: S O', 'vecteurs: SO')[0]).toMatch(
			/polyèdres seulement/
		);
		expect(errors('forme: cube 2', 'vecteurs: AB')[0]).toMatch(/nomme les sommets/);
	});

	it('trop de vecteurs', () => {
		const many = 'vecteurs: AB, AC, AD, AE, AF, AG, AH, BC, BD';
		expect(errors(...CUBE, many)[0]).toMatch(/au plus 8 vecteurs/);
	});
});

describe('```solide — scène des points et des vecteurs', () => {
	it('un point déclaré : un disque au milieu, son nom', () => {
		const s = buildSolideScene(spec(...CUBE, 'points: I milieu AE'));
		const [a, e] = [s.vertices[0], s.vertices[4]];
		expect(s.points).toHaveLength(1);
		expect(samePoint(s.points[0], { x: (a.x + e.x) / 2, y: (a.y + e.y) / 2 })).toBe(true);
		expect(s.dots.some((d) => samePoint(d, s.points[0]))).toBe(true);
		expect(s.labels.some((l) => l.text === 'I')).toBe(true);
	});

	it('centre d’une face : le centre du parallélogramme dessiné', () => {
		const s = buildSolideScene(spec(...CUBE, 'points: O centre ABCD'));
		const [a, c] = [s.vertices[0], s.vertices[2]];
		expect(samePoint(s.points[0], { x: (a.x + c.x) / 2, y: (a.y + c.y) / 2 })).toBe(true);
	});

	it('une flèche par vecteur, pointe sur l’extrémité', () => {
		const s = buildSolideScene(spec(...CUBE, 'vecteurs: AB, AG'));
		expect(s.arrows).toHaveLength(2);
		const [ab, ag] = s.arrows;
		expect(samePoint(ab.shaft[0], s.vertices[0])).toBe(true);
		expect(samePoint(ab.head[0], s.vertices[1])).toBe(true);
		expect(samePoint(ag.head[0], s.vertices[6])).toBe(true);
		// Le trait s'arrête au pied de la pointe
		expect(samePoint(ab.shaft[1], s.vertices[1])).toBe(false);
		expect(ab.small).toBe(false);
	});

	it('vecteur nommé : la lettre près du milieu de la flèche, une petite flèche au-dessus', () => {
		const s = buildSolideScene(spec(...CUBE, 'vecteurs: u = AB'));
		const u = s.labels.find((l) => l.text === 'u');
		expect(u).toBeDefined();
		const small = s.arrows.filter((a) => a.small);
		expect(small).toHaveLength(1);
		// Au-dessus de la lettre (y vers le bas), dans le sens de la lecture
		expect(small[0].head[0].y).toBeLessThan(u!.at.y);
		expect(small[0].head[0].x).toBeGreaterThan(small[0].shaft[0].x);
		// Ni la lettre ni sa flèche ne touchent le nom d'un sommet
		const a = s.labels.find((l) => l.text === 'A')!;
		expect(Math.hypot(u!.at.x - a.at.x, u!.at.y - a.at.y)).toBeGreaterThan(0.3);
	});

	it('tout dans la boîte, flèches comprises', () => {
		const s = buildSolideScene(spec(...CUBE, 'vecteurs: u = AB, v = EH'));
		for (const arrow of s.arrows) {
			for (const p of [...arrow.shaft, ...arrow.head]) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(s.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(s.height + 1e-9);
			}
		}
	});

	it('nom accessible : les points et les vecteurs donnés (ils sont dans l’énoncé)', () => {
		const label = solideLabel(spec(...CUBE, 'points: I milieu AE', 'vecteurs: AB, u = AI'));
		expect(label).toContain('point I milieu de [AE]');
		expect(label).toContain('vecteur AB');
		expect(label).toContain('vecteur u égal à AI');
	});
});

describe('```solide — points et vecteurs au PDF', () => {
	it('une pointe (polygone noir) par flèche, un disque par point', () => {
		const out = generateEspaceTypst(read(...CUBE, 'points: I milieu AE', 'vecteurs: AB, u = AI'));
		// 3 flèches (AB, AI, petite flèche de u) : 3 pointes
		expect(out.split('polygon(fill: black').length - 1).toBe(3);
		expect(out.split('circle(').length - 1).toBe(1);
		expect(out).toContain('"u"');
		expect(out).toContain('"I"');
	});
});
