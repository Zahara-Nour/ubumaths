/**
 * Blocs statistiques (barres, circulaire, histogramme, polygone) → Typst (cetz 0.3.0)
 * ===================================================================================
 *
 * Dessine la MÊME scène que l'écran (`buildStatChartScene`) : mêmes barres,
 * mêmes secteurs, même légende. Chaque primitive est précédée d'un commentaire
 * (`// barre`, `// secteur`, `// légende`) qui permet de les compter.
 *
 * ⚠️ En production, le PDF est compilé dans le navigateur par typst.ts
 * 0.6.1-rc5 : une seule erreur fait échouer TOUTE la fiche. D'où :
 * - tout texte d'auteur (titre, catégorie, axe) écrit en CHAÎNE Typst
 *   échappée (`#"…"`), jamais en balisage : `#`, `$`, `*` ne sont pas
 *   interprétés ;
 * - secteurs dessinés en polygones (ceux de la scène), pas avec `arc` ;
 * - bloc en erreur → cadre neutre « Figure indisponible », sans cetz.
 *
 * @module ubumark/generators/stat-chart-typst
 */

import { COURBE_COLORS, type CourbeSize } from '../types/courbe';
import { PIE_COLOR_SEQUENCE, type StatChartNode } from '../types/stat-chart';
import { namedColorTable, namedColorTypst } from '$lib/theme/named-colors';
import { WIDTH_CM } from './courbe-typst';
import { STAT_TEXT } from '../utils/stat-chart-text';
import {
	PIE_MARKER_CM,
	STAT_CHART_ASPECT_RATIO,
	buildStatChartScene,
	type BarScene,
	type CrossTableScene,
	type CumulativeScene,
	type HistogramScene,
	type ComparisonScene,
	type FrequencyTableScene,
	type DensityScene,
	type LawScene,
	type SimulationScene,
	type MeanScene,
	type PieScene,
	type ScatterScene,
	type ScenePoint,
	type SceneTick,
	type StatChartScene
} from '../utils/stat-chart-scene';

// ============================================================================
// TYPES
// ============================================================================

export interface StatChartTypstOptions {
	/** Langue du document : séparateur décimal */
	language?: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Variante claire de la palette commune des figures, comme ```courbe */
const TYPST_COLORS = namedColorTable(COURBE_COLORS, namedColorTypst);

/** Couleurs des secteurs : même ordre que l'écran (`PIE_COLOR_SEQUENCE`) */
const PIE_COLORS = PIE_COLOR_SEQUENCE.map(namedColorTypst);

/** Cadre neutre d'un bloc qui ne se dessine pas, dans la langue du document */
function unavailable(language: string | undefined): string {
	const text = STAT_TEXT[language === 'en' ? 'en' : 'fr'].unavailable;
	return `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${text}]`;
}

/** Classes hors de μ ± 2σ/√n (moyennes d'échantillons) : grises, comme à l'écran */
const OUTSIDE_COLOR = 'luma(150)';

const CETZ_IMPORT = '#import "@preview/cetz:0.3.0"';

// ============================================================================
// AIDE
// ============================================================================

function fmt(n: number): string {
	const s = n.toFixed(3).replace(/\.?0+$/, '');
	return s === '-0' || s === '' ? '0' : s;
}

/** Texte d'auteur en chaîne Typst : jamais interprété comme du balisage. */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** Contenu Typst `[#"…"]` d'un texte d'auteur. */
function textContent(text: string): string {
	return `[#${typstString(text)}]`;
}

/**
 * Le titre et la figure qui le suit, dans un bloc insécable : sinon le titre
 * peut rester seul en bas de colonne et la figure partir à la page suivante
 * (fiche compilée, lois à densité). Les lignes de texte dessous restent dehors.
 */
function keptWithTitle(head: string, figure: string): string {
	return head === '' ? figure : `#block(breakable: false, width: 100%)[\n${head}${figure}\n]`;
}

/**
 * Ce qui précède la figure : le titre, puis la série écrite par `série:` (Q106),
 * une ligne par série (saut de ligne Typst `\\`). Les deux restent avec la
 * figure : la série seule en bas de colonne serait aussi orpheline que le titre.
 */
function headOf(scene: { title: string | null; series?: string | null }): string {
	if (!scene.series) return titleBlock(scene.title);
	const seriesLines = scene.series.split('\n').map((line) => `#${typstString(line)}`);
	return `${titleBlock(scene.title)}#block(text(size: 9pt)[${seriesLines.join(' \\ ')}])\n`;
}

function titleBlock(title: string | null): string {
	if (title === null) return '';
	return `#align(center, text(weight: "bold", size: 9pt)${textContent(title)})\n`;
}

// ============================================================================
// BARRES
// ============================================================================

function barsTypst(scene: BarScene, size: CourbeSize): string {
	const W = WIDTH_CM[size];
	const H = W * STAT_CHART_ASPECT_RATIO;
	const n = scene.labels.length;
	const X = (x: number) => fmt((x / n) * W);
	const Y = (y: number) => fmt((y / scene.yMax) * H);
	const color = TYPST_COLORS[scene.color];
	// Seconde série (Q117) : hachures diagonales dans une autre teinte, cadre plein
	const second = scene.secondColor === null ? null : TYPST_COLORS[scene.secondColor];
	const hatch =
		second === null
			? ''
			: `#let hachures = tiling(size: (4pt, 4pt))[#place(line(start: (0pt, 4pt), end: (4pt, 0pt), stroke: 0.8pt + ${second}))]\n`;
	// Deux barres par bande : des valeurs plus petites, sinon « 16,7 % » et « 20 % » se touchent
	const valueSize = scene.legend === null ? '6.5pt' : '5pt';
	const lines: string[] = ['  import cetz.draw: *'];

	lines.push('  // graduations');
	for (const tick of scene.ticks) {
		const y = Y(tick.value);
		lines.push(`  line((0, ${y}), (${fmt(W)}, ${y}), stroke: 0.3pt + luma(215))`);
		lines.push(`  line((-0.06, ${y}), (0, ${y}), stroke: 0.5pt)`);
		lines.push(`  content((-0.1, ${y}), anchor: "east", text(size: 6.5pt)[${tick.label}])`);
	}

	for (const bar of scene.bars) {
		lines.push('  // barre');
		lines.push(
			bar.series === 1 && second !== null
				? `  rect((${X(bar.left)}, 0), (${X(bar.right)}, ${Y(bar.value)}), fill: hachures, stroke: 0.6pt + ${second})`
				: `  rect((${X(bar.left)}, 0), (${X(bar.right)}, ${Y(bar.value)}), fill: ${bar.highlighted === false ? OUTSIDE_COLOR : color}, stroke: none)`
		);
		const center = X((bar.left + bar.right) / 2);
		if (scene.showValues) {
			lines.push(
				`  content((${center}, ${fmt(Number(Y(bar.value)) + 0.06)}), anchor: "south", text(size: ${valueSize})${textContent(bar.valueLabel)})`
			);
		}
	}

	// Une étiquette par catégorie, au centre de sa bande (une ou deux barres)
	for (const label of scene.labels) {
		const center = X(label.center);
		const text = `text(size: 6.5pt)${textContent(label.text)}`;
		lines.push(
			scene.rotateLabels
				? `  content((${center}, -0.1), anchor: "east", angle: 45deg, ${text})`
				: `  content((${center}, -0.1), anchor: "north", ${text})`
		);
	}

	lines.push('  // axes');
	lines.push(`  line((0, 0), (${fmt(W + 0.2)}, 0), stroke: 0.6pt)`);
	lines.push(`  line((0, 0), (0, ${fmt(H + 0.35)}), stroke: 0.6pt, mark: (end: ">", fill: black))`);
	lines.push(
		`  content((0, ${fmt(H + 0.45)}), anchor: "south", text(size: 7pt)${textContent(scene.axisTitles.y)})`
	);
	if (scene.axisTitles.x !== null) {
		// Nom incliné à 45° : ~0,12 cm par caractère à 6,5 pt, soit ~0,085 cm de hauteur
		const below = scene.rotateLabels ? 0.35 + scene.longestLabel * 0.085 : 0.5;
		lines.push(
			`  content((${fmt(W / 2)}, ${fmt(-below)}), anchor: "north", text(size: 7pt)${textContent(scene.axisTitles.x)})`
		);
	}

	const legend =
		scene.legend === null || second === null
			? ''
			: `\n// légende des séries\n#align(center, text(size: 7.5pt)[#box(width: 8pt, height: 8pt, fill: ${color}) #h(3pt) #${typstString(scene.legend[0])} #h(10pt) #box(width: 8pt, height: 8pt, fill: hachures, stroke: 0.6pt + ${second}) #h(3pt) #${typstString(scene.legend[1])}])`;
	const table =
		scene.indicatorTable === null
			? ''
			: `\n// indicateurs\n${comparisonTypst(scene.indicatorTable)}`;
	return `${CETZ_IMPORT}\n${hatch}\n${keptWithTitle(headOf(scene), `#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}${legend}${table}`;
}

// ============================================================================
// CIRCULAIRE
// ============================================================================

function pieTypst(scene: PieScene, size: CourbeSize): string {
	const R = WIDTH_CM[size] * 0.3;
	const P = (p: ScenePoint) => `(${fmt(p.x * R)}, ${fmt(p.y * R)})`;
	const lines: string[] = ['  import cetz.draw: *'];

	for (const sector of scene.sectors) {
		lines.push('  // secteur');
		lines.push(
			`  line(${sector.polygon.map(P).join(', ')}, close: true, fill: ${PIE_COLORS[sector.colorIndex]}, stroke: 0.6pt + white)`
		);
	}

	// Repères numérotés (Q23) : disque blanc lisible sur toute couleur, et en noir et blanc
	for (const sector of scene.sectors) {
		lines.push('  // repère');
		if (sector.leader) {
			lines.push(`  line(${sector.leader.map(P).join(', ')}, stroke: 0.4pt + luma(60))`);
		}
		lines.push(
			`  circle(${P(sector.markerPosition)}, radius: ${PIE_MARKER_CM}, fill: white, stroke: 0.4pt + luma(60))`
		);
		lines.push(
			`  content(${P(sector.markerPosition)}, text(size: 6.5pt, weight: "bold")[${sector.marker}])`
		);
	}

	const legend = scene.legend.map(
		(item) =>
			`    // légende\n    [#box(width: 7pt, height: 7pt, fill: ${PIE_COLORS[item.colorIndex]}) #h(3pt) #text(size: 8pt, weight: "bold")[${item.marker}] #h(3pt) #text(size: 8pt)${textContent(item.text)}]`
	);

	const canvas = `cetz.canvas({\n${lines.join('\n')}\n  })`;
	const stack = `align(left, stack(spacing: 4pt,\n${legend.join(',\n')}\n  ))`;
	return `${CETZ_IMPORT}\n\n${keptWithTitle(headOf(scene), `#align(center, grid(columns: 2, column-gutter: 14pt, align: horizon,\n  ${canvas},\n  ${stack}\n))`)}`;
}

// ============================================================================
// CLASSES (histogramme, polygone)
// ============================================================================

/** Repère commun : x de `xMin` à `xMax` sur la largeur, y de 0 à `yMax` sur la hauteur. */
function frame(size: CourbeSize, xMin: number, xMax: number, yMax: number) {
	const W = WIDTH_CM[size];
	const H = W * STAT_CHART_ASPECT_RATIO;
	return {
		W,
		H,
		X: (x: number) => fmt(((x - xMin) / (xMax - xMin)) * W),
		Y: (y: number) => fmt((y / yMax) * H)
	};
}

/** Bornes des classes sous l'axe horizontal */
function boundLabels(xTicks: readonly SceneTick[], X: (x: number) => string): string[] {
	return xTicks.flatMap((tick) => [
		`  line((${X(tick.value)}, -0.06), (${X(tick.value)}, 0), stroke: 0.5pt)`,
		`  content((${X(tick.value)}, -0.1), anchor: "north", text(size: 6.5pt)[${tick.label}])`
	]);
}

/** Graduations verticales avec lignes de rappel */
function valueTicks(ticks: readonly SceneTick[], W: number, Y: (y: number) => string): string[] {
	return ticks.flatMap((tick) => [
		`  line((0, ${Y(tick.value)}), (${fmt(W)}, ${Y(tick.value)}), stroke: 0.3pt + luma(215))`,
		`  line((-0.06, ${Y(tick.value)}), (0, ${Y(tick.value)}), stroke: 0.5pt)`,
		`  content((-0.1, ${Y(tick.value)}), anchor: "east", text(size: 6.5pt)[${tick.label}])`
	]);
}

function axes(W: number, H: number, title: string | null, xTitle: string | null): string[] {
	const lines = [
		'  // axes',
		`  line((0, 0), (${fmt(W + 0.2)}, 0), stroke: 0.6pt)`,
		`  line((0, 0), (0, ${fmt(H + 0.35)}), stroke: 0.6pt, mark: (end: ">", fill: black))`
	];
	if (title !== null) {
		lines.push(
			`  content((0, ${fmt(H + 0.45)}), anchor: "south", text(size: 7pt)${textContent(title)})`
		);
	}
	if (xTitle !== null) {
		lines.push(
			`  content((${fmt(W / 2)}, -0.5), anchor: "north", text(size: 7pt)${textContent(xTitle)})`
		);
	}
	return lines;
}

function histogramTypst(scene: HistogramScene, size: CourbeSize): string {
	const { W, H, X, Y } = frame(size, scene.xMin, scene.xMax, scene.yMax);
	const color = TYPST_COLORS[scene.color];
	// Seconde série (Q117) : hachures diagonales, cadre de la même teinte
	const hatch = scene.hatched === true ? TYPST_COLORS[scene.hatchColor ?? 'orange'] : null;
	// Tirages d'une loi à densité (manche 14) : rectangles éclaircis, la courbe par-dessus
	const fill = scene.densityCurve === undefined ? color : `${color}.lighten(55%)`;
	const lines: string[] = ['  import cetz.draw: *'];

	if (scene.mode === 'axe') lines.push('  // graduations', ...valueTicks(scene.ticks, W, Y));

	for (const rect of scene.rects) {
		lines.push('  // rectangle');
		// Bordure blanche : sépare deux classes voisines de même couleur
		lines.push(
			hatch !== null
				? `  rect((${X(rect.lower)}, 0), (${X(rect.upper)}, ${Y(rect.height)}), fill: hachures, stroke: 0.6pt + ${hatch})`
				: `  rect((${X(rect.lower)}, 0), (${X(rect.upper)}, ${Y(rect.height)}), fill: ${rect.highlighted === false ? OUTSIDE_COLOR : fill}, stroke: 0.8pt + white)`
		);
		// Au-dessus du rectangle, comme à l'écran : un rectangle bas ou nul le cachait
		if (scene.showValues) {
			lines.push(
				`  content((${X((rect.lower + rect.upper) / 2)}, ${fmt(Number(Y(rect.height)) + 0.06)}), anchor: "south", text(size: 6.5pt)${textContent(rect.valueLabel)})`
			);
		}
	}

	// La courbe de la loi, APRÈS les rectangles : par-dessus (même trait que ```loi)
	if (scene.densityCurve !== undefined) {
		const path = scene.densityCurve.points.map((p) => `(${X(p.x)}, ${Y(p.y)})`).join(', ');
		lines.push('  // courbe de densité');
		lines.push(
			`  line(${path}, stroke: (paint: ${TYPST_COLORS[scene.densityCurve.color]}, thickness: 1.1pt, join: "round"))`
		);
	}

	// Mode carreaux : le quadrillage APRÈS les rectangles, pour y compter les carreaux
	if (scene.mode === 'carreaux') {
		lines.push('  // quadrillage');
		for (const x of scene.grid.xs) {
			lines.push(`  line((${X(x)}, 0), (${X(x)}, ${fmt(H)}), stroke: 0.4pt + luma(120))`);
		}
		for (const y of scene.grid.ys) {
			lines.push(`  line((0, ${Y(y)}), (${fmt(W)}, ${Y(y)}), stroke: 0.4pt + luma(120))`);
		}
	}

	lines.push(
		...boundLabels(scene.xTicks, X),
		...axes(W, H, scene.axisTitles.y, scene.axisTitles.x)
	);

	const legend =
		scene.carreau === null
			? ''
			: `\n// légende d'aire\n#align(center, text(size: 7.5pt)[#box(width: 6pt, height: 6pt, stroke: 0.5pt) #h(3pt) #${typstString(scene.carreau.legend)}])`;
	// Deux séries (lot 5 PR c) : le nom au-dessus de chaque histogramme, le second
	// dessous, puis le tableau d'indicateurs
	const hatchDef =
		hatch === null
			? ''
			: `#let hachures = tiling(size: (4pt, 4pt))[#place(line(start: (0pt, 4pt), end: (4pt, 0pt), stroke: 0.8pt + ${hatch}))]\n`;
	const name =
		scene.seriesName === undefined
			? ''
			: `#align(center, text(size: 8pt, weight: "bold")${textContent(scene.seriesName)})\n`;
	const second = scene.second === undefined ? '' : `\n${histogramTypst(scene.second, size)}`;
	const table = scene.indicatorTable
		? `\n// indicateurs\n${comparisonTypst(scene.indicatorTable)}`
		: '';
	return `${CETZ_IMPORT}\n${hatchDef}\n${keptWithTitle(headOf(scene), `${name}#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}${legend}${second}${table}`;
}

function cumulativeTypst(scene: CumulativeScene, size: CourbeSize): string {
	const { W, H, X, Y } = frame(size, scene.xMin, scene.xMax, 100);
	const color = TYPST_COLORS[scene.color];
	const lines: string[] = [
		'  import cetz.draw: *',
		'  // graduations',
		...valueTicks(scene.ticks, W, Y)
	];

	const path = scene.points.map((p) => `(${X(p.x)}, ${Y(p.y)})`).join(', ');
	lines.push('  // polygone');
	lines.push(`  line(${path}, stroke: (paint: ${color}, thickness: 1.1pt, join: "round"))`);
	for (const p of scene.points) {
		lines.push(`  circle((${X(p.x)}, ${Y(p.y)}), radius: 0.05, fill: ${color}, stroke: none)`);
	}

	for (const reading of scene.readings) {
		const x = X(reading.x);
		const y = Y(reading.percent);
		lines.push('  // lecture');
		lines.push(
			`  line((0, ${y}), (${x}, ${y}), (${x}, 0), stroke: (paint: luma(90), thickness: 0.5pt, dash: "dashed"))`
		);
		// Au début du pointillé, du côté libre (au-dessus si le polygone croît)
		const above = scene.direction === 'croissantes';
		lines.push(
			`  content((0.06, ${fmt(Number(y) + (above ? 0.04 : -0.04))}), anchor: "${above ? 'south-west' : 'north-west'}", text(size: 6.5pt)${textContent(reading.text)})`
		);
	}

	// Deux séries (lot 5 PR c) : le second polygone en pointillés, ses lectures
	// étiquetées de l'autre côté du trait (sinon les deux « Me » se superposent)
	const second = scene.second;
	if (second !== undefined) {
		const paint = TYPST_COLORS[second.color];
		const path2 = second.points.map((p) => `(${X(p.x)}, ${Y(p.y)})`).join(', ');
		lines.push('  // second polygone');
		lines.push(
			`  line(${path2}, stroke: (paint: ${paint}, thickness: 1.1pt, dash: "dashed", join: "round"))`
		);
		for (const p of second.points) {
			lines.push(`  circle((${X(p.x)}, ${Y(p.y)}), radius: 0.05, fill: ${paint}, stroke: none)`);
		}
		for (const reading of second.readings) {
			const x = X(reading.x);
			const y = Y(reading.percent);
			lines.push('  // lecture');
			lines.push(
				`  line((0, ${y}), (${x}, ${y}), (${x}, 0), stroke: (paint: ${paint}, thickness: 0.5pt, dash: "dotted"))`
			);
			const below = scene.direction === 'croissantes';
			lines.push(
				`  content((${fmt(Number(x) + 0.06)}, ${fmt(Number(y) + (below ? -0.04 : 0.04))}), anchor: "${below ? 'north-west' : 'south-west'}", text(size: 6.5pt, fill: ${paint})${textContent(reading.text)})`
			);
		}
	}

	lines.push(
		...boundLabels(scene.xTicks, X),
		...axes(W, H, scene.axisTitles.y, scene.axisTitles.x)
	);
	const legend =
		scene.legend === undefined || second === undefined
			? ''
			: `\n// légende des séries\n#align(center, text(size: 7.5pt)[#box(width: 14pt, height: 6pt, align(horizon, line(length: 14pt, stroke: 1.1pt + ${color}))) #h(3pt) #${typstString(scene.legend[0])} #h(10pt) #box(width: 14pt, height: 6pt, align(horizon, line(length: 14pt, stroke: (paint: ${TYPST_COLORS[second.color]}, thickness: 1.1pt, dash: "dashed")))) #h(3pt) #${typstString(scene.legend[1])}])`;
	const table = scene.indicatorTable
		? `\n// indicateurs\n${comparisonTypst(scene.indicatorTable)}`
		: '';
	return `${CETZ_IMPORT}\n\n${keptWithTitle(headOf(scene), `#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}${legend}${table}`;
}

/**
 * Courbe de densité (lois à densité, manche 13, PR b) : l'aire de la
 * probabilité choisie hachurée (`tiling`, comme la seconde série des barres),
 * puis la courbe ; les mêmes points qu'à l'écran.
 */
function densityTypst(
	scene: DensityScene,
	size: CourbeSize,
	title: string | null = scene.title
): string {
	const { W, H, X, Y } = frame(size, scene.xMin, scene.xMax, scene.yMax);
	const color = TYPST_COLORS[scene.color];
	const path = (points: readonly ScenePoint[]) =>
		points.map((p) => `(${X(p.x)}, ${Y(p.y)})`).join(', ');
	const lines: string[] = [
		'  import cetz.draw: *',
		'  // graduations',
		...valueTicks(scene.ticks, W, Y)
	];
	if (scene.area !== null) {
		lines.push('  // aire hachurée');
		lines.push(
			`  line(${path(scene.area)}, close: true, fill: hachures, stroke: 0.5pt + ${color})`
		);
	}
	lines.push('  // courbe de densité');
	lines.push(
		`  line(${path(scene.points)}, stroke: (paint: ${color}, thickness: 1.1pt, join: "round"))`
	);
	lines.push(
		...boundLabels(scene.xTicks, X),
		...axes(W, H, scene.axisTitles.y, scene.axisTitles.x)
	);
	const hatch = `#let hachures = tiling(size: (4pt, 4pt))[#place(line(start: (0pt, 4pt), end: (4pt, 0pt), stroke: 0.8pt + ${color}))]\n`;
	return `${CETZ_IMPORT}\n${hatch}\n${keptWithTitle(titleBlock(title), `#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}`;
}

/**
 * Moyenne des tirages selon n (atelier, Q81). Aucun bloc ne la produit : elle
 * est rendue pour qu'une scène de ce genre ne fasse jamais échouer une fiche.
 */
function meanTypst(scene: MeanScene, size: CourbeSize): string {
	const W = WIDTH_CM[size];
	const H = W * STAT_CHART_ASPECT_RATIO;
	const X = (x: number) => fmt(((x - scene.xMin) / Math.max(1, scene.xMax - scene.xMin)) * W);
	const Y = (y: number) => fmt(((y - scene.yMin) / (scene.yMax - scene.yMin || 1)) * H);
	const color = TYPST_COLORS[scene.color];
	const path = scene.points.map((p) => `(${X(p.x)}, ${Y(p.y)})`).join(', ');
	const reference = Y(scene.reference.value);
	const lines = [
		'  import cetz.draw: *',
		'  // graduations',
		...valueTicks(scene.ticks, W, Y),
		'  // courbe',
		`  line(${path}, stroke: (paint: ${color}, thickness: 1pt, join: "round"))`,
		'  // espérance',
		`  line((0, ${reference}), (${fmt(W)}, ${reference}), stroke: (paint: luma(90), thickness: 0.6pt, dash: "dashed"))`,
		`  content((${fmt(W)}, ${reference}), anchor: "south-east", text(size: 6.5pt)${textContent(scene.reference.label)})`,
		...boundLabels(scene.xTicks, X),
		...axes(W, H, scene.axisTitles.y, scene.axisTitles.x)
	];
	return `${CETZ_IMPORT}\n\n${keptWithTitle(headOf(scene), `#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}`;
}

/**
 * Nuage de points (manche 15) : une croix par point, comme dans les manuels ;
 * la droite sur toute la largeur, G, et les pointillés des prévisions vers les
 * deux axes, comme les lectures du polygone. Les axes se croisent en
 * (`xMin` ; `yMin`).
 */
function scatterTypst(scene: ScatterScene, size: CourbeSize): string {
	const W = WIDTH_CM[size];
	const H = W * STAT_CHART_ASPECT_RATIO;
	const X = (x: number) => fmt(((x - scene.xMin) / (scene.xMax - scene.xMin || 1)) * W);
	const Y = (y: number) => fmt(((y - scene.yMin) / (scene.yMax - scene.yMin || 1)) * H);
	const color = TYPST_COLORS[scene.color];
	const arm = 0.07;
	const lines: string[] = [
		'  import cetz.draw: *',
		'  // graduations',
		...valueTicks(scene.ticks, W, Y)
	];
	for (const p of scene.predictions) {
		const x = X(p.x);
		const y = Y(p.y);
		lines.push('  // prévision');
		lines.push(
			`  line((0, ${y}), (${x}, ${y}), (${x}, 0), stroke: (paint: luma(90), thickness: 0.5pt, dash: "dashed"))`
		);
	}
	if (scene.line !== null) {
		const [from, to] = scene.line;
		lines.push('  // droite');
		lines.push(
			`  line((${X(from.x)}, ${Y(from.y)}), (${X(to.x)}, ${Y(to.y)}), stroke: (paint: ${color}, thickness: 1pt))`
		);
	}
	for (const p of scene.points) {
		const x = Number(X(p.x));
		const y = Number(Y(p.y));
		lines.push('  // point du nuage');
		lines.push(
			`  line((${fmt(x - arm)}, ${fmt(y - arm)}), (${fmt(x + arm)}, ${fmt(y + arm)}), stroke: 0.8pt + ${color})`,
			`  line((${fmt(x - arm)}, ${fmt(y + arm)}), (${fmt(x + arm)}, ${fmt(y - arm)}), stroke: 0.8pt + ${color})`
		);
	}
	if (scene.mean !== null) {
		const x = X(scene.mean.x);
		const y = Y(scene.mean.y);
		lines.push('  // point moyen');
		lines.push(`  circle((${x}, ${y}), radius: 0.06, fill: black, stroke: none)`);
		lines.push(
			`  content((${fmt(Number(x) + 0.08)}, ${fmt(Number(y) + 0.06)}), anchor: "south-east", text(size: 7pt, weight: "bold")[G])`
		);
	}
	lines.push(
		...boundLabels(scene.xTicks, X),
		...axes(W, H, scene.axisTitles.y, scene.axisTitles.x)
	);
	return `${CETZ_IMPORT}\n\n${keptWithTitle(headOf(scene), `#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`)}`;
}

// ============================================================================
// TABLEAU CROISÉ
// ============================================================================

/** Un `table()` Typst : en-têtes en gras, case à compléter vide. Pas de cetz. */
function crossTableTypst(scene: CrossTableScene): string {
	const bold = (text: string) => `text(weight: "bold")${textContent(text)}`;
	const cells: string[] = [];
	const push = (content: string) => cells.push(`  // case\n  ${content}`);

	push(scene.corner === null ? '[]' : `text(style: "italic")${textContent(scene.corner)}`);
	for (const header of scene.columnHeaders) push(bold(header));
	for (const row of scene.rows) {
		push(bold(row.header));
		for (const cell of row.cells) push(cell.hidden ? '[]' : textContent(cell.text));
	}

	const columns = scene.columnHeaders.length + 1;
	return keptWithTitle(
		titleBlock(scene.title),
		`#align(center)[#table(\n  columns: ${columns},\n  align: center + horizon,\n  inset: 5pt,\n  stroke: 0.5pt + luma(110),\n${cells.join(',\n')}\n)]`
	);
}

// ============================================================================
// LOI D'UNE VARIABLE ALÉATOIRE
// ============================================================================

/**
 * Un tableau de deux lignes, `gᵢ` et `P(G = gᵢ)` en mode math : la lettre est
 * une majuscule unique (contrôlée par le parseur), donc jamais une variable
 * Typst inconnue.
 */
function lawTypst(scene: LawScene): string {
	// Loi binomiale de plus de 30 valeurs (Q138) : le titre, puis les lignes seulement
	if (scene.tableHidden) return titleBlock(scene.title ?? scene.accessibleTitle);
	const letter = scene.variable.toLowerCase();
	if (scene.vertical !== undefined) return binomialTypst(scene, letter);
	const cells: string[] = [];
	const push = (content: string) => cells.push(`  // case\n  ${content}`);

	push(`[$${letter}_i$]`);
	for (const value of scene.values) push(textContent(value));
	push(`[$P(${scene.variable} = ${letter}_i)$]`);
	// Une case à compléter garde de quoi écrire : sinon sa colonne se réduit à rien
	for (const p of scene.probabilities)
		push(p.hidden ? '[#box(width: 1.2cm)]' : textContent(p.text));

	return keptWithTitle(
		titleBlock(scene.title),
		`#align(center)[#table(\n  columns: ${scene.values.length + 1},\n  align: center + horizon,\n  inset: 5pt,\n  stroke: 0.5pt + luma(110),\n${cells.join(',\n')}\n)]`
	);
}

/**
 * Loi binomiale (manche 11) : le nom de la loi en titre (« Loi de X : B(10 ; 0,3) »),
 * colonnes à la largeur du contenu, sans césure ; vertical si la ligne est trop large.
 */
function binomialTypst(scene: LawScene, letter: string): string {
	const hole = '[#box(width: 0.8cm)]';
	const cell = (p: (typeof scene.probabilities)[number]) => (p.hidden ? hole : textContent(p.text));
	// Mathématiques EN BLOC (`$ … $`) : jamais coupées ; `box` laissait « P(X = xᵢ » / « ) »
	const head = [`[$ ${letter}_i $]`, `[$ P(${scene.variable} = ${letter}_i) $]`];
	const cells = scene.vertical
		? [...head, ...scene.values.flatMap((v, i) => [textContent(v), cell(scene.probabilities[i])])]
		: [head[0], ...scene.values.map(textContent), head[1], ...scene.probabilities.map(cell)];
	const columns = scene.vertical ? 2 : scene.values.length + 1;
	return keptWithTitle(
		titleBlock(scene.title ?? scene.accessibleTitle),
		`#align(center)[#set text(size: 8.5pt, hyphenate: false)\n#table(\n  columns: (auto,) * ${columns},\n  align: center + horizon,\n  inset: 4pt,\n  stroke: 0.5pt + luma(110),\n${cells.map((c) => `  ${c}`).join(',\n')}\n)]`
	);
}

/**
 * Simulation (v2, lot 3) : une ligne par valeur, les nombres de la scène tels
 * quels — l'écran et le PDF montrent les mêmes tirages.
 */
function simulationTypst(scene: SimulationScene): string {
	const letter = scene.variable.toLowerCase();
	const cells: string[] = [];
	const push = (content: string) => cells.push(`  ${content}`);
	const header = (text: string) => `text(weight: "bold")${textContent(text)}`;

	push(`[$${letter}_i$]`);
	push(header(scene.headers.count));
	push(header(scene.headers.frequency));
	push(header(scene.headers.probability));
	for (const row of scene.rows) {
		push(textContent(row.value));
		push(textContent(row.count));
		push(textContent(row.frequency));
		push(textContent(row.probability));
	}

	const caption = `#align(center, text(size: 8pt)${textContent(scene.caption)})\n`;
	// En-têtes sans césure ni justification : « Fréquence ob-servée » (fiche compilée)
	return keptWithTitle(
		`${titleBlock(scene.title)}${caption}`,
		`#align(center)[#set text(hyphenate: false)\n#set par(justify: false)\n#table(\n  columns: (auto,) * 4,\n  align: center + horizon,\n  inset: 5pt,\n  stroke: 0.5pt + luma(110),\n${cells.join(',\n')}\n)]`
	);
}

/** Comparaison de deux séries (atelier) : une ligne par indicateur, une colonne par série */
function comparisonTypst(scene: ComparisonScene): string {
	const cells: string[] = [
		'  []',
		...scene.columns.map((c) => `  text(weight: "bold")${textContent(c)}`)
	];
	for (const row of scene.rows) {
		cells.push(`  text(weight: "bold")${textContent(row.header)}`);
		for (const cell of row.cells) cells.push(`  ${textContent(cell)}`);
	}
	return keptWithTitle(
		titleBlock(scene.title),
		`#align(center)[#table(\n  columns: ${scene.columns.length + 1},\n  align: center + horizon,\n  inset: 5pt,\n  stroke: 0.5pt + luma(110),\n${cells.join(',\n')}\n)]`
	);
}

/**
 * Tableau d'effectifs (Q125-Q129) : à l'horizontale, une ligne des valeurs puis
 * une par grandeur ; à la verticale au-delà de 12 valeurs. Les cases de la
 * scène telles quelles : l'écran et le PDF montrent les mêmes.
 */
function frequencyTableTypst(scene: FrequencyTableScene): string {
	const bold = (text: string) => `text(weight: "bold")${textContent(text)}`;
	// Une valeur, une classe ou un pourcentage ne se coupe jamais (« 100 % »,
	// « [10 ; 15[ ») : espaces insécables ; les en-têtes, eux, vont à la ligne
	const solid = (text: string) => text.replace(/ /g, '\u00a0');
	const cell = (text: string) => textContent(solid(text));
	// Une case à compléter garde de quoi écrire « 37,5 % » (Q130) ; 1,2 cm faisait déborder
	// six cases masquées sur une demi-page
	const HOLE = '[#box(width: 0.8cm)]';
	const cells: string[] = [];
	if (!scene.vertical) {
		cells.push(bold(scene.valueHeader), ...scene.columns.map((c) => bold(solid(c))));
		for (const row of scene.rows) {
			cells.push(bold(row.header), ...row.cells.map((c, i) => (row.hidden[i] ? HOLE : cell(c))));
		}
	} else {
		cells.push(bold(scene.valueHeader), ...scene.rows.map((row) => bold(row.header)));
		scene.columns.forEach((column, i) => {
			cells.push(
				bold(solid(column)),
				...scene.rows.map((row) => (row.hidden[i] ? HOLE : cell(row.cells[i])))
			);
		});
	}
	const count = scene.vertical ? scene.rows.length + 1 : scene.columns.length + 1;
	const caption = `#align(center, text(weight: "bold", size: 9pt)${textContent(scene.caption)})\n`;
	// Colonnes à la largeur de leur contenu, sans césure : des colonnes égales
	// écrasaient « Effectif » en « Ef-fec-tif » (fiche compilée)
	const table = `#align(center)[#set text(size: 8.5pt, hyphenate: false)\n#table(\n  columns: (auto,) * ${count},\n  align: center + horizon,\n  inset: 4pt,\n  stroke: 0.5pt + luma(110),\n${cells.map((c) => `  ${c}`).join(',\n')}\n)]`;
	// Le titre avec son tableau : 30 valeurs au plus (31 lignes à la verticale)
	// tiennent dans une colonne de fiche
	return keptWithTitle(caption, table);
}

/** Ligne d'indicateurs sous la figure (Q28) */
function indicatorsBlock(scene: StatChartScene): string {
	if (scene.indicators.length === 0) return '';
	// Ce qui est entre parenthèses ne se coupe pas : « P(X ⩽ 4) » restait « P(X » / « ⩽ 4) »
	const unbroken = (line: string) =>
		line.replace(/\(([^)]*)\)/g, (group) => group.replace(/ /g, '\u00a0'));
	// Lois à densité : de vrais exposants (`e#super[−1]`), jamais « e^(−1) » imprimé
	if (scene.indicatorParts !== undefined) {
		const lines = scene.indicatorParts.map((line) =>
			line.segments
				.map((segment) =>
					segment.exponent
						? `#super[#${typstString(segment.text.replace(/ /g, '\u00a0'))}]`
						: `#${typstString(unbroken(segment.text))}`
				)
				.join('')
		);
		return `\n// indicateurs\n#align(center, text(size: 8pt)[${lines.join('#" · "')}])`;
	}
	const kept = scene.indicators.map(unbroken);
	return `\n// indicateurs\n#align(center, text(size: 8pt)${textContent(kept.join(' · '))})`;
}

function figureTypst(scene: StatChartScene, size: CourbeSize): string {
	switch (scene.kind) {
		case 'barres':
			return barsTypst(scene, size);
		case 'circulaire':
			return pieTypst(scene, size);
		case 'histogramme':
			return histogramTypst(scene, size);
		case 'frequences-cumulees':
			return cumulativeTypst(scene, size);
		case 'tableau-croise':
			return crossTableTypst(scene);
		case 'loi':
			// Loi à densité (PR b) : le nom de la loi et la courbe, insécables
			if (scene.densityChart !== undefined) {
				return densityTypst(scene.densityChart, size, scene.title ?? scene.accessibleTitle);
			}
			// `diagramme: oui` : les bâtons sous le tableau ; loi géométrique : la mention dessous
			if (scene.chart === undefined) return lawTypst(scene);
			return `${lawTypst(scene)}\n${barsTypst(scene.chart, size)}${
				scene.chartNote === undefined
					? ''
					: `\n#align(center, text(size: 8pt, style: "italic")${textContent(scene.chartNote)})`
			}`;
		case 'simulation':
			return simulationTypst(scene);
		case 'comparaison':
			return comparisonTypst(scene);
		case 'effectifs':
			return frequencyTableTypst(scene);
		case 'moyenne-selon-n':
			return meanTypst(scene, size);
		case 'densite':
			return densityTypst(scene, size);
		case 'nuage':
			return scatterTypst(scene, size);
	}
}

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

export function generateStatChartTypst(
	node: StatChartNode,
	options: StatChartTypstOptions = {}
): string {
	if (!node.spec) return unavailable(options.language);

	// Une exception ici ferait échouer TOUTE la fiche : le cadre neutre vaut mieux
	try {
		const scene = buildStatChartScene(node.spec, {
			locale: options.language === 'en' ? 'en' : 'fr'
		});
		// `série:` seule (Q106, l'énoncé) : le titre et la série, sans figure ;
		// sinon la figure porte elle-même titre et série (`headOf`), insécables
		if (scene.series && scene.seriesOnly) return headOf(scene);
		return figureTypst(scene, node.spec.size) + indicatorsBlock(scene);
	} catch {
		return unavailable(options.language);
	}
}
