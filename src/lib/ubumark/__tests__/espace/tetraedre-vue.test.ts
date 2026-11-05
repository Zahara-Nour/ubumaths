/**
 * Vue du tétraèdre (` ```solide ` `pyramide triangle`) — chantier `tetraedre-vue` (2026-11-05)
 *
 * Constat (ligne 15 de `docs/wip/outils-manquants.md`, lot 3 de `solide-vecteur`) : le sommet
 * du fond de la base se projetait presque sur l'arête du sommet S au sommet de devant à droite
 * (0,03 à 0,4 cm) : flèches confondues depuis S, milieux et centre de gravité empilés.
 * Décision (David, 2026-11-05) : base tournée de 60° dans son plan — un sommet devant,
 * une arête au fond — ; à l'écran, de gauche à droite : A, B (devant), C.
 *
 * Limite mesurée : un tétraèdre plus haut que large (hauteur > côté) est réduit à 4 cm de
 * haut, sa base rétrécit ; G (centre de ABC) et K (milieu de l'arête du fond AC), sur la
 * même fuyante, descendent à ~0,3 cm (contre 0,13 à 0,29 avant le correctif).
 */
import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import type { EspacePoint, SolideSpec } from '$lib/ubumark/types/espace';
import { buildSolideScene } from '$lib/ubumark/utils/espace-solides';

// ============================================================================
// OUTILS
// ============================================================================

const sceneOf = (...lines: string[]) => {
	const node = parseEspaceContent(lines.join('\n'), 'solide');
	expect(node.errors).toEqual([]);
	return buildSolideScene(node.spec as SolideSpec);
};

function distanceToSegment(p: EspacePoint, a: EspacePoint, b: EspacePoint): number {
	const dx = b.x - a.x;
	const dy = b.y - a.y;
	const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
	return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** Plus petit écart à l'écran (cm) entre un sommet et une arête qui ne passe pas par lui */
function smallestVertexEdgeGap(vertices: EspacePoint[]): number {
	let gap = Infinity;
	for (let k = 0; k < 4; k++)
		for (let i = 0; i < 4; i++)
			for (let j = i + 1; j < 4; j++)
				if (k !== i && k !== j)
					gap = Math.min(gap, distanceToSegment(vertices[k], vertices[i], vertices[j]));
	return gap;
}

/** Hauteur ≤ côté, dont le tétraèdre régulier (hauteur = côté × √(2/3) ≈ 3,27 pour 4) */
const TETRAS = ['4 1.5', '4 2', '4 3', '4 3.27', '4 4', '6 4'];
/** Plus haut que large : la limite */
const TALL_TETRAS = ['4 6', '3 5'];

// ============================================================================
// TESTS
// ============================================================================

describe('tétraèdre : chaque sommet loin des arêtes qui ne passent pas par lui', () => {
	for (const dims of TETRAS) {
		it(`pyramide triangle ${dims} : au moins 0,5 cm`, () => {
			const s = sceneOf(`forme: pyramide triangle ${dims}`, 'sommets: S A B C');
			expect(smallestVertexEdgeGap(s.vertices)).toBeGreaterThanOrEqual(0.5);
		});
	}

	it('plus haut que large (limite) : au moins 0,45 cm', () => {
		for (const dims of TALL_TETRAS) {
			const s = sceneOf(`forme: pyramide triangle ${dims}`, 'sommets: S A B C');
			expect(smallestVertexEdgeGap(s.vertices)).toBeGreaterThanOrEqual(0.45);
		}
	});
});

describe('tétraèdre : points de la base séparés', () => {
	const smallestPointGap = (dims: string) => {
		const s = sceneOf(
			`forme: pyramide triangle ${dims}`,
			'sommets: S A B C',
			'points: G centre ABC, I milieu AB, J milieu BC, K milieu CA'
		);
		const pts = [...s.points, ...s.vertices];
		let gap = Infinity;
		for (let i = 0; i < pts.length; i++)
			for (let j = i + 1; j < pts.length; j++)
				gap = Math.min(gap, Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y));
		return gap;
	};

	it('hauteur ≤ côté : G, milieux et sommets à au moins 0,45 cm deux à deux', () => {
		for (const dims of TETRAS) expect(smallestPointGap(dims)).toBeGreaterThanOrEqual(0.45);
	});

	it('plus haut que large (limite) : au moins 0,3 cm', () => {
		for (const dims of TALL_TETRAS) expect(smallestPointGap(dims)).toBeGreaterThanOrEqual(0.3);
	});
});

describe('tétraèdre : disposition', () => {
	it('S en haut ; de gauche à droite A, B, C ; B devant (le plus bas)', () => {
		const s = sceneOf('forme: pyramide triangle 4 3', 'sommets: S A B C');
		const [S, A, B, C] = s.vertices;
		// Repère de la scène : y vers le bas (SVG)
		expect(S.y).toBeLessThan(Math.min(A.y, B.y, C.y));
		expect(A.x).toBeLessThan(B.x);
		expect(B.x).toBeLessThan(C.x);
		expect(B.y).toBeGreaterThan(Math.max(A.y, C.y));
	});

	it('base vue au-dessus : la seule arête cachée est celle du fond, AC', () => {
		const s = sceneOf('forme: pyramide triangle 4 3', 'sommets: S A B C');
		const dashed = s.lines.filter((l) => l.dashed);
		expect(dashed).toHaveLength(1);
		const [A, , C] = s.vertices.slice(1);
		const ends = [dashed[0].points[0], dashed[0].points[dashed[0].points.length - 1]];
		const at = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-6;
		expect(ends.some((p) => at(p, A)) && ends.some((p) => at(p, C))).toBe(true);
	});
});
