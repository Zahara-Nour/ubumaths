/**
 * Exposants : signe sans accolades et exposants empilés (2026-10-20)
 *
 * Partagé par les quatre parseurs (maison et LaTeX, Pratt et RD) — chantier
 * lecture-grandeurs, décisions 8, 9 et 11 de David.
 *
 * - `10^-3` = `10^{-3}` : après `^`, un signe suivi d'UN nombre ou d'UNE lettre
 *   forme l'exposant (parseur maison). Devant un groupe (`2^-sin(x)`,
 *   `2^-(x+1)`), le signe est refusé : on ne sait pas jusqu'où va l'exposant.
 * - `2^3^2` est refusé : lu (2³)² par le parseur maison et 2^(3²) par le
 *   parseur LaTeX, il n'avait pas de lecture commune. `2^{3^2}` et `(2^3)^2`
 *   disent l'empilement sans ambiguïté.
 *
 * @module mathAST/parser/exponent-rules
 */

/** Deux exposants à la suite sur la même base (`2^3^2`, `e^x^2`) */
export const STACKED_EXPONENTS_MESSAGE = 'Two exponents in a row: write 2^{3^2} or (2^3)^2';

/** Un signe d'exposant suivi d'un groupe (`2^-sin(x)`, `2^-(x+1)`) */
export const NEGATIVE_EXPONENT_BEFORE_GROUP_MESSAGE =
	'Negative exponent before a group: write 2^{-…} or 2^(-…)';
