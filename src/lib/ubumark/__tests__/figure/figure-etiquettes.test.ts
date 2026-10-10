/**
 * Bloc ```figure — position des noms de points (`etiquette=`) et ancrage des
 * textes (`ancre=`) : MÊME placement à l'écran (`figureToSvg`) et au PDF
 * (`exportToTypst`, cetz 0.3.0).
 *
 * Chantier `docs/archive/wip/figure-etiquettes-progress.md` (2026-10-02).
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg, type FigureShape } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';
import { runDsl } from '$lib/geometry-core/dsl';
import { exportToTypst } from '$lib/geometry-core/rendering/export-typst';

type LabelShape = Extract<FigureShape, { kind: 'label' }>;
type DotShape = Extract<FigureShape, { kind: 'dot' }>;

const DIRECTIONS = [
	'haut',
	'bas',
	'gauche',
	'droite',
	'haut-gauche',
	'haut-droite',
	'bas-gauche',
	'bas-droite'
] as const;

/** Composantes (x vers la droite, y vers le HAUT) attendues de chaque direction */
const EXPECTED: Record<(typeof DIRECTIONS)[number], [number, number]> = {
	haut: [0, 1],
	bas: [0, -1],
	gauche: [-1, 0],
	droite: [1, 0],
	'haut-gauche': [-1, 1],
	'haut-droite': [1, 1],
	'bas-gauche': [-1, -1],
	'bas-droite': [1, -1]
};

/** Côté de la boîte du texte posé sur la position, par composantes (cetz) */
const CETZ_ANCHOR: Record<string, string> = {
	'0,1': 'south',
	'0,-1': 'north',
	'-1,0': 'east',
	'1,0': 'west',
	'-1,1': 'south-east',
	'1,1': 'south-west',
	'-1,-1': 'north-east',
	'1,-1': 'north-west'
};

function scene(body: string) {
	const result = buildFigureScene(parseFigureContent(`fenetre: -1 ; 8 ; -1 ; 6\n---\n${body}`));
	expect(result.errors).toEqual([]);
	return result.scene!;
}

function screenShapes(body: string): FigureShape[] {
	return figureToSvg(scene(body), 'moyenne').shapes;
}

function labelOf(shapes: FigureShape[], text: string): LabelShape {
	const s = shapes.find((x): x is LabelShape => x.kind === 'label' && x.text === text);
	if (!s) throw new Error(`étiquette ${text} absente`);
	return s;
}

function dotOf(shapes: FigureShape[], elementId: string): DotShape {
	const s = shapes.find((x): x is DotShape => x.kind === 'dot' && x.elementId === elementId);
	if (!s) throw new Error(`point ${elementId} absent`);
	return s;
}

/** Ligne `content(...)` d'un export Typst (échelle 1) contenant `"<texte>"` */
function typstContent(script: string, text: string): string {
	const { figure } = runDsl(script);
	const typst = exportToTypst(figure, { xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
	const line = typst.split('\n').find((l) => l.includes('content(') && l.includes(`"${text}"`));
	if (!line) throw new Error(`content "${text}" absent :\n${typst}`);
	return line.trim();
}

describe('écran — nom d’un point', () => {
	it('défaut inchangé : en haut à droite (début du texte, ligne de base), italique', () => {
		const shapes = screenShapes('A = point(2, 2)');
		const A = labelOf(shapes, 'A');
		const dot = dotOf(shapes, A.elementId);
		expect(A.anchor).toBe('start');
		expect(A.baseline).toBe('alphabetic');
		expect(A.x).toBeCloseTo(dot.cx + 6);
		expect(A.y).toBeCloseTo(dot.cy - 5);
		expect(A.italic).toBe(true);
	});

	for (const dir of DIRECTIONS) {
		it(`etiquette="${dir}" : nom du bon côté du point, italique`, () => {
			const shapes = screenShapes(`A = point(2, 2, etiquette="${dir}")`);
			const A = labelOf(shapes, 'A');
			const dot = dotOf(shapes, A.elementId);
			const [ux, uy] = EXPECTED[dir];
			expect(A.italic).toBe(true);
			expect(A.baseline).toBe('alphabetic');
			// Horizontal : ancrage du texte et côté
			expect(A.anchor).toBe(ux > 0 ? 'start' : ux < 0 ? 'end' : 'middle');
			expect(Math.sign(Math.round(A.x - dot.cx))).toBe(ux);
			// Vertical (SVG : y vers le bas) : boîte du texte [y − hauteur de capitale, y]
			const capHeight = 0.7 * 13;
			const top = A.y - capHeight;
			const bottom = A.y;
			if (uy > 0) expect(bottom).toBeLessThan(dot.cy - dot.r);
			if (uy < 0) expect(top).toBeGreaterThan(dot.cy + dot.r);
			if (uy === 0) expect((top + bottom) / 2).toBeCloseTo(dot.cy);
		});
	}

	it('etiquette="aucune" : point dessiné, sans nom', () => {
		const shapes = screenShapes('A = point(2, 2, etiquette="aucune")');
		expect(shapes.some((s) => s.kind === 'dot')).toBe(true);
		expect(shapes.some((s) => s.kind === 'label')).toBe(false);
	});

	it('point(…, visible=faux) : ni point ni nom, mais le segment est dessiné', () => {
		const shapes = screenShapes(
			'A = point(0, 0, visible=faux)\nB = point(4, 0)\ns = segment(A, B)'
		);
		expect(shapes.filter((s) => s.kind === 'dot')).toHaveLength(1);
		expect(shapes.some((s) => s.kind === 'label' && s.text === 'A')).toBe(false);
		expect(shapes.some((s) => s.kind === 'line')).toBe(true);
	});
});

describe('écran — texte(…) : centré par défaut, comme au PDF', () => {
	const capHeight = 0.7 * 13;

	function textAndPos(body: string) {
		const sc = scene(body);
		const shapes = figureToSvg(sc, 'moyenne').shapes;
		const label = labelOf(shapes, 'abc');
		// Position écran de (2, 2) : via un point témoin
		const witness = figureToSvg(scene('W = point(2, 2)'), 'moyenne').shapes;
		const dot = witness.find((s): s is DotShape => s.kind === 'dot')!;
		return { label, x: dot.cx, y: dot.cy };
	}

	it('défaut : centré horizontalement et verticalement sur (x, y)', () => {
		const { label, x, y } = textAndPos('texte(2, 2, "abc")');
		expect(label.anchor).toBe('middle');
		expect(label.baseline).toBe('alphabetic');
		expect(label.x).toBeCloseTo(x);
		expect(label.y - capHeight / 2).toBeCloseTo(y);
		expect(label.italic).toBe(false);
	});

	it('ancre="bas-gauche" : début du texte, ligne de base sur (x, y)', () => {
		const { label, x, y } = textAndPos('texte(2, 2, "abc", ancre="bas-gauche")');
		expect(label.anchor).toBe('start');
		expect(label.x).toBeCloseTo(x);
		expect(label.y).toBeCloseTo(y);
	});

	it('ancre="haut-droite" : fin du texte, haut des capitales sur (x, y)', () => {
		const { label, x, y } = textAndPos('texte(2, 2, "abc", ancre="haut-droite")');
		expect(label.anchor).toBe('end');
		expect(label.x).toBeCloseTo(x);
		expect(label.y - capHeight).toBeCloseTo(y);
	});

	it('ancre="gauche" : début du texte, centré verticalement', () => {
		const { label, y } = textAndPos('texte(2, 2, "abc", ancre="gauche")');
		expect(label.anchor).toBe('start');
		expect(label.y - capHeight / 2).toBeCloseTo(y);
	});
});

describe('PDF (Typst) — même placement', () => {
	it('défaut : nom en haut à droite (coin bas-gauche du nom contre le point)', () => {
		expect(typstContent('A = point(1, 2)', 'A')).toBe(
			'content((1.15, 2.125), anchor: "south-west", text(style: "italic", "A"))'
		);
	});

	it('etiquette="gauche"', () => {
		expect(typstContent('A = point(1, 2, etiquette="gauche")', 'A')).toBe(
			'content((0.85, 2), anchor: "east", text(style: "italic", "A"))'
		);
	});

	it('etiquette="bas"', () => {
		expect(typstContent('A = point(1, 2, etiquette="bas")', 'A')).toBe(
			'content((1, 1.85), anchor: "north", text(style: "italic", "A"))'
		);
	});

	for (const dir of DIRECTIONS) {
		it(`etiquette="${dir}" : côté de la boîte cetz cohérent avec l’écran`, () => {
			const [ux, uy] = EXPECTED[dir];
			const line = typstContent(`A = point(0, 0, etiquette="${dir}")`, 'A');
			expect(line).toContain(`anchor: "${CETZ_ANCHOR[`${ux},${uy}`]}"`);
			const m = /content\(\((-?[\d.]+), (-?[\d.]+)\)/.exec(line)!;
			expect(Math.sign(Number(m[1]))).toBe(ux);
			expect(Math.sign(Number(m[2]))).toBe(uy);
		});
	}

	it('etiquette="aucune" : point exporté, aucun nom', () => {
		const { figure } = runDsl('A = point(1, 2, etiquette="aucune")');
		const typst = exportToTypst(figure, { xMin: -5, xMax: 5, yMin: -5, yMax: 5 });
		expect(typst).toContain('circle((1, 2)');
		expect(typst).not.toContain('content(');
	});

	it('texte : centré par défaut (inchangé)', () => {
		expect(typstContent('texte(1, 2, "abc")', 'abc')).toMatch(
			/^content\(\(1, 2\), text\(size: 9pt/
		);
	});

	it('texte(…, ancre="bas-gauche") → anchor "south-west" sur (x, y)', () => {
		const line = typstContent('texte(1, 2, "abc", ancre="bas-gauche")', 'abc');
		expect(line).toMatch(/^content\(\(1, 2\), anchor: "south-west", text\(size: 9pt/);
	});

	it('texte(…, ancre="haut") → anchor "north"', () => {
		expect(typstContent('texte(1, 2, "abc", ancre="haut")', 'abc')).toContain('anchor: "north"');
	});

	it('bloc figure : les décalages des noms suivent markScale (taille fixe sur la page)', () => {
		const typst = generateFigureTypst(
			parseFigureContent(
				'fenetre: 0 ; 90 ; 0 ; 60\ntaille: petite\n---\nA = point(10, 10, etiquette="droite")'
			)
		);
		// petite = 4,5 cm pour 90 unités → 0,05 cm par unité ; 0,15 cm = 3 unités
		expect(typst).toContain('content((13, 10), anchor: "west"');
	});
});
