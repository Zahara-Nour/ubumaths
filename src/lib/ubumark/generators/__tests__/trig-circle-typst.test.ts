/**
 * Cercle trigonométrique en Typst (CeTZ) : ce que le PDF dessine réellement.
 *
 * 2026-09-24 : dans le PDF, une équation (`equation: cos(x) = 1/2`) ne dessinait
 * aucun point, et l'arc d'une inéquation sortait du cercle — `arc()` de CeTZ prend
 * sa position pour le DÉBUT de l'arc, pas pour son centre.
 */
import { describe, it, expect } from 'vitest';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';
import { generateTrigCircleTypst } from '../trig-circle-typst';

function typst(block: string): string {
	const { node } = parseTrigCircleContent(block.trim().split('\n'));
	if (!node) throw new Error('bloc trig non analysé');
	return generateTrigCircleTypst(node);
}

/** Centres des points pleins dessinés (rayon du cercle : 2,5). */
function points(code: string): string[] {
	return [
		...code.matchAll(/circle\(\(([-\d.]+), ([-\d.]+)\), radius: 0\.06, fill: (?!white)/g)
	].map((m) => `${m[1]};${m[2]}`);
}

/** Arcs dessinés : [départ, arrivée, ancre]. */
function arcs(code: string): { start: number; stop: number; anchor: string | undefined }[] {
	return [
		...code.matchAll(
			/arc\(\(0, 0\), [^)]*start: ([-\d.]+)deg, stop: ([-\d.]+)deg(?:, anchor: "(\w+)")?/g
		)
	].map((m) => ({ start: Number(m[1]), stop: Number(m[2]), anchor: m[3] }));
}

describe('Cercle trigonométrique — équation', () => {
	it('cos(x) = 1/2 : les deux solutions sont dessinées et nommées', () => {
		const code = typst('preset: custom\nequation: cos(x) = 1/2');
		// π/3 → (1,25 ; 2,165) et 5π/3 → (1,25 ; −2,165)
		expect(points(code)).toEqual(expect.arrayContaining(['1.25;2.165', '1.25;-2.165']));
		expect(code).toContain('frac(pi, 3)');
		expect(code).toContain('frac(5pi, 3)');
	});

	it('un angle donné explicitement n’est pas dessiné deux fois', () => {
		const code = typst('preset: custom\nangles: pi/3\nequation: cos(x) = 1/2');
		expect(points(code).filter((p) => p === '1.25;2.165')).toHaveLength(1);
	});
});

describe('Cercle trigonométrique — inéquation', () => {
	it('l’arc est centré sur l’origine du repère', () => {
		const [arc] = arcs(typst('preset: custom\nequation: sin(x) >= sqrt(2)/2\nmode: arc'));
		expect(arc).toEqual({ start: 45, stop: 135, anchor: 'origin' });
	});

	it('cos(x) >= 1/2 : l’arc passe par 0 dans le sens direct (petit arc)', () => {
		const [arc] = arcs(typst('preset: custom\nequation: cos(x) >= 1/2\nmode: arc'));
		expect(arc.start).toBe(300);
		expect(arc.stop).toBe(420);
		expect(arc.anchor).toBe('origin');
	});
});

describe('Cercle trigonométrique — bornes des arcs', () => {
	/** Dernier cercle dessiné au point (x ; y) : c'est lui qu'on voit. */
	function dernierAuPoint(code: string, x: string, y: string): string {
		const tous = [
			...code.matchAll(/circle\(\(([-\d.]+), ([-\d.]+)\), radius: [\d.]+, fill: (\w+)/g)
		];
		const ici = tous.filter((m) => m[1] === x && m[2] === y);
		return ici[ici.length - 1]?.[3] ?? 'aucun';
	}

	it('borne exclue nommée (sin x > √2/2) : le rond vide est visible, pas le point plein', () => {
		const code = typst(
			'preset: custom\nangles: pi/4, 3pi/4\nequation: sin(x) > sqrt(2)/2\nmode: arc'
		);
		expect(dernierAuPoint(code, '1.768', '1.768')).toBe('white');
		expect(dernierAuPoint(code, '-1.768', '1.768')).toBe('white');
	});

	it('borne incluse (sin x >= √2/2) : rond plein', () => {
		const code = typst(
			'preset: custom\nangles: pi/4, 3pi/4\nequation: sin(x) >= sqrt(2)/2\nmode: arc'
		);
		expect(dernierAuPoint(code, '1.768', '1.768')).not.toBe('white');
	});
});
