/**
 * Bloc ```figure — types
 * ======================
 *
 * Figure de géométrie statique écrite dans le DSL de geometry-core, EN LIGNE
 * dans le bloc (décision Q53 : les variables de modèle `{{c}}` y sont donc
 * remplacées avant l'analyse), sous un en-tête :
 *
 * ```figure
 * fenetre: -1 ; 8 ; -1 ; 6
 * taille: petite
 * description: Triangle rectangle ABC.
 * ---
 * A = point(0, 0)
 * B = point(5, 0)
 * ```
 *
 * Le nœud ne garde que l'en-tête analysé et le script BRUT : l'analyse reste
 * légère (pas de geometry-core dans le chunk des pages Markdown). Le script est
 * interprété par `utils/figure-scene.ts`, chargé à la demande.
 *
 * @module ubumark/types/figure
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

export const FIGURE_SIZES = ['petite', 'moyenne', 'grande'] as const;
export type FigureSize = (typeof FIGURE_SIZES)[number];

/** Largeur de la FENÊTRE à l'écran par taille, en px (comme ```courbe) ; la hauteur suit (isotrope). */
export const FIGURE_PIXEL_WIDTH: Record<FigureSize, number> = {
	petite: 280,
	moyenne: 400,
	grande: 560
};

/** Largeur de la fenêtre au PDF par taille, en cm (comme ```courbe) ; une colonne de fiche fait ~8,7 cm. */
export const FIGURE_WIDTH_CM: Record<FigureSize, number> = {
	petite: 4.5,
	moyenne: 6.5,
	grande: 7.6
};

/**
 * Taille des noms et textes à l'écran, en px : DOIT valoir le `font-size` de
 * `.figure-etiquette` (`FigureBlockView.svelte`) — le placement en dépend.
 */
export const FIGURE_LABEL_FONT_PX = 13;

/**
 * Marge autour de la fenêtre à l'écran quand les axes sont affichés, en px
 * (flèches et graduations au-delà du cadre) : la marge `PAD` de ```courbe.
 */
export const FIGURE_AXES_MARGIN_PX = 26;

/** Fenêtre en coordonnées mathématiques (repère ISOTROPE : la hauteur se déduit). */
export interface FigureWindow {
	xMin: number;
	xMax: number;
	yMin: number;
	yMax: number;
}

/** Pas en x et en y (grille, graduations), comme `grille: 1 ; 2` de ```courbe */
export interface FigureStep {
	x: number;
	y: number;
}

export interface FigureHeader {
	/** null : fenêtre absente ou invalide (erreur dans `errors`) */
	window: FigureWindow | null;
	size: FigureSize;
	description: string | null;
	/** `axes: oui` : axes fléchés, origine « O », graduations */
	axes: boolean;
	/** `grille:` : pas du quadrillage ; null = pas de grille */
	grid: FigureStep | null;
	/**
	 * `graduations:` : pas des graduations ; null = celui de la grille, sinon 1 ;
	 * false = `graduations: non` (axes sans graduation)
	 */
	ticks: FigureStep | false | null;
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève, Q48). */
export interface FigureIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```figure */
	line?: number;
	/** Piste de correction donnée par geometry-core (`DslRuntimeError.details.hint`) */
	hint?: string;
}

// ============================================================================
// NŒUD
// ============================================================================

export interface FigureNode extends BaseNode {
	type: 'figure';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	header: FigureHeader;
	/** Script DSL brut, après le séparateur `---` */
	script: string;
	/** Ligne du bloc où commence le script (ligne 1 du script) */
	scriptStartLine: number;
	/** Erreurs de l'en-tête ou de structure (le script n'est alors pas interprété) */
	errors: FigureIssue[];
}

export interface FigureBlockRange {
	startIndex: number;
	endIndex: number;
	/** false : clôture ``` absente */
	closed?: boolean;
}

// ============================================================================
// BUDGET
// ============================================================================

/**
 * Plafonds (Q56 : le bloc est rendu dans le chat élève et le tableau blanc, une
 * entrée hostile ne doit jamais figer l'onglet). Au-delà, refus avec message.
 */
export const FIGURE_LIMITS = {
	/** Caractères du script */
	scriptChars: 20_000,
	/** Lignes du script */
	scriptLines: 500,
	/** Objets de la figure, cachés compris (`Figure.setElementLimit`) */
	elements: 400,
	/** Instructions exécutées + tours de boucle (`interpret(…, { maxSteps })`) */
	steps: 5_000,
	/** Valeur absolue maximale d'une borne de fenêtre */
	bound: 1e6,
	/** Étendue minimale, relative à la plus grande borne (et à 1) */
	relativeExtent: 1e-6,
	/** Rapport hauteur / largeur de la fenêtre, dans [1/aspect ; aspect] */
	aspect: 4,
	/** Lignes de grille ou graduations par axe (la borne de ```courbe) */
	gridLines: 200
} as const;
