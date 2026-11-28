/**
 * Bloc ```yohaku → Typst
 * ======================
 *
 * La grille 2 × 2 encadrée, le total de chaque ligne à sa droite et de chaque colonne sous
 * elle, séparés de la grille par un espace. Les cases à remplir restent vides (l'élève écrit
 * au crayon) ; `solution: oui` (corrigé imprimé) y écrit la solution de l'auteur. Le signe de
 * l'opération (`×` ou `+`) est écrit en petit dans le coin haut-gauche.
 *
 * Formes Typst natives (`#grid`, `box`). Un bloc en erreur devient le cadre neutre « Grille
 * indisponible » — jamais une erreur de compilation (une seule erreur Typst fait échouer
 * toute la fiche).
 *
 * @module ubumark/generators/yohaku-typst
 */

import { YOHAKU_UNAVAILABLE, type YohakuNode } from '../types/yohaku';
import { convertLatexToTypstMath } from './typst-generator';

// ============================================================================
// CONSTANTES
// ============================================================================

const FRAME = 'stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt';

const UNAVAILABLE_TYPST = `#block(${FRAME})[${YOHAKU_UNAVAILABLE}]`;

/** Largeur et hauteur d'une case (cm) ; l'espace entre la grille et ses totaux (cm) */
const LARGEUR_CM = 2.6;
const HAUTEUR_CM = 1.2;
const ESPACE_CM = 0.3;

const SIGNES = { somme: '+', produit: '×' } as const;

// ============================================================================
// FONCTIONS
// ============================================================================

const cm = (value: number) => `${Number(value.toFixed(3))}cm`;

/** Une formule LaTeX en math Typst */
const formule = (latex: string) => `$${convertLatexToTypstMath(latex)}$`;

/** Typst d'un bloc ```yohaku : la grille, ses totaux ; la solution si `solution: oui` */
export function generateYohakuTypst(node: YohakuNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const contenu = (l: number, c: number): string => {
		const cellule = spec.cases[l][c];
		return !cellule.aRemplir || spec.solution ? formule(cellule.latex) : '';
	};
	const uneCase = (l: number, c: number): string => {
		const signe =
			l === 0 && c === 0
				? `#place(top + left, dx: 2pt, dy: 1pt, text(size: 6pt)[${SIGNES[spec.operation]}])`
				: '';
		return `box(width: ${cm(LARGEUR_CM)}, height: ${cm(HAUTEUR_CM)}, stroke: 0.6pt + luma(60))[${signe}#align(center + horizon)[${contenu(l, c)}]]`;
	};
	const unTotal = (latex: string) =>
		`box(width: ${cm(LARGEUR_CM)}, height: ${cm(HAUTEUR_CM)})[#align(center + horizon)[${formule(latex)}]]`;

	// 4 colonnes (case, case, espace, total) × 4 rangées (case, case, espace, total)
	const cellules = [
		uneCase(0, 0),
		uneCase(0, 1),
		'[]',
		unTotal(spec.lignes[0]),
		uneCase(1, 0),
		uneCase(1, 1),
		'[]',
		unTotal(spec.lignes[1]),
		'[]',
		'[]',
		'[]',
		'[]',
		unTotal(spec.colonnes[0]),
		unTotal(spec.colonnes[1]),
		'[]',
		'[]'
	];
	const colonnes = [cm(LARGEUR_CM), cm(LARGEUR_CM), cm(ESPACE_CM), cm(LARGEUR_CM)];
	const rangees = [cm(HAUTEUR_CM), cm(HAUTEUR_CM), cm(ESPACE_CM), cm(HAUTEUR_CM)];
	return [
		'#align(center)[#block(breakable: false)[',
		`#grid(columns: (${colonnes.join(', ')}), rows: (${rangees.join(', ')}), ${cellules.join(', ')})`,
		']]'
	].join('\n');
}
