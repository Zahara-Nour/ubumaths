/**
 * Bloc ```courbe — deux noms de courbe ne se superposent pas (2026-10-02)
 *
 * Le nom d'une courbe s'écartait des points nommés, pas des autres noms : deux courbes
 * proches (une courbe et sa tangente tracée en seconde fonction) donnaient « CT » dans le PDF.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';

const labels = (source: string) => {
	const node = parseCourbeContent(source);
	expect(node.errors).toEqual([]);
	return buildCourbeScene(node.spec!).curveLabels;
};

/** Deux étiquettes trop proches (même règle d'écart que pour les points : 8 % de la fenêtre) */
const tooClose = (
	a: { x: number; y: number },
	b: { x: number; y: number },
	wx: number,
	wy: number
) => Math.abs(a.x - b.x) / wx <= 0.08 && Math.abs(a.y - b.y) / wy <= 0.08;

describe('noms de courbes : pas de chevauchement', () => {
	it('courbe et tangente tracée comme seconde fonction : deux noms écartés', () => {
		const l = labels(
			'x: -3 ; 3\ny: -2 ; 8\nf(x) = x^2   bleu   nom=C_f\ng(x) = 2*x-1   rouge   pointillé   nom=T'
		);
		expect(l).toHaveLength(2);
		expect(tooClose(l[0], l[1], 6, 10)).toBe(false);
	});

	it('deux courbes presque confondues : noms écartés', () => {
		const l = labels('x: 0 ; 10\ny: 0 ; 10\nf(x) = x   nom=C_f\ng(x) = x+0.05   rouge   nom=C_g');
		expect(tooClose(l[0], l[1], 10, 10)).toBe(false);
	});

	it('trois courbes : aucune paire de noms trop proche', () => {
		const l = labels(
			'x: 0 ; 10\ny: 0 ; 10\nf(x) = x   nom=C_f\ng(x) = x+0.05   rouge   nom=C_g\nh(x) = x-0.05   vert   nom=C_h'
		);
		for (let i = 0; i < l.length; i++)
			for (let j = i + 1; j < l.length; j++) expect(tooClose(l[i], l[j], 10, 10)).toBe(false);
	});

	it('une seule courbe : position inchangée (80 % du plus long morceau)', () => {
		const l = labels('x: 0 ; 10\ny: 0 ; 10\nf(x) = x   nom=C_f');
		expect(l[0].x).toBeGreaterThan(7);
	});
});
