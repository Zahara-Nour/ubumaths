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
 * `\theta`, et l'indice d'une suite `u_{n+1}`, `u_{n-1}`. Ce n'est qu'un
 * filtre : le nom réel est celui que le parseur de l'expression donne à ce
 * texte (`variableNameOf`).
 */
const VARIABLE_NAME = /^\\?[A-Za-z][A-Za-z0-9]*(?:_(?:[A-Za-z0-9]|\{[A-Za-z0-9+-]+\}))?$/;

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
 * écrit pour un logarithme de base donnée) d'une parenthèse ouvrante. Un
 * indice de racine entre crochets (`sqrt[3](x)`, que la définition
 * `f(x) = …` accepte) peut précéder la parenthèse.
 */
const BARE_FUNCTION =
	/(?<![A-Za-z\\{])(sin|cos|tan|ln|log|exp|sqrt)(?![A-Za-z0-9])(?!\s*(?:_\s*(?:\{[^}]*\}|[A-Za-z0-9]+))?\s*(?:\^\s*(?:\{[^}]*\}|[A-Za-z0-9]+))?\s*(?:\[[^\]]*\]\s*)?\()/;

/**
 * Les deux bornes d'une intégrale définie, en fin de texte : `… 0 1`, ou
 * `… 0 a` — une borne est un NOMBRE, une LETTRE (`a`, `b_1`, `-a`) ou un
 * groupe sans espace entre parenthèses : `(2)`, ce que l'atelier substitue à
 * un objet `a = 2`.
 * `boundPair` dit ensuite si la paire est bien une paire de bornes.
 */
const TRAILING_BOUNDS =
	/^(.*\S)\s+([-+]?(?:\d+\.?\d*|\.\d+|[A-Za-z](?:_\d+)?|\([^()\s]+\)))\s+([-+]?(?:\d+\.?\d*|\.\d+|[A-Za-z](?:_\d+)?|\([^()\s]+\)))$/s;

/** Une borne numérique (les autres : lettre ou groupe entre parenthèses). */
export const NUMERIC_BOUND = /^[-+]?(?:\d+\.?\d*|\.\d+)$/;

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
 * `null`) et bornes — les deux derniers mots, nombres ou lettre (`0 a`, voir
 * `boundPair`), avant ou après `; t`
 * (`t^2 0 1 ; t` comme `t^2 ; t 0 1`).
 */
export function splitIntegralArgument(input: string): {
	expression: string;
	variable: string | null;
	bounds: { lower: string; upper: string } | null;
} {
	const trimmed = input.trim();
	// Bornes en fin (`… ; t 0 1` ou `… 0 1`), sinon juste avant `; t`
	const trailing = boundPair(TRAILING_BOUNDS.exec(trimmed), null);
	const { expression, variable } = splitVariableArgument(trailing === null ? trimmed : trailing[1]);
	const accepted = trailing === null ? null : boundPair(trailing, variable);
	const inner = trailing === null ? boundPair(TRAILING_BOUNDS.exec(expression), variable) : null;
	const found = accepted ?? inner;
	if (trailing !== null && accepted === null) {
		// `t^2 ; t 0 t` : la « borne » t est la variable — rien n'est une borne
		return { expression: trimmed, variable: null, bounds: null };
	}
	return {
		expression: inner === null ? expression : inner[1].trim(),
		variable,
		bounds: found === null ? null : { lower: found[2], upper: found[3] }
	};
}

/**
 * La paire `… u v` est-elle une paire de bornes ? Deux nombres, toujours.
 * Une lettre seulement si l'AUTRE borne est un nombre (ou un groupe `(2)`) et
 * si la lettre n'est pas la variable : `x^2 0 a` (borne a), mais `2 x 3` reste le produit 2·x·3,
 * `x a b` le produit x·a·b — sans nombre, rien ne dit que ce sont des bornes —
 * et `x^2 + 3 a` la somme x² + 3a.
 */
function boundPair(match: RegExpExecArray | null, variable: string | null): RegExpExecArray | null {
	if (match === null) return null;
	const kinds = [match[2], match[3]].map(boundKind);
	if (kinds.every((kind) => kind === 'number')) return match;
	if (kinds.every((kind) => kind === 'letter')) return null;
	// `x^2 + 3 a` : x² + 3a, l'expression ne s'arrête pas sur un opérateur
	if (/[-+*/^(,=]$/.test(match[1])) return null;
	// Variable inconnue ici (avant `; t`) : x seulement, le cas d'après la vérifie
	const name = variable ?? DEFAULT_VARIABLE;
	return [match[2], match[3]].some((bound) => bound.replace(/^[-+]/, '') === name) ? null : match;
}

/** Un nombre, une lettre, ou un groupe entre parenthèses (`(2)`). */
function boundKind(bound: string): 'number' | 'letter' | 'group' {
	if (NUMERIC_BOUND.test(bound)) return 'number';
	return bound.endsWith(')') ? 'group' : 'letter';
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
		// Sans espaces : `u_{n+1}`, pas `u_{n + 1}` — le nom se relit d'un seul
		// mot après « pour », et s'affiche comme l'élève l'a tapé
		const name = toLatex(n).replace(/\s+/g, '');
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
	parserOptions?: PipelineOptions,
	/** Sans variable tapée : la deviner sur l'expression (`guessedVariable`) */
	guess?: { readonly node: MathNode; readonly bound?: Iterable<string>; readonly label?: string }
): { ok: true; variable: string } | { ok: false; message: string } {
	if (typed === null) {
		return guess === undefined
			? { ok: true, variable: DEFAULT_VARIABLE }
			: guessedVariable(guess.node, guess.bound, guess.label);
	}
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

// =============================================================================
// Mots-clés (décisions de David, 2026-10-08 — docs/ref/syntaxe-commandes-atelier.md)
// =============================================================================

/** Les commandes dont l'argument se lit avec des mots-clés. */
export type KeywordCommand =
	| 'diff'
	| 'integrate'
	| 'solve'
	| 'eval'
	| 'equiv'
	| 'taylor'
	| 'variations'
	| 'domain';

/** Un mot-clé, écrit sans accent (`à` se lit `a`). */
type Keyword = 'pour' | 'de' | 'en' | 'ordre' | 'dans' | 'et';

/** Les mots-clés que chaque commande comprend : l'expression s'arrête au premier. */
const COMMAND_KEYWORDS: Readonly<Record<KeywordCommand, readonly Keyword[]>> = {
	diff: ['pour'],
	integrate: ['pour', 'de'],
	solve: ['pour', 'dans'],
	eval: ['en', 'pour'],
	equiv: ['et'],
	taylor: ['ordre', 'en', 'pour'],
	variations: ['pour'],
	domain: ['pour']
};

/** Le nom français d'une commande, pour les exemples des messages. */
const COMMAND_LABELS: Readonly<Record<KeywordCommand, string>> = {
	diff: '.dériver',
	integrate: '.intégrer',
	solve: '.résoudre',
	eval: '.évaluer',
	equiv: '.équivalent',
	taylor: '.taylor',
	variations: '.variations',
	domain: '.domaine'
};

/** `x=3`, `x = 3`, `x_1=2` : une affectation de `.évaluer`. */
const ASSIGNMENT =
	/^(\\?[A-Za-z][A-Za-z0-9]*(?:_(?:[A-Za-z0-9]|\{[A-Za-z0-9]+\}))?)\s*=\s*(\S.*)$/s;

/** L'ancienne écriture de `.évaluer` : `x^2 x=3`, une affectation finale sans mot-clé. */
const TRAILING_ASSIGNMENT =
	/^(.*\S)\s+(\\?[A-Za-z](?:_(?:[A-Za-z0-9]|\{[A-Za-z0-9]+\}))?)\s*=\s*([^\s=<>]+)$/s;

/** L'ordre de `.taylor` : un entier. */
const ORDER = /^\d+$/;

/** Le point de `.taylor` : un nombre, virgule ou point décimal, ou une fraction `p/q`. */
const CENTER = /^[-+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:\/\d+)?$/;

/** La virgule décimale (#880) d'une valeur ou d'une borne : `1,5` → `1.5`. */
function decimalPoint(text: string): string {
	return text.replace(/(\d),(\d)/g, '$1.$2');
}

/** L'argument d'une commande à mots-clés, lu. */
export interface CommandArguments {
	readonly expression: string;
	/** `pour VAR` ou `; VAR` */
	readonly variable: string | null;
	/** `de A à B` (`.intégrer`) */
	readonly bounds: { readonly lower: string; readonly upper: string } | null;
	/** `ordre N` (`.taylor`) */
	readonly order: number | null;
	/** `en A` (`.taylor`), 0 par défaut */
	readonly center: number | null;
	/** `en x=3` / `pour x=3` (`.évaluer`) */
	readonly assignment: { readonly name: string; readonly value: string } | null;
	/** `dans INTERVALLE` (`.résoudre`) */
	readonly interval: string | null;
	/** `et EXPR` (`.équivalent`) */
	readonly other: string | null;
}

export type CommandArgumentsReading =
	| { readonly ok: true; readonly args: CommandArguments }
	| { readonly ok: false; readonly message: string };

/** Un mot de premier niveau (hors parenthèses, crochets, accolades) et sa position. */
interface Word {
	readonly text: string;
	readonly start: number;
	readonly end: number;
}

function topLevelWords(text: string): Word[] {
	const words: Word[] = [];
	let depth = 0;
	let start = -1;
	for (let index = 0; index <= text.length; index++) {
		const char = text[index];
		const blank = char === undefined || (/\s/.test(char) && depth === 0);
		if (blank) {
			if (start !== -1) words.push({ text: text.slice(start, index), start, end: index });
			start = -1;
			continue;
		}
		if (start === -1) start = index;
		if (char === '(' || char === '[' || char === '{') depth++;
		else if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);
	}
	return words;
}

/** Le mot-clé qu'est ce mot, sans accent ni majuscule — ou `null`. */
function keywordOf(word: string, allowed: readonly Keyword[]): Keyword | null {
	const plainWord = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
	return (allowed as readonly string[]).includes(plainWord) ? (plainWord as Keyword) : null;
}

/** `à` ou `a` (sans accent) : la seconde moitié de `de A à B`. */
function isTo(word: string | undefined): boolean {
	return word === 'à' || word === 'a' || word === 'À' || word === 'A';
}

const EMPTY_ARGUMENTS: CommandArguments = {
	expression: '',
	variable: null,
	bounds: null,
	order: null,
	center: null,
	assignment: null,
	interval: null,
	other: null
};

/**
 * Lire l'argument d'une commande : l'expression s'arrête au PREMIER mot-clé
 * (mot entier, entouré d'espaces, de premier niveau). Les mots-clés suivent
 * dans n'importe quel ordre ; `de` va avec `à` (ou `a`), et une borne est un
 * seul bloc sans espace — `de 0 a a` se lit de 0 à a, `de a a b` de a à b.
 *
 * Sans mot-clé : l'ancienne écriture, acceptée quand elle est SANS
 * ambiguïté (`x^2 0 1`, `sin(x) 5 0`, `; t`). Ambiguë (`.intégrer x 3 a`,
 * `.évaluer x^2 x=3`) : refus, avec la nouvelle forme exacte.
 */
export function readCommandArguments(
	command: KeywordCommand,
	input: string
): CommandArgumentsReading {
	const allowed = COMMAND_KEYWORDS[command];
	const label = COMMAND_LABELS[command];
	// `… ; t` en toute fin : la variable de l'ancienne écriture
	const tail = splitVariableArgument(input);
	const trimmed = tail.variable === null ? input.trim() : tail.expression;
	const words = topLevelWords(trimmed);
	const first = words.findIndex((word, index) => index > 0 && keywordOf(word.text, allowed));
	if (first === -1) return readLegacy(command, trimmed, tail.variable);

	const head = splitVariableArgument(trimmed.slice(0, words[first].start));
	if (head.variable !== null && tail.variable !== null) {
		return { ok: false, message: 'La variable est donnée deux fois.' };
	}
	const result: {
		-readonly [K in keyof CommandArguments]: CommandArguments[K];
	} = {
		...EMPTY_ARGUMENTS,
		expression: head.expression,
		variable: head.variable ?? tail.variable
	};
	const seen = new Set<Keyword>();
	let index = first;
	while (index < words.length) {
		const keyword = keywordOf(words[index].text, allowed) as Keyword;
		if (seen.has(keyword)) {
			return { ok: false, message: `« ${keyword} » est écrit deux fois.` };
		}
		seen.add(keyword);
		// Les mots jusqu'au prochain mot-clé
		let next = index + 1;
		if (keyword === 'de') {
			const lower = words[index + 1]?.text;
			const upper = words[index + 3]?.text;
			if (lower === undefined || !isTo(words[index + 2]?.text) || upper === undefined) {
				return {
					ok: false,
					message: `Les bornes s'écrivent « de … à … » : ${label} ${result.expression} de ${lower ?? '0'} à ${lower === undefined ? '1' : (words[index + 2]?.text ?? '1')}.`
				};
			}
			next = index + 4;
			if (next < words.length && keywordOf(words[next].text, allowed) === null) {
				return {
					ok: false,
					message: `Une borne s'écrit d'un seul bloc, sans espace (« 1/2 », « \\pi », « a ») : « ${trimmed.slice(words[index + 3].start, words[next].end)} » ?`
				};
			}
			result.bounds = { lower: decimalPoint(lower), upper: decimalPoint(upper) };
			index = next;
			continue;
		}
		while (next < words.length && keywordOf(words[next].text, allowed) === null) next++;
		const value =
			next === index + 1 ? '' : trimmed.slice(words[index + 1].start, words[next - 1].end);
		if (value === '') {
			return { ok: false, message: `Il manque ce qui suit « ${keyword} ».` };
		}
		const problem = applyKeyword(command, keyword, value, result);
		if (problem !== null) return { ok: false, message: problem };
		index = next;
	}
	if (result.expression === '') return { ok: false, message: 'Il manque l’expression.' };
	if (command === 'eval' && result.assignment === null) {
		return {
			ok: false,
			message: `Écris la valeur après « en » : ${label} ${result.expression} en x=3.`
		};
	}
	if (command === 'taylor' && result.order === null) {
		return {
			ok: false,
			message: `Il manque l'ordre : ${label} ${result.expression} ordre 3.`
		};
	}
	return { ok: true, args: result };
}

/** Ranger la valeur d'un mot-clé ; le message d'erreur, ou `null`. */
function applyKeyword(
	command: KeywordCommand,
	keyword: Keyword,
	value: string,
	result: { -readonly [K in keyof CommandArguments]: CommandArguments[K] }
): string | null {
	// `.évaluer … en x=3` / `pour x=3`
	if (command === 'eval') {
		const assignment = ASSIGNMENT.exec(value);
		if (assignment === null) return `Écris « ${keyword} x=3 » : une lettre, =, sa valeur.`;
		if (result.assignment !== null) return 'Une seule valeur à remplacer à la fois.';
		result.assignment = { name: assignment[1], value: decimalPoint(assignment[2].trim()) };
		return null;
	}
	switch (keyword) {
		case 'pour':
			if (!VARIABLE_NAME.test(value)) return `« ${value} » n'est pas une variable.`;
			if (result.variable !== null) return 'La variable est donnée deux fois.';
			result.variable = value;
			return null;
		case 'ordre':
			if (!ORDER.test(value)) return `L'ordre est un entier : « ordre 3 », pas « ordre ${value} ».`;
			result.order = parseInt(value, 10);
			return null;
		case 'en': {
			if (/\\pi|π/.test(value)) {
				return 'Le point doit être un nombre décimal ou une fraction (en 1, en 1/2) : π n’est pas pris en charge.';
			}
			if (!CENTER.test(value)) {
				return `Le point doit être un nombre décimal ou une fraction (en 1, en 1/2), pas « ${value} ».`;
			}
			const [numerator, denominator] = value.replace(',', '.').split('/');
			result.center =
				parseFloat(numerator) / (denominator === undefined ? 1 : parseFloat(denominator));
			return null;
		}
		case 'dans':
			result.interval = decimalPoint(value);
			return null;
		case 'et':
			result.other = value;
			return null;
		case 'de':
			return null;
	}
}

/** L'ancienne écriture, sans mot-clé — refusée quand elle est ambiguë. */
function readLegacy(
	command: KeywordCommand,
	input: string,
	tailVariable: string | null
): CommandArgumentsReading {
	const label = COMMAND_LABELS[command];
	const withTail = tailVariable === null ? input : `${input} ; ${tailVariable}`;
	switch (command) {
		case 'integrate': {
			const { expression, variable, bounds } = splitIntegralArgument(withTail);
			if (bounds !== null && ![bounds.lower, bounds.upper].every((b) => NUMERIC_BOUND.test(b))) {
				const pour = variable === null ? '' : ` pour ${variable}`;
				return {
					ok: false,
					message: `Écriture ambiguë. Pour des bornes, écris : ${label} ${expression} de ${bounds.lower} à ${bounds.upper}${pour}`
				};
			}
			return { ok: true, args: { ...EMPTY_ARGUMENTS, expression, variable, bounds } };
		}
		case 'taylor': {
			const { expression, variable, order, center } = splitTaylorArgument(withTail);
			// `2 x 3` : 2x à l'ordre 3, ou le produit 2·x·3 ? Le dernier mot de
			// l'expression, une lettre ou un nombre seuls, se lit aussi en produit
			const words = topLevelWords(expression);
			const last = words[words.length - 1]?.text ?? '';
			// (`sin x 5` : laissé au refus « des parenthèses » de la commande)
			if (
				order !== null &&
				words.length > 1 &&
				bareFunctionName(expression) === null &&
				/^(?:[A-Za-z]|\d+(?:[.,]\d+)?)$/.test(last)
			) {
				const at = center === 0 ? '' : ` en ${center}`;
				const pour = variable === null ? '' : ` pour ${variable}`;
				return {
					ok: false,
					message: `Écriture ambiguë. Pour l'ordre, écris : ${label} ${expression} ordre ${order}${at}${pour}`
				};
			}
			return { ok: true, args: { ...EMPTY_ARGUMENTS, expression, variable, order, center } };
		}
		case 'eval': {
			const { expression, variable } = splitVariableArgument(withTail);
			const trailing = TRAILING_ASSIGNMENT.exec(expression);
			if (variable === null && trailing !== null) {
				return {
					ok: false,
					message: `Pour remplacer ${trailing[2]} par ${trailing[3]}, écris : ${label} ${trailing[1].replace(/\s*;$/, '')} en ${trailing[2]}=${trailing[3]}`
				};
			}
			return { ok: true, args: { ...EMPTY_ARGUMENTS, expression: withTail } };
		}
		case 'equiv':
			return { ok: true, args: { ...EMPTY_ARGUMENTS, expression: withTail } };
		default: {
			const { expression, variable } = splitVariableArgument(withTail);
			return { ok: true, args: { ...EMPTY_ARGUMENTS, expression, variable } };
		}
	}
}

/**
 * Récrire un argument lu dans la forme à mots-clés — celle que le moteur
 * relit. L'atelier s'en sert après avoir remplacé ses noms par leurs
 * expressions, partie par partie (`a` est aussi le mot-clé `à`).
 */
export function writeCommandArguments(args: CommandArguments): string {
	const parts = [args.expression];
	if (args.bounds !== null) parts.push(`de ${args.bounds.lower} à ${args.bounds.upper}`);
	if (args.order !== null) parts.push(`ordre ${args.order}`);
	if (args.center !== null) parts.push(`en ${args.center}`);
	if (args.assignment !== null) parts.push(`en ${args.assignment.name}=${args.assignment.value}`);
	if (args.interval !== null) parts.push(`dans ${args.interval}`);
	if (args.other !== null) parts.push(`et ${args.other}`);
	if (args.variable !== null) parts.push(`pour ${args.variable}`);
	return parts.join(' ');
}

/**
 * Les lettres d'une expression autres que la variable, `e`, `i`, `pi` et les
 * noms liés (`.let a = 2`), triées : les PARAMÈTRES (`u_0`, `q` dans
 * `u_0·q^n = 10` résolue en n). Variables indicées réécrites ici.
 */
export function parameterLetters(
	node: MathNode,
	variable: string,
	bound: Iterable<string> = []
): string[] {
	const excluded = new Set([...CONSTANT_NAMES, ...bound, variable]);
	return [...getVariables(indexVariables(node).node)].filter((name) => !excluded.has(name)).sort();
}

/**
 * La variable DEVINÉE quand aucune n'est donnée (décision de David,
 * 2026-10-08, Q1) : x s'il apparaît (règle #888) ; sinon la seule lettre de
 * l'expression ; aucune lettre : x. Plusieurs lettres sans x : `pour` exigé.
 *
 * @param node - L'expression lue (variables indicées réécrites ici)
 * @param bound - Noms liés ailleurs (`.let a = 2`) : des constantes
 */
export function guessedVariable(
	node: MathNode,
	bound: Iterable<string> = [],
	label = ''
): { ok: true; variable: string } | { ok: false; message: string } {
	const variables = getVariables(indexVariables(node).node);
	if (variables.has(DEFAULT_VARIABLE)) return { ok: true, variable: DEFAULT_VARIABLE };
	const excluded = new Set([...CONSTANT_NAMES, ...bound]);
	const candidates = [...variables].filter((name) => !excluded.has(name)).sort();
	if (candidates.length === 0) return { ok: true, variable: DEFAULT_VARIABLE };
	if (candidates.length === 1) return { ok: true, variable: candidates[0] };
	const listed = candidates.map((name) => `« ${name} »`).join(', ');
	const command = label === '' ? '' : `${label} … `;
	return {
		ok: false,
		message: `Plusieurs lettres (${listed}) : précise la variable, par exemple « ${command}pour ${candidates[candidates.length - 1]} ».`
	};
}

/** Le nom français d'une commande à mots-clés (`.intégrer`). */
export function keywordCommandLabel(command: KeywordCommand): string {
	return COMMAND_LABELS[command];
}

/** Les commandes dont l'argument se lit avec des mots-clés. */
export function isKeywordCommand(name: string): name is KeywordCommand {
	return Object.prototype.hasOwnProperty.call(COMMAND_KEYWORDS, name);
}
