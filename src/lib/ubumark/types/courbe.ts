/**
 * Bloc ```courbe — types
 * ======================
 *
 * Représentation d'une figure d'analyse statique : courbes de fonctions dans
 * un repère ANISOTROPE (fenêtre x et y indépendantes), grille, points nommés,
 * asymptotes données et aires sous la courbe.
 *
 * Le nœud porte toujours son texte source (aller-retour de l'éditeur riche) et,
 * en cas d'erreur, ses messages situés : une erreur ne fait PAS disparaître le
 * bloc (décision Q48 du 2026-10-01).
 *
 * @module ubumark/types/courbe
 */

import type { BaseNode } from './ast';
import type { MathNode } from '$lib/mathAST/types';

// ============================================================================
// VALEURS
// ============================================================================

/** Couleurs proposées à l'auteur (mots français, une par courbe). */
export const COURBE_COLORS = ['bleu', 'rouge', 'vert', 'orange', 'violet', 'noir', 'gris'] as const;
export type CourbeColor = (typeof COURBE_COLORS)[number];

export const COURBE_SIZES = ['petite', 'moyenne', 'grande'] as const;
export type CourbeSize = (typeof COURBE_SIZES)[number];

/** Fenêtre en coordonnées mathématiques. */
export interface CourbeWindow {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

/** Intervalle de définition donné par `sur [a ; b]`, `]a ; b]`… */
export interface CourbeDomain {
	min: number;
	max: number;
	/** `]a` : borne exclue (disque vide) */
	minOpen: boolean;
	/** `b[` : borne exclue (disque vide) */
	maxOpen: boolean;
}

/**
 * Nom de courbe en LaTeX restreint (`C_f`, `\mathcal{C}_f`, `C_{g}`).
 *
 * Volontairement structuré plutôt que du LaTeX libre : pas de `{@html}` à
 * l'écran, et la même étiquette se traduit sans ambiguïté en Typst.
 */
export interface CourbeLabel {
	/** Texte source, tel qu'écrit après `nom=` */
	latex: string;
	/** Lettre principale */
	base: string;
	/** Indice éventuel */
	sub: string | null;
	/** `\mathcal{…}` → lettre calligraphique */
	calligraphic: boolean;
}

export interface CourbeFunction {
	/** Nom de la fonction (`f`) */
	name: string;
	/** Expression après normalisation des signes (`x--2` → `x+2`) */
	expression: string;
	/** AST mathAST de l'expression, en x */
	ast: MathNode;
	domain: CourbeDomain | null;
	color: CourbeColor;
	dashed: boolean;
	label: CourbeLabel | null;
	/** Ligne du bloc (1 = première ligne après la clôture d'ouverture) */
	line: number;
}

export interface CourbePoint {
	name: string;
	x: number;
	y: number;
	line: number;
}

export interface CourbeAsymptote {
	/** `x=2` → verticale ; `y=1` → horizontale */
	kind: 'vertical' | 'horizontal';
	value: number;
	line: number;
}

export interface CourbeArea {
	functionName: string;
	from: number;
	to: number;
	line: number;
}

/** Pas de la grille, par axe (repère anisotrope). */
export interface CourbeGrid {
	x: number;
	y: number;
}

/** Figure complète, valide : tout ce qu'il faut pour construire la scène. */
export interface CourbeSpec {
	window: CourbeWindow;
	/** null : pas automatique (`computeGridStep`) */
	grid: CourbeGrid | null;
	functions: CourbeFunction[];
	points: CourbePoint[];
	asymptotes: CourbeAsymptote[];
	areas: CourbeArea[];
	size: CourbeSize;
	description: string | null;
}

// ============================================================================
// DIAGNOSTICS
// ============================================================================

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève). */
export interface CourbeIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```courbe */
	line?: number;
	/** Contenu de la ligne fautive */
	content?: string;
}

// ============================================================================
// NŒUD
// ============================================================================

/**
 * Nœud ```courbe.
 *
 * `spec` est null dès qu'il y a une erreur : la figure n'est pas dessinée, le
 * renderer affiche le message (prof) ou « Figure indisponible » (élève).
 */
export interface CourbeNode extends BaseNode {
	type: 'courbe';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	spec: CourbeSpec | null;
	errors: CourbeIssue[];
	warnings: CourbeIssue[];
}

export interface CourbeBlockRange {
	startIndex: number;
	endIndex: number;
}
