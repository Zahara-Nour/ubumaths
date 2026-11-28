/**
 * Bloc ```labyrinthe → Typst
 * ==========================
 *
 * La grille de nombres, une flèche devant l'entrée (bord gauche), les sorties numérotées de
 * haut en bas (bord droit). À parcourir (`parcourir: oui`), l'élève trace le chemin au
 * crayon : rien de plus. `solution: oui` (corrigé imprimé) : les cases du bon chemin teintées
 * et leurs nombres en gras, lisibles aussi imprimés en noir et blanc.
 *
 * Formes Typst natives (`#grid`, `box`), ni paquet ni image. Un bloc en erreur devient le
 * cadre neutre « Labyrinthe indisponible » — jamais une erreur de compilation (une seule
 * erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/labyrinthe-typst
 */

import { LABYRINTHE_UNAVAILABLE, type LabyrintheNode } from '../types/labyrinthe';

// ============================================================================
// CONSTANTES
// ============================================================================

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

const UNAVAILABLE_TYPST = `#block(${FRAME})[${LABYRINTHE_UNAVAILABLE}]`;

/** Largeur que la grille ne dépasse pas (cm) : elle tient dans une colonne */
const LARGEUR_MAX_CM = 8.5;

/** Hauteur d'une case (cm) */
const HAUTEUR_CM = 0.75;

/** Largeur d'une case : de quoi écrire le plus long nombre (cm par caractère, marge) */
const CM_PAR_CARACTERE = 0.2;
const MARGE_CM = 0.35;
const LARGEUR_MIN_CM = 0.9;

/** Colonnes de l'entrée et des sorties (cm) */
const BORD_CM = 0.6;

/** Teinte des cases du bon chemin */
const TEINTE = 'rgb("#b7e1bd")';

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (value: number) => `${Number(value.toFixed(3))}cm`;

/** Typst d'un bloc ```labyrinthe : la grille, l'entrée, les sorties ; le chemin en solution */
export function generateLabyrintheTypst(node: LabyrintheNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const plusLong = Math.max(...spec.nombres.flat().map((n) => n.length));
	const voulue = Math.max(LARGEUR_MIN_CM, plusLong * CM_PAR_CARACTERE + MARGE_CM);
	// Arrondie vers le bas au millième : la grille ne dépasse jamais la colonne
	const largeur =
		Math.floor(Math.min(voulue, (LARGEUR_MAX_CM - 2 * BORD_CM) / spec.colonnes) * 1000) / 1000;
	// Plus étroite que voulu : le texte rapetisse d'autant
	const taille = Math.max(6, Math.round(9 * (largeur / voulue) * 10) / 10);
	const surLeChemin = new Set(spec.chemin.map((c) => `${c.ligne},${c.col}`));

	const cellules: string[] = [];
	for (let ligne = 1; ligne <= spec.lignes; ligne++) {
		cellules.push(ligne === spec.entree ? '[#text(weight: "bold")[→]]' : '[]');
		for (let col = 1; col <= spec.colonnes; col++) {
			const nombre = spec.nombres[ligne - 1][col - 1];
			const bon = spec.solution && surLeChemin.has(`${ligne},${col}`);
			const texte = bon ? `#text(weight: "bold")[${nombre}]` : nombre;
			cellules.push(
				`box(width: ${cm(largeur)}, height: ${cm(HAUTEUR_CM)}, fill: ${bon ? TEINTE : 'white'}, stroke: 0.4pt + luma(110))[#align(center + horizon)[${texte}]]`
			);
		}
		cellules.push(`[#text(size: 7pt)[${ligne}]]`);
	}

	const colonnes = [cm(BORD_CM), ...Array(spec.colonnes).fill(cm(largeur)), cm(BORD_CM)];
	return [
		'#align(center)[#block(breakable: false)[',
		`#set text(size: ${taille}pt)`,
		`#grid(columns: (${colonnes.join(', ')}), rows: ${cm(HAUTEUR_CM)}, align: center + horizon, ${cellules.join(', ')})`,
		']]'
	].join('\n');
}
