/**
 * Bloc ```patron : pliage, dépliage, scène (calcul pur) — chantier `solides`, § 9
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { PatronSpec } from '$lib/ubumark/types/espace';
import {
	CUBE_NETS,
	FALSE_CUBE_NETS,
	PATRON_SIZE,
	buildPatronScene,
	gridOf,
	patronLabel,
	patronNet,
	transformGrid
} from '$lib/ubumark/utils/espace-patrons';

const specOf = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'patron');
	expect(node.errors).toEqual([]);
	return node.spec as PatronSpec;
};
const scene = (...lines: string[]) => buildPatronScene(specOf(...lines));
const texts = (...lines: string[]) => scene(...lines).labels.map((l) => l.text);
const count = <T>(list: T[], value: T) => list.filter((x) => x === value).length;

/** Spécification d'un cube sur une grille donnée (sans passer par le parseur) */
const cubeOn = (cells: boolean[][], bottom = 0): PatronSpec => ({
	kind: 'patron',
	solid: 'cube',
	dims: [1],
	dimsWritten: false,
	cells,
	layout: 1,
	faux: false,
	turn: 0,
	mirror: false,
	bottom,
	names: null,
	numbers: false,
	marks: [],
	cotes: null
});

/** La forme d'une grille à une rotation ou une symétrie près (pour comparer des patrons) */
function canonical(cells: boolean[][]): string {
	const forms: string[] = [];
	for (const mirror of [false, true]) {
		for (const turn of [0, 90, 180, 270] as const) {
			forms.push(
				transformGrid(cells, turn, mirror)
					.map((row) => row.map((on) => (on ? 'X' : '.')).join(''))
					.join('/')
			);
		}
	}
	return forms.sort()[0];
}

describe('catalogue du cube', () => {
	it('les 11 patrons se plient en cube, de n’importe quelle case de départ', () => {
		for (const net of CUBE_NETS) {
			for (let bottom = 0; bottom < 6; bottom++) {
				expect(patronNet(cubeOn(gridOf(net), bottom)).notFolding).toBeNull();
			}
		}
	});

	it('les 11 patrons sont différents (à une rotation ou une symétrie près)', () => {
		expect(new Set(CUBE_NETS.map((n) => canonical(gridOf(n)))).size).toBe(11);
	});

	it('aucun des 8 faux patrons ne se plie en cube, et ils sont tous différents', () => {
		for (const net of FALSE_CUBE_NETS) {
			expect(patronNet(cubeOn(gridOf(net))).notFolding).toMatch(/se recouvrent/);
		}
		const valid = new Set(CUBE_NETS.map((n) => canonical(gridOf(n))));
		const fakes = FALSE_CUBE_NETS.map((n) => canonical(gridOf(n)));
		expect(new Set(fakes).size).toBe(8);
		for (const fake of fakes) expect(valid.has(fake)).toBe(false);
	});

	it('une grille de 5 ou 7 cases ne se plie pas : le nombre de faces est dit', () => {
		expect(patronNet(cubeOn(gridOf(['XXXXX']))).notFolding).toBe('5 cases : un cube a 6 faces');
		expect(patronNet(cubeOn(gridOf(['.X..', 'XXXX', '.XX.']))).notFolding).toMatch(/7 cases/);
	});

	it('cube : le dessin est la grille (carrés alignés, côté 1)', () => {
		const { faces } = patronNet(cubeOn(gridOf(CUBE_NETS[0])));
		for (const f of faces) {
			const xs = f.points.map((p) => p.x);
			expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(1, 9);
		}
	});
});

describe('noms des sommets : ceux du solide, répétés', () => {
	it('croix : 14 coins nommés, les 8 lettres présentes', () => {
		const labels = texts('solide: cube', 'sommets: A B C D E F G H');
		expect(labels).toHaveLength(14);
		expect(new Set(labels)).toEqual(new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']));
	});

	it('la face du dessous (case 1 par défaut) : A en bas à gauche, B en bas à droite, C, D en haut', () => {
		const s = scene('solide: cube', 'forme: 1', 'sommets: A B C D E F G H');
		// La case 1 de la croix est le rabat du haut : ses 4 coins sont les points les plus hauts et ceux juste en dessous
		const at = (name: string) => s.labels.filter((l) => l.text === name);
		const d = at('D').reduce((a, b) => (a.at.y < b.at.y ? a : b));
		const c = at('C').reduce((a, b) => (a.at.y < b.at.y ? a : b));
		expect(d.at.x).toBeLessThan(c.at.x);
		expect(Math.abs(d.at.y - c.at.y)).toBeLessThan(1e-6);
	});

	it('pliage cohérent : chaque arête commune relie les mêmes sommets dans les deux faces', () => {
		for (const net of CUBE_NETS) {
			const { faces } = patronNet(cubeOn(gridOf(net)));
			// Deux coins confondus sur le dessin portent le même sommet
			const corners = faces.flatMap((f) => f.points.map((p, i) => ({ p, v: f.corners[i] })));
			for (const a of corners) {
				for (const b of corners) {
					if (Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y) < 1e-6) expect(a.v).toBe(b.v);
				}
			}
		}
	});

	it('? remplace partout le sommet à trouver ; - le cache', () => {
		const labels = texts('solide: cube', 'sommets: A B C D E ? G -');
		expect(labels).toContain('?');
		expect(labels).not.toContain('F');
		expect(labels).not.toContain('H');
	});
});

describe('pavé', () => {
	it('chaque face devient le rectangle de son rôle (4 × 2, 4 × 3, 2 × 3), sans chevauchement', () => {
		for (let n = 1; n <= 11; n++) {
			const spec = specOf('solide: pave 4 2 3', `forme: ${n}`);
			const net = patronNet(spec);
			expect(net.overlap).toBeNull();
			const sizes = net.faces
				.map((f) => {
					const xs = f.points.map((p) => p.x);
					const ys = f.points.map((p) => p.y);
					const w = Math.max(...xs) - Math.min(...xs);
					const h = Math.max(...ys) - Math.min(...ys);
					return [w, h].sort((a, b) => a - b).join('×');
				})
				.sort();
			expect(sizes).toEqual(['2×3', '2×3', '2×4', '2×4', '3×4', '3×4']);
		}
	});

	it('dessous: N : la face N devient ABCD, longueur l à l’horizontale', () => {
		const net = patronNet(specOf('solide: pave 4 2 3', 'forme: 7', 'dessous: 2'));
		const bottom = net.faces[1];
		expect(bottom.solidFace).toBe(0);
		const xs = bottom.points.map((p) => p.x);
		expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 9);
	});
});

describe('prisme, pyramide, cylindre', () => {
	it('pyramide carrée 4 3 : un carré, 4 triangles de hauteur √13, S quatre fois', () => {
		const spec = specOf('solide: pyramide carree 4 3', 'sommets: S A B C D');
		const net = patronNet(spec);
		expect(net.faces).toHaveLength(5);
		expect(net.overlap).toBeNull();
		const triangles = net.faces.filter((f) => f.points.length === 3);
		expect(triangles).toHaveLength(4);
		for (const t of triangles) {
			const apex = t.points[t.corners.indexOf(0)];
			const [b1, b2] = t.points.filter((_, i) => t.corners[i] !== 0);
			const foot = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
			expect(Math.hypot(apex.x - foot.x, apex.y - foot.y)).toBeCloseTo(Math.sqrt(13), 9);
		}
		expect(
			count(
				buildPatronScene(spec).labels.map((l) => l.text),
				'S'
			)
		).toBe(4);
	});

	it('pyramide à base triangle : 4 triangles', () => {
		expect(patronNet(specOf('solide: pyramide triangle 4 3')).faces).toHaveLength(4);
	});

	it('prisme : forme 1 (triangles sur le même rectangle), forme 2 (sur deux rectangles)', () => {
		const net1 = patronNet(specOf('solide: prisme triangle 3 2 5', 'forme: 1'));
		const net2 = patronNet(specOf('solide: prisme triangle 3 2 5', 'forme: 2'));
		for (const net of [net1, net2]) {
			expect(net.faces).toHaveLength(5);
			expect(net.overlap).toBeNull();
		}
		const triangleCenters = (faces: typeof net1.faces) =>
			faces
				.filter((f) => f.points.length === 3)
				.map((f) => f.points.reduce((s, p) => s + p.x, 0) / 3);
		const [a, b] = triangleCenters(net1.faces);
		expect(a).toBeCloseTo(b, 9);
		const [c, d] = triangleCenters(net2.faces);
		expect(Math.abs(c - d)).toBeGreaterThan(1);
	});

	it('prisme à base triangle rectangle : dessiné sans chevauchement', () => {
		for (const forme of [1, 2]) {
			expect(
				patronNet(specOf('solide: prisme triangle-rectangle 3 4 6', `forme: ${forme}`)).overlap
			).toBeNull();
		}
	});

	it('cylindre 1 3 : rectangle 2π × 3, deux disques de rayon 1 collés au milieu', () => {
		const net = patronNet(specOf('solide: cylindre 1 3'));
		expect(net.faces).toHaveLength(3);
		const rectangle = net.faces[1];
		const xs = rectangle.points.map((p) => p.x);
		expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(2 * Math.PI, 9);
		expect(net.faces[0].center?.vertex).toBe(1);
		expect(net.faces[2].center?.vertex).toBe(0);
		expect(net.overlap).toBeNull();
	});
});

describe('scène', () => {
	it('plus grand côté du patron : 6 cm', () => {
		for (const lines of [
			['solide: cube'],
			['solide: pave 4 2 3', 'forme: 11'],
			['solide: cylindre 1 3']
		]) {
			const s = scene(...lines);
			expect(Math.max(s.drawingWidth, s.drawingHeight)).toBeCloseTo(PATRON_SIZE, 9);
		}
	});

	it('croix : 5 plis, 14 côtés de contour', () => {
		const { lines } = scene('solide: cube');
		expect(lines.filter((l) => l.kind === 'pli')).toHaveLength(5);
		expect(lines.filter((l) => l.kind === 'contour')).toHaveLength(14);
	});

	it('faces: numeros : 1 à 6 ; marquer: face 3 : une face teintée', () => {
		const s = scene('solide: cube', 'faces: numeros', 'marquer: face 3');
		expect(s.labels.map((l) => l.text)).toEqual(['1', '2', '3', '4', '5', '6']);
		expect(s.fills).toHaveLength(1);
	});

	it('marquer: face dessus : la case qui devient le dessus', () => {
		const spec = specOf('solide: cube', 'marquer: face dessus');
		const [mark] = spec.marks;
		expect(mark.kind === 'face' && patronNet(spec).faces[mark.faces[0]].solidFace).toBe(1);
	});

	it('marquer: sommet A : un point sur chaque coin A', () => {
		const s = scene('solide: cube', 'sommets: A B C D E F G H', 'marquer: sommet A');
		expect(s.dots.length).toBe(
			count(
				s.labels.map((l) => l.text),
				'A'
			)
		);
	});

	it('tourner: 90 : même patron, tourné ; noms et numéros suivent', () => {
		const lines = ['solide: pave 4 2 3', 'forme: 7', 'sommets: A B C D E F G H', 'faces: numeros'];
		const flat = scene(...lines);
		const turned = scene(...lines, 'tourner: 90');
		expect(turned.drawingWidth).toBeCloseTo(flat.drawingHeight, 9);
		expect(turned.drawingHeight).toBeCloseTo(flat.drawingWidth, 9);
		expect(turned.labels.map((l) => l.text).sort()).toEqual(flat.labels.map((l) => l.text).sort());
		// Sens des aiguilles : la face 1, en haut à gauche, passe en haut à droite
		const one = (s: typeof flat) => s.labels.find((l) => l.text === '1')!.at;
		expect(one(flat).x).toBeLessThan(flat.width / 2);
		expect(one(turned).x).toBeGreaterThan(turned.width / 2);
	});

	it('retourner: oui : le dessin en miroir, les mêmes noms', () => {
		const lines = ['solide: cube', 'forme: 5', 'sommets: A B C D E F G H'];
		const flat = scene(...lines);
		const mirrored = scene(...lines, 'retourner: oui');
		expect(mirrored.labels.map((l) => l.text).sort()).toEqual(
			flat.labels.map((l) => l.text).sort()
		);
		expect(mirrored.drawingWidth).toBeCloseTo(flat.drawingWidth, 9);
	});

	it('retourner: oui sur une pyramide : même nombre de faces, sans chevauchement', () => {
		const net = patronNet(
			specOf('solide: pyramide rectangle 4 2 3', 'retourner: oui', 'tourner: 270')
		);
		expect(net.faces).toHaveLength(5);
		expect(net.overlap).toBeNull();
	});

	it('cotes: pavé 4 2 3 → « 4 cm », « 2 cm », « 3 cm », chacune une fois', () => {
		expect(texts('solide: pave 4 2 3', 'cotes: cm')).toEqual(['4 cm', '2 cm', '3 cm']);
	});

	it('cotes: cube 3 → une seule longueur ; pavé 4 4 3 → deux', () => {
		expect(texts('solide: cube 3', 'cotes: cm')).toEqual(['3 cm']);
		expect(texts('solide: pave 4 4 3', 'cotes: oui')).toEqual(['4', '3']);
	});

	it('cotes: cylindre → le rayon (en tirets) et la hauteur, jamais 2πr', () => {
		const s = scene('solide: cylindre 1 3', 'cotes: cm');
		expect(s.labels.map((l) => l.text)).toEqual(['1 cm', '3 cm']);
		expect(s.lines.filter((l) => l.kind === 'cache')).toHaveLength(1);
	});

	it('cotes: prisme isocèle → base, longueur, et la hauteur du triangle en tirets', () => {
		const s = scene('solide: prisme triangle 3 2 5', 'cotes: cm');
		expect(s.labels.map((l) => l.text).sort()).toEqual(['2 cm', '3 cm', '5 cm']);
		expect(s.lines.filter((l) => l.kind === 'cache')).toHaveLength(1);
	});

	it('cotes: pyramide → le côté de la base seulement', () => {
		expect(texts('solide: pyramide carree 4 3', 'cotes: cm')).toEqual(['4 cm']);
	});

	it('tout tient dans la boîte, étiquettes comprises', () => {
		const s = scene('solide: pave 4 2 3', 'sommets: A B C D E F G H', 'cotes: cm');
		for (const l of s.labels) {
			expect(l.at.x).toBeGreaterThan(0);
			expect(l.at.y).toBeGreaterThan(0);
			expect(l.at.x).toBeLessThan(s.width);
			expect(l.at.y).toBeLessThan(s.height);
		}
	});
});

describe('nom accessible', () => {
	it('jamais « patron » ni le nom du solide', () => {
		for (const lines of [
			['solide: cube'],
			['solide: cube', 'forme: faux 2'],
			['solide: cylindre 1 3']
		]) {
			const label = patronLabel(specOf(...lines));
			expect(label).toBe('Assemblage de polygones à plier');
		}
	});

	it('une face marquée par sa place est lue par son numéro (sa place est la question)', () => {
		expect(patronLabel(specOf('solide: cube', 'marquer: face dessus'))).not.toMatch(/dessus/);
	});

	it('numéros, marques et cotes lus', () => {
		expect(
			patronLabel(specOf('solide: pave 4 2 3', 'faces: numeros', 'marquer: face 2', 'cotes: cm'))
		).toBe(
			'Assemblage de polygones à plier, faces numérotées, face 2 marquée, longueurs 4 cm, 2 cm, 3 cm'
		);
	});
});
