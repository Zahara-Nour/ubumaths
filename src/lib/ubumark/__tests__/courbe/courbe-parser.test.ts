/**
 * Bloc ```courbe — analyse du texte (comportements validés le 2026-10-01)
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent, findCourbeBlocks } from '../../parser/courbe-parser';
import { createSafeEvaluator } from '$lib/mathAST/eval/compile';
import { resolveMarkdownContent } from '$lib/questions/generator/content-resolver';
import type { CourbeNode } from '../../types/courbe';

function spec(node: CourbeNode) {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

const MINIMAL = `x: -4 ; 6
y: -8 ; 12
f(x) = x^2 - 2`;

describe('courbe — bloc minimal (comportement 1)', () => {
	it('produit un nœud courbe avec fenêtre et fonction', () => {
		const node = parseCourbeContent(MINIMAL);
		expect(node.type).toBe('courbe');
		expect(node.source).toBe(MINIMAL);
		const s = spec(node);
		expect(s.window).toEqual({ xMin: -4, xMax: 6, yMin: -8, yMax: 12 });
		expect(s.functions).toHaveLength(1);
		expect(s.functions[0].name).toBe('f');
		expect(s.grid).toBeNull();
		expect(s.size).toBe('moyenne');
		expect(s.functions[0].color).toBe('bleu');
	});

	it('lit `x--2` comme `x+2` et `+-3` comme `-3` (variables de template remplacées avant)', () => {
		const node = parseCourbeContent(`x: -4 ; 6\ny: -8 ; 12\nf(x) = 2*(x--2)+-3`);
		const f = spec(node).functions[0];
		expect(f.expression).toBe('2*(x+2)-3');
		const ev = createSafeEvaluator(f.ast);
		expect(ev(1)).toBe(3);
	});

	it('une variable de template est déjà remplacée quand le bloc est lu', () => {
		const resolved = String(
			resolveMarkdownContent(
				'```courbe\nx: -4 ; 6\ny: -8 ; 12\nf(x) = {{a}}*(x-{{x1}})+{{c}}\npoints: A({{x1}};0)\n```',
				[
					{ name: 'a', value: '2' },
					{ name: 'x1', value: '-2' },
					{ name: 'c', value: '0.5' }
				]
			)
		);
		const body = resolved.split('\n').slice(1, -1).join('\n');
		const s = spec(parseCourbeContent(body));
		expect(s.functions[0].expression).toBe('2*(x+2)+0.5');
		expect(s.points[0]).toMatchObject({ name: 'A', x: -2, y: 0 });
	});

	it('lit options : couleur, pointillé, nom LaTeX, domaine', () => {
		const node = parseCourbeContent(`x: -4 ; 6
y: -8 ; 12
grille: 1 ; 2
f(x) = -(x-1)*(x-3)   rouge   nom=\\mathcal{C}_f
g(x) = 2*x + 1 sur ]-1 ; 4]   vert pointillé
taille: grande
description: Deux courbes.`);
		const s = spec(node);
		expect(s.grid).toEqual({ x: 1, y: 2 });
		expect(s.size).toBe('grande');
		expect(s.description).toBe('Deux courbes.');
		const [f, g] = s.functions;
		expect(f.color).toBe('rouge');
		expect(f.label).toEqual({ latex: '\\mathcal{C}_f', base: 'C', sub: 'f', calligraphic: true });
		expect(g.expression).toBe('2*x + 1');
		expect(g.dashed).toBe(true);
		expect(g.color).toBe('vert');
		expect(g.domain).toEqual({ min: -1, max: 4, minOpen: true, maxOpen: false });
	});

	it('accepte `\\pi` et `pi` dans la fenêtre', () => {
		const s = spec(parseCourbeContent('x: -pi ; 2*\\pi\ny: -1 ; 1\nf(x) = sin(x)'));
		expect(s.window.xMin).toBeCloseTo(-Math.PI);
		expect(s.window.xMax).toBeCloseTo(2 * Math.PI);
	});
});

describe('courbe — points, asymptotes, aires', () => {
	it('points nommés à coordonnées calculées, dont f(2) sur la courbe (Q54)', () => {
		const node = parseCourbeContent(`x: -4 ; 6
y: -8 ; 12
f(x) = -(x+2)*(x-4)
points: A(-2;0), B(4 ; 0), S(1 ; 9), M(2 ; f(2)), N(1/2 ; f(1/2) + 1)`);
		const s = spec(node);
		expect(s.points.map((p) => p.name)).toEqual(['A', 'B', 'S', 'M', 'N']);
		expect(s.points[3]).toMatchObject({ x: 2, y: 8 });
		expect(s.points[4].y).toBeCloseTo(8.75 + 1);
	});

	it('asymptotes données', () => {
		const s = spec(
			parseCourbeContent('x: -4 ; 6\ny: -8 ; 12\nf(x) = 1/(x-2) + 1\nasymptotes: x=2 ; y=1')
		);
		expect(s.asymptotes).toEqual([
			{ kind: 'vertical', value: 2, line: 4 },
			{ kind: 'horizontal', value: 1, line: 4 }
		]);
	});

	it('aire : fonction et bornes (comportement 6)', () => {
		const s = spec(parseCourbeContent('x: -4 ; 6\ny: -8 ; 12\nf(x) = x^2\naire: f ; -1 ; 2'));
		expect(s.areas).toEqual([{ functionName: 'f', from: -1, to: 2, line: 4 }]);
	});
});

describe('courbe — erreurs situées (comportements 6 et 7, Q48)', () => {
	function errorOf(source: string): { message: string; line?: number } {
		const node = parseCourbeContent(source);
		expect(node.type).toBe('courbe');
		expect(node.spec).toBeNull();
		expect(node.errors.length).toBeGreaterThan(0);
		return node.errors[0];
	}

	it('y max ≤ y min', () => {
		const e = errorOf('x: -4 ; 6\ny: 3 ; 3\nf(x) = x');
		expect(e.line).toBe(2);
		expect(e.message).toMatch(/y/);
	});

	it('expression illisible', () => {
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = 2*(x+1');
		expect(e.line).toBe(3);
		expect(e.message).toMatch(/illisible/i);
	});

	it('clé inconnue', () => {
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\ncouleur: bleu');
		expect(e.line).toBe(3);
		expect(e.message).toMatch(/couleur/);
	});

	it('fonction pas en x (variable déclarée ou expression)', () => {
		expect(errorOf('x: -4 ; 6\ny: -8 ; 12\nf(t) = t^2').line).toBe(3);
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x + t');
		expect(e.line).toBe(3);
		expect(e.message).toMatch(/t/);
	});

	it('aire à bornes inversées', () => {
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\naire: f ; 2 ; -1');
		expect(e.line).toBe(4);
	});

	it('aire sur une fonction inconnue', () => {
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x\naire: g ; -1 ; 2');
		expect(e.line).toBe(4);
		expect(e.message).toMatch(/g/);
	});

	it('fenêtre absente', () => {
		const e = errorOf('f(x) = x');
		expect(e.message).toMatch(/x:/);
	});

	it('point appelant une fonction inconnue', () => {
		expect(errorOf('x: -4 ; 6\ny: -8 ; 12\npoints: M(2 ; h(2))').line).toBe(3);
	});

	it('domaine mal écrit', () => {
		expect(errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x sur [3 ; 1]').line).toBe(3);
	});

	it('nom de courbe non pris en charge', () => {
		expect(errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x nom=\\htmlStyle{x}').line).toBe(3);
	});

	it('option inconnue après l’expression', () => {
		const e = errorOf('x: -4 ; 6\ny: -8 ; 12\nf(x) = x jaune');
		expect(e.line).toBe(3);
	});
});

describe('courbe — détection des blocs', () => {
	it('repère ```courbe … ```', () => {
		const lines = ['texte', '```courbe', 'x: -1 ; 1', 'y: -1 ; 1', '```', 'fin'];
		expect(findCourbeBlocks(lines)).toEqual([{ startIndex: 1, endIndex: 4 }]);
	});
});
