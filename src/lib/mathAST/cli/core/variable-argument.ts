/**
 * La variable d'une commande (`.diff`, `.solve`, `.integrate`, `.variations`,
 * `.domain`, `.taylor`) : `x`, sauf si
 * une autre est donnée après un point-virgule (`.solve 3 = 2t ; t`).
 *
 * ⚠️ **Aucune devinette** (décision de David, 2026-10-06). Deux règles ont
 * été essayées puis abandonnées :
 * - « le dernier mot séparé par un espace est la variable » : l'espace est
 *   aussi un produit implicite (`x^2 y`, `3 = 2 x`) et le dernier mot est
 *   souvent l'argument d'une fonction. Aucune règle sur le dernier mot ne
 *   distingue `x^2 y` (« x²y ») de `x^2 y` (« x², en y ») : c'est la même
 *   chaîne. `.solve 3 = 2 x` répondait « Pas de solution » ;
 * - « x s'il apparaît, sinon la seule variable libre » (#880) : la même
 *   saisie changeait de sens selon les lettres présentes.
 *
 * Seul un séparateur qui n'existe pas dans une expression lève l'ambiguïté :
 * le POINT-VIRGULE de premier niveau. Quand x n'apparaît pas et qu'aucune
 * variable n'est donnée, le calcul se fait quand même en x (souvent 0, ou une
 * constante) et la commande l'INDIQUE (`otherVariableHint`) — une indication,
 * pas un refus.
 *
 * Pourquoi pas la virgule : en français elle est décimale, et `;` est déjà le
 * séparateur usuel ([a ; b], (3 ; 1)). Une virgule hors groupe reste une
 * erreur de lecture.
 *
 * @module cli/core/variable-argument
 */

import type { MathNode } from '../../types';
import { getVariables } from '../../eval/substitute';
import { variable } from '../../factory';
import { isGreek, isSubscript, isVariable } from '../../guards';
import { toLatex } from '../../latex-generator';
import { mapNode } from '../../transforms';
import { parse, type PipelineOptions } from './pipeline';

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
 * Noms que l'expression contient mais qu'on ne propose pas comme autre
 * variable : `e` (Euler), `i` (imaginaire), `pi`. On peut toujours calculer
 * par rapport à eux en les nommant.
 */
const CONSTANT_NAMES: ReadonlySet<string> = new Set(['e', 'i', 'pi']);

/**
 * Une fonction usuelle écrite en lettres, sans antislash ni parenthèse :
 * `sin x`, `ln x`, `sin^2 x`. Le nom doit être DÉLIMITÉ — `cost`, `lnx`,
 * `\arcsin`, `\cosh`, `\operatorname{sin}` ne comptent pas — et n'est pas
 * suivi (indice et exposant éventuels compris : `log_2(x)`, que `toCustom`
 * écrit pour un logarithme de base donnée) d'une parenthèse ouvrante.
 */
const BARE_FUNCTION =
	/(?<![A-Za-z\\{])(sin|cos|tan|ln|log|exp|sqrt)(?![A-Za-z0-9])(?!\s*(?:_\s*(?:\{[^}]*\}|[A-Za-z0-9]+))?\s*(?:\^\s*(?:\{[^}]*\}|[A-Za-z0-9]+))?\s*\()/;

/** Les deux bornes d'une intégrale définie, en fin de texte : `… 0 1`. */
const TRAILING_BOUNDS = /^(.*\S)\s+([-+]?(?:\d+\.?\d*|\.\d+))\s+([-+]?(?:\d+\.?\d*|\.\d+))$/s;

/**
 * L'ordre (entier) et le point (facultatif) de `.taylor`, en fin de texte :
 * `… 5` ou `… 5 0`. Même lecture qu'avant le point-virgule : l'ordre est un
 * entier, le point peut être négatif ou décimal.
 */
const TRAILING_TAYLOR_NUMBERS = /^(.*?\S)\s+(\d+)(?:\s+([-+]?(?:\d+\.?\d*|\.\d+)))?$/s;

/**
 * Les fonctions que `.taylor` accepte par leur NOM seul (`.taylor sin 5` :
 * sin(x)). Un nom seul n'est pas une fonction « sans parenthèses » : rien
 * ne le suit, il n'y a pas d'argument à mal lire.
 */
export const TAYLOR_SHORTCUT_FUNCTIONS: ReadonlySet<string> = new Set([
	'sin',
	'cos',
	'tan',
	'exp',
	'ln',
	'sqrt',
	'log'
]);

/** Le début de l'indication de variable — c'est ainsi qu'on la reconnaît. */
const HINT_START = 'Calcul par rapport à x.';

/** La variable quand aucune n'est donnée après le point-virgule. */
export const DEFAULT_VARIABLE = 'x';

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
 * L'indication à ajouter quand le calcul se fait en `x` alors que `x`
 * n'apparaît pas — ou `null` (x apparaît, ou aucune variable libre : `5`).
 *
 * Une seule autre variable libre : elle est nommée (« ; t »). Plusieurs : on
 * n'en choisit aucune — `a t^2 + b t` ne doit pas suggérer `; a`.
 * Appelée seulement quand aucune variable n'a été donnée après `;`.
 *
 * @param node - L'expression, variables indicées déjà réécrites
 *   (`indexVariables`) : `x_1` est une autre variable que `x`.
 * @param bound - Noms liés ailleurs (`.let a = 2`), qui sont des constantes.
 */
export function otherVariableHint(
	node: MathNode,
	bound: Iterable<string> = [],
	options: { readonly bounds?: boolean; readonly taylor?: boolean } = {}
): string | null {
	const variables = getVariables(node);
	if (variables.has(DEFAULT_VARIABLE)) return null;
	const excluded = new Set([...CONSTANT_NAMES, ...bound]);
	const candidates = [...variables].filter((name) => !excluded.has(name));
	if (candidates.length === 0) return null;
	const single = candidates.length === 1 ? candidates[0] : null;
	const how = single !== null ? `« ; ${single} »` : '« ; » suivi de son nom';
	// `.integrate` : les bornes suivent la variable (`; t 0 1`)
	// `.taylor` : l'ordre et le point aussi (`; t 4 0`)
	const where = options.bounds
		? ` ; les bornes se mettent à la fin${single !== null ? ` : « ; ${single} 0 1 »` : ''}`
		: options.taylor
			? ` ; l’ordre et le point se mettent à la fin${single !== null ? ` : « ; ${single} 4 0 »` : ''}`
			: '';
	return `${HINT_START} Pour une autre variable, écris ${how}${where}.`;
}

/**
 * Séparer l'argument de `.integrate` : expression, variable après `;` (ou
 * `null`) et bornes — les deux derniers NOMBRES, avant ou après `; t`
 * (`t^2 0 1 ; t` comme `t^2 ; t 0 1`).
 */
export function splitIntegralArgument(input: string): {
	expression: string;
	variable: string | null;
	bounds: { lower: number; upper: number } | null;
} {
	const trimmed = input.trim();
	// Bornes en fin (`… ; t 0 1` ou `… 0 1`), sinon juste avant `; t`
	const trailing = TRAILING_BOUNDS.exec(trimmed);
	const { expression, variable } = splitVariableArgument(trailing === null ? trimmed : trailing[1]);
	const inner = trailing === null ? TRAILING_BOUNDS.exec(expression) : null;
	const found = trailing ?? inner;
	return {
		expression: inner === null ? expression : inner[1].trim(),
		variable,
		bounds: found === null ? null : { lower: parseFloat(found[2]), upper: parseFloat(found[3]) }
	};
}

/**
 * Séparer l'argument de `.taylor` : expression, variable après `;` (ou
 * `null`), ordre du développement — le degré maximal — (`null` s'il manque)
 * et point (0 par défaut).
 * Les nombres se placent avant ou après `; t`, comme les bornes de
 * `.integrate` : `e^t 5 0 ; t` comme `e^t ; t 5 0`.
 */
export function splitTaylorArgument(input: string): {
	expression: string;
	variable: string | null;
	order: number | null;
	center: number;
} {
	const trimmed = input.trim();
	// Nombres en fin (`… ; t 5 0` ou `… 5 0`), sinon juste avant `; t`
	const trailing = TRAILING_TAYLOR_NUMBERS.exec(trimmed);
	const { expression, variable } = splitVariableArgument(trailing === null ? trimmed : trailing[1]);
	const inner = trailing === null ? TRAILING_TAYLOR_NUMBERS.exec(expression) : null;
	const found = trailing ?? inner;
	return {
		expression: inner === null ? expression : inner[1].trim(),
		variable,
		order: found === null ? null : parseInt(found[2], 10),
		center: found?.[3] === undefined ? 0 : parseFloat(found[3])
	};
}

/**
 * L'indication (`otherVariableHint`) qu'une commande `expression[ ; v]`
 * ajoute à sa réponse — ou `null` : variable donnée après `;`, x présent,
 * expression illisible. Pour qui n'a que la SAISIE (l'atelier, qui affiche
 * l'indication à part de la réponse).
 */
export function variableHintOf(
	input: string,
	options: {
		readonly parserOptions?: PipelineOptions;
		/** Noms liés (`.let a = 2`) : les mêmes que ceux que le moteur exclut */
		readonly bound?: Iterable<string>;
		/** `.integrate` : bornes à ôter, et l'indication dit où les mettre */
		readonly integral?: boolean;
		/** `.taylor` : ordre et point à ôter, idem */
		readonly taylor?: boolean;
	} = {}
): string | null {
	const { expression, variable } = options.integral
		? splitIntegralArgument(input)
		: options.taylor
			? splitTaylorArgument(input)
			: splitVariableArgument(input);
	if (variable !== null) return null;
	// `.taylor sin 5` : le nom seul se lit sin(x), x apparaît
	if (options.taylor && TAYLOR_SHORTCUT_FUNCTIONS.has(expression)) return null;
	const ast = parse(expression, options.parserOptions).ast;
	return ast === undefined
		? null
		: otherVariableHint(indexVariables(ast).node, options.bound, {
				bounds: options.integral,
				taylor: options.taylor
			});
}

/** Une ligne de sortie est-elle l'indication de variable ? */
export function isVariableHint(line: string): boolean {
	return line.trim().startsWith(HINT_START);
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
 * La variable d'une commande : celle tapée après `;`, sinon `x`.
 *
 * La variable tapée est lue par le MÊME parseur que l'expression : `x_1`
 * tapé doit donner le même nom que le `x_1` de l'expression (`indexVariables`).
 * Autre chose qu'une variable (`; 2`) : refus, avec le message à montrer.
 */
export function chosenVariable(
	typed: string | null,
	parserOptions?: PipelineOptions
): { ok: true; variable: string } | { ok: false; message: string } {
	if (typed === null) return { ok: true, variable: DEFAULT_VARIABLE };
	const parsed = parse(typed, parserOptions).ast;
	const name = parsed === undefined ? null : variableNameOf(parsed);
	if (name === null) return { ok: false, message: `« ${typed} » n'est pas une variable.` };
	return { ok: true, variable: name };
}

/**
 * Le nom de la première fonction usuelle écrite sans parenthèses (`sin x`),
 * ou `null`.
 *
 * ⚠️ Décision de David (2026-10-06) : on REFUSE `sin x`, on ne l'interprète
 * pas (« accepter cos x apporte plus de problèmes que ça n'en résout »). Le
 * parseur LaTeX le lit s·i·n·x — `.diff sin x + cos x` répondait une dérivée
 * fausse, sans erreur. `\sin x` (LaTeX) et `sin(x)` restent acceptés.
 * Partagé par `.diff`, `.solve`, `.integrate`, `.variations`, `.domain` et
 * `.taylor`.
 */
export function bareFunctionName(input: string): string | null {
	return BARE_FUNCTION.exec(input)?.[1] ?? null;
}

/** Le refus à montrer pour une fonction écrite sans parenthèses. */
export function bareFunctionMessage(name: string): string {
	return `Écris ${name}(x) avec des parenthèses.`;
}
