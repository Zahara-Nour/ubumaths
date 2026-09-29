/**
 * Virgule décimale NUE
 * ====================
 *
 * MathLive écrit la virgule décimale française `3{,}14`. Une virgule NUE
 * (`3,14` : collage, clavier physique — MathLive n'a pas de séparateur décimal
 * réglé —, auteur de gabarit) doit se lire de même ; le parseur, lui, la refuse.
 *
 * Mais une virgule est aussi un SÉPARATEUR : couple `(3,14)`, ensemble
 * `\{1,2,3\}`, intervalle `[3,14]` / `]3,14[`, liste `1,2,3`, arguments
 * `f(x,y)`, `3, 4`. Deux lectures :
 *
 * - contexte NOMBRE (nombre simple, valeur d'une grandeur, évaluation) :
 *   toute virgule nue entre deux chiffres est décimale ({@link bareDecimalCommaToPoint}) ;
 * - ÉQUIVALENCE : c'est la réponse ATTENDUE qui décide. Si elle porte une
 *   virgule séparatrice ({@link expectsSeparatorComma}), aucune virgule nue
 *   n'est relue, ni chez l'élève ni dans l'attendue ; sinon toutes le sont.
 *
 * Une écriture à point-virgule (`A(1,5;2)`, `[1,5;2]`, convention française)
 * n'a jamais de virgule séparatrice : ses virgules entre chiffres sont décimales.
 *
 * @module mathAST/decimal-comma
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Virgule collée entre deux chiffres (un chiffre avant : ni `\,` ni `{,}`) */
const DECIMAL_COMMA_BETWEEN_DIGITS = /(\d),(\d)/g;

/** Virgule nue (ni `\,` espace fine, ni `{,}` virgule MathLive) avec ses voisins */
const BARE_COMMA_WITH_NEIGHBOURS = /(.?)(?<![\\{]),(?!\})(.?)/g;

/** Liste de nombres : `1,2,3` (deux virgules nues dans la même suite de chiffres) */
const NUMBER_LIST = /\d,\d+,\d/;

/**
 * Couple ou intervalle de deux nombres, parenthèses ou crochets dans tous les
 * sens : `(3,14)`, `[3,14]`, `]3,14[`, `(-3,5)`.
 */
const NUMBER_PAIR = /[([\]]\s*[+-]?\d+,\d+\s*[)\][]/;

/** Ensemble en extension : `\{1,2\}` */
const SET_WITH_COMMA = /\\\{[^}]*(?<![\\{]),(?!\})/;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Contexte NOMBRE : `3,14` → `3.14`, `1\,200,5` → `1\,200.5` */
export function bareDecimalCommaToPoint(latex: string): string {
	return latex.replace(DECIMAL_COMMA_BETWEEN_DIGITS, '$1.$2');
}

/**
 * Vrai quand la réponse attendue porte une virgule SÉPARATRICE : virgule nue
 * hors de deux chiffres (`f(x,y)`, `3, 4`), liste, couple, intervalle ou
 * ensemble de nombres. Jamais avec un point-virgule.
 */
export function expectsSeparatorComma(latex: string): boolean {
	if (latex.includes(';')) return false;
	const bare = latex.replace(/\\(?:left|right)/g, '');
	for (const [, before, after] of bare.matchAll(BARE_COMMA_WITH_NEIGHBOURS)) {
		if (!/\d/.test(before) || !/\d/.test(after)) return true;
	}
	return NUMBER_LIST.test(bare) || NUMBER_PAIR.test(bare) || SET_WITH_COMMA.test(bare);
}
