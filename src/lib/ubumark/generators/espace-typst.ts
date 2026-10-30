/**
 * Bloc ```cubes → Typst
 * =====================
 *
 * Chaque face (ou carré de vue) est un `polygon` Typst natif, depuis la MÊME
 * scène que l'écran (`buildEspaceScene`) : mêmes sommets, même ordre de
 * dessin. Ni paquet, ni image. L'arête d'un cube mesure 1 cm.
 *
 * Noir sur blanc : trois gris imprimables (dessus le plus clair, côté le plus
 * foncé), contours noirs.
 *
 * Gestes (`dessiner:`, `retrouver:`) : les figures côte à côte, titrées.
 * `dessiner:` → la perspective et un quadrillage vide, à colorier au crayon ;
 * `retrouver:` → la vue de dessus vide (une hauteur à écrire par carreau) et les
 * vues données, sans perspective. `solved` (corrigé) : la vue coloriée, ou les
 * hauteurs du bloc.
 *
 * ```solide (lot 3) : traits pleins ou en tirets (`dash: "dashed"`), face
 * marquée en gris clair, noms et cotes, depuis `buildSolideScene` (la scène
 * de l'écran).
 *
 * Un bloc en erreur devient le cadre neutre « Solide indisponible » — jamais
 * une erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/espace-typst
 */

import {
	ESPACE_CM_PER_UNIT,
	ESPACE_MARGIN,
	ESPACE_STROKE,
	buildEspaceScene,
	type EspaceFaceKind
} from '../utils/espace-scene';
import {
	ESPACE_UNAVAILABLE,
	type CubesView,
	type EspaceNode,
	type CubesSpec,
	type SolideSpec
} from '../types/espace';
import { drawingGridSize, viewGrid } from '../utils/cubes-gestes';
import {
	SOLIDE_DASH,
	SOLIDE_DOT_RADIUS,
	SOLIDE_LABEL_SIZE,
	SOLIDE_THICK_STROKE,
	buildSolideScene
} from '../utils/espace-solides';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${ESPACE_UNAVAILABLE}]`;

/** Gris de chaque genre de face (0 noir, 255 blanc) : dessus clair, côté foncé */
export const ESPACE_LUMA: Record<EspaceFaceKind, number> = {
	dessus: 245,
	devant: 215,
	cote: 170,
	case: 255
};

/** Gris d'un carreau colorié du quadrillage (corrigé) */
const COLORED_LUMA = 150;

const VIEW_TITLES: Record<Exclude<CubesView, 'perspective'>, string> = {
	dessus: 'Vue de dessus',
	face: 'Vue de face',
	droite: 'Vue de droite',
	gauche: 'Vue de gauche'
};

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (units: number) => `${Number((units * ESPACE_CM_PER_UNIT).toFixed(4))}cm`;

const STROKE = `(paint: black, thickness: ${cm(ESPACE_STROKE)}, join: "round")`;

/** Un polygone Typst, placé dans sa boîte */
function polygonTypst(points: { x: number; y: number }[], luma: number): string {
	const at = points
		.map((p) => `(${cm(p.x + ESPACE_MARGIN)}, ${cm(p.y + ESPACE_MARGIN)})`)
		.join(', ');
	return `  #place(top + left, polygon(fill: luma(${luma}), stroke: ${STROKE}, ${at}))`;
}

/** Boîte de la taille d'un dessin de `width` × `height` unités, marge comprise */
function boxTypst(width: number, height: number, content: string[]): string {
	return [
		`#box(width: ${cm(width + 2 * ESPACE_MARGIN)}, height: ${cm(height + 2 * ESPACE_MARGIN)})[`,
		...content,
		']'
	].join('\n');
}

/** L'assemblage dessiné dans une vue (ou en perspective) */
function sceneTypst(spec: CubesSpec, view: CubesView): string {
	const scene = buildEspaceScene({ kind: 'cubes', heights: spec.heights, view });
	return boxTypst(
		scene.width,
		scene.height,
		scene.polygons.map((polygon) => polygonTypst(polygon.points, ESPACE_LUMA[polygon.kind]))
	);
}

/** Carré de 1 × 1 au coin (x, y) */
const unitSquare = (x: number, y: number) => [
	{ x, y },
	{ x: x + 1, y },
	{ x: x + 1, y: y + 1 },
	{ x, y: y + 1 }
];

/** Une figure titrée */
const titled = (title: string, figure: string) =>
	`#stack(dir: ttb, spacing: 0.2cm, align(center)[#text(size: 0.9em)[${title}]], ${figure.replace(/^#/, '')})`;

/** Quadrillage de `dessiner:` : vide, ou la vue coloriée à un carreau du bord */
function drawingTypst(spec: CubesSpec, view: Exclude<CubesView, 'perspective'>, solved: boolean) {
	const { rows, cols } = drawingGridSize(spec.heights, view);
	const wanted = viewGrid(spec.heights, view);
	const squares: string[] = [];
	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			const colored = solved && (wanted[r - 1]?.[c - 1] ?? false);
			squares.push(polygonTypst(unitSquare(c, r), colored ? COLORED_LUMA : ESPACE_LUMA.case));
		}
	}
	return boxTypst(cols, rows, squares);
}

/** Vue de dessus de `retrouver:` : une case par pile, vide ou avec sa hauteur */
function heightsTypst(spec: CubesSpec, solved: boolean): string {
	const content: string[] = [];
	spec.heights.forEach((row, r) =>
		row.forEach((h, c) => {
			if (h === 0) return;
			content.push(polygonTypst(unitSquare(c, r), ESPACE_LUMA.case));
			if (solved) {
				content.push(
					`  #place(top + left, dx: ${cm(c + ESPACE_MARGIN)}, dy: ${cm(r + ESPACE_MARGIN)}, box(width: ${cm(1)}, height: ${cm(1)}, align(center + horizon)[${h}]))`
				);
			}
		})
	);
	return boxTypst(spec.heights[0].length, spec.heights.length, content);
}

/** Les figures d'un bloc, côte à côte */
const sideBySide = (figures: string[]) =>
	figures.length === 1
		? figures[0]
		: `#stack(dir: ltr, spacing: 1cm, ${figures.map((f) => f.replace(/^#/, '')).join(', ')})`;

/** Gris d'une face marquée */
const MARKED_FACE_LUMA = 215;

/** Un solide en perspective cavalière */
function solideTypst(spec: SolideSpec): string {
	const scene = buildSolideScene(spec);
	const at = (p: { x: number; y: number }) =>
		`(${cm(p.x + ESPACE_MARGIN)}, ${cm(p.y + ESPACE_MARGIN)})`;
	const content: string[] = [];
	for (const fill of scene.fills) {
		content.push(
			`  #place(top + left, polygon(fill: luma(${MARKED_FACE_LUMA}), stroke: none, ${fill.map(at).join(', ')}))`
		);
	}
	for (const line of scene.lines) {
		const dash = line.dashed ? `, dash: (${SOLIDE_DASH.map(cm).join(', ')})` : '';
		const thickness = cm(line.thick ? SOLIDE_THICK_STROKE : ESPACE_STROKE);
		const [first, ...rest] = line.points;
		content.push(
			`  #place(top + left, curve(stroke: (paint: black, thickness: ${thickness}, cap: "round", join: "round"${dash}), curve.move(${at(first)}), ${rest.map((p) => `curve.line(${at(p)})`).join(', ')}))`
		);
	}
	for (const dot of scene.dots) {
		content.push(
			`  #place(top + left, dx: ${cm(dot.x + ESPACE_MARGIN - SOLIDE_DOT_RADIUS)}, dy: ${cm(dot.y + ESPACE_MARGIN - SOLIDE_DOT_RADIUS)}, circle(radius: ${cm(SOLIDE_DOT_RADIUS)}, fill: black))`
		);
	}
	for (const label of scene.labels) {
		// Boîte large centrée sur le point : le texte s'y centre. Texte en chaîne :
		// en markup, Typst ferait de `O'` une apostrophe typographique
		const w = 2;
		const h = 1;
		content.push(
			`  #place(top + left, dx: ${cm(label.at.x + ESPACE_MARGIN - w / 2)}, dy: ${cm(label.at.y + ESPACE_MARGIN - h / 2)}, box(width: ${cm(w)}, height: ${cm(h)}, align(center + horizon, text(size: ${cm(SOLIDE_LABEL_SIZE)}, ${JSON.stringify(label.text)}))))`
		);
	}
	return boxTypst(scene.width, scene.height, content);
}

/** Typst d'un bloc d'espace ; `solved` : corrigé d'un geste */
export function generateEspaceTypst(node: EspaceNode, options: { solved?: boolean } = {}): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	if (spec.kind === 'solide') {
		return ['#align(center)[#block(breakable: false)[', solideTypst(spec), ']]'].join('\n');
	}

	const solved = options.solved ?? false;
	const task = spec.task;
	let figures: string[];
	if (task?.kind === 'dessiner') {
		figures = [
			sceneTypst(spec, 'perspective'),
			titled(VIEW_TITLES[task.view], drawingTypst(spec, task.view, solved))
		];
	} else if (task?.kind === 'retrouver') {
		figures = [
			titled(VIEW_TITLES.dessus, heightsTypst(spec, solved)),
			...task.views.map((view) => titled(VIEW_TITLES[view], sceneTypst(spec, view)))
		];
	} else {
		figures = [sceneTypst(spec, spec.view)];
	}
	return ['#align(center)[#block(breakable: false)[', sideBySide(figures), ']]'].join('\n');
}
