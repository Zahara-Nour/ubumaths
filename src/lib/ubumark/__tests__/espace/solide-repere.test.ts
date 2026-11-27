/**
 * Bloc ```solide : repère du solide (`repere:`) et points par coordonnées
 * (`points: M (1 ; 0,5 ; 1)`) — chantier `solides-3d`, lot 7c (comportements
 * 71, 73, 78, 79, 81 à 83 du journal)
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

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];
const REPERE = 'repere: A ; AB, AD, AE';
const PAVE = ['forme: pave 4 2 3', 'sommets: A B C D E F G H'];
const PYRAMIDE = ['forme: pyramide carree 4 3', 'sommets: S A B C D'];

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors;
const scene = (...lines: string[]) => buildSolideScene(spec(...lines));
/** Les points nommables du bloc, en 3D : sommets, puis points déclarés */
const at3 = (s: SolideSpec) => solidePoints3(s.form, s.dims, s.points);

const close = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;
const close3 = (p: Point3, q: Point3) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-9;
/** O + x (I − O) + y (J − O) + z (K − O), dans le plan du dessin ou dans l'espace */
function combine(o: Point3, axes: Point3[], values: number[]): Point3;
function combine(o: EspacePoint, axes: EspacePoint[], values: number[]): EspacePoint;
function combine(
	o: EspacePoint & { z?: number },
	axes: (EspacePoint & { z?: number })[],
	values: number[]
): EspacePoint & { z?: number } {
	const along = (pick: (p: EspacePoint & { z?: number }) => number) =>
		pick(o) + axes.reduce((sum, axis, i) => sum + values[i] * (pick(axis) - pick(o)), 0);
	return {
		x: along((p) => p.x),
		y: along((p) => p.y),
		...(o.z !== undefined && { z: along((p) => p.z ?? 0) })
	};
}

/** Une vue droite tournée (hors du passage depuis la cavalière) */
const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);

const GRID: EspaceVue[] = [VUE_DE_DEPART, { ...VUE_DE_DEPART, oblique: 0.5 }];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -100; pitch <= 100; pitch += 25) {
		GRID.push(turned((yaw * Math.PI) / 180, (pitch * Math.PI) / 180));
	}
}

describe('```solide — repere: (lecture)', () => {
	it('sans la clé : la spécification ne porte pas de repère', () => {
		expect(spec(...CUBE).repere).toBeUndefined();
	});

	it('une origine et trois vecteurs qui en partent', () => {
		expect(spec(...CUBE, REPERE).repere).toEqual({ origin: 0, axes: [1, 3, 4] });
		expect(spec(...CUBE, 'repere: D ; DA, DC, DH').repere).toEqual({ origin: 3, axes: [0, 2, 7] });
	});

	it('les parenthèses autour sont facultatives, les espaces aussi', () => {
		expect(spec(...CUBE, 'repere: (A ; AB, AD, AE)').repere).toEqual({
			origin: 0,
			axes: [1, 3, 4]
		});
		expect(spec(...CUBE, 'repere: A;AB,AD,AE').repere).toEqual({ origin: 0, axes: [1, 3, 4] });
	});

	it('l’origine et les vecteurs peuvent prendre un point déclaré (milieu, centre)', () => {
		const s = spec(...PYRAMIDE, 'points: O centre ABCD', 'repere: O ; OA, OB, OS');
		expect(s.repere).toEqual({ origin: 5, axes: [1, 2, 0] });
	});

	it('erreurs : écriture non comprise', () => {
		expect(errors(...CUBE, 'repere: A')[0]).toContain('non compris');
		expect(errors(...CUBE, 'repere: A ; AB, AD')[0]).toContain('trois vecteurs');
		expect(errors(...CUBE, 'repere: A ; AB, AD, AE, AG')[0]).toContain('trois vecteurs');
		expect(errors(...CUBE, 'repere: AB ; AB, AD, AE')[0]).toContain('un seul point');
		expect(errors(...CUBE, 'repere: A ; AB, AD, ABE')[0]).toContain('deux points');
	});

	it('erreurs : point inconnu, vecteur nul, vecteur qui ne part pas de l’origine', () => {
		expect(errors(...CUBE, 'repere: Z ; ZB, ZD, ZE')[0]).toContain('aucun point ne s’appelle Z');
		expect(errors(...CUBE, 'repere: A ; AB, AD, AZ')[0]).toContain('aucun point ne s’appelle Z');
		expect(errors(...CUBE, 'repere: A ; AB, AD, AA')[0]).toContain('vecteur nul');
		expect(errors(...CUBE, 'repere: A ; AB, AD, BF')[0]).toContain('part de A');
	});

	it('erreur : trois vecteurs dans un même plan (comportement 82)', () => {
		expect(errors(...CUBE, 'repere: A ; AB, AD, AC')[0]).toContain('même plan');
		expect(errors(...CUBE, 'repere: A ; AB, AD, AB')[0]).toContain('même plan');
		expect(errors(...CUBE, 'points: I milieu AB', 'repere: A ; AB, AI, AE')[0]).toContain(
			'même plan'
		);
	});

	it('erreurs : solide rond, sommets sans nom, section: ou tracer: dans le bloc (comportement 83)', () => {
		expect(
			errors('forme: cylindre 2 4', "sommets: O O'", "repere: O ; OO', OO', OO'")[0]
		).toContain('polyèdres seulement');
		expect(errors('forme: cube 2', REPERE)[0]).toContain('nomme les sommets');
		expect(errors(...CUBE, REPERE, 'section: parallele ABCD 1')[0]).toContain(
			'ne va pas encore avec section:'
		);
		expect(errors(...CUBE, REPERE, 'tracer: vecteur AB + AD')[0]).toContain(
			'ne va pas encore avec tracer:'
		);
	});

	it('le repère va avec vecteurs:, droites: et plans:', () => {
		const s = spec(...CUBE, REPERE, 'vecteurs: AG', 'droites: (AG)', 'plans: (BDE)');
		expect(s.repere).toBeDefined();
		expect(s.vectors).toHaveLength(1);
		expect(s.droites).toHaveLength(1);
		expect(s.plans).toHaveLength(1);
	});
});

describe('```solide — points par coordonnées (lecture)', () => {
	it('M (1 ; 0,5 ; 1) : le point A + AB + 0,5 AD + AE', () => {
		const s = spec(...CUBE, REPERE, 'points: M (1 ; 0,5 ; 1)');
		expect(s.points).toHaveLength(1);
		expect(s.points[0].name).toBe('M');
		const at = at3(s);
		expect(close3(at[8], combine(at[0], [at[1], at[3], at[4]], [1, 0.5, 1]))).toBe(true);
		// Sur un cube de côté 2 : le milieu de [FG]
		expect(
			close3(at[8], { x: (at[5].x + at[6].x) / 2, y: (at[5].y + at[6].y) / 2, z: at[6].z / 2 })
		).toBe(true);
	});

	it('les coordonnées se lisent dans LE repère écrit, pas dans celui du cube', () => {
		const s = spec(...PAVE, 'repere: D ; DA, DC, DH', 'points: M (1 ; 0 ; 0), N (0 ; 0,25 ; 1)');
		const at = at3(s);
		expect(close3(at[8], at[0])).toBe(true);
		expect(close3(at[9], combine(at[3], [at[0], at[2], at[7]], [0, 0.25, 1]))).toBe(true);
	});

	it('écritures : point décimal, nombres négatifs, sans espaces, ordre des lignes indifférent', () => {
		const a = at3(spec(...CUBE, 'points: M(0.5;-0,1;1)', REPERE));
		expect(close3(a[8], combine(a[0], [a[1], a[3], a[4]], [0.5, -0.1, 1]))).toBe(true);
	});

	it('avec des milieux et des centres, avant comme après', () => {
		const s = spec(...CUBE, REPERE, 'points: I milieu AE, M (1 ; 1 ; 0,5), J milieu IM');
		expect(s.points.map((p) => p.name)).toEqual(['I', 'M', 'J']);
		const at = at3(s);
		expect(
			close3(at[10], {
				x: (at[8].x + at[9].x) / 2,
				y: (at[8].y + at[9].y) / 2,
				z: (at[8].z + at[9].z) / 2
			})
		).toBe(true);
	});

	it('dans le repère d’un point déclaré', () => {
		const s = spec(
			...PYRAMIDE,
			'points: O centre ABCD, M (0,5 ; 0,5 ; 0)',
			'repere: O ; OA, OB, OS'
		);
		const at = at3(s);
		// O + 0,5 OA + 0,5 OB : le milieu de [AB]
		expect(
			close3(at[6], {
				x: (at[1].x + at[2].x) / 2,
				y: (at[1].y + at[2].y) / 2,
				z: (at[1].z + at[2].z) / 2
			})
		).toBe(true);
	});

	it('le point sert comme un autre : vecteur, droite, plan', () => {
		const s = spec(
			...CUBE,
			REPERE,
			'points: M (1 ; 0,5 ; 1)',
			'vecteurs: u = AM',
			'droites: (DM)',
			'plans: (BDM)'
		);
		expect(s.vectors[0]).toEqual({ from: 0, to: 8, name: 'u' });
		expect(s.droites?.[0]).toMatchObject({ from: 3, to: 8 });
		expect(s.plans?.[0].through).toEqual([1, 3, 8]);
	});

	it('erreur : coordonnées sans repere: (comportement 81)', () => {
		expect(errors(...CUBE, 'points: M (1 ; 0,5 ; 1)')[0]).toContain('repere:');
	});

	it('erreur : une seule, celle du repère, quand il est mal écrit', () => {
		const found = errors(...CUBE, 'repere: A ; AB, AD, AC', 'points: M (1 ; 0,5 ; 1)');
		expect(found).toHaveLength(1);
		expect(found[0]).toContain('même plan');
	});

	it('erreur : point hors de la figure (comportement 81)', () => {
		expect(errors(...CUBE, REPERE, 'points: M (3 ; 0 ; 0)')[0]).toContain('hors de la figure');
		expect(errors(...CUBE, REPERE, 'points: M (0 ; -0,5 ; 0)')[0]).toContain('hors de la figure');
		// Un peu dehors : dans la marge
		expect(errors(...CUBE, REPERE, 'points: M (1,1 ; 0 ; -0,1)')).toEqual([]);
	});

	it('erreurs : coordonnées mal écrites', () => {
		expect(errors(...CUBE, REPERE, 'points: M (1 ; 2)')[0]).toContain('trois coordonnées');
		expect(errors(...CUBE, REPERE, 'points: M (1 ; 0 ; 0 ; 1)')[0]).toContain('trois coordonnées');
		expect(errors(...CUBE, REPERE, 'points: M (1 ; a ; 0)')[0]).toContain('« a »');
		expect(errors(...CUBE, REPERE, 'points: M (1 ; 0,12345 ; 0)')[0]).toContain(
			'chiffres après la virgule'
		);
		expect(errors(...CUBE, REPERE, 'points: M (1 ; 0,5 ; 1')[0]).toContain('non compris');
	});

	it('erreurs : nom mal écrit, déjà pris', () => {
		expect(errors(...CUBE, REPERE, 'points: m (1 ; 0 ; 0)')[0]).toContain('majuscule');
		expect(errors(...CUBE, REPERE, 'points: G (1 ; 0 ; 0)')[0]).toContain(
			'déjà le nom d’un sommet'
		);
		expect(errors(...CUBE, REPERE, 'points: M (1 ; 0 ; 0), M (0 ; 0 ; 1)')[0]).toContain(
			'deux fois'
		);
	});

	it('erreur : le repère ne s’appuie pas sur un point donné par ses coordonnées', () => {
		const found = errors(...CUBE, 'points: M (1 ; 1 ; 1)', 'repere: A ; AB, AD, AM');
		expect(found).toHaveLength(1);
		expect(found[0]).toContain('coordonnées');
	});

	it('au plus 8 points, coordonnées comprises', () => {
		const many = Array.from({ length: 9 }, (_, i) => `M${i + 1} (0,${i + 1} ; 0 ; 0)`).join(', ');
		expect(errors(...CUBE, REPERE, `points: ${many}`)[0]).toContain('au plus 8 points');
	});
});

describe('```solide — repere: et points par coordonnées (scène)', () => {
	it('le repère : trois flèches de l’origine aux trois points, comme trois vecteurs donnés', () => {
		const s = scene(...CUBE, REPERE);
		expect(s.arrows).toHaveLength(3);
		[1, 3, 4].forEach((vertex, i) => {
			expect(s.arrows[i].small).toBe(false);
			expect(close(s.arrows[i].shaft[0], s.vertices[0])).toBe(true);
			expect(close(s.arrows[i].head[0], s.vertices[vertex])).toBe(true);
		});
		expect(s).toEqual(scene(...CUBE, 'vecteurs: AB, AD, AE'));
	});

	it('le repère ne change ni le cadre, ni les arêtes, ni les noms des sommets', () => {
		const without = scene(...CUBE);
		const withFrame = scene(...CUBE, REPERE);
		expect(withFrame.width).toBe(without.width);
		expect(withFrame.height).toBe(without.height);
		expect(withFrame.lines).toEqual(without.lines);
		expect(withFrame.labels).toEqual(without.labels);
	});

	it('les vecteurs donnés d’abord, puis ceux du repère', () => {
		const s = scene(...CUBE, REPERE, 'vecteurs: AG');
		expect(s.arrows).toHaveLength(4);
		expect(close(s.arrows[0].head[0], s.vertices[6])).toBe(true);
	});

	it('un point par coordonnées : un disque et son nom, à sa place sur le dessin', () => {
		const s = scene(...CUBE, REPERE, 'points: M (1 ; 0,5 ; 1)');
		const v = s.vertices;
		const expected = combine(v[0], [v[1], v[3], v[4]], [1, 0.5, 1]);
		expect(close(s.points[0], expected)).toBe(true);
		expect(s.dots.some((d) => close(d, expected))).toBe(true);
		const name = s.labels.find((l) => l.text === 'M');
		expect(name).toBeDefined();
		// Le nom ne touche aucun autre nom
		const [lo, hi] = labelBox(name!);
		for (const other of s.labels.filter((l) => l !== name)) {
			const [olo, ohi] = labelBox(other);
			expect(lo.x < ohi.x && olo.x < hi.x && lo.y < ohi.y && olo.y < hi.y).toBe(false);
		}
	});

	it('tourner: oui — sous tous les angles, les flèches et le point suivent, dans le cadre', () => {
		const s = spec(
			...PAVE,
			'repere: A ; AB, AD, AE',
			'points: M (1,1 ; 0,5 ; -0,1), N (0,25 ; 1 ; 1)',
			'tourner: oui'
		);
		for (const vue of GRID) {
			const at = buildSolideScene(s, vue);
			const v = at.vertices;
			[1, 3, 4].forEach((vertex, i) => {
				expect(close(at.arrows[i].shaft[0], v[0])).toBe(true);
				expect(close(at.arrows[i].head[0], v[vertex])).toBe(true);
			});
			expect(close(at.points[0], combine(v[0], [v[1], v[3], v[4]], [1.1, 0.5, -0.1]))).toBe(true);
			expect(close(at.points[1], combine(v[0], [v[1], v[3], v[4]], [0.25, 1, 1]))).toBe(true);
			for (const p of [...at.points, ...at.labels.flatMap(labelBox)]) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(at.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(at.height + 1e-9);
			}
		}
	});

	it('tourner: oui — le cadre ne change pas d’un angle à l’autre', () => {
		const s = spec(...CUBE, REPERE, 'points: M (1,1 ; 0,5 ; 1)', 'tourner: oui');
		const sizes = GRID.slice(2).map((vue) => {
			const at = buildSolideScene(s, vue);
			return `${at.width.toFixed(6)} ${at.height.toFixed(6)}`;
		});
		expect(new Set(sizes).size).toBe(1);
	});
});

describe('```solide — repere: et points par coordonnées (nom accessible, PDF)', () => {
	it('lecteur d’écran : « repère d’origine A », le point et ses coordonnées (comportement 78)', () => {
		const label = solideLabel(spec(...CUBE, REPERE, 'points: M (1 ; 0,5 ; -0,1)'));
		expect(label).toContain('repère d’origine A');
		expect(label).toContain('point M de coordonnées (1 ; 0,5 ; −0,1)');
	});

	it('sans repère : le nom accessible ne change pas', () => {
		expect(solideLabel(spec(...CUBE))).not.toContain('repère');
	});

	it('PDF : les trois flèches du repère et le point', () => {
		const without = generateEspaceTypst(read(...CUBE) as EspaceNode);
		const typst = generateEspaceTypst(
			read(...CUBE, REPERE, 'points: M (1 ; 0,5 ; 1)') as EspaceNode
		);
		const same = generateEspaceTypst(
			read(...CUBE, 'vecteurs: AB, AD, AE', 'points: M milieu FG') as EspaceNode
		);
		expect(typst).not.toBe(without);
		expect(typst).toBe(same);
	});
});
