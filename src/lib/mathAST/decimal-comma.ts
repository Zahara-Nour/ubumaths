/**
 * Virgule décimale NUE
 * ====================
 *
 * MathLive écrit la virgule décimale française `3{,}14`. Une virgule NUE
 * (`3,14` : collage, clavier physique, auteur de gabarit) doit se lire de même
 * là où un nombre est attendu — le parseur, lui, la refuse.
 *
 * Mais une virgule est aussi un SÉPARATEUR : couple `(3,14)`, ensemble
 * `\{1,2,3\}`, intervalle `[3,14]` / `]3,14[`, arguments `f(x,y)`, liste
 * `1,2,3`, `3, 4`. La relecture est donc bornée au cas sans ambiguïté :
 *
 * - une SEULE virgule nue dans toute l'écriture (hors `\,` et `{,}`) ;
 * - collée entre deux chiffres (`3,14`, pas `3, 4`) ;
 * - aucun délimiteur dans l'écriture : parenthèse, crochet, accolade
 *   d'ensemble `\{ \}`, point-virgule.
 *
 * @module mathAST/decimal-comma
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Virgule nue : ni `\,` (espace fine), ni `{,}` (virgule MathLive) */
const BARE_COMMA = /(?<![\\{]),(?!\})/g;

/** Virgule collée entre deux chiffres (un chiffre avant : ni `\,` ni `{,}`) */
const DECIMAL_COMMA_BETWEEN_DIGITS = /(\d),(\d)/;

/** Délimiteurs qui font d'une virgule un séparateur (couple, intervalle, ensemble) */
const SEPARATOR_CONTEXT = /[()[\];]|\\[{}]/;

// ============================================================================
// FONCTIONS
// ============================================================================

/**
 * Relit la virgule décimale nue d'un nombre (`3,14` → `3.14`) ; toute autre
 * écriture est rendue telle quelle (cf. en-tête du module).
 */
export function bareDecimalCommaToPoint(latex: string): string {
	const bareCommas = latex.match(BARE_COMMA) ?? [];
	if (bareCommas.length !== 1) return latex;
	if (SEPARATOR_CONTEXT.test(latex)) return latex;
	return latex.replace(DECIMAL_COMMA_BETWEEN_DIGITS, '$1.$2');
}
