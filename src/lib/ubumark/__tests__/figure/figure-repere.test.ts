/**
 * Bloc ```figure — axes et grille (lot 0 de la géométrie repérée, 2026-10-03)
 *
 * Spécification : `docs/wip/figure-repere-progress.md`. Syntaxe alignée sur
 * ```courbe (`grille: 1 ; 2`) ; `axes: oui` et `graduations:` en plus.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';

function header(lines: string, script = 'A = point(1, 1)'): string {
	return `${lines}\n---\n${script}`;
}

function sceneOf(source: string) {
	const node = parseFigureContent(source);
	expect(node.errors).toEqual([]);
	const result = buildFigureScene(node);
	expect(result.errors).toEqual([]);
	return { node, scene: result.scene! };
}

// ============================================================================
// PARSEUR
// ============================================================================

describe('repère — en-tête', () => {
	it('sans option : ni axes ni grille', () => {
		const node = parseFigureContent(header('fenetre: 0 ; 4 ; 0 ; 3'));
		expect(node.header.axes).toBe(false);
		expect(node.header.grid).toBeNull();
		expect(node.header.ticks).toBeNull();
	});

	it('`axes: oui` / `axes: non`', () => {
		expect(parseFigureContent(header('fenetre: 0 ; 4 ; 0 ; 3\naxes: oui')).header.axes).toBe(true);
		expect(parseFigureContent(header('fenetre: 0 ; 4 ; 0 ; 3\naxes: non')).header.axes).toBe(false);
	});

	it('`grille: oui` = pas 1 ; un pas ; deux pas « x ; y » comme ```courbe ; `non`', () => {
		const grid = (v: string) =>
			parseFigureContent(header(`fenetre: 0 ; 4 ; 0 ; 3\ngrille: ${v}`)).header.grid;
		expect(grid('oui')).toEqual({ x: 1, y: 1 });
		expect(grid('2')).toEqual({ x: 2, y: 2 });
		expect(grid('1 ; 0.5')).toEqual({ x: 1, y: 0.5 });
		expect(grid('0{,}5')).toEqual({ x: 0.5, y: 0.5 });
		expect(grid('non')).toBeNull();
	});

	it('`graduations: 2` ; `graduations: non` (axes sans graduation)', () => {
		const ticks = (v: string) =>
			parseFigureContent(header(`fenetre: 0 ; 4 ; 0 ; 3\naxes: oui\ngraduations: ${v}`)).header
				.ticks;
		expect(ticks('2')).toEqual({ x: 2, y: 2 });
		expect(ticks('1 ; 2')).toEqual({ x: 1, y: 2 });
		expect(ticks('non')).toBe(false);
		expect(ticks('oui')).toBeNull();
	});

	it('valeurs invalides → erreur située à la ligne de la clé', () => {
		const cases: Array<[string, number]> = [
			['axes: peut-être', 2],
			['grille: -1', 2],
			['grille: 0', 2],
			['grille: abc', 2],
			['grille: 1 ; 2 ; 3', 2],
			['graduations: 0', 2]
		];
		for (const [line, expected] of cases) {
			const node = parseFigureContent(header(`fenetre: 0 ; 4 ; 0 ; 3\n${line}\naxes: oui`));
			expect(
				node.errors.map((e) => e.line),
				line
			).toEqual([expected]);
			expect(node.errors[0].message, line).toMatch(new RegExp(`^Ligne ${expected} : `));
		}
	});

	it('`graduations:` sans `axes: oui` → erreur située', () => {
		const node = parseFigureContent(header('fenetre: 0 ; 4 ; 0 ; 3\ngraduations: 2'));
		expect(node.errors).toHaveLength(1);
		expect(node.errors[0].line).toBe(2);
		expect(node.errors[0].message).toMatch(/axes: oui/);
	});

	it('pas trop petit pour la fenêtre (plus de 200 lignes) → erreur située', () => {
		const node = parseFigureContent(header('fenetre: 0 ; 100 ; 0 ; 100\ngrille: 0.1'));
		expect(node.errors).toHaveLength(1);
		expect(node.errors[0].line).toBe(2);
		expect(node.errors[0].message).toMatch(/trop petit/);
		const ticks = parseFigureContent(
			header('fenetre: 0 ; 100 ; 0 ; 100\naxes: oui\ngraduations: 0.1')
		);
		expect(ticks.errors[0]?.line).toBe(3);
	});

	it('le message de clé inconnue cite les nouvelles clés', () => {
		const node = parseFigureContent(header('fenetre: 0 ; 4 ; 0 ; 3\nrepere: oui'));
		expect(node.errors[0].message).toMatch(/axes/);
		expect(node.errors[0].message).toMatch(/grille/);
	});
});

// ============================================================================
// SCÈNE
// ============================================================================

describe('repère — scène', () => {
	it('sans option : pas de repère dans la scène', () => {
		const { scene } = sceneOf(header('fenetre: 0 ; 4 ; 0 ; 3'));
		expect(scene.frame).toBeNull();
	});

	it('grille : multiples du pas compris dans la fenêtre', () => {
		const { scene } = sceneOf(header('fenetre: -2 ; 6 ; -1 ; 5\ngrille: oui'));
		expect(scene.frame?.grid?.xs).toEqual([-2, -1, 0, 1, 2, 3, 4, 5, 6]);
		expect(scene.frame?.grid?.ys).toEqual([-1, 0, 1, 2, 3, 4, 5]);
		expect(scene.frame?.axes).toBeNull();
	});

	it('axes : en 0, origine visible, graduations entières sans le 0 (« O » à la place)', () => {
		const { scene } = sceneOf(header('fenetre: -2 ; 6 ; -1 ; 5\naxes: oui'));
		const axes = scene.frame!.axes!;
		expect(axes.xAxisY).toBe(0);
		expect(axes.yAxisX).toBe(0);
		expect(axes.originVisible).toBe(true);
		expect(axes.ticks.x.map((t) => t.value)).toEqual([-2, -1, 1, 2, 3, 4, 5, 6]);
		expect(axes.ticks.y.map((t) => t.value)).toEqual([-1, 1, 2, 3, 4, 5]);
		expect(axes.ticks.x[0].label).toBe('−2');
		expect(scene.frame!.grid).toBeNull();
	});

	it('graduations : pas de la grille par défaut, `graduations:` prioritaire', () => {
		const grid2 = sceneOf(header('fenetre: -4 ; 4 ; -4 ; 4\naxes: oui\ngrille: 2')).scene;
		expect(grid2.frame!.axes!.ticks.x.map((t) => t.value)).toEqual([-4, -2, 2, 4]);
		const own = sceneOf(
			header('fenetre: -4 ; 4 ; -4 ; 4\naxes: oui\ngrille: 1\ngraduations: 2')
		).scene;
		expect(own.frame!.axes!.ticks.x.map((t) => t.value)).toEqual([-4, -2, 2, 4]);
		expect(own.frame!.grid!.xs).toHaveLength(9);
	});

	it('`graduations: non` : axes sans graduation', () => {
		const { scene } = sceneOf(header('fenetre: -2 ; 6 ; -1 ; 5\naxes: oui\ngraduations: non'));
		expect(scene.frame!.axes!.ticks).toEqual({ x: [], y: [] });
		expect(scene.frame!.axes!.originVisible).toBe(true);
	});

	it('fenêtre sans 0 : axe au bord le plus proche, pas de « O »', () => {
		const { scene } = sceneOf(header('fenetre: 2 ; 12 ; 1 ; 8\naxes: oui', 'A = point(3, 2)'));
		const axes = scene.frame!.axes!;
		expect(axes.xAxisY).toBe(1);
		expect(axes.yAxisX).toBe(2);
		expect(axes.originVisible).toBe(false);
		expect(axes.ticks.x[0].value).toBe(2);
	});

	it('graduations serrées : une étiquette sur deux, toutes les graduations tracées', () => {
		const { scene } = sceneOf(
			header('fenetre: -20 ; 20 ; -10 ; 10\ntaille: petite\naxes: oui', 'A = point(0, 0)')
		);
		const xs = scene.frame!.axes!.ticks.x;
		expect(xs).toHaveLength(40);
		const labelled = xs.filter((t) => t.label !== null);
		expect(labelled.length).toBeLessThan(xs.length);
		expect(labelled.length).toBeGreaterThan(5);
	});

	it('étiquette de graduation cachée sous le nom d’un point (graduation tracée)', () => {
		const { scene } = sceneOf(
			header(
				'fenetre: -3 ; 5 ; -2 ; 4\naxes: oui',
				'P = point(2, 0, etiquette="bas")\nQ = point(-0.4, 3, etiquette="droite")'
			)
		);
		const xs = scene.frame!.axes!.ticks.x;
		expect(xs.find((t) => t.value === 2)?.label).toBeNull();
		expect(xs.find((t) => t.value === 1)?.label).toBe('1');
		expect(xs.find((t) => t.value === 3)?.label).toBe('3');
		// Q, juste à gauche de l'axe des ordonnées, nom à droite : cache le « 3 »
		const ys = scene.frame!.axes!.ticks.y;
		expect(ys.find((t) => t.value === 3)?.label).toBeNull();
		expect(ys.find((t) => t.value === 2)?.label).toBe('2');
	});

	it('point nommé à l’origine (`O = point(0, 0)`) : pas de second « O »', () => {
		const src = header(
			'fenetre: -2 ; 6 ; -1 ; 5\naxes: oui',
			'O = point(0, 0, etiquette="bas-gauche")'
		);
		const { node, scene } = sceneOf(src);
		expect(scene.frame!.axes!.originLabel).toBe(false);
		const svg = figureToSvg(scene, node.header.size);
		expect(svg.frame!.tickLabels.some((l) => l.text === 'O')).toBe(false);
		expect(generateFigureTypst(node)).not.toContain('[O]');
		// Sans point à l'origine : « O » écrit
		expect(
			sceneOf(header('fenetre: -2 ; 6 ; -1 ; 5\naxes: oui')).scene.frame!.axes!.originLabel
		).toBe(true);
	});

	it('nom masqué (etiquette="aucune") : la graduation garde son étiquette', () => {
		const { scene } = sceneOf(
			header('fenetre: -3 ; 5 ; -2 ; 4\naxes: oui', 'P = point(2, 0, etiquette="aucune")')
		);
		expect(scene.frame!.axes!.ticks.x.find((t) => t.value === 2)?.label).toBe('2');
	});

	it('graduations décimales : virgule en français, point en anglais', () => {
		const src = header('fenetre: -1 ; 1 ; -1 ; 1\naxes: oui\ngraduations: 0.5', 'A = point(0, 0)');
		const node = parseFigureContent(src);
		const fr = buildFigureScene(node).scene!.frame!.axes!.ticks.x.map((t) => t.label);
		const en = buildFigureScene(node, { locale: 'en' }).scene!.frame!.axes!.ticks.x.map(
			(t) => t.label
		);
		expect(fr).toContain('0,5');
		expect(en).toContain('0.5');
	});
});

// ============================================================================
// ÉCRAN (SVG)
// ============================================================================

const REPERE = header(
	'fenetre: -2 ; 6 ; -1 ; 5\naxes: oui\ngrille: oui',
	'A = point(1, 1)\nB = point(4, 3)\nd = droite(A, B)'
);

describe('repère — écran', () => {
	it('sans option : ni marge ni repère', () => {
		const { node, scene } = sceneOf(header('fenetre: 0 ; 4 ; 0 ; 3'));
		const svg = figureToSvg(scene, node.header.size);
		expect(svg.frame).toBeUndefined();
		expect(svg.margin).toBeUndefined();
	});

	it('grille : une ligne par multiple du pas, d’un bord à l’autre de la fenêtre', () => {
		const { node, scene } = sceneOf(REPERE);
		const svg = figureToSvg(scene, node.header.size);
		const frame = svg.frame!;
		expect(frame.gridLines).toHaveLength(9 + 7);
		const vertical = frame.gridLines.filter((l) => l.x1 === l.x2);
		expect(vertical).toHaveLength(9);
		for (const l of vertical) {
			expect(Math.min(l.y1, l.y2)).toBeCloseTo(0);
			expect(Math.max(l.y1, l.y2)).toBeCloseTo(svg.height);
		}
	});

	it('axes fléchés, graduations, étiquettes en petit sous / à gauche des axes, « O »', () => {
		const { node, scene } = sceneOf(REPERE);
		const svg = figureToSvg(scene, node.header.size);
		const frame = svg.frame!;
		expect(svg.margin).toBeGreaterThan(0);
		expect(frame.axisLines).toHaveLength(2);
		expect(frame.arrowheads).toHaveLength(2);
		expect(frame.tickLines).toHaveLength(8 + 6);
		const xAxisPx = (5 / 6) * svg.height; // y = 0 dans [-1 ; 5]
		const xLabels = frame.tickLabels.filter((l) => l.anchor === 'middle');
		expect(xLabels).toHaveLength(8);
		for (const l of xLabels) expect(l.y).toBeGreaterThan(xAxisPx);
		const yLabels = frame.tickLabels.filter((l) => l.anchor === 'end' && l.text !== 'O');
		expect(yLabels).toHaveLength(6);
		for (const l of yLabels) expect(l.x).toBeLessThan((2 / 8) * svg.width);
		expect(frame.tickLabels.some((l) => l.text === 'O')).toBe(true);
	});

	it('les objets sont dessinés comme sans repère (même formes)', () => {
		const { node, scene } = sceneOf(REPERE);
		const plain = sceneOf(REPERE.replace('axes: oui\ngrille: oui\n', '')).scene;
		expect(figureToSvg(scene, node.header.size).shapes).toEqual(
			figureToSvg(plain, node.header.size).shapes
		);
	});
});

// ============================================================================
// DROITES ET CERCLES DANS LE REPÈRE
// ============================================================================

describe('droites jusqu’aux bords de la fenêtre', () => {
	const SRC = header(
		'fenetre: -3 ; 5 ; -2 ; 4\naxes: oui',
		'A = point(1.5, 0)\nB = point(1.5, 2)\nd = droite(A, B)\nC = point(0, 0)\nD = point(2, 1)\nd2 = droite(C, D)'
	);

	it('écran : verticale de haut en bas, oblique de bord à bord', () => {
		const { node, scene } = sceneOf(SRC);
		const svg = figureToSvg(scene, node.header.size);
		const d = scene.elements.find((e) => e.label === 'd')!;
		const e = scene.elements.find((el) => el.label === 'd2')!;
		const vertical = svg.shapes.find((s) => s.elementId === d.id && s.kind === 'line')!;
		expect(vertical.kind === 'line' && Math.min(vertical.y1, vertical.y2)).toBeCloseTo(0);
		expect(vertical.kind === 'line' && Math.max(vertical.y1, vertical.y2)).toBeCloseTo(svg.height);
		const oblique = svg.shapes.find((s) => s.elementId === e.id && s.kind === 'line')!;
		// y = x/2 : entre x = -3 (bord gauche) et x = 5 (bord droit)
		expect(oblique.kind === 'line' && Math.min(oblique.x1, oblique.x2)).toBeCloseTo(0);
		expect(oblique.kind === 'line' && Math.max(oblique.x1, oblique.x2)).toBeCloseTo(svg.width);
	});

	it('PDF : mêmes extrémités, en unités du repère', () => {
		const typst = generateFigureTypst(parseFigureContent(SRC));
		expect(typst).toContain('line((1.5, -2), (1.5, 4)');
		expect(typst).toMatch(/line\(\(-3, -1\.5\), \(5, 2\.5\)|line\(\(5, 2\.5\), \(-3, -1\.5\)/);
	});
});

// ============================================================================
// PDF (TYPST)
// ============================================================================

describe('repère — PDF', () => {
	it('grille : même nombre de lignes qu’à l’écran, sous les objets', () => {
		const node = parseFigureContent(REPERE);
		const typst = generateFigureTypst(node);
		const gridLines = typst.split('\n').filter((l) => l.includes('luma(205)'));
		expect(gridLines).toHaveLength(9 + 7);
		const firstElement = typst.indexOf('// element');
		expect(typst.lastIndexOf('luma(205)')).toBeLessThan(firstElement);
	});

	it('axes fléchés, graduations, étiquettes en 6,5 pt, « O », sous les objets', () => {
		const typst = generateFigureTypst(parseFigureContent(REPERE));
		const firstElement = typst.indexOf('// element');
		const repere = typst.slice(0, firstElement);
		expect(repere).toContain('// axes');
		expect(repere).toContain('// graduations');
		expect((repere.match(/text\(size: 6\.5pt\)/g) ?? []).length).toBe(8 + 6 + 1);
		expect(repere).toContain('[O]');
		expect(repere).toContain('[−2]');
		expect(repere).toMatch(/anchor: "north"/);
		expect(repere).toMatch(/anchor: "east"/);
	});

	it('`graduations: non` : axes sans étiquette de graduation', () => {
		const typst = generateFigureTypst(
			parseFigureContent(REPERE.replace('grille: oui', 'graduations: non'))
		);
		expect(typst).toContain('// axes');
		expect((typst.match(/text\(size: 6\.5pt\)/g) ?? []).length).toBe(1);
	});

	it('graduations décimales en anglais : point décimal', () => {
		const node = parseFigureContent(
			header('fenetre: -1 ; 1 ; -1 ; 1\naxes: oui\ngraduations: 0.5', 'A = point(0, 0)')
		);
		expect(generateFigureTypst(node)).toContain('[0,5]');
		expect(generateFigureTypst(node, { language: 'en' })).toContain('[0.5]');
	});
});
