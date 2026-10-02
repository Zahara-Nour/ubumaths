/**
 * Bloc ```courbe — tangente (décision de David du 2026-10-02, chantier dérivation)
 *
 * `tangente: f ; 1` trace la tangente à la courbe de f au point d'abscisse 1 (droite en
 * pointillés, découpée à la fenêtre) et son point de contact. La pente est calculée,
 * l'auteur n'écrit pas l'équation.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';

const WINDOW = 'x: -3 ; 3\ny: -2 ; 8';

function scene(source: string) {
	const node = parseCourbeContent(source);
	expect(node.errors).toEqual([]);
	return buildCourbeScene(node.spec!);
}

function errorOf(source: string): string {
	const node = parseCourbeContent(source);
	expect(node.spec).toBeNull();
	return node.errors.map((e) => e.message).join('\n');
}

describe('tangente — cas nominal', () => {
	it('tangente à x² en 1 : y = 2x − 1, point de contact (1 ; 1)', () => {
		const s = scene(`${WINDOW}\nf(x) = x^2   bleu\ntangente: f ; 1`);
		expect(s.tangents).toHaveLength(1);
		const t = s.tangents[0];
		expect(t.point).toEqual({ x: 1, y: 1 });
		expect(t.slope).toBeCloseTo(2, 9);
		expect(t.color).toBe('bleu');
		for (const p of t.line.flat()) expect(p.y).toBeCloseTo(2 * p.x - 1, 9);
		// Découpée à la fenêtre : y de −2 à 8 → x de −0,5 à 3
		const xs = t.line.flat().map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(-0.5, 9);
		expect(Math.max(...xs)).toBeCloseTo(3, 9);
		expect(s.warnings).toEqual([]);
	});

	it('abscisse calculée et fonction usuelle : tangente à √x en 4 (pente 1/4)', () => {
		const s = scene(`x: 0 ; 9\ny: -1 ; 4\nf(x) = sqrt(x)\ntangente: f ; 2^2`);
		expect(s.tangents[0].point).toEqual({ x: 4, y: 2 });
		expect(s.tangents[0].slope).toBeCloseTo(0.25, 9);
	});

	it('plusieurs tangentes, sur deux fonctions', () => {
		const s = scene(`${WINDOW}\nf(x) = x^2\ng(x) = x^3   rouge\ntangente: f ; -1\ntangente: g ; 0`);
		expect(s.tangents.map((t) => [t.slope, t.color])).toEqual([
			[expect.closeTo(-2, 9), 'bleu'],
			[expect.closeTo(0, 9), 'rouge']
		]);
	});

	it('tangente horizontale en un sommet', () => {
		const s = scene(`${WINDOW}\nf(x) = (x-1)^2+2\ntangente: f ; 1`);
		expect(s.tangents[0].slope).toBeCloseTo(0, 9);
		for (const p of s.tangents[0].line.flat()) expect(p.y).toBeCloseTo(2, 9);
	});
});

describe('tangente — erreurs et avertissements situés', () => {
	it('fonction inconnue', () => {
		expect(errorOf(`${WINDOW}\nf(x) = x^2\ntangente: g ; 1`)).toMatch(/Ligne 4 : .*tangente.*g/);
	});

	it('abscisse hors du domaine de f', () => {
		expect(errorOf(`${WINDOW}\nf(x) = x^2 sur [0 ; 2]\ntangente: f ; 3`)).toMatch(
			/Ligne 4 : .*domaine/
		);
	});

	it('fonction non dérivable ou non définie au point (1/x en 0)', () => {
		expect(errorOf(`${WINDOW}\nf(x) = 1/x\ntangente: f ; 0`)).toMatch(/Ligne 4 : /);
	});

	it('syntaxe : « fonction ; abscisse » attendu', () => {
		expect(errorOf(`${WINDOW}\nf(x) = x^2\ntangente: f`)).toMatch(/Ligne 4 : .*tangente/);
	});

	it('point de contact hors de la fenêtre : avertissement, rien de dessiné', () => {
		const s = scene(`${WINDOW}\nf(x) = x^2\ntangente: f ; 2.9`);
		expect(s.warnings.map((w) => w.message).join()).toMatch(/Ligne 4 : .*hors de la fenêtre/);
		expect(s.tangents).toEqual([]);
	});
});

describe('tangente — PDF et accessibilité', () => {
	it('Typst : une droite en pointillés et un point de contact par tangente', () => {
		const typst = generateCourbeTypst(parseCourbeContent(`${WINDOW}\nf(x) = x^2\ntangente: f ; 1`));
		expect(typst.split('// tangente f\n').length - 1).toBe(1);
		expect(typst.split('// contact f\n').length - 1).toBe(1);
		expect(typst).not.toContain('Figure indisponible');
	});

	it('aria-label mentionne la tangente', () => {
		const s = scene(`${WINDOW}\nf(x) = x^2\ntangente: f ; 1`);
		expect(s.ariaLabel).toMatch(/tangente/);
	});
});
