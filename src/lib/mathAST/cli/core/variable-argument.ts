/**
 * La variable d'une commande (`.diff`) : explicite après un point-virgule,
 * sinon déduite de l'expression.
 *
 * ⚠️ **Le dernier mot n'est PAS une variable.** L'ancienne règle de `.diff`
 * (« le dernier mot séparé par un espace est la variable ») donnait des
 * réponses fausses sans erreur : l'espace est aussi un produit implicite
 * (`x^2 y`, `a x^2 + b x`) et le dernier mot est souvent l'argument d'une
 * fonction (`\sin x + \cos x` devenait `\sin x + \cos`). Aucune règle sur le
 * dernier mot ne distingue `x^2 y` (« x²y ») de `x^2 y` (« x², en y ») : c'est
 * la même chaîne. Seul un séparateur qui n'existe pas dans une expression lève
 * l'ambiguïté — le POINT-VIRGULE de premier niveau (`.diff a x^2 + b x ; x`).
 *
 * Pourquoi pas la virgule (décision de David, 2026-10-06) : en français elle
 * est décimale, et `;` est déjà le séparateur usuel ([a ; b], (3 ; 1)). Une
 * virgule hors groupe reste une erreur de lecture.
 *
 * @module cli/core/variable-argument
 */

import type { MathNode } from '../../types';
import { getVariables } from '../../eval/substitute';
import { variable } from '../../factory';
import { isGreek, isSubscript, isVariable } from '../../guards';
import { toLatex } from '../../latex-generator';
import { mapNode } from '../../transforms';

// =============================================================================
// Constantes
// =============================================================================

/**
 * La FORME d'un nom de variable après le point-virgule : `t`, `x_1`, `x_{12}`,
 * `\theta`. Ce n'est qu'un filtre : le nom réel est celui que le parseur de
 * l'expression donne à ce texte (`variableNameOf`).
 */
const VARIABLE_NAME = /^\\?[A-Za-z][A-Za-z0-9]*(?:_(?:[A-Za-z0-9]|\{[A-Za-z0-9]+\}))?$/;

/**
 * Noms que l'expression contient mais qui ne sont pas des variables candidates
 * par défaut : `e` (Euler), `i` (imaginaire), `pi`. On peut toujours dériver
 * par rapport à eux en les nommant.
 */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(['e', 'i', 'pi']);

/**
 * Une fonction usuelle écrite en lettres, sans antislash ni parenthèse :
 * `sin x`, `ln x`, `sin^2 x`. Le nom doit être DÉLIMITÉ — `cost`, `lnx`,
 * `\arcsin`, `\cosh`, `\operatorname{sin}` ne comptent pas — et n'est pas
 * suivi (exposant éventuel compris) d'une parenthèse ouvrante.
 */
const BARE_FUNCTION =
	/(?<![A-Za-z\\{])(sin|cos|tan|ln|log|exp|sqrt)(?![A-Za-z0-9])(?!\s*(?:\^\s*(?:\{[^}]*\}|[A-Za-z0-9]+))?\s*\()/;

/** Variable par défaut quand l'expression n'en dit rien (constante). */
const DEFAULT_VARIABLE = 'x';

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Séparer `expression ; variable`.
 *
 * Seul le DERNIER point-virgule de premier niveau compte (hors parenthèses,
 * crochets, accolades — `f(x ; y)`, `[a ; b]` restent dans l'expression), et
 * seulement s'il est suivi d'un nom de variable et précédé d'une expression
 * non vide. Sinon, toute la saisie est l'expression : un point-virgule restant
 * y sera une erreur de lecture, jamais une réponse silencieusement fausse.
 */
export function splitVariableArgument(input: string): {
	expression: string;
	variable: string | null;
} {
	const trimmed = input.trim();
	let depth = 0;
	let lastSeparator = -1;
	for (let index = 0; index < trimmed.length; index++) {
		const char = trimmed[index];
		if (char === '(' || char === '[' || char === '{') depth++;
		else if (char === ')' || char === ']' || char === '}') depth--;
		else if (char === ';' && depth === 0) lastSeparator = index;
	}
	if (lastSeparator === -1) return { expression: trimmed, variable: null };

	const expression = trimmed.slice(0, lastSeparator).trim();
	const name = trimmed.slice(lastSeparator + 1).trim();
	if (expression === '' || !VARIABLE_NAME.test(name))
		return { expression: trimmed, variable: null };
	return { expression, variable: name };
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

/**
 * Les variables indicées (`x_1`, `x_{12}`) réécrites en variables simples,
 * nommées par leur LaTeX, et de quoi revenir en arrière.
 *
 * ⚠️ Le parseur lit `x_1` comme un INDICE de base `x`, que la dérivation
 * traite en constante : `.diff x_1^2, x_1` valait 0, et `getVariables` n'y
 * voyait que `x`. Un nom qui contient `_` ne peut pas être celui d'une
 * variable simple : pas de collision.
 */
export function indexVariables(node: MathNode): {
	node: MathNode;
	restore: (indexed: MathNode) => MathNode;
} {
	const originals = new Map<string, MathNode>();
	const flat = mapNode(node, (n) => {
		if (!isSubscript(n) || !(isVariable(n.base) || isGreek(n.base))) return n;
		const name = toLatex(n);
		originals.set(name, n);
		return variable(name);
	});
	return {
		node: flat,
		restore: (indexed) =>
			originals.size === 0
				? indexed
				: mapNode(indexed, (n) => (isVariable(n) ? (originals.get(n.name) ?? n) : n))
	};
}

/**
 * Le nom de variable d'une variable explicite déjà LUE par le parseur de
 * l'expression — le même nom que celui que lui donne `indexVariables` —, ou
 * `null` si ce n'est pas une variable (`2`, `x+1`).
 */
export function variableNameOf(node: MathNode): string | null {
	const flat = indexVariables(node).node;
	if (isVariable(flat)) return flat.name;
	if (isGreek(flat)) return flat.letter;
	return null;
}

/**
 * Le nom de la première fonction usuelle écrite sans parenthèses (`sin x`),
 * ou `null`.
 *
 * ⚠️ Décision de David (2026-10-06) : on REFUSE `sin x`, on ne l'interprète
 * pas (« accepter cos x apporte plus de problèmes que ça n'en résout »). Le
 * parseur LaTeX le lit s·i·n·x — `.diff sin x + cos x` répondait une dérivée
 * fausse, sans erreur. `\sin x` (LaTeX) et `sin(x)` restent acceptés.
 * Réutilisable par d'autres commandes (`.solve`, `.integrate`).
 */
export function bareFunctionName(input: string): string | null {
	return BARE_FUNCTION.exec(input)?.[1] ?? null;
}

/** Le refus à montrer pour une fonction écrite sans parenthèses. */
export function bareFunctionMessage(name: string): string {
	return `Écris ${name}(x) avec des parenthèses.`;
}
