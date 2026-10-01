/**
 * Bloc ```courbe — corrections de relecture (2026-10-01)
 *
 * Le bloc est aussi rendu dans le chat élève et le tableau blanc : une entrée
 * hostile ne doit JAMAIS figer l'onglet. Toute la chaîne (analyse + scène) a
 * un budget borné, quelles que soient les entrées.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { parseMarkdown, type BlockNode } from '$lib/ubumark';
import type { CourbeNode, CourbeSpec } from '../../types/courbe';

const BASE = parseCourbeContent('x: -4 ; 6\ny: -8 ; 12\nf(x) = x^2\naire: f ; -1 ; 2').spec!;

/** Spécification forgée : la scène doit tenir même sans passer par l'analyse. */
function forged(patch: Partial<CourbeSpec>): CourbeSpec {
	return { ...BASE, ...patch };
}

describe('courbe — budget borné (entrées hostiles)', () => {
	it('fenêtre au-delà de 2^53 refusée à l’analyse, avec un message situé', () => {
		const node = parseCourbeContent('x: 10^17 ; 10^17+16\ny: 0 ; 1\nf(x) = x');
		expect(node.spec).toBeNull();
		expect(node.errors[0].line).toBe(1);
	});

	it('fenêtre infinie ou démesurée refusée', () => {
		expect(parseCourbeContent('x: -10^400 ; 1\ny: 0 ; 1').errors[0].line).toBe(1);
		expect(parseCourbeContent('x: 0 ; 1\ny: -10^300 ; 10^300').errors[0].line).toBe(2);
	});

	it('trop de fonctions, de points, d’aires : erreur située', () => {
		const many = Array.from({ length: 30 }, (_, i) => `f${i}(x) = x + ${i}`).join('\n');
		expect(parseCourbeContent(`x: 0 ; 1\ny: 0 ; 1\n${many}`).spec).toBeNull();
		const pts = Array.from({ length: 500 }, (_, i) => `P${i}(0;0)`).join(', ');
		const node = parseCourbeContent(`x: 0 ; 1\ny: 0 ; 1\npoints: ${pts}`);
		expect(node.spec).toBeNull();
		expect(node.errors[0].line).toBe(3);
	});

	it('scène forgée hostile : finit en moins de 200 ms, sans exception', () => {
		const hostile: CourbeSpec[] = [
			forged({ window: { xMin: 1e17, xMax: 1e17 + 16, yMin: 0, yMax: 1 }, grid: null }),
			forged({ window: { xMin: -1e308, xMax: 1e308, yMin: -1e308, yMax: 1e308 }, grid: null }),
			forged({ window: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, grid: { x: 1e-12, y: 1e-12 } }),
			forged({ window: { xMin: 0, xMax: 1, yMin: 0, yMax: 1 }, grid: { x: 0, y: -1 } }),
			forged({ window: { xMin: 0, xMax: Infinity, yMin: NaN, yMax: 1 }, grid: null }),
			forged({ window: { xMin: 0, xMax: 1e-300, yMin: 0, yMax: 1e-300 }, grid: null }),
			forged({
				points: Array.from({ length: 100_000 }, (_, i) => ({ name: `P${i}`, x: 0, y: 0, line: 1 })),
				areas: Array.from({ length: 1000 }, () => ({ functionName: 'f', from: -1, to: 2, line: 1 }))
			})
		];
		const start = performance.now();
		for (const spec of hostile) {
			const s = buildCourbeScene(spec);
			expect(s.grid.xs.length).toBeLessThanOrEqual(201);
			expect(s.grid.ys.length).toBeLessThanOrEqual(201);
			expect(s.points.length).toBeLessThanOrEqual(50);
			expect(s.areas.length).toBeLessThanOrEqual(10);
		}
		expect(performance.now() - start).toBeLessThan(200);
	});
});

describe('courbe — aire et domaine', () => {
	it('l’aire est restreinte au domaine de f, avec un avertissement pour le prof', () => {
		const node = parseCourbeContent(
			'x: -4 ; 8\ny: -2 ; 10\nf(x) = x sur [0 ; 6]\naire: f ; -2 ; 3'
		);
		expect(node.errors).toEqual([]);
		const s = buildCourbeScene(node.spec!);
		const xs = s.areas[0].polygon.map((p) => p.x);
		expect(Math.min(...xs)).toBe(0);
		expect(Math.max(...xs)).toBe(3);
		expect(s.warnings.some((w) => w.line === 4 && /domaine/.test(w.message))).toBe(true);
	});

	it('aire hors du domaine : rien de dessiné, avertissement', () => {
		const node = parseCourbeContent(
			'x: -4 ; 8\ny: -2 ; 10\nf(x) = x sur [0 ; 6]\naire: f ; -3 ; -1'
		);
		const s = buildCourbeScene(node.spec!);
		expect(s.areas).toEqual([]);
		expect(s.warnings.some((w) => w.line === 4)).toBe(true);
	});
});

describe('courbe — point calculé hors du domaine', () => {
	it('M(7 ; f(7)) avec f sur [0 ; 6] : erreur située', () => {
		const node = parseCourbeContent(
			'x: -4 ; 8\ny: -2 ; 10\nf(x) = x sur [0 ; 6]\npoints: M(7 ; f(7))'
		);
		expect(node.spec).toBeNull();
		expect(node.errors[0].line).toBe(4);
		expect(node.errors[0].message).toMatch(/domaine/);
	});

	it('borne ouverte exclue : f(0) avec f sur ]0 ; 6] refusé ; f(6) accepté', () => {
		expect(
			parseCourbeContent('x: -4 ; 8\ny: -2 ; 10\nf(x) = x sur ]0 ; 6]\npoints: M(0 ; f(0))').spec
		).toBeNull();
		expect(
			parseCourbeContent('x: -4 ; 8\ny: -2 ; 10\nf(x) = x sur ]0 ; 6]\npoints: M(6 ; f(6))').spec
		).not.toBeNull();
	});
});

describe('courbe — bloc non fermé', () => {
	const courbes = (children: BlockNode[]) =>
		children.filter((c): c is CourbeNode => c.type === 'courbe');

	it('fermé à la fin de ses lignes, erreur « non fermé », la suite reste visible', () => {
		const md = [
			'```courbe',
			'x: -1 ; 1',
			'y: -1 ; 1',
			'',
			'La suite du texte.',
			'',
			'- un item'
		].join('\n');
		const doc = parseMarkdown(md);
		const [node] = courbes(doc.children);
		expect(node.errors.some((e) => /non fermé/.test(e.message))).toBe(true);
		expect(node.source).toBe('x: -1 ; 1\ny: -1 ; 1');
		expect(doc.children.map((c) => c.type)).toEqual(['courbe', 'paragraph', 'list']);
	});

	it('ne capture pas un bloc de code qui suit', () => {
		const md = ['```courbe', 'x: -1 ; 1', '', '```python', 'print(1)', '```', '', 'Fin.'].join(
			'\n'
		);
		const doc = parseMarkdown(md);
		expect(doc.children.map((c) => c.type)).toEqual(['courbe', 'code-block', 'paragraph']);
	});
});
