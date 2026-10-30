/**
 * Bloc ```solide : la scène (calcul pur, partagé écran / PDF) — chantier `solides`, § 8
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { SolideSpec } from '$lib/ubumark/types/espace';
import {
	SOLIDE_SIZE,
	buildSolideScene,
	solideLabel,
	type SolideLine
} from '$lib/ubumark/utils/espace-solides';

const specOf = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'solide');
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const scene = (...lines: string[]) => buildSolideScene(specOf(...lines));
const dashed = (lines: SolideLine[]) => lines.filter((l) => l.dashed);
const plain = (lines: SolideLine[]) => lines.filter((l) => !l.dashed);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('polyèdres : arêtes cachées calculées', () => {
	it('pavé : 9 arêtes pleines, 3 en tirets', () => {
		const { lines } = scene('forme: pave 4 2 3');
		expect(plain(lines)).toHaveLength(9);
		expect(dashed(lines)).toHaveLength(3);
	});

	it('pavé : les arêtes cachées partent toutes de D (fond, bas, gauche)', () => {
		const s = scene('forme: pave 4 2 3', 'sommets: A B C D E F G H');
		const d = s.labels.find((l) => l.text === 'D')!;
		// D est le sommet commun aux trois tirets : chaque tiret a un bout au point D
		const dPoint = s.vertices[3];
		for (const line of dashed(s.lines)) {
			const ends = [line.points[0], line.points[line.points.length - 1]];
			expect(ends.some((p) => near(p.x, dPoint.x) && near(p.y, dPoint.y))).toBe(true);
		}
		expect(d).toBeDefined();
	});

	it('cube : même compte que le pavé', () => {
		const { lines } = scene('forme: cube 2');
		expect(plain(lines)).toHaveLength(9);
		expect(dashed(lines)).toHaveLength(3);
	});

	it('pyramide à base carrée : 3 tirets, ceux de D (DA, DC, SD)', () => {
		const { lines } = scene('forme: pyramide carree 4 3');
		expect(lines).toHaveLength(8);
		expect(dashed(lines)).toHaveLength(3);
	});

	it('prisme droit à base triangle : 9 arêtes, la base arrière en partie cachée', () => {
		const { lines } = scene('forme: prisme triangle 4 3 5');
		expect(lines).toHaveLength(9);
		expect(dashed(lines).length).toBeGreaterThan(0);
	});

	it('pyramide à base triangle : 6 arêtes', () => {
		expect(scene('forme: pyramide triangle 4 3').lines).toHaveLength(6);
	});

	it('cachees: non → aucun tiret', () => {
		expect(dashed(scene('forme: pave 4 2 3', 'cachees: non').lines)).toHaveLength(0);
		expect(dashed(scene('forme: cylindre 2 5', 'cachees: non').lines)).toHaveLength(0);
	});
});

describe('échelle : plus grand côté à 4 cm', () => {
	it('un pavé 8 × 5 × 3 et un cube 2 ont la même taille', () => {
		for (const s of [scene('forme: pave 8 5 3'), scene('forme: cube 2'), scene('forme: boule 3')]) {
			expect(near(Math.max(s.drawingWidth, s.drawingHeight), SOLIDE_SIZE)).toBe(true);
		}
	});

	it('la face avant d’un pavé est en vraie proportion (l × h)', () => {
		const s = scene('forme: pave 4 2 3', 'sommets: A B C D E F G H');
		const [a, b, , , e] = s.vertices;
		expect(near((b.x - a.x) / (a.y - e.y), 4 / 3)).toBe(true);
	});

	it('repère SVG : y vers le bas, tout dans la boîte', () => {
		const s = scene('forme: cone 2 4', 'sommets: S O', 'cotes: cm');
		const all = [...s.lines.flatMap((l) => l.points), ...s.labels.map((l) => l.at)];
		for (const p of all) {
			expect(p.x).toBeGreaterThanOrEqual(-1e-9);
			expect(p.y).toBeGreaterThanOrEqual(-1e-9);
			expect(p.x).toBeLessThanOrEqual(s.width + 1e-9);
			expect(p.y).toBeLessThanOrEqual(s.height + 1e-9);
		}
		// le sommet S est au-dessus de O
		expect(s.vertices[0].y).toBeLessThan(s.vertices[1].y);
	});
});

describe('solides ronds', () => {
	it('cylindre : demi-ellipse arrière du bas en tirets, le reste plein', () => {
		const { lines } = scene('forme: cylindre 2 5');
		expect(dashed(lines)).toHaveLength(1);
		// deux génératrices + ellipse du haut + demi-ellipse avant du bas
		expect(plain(lines)).toHaveLength(4);
	});

	it('cône : génératrices TANGENTES à l’ellipse (pas aux bouts du grand axe)', () => {
		const s = scene('forme: cone 2 4', 'sommets: S O');
		const [apex, center] = s.vertices;
		const generatrices = plain(s.lines).filter((l) => l.points.length === 2);
		expect(generatrices).toHaveLength(2);
		for (const g of generatrices) {
			const foot = g.points.find((p) => !(near(p.x, apex.x) && near(p.y, apex.y)))!;
			// le pied est au-dessus du centre (côté du fond), pas sur le grand axe
			expect(foot.y).toBeLessThan(center.y);
		}
		expect(dashed(s.lines)).toHaveLength(1);
	});

	it('boule : un cercle, l’équateur avant plein, l’arrière en tirets', () => {
		const { lines } = scene('forme: boule 3');
		expect(dashed(lines)).toHaveLength(1);
		expect(plain(lines)).toHaveLength(2);
	});

	it('un centre nommé est dessiné', () => {
		expect(scene('forme: boule 3', 'sommets: O').dots).toHaveLength(1);
		expect(scene('forme: boule 3').dots).toHaveLength(0);
	});
});

describe('noms, marques, cotes', () => {
	it('8 noms posés à l’extérieur du sommet', () => {
		const s = scene('forme: cube 2', 'sommets: A B C D E F G H');
		expect(s.labels.map((l) => l.text)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
		// A (devant bas gauche) : son nom est à gauche et en dessous du point
		expect(s.labels[0].at.x).toBeLessThan(s.vertices[0].x);
		expect(s.labels[0].at.y).toBeGreaterThan(s.vertices[0].y);
	});

	it('« - » : pas d’étiquette', () => {
		expect(scene('forme: cone 2 4', 'sommets: S -').labels.map((l) => l.text)).toEqual(['S']);
	});

	it('face marquée : un polygone teinté ; arête marquée : épaisse ; sommet : un point', () => {
		const s = scene(
			'forme: pave 4 2 3',
			'sommets: A B C D E F G H',
			'marquer: face EFGH, arete AE, sommet G'
		);
		expect(s.fills).toHaveLength(1);
		expect(s.fills[0]).toHaveLength(4);
		expect(s.lines.filter((l) => l.thick)).toHaveLength(1);
		expect(s.dots).toHaveLength(1);
	});

	it('arête cachée marquée : épaisse ET en tirets', () => {
		const s = scene('forme: pave 4 2 3', 'sommets: A B C D E F G H', 'marquer: arete DH');
		const thick = s.lines.filter((l) => l.thick);
		expect(thick).toHaveLength(1);
		expect(thick[0].dashed).toBe(true);
	});

	it('cotes du pavé : les trois dimensions, à la française', () => {
		const s = scene('forme: pave 4,5 2 3', 'cotes: cm');
		expect(s.labels.map((l) => l.text).sort()).toEqual(['2 cm', '3 cm', '4,5 cm']);
	});

	it('cotes du cube : une seule', () => {
		expect(scene('forme: cube 2', 'cotes: oui').labels.map((l) => l.text)).toEqual(['2']);
	});

	it('cotes du cône : rayon et hauteur tracés en tirets (intérieurs)', () => {
		const s = scene('forme: cone 2 4', 'cotes: cm');
		expect(s.labels.map((l) => l.text).sort()).toEqual(['2 cm', '4 cm']);
		expect(dashed(s.lines)).toHaveLength(3);
	});

	it('cotes du cylindre : un rayon sur le dessus (plein), la hauteur', () => {
		const s = scene('forme: cylindre 2 5', 'cotes: cm');
		expect(s.labels.map((l) => l.text).sort()).toEqual(['2 cm', '5 cm']);
		expect(plain(s.lines)).toHaveLength(5);
	});
});

describe('nom accessible : jamais le nom du solide', () => {
	it('neutre, avec les marques et les cotes', () => {
		expect(solideLabel(specOf('forme: pyramide carree 4 3'))).toBe(
			'Solide en perspective cavalière'
		);
		const label = solideLabel(
			specOf('forme: pave 4 2 3', 'sommets: A B C D E F G H', 'marquer: face ABCD', 'cotes: cm')
		);
		expect(label).toBe(
			'Solide en perspective cavalière, face ABCD marquée, longueurs 4 cm, 2 cm, 3 cm'
		);
		expect(label).not.toMatch(/pavé/i);
	});
});
