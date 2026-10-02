/**
 * Bloc ```courbe → Typst (cetz 0.3.0)
 * ===================================
 *
 * Dessine la MÊME scène que l'écran (`buildCourbeScene`) : mêmes polylignes,
 * mêmes points, mêmes bornes, mêmes termes de suites. Chaque primitive est précédée d'un commentaire
 * (`// trace f`, `// point A`…) qui permet de les compter dans les tests.
 *
 * ⚠️ En production, le PDF est compilé dans le navigateur par typst.ts
 * 0.6.1-rc5 : une seule erreur fait échouer TOUTE la fiche. D'où :
 * - noms de points en TEXTE italique (en mode math, `AB` serait une variable
 *   inconnue) ;
 * - indice d'un nom de courbe entre guillemets dès qu'il a plusieurs lettres ;
 * - bloc en erreur → cadre neutre « Figure indisponible », sans cetz.
 *
 * @module ubumark/generators/courbe-typst
 */

import type { CourbeColor, CourbeLabel, CourbeNode, CourbeSize } from '../types/courbe';
import { buildCourbeScene, type ScenePoint } from '../utils/courbe-scene';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface CourbeTypstOptions {
	/** Langue du document : séparateur décimal des graduations */
	language?: string;
}

/** Largeur du cadre en cm ; une colonne de fiche fait ~8,7 cm. Partagée avec les diagrammes statistiques. */
export const WIDTH_CM: Record<CourbeSize, number> = {
	petite: 4.5,
	moyenne: 6.5,
	grande: 7.6
};

const ASPECT_RATIO = 3 / 4;

/** Teintes du thème clair de l'écran (tokens `--color-*`) */
const TYPST_COLORS: Record<CourbeColor, string> = {
	bleu: 'rgb("#2563eb")',
	rouge: 'rgb("#dc2626")',
	vert: 'rgb("#15803d")',
	orange: 'rgb("#d97706")',
	violet: 'rgb("#7c3aed")',
	noir: 'black',
	gris: 'rgb("#6b7280")'
};

const UNAVAILABLE =
	'#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[Figure indisponible]';

// ============================================================================
// AIDE
// ============================================================================

function fmt(n: number): string {
	const s = n.toFixed(3).replace(/\.?0+$/, '');
	return s === '-0' || s === '' ? '0' : s;
}

/** Nom de courbe en math Typst, sans jamais produire de variable inconnue. */
function labelToTypst(label: CourbeLabel): string {
	const base = label.calligraphic ? `cal(${label.base})` : label.base;
	if (!label.sub) return `$${base}$`;
	const sub = /^([A-Za-z]|\d+)$/.test(label.sub) ? label.sub : `"${label.sub}"`;
	return `$${base}_(${sub})$`;
}

// ============================================================================
// GÉNÉRATEUR
// ============================================================================

export function generateCourbeTypst(node: CourbeNode, options: CourbeTypstOptions = {}): string {
	if (!node.spec) return UNAVAILABLE;

	const scene = buildCourbeScene(node.spec, {
		locale: options.language === 'en' ? 'en' : 'fr'
	});
	const w = scene.window;
	const W = WIDTH_CM[node.spec.size];
	const H = W * ASPECT_RATIO;
	const X = (x: number) => fmt(((x - w.xMin) / (w.xMax - w.xMin)) * W);
	const Y = (y: number) => fmt(((y - w.yMin) / (w.yMax - w.yMin)) * H);
	const P = (p: ScenePoint) => `(${X(p.x)}, ${Y(p.y)})`;

	/** Polyligne en coordonnées cm, sans doublons consécutifs dus à l'arrondi */
	const path = (points: ScenePoint[]): string => {
		const out: string[] = [];
		for (const p of points) {
			const coord = P(p);
			if (out[out.length - 1] !== coord) out.push(coord);
		}
		// Un morceau réduit à un point par l'arrondi reste une ligne valide
		if (out.length === 1) out.push(out[0]);
		return out.join(', ');
	};

	const lines: string[] = ['  import cetz.draw: *'];

	// Grille
	lines.push('  // grille');
	for (const x of scene.grid.xs) {
		lines.push(`  line((${X(x)}, 0), (${X(x)}, ${fmt(H)}), stroke: 0.3pt + luma(205))`);
	}
	for (const y of scene.grid.ys) {
		lines.push(`  line((0, ${Y(y)}), (${fmt(W)}, ${Y(y)}), stroke: 0.3pt + luma(205))`);
	}

	// Aires
	for (const area of scene.areas) {
		lines.push('  // aire');
		lines.push(
			`  line(${path(area.polygon)}, close: true, stroke: none, fill: ${TYPST_COLORS[area.color]}.transparentize(78%))`
		);
	}

	// Axes
	const ax = Y(scene.axes.xAxisY);
	const ay = X(scene.axes.yAxisX);
	lines.push('  // axes');
	lines.push(
		`  line((0, ${ax}), (${fmt(W + 0.35)}, ${ax}), stroke: 0.6pt, mark: (end: ">", fill: black))`
	);
	lines.push(
		`  line((${ay}, 0), (${ay}, ${fmt(H + 0.35)}), stroke: 0.6pt, mark: (end: ">", fill: black))`
	);

	// Graduations
	lines.push('  // graduations');
	for (const t of scene.ticks.x) {
		const x = X(t.value);
		lines.push(
			`  line((${x}, ${fmt(Number(ax) - 0.06)}), (${x}, ${fmt(Number(ax) + 0.06)}), stroke: 0.5pt)`
		);
		lines.push(
			`  content((${x}, ${fmt(Number(ax) - 0.1)}), anchor: "north", text(size: 6.5pt)[${t.label}])`
		);
	}
	for (const t of scene.ticks.y) {
		const y = Y(t.value);
		lines.push(
			`  line((${fmt(Number(ay) - 0.06)}, ${y}), (${fmt(Number(ay) + 0.06)}, ${y}), stroke: 0.5pt)`
		);
		lines.push(
			`  content((${fmt(Number(ay) - 0.1)}, ${y}), anchor: "east", text(size: 6.5pt)[${t.label}])`
		);
	}
	if (scene.originVisible) {
		lines.push(
			`  content((${fmt(Number(ay) - 0.1)}, ${fmt(Number(ax) - 0.1)}), anchor: "north-east", text(size: 6.5pt)[O])`
		);
	}

	// Asymptotes
	for (const a of scene.asymptotes) {
		lines.push('  // asymptote');
		lines.push(
			`  line(${P(a.from)}, ${P(a.to)}, stroke: (paint: luma(110), thickness: 0.6pt, dash: "dashed"))`
		);
	}

	// Courbes
	for (const curve of scene.curves) {
		const dash = curve.dashed ? ', dash: "dashed"' : '';
		for (const poly of curve.polylines) {
			lines.push(`  // trace ${curve.functionName}`);
			lines.push(
				`  line(${path(poly)}, stroke: (paint: ${TYPST_COLORS[curve.color]}, thickness: 1.1pt, join: "round"${dash}))`
			);
		}
	}

	// Tangentes : droite en pointillés (couleur de la courbe) et point de contact
	for (const t of scene.tangents) {
		const color = TYPST_COLORS[t.color];
		for (const poly of t.line) {
			lines.push(`  // tangente ${t.functionName}`);
			lines.push(
				`  line(${path(poly)}, stroke: (paint: ${color}, thickness: 0.8pt, dash: "dashed"))`
			);
		}
		lines.push(`  // contact ${t.functionName}`);
		lines.push(`  circle(${P(t.point)}, radius: 0.05, fill: ${color}, stroke: none)`);
	}

	// Bornes du domaine
	for (const e of scene.endpoints) {
		const color = TYPST_COLORS[e.color];
		lines.push('  // borne');
		lines.push(
			`  circle(${P(e)}, radius: 0.065, fill: ${e.open ? 'white' : color}, stroke: 0.7pt + ${color})`
		);
	}

	// Escaliers : y = x, courbe de la relation, rappels, escalier, rangs
	for (const seq of scene.sequences) {
		const st = seq.staircase;
		if (!st) continue;
		const color = TYPST_COLORS[seq.color];
		for (const poly of st.diagonal) {
			lines.push('  // diagonale');
			lines.push(
				`  line(${path(poly)}, stroke: (paint: luma(110), thickness: 0.6pt, dash: "dashed"))`
			);
		}
		for (const poly of st.curve) {
			lines.push(`  // relation ${seq.name}`);
			lines.push(
				`  line(${path(poly)}, stroke: (paint: ${TYPST_COLORS[st.relationColor]}, thickness: 1.1pt, join: "round"))`
			);
		}
		for (const g of st.guides) {
			lines.push(`  // rappel ${seq.name}`);
			lines.push(
				`  line(${P(g.from)}, ${P(g.to)}, stroke: (paint: ${color}, thickness: 0.5pt, dash: "dotted"))`
			);
		}
		for (const poly of st.steps) {
			lines.push(`  // escalier ${seq.name}`);
			lines.push(
				`  line(${path(poly)}, stroke: (paint: ${color}, thickness: 0.9pt, join: "round"))`
			);
		}
		// Sous les graduations de l'axe des abscisses
		for (const l of st.termLabels) {
			lines.push(`  // rang ${seq.name}`);
			lines.push(
				`  content((${X(l.x)}, ${fmt(Number(ax) - 0.38)}), anchor: "north", text(size: 7pt, fill: ${color})[$${seq.name}_(${l.n})$])`
			);
		}
	}

	// Termes des suites : un disque par terme, non reliés
	for (const seq of scene.sequences) {
		const color = TYPST_COLORS[seq.color];
		for (const t of seq.terms) {
			lines.push(`  // terme ${seq.name}`);
			lines.push(`  circle(${P(t)}, radius: 0.06, fill: ${color}, stroke: none)`);
		}
	}

	// Points nommés : nom en TEXTE italique (jamais en mode math)
	for (const p of scene.points) {
		lines.push(`  // point ${p.name}`);
		lines.push(`  circle(${P(p)}, radius: 0.05, fill: black, stroke: none)`);
		lines.push(
			`  content((${fmt(Number(X(p.x)) + 0.08)}, ${fmt(Number(Y(p.y)) + 0.08)}), anchor: "south-west", text(size: 8pt, style: "italic")[${p.name}])`
		);
	}

	// Noms des courbes
	for (const l of scene.curveLabels) {
		lines.push(`  // nom`);
		lines.push(
			`  content((${fmt(Number(X(l.x)) + 0.12)}, ${fmt(Number(Y(l.y)) + 0.12)}), anchor: "south-west", text(size: 9pt, fill: ${TYPST_COLORS[l.color]})[${labelToTypst(l.label)}])`
		);
	}

	return `#import "@preview/cetz:0.3.0"\n\n#align(center, cetz.canvas({\n${lines.join('\n')}\n}))`;
}
