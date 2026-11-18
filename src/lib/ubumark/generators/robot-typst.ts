/**
 * Bloc ```robot → Typst
 * =====================
 *
 * Le quadrillage de cases (cases grises, case verte, le robot sur sa case de départ, son nez
 * dans son sens en avance-pivote). Robot à produire (`produire: oui`) : en dessous,
 * « Écris le code : » et 15 cases vides, à remplir à la main (BO du CE1 : quinze instructions
 * au plus). Cases plus larges en avance-pivote (« avance de 3 » s'y écrit).
 *
 * Formes Typst natives (`#place(rect(…))`, `polygon`), ni paquet ni image ; la case verte a
 * aussi un bord épais, pour rester visible imprimée en noir et blanc.
 *
 * Un bloc en erreur devient le cadre neutre « Robot indisponible » — jamais une erreur de
 * compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/robot-typst
 */

import {
	ROBOT_MAX_INSTRUCTIONS,
	ROBOT_UNAVAILABLE,
	type Case,
	type RobotNode,
	type RobotScene,
	type Sens
} from '../types/robot';

// ============================================================================
// CONSTANTES
// ============================================================================

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

const UNAVAILABLE_TYPST = `#block(${FRAME})[${ROBOT_UNAVAILABLE}]`;

/** La consigne au-dessus des cases du code, sur la fiche */
export const ROBOT_ECRIS_LE_CODE = 'Écris le code :';

/** Côté d'une case du quadrillage (cm), au plus */
const CASE_CM = 0.8;

/** Largeur et hauteur que le quadrillage ne dépasse pas (cm) : il tient dans une colonne */
const LARGEUR_MAX_CM = 8;
const HAUTEUR_MAX_CM = 7;

/** Cases du code : carrées en flèches, larges en avance-pivote */
const CODE_FLECHES = { largeur: 0.9, hauteur: 0.9, colonnes: 8 };
const CODE_AVANCE_PIVOTE = { largeur: 2.6, hauteur: 0.9, colonnes: 3 };

/** Nez du robot (triangle), dans le repère de sa case : centre (0, 0), côté 1, y vers le bas */
const NEZ: Record<Sens, [number, number][]> = {
	haut: [
		[-0.16, -0.26],
		[0, -0.44],
		[0.16, -0.26]
	],
	bas: [
		[-0.16, 0.26],
		[0, 0.44],
		[0.16, 0.26]
	],
	droite: [
		[0.26, -0.16],
		[0.44, 0],
		[0.26, 0.16]
	],
	gauche: [
		[-0.26, -0.16],
		[-0.44, 0],
		[-0.26, 0.16]
	]
};

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

const memeCase = (a: Case, b: Case) => a.col === b.col && a.ligne === b.ligne;

/** Le quadrillage, ses cases grises et verte, le robot */
function quadrillageTypst(scene: RobotScene): string {
	const k = Math.min(CASE_CM, LARGEUR_MAX_CM / scene.colonnes, HAUTEUR_MAX_CM / scene.lignes);
	/** Repère du bloc ((1, 1) en bas à gauche) → coin haut gauche de la boîte */
	const left = (c: Case) => (c.col - 1) * k;
	const top = (c: Case) => (scene.lignes - c.ligne) * k;
	const place = (dx: number, dy: number, body: string) =>
		`  #place(top + left, dx: ${cm(dx)}, dy: ${cm(dy)}, ${body})`;

	const parts: string[] = [];
	for (let ligne = 1; ligne <= scene.lignes; ligne++) {
		for (let col = 1; col <= scene.colonnes; col++) {
			const c = { col, ligne };
			const grise = scene.interdites.some((g) => memeCase(g, c));
			const verte = scene.arrivee !== null && memeCase(scene.arrivee, c);
			const fill = grise ? 'luma(150)' : verte ? 'rgb("#b7e1bd")' : 'white';
			parts.push(
				place(
					left(c),
					top(c),
					`rect(width: ${cm(k)}, height: ${cm(k)}, fill: ${fill}, stroke: 0.4pt + luma(110))`
				)
			);
		}
	}
	if (scene.arrivee !== null) {
		// Bord épais de la case verte, par-dessus ses voisines (visible en noir et blanc)
		const a = scene.arrivee;
		parts.push(
			place(
				left(a),
				top(a),
				`rect(width: ${cm(k)}, height: ${cm(k)}, stroke: 1.4pt + rgb("#2e7d32"))`
			)
		);
	}

	// Le robot : un corps arrondi, deux yeux ; son nez dans son sens (avance-pivote)
	const cx = left(scene.depart) + k / 2;
	const cy = top(scene.depart) + k / 2;
	const corps = 0.56 * k;
	parts.push(
		place(
			cx - corps / 2,
			cy - corps / 2,
			`rect(width: ${cm(corps)}, height: ${cm(corps)}, radius: ${cm(0.12 * k)}, fill: black)`
		)
	);
	const oeil = 0.07 * k;
	for (const dx of [-0.13, 0.13]) {
		parts.push(
			place(cx + dx * k - oeil, cy - 0.04 * k - oeil, `circle(radius: ${cm(oeil)}, fill: white)`)
		);
	}
	if (scene.sens !== null) {
		const sommets = NEZ[scene.sens]
			.map(([x, y]) => `(${cm(cx + x * k)}, ${cm(cy + y * k)})`)
			.join(', ');
		parts.push(`  #place(top + left, polygon(fill: black, ${sommets}))`);
	}

	const width = cm(scene.colonnes * k);
	const height = cm(scene.lignes * k);
	return [`#box(width: ${width}, height: ${height})[`, ...parts, ']'].join('\n');
}

/** « Écris le code : » et 15 cases vides */
function casesDuCodeTypst(scene: RobotScene): string {
	const format = scene.codage === 'avance-pivote' ? CODE_AVANCE_PIVOTE : CODE_FLECHES;
	const vide = `box(width: ${cm(format.largeur)}, height: ${cm(format.hauteur)}, stroke: (paint: luma(120), dash: "dashed"), radius: 2pt)`;
	const cases = Array.from({ length: ROBOT_MAX_INSTRUCTIONS }, () => vide).join(', ');
	return [
		`${ROBOT_ECRIS_LE_CODE}`,
		'',
		`#grid(columns: ${format.colonnes}, column-gutter: 0.25cm, row-gutter: 0.25cm, ${cases})`
	].join('\n');
}

/** Typst d'un bloc ```robot : le quadrillage ; à produire, les cases du code en dessous */
export function generateRobotTypst(node: RobotNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;
	const figure = ['#align(center)[#block(breakable: false)[', quadrillageTypst(spec), ']]'].join(
		'\n'
	);
	if (!spec.produire) return figure;
	return [figure, '', casesDuCodeTypst(spec)].join('\n');
}
