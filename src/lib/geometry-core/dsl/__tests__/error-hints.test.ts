import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';

/**
 * Tests for the post-migration error hints. These verify that misuses of
 * the new accessor/visibility/polar API produce clear, actionable errors —
 * not just generic "wrong type" messages.
 */

describe('migration hints — destructuring after stdlib migration', () => {
	it('(M, d) = mediatrice(A, B) — hint about the new pattern', () => {
		expect(() =>
			runDsl(['A = point(0, 0)', 'B = point(4, 0)', '(M, d) = mediatrice(A, B)'].join('\n'))
		).toThrow(/mediatrice.*plus.*tuple|d = mediatrice|milieu\(A, B\)/i);
	});

	it('(O, c) = cercle_circonscrit(...) — hint about centre()', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(2, 3)',
					'(O, c) = cercle_circonscrit(A, B, C)'
				].join('\n')
			)
		).toThrow(/cercle_circonscrit|centre\(c\)/i);
	});

	it('(C, D) = rectangle(...) — hint about sommets()', () => {
		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(4, 0)', '(C, D) = rectangle(A, B, largeur=3)'].join('\n')
			)
		).toThrow(/rectangle|sommets\(p\)|sommet\(p, i\)/i);
	});

	it('arity mismatch hint when both sides have wrong count', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(2, 3)',
					'(O, c, extra) = cercle_circonscrit(A, B, C)'
				].join('\n')
			)
		).toThrow(/cercle_circonscrit|tuple/i);
	});
});

describe('direction conflicts — point() / segment() polar form', () => {
	it('point(A, longueur=5, angle=30, direction=B) raises ambiguity error', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 1)',
					'C = point(A, longueur=5, angle=30, direction=B)'
				].join('\n')
			)
		).toThrow(/ambig|seul.*parmi/i);
	});

	it('point(A, longueur=5, angle=30, vecteur=u) raises ambiguity error', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'u = vecteur(1, 0)',
					'C = point(A, longueur=5, angle=30, vecteur=u)'
				].join('\n')
			)
		).toThrow(/ambig|seul.*parmi/i);
	});

	it('point(A, longueur=5, direction=B, vecteur=u) raises ambiguity error', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 1)',
					'u = vecteur(1, 0)',
					'C = point(A, longueur=5, direction=B, vecteur=u)'
				].join('\n')
			)
		).toThrow(/ambig|seul.*parmi/i);
	});

	it('segment with multiple directions raises ambiguity', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 1)',
					's = segment(A, longueur=5, angle=30, direction=B)'
				].join('\n')
			)
		).toThrow(/ambig|seul.*parmi/i);
	});
});

describe('cross-references — accessors on wrong types', () => {
	it('extremite(c) on a cercle hints about centre()', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'c = cercle(O, rayon=2)', 'P = extremite(c, 1)'].join('\n'))
		).toThrow(/centre\(c\)/);
	});

	it('extremite(p) on a polygon hints about sommet()', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(1, 0)',
					'C = point(0, 1)',
					'p = polygone(A, B, C)',
					'P = extremite(p, 1)'
				].join('\n')
			)
		).toThrow(/sommet\(p, i\)|sommets\(p\)/);
	});

	it('sommet(s) on a segment hints about extremite()', () => {
		expect(() =>
			runDsl(
				['A = point(0, 0)', 'B = point(1, 0)', 's = segment(A, B)', 'P = sommet(s, 1)'].join('\n')
			)
		).toThrow(/extremite\(s, 1\)|extremite\(s, 2\)/);
	});

	it('sommet(c) on a circle hints about centre()', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'c = cercle(O, rayon=2)', 'P = sommet(c, 1)'].join('\n'))
		).toThrow(/centre\(c\)/);
	});

	it('milieu(c) on a circle hints about centre()', () => {
		expect(() =>
			runDsl(['O = point(0, 0)', 'c = cercle(O, rayon=2)', 'P = milieu(c)'].join('\n'))
		).toThrow(/centre\(c\)/);
	});

	it('milieu(P) on a single point hints about milieu(A, B)', () => {
		expect(() => runDsl(['A = point(0, 0)', 'P = milieu(A)'].join('\n'))).toThrow(/milieu\(A, B\)/);
	});

	it('milieu(d) on a droite hints about no midpoint (infinite)', () => {
		expect(() =>
			runDsl(['A = point(0, 0)', 'B = point(1, 0)', 'd = droite(A, B)', 'P = milieu(d)'].join('\n'))
		).toThrow(/longueur infinie|infinie/);
	});
});

describe('type errors — passing wrong value types', () => {
	it('requireElement on a number produces a structured error', () => {
		expect(() => runDsl(['P = milieu(3, 5)'].join('\n'))).toThrow(
			/(e|é)l(e|é)ment g(e|é)om(e|é)trique|nombre.*re(c|ç)u/i
		);
	});

	it('requireNumber on a string produces a clear error', () => {
		expect(() => runDsl(['A = point(0, 0)', 'c = cercle(A, rayon="five")'].join('\n'))).toThrow(
			/nombre|num(e|é)rique|cha(i|î)ne|re(c|ç)u|valeur/i
		);
	});

	it('requireElement hint for nombre suggests creating a point first', () => {
		expect(() => runDsl(['style(42, couleur="red")'].join('\n'))).toThrow(/point\(x, y\)|nombre/i);
	});
});
