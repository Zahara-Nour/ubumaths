/**
 * Bloc ```solide : sections (`section:`) — chantier `solides`, lot 6 (§ 11 du journal)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { SolideSpec } from '$lib/ubumark/types/espace';
import { buildSolideScene, solideLabel } from '$lib/ubumark/utils/espace-solides';

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const errors = (...lines: string[]) => read(...lines).errors;
const specOf = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const scene = (...lines: string[]) => buildSolideScene(specOf(...lines));
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const NAMES = 'sommets: A B C D E F G H';

/** Largeur et hauteur d'un polygone */
const extent = (points: { x: number; y: number }[]) => ({
	w: Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)),
	h: Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y))
});

describe('section: — lecture', () => {
	it('sans section : section null', () => {
		expect(specOf('forme: pave 6 4 3').section).toBeNull();
	});

	it('pavé : face par ses noms, distance', () => {
		const spec = specOf('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 2');
		expect(spec.section).toMatchObject({ kind: 'face', face: [0, 1, 2, 3], distance: 2 });
	});

	it('pavé : face par sa place, accents permis, virgule', () => {
		const spec = specOf('forme: pave 6 4 3', 'section: parallèle devant 1,5');
		expect(spec.section).toMatchObject({ kind: 'face', face: [0, 1, 5, 4], distance: 1.5 });
	});

	it('sans distance : au milieu', () => {
		expect(specOf('forme: pave 6 4 3', 'section: parallele dessous').section).toMatchObject({
			distance: 1.5
		});
		expect(specOf('forme: cube 4', 'section: parallele gauche').section).toMatchObject({
			distance: 2
		});
		expect(specOf('forme: cylindre 2 5', 'section: perpendiculaire').section).toMatchObject({
			kind: 'perpendiculaire',
			distance: 2.5
		});
		expect(specOf('forme: cylindre 2 5', 'section: parallele').section).toMatchObject({
			kind: 'parallele',
			distance: 0
		});
		expect(specOf('forme: boule 3', 'section: oui').section).toMatchObject({
			kind: 'boule',
			distance: 0
		});
	});

	it('cylindre et boule', () => {
		expect(specOf('forme: cylindre 2 5', 'section: perpendiculaire 3').section).toEqual({
			kind: 'perpendiculaire',
			distance: 3
		});
		expect(specOf('forme: cylindre 2 5', 'section: parallele 1').section).toEqual({
			kind: 'parallele',
			distance: 1
		});
		expect(specOf('forme: boule 3', 'section: 2').section).toEqual({ kind: 'boule', distance: 2 });
		expect(specOf('forme: boule 3', 'section: 0').section).toEqual({ kind: 'boule', distance: 0 });
	});

	it('noms des sommets de la section (pavé), dans l’ordre de la face écrite', () => {
		const spec = specOf('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 2 IJKL');
		expect(spec.section).toMatchObject({ names: ['I', 'J', 'K', 'L'] });
		const back = specOf('forme: pave 6 4 3', NAMES, 'section: parallele BCDA 2 IJKL');
		expect(back.section).toMatchObject({ face: [1, 2, 3, 0], names: ['I', 'J', 'K', 'L'] });
		const primes = specOf('forme: pave 6 4 3', "section: parallele dessus 1 A'B'C'D'");
		expect(primes.section).toMatchObject({ names: ["A'", "B'", "C'", "D'"] });
	});

	it('variables : lues sur l’énoncé résolu', () => {
		expect(specOf('forme: pave 6 4 3', 'section: parallele dessus 0.5').section).toMatchObject({
			distance: 0.5
		});
	});
});

describe('section: — erreurs au prof', () => {
	it('le plan ne coupe pas le solide', () => {
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 3').join()).toContain(
			'le plan ne coupe pas le pavé : distance entre 0 et 3 (exclus)'
		);
		expect(errors('forme: pave 6 4 3', 'section: parallele devant 0').join()).toContain(
			'le plan ne coupe pas le pavé'
		);
		expect(errors('forme: cylindre 2 5', 'section: perpendiculaire 5').join()).toContain(
			'le plan ne coupe pas le cylindre : distance entre 0 et 5 (exclus)'
		);
		expect(errors('forme: cylindre 2 5', 'section: perpendiculaire 0').join()).toContain(
			'le plan ne coupe pas le cylindre'
		);
		expect(errors('forme: cylindre 2 5', 'section: parallele 2').join()).toContain(
			'distance à l’axe de 0 à 2 (2 exclu)'
		);
		expect(errors('forme: boule 3', 'section: 3').join()).toContain(
			'distance au centre de 0 à 3 (3 exclu)'
		);
	});

	it('solide sans section dans ce bloc', () => {
		for (const form of ['prisme triangle 4 3 5', 'pyramide carree 4 3', 'cone 2 4']) {
			expect(errors(`forme: ${form}`, 'section: parallele dessous 1').join()).toContain(
				'section : cube, pavé, cylindre ou boule'
			);
		}
	});

	it('écritures non comprises', () => {
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele ABD 1').join()).toContain(
			'ABD n’est pas une face du pavé'
		);
		expect(errors('forme: pave 6 4 3', 'section: parallele ABCD 1').join()).toContain(
			'nomme les sommets (sommets:) pour marquer ABCD'
		);
		expect(errors('forme: pave 6 4 3', 'section: perpendiculaire 1').join()).toContain(
			'section: parallele ABCD 2'
		);
		expect(errors('forme: cylindre 2 5', 'section: oblique 1').join()).toContain(
			'section: perpendiculaire 2'
		);
		expect(errors('forme: boule 3', 'section: x').join()).toContain('section: 1');
		expect(errors('forme: pave 6 4 3', 'section: parallele dessus -1').join()).not.toEqual('');
	});

	it('face écrite hors de l’ordre du tour : refusée (section croisée)', () => {
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele ACBD 2 IJKL').join()).toContain(
			'dans l’ordre du tour'
		);
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele DCBA 2')).toEqual([]);
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele CDAB 2')).toEqual([]);
	});

	it('distance : au plus 3 décimales ; section vide sur un cylindre', () => {
		expect(errors('forme: pave 6 4 3', 'section: parallele dessus 1.23456').join()).not.toEqual('');
		expect(errors('forme: cylindre 2 5', 'section:').join()).toContain('section vide non comprise');
	});

	it('boule coupée près du pôle : la section reste dans le cercle', () => {
		const s = scene('forme: boule 3', 'section: 2.9');
		const top = Math.min(...(s.section ?? []).map((p) => p.y));
		const ballTop = Math.min(...s.lines.flatMap((l) => (l.thick ? [] : l.points.map((p) => p.y))));
		expect(top).toBeGreaterThanOrEqual(ballTop - 1e-9);
	});

	it('noms de la section', () => {
		expect(errors('forme: cylindre 2 5', 'section: parallele 1 IJKL').join()).toContain(
			'section: parallele 1'
		);
		expect(errors('forme: pave 6 4 3', 'section: parallele dessus 1 IJK').join()).toContain(
			'4 noms'
		);
		expect(errors('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 1 IJKA').join()).toContain(
			'« A » est déjà le nom d’un sommet'
		);
		expect(errors('forme: pave 6 4 3', 'section: parallele dessus 1 IJKI').join()).toContain(
			'« I » deux fois'
		);
	});

	it('deux lignes section:', () => {
		expect(errors('forme: boule 3', 'section: 1', 'section: 2').join()).toContain(
			'« section » déjà donnée ligne 2'
		);
	});

	it('avec marquer: et cachees: non : permis', () => {
		expect(
			errors(
				'forme: pave 6 4 3',
				NAMES,
				'marquer: face ABCD',
				'cachees: non',
				'section: parallele ABCD 1'
			)
		).toEqual([]);
	});
});

describe('section: — dessin', () => {
	it('pavé ‖ dessous à 2 : section = face du bas montée de 2 (même forme)', () => {
		const s = scene('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 2');
		expect(s.section).not.toBeNull();
		const section = s.section ?? [];
		expect(section).toHaveLength(4);
		const [a, b, c, d] = s.vertices;
		const e = s.vertices[4];
		const k = (e.y - a.y) * (2 / 3);
		const expected = [a, b, c, d].map((p) => ({ x: p.x, y: p.y + k }));
		section.forEach((p, i) => {
			expect(near(p.x, expected[i].x)).toBe(true);
			expect(near(p.y, expected[i].y)).toBe(true);
		});
	});

	it('pavé ‖ devant : rectangle de face 6 × 3, en vraie proportion', () => {
		const s = scene('forme: pave 6 4 3', 'section: parallele devant 1');
		const { w, h } = extent(s.section ?? []);
		expect(near(w / h, 2)).toBe(true);
	});

	it('contour de la section : 4 traits pleins épais ; les arêtes gardent leurs tirets', () => {
		const s = scene('forme: pave 6 4 3', 'section: parallele dessous 1');
		expect(s.lines.filter((l) => l.thick && !l.dashed)).toHaveLength(4);
		expect(s.lines.filter((l) => l.dashed)).toHaveLength(3);
	});

	it('noms IJKL posés près de leurs points', () => {
		const s = scene('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 2 IJKL');
		const section = s.section ?? [];
		['I', 'J', 'K', 'L'].forEach((name, i) => {
			const label = s.labels.find((l) => l.text === name);
			expect(label).toBeDefined();
			const dist = Math.hypot((label?.at.x ?? 0) - section[i].x, (label?.at.y ?? 0) - section[i].y);
			expect(dist).toBeLessThan(0.6);
		});
	});

	it('cylindre ⊥ à 3 : ellipse à plat, de la largeur du cylindre', () => {
		const s = scene('forme: cylindre 2 5', 'section: perpendiculaire 3');
		const body = extent(s.lines.flatMap((l) => l.points));
		const { w, h } = extent(s.section ?? []);
		expect(near(w, body.w)).toBe(true);
		expect(h).toBeLessThan(w / 2);
	});

	it('cylindre ‖ à 1 de l’axe : rectangle 2√3 × 5', () => {
		const s = scene('forme: cylindre 2 5', 'section: parallele 1');
		const { w, h } = extent(s.section ?? []);
		expect(near(w / h, (2 * Math.sqrt(3)) / 5)).toBe(true);
	});

	it('boule : petit cercle de rayon √5 ; l’équateur n’est plus dessiné', () => {
		const plainBall = scene('forme: boule 3');
		const s = scene('forme: boule 3', 'section: 2');
		const ball = extent(s.lines.flatMap((l) => l.points));
		expect(near(extent(s.section ?? []).w / ball.w, Math.sqrt(5) / 3)).toBe(true);
		// cercle + 2 demi-équateurs sans section ; cercle + contour de section avec
		expect(plainBall.lines).toHaveLength(3);
		expect(s.lines.filter((l) => !l.thick)).toHaveLength(1);
	});

	it('cotes : la distance du plan écrite, jamais les dimensions de la section', () => {
		const s = scene('forme: pave 6 4 3', 'section: parallele dessous 2', 'cotes: cm');
		const texts = s.labels.map((l) => l.text);
		expect(texts).toContain('2 cm');
		expect(texts.filter((t) => t === '6 cm')).toHaveLength(1);
		expect(texts.filter((t) => t === '4 cm')).toHaveLength(1);
		const cyl = scene('forme: cylindre 2 5', 'section: parallele 1', 'cotes: cm');
		expect(cyl.labels.map((l) => l.text)).toContain('1 cm');
		expect(cyl.labels.map((l) => l.text).some((t) => t.startsWith('3,46'))).toBe(false);
		const ball = scene('forme: boule 3', 'section: 2', 'cotes: cm');
		expect(ball.labels.map((l) => l.text)).toContain('2 cm');
		expect(ball.labels.map((l) => l.text).some((t) => t.startsWith('2,23'))).toBe(false);
	});
});

describe('section: — nom accessible et PDF', () => {
	it('nom accessible : « coupé par un plan », jamais la nature de la section', () => {
		const label = solideLabel(
			specOf('forme: pave 6 4 3', NAMES, 'section: parallele ABCD 2 IJKL', 'cotes: cm')
		);
		expect(label).toContain('coupé par un plan');
		expect(label).toContain('section IJKL');
		expect(label).toContain('à 2 cm');
		for (const word of ['rectangle', 'carré', 'disque', 'cercle', 'pavé', 'cylindre', 'boule']) {
			expect(label.toLowerCase()).not.toContain(word);
		}
		const round = solideLabel(specOf('forme: cylindre 2 5', 'section: perpendiculaire 3'));
		expect(round).toBe('Solide en perspective cavalière, coupé par un plan');
	});

	it('PDF : la section remplie, son contour tracé', () => {
		const out = generateEspaceTypst(read('forme: pave 6 4 3', 'section: parallele dessous 1'));
		expect(out).toContain('fill: rgb(');
		expect(out.split('curve(').length - 1).toBe(16);
	});
});
