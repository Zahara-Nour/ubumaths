/**
 * Bloc ```courbe — courbe de données (`données:`) : points donnés, reliés par des segments
 *
 * Phase 0 validée par David le 2026-11-08 (`docs/wip/relier-points-progress.md` § 1) : clé
 * `données:` de ```courbe (Q1), sans `placer:` ni `tracer:` (Q2), une seule série (Q3), rien de
 * plus que la case à la correction (Q4). Débouchés : CM2-125, CM2-159.
 */
import { describe, it, expect } from 'vitest';
import { findCourbeBlocks, parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { COURBE_LIMITS, type CourbeNode, type CourbeSpec } from '../../types/courbe';

const WINDOW = [
	'x: 6 ; 20',
	'y: 0 ; 25',
	'grille: 2 ; 5',
	'axes: x = heure ; y = température (°C)'
];
const TEMPERATURES =
	'données: (6 ; 8) ; (8 ; 11) ; (10 ; 15) ; (12 ; 19) ; (14 ; 21) ; (16 ; 20) ; (18 ; 16) ; (20 ; 12)';
const block = (...lines: string[]) => parseCourbeContent(lines.join('\n'));

function spec(node: CourbeNode): CourbeSpec {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorsOf(node: CourbeNode): string {
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join(' | ');
}

describe('données: — analyse', () => {
	it('lit les points dans l’ordre des abscisses', () => {
		const s = spec(block(...WINDOW, TEMPERATURES));
		expect(s.donnees?.points).toEqual([
			{ x: 6, y: 8 },
			{ x: 8, y: 11 },
			{ x: 10, y: 15 },
			{ x: 12, y: 19 },
			{ x: 14, y: 21 },
			{ x: 16, y: 20 },
			{ x: 18, y: 16 },
			{ x: 20, y: 12 }
		]);
	});

	it('trie les points donnés dans le désordre', () => {
		const s = spec(block(...WINDOW, 'données: (10 ; 15) ; (6 ; 8) ; (8 ; 11)'));
		expect(s.donnees?.points.map((p) => p.x)).toEqual([6, 8, 10]);
	});

	it('accepte la virgule décimale et « donnees » sans accent', () => {
		const s = spec(block(...WINDOW, 'donnees: (6 ; 8,5) ; (7,5 ; 10)'));
		expect(s.donnees?.points).toEqual([
			{ x: 6, y: 8.5 },
			{ x: 7.5, y: 10 }
		]);
	});

	it('sans la clé, pas de champ donnees', () => {
		expect(spec(block(...WINDOW)).donnees).toBeUndefined();
	});

	it('refuse moins de deux points', () => {
		expect(errorsOf(block(...WINDOW, 'données: (6 ; 8)'))).toMatch(/au moins deux points/);
	});

	it('refuse deux points de même abscisse', () => {
		expect(errorsOf(block(...WINDOW, 'données: (6 ; 8) ; (6 ; 9)'))).toMatch(/même abscisse/);
	});

	it('refuse deux abscisses égales à l’arrondi près', () => {
		expect(errorsOf(block(...WINDOW, 'données: (0,1+0,2 ; 8) ; (0,3 ; 9)'))).toMatch(
			/même abscisse/
		);
	});

	it('bloc non fermé : « Données : … » en prose n’est pas avalé', () => {
		const lines = ['```courbe', ...WINDOW, TEMPERATURES, '', 'Données : voir le tableau.'];
		const [range] = findCourbeBlocks(lines);
		expect(range.closed).toBe(false);
		expect(range.endIndex).toBe(5);
	});

	it('refuse une coordonnée qui n’est pas un nombre', () => {
		expect(errorsOf(block(...WINDOW, 'données: (6 ; 8) ; (huit ; 9)'))).toMatch(/Ligne 5/);
	});

	it('refuse un point mal écrit', () => {
		expect(errorsOf(block(...WINDOW, 'données: (6 ; 8) ; 8 ; 9'))).toMatch(/mal écrit/);
	});

	it('refuse plus de points que le plafond', () => {
		const many = Array.from({ length: COURBE_LIMITS.dataPoints + 1 }, (_, i) => `(${i} ; 1)`);
		expect(errorsOf(block('x: 0 ; 30', 'y: 0 ; 5', `données: ${many.join(' ; ')}`))).toMatch(
			new RegExp(`au plus ${COURBE_LIMITS.dataPoints} points`)
		);
	});

	it('refuse données: avec placer: ou tracer:', () => {
		expect(errorsOf(block(...WINDOW, TEMPERATURES, 'placer: A=(8 ; 10)'))).toMatch(
			/données: et placer:/
		);
		expect(errorsOf(block(...WINDOW, TEMPERATURES, 'tracer: y = x'))).toMatch(
			/données: et tracer:/
		);
	});
});

describe('données: — scène', () => {
	it('une ligne brisée par les points, un repère par point', () => {
		const scene = buildCourbeScene(spec(block(...WINDOW, TEMPERATURES)));
		expect(scene.data.polylines).toHaveLength(1);
		expect(scene.data.polylines[0]).toHaveLength(8);
		expect(scene.data.marks).toHaveLength(8);
		expect(scene.data.marks[4]).toEqual({ x: 14, y: 21 });
	});

	it('point hors fenêtre : segment coupé au bord, pas de repère, un avertissement', () => {
		const scene = buildCourbeScene(
			spec(block(...WINDOW, 'données: (6 ; 8) ; (8 ; 30) ; (10 ; 15)'))
		);
		expect(scene.data.marks).toEqual([
			{ x: 6, y: 8 },
			{ x: 10, y: 15 }
		]);
		expect(scene.data.polylines).toHaveLength(2);
		for (const poly of scene.data.polylines)
			for (const p of poly) expect(p.y).toBeLessThanOrEqual(25);
		expect(scene.warnings.map((w) => w.message).join(' | ')).toMatch(/hors de la fenêtre/);
	});

	it('sans données:, rien', () => {
		const scene = buildCourbeScene(spec(block(...WINDOW)));
		expect(scene.data).toEqual({ polylines: [], marks: [] });
	});

	it('description accessible : courbe de données', () => {
		const scene = buildCourbeScene(spec(block(...WINDOW, TEMPERATURES)));
		expect(scene.ariaLabel).toMatch(/^Courbe de données de 8 points/);
	});
});

describe('données: — PDF', () => {
	it('la ligne brisée et un disque par point', () => {
		const typst = generateCourbeTypst(block(...WINDOW, TEMPERATURES));
		expect(typst.match(/\/\/ données$/gm)).toHaveLength(1);
		expect(typst.match(/\/\/ point de données$/gm)).toHaveLength(8);
	});
});
