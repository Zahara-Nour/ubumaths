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

import { NAMED_COLORS, type NamedColor } from '$lib/theme/named-colors';
import type { BaseNode } from './ast';
import type { MathNode } from '$lib/mathAST/types';

// ============================================================================
// VALEURS
// ============================================================================

/**
 * Couleurs proposées à l'auteur : les 12 noms de la palette commune des figures
 * (src/lib/theme/named-colors.ts). Les synonymes anglais (`red`, `grey`…) sont
 * ramenés au nom français par les parseurs.
 */
export const COURBE_COLORS = NAMED_COLORS;
export type CourbeColor = NamedColor;

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

/** Terme calculé d'une suite : rang n et valeur u_n. */
export interface CourbeSequenceTerm {
	n: number;
	value: number;
}

/**
 * Escalier d'une récurrence `u(n+1) = f(u(n))` (option `escalier`) : le repère
 * devient (u_n ; u_{n+1}), on y trace la courbe de f, la droite y = x et
 * l'escalier, à la place du nuage de points.
 */
export interface CourbeStaircase {
	/** Option `termes` : rappels vers l'axe des abscisses et étiquettes u_0, u_1… */
	showTerms: boolean;
	/**
	 * Relation f : AST où `u(n)` est la variable `PREV_TERM_VARIABLE` du
	 * grapheur (`createRecurrenceFunctionEvaluator` l'évalue en x).
	 */
	relation: MathNode;
}

/**
 * Suite numérique : `u(n) = 2*n+1 pour n de 0 à 8` (explicite) ou
 * `v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9` (récurrente).
 *
 * Les termes sont calculés à l'analyse (budget borné, arrêt sur un terme non
 * fini ou démesuré) : l'écran et le PDF dessinent les mêmes nombres.
 */
export interface CourbeSequence {
	name: string;
	kind: 'explicite' | 'recurrence';
	/** Membre de droite après normalisation (`0.5*v(n)+2`) */
	expression: string;
	/** Premier rang dessiné (n0) */
	firstIndex: number;
	/** Dernier rang dessiné (n1) */
	lastIndex: number;
	/** Récurrence : premier terme donné (`v(0) = 1`) */
	firstTerm: CourbeSequenceTerm | null;
	/** Termes calculés de rang n0 à n1, rangs non définis absents */
	terms: CourbeSequenceTerm[];
	/** null : nuage de points (n ; u_n) */
	staircase: CourbeStaircase | null;
	color: CourbeColor;
	label: CourbeLabel | null;
	line: number;
}

/** Pas de la grille, par axe (repère anisotrope). */
export interface CourbeGrid {
	x: number;
	y: number;
}

/**
 * Tangente à la courbe d'une fonction (`tangente: f ; 1`) : pente calculée à
 * l'analyse (dérivée exacte de mathAST, sinon différence centrée).
 */
export interface CourbeTangent {
	functionName: string;
	/** Point de contact */
	x: number;
	y: number;
	/** f′(x) */
	slope: number;
	line: number;
}

/** Figure complète, valide : tout ce qu'il faut pour construire la scène. */
export interface CourbeSpec {
	window: CourbeWindow;
	/** null : pas automatique (`computeGridStep`) */
	grid: CourbeGrid | null;
	functions: CourbeFunction[];
	sequences: CourbeSequence[];
	points: CourbePoint[];
	asymptotes: CourbeAsymptote[];
	areas: CourbeArea[];
	/** Absent dans une spécification antérieure aux tangentes */
	tangents?: CourbeTangent[];
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
	/** false : clôture ``` absente, le bloc s'arrête à sa dernière ligne de courbe */
	closed?: boolean;
}

// ============================================================================
// BUDGET
// ============================================================================

/**
 * Plafonds : le bloc est aussi rendu dans le chat élève et le tableau blanc,
 * une entrée hostile ne doit jamais figer l'onglet. L'analyse REFUSE au-delà
 * (message situé) ; la scène TRONQUE, au cas où une spécification arriverait
 * sans passer par l'analyse.
 */
export const COURBE_LIMITS = {
	gridLines: 200,
	functions: 10,
	points: 50,
	asymptotes: 20,
	areas: 10,
	tangents: 10,
	sequences: 10,
	/** Termes CALCULÉS par suite (premier terme de la récurrence compris) */
	sequenceTerms: 200,
	/** Termes de toutes les suites d'une figure */
	totalSequenceTerms: 1000,
	/** Au-delà, une suite est jugée explosive : le calcul s'arrête */
	sequenceValue: 1e12,
	/** Valeur absolue maximale d'une borne de fenêtre */
	bound: 1e9,
	/** Étendue minimale, relative à la plus grande borne (et à 1) */
	relativeExtent: 1e-6
} as const;

/**
 * Pourquoi l'intervalle [min ; max] ne peut pas servir de fenêtre, ou null.
 * Au-delà de 10^9, ou trop étroit devant ses bornes, les multiples du pas ne
 * sont plus représentables en flottants : la grille ne finirait jamais.
 */
export function courbeRangeProblem(min: number, max: number): string | null {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return 'bornes non finies';
	if (Math.abs(min) > COURBE_LIMITS.bound || Math.abs(max) > COURBE_LIMITS.bound) {
		return 'bornes trop grandes (au plus 10^9 en valeur absolue)';
	}
	if (!(min < max)) return 'la première borne doit être inférieure à la seconde';
	const scale = Math.max(1, Math.abs(min), Math.abs(max));
	if (max - min < COURBE_LIMITS.relativeExtent * scale)
		return 'étendue trop petite devant les bornes';
	return null;
}
