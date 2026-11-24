/**
 * Noms des sommets hors des traits (E48, E49 de `docs/wip/ecarts-verifs-progress.md`) :
 * la place habituelle (direction libre entre les arêtes) d'abord, une autre
 * autour du sommet quand elle touche une arête ou le contour d'une section.
 * Les noms des points de la section (I, J…) restent posés contre leur arête.
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import { buildSolideScene, labelBox } from '#lib/ubumark/utils/espace-solides.ts';

type Pt = { x: number; y: number };

const sceneOf = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'solide');
	expect(node.errors).toEqual([]);
	return buildSolideScene(node.spec as SolideSpec);
};

/** Le segment [a, b] traverse-t-il la boîte (coins bas-gauche, haut-droit) ? */
function hits(a: Pt, b: Pt, [lo, hi]: Pt[]): boolean {
	let t0 = 0;
	let t1 = 1;
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	for (const [p, q] of [
		[-dx, a.x - lo.x],
		[dx, hi.x - a.x],
		[-dy, a.y - lo.y],
		[dy, hi.y - a.y]
	]) {
		if (p === 0) {
			if (q < 0) return false;
			continue;
		}
		const r = q / p;
		if (p < 0) t0 = Math.max(t0, r);
		else t1 = Math.min(t1, r);
		if (t0 > t1) return false;
	}
	return true;
}

/** Les noms de sommets (`names`) dont la boîte touche un trait du dessin */
function namesOnStrokes(scene: ReturnType<typeof buildSolideScene>, names: string): string[] {
	const segments = scene.lines.flatMap((l) =>
		l.points.slice(1).map((p, i): [Pt, Pt] => [l.points[i], p])
	);
	return scene.labels
		.filter((label) => names.split(' ').includes(label.text))
		.filter((label) => segments.some(([a, b]) => hits(a, b, labelBox(label))))
		.map((label) => label.text);
}

describe('noms des sommets hors des traits', () => {
	it('E48 — pyramide à base carrée : D n’est traversé par aucune arête', () => {
		const scene = sceneOf('forme: pyramide carree 4 3', 'sommets: S A B C D');
		expect(namesOnStrokes(scene, 'S A B C D')).toEqual([]);
	});

	it('E49 — pavé coupé parallèlement à une face : F ne touche pas le trait de la section', () => {
		const scene = sceneOf(
			'forme: pave 6 4 3',
			'sommets: A B C D E F G H',
			'section: parallele ABCD 2 IJKL',
			'cotes: cm'
		);
		expect(namesOnStrokes(scene, 'A B C D E F G H')).toEqual([]);
	});

	it('pavé nommé sans section : chaque nom garde sa place habituelle, hors des traits', () => {
		const scene = sceneOf('forme: pave 5 3 2', 'sommets: A B C D E F G H');
		expect(namesOnStrokes(scene, 'A B C D E F G H')).toEqual([]);
	});
});
