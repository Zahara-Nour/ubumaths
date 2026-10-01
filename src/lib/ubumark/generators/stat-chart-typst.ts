/**
 * Blocs ```barres et ```circulaire → Typst (cetz 0.3.0)
 * =====================================================
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

import type { CourbeColor, CourbeSize } from '../types/courbe';
import type { StatChartNode } from '../types/stat-chart';
import {
	buildStatChartScene,
	type BarScene,
	type PieScene,
	type ScenePoint
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

/** Largeur du cadre en cm, comme ```courbe ; une colonne de fiche fait ~8,7 cm. */
const WIDTH_CM: Record<CourbeSize, number> = {
	petite: 4.5,
	moyenne: 6.5,
	grande: 7.6
};

const ASPECT_RATIO = 3 / 4;

/** Teintes du thème clair de l'écran, comme ```courbe */
const TYPST_COLORS: Record<CourbeColor, string> = {
	bleu: 'rgb("#2563eb")',
	rouge: 'rgb("#dc2626")',
	vert: 'rgb("#15803d")',
	orange: 'rgb("#d97706")',
	violet: 'rgb("#7c3aed")',
	noir: 'black',
	gris: 'rgb("#6b7280")'
};

/** Palette des secteurs (même ordre que `StatChart.svelte`) */
const PIE_COLORS = [
	'rgb("#2563eb")',
	'rgb("#d97706")',
	'rgb("#15803d")',
	'rgb("#dc2626")',
	'rgb("#7c3aed")',
	'rgb("#0d9488")',
	'rgb("#6b7280")'
];

const UNAVAILABLE =
	'#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[Figure indisponible]';

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

function titleBlock(title: string | null): string {
	if (title === null) return '';
	return `#align(center, text(weight: "bold", size: 9pt)${textContent(title)})\n`;
}

// ============================================================================
// BARRES
// ============================================================================

function barsTypst(scene: BarScene, size: CourbeSize): string {
	const W = WIDTH_CM[size];
	const H = W * ASPECT_RATIO;
	const n = scene.bars.length;
	const X = (x: number) => fmt((x / n) * W);
	const Y = (y: number) => fmt((y / scene.yMax) * H);
	const color = TYPST_COLORS[scene.color];
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
			`  rect((${X(bar.left)}, 0), (${X(bar.right)}, ${Y(bar.value)}), fill: ${color}, stroke: none)`
		);
		const center = X((bar.left + bar.right) / 2);
		const label = `text(size: 6.5pt)${textContent(bar.label)}`;
		lines.push(
			scene.rotateLabels
				? `  content((${center}, -0.1), anchor: "east", angle: 45deg, ${label})`
				: `  content((${center}, -0.1), anchor: "north", ${label})`
		);
		if (scene.showValues) {
			lines.push(
				`  content((${center}, ${fmt(Number(Y(bar.value)) + 0.06)}), anchor: "south", text(size: 6.5pt)${textContent(bar.valueLabel)})`
			);
		}
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

	return `${CETZ_IMPORT}\n\n${titleBlock(scene.title)}#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`;
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

	const legend = scene.legend.map(
		(item) =>
			`    // légende\n    [#box(width: 7pt, height: 7pt, fill: ${PIE_COLORS[item.colorIndex]}) #h(3pt) #text(size: 8pt)${textContent(item.text)}]`
	);

	const canvas = `cetz.canvas({\n${lines.join('\n')}\n  })`;
	const stack = `align(left, stack(spacing: 4pt,\n${legend.join(',\n')}\n  ))`;
	return `${CETZ_IMPORT}\n\n${titleBlock(scene.title)}#align(center, grid(columns: 2, column-gutter: 14pt, align: horizon,\n  ${canvas},\n  ${stack}\n))`;
}

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

export function generateStatChartTypst(
	node: StatChartNode,
	options: StatChartTypstOptions = {}
): string {
	if (!node.spec) return UNAVAILABLE;

	const scene = buildStatChartScene(node.spec, {
		locale: options.language === 'en' ? 'en' : 'fr'
	});
	return scene.kind === 'barres'
		? barsTypst(scene, node.spec.size)
		: pieTypst(scene, node.spec.size);
}
