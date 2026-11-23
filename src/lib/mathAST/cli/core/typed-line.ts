/**
 * Lire une ligne tapée par l'élève, avant tout parseur : `π`, `pi`, les degrés.
 *
 * Descendu de l'Atelier dans le registre le 2026-11-03 (chantier
 * `registre-reference`, lot 2, PR 3) : le registre est la référence commune
 * de l'Atelier, de `pnpm math` et de la calculatrice (D1). Une ligne s'y lit
 * donc comme dans l'Atelier, avec les mêmes refus :
 *
 * - `pi` écrit en lettres est REFUSÉ (le parseur maison le lit p·i) ;
 * - `π` tapé devient `\pi`, la constante (sinon une lettre nommée « π ») ;
 * - `60°`, `\cos(60^{\circ})` portent l'unité degré (`degrees.ts`) ; un `°`
 *   qui ne suit rien, ou un angle élevé à une puissance, est refusé.
 *
 * @module mathAST/cli/core/typed-line
 */

import { strayDegreeRefusal, withDegreeUnits } from './degrees';

// =============================================================================
// Types
// =============================================================================

/** La ligne prête pour les parseurs, ou le refus à dire à l'élève. */
export type TypedLine =
	{ readonly ok: true; readonly text: string } | { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

/**
 * `pi` écrit en lettres, comme un mot : `2pi`, `sin(pi x)`, `cos(x)=pi`.
 *
 * ⚠️ Décision de David (2026-10-06) : on le REFUSE — dans Calcul et dans la
 * grille (2026-10-15), puis dans le registre (2026-11-03). La notation custom
 * le lit p·i (i : l'imaginaire) — `f(x) = pi*x` restait « en attente de p »,
 * `.resoudre cos(x)=pi` répondait faux. `\pi` et `π` restent acceptés, ainsi
 * que `p*i` et les mots qui contiennent « pi » (`pile ; face`, `épi`) : avant
 * et après, aucune lettre ni antislash.
 */
export const PI_IN_LETTERS = /(?<![\p{L}\\])pi(?!\p{L})/u;

/** Ce qu'on répond à `pi` écrit en lettres. */
export const PI_IN_LETTERS_MESSAGE = 'Écris π avec \\pi ou le symbole π.';

/** Un exposant collé à l'unité degré : `60[°]^2`, `60\unit{°}^{2}`. */
export const DEGREE_POWER = /(?:\[°\]|\\unit\{°\})\s*\^/;

export const ANGLE_POWER_MESSAGE =
	'Une puissance d’un angle n’est pas une mesure : élève plutôt son cosinus, son sinus, ou une valeur sans unité.';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Le symbole `π` tapé tel quel, réécrit `\pi` — la constante, que les deux
 * parseurs connaissent. Sans quoi ils lisent une VARIABLE nommée « π » :
 * `f(x) = 2sin(π x)` ne s'évaluait pas, et sa dérivée l'affichait comme une
 * lettre (#896) ; le registre rendait `5π/6` « (variables: π) ».
 *
 * L'espace qui suit évite de coller la commande à une lettre (`πx` → `\pi x`,
 * pas `\pix`).
 */
export function withPiCommand(text: string): string {
	return text.replace(/π/g, '\\pi ');
}

/**
 * Une ligne tapée, lue comme dans l'Atelier : degrés en unité, `π` en
 * constante ; `pi` en lettres, un `°` seul et une puissance d'angle refusés.
 *
 * @param line - La ligne telle que tapée (commande comprise)
 * @example
 * readTypedLine('cos(60°)')   // { ok: true, text: 'cos(60[°])' }
 * readTypedLine('5π/6')       // { ok: true, text: '5\\pi /6' }
 * readTypedLine('cos(pi/3)')  // { ok: false, message: PI_IN_LETTERS_MESSAGE }
 */
export function readTypedLine(line: string): TypedLine {
	const text = withDegreeUnits(line, 'detect');
	const stray = strayDegreeRefusal(text);
	if (stray !== null) return { ok: false, message: stray };
	if (DEGREE_POWER.test(text)) return { ok: false, message: ANGLE_POWER_MESSAGE };
	if (PI_IN_LETTERS.test(text)) return { ok: false, message: PI_IN_LETTERS_MESSAGE };
	return { ok: true, text: withPiCommand(text) };
}
