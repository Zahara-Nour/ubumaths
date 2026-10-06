/**
 * La variable d'une commande (`.diff`) : explicite après une virgule, sinon
 * déduite de l'expression.
 *
 * ⚠️ **Le dernier mot n'est PAS une variable.** L'ancienne règle de `.diff`
 * (« le dernier mot séparé par un espace est la variable ») donnait des
 * réponses fausses sans erreur : l'espace est aussi un produit implicite
 * (`x^2 y`, `a x^2 + b x`) et le dernier mot est souvent l'argument d'une
 * fonction (`\sin x + \cos x` devenait `\sin x + \cos`). Aucune règle sur le
 * dernier mot ne distingue `x^2 y` (« x²y ») de `x^2 y` (« x², en y ») : c'est
 * la même chaîne. Seul un séparateur qui n'existe pas dans une expression lève
 * l'ambiguïté — la virgule de premier niveau.
 *
 * @module cli/core/variable-argument
 */

import type { MathNode } from '../../types';
import { getVariables } from '../../eval/substitute';

// =============================================================================
// Constantes
// =============================================================================

/**
 * Un nom de variable après la virgule : `t`, `x_1`, `x_{12}`, `theta`,
 * `\theta`. Le backslash d'une lettre grecque est retiré.
 */
const VARIABLE_NAME = /^\\?([A-Za-z][A-Za-z0-9]*(?:_(?:[A-Za-z0-9]|\{[A-Za-z0-9]+\}))?)$/;

/**
 * Noms que l'expression contient mais qui ne sont pas des variables candidates
 * par défaut : `e` (Euler), `i` (imaginaire), `pi`. On peut toujours dériver
 * par rapport à eux en les nommant.
 */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(['e', 'i', 'pi']);

/** Variable par défaut quand l'expression n'en dit rien (constante). */
const DEFAULT_VARIABLE = 'x';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Séparer `expression, variable`.
 *
 * Seule la DERNIÈRE virgule de premier niveau compte (hors parenthèses,
 * crochets, accolades — `f(x, y)` et la virgule décimale MathLive `3{,}5`
 * restent dans l'expression), et seulement si elle est suivie d'un nom de
 * variable et précédée d'une expression non vide. Sinon, toute la saisie est
 * l'expression : une virgule restante y sera une erreur de lecture, jamais
 * une réponse silencieusement fausse.
 */
export function splitVariableArgument(input: string): {
	expression: string;
	variable: string | null;
} {
	const trimmed = input.trim();
	let depth = 0;
	let lastComma = -1;
	for (let index = 0; index < trimmed.length; index++) {
		const char = trimmed[index];
		if (char === '(' || char === '[' || char === '{') depth++;
		else if (char === ')' || char === ']' || char === '}') depth--;
		else if (char === ',' && depth === 0) lastComma = index;
	}
	if (lastComma === -1) return { expression: trimmed, variable: null };

	const expression = trimmed.slice(0, lastComma).trim();
	const name = VARIABLE_NAME.exec(trimmed.slice(lastComma + 1).trim());
	if (expression === '' || name === null) return { expression: trimmed, variable: null };
	return { expression, variable: name[1] };
}

/**
 * La variable par défaut d'une expression : `x` si elle apparaît, sinon la
 * seule variable libre, sinon (aucune) `x`.
 *
 * Plusieurs variables sans `x` : on ne devine pas — `candidates` les liste
 * pour que l'appelant demande laquelle.
 *
 * @param bound - Noms liés ailleurs (`.let a = 2`), qui sont des constantes.
 */
export function defaultVariable(
	node: MathNode,
	bound: Iterable<string> = []
): { ok: true; variable: string } | { ok: false; candidates: readonly string[] } {
	const excluded = new Set([...CONSTANT_NAMES, ...bound]);
	const variables = getVariables(node);
	if (variables.has(DEFAULT_VARIABLE)) return { ok: true, variable: DEFAULT_VARIABLE };

	const candidates = [...variables].filter((name) => !excluded.has(name)).sort();
	if (candidates.length === 0) return { ok: true, variable: DEFAULT_VARIABLE };
	if (candidates.length === 1) return { ok: true, variable: candidates[0] };
	return { ok: false, candidates };
}
