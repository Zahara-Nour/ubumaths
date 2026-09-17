/**
 * Le tableau de signes comme DONNÉE, avant tout rendu.
 *
 * ⚠️ Ce fichier existe parce que le tableau de signes a désormais **deux**
 * rendus : le `\begin{array}` historique, et le composant `VariationTable` de
 * l'application — le seul des deux que MathLive sache afficher. Recalculer les
 * signes de chaque côté les ferait diverger un jour ; ils partent donc tous
 * deux de cette grille.
 *
 * Les constructeurs vivent dans `quadratic-renderer.ts`, auprès des helpers
 * numériques qu'ils emploient ; seules les formes sont ici.
 *
 * @module mathAST/pedagogical-solve/sign-table-grid
 */

/** Ce qu'une colonne de point critique porte, sur une ligne donnée. */
export type SignMark =
	/** La ligne s'annule en ce point. */
	| 'zero'
	/** Valeur interdite : double barre (zéro du dénominateur). */
	| 'bar';

/** Une ligne du tableau : son étiquette, ses signes, ses marques. */
export interface SignTableRow {
	/** `P(x)`, `Q(x)`, `\dfrac{P(x)}{Q(x)}`… en LaTeX. */
	readonly label: string;
	/**
	 * Le signe sur chaque intervalle, de gauche à droite.
	 *
	 * Longueur : `points.length - 1` — un intervalle entre deux points
	 * consécutifs, bornes infinies comprises.
	 */
	readonly intervals: readonly ('+' | '-')[];
	/**
	 * La marque portée à chaque point, ou `null` s'il n'y en a pas.
	 *
	 * Longueur : `points.length`. Les deux extrémités (±∞) valent toujours
	 * `null` — on ne marque rien sur une borne infinie.
	 */
	readonly marks: readonly (SignMark | null)[];
}

/**
 * Un tableau de signes complet.
 *
 * `points` va de `-\infty` à `+\infty`, bornes comprises, dans l'ordre
 * croissant. Chaque ligne est alignée dessus.
 */
export interface SignTableGrid {
	/** Le nom de l'inconnue : `x`, `t`… */
	readonly variable: string;
	/** Les bornes et points critiques, en LaTeX, de `-\infty` à `+\infty`. */
	readonly points: readonly string[];
	readonly rows: readonly SignTableRow[];
}
