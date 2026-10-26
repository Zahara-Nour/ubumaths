/**
 * Atelier — modèle d'objet
 *
 * Un objet de l'atelier = un nom + une définition + un état d'affichage.
 * C'est l'unité que les trois vues (Calcul, Graphe, Données) se partagent.
 *
 * Spécification : `docs/archive/wip/atelier-recherche-eleve-phase0.md` §1.
 *
 * @module atelier/types
 */

import type { Provenance } from './parse';
import type { CurveColor } from '$lib/grapheur/colors';
import type { LineStyle } from '$lib/grapheur/types';
import type { Domain } from '$lib/mathAST/domain/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Les quatre types du v1, et les deux de la géométrie (v2, lot 1 : `point`,
 * `curve`). Python (v3) en ajoutera.
 */
export type ObjectKind = 'value' | 'function' | 'sequence' | 'list' | 'point' | 'curve';

/**
 * L'état d'un objet. Décision D9.
 *
 * Priorité : `error` > `pending` > `incomplete` > `ok`. Une définition qu'on ne
 * sait pas lire ne peut rien promettre, donc l'erreur prime sur l'attente.
 */
export type ObjectStatus = 'ok' | 'incomplete' | 'pending' | 'error';

/**
 * Un nom cité par une définition et que l'atelier ne connaît pas.
 *
 * `as` vient de la grammaire, pas d'une devinette : un identifiant suivi d'une
 * parenthèse est une fonction, une lettre seule est une valeur — et seule la
 * seconde peut recevoir une offre de curseur (§2.5 N3 et L4).
 */
export interface MissingReference {
	readonly name: string;
	readonly as: 'value' | 'function';
}

/**
 * Bornes et pas d'un curseur.
 *
 * Décision D3 : toute valeur numérique libre est pilotable par un curseur,
 * bornes [-10 ; 10] par défaut, ajustables.
 */
export interface Slider {
	readonly min: number;
	readonly max: number;
	readonly step: number;
}

interface AtelierObjectBase {
	/** Une lettre latine, éventuellement suivie d'un indice numérique. Unique. */
	readonly name: string;
	readonly kind: ObjectKind;
	/**
	 * La définition telle que l'élève l'a saisie.
	 *
	 * Vide = objet « incomplet » : il existe, rien n'est tracé, et ce n'est
	 * PAS une erreur (§2.1 L2).
	 */
	readonly definition: string;
	/** Où en est cet objet. Voir `ObjectStatus`. */
	readonly status: ObjectStatus;
	/**
	 * Message en français, présent pour `error` et `pending`.
	 *
	 * L'objet existe et porte son état : l'atelier reste utilisable (§2.1 E2).
	 */
	readonly message?: string;
	/**
	 * L'objet est-il affiché dans la vue Graphe ?
	 *
	 * C'est un état d'AFFICHAGE, pas une propriété mathématique : il vit sur
	 * l'objet parce que l'atelier détient l'état (décision figée n° 1), et la
	 * vue n'en est qu'une projection.
	 */
	readonly plotted?: boolean;
	/**
	 * Ce qui manque, pour `pending` seulement.
	 *
	 * Se vide tout seul dès que les objets nommés apparaissent : une attente se
	 * répare sans que l'élève ait à y revenir (§2.5 N2).
	 */
	readonly missing?: readonly MissingReference[];
	/**
	 * D'où vient la définition — décision D10 : c'est la provenance qui choisit
	 * le parseur, jamais le contenu.
	 *
	 * ⚠️ Elle vit SUR l'objet parce que `recomputeAll` repart toujours de
	 * `parseDefinition` : sans mémoire, une définition LaTeX serait relue en
	 * texte au premier recalcul, donc dès qu'un autre objet change.
	 */
	readonly provenance?: Provenance;
}

export interface ValueObject extends AtelierObjectBase {
	readonly kind: 'value';
	/** Unité, quand la valeur est une grandeur. Décision D4 : pas de curseur. */
	readonly unit?: string;
	readonly slider?: Slider;
	/**
	 * Curseur affiché depuis le menu de la carte alors que la valeur n'est pas un
	 * paramètre (lot 4a de la refonte). Retenu avec l'atelier, comme la couleur
	 * d'une courbe (décision de David du 2026-10-18). Absent quand il est caché.
	 */
	readonly sliderShown?: true;
}

/**
 * Comment une fonction est dessinée — repris du panneau du grapheur.
 *
 * ⚠️ Vit SUR l'objet, et pas dans le grapheur : c'est l'atelier qui détient
 * l'état (décision figée n° 1). Le grapheur n'en reçoit qu'une copie
 * (`plot-sync`) ; un réglage qu'il garderait seul serait écrasé à la
 * synchronisation suivante. Phase 0 `/grapheur` §1, S1 à S4.
 *
 * Pas de `showDerivative` : la case « f′ » du grapheur est remplacée par
 * l'action « Dériver », qui crée la carte `f′` (phase 0, Q1).
 */
export interface CurveDisplay {
	readonly color: CurveColor;
	readonly lineStyle: LineStyle;
	readonly lineWidth: number;
	/** Abscisse du point de tangence, ou `null` sans tangente. */
	readonly tangentAt: number | null;
	/** Bornes de l'aire signée sous la courbe, ou `null` sans aire. */
	readonly integral: { readonly from: number; readonly to: number } | null;
	/** Cercle osculateur au point de tangence. */
	readonly showOsculating: boolean;
	/** Longueur de la courbe, sur les bornes de l'aire. */
	readonly showArcLength: boolean;
	/**
	 * Lecture graphique de l'image : les calculs `f(a)` de la console et un
	 * point glissant se lisent en pointillés (lot 3 bis de la refonte).
	 */
	readonly showReading: boolean;
}

export interface FunctionObject extends AtelierObjectBase {
	readonly kind: 'function';
	/**
	 * 𝒞f est-elle affichée dans la vue Géométrie ? (géométrie v2, K1) — un état
	 * d'affichage, comme `plotted`, rangé avec l'objet. Absent = non affichée.
	 */
	readonly inFigure?: boolean;
	/** Décision D2 : `x` seulement en v1 — `createEvaluator` la code en dur. */
	readonly variable: 'x';
	/**
	 * La lettre que l'élève a choisie (`f(t) = t^2`), pour l'AFFICHAGE seulement.
	 * Absente = x. ⚠️ La définition rangée est TOUJOURS en x (décision de David,
	 * 2026-10-06) : tout l'atelier calcule en x, seule la carte montre `t`.
	 * Voir `letter.ts`.
	 */
	readonly letter?: string;
	/**
	 * L'ensemble sur lequel l'élève a défini la fonction (`f(x) = x^2 sur [0;+∞[`),
	 * tel qu'il l'a ÉCRIT après « sur » — texte ou LaTeX selon `provenance`, relu
	 * par `parseStudentDomain` (`interval.ts`). Absent = définie sur son domaine ;
	 * `sur ℝ` n'est pas rangé.
	 */
	readonly interval?: string;
	/**
	 * L'ensemble HÉRITÉ des fonctions que la définition cite (`g(x) = f(x) + 1`
	 * avec f sur [0 ; +∞[, décision d du 2026-10-13) : recalculé à chaque passage
	 * (`citedIntervals`), jamais sauvegardé. L'ensemble de la fonction est son
	 * intersection avec `interval` (`intervalDomainOf`).
	 */
	readonly inheritedInterval?: Domain;
	/**
	 * Les conditions des composées qui ont donné `inheritedInterval`
	 * (`g(x) = f(2x)` → « 2x doit être dans [0 ; +∞[ », chantier composees,
	 * Q2), dites par `.domaine g`. Recalculées avec lui, jamais sauvegardées.
	 */
	readonly inheritedConditions?: readonly string[];
	/**
	 * Carte `f⁻¹` seulement : l'intervalle I tapé dans `.réciproque f sur I`, sur
	 * lequel f est inversée — CROISÉ avec celui de f à chaque recalcul. Absent =
	 * celui de f (ou son domaine). L'`interval` de la carte, lui, est son ensemble de départ f(I),
	 * recalculé avec la formule (`reciprocal.ts`), jamais rangé.
	 */
	readonly reciprocalOn?: string;
	/**
	 * Réglages d'affichage. Absents tant que la fonction n'a jamais été tracée :
	 * ils naissent au premier tracé, puis survivent au retrait (§1 L1).
	 */
	readonly display?: CurveDisplay;
}

/** Explicite `u(n) = f(n)`, ou récurrence d'ordre 1 `u(n+1) = f(u(n))`. */
export type SequenceMode = 'explicit' | 'recurrence';

export interface SequenceObject extends AtelierObjectBase {
	readonly kind: 'sequence';
	/** Décision D2 : `n` seulement en v1. */
	readonly variable: 'n';
	/**
	 * Le mode. Une définition qui se cite elle-même est une récurrence ; les
	 * suites rangées avant le lot 5 (sans mode) le retrouvent ainsi (S4).
	 */
	readonly mode: SequenceMode;
	/** Le rang du premier terme (n₀), entier positif ou nul. */
	readonly firstIndex: number;
	/**
	 * Le premier terme d'une récurrence : un NOMBRE, ou le NOM d'une valeur de
	 * l'atelier — dont le curseur fait alors varier u₀ (décision S1). Ignoré
	 * pour une suite explicite.
	 */
	readonly firstTerm: string;
	/**
	 * Réglages du tracé, nés au premier tracé (lot 5b, U2) : nuage des rangs ou
	 * escalier, comme le panneau du grapheur.
	 */
	readonly display?: SequenceDisplay;
}

/** Comment une suite est dessinée — repris du panneau du grapheur (U2). */
export interface SequenceDisplay {
	readonly color: CurveColor;
	readonly lineStyle: LineStyle;
	readonly lineWidth: number;
	/** Nuage des points (n, uₙ), ou escalier (récurrence seulement). */
	readonly representation: 'ranks' | 'cobweb';
	/** Nombre de marches de l'escalier. */
	readonly cobwebSteps: number;
}

/**
 * Le trait d'une courbe de la figure (lot 4b de la refonte) : les trois champs
 * de `CurveDisplay` qu'une courbe peut porter — ni tangente ni aire, elle ne va
 * jamais dans Graphe (G0). Absent tant que l'élève n'a rien réglé.
 *
 * `color` absente : la couleur par défaut de la figure, celle qui est peinte —
 * régler le trait seul ne repeint pas la courbe d'une autre couleur.
 */
export interface StrokeDisplay extends Pick<CurveDisplay, 'lineStyle' | 'lineWidth'> {
	readonly color?: CurveColor;
}

/** La taille d'un point de la figure. */
export const POINT_SIZES = ['small', 'medium', 'large'] as const;
export type PointSize = (typeof POINT_SIZES)[number];

/**
 * Comment un point de la figure est dessiné (lot 4b de la refonte) : couleur,
 * taille, et son étiquette (son nom écrit près de lui). Absent tant que
 * l'élève n'a rien réglé.
 */
export interface PointDisplay {
	/** Absente : la couleur par défaut de la figure (comme `StrokeDisplay`). */
	readonly color?: CurveColor;
	readonly size: PointSize;
	readonly showLabel: boolean;
}

export interface ListObject extends AtelierObjectBase {
	readonly kind: 'list';
	/**
	 * Sa colonne dans la grille de la vue Données, 0 à 25 (A à Z) : une liste EST
	 * une colonne nommée (tableur intégré, T1). Ses cellules sont les entrées de
	 * `definition`, une par ligne (`grid.ts`).
	 */
	readonly column: number;
	/**
	 * Le nom de la liste qui sert d'ORDONNÉES quand celle-ci est tracée.
	 *
	 * ⚠️ État d'affichage, comme `plotted`, et il vit ici pour la même raison :
	 * c'est l'atelier qui détient l'état. Sans lui, la synchronisation
	 * recalculerait « la suivante du panneau » et ignorerait le choix que
	 * l'élève vient de faire en cliquant « Nuage avec N ».
	 */
	readonly plottedWith?: string;
	/** Les valeurs analysées. Les entrées non numériques sont écartées (§4 E1). */
	readonly values: readonly number[];
	/** Nombre d'entrées écartées, pour pouvoir le signaler (§4 E1). */
	readonly skipped: number;
	/**
	 * La ligne de la grille (1, 2…) de chaque élément de `values` — ou de
	 * `categories` pour une liste qualitative. Deux listes s'associent PAR
	 * LIGNE (décision P1) : voir `pairs.ts`.
	 */
	readonly rows: readonly number[];
	/**
	 * Tableur, lot 2 : le nombre de cellules de sa colonne dont la FORMULE est en
	 * erreur — leurs lignes n'ont pas de valeur. Absent sans formule en erreur.
	 */
	readonly formulaErrors?: number;
	/**
	 * Liste QUALITATIVE (Q84) : une modalité par entrée, dans l'ordre, chacune
	 * écrite comme sa première occurrence (Q85). Absent pour une liste de
	 * nombres ; `values` est alors vide.
	 */
	readonly categories?: readonly string[];
	/** La 1re entrée-mot d'une liste qui mélange nombres et mots (Q92) : l'aperçu la nomme */
	readonly qualitativeBecause?: string;
}

/**
 * Un point du plan (géométrie v2, décision G3) : `A = (1 ; 2)`.
 *
 * `definition` est le couple TEL QU'ÉCRIT, parenthèses comprises (`(a ; 2a)`) :
 * ses coordonnées se calculent comme une valeur, exactes d'abord, et suivent
 * les curseurs qu'elles citent. Pas de curseur à lui, pas de tracé dans Graphe
 * (la vue Figure, PR 2, le montrera).
 */
export interface PointObject extends AtelierObjectBase {
	readonly kind: 'point';
	/** Couleur, taille, étiquette (lot 4b). Absent : le dessin par défaut de la figure. */
	readonly display?: PointDisplay;
}

/**
 * Une courbe définie par une équation (décision G0) : `d : y = 3x − 2`,
 * `C : x² + y² = 1`, `v : x = 2`.
 *
 * `definition` est l'équation TELLE QU'ÉCRITE, sans le nom ni le « : » — jamais
 * réécrite en forme réduite (C7). Une courbe ne va jamais dans Graphe (G0).
 */
export interface CurveObject extends AtelierObjectBase {
	readonly kind: 'curve';
	/** Couleur et trait (lot 4b). Absent : le dessin par défaut de la figure. */
	readonly display?: StrokeDisplay;
}

export type AtelierObject =
	ValueObject | FunctionObject | SequenceObject | ListObject | PointObject | CurveObject;

// =============================================================================
// Constantes
// =============================================================================

/**
 * Plafonds de la décision D8.
 *
 * Choisis pour qu'un atelier complet tienne sous les 2 000 caractères d'URL
 * qui passent partout — ce ne sont pas les navigateurs qui tronquent, ce sont
 * les messageries et les ENT.
 */
export const MAX_LIST_VALUES = 200;
export const MAX_LISTS = 8;
/**
 * Longueur d'une définition rangée (sauvegarde, URL) : au-delà, la relecture
 * l'écarte. Une liste plus longue est refusée À LA SAISIE — 200 modalités de
 * 40 caractères étaient acceptées, puis perdues au rechargement (revue).
 */
export const MAX_DEFINITION_LENGTH = 4000;

/** Longueur d'un ensemble écrit après « sur » (`interval.ts`) : saisie, sauvegarde, lien. */
export const MAX_INTERVAL_LENGTH = 200;

/**
 * Plafond des objets de la figure, points et courbes réunis (M2, Q3 du
 * 2026-10-18) : même esprit que D8, pour qu'un atelier tienne dans une URL.
 */
export const MAX_FIGURE_OBJECTS = 50;

/** Liste qualitative (Q91) : modalités distinctes, longueur d'une modalité */
export const MAX_CATEGORIES = 20;
export const MAX_CATEGORY_LENGTH = 40;

// =============================================================================
// Gardes de type
// =============================================================================

export function isValue(o: AtelierObject): o is ValueObject {
	return o.kind === 'value';
}

export function isFunction(o: AtelierObject): o is FunctionObject {
	return o.kind === 'function';
}

export function isSequence(o: AtelierObject): o is SequenceObject {
	return o.kind === 'sequence';
}

export function isList(o: AtelierObject): o is ListObject {
	return o.kind === 'list';
}

export function isPoint(o: AtelierObject): o is PointObject {
	return o.kind === 'point';
}

export function isCurve(o: AtelierObject): o is CurveObject {
	return o.kind === 'curve';
}

/** Un objet de la figure : un point ou une courbe (plafond M2). */
export function isFigureObject(o: AtelierObject): o is PointObject | CurveObject {
	return o.kind === 'point' || o.kind === 'curve';
}

/** Une liste qualitative (Q84) : ses entrées sont des modalités, pas des nombres. */
export function isQualitative(
	list: ListObject
): list is ListObject & { categories: readonly string[] } {
	return list.categories !== undefined;
}

// =============================================================================
// Fonction à paramètre (V56)
// =============================================================================

/**
 * Les paramètres d'une fonction « à paramètre » : en attente de VALEURS
 * seulement (`f(x) = a x`, `a` non posé → `['a']`). `null` pour tout autre
 * objet — une fonction prête, ou en attente d'une FONCTION (`missing` en
 * `as: 'function'`), dont l'expression ne vaut rien sans elle (V56).
 * ⚠️ `p(x) = q(x)+1`, q inconnu, n'en est PAS : l'atelier lit `q(x)` comme
 * le produit q·x, et q comme une valeur — p est donc à paramètre q.
 */
export function parametersOf(object: AtelierObject): readonly string[] | null {
	if (object.kind !== 'function' || object.status !== 'pending') return null;
	const missing = object.missing ?? [];
	if (missing.length === 0 || missing.some((m) => m.as !== 'value')) return null;
	return missing.map((m) => m.name);
}

/**
 * « Le résultat dépend de a : donne-lui une valeur (a = 2) pour l'étudier. » —
 * le refus d'une commande, ou d'un bouton de la carte, que le paramètre
 * empêche de conclure (V56, V57).
 */
export function dependsOnMessage(parameters: readonly string[]): string {
	const letters = lettersText(parameters);
	// Une lettre grecque ne se définit pas dans l'atelier (`α = 2` est lu comme un
	// test d'égalité, mesuré le 2026-10-14) : pas d'exemple qui mènerait nulle part
	const definable = parameters.find((name) => GREEK_LETTERS[name] === undefined);
	if (definable === undefined) {
		const them = parameters.length === 1 ? 'la par un nombre' : 'les par des nombres';
		return `Le résultat dépend de ${letters} : remplace-${them} pour l'étudier.`;
	}
	const pronoun = parameters.length === 1 ? 'lui' : 'leur';
	return `Le résultat dépend de ${letters} : donne-${pronoun} une valeur (${definable} = 2) pour l'étudier.`;
}

/** Les lettres grecques que le moteur nomme en toutes lettres (`\alpha` → `alpha`). */
const GREEK_LETTERS: Readonly<Record<string, string>> = {
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	theta: 'θ',
	lambda: 'λ',
	mu: 'μ',
	rho: 'ρ',
	sigma: 'σ',
	tau: 'τ',
	phi: 'φ',
	omega: 'ω'
};

/** Une lettre telle que l'élève l'a écrite : `α`, pas `alpha` (revue, 2026-10-14). */
function letterText(letter: string): string {
	return GREEK_LETTERS[letter] ?? letter;
}

/** `a`, `a et b`, `a, b et t` — lettres grecques en symboles. */
export function lettersText(letters: readonly string[]): string {
	const shown = letters.map(letterText);
	return shown.length === 1
		? shown[0]
		: `${shown.slice(0, -1).join(', ')} et ${shown[shown.length - 1]}`;
}
