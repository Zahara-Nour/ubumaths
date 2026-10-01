/**
 * Bloc ```courbe — escalier d'une suite récurrente (décision de David du 2026-10-01)
 *
 * Comportements E1 à E9 de docs/wip/suites-1spe-progress.md, lot 0.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import type { CourbeNode, CourbeSpec } from '../../types/courbe';

function spec(node: CourbeNode): CourbeSpec {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

function errorOf(source: string): string {
	const node = parseCourbeContent(source);
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join('\n');
}

const WINDOW = 'x: -1 ; 7\ny: -1 ; 7';

/** u0 = 0.5, u(n+1) = 0.5 u(n) + 3 : 0.5 ; 3.25 ; 4.625 ; 5.3125 ; 5.65625 */
const SOURCE = `${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   rouge   escalier`;
const TERMS = [0.5, 3.25, 4.625, 5.3125, 5.65625];

describe('escalier — cas nominal (E1, E2)', () => {
	it('l’option escalier est lue, la relation est gardée en x', () => {
		const s = spec(parseCourbeContent(SOURCE));
		const u = s.sequences[0];
		expect(u.color).toBe('rouge');
		expect(u.staircase).not.toBeNull();
		expect(u.staircase!.showTerms).toBe(false);
		expect(u.terms.map((t) => t.value)).toEqual(TERMS);
	});

	it('une suite sans option reste un nuage (staircase null)', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nu(0) = 1 ; u(n+1) = u(n)+1 pour n de 0 à 4`));
		expect(s.sequences[0].staircase).toBeNull();
		expect(buildCourbeScene(s).sequences[0].staircase).toBeNull();
	});

	it('escalier : (u0 ; 0) → (u0 ; u1) → (u1 ; u1) → … , une marche par rang', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(SOURCE)));
		const st = scene.sequences[0].staircase!;
		const expected = [{ x: 0.5, y: 0 }];
		for (let k = 0; k < TERMS.length - 1; k++) {
			expected.push({ x: TERMS[k], y: TERMS[k + 1] });
			expected.push({ x: TERMS[k + 1], y: TERMS[k + 1] });
		}
		expect(st.steps).toEqual([expected]);
		expect(scene.warnings).toEqual([]);
	});

	it('pas de nuage de points dans le repère (u_n ; u_{n+1})', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(SOURCE)));
		expect(scene.sequences[0].terms).toEqual([]);
	});

	it('courbe de la relation f et droite y = x, coupées à la fenêtre', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(SOURCE)));
		const st = scene.sequences[0].staircase!;
		expect(st.curve.length).toBeGreaterThan(0);
		for (const poly of st.curve) {
			for (const p of poly) {
				expect(p.y).toBeCloseTo(0.5 * p.x + 3, 6);
				expect(p.x).toBeGreaterThanOrEqual(-1 - 1e-9);
				expect(p.y).toBeLessThanOrEqual(7 + 1e-9);
			}
		}
		expect(st.diagonal).toEqual([
			[
				{ x: -1, y: -1 },
				{ x: 7, y: 7 }
			]
		]);
	});

	it('sans « termes » : ni rappels ni étiquettes', () => {
		const st = buildCourbeScene(spec(parseCourbeContent(SOURCE))).sequences[0].staircase!;
		expect(st.guides).toEqual([]);
		expect(st.termLabels).toEqual([]);
	});
});

describe('escalier — option termes (E3)', () => {
	const WITH_TERMS = SOURCE.replace('escalier', 'escalier termes');

	it('rappels pointillés de (u_k ; u_k) à l’axe des abscisses, pour k ≥ 1', () => {
		const s = spec(parseCourbeContent(WITH_TERMS));
		expect(s.sequences[0].staircase!.showTerms).toBe(true);
		const st = buildCourbeScene(s).sequences[0].staircase!;
		expect(st.guides).toEqual(
			TERMS.slice(1).map((v) => ({ from: { x: v, y: v }, to: { x: v, y: 0 } }))
		);
	});

	it('étiquettes u_k sous l’axe, celles trop proches d’une précédente omises', () => {
		const st = buildCourbeScene(spec(parseCourbeContent(WITH_TERMS))).sequences[0].staircase!;
		// u4 − u3 ≈ 0,34 < 5 % de la largeur (0,4, taille moyenne) : u4 omise
		expect(st.termLabels).toEqual([
			{ n: 0, x: 0.5 },
			{ n: 1, x: 3.25 },
			{ n: 2, x: 4.625 },
			{ n: 3, x: 5.3125 }
		]);
	});

	it('écart minimal selon la taille : u1 gardée en moyenne, omise en petite', () => {
		// 1,5 ; 2 ; 3 : u1 − u0 = 0,5, soit 5 % d'une largeur de 10
		const source = (size: string) =>
			`x: 0 ; 10\ny: 0 ; 10\ntaille: ${size}\nu(0) = 1.5 ; u(n+1) = 2*u(n)-1 pour n de 0 à 2   escalier termes`;
		const ranks = (size: string) =>
			buildCourbeScene(
				spec(parseCourbeContent(source(size)))
			).sequences[0].staircase!.termLabels.map((l) => l.n);
		expect(ranks('moyenne')).toEqual([0, 1, 2]);
		expect(ranks('petite')).toEqual([0, 2]);
	});

	it('l’ordre des options est libre (termes escalier, couleur au milieu)', () => {
		const s = spec(
			parseCourbeContent(
				`${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   termes   vert   escalier`
			)
		);
		expect(s.sequences[0].staircase).toMatchObject({ showTerms: true });
		expect(s.sequences[0].color).toBe('vert');
	});
});

describe('escalier — fenêtre (E4)', () => {
	it('escalier qui sort de la fenêtre : coupé au bord, avertissement situé', () => {
		const s = spec(
			parseCourbeContent(
				`x: 0 ; 10\ny: 0 ; 10\nu(0) = 1 ; u(n+1) = 2*u(n) pour n de 0 à 5   escalier termes`
			)
		);
		const scene = buildCourbeScene(s);
		const st = scene.sequences[0].staircase!;
		for (const poly of st.steps) {
			for (const p of poly) {
				expect(p.x).toBeLessThanOrEqual(10 + 1e-9);
				expect(p.y).toBeLessThanOrEqual(10 + 1e-9);
			}
		}
		// u1..u3 = 2, 4, 8 visibles ; u4 = 16 et u5 = 32 hors fenêtre : pas de rappel
		expect(st.guides.map((g) => g.from.x)).toEqual([2, 4, 8]);
		expect(st.termLabels.map((l) => l.n)).toEqual([0, 1, 2, 3]);
		expect(scene.warnings).toHaveLength(1);
		expect(scene.warnings[0].message).toMatch(/^Ligne 3 : l'escalier de u sort de la fenêtre/);
	});
});

describe('escalier — relecture du 2026-10-01', () => {
	it('axe des abscisses au bord (y_min > 0) : l’escalier part de l’axe, sans avertissement', () => {
		const scene = buildCourbeScene(
			spec(
				parseCourbeContent(
					`x: 1 ; 5\ny: 1 ; 5\nu(0) = 2 ; u(n+1) = 0.5*u(n)+1.5 pour n de 0 à 4   escalier`
				)
			)
		);
		expect(scene.sequences[0].staircase!.steps[0][0]).toEqual({ x: 2, y: 1 });
		expect(scene.warnings).toEqual([]);
	});

	it('un seul escalier : relation en noir', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(SOURCE)));
		expect(scene.sequences[0].staircase!.relationColor).toBe('noir');
	});

	it('deux escaliers : chaque relation prend la couleur de son escalier (et son nom aussi)', () => {
		const scene = buildCourbeScene(
			spec(
				parseCourbeContent(
					`${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   rouge   escalier   nom=C_f\nv(0) = 1 ; v(n+1) = 0.8*v(n)+1 pour n de 0 à 4   vert   escalier   nom=C_g`
				)
			)
		);
		expect(scene.sequences.map((q) => q.staircase!.relationColor)).toEqual(['rouge', 'vert']);
		expect(scene.curveLabels.map((l) => l.color)).toEqual(['rouge', 'vert']);
		const typst = generateCourbeTypst(
			parseCourbeContent(
				`${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   rouge   escalier\nv(0) = 1 ; v(n+1) = 0.8*v(n)+1 pour n de 0 à 4   vert   escalier`
			)
		);
		const relations = typst.split('\n').filter((l, i, all) => all[i - 1]?.includes('// relation'));
		expect(relations.some((l) => l.includes('#dc2626'))).toBe(true);
		expect(relations.some((l) => l.includes('#15803d'))).toBe(true);
	});

	it('deux escaliers : une seule droite y = x', () => {
		const scene = buildCourbeScene(
			spec(
				parseCourbeContent(
					`${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   escalier\nv(0) = 6.5 ; v(n+1) = 0.5*v(n)+3 pour n de 0 à 4   vert   escalier`
				)
			)
		);
		const diagonals = scene.sequences.flatMap((q) => q.staircase!.diagonal);
		expect(diagonals).toHaveLength(1);
	});

	it('courbe de la relation hors fenêtre : avertissement situé (le nom n’est pas dessiné)', () => {
		const scene = buildCourbeScene(
			spec(
				parseCourbeContent(
					`${WINDOW}\nu(0) = 1 ; u(n+1) = u(n)+20 pour n de 0 à 1   escalier   nom=C_f`
				)
			)
		);
		expect(scene.curveLabels).toEqual([]);
		expect(scene.warnings.map((w) => w.message)).toContain(
			"Ligne 3 : la courbe de la relation de u n'apparaît pas dans la fenêtre"
		);
	});
});

describe('escalier — erreurs situées (E5, E6, E7)', () => {
	it('suite explicite (E5)', () => {
		expect(errorOf(`${WINDOW}\nu(n) = 2*n pour n de 0 à 5   escalier`)).toMatch(
			/Ligne 3 : .*escalier.*récurrente/
		);
	});

	it('relation qui dépend de n (E6)', () => {
		expect(errorOf(`${WINDOW}\nu(0) = 1 ; u(n+1) = u(n)+n pour n de 0 à 5   escalier`)).toMatch(
			/Ligne 3 : .*escalier.*sans n/
		);
	});

	it('escalier et nuage dans la même figure (E7)', () => {
		expect(
			errorOf(
				`${WINDOW}\nu(0) = 1 ; u(n+1) = 0.5*u(n)+1 pour n de 0 à 5   escalier\nv(n) = n pour n de 0 à 5`
			)
		).toMatch(/escalier.*nuage|nuage.*escalier/);
	});

	it('« termes » sans « escalier »', () => {
		expect(errorOf(`${WINDOW}\nu(0) = 1 ; u(n+1) = u(n)+1 pour n de 0 à 5   termes`)).toMatch(
			/Ligne 3 : .*termes.*escalier/
		);
	});

	it('« escalier » sur une fonction', () => {
		expect(errorOf(`${WINDOW}\nf(x) = x^2   escalier`)).toMatch(/Ligne 3 : .*escalier/);
	});

	it('deux suites en escalier dans la même figure : acceptées', () => {
		const s = spec(
			parseCourbeContent(
				`${WINDOW}\nu(0) = 0.5 ; u(n+1) = 0.5*u(n)+3 pour n de 0 à 4   escalier\nv(0) = 6 ; v(n+1) = 0.5*v(n)+3 pour n de 0 à 4   vert   escalier`
			)
		);
		expect(s.sequences.every((q) => q.staircase !== null)).toBe(true);
	});
});

describe('escalier — Typst et écran : même scène (E8, E9)', () => {
	const WITH_TERMS = SOURCE.replace('escalier', 'escalier termes');

	it('autant de primitives Typst que la scène en contient', () => {
		const node = parseCourbeContent(WITH_TERMS);
		const st = buildCourbeScene(node.spec!).sequences[0].staircase!;
		const typst = generateCourbeTypst(node);
		const count = (marker: string) => typst.split(`// ${marker}\n`).length - 1;
		expect(count('escalier u')).toBe(st.steps.length);
		expect(count('relation u')).toBe(st.curve.length);
		expect(count('diagonale')).toBe(st.diagonal.length);
		expect(count('rappel u')).toBe(st.guides.length);
		expect(count('rang u')).toBe(st.termLabels.length);
		expect(count('terme u')).toBe(0);
		expect(typst).not.toContain('Figure indisponible');
		expect(typst).toContain('$u_(3)$');
	});

	it('libellé accessible : mentionne l’escalier (E9)', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(SOURCE)));
		expect(scene.ariaLabel).toBe('Escalier de la suite u, x de −1 à 7');
	});

	it('nom= nomme la courbe de la relation (E9)', () => {
		const scene = buildCourbeScene(spec(parseCourbeContent(`${SOURCE}   nom=C_f`)));
		expect(scene.curveLabels).toHaveLength(1);
		const l = scene.curveLabels[0];
		expect(l.label.base).toBe('C');
		expect(l.y).toBeCloseTo(0.5 * l.x + 3, 6);
	});
});
