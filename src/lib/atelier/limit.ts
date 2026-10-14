/**
 * Atelier — `.limite`, servie par l'atelier (le moteur de commandes ne la
 * connaît pas)
 *
 * Syntaxe tranchée par David le 2026-10-14 (L1-L6) :
 * - `.limite (x^2-1)/(x-1) en 1`, `en x=1` toléré, `.limite f en 2` ;
 * - un côté : `en 0+`, `en 0^+`, `en 0 à droite` (et `-`, `à gauche`) ;
 * - l'infini : `+∞`, `+inf`, `-∞`, `-inf` ; `∞` ou `inf` seul = +∞ ;
 * - sans côté, deux limites latérales différentes : « Pas de limite en 0 :
 *   à gauche −∞, à droite +∞ » ;
 * - la réponse est une FORMULE, `\lim\limits_{x\to 1}\dfrac{x^2-1}{x-1} = 2`,
 *   en valeur exacte (`e`, pas `exp(1)`) — jamais une valeur approchée
 *   présentée comme une limite : « Je ne sais pas » honnête ;
 * - une fonction de l'atelier garde son nom : `\lim f(x)`.
 *
 * Le calcul est celui de `evaluateLimit` (`mathAST/limits`). Les étapes
 * (« Comment ? ») viendront avec la PR 3.
 *
 * @module atelier/limit
 */

import type { Atelier } from './atelier.svelte';
import type { CalcResult } from './calcul';
import type { MathNode } from '$lib/mathAST/types';
import type { LimitDirection, LimitResult } from '$lib/mathAST/limits/types';
import { evaluateLimit } from '$lib/mathAST/limits';
import { LimitError } from '$lib/mathAST/limits/types';
import { parse as parseCommandExpression } from '$lib/mathAST/cli/core/pipeline';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { infinity, mathConstant, power } from '$lib/mathAST/factory';
import { isAddition, isInfinity, isNumber, isSubtraction } from '$lib/mathAST/guards';
import { toLatex } from '$lib/mathAST/latex-generator';
import { toCustom } from '$lib/mathAST/custom-generator';
import { transformAST, visitAST } from '$lib/mathAST/visitor';
import {
	findUnknownFunctionCall,
	unknownFunctionMessage
} from '$lib/mathAST/parser/custom/tokenizer';
import { astOf } from './parse';
import { INTERNAL_LETTER, typedLetterOf } from './letter';

// =============================================================================
// Types
// =============================================================================

/** Ce que `.limite` attend de l'atelier. */
export interface LimitContext {
	readonly atelier: Atelier;
	/** Les noms de l'atelier remplacés par leurs expressions ; `null` si illisible. */
	readonly substitute: (text: string) => string | null;
	/** Le message d'une expression illisible, commun aux commandes. */
	readonly unreadable: string;
}

/** Le point lu après `en` : un nombre (arbre), ou un infini signé. */
type LimitPoint =
	| { readonly kind: 'finite'; readonly node: MathNode }
	| { readonly kind: 'infinite'; readonly sign: 'positive' | 'negative' };

/** Ce qui suit `en`, lu. */
interface PointReading {
	readonly point: LimitPoint;
	readonly side: 'left' | 'right' | null;
	/** La lettre tapée devant le point (`en x=1`), sinon `null`. */
	readonly variable: string | null;
}

// =============================================================================
// Constantes
// =============================================================================

const UNKNOWN_LIMIT = 'Je ne sais pas calculer cette limite.';

/** `∞`, `inf`, `\infty`, `infini`, signés ou non (sans signe : +∞, L3). */
const INFINITY_WRITING = /^([+-]?)(?:∞|inf|infini|\\infty)$/i;

/** `à droite` / `à gauche` (accents facultatifs), en fin de point. */
const SIDE_WORDS = /\s+(?:à|a)\s+(droite|gauche)$/i;

/** `0^+`, `0^{-}` : le côté en exposant. */
const SIDE_EXPONENT = /^(.+?)\s*\^\s*\{?\s*([+-])\s*\}?$/;

/** `0+`, `0-` : le côté collé APRÈS un point (jamais `-1`, signe en tête). */
const SIDE_SUFFIX = /^(.*[\w.)}])\s*([+-])$/;

/** `x=1`, `t = 2` : la lettre devant le point. */
const ASSIGNMENT = /^([A-Za-z])\s*=\s*(.+)$/;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Exécuter `.limite EXPR en POINT`.
 *
 * Les erreurs de saisie sont des refus ; « Je ne sais pas » et « Pas de
 * limite » sont des RÉPONSES (la commande a bien tourné), comme
 * `.factoriser` qui ne sait pas factoriser.
 */
export function limitCommand(context: LimitContext, input: string, typed: string): CalcResult {
	const text = typed.trim();
	const split = /^(.*?)\s*(?:^|\s)en(?:\s+(.*))?$/s.exec(text);
	const typedExpression = (split === null ? text : split[1]).trim();
	const typedPoint = split === null ? '' : (split[2] ?? '').trim();
	if (typedExpression === '') {
		return { kind: 'refus', message: 'Il manque l’expression : .limite 1/x en 0, par exemple.' };
	}
	if (typedPoint === '') {
		return {
			kind: 'refus',
			message: `Il manque le point : .limite ${typedExpression} en 0, par exemple.`
		};
	}

	const reading = readPoint(context, typedPoint);
	if (!reading.ok) return { kind: 'refus', message: reading.message };
	const { point, side } = reading.value;

	const unknownCall = findUnknownFunctionCall(typedExpression);
	if (unknownCall !== null) return { kind: 'refus', message: unknownFunctionMessage(unknownCall) };

	const substituted = context.substitute(typedExpression);
	const ast = substituted === null ? undefined : parseCommandExpression(substituted).ast;
	if (ast === undefined) return { kind: 'refus', message: context.unreadable };

	// L6 : une fonction de l'atelier citée seule garde son nom, dans sa lettre.
	// Son expression est rangée en x (`INTERNAL_LETTER`) : le calcul s'y fait.
	const named = citedFunction(context.atelier, typedExpression);
	const typedVariable = reading.value.variable;
	let variable: string;
	let shownLetter: string;
	if (named !== null) {
		if (typedVariable !== null && typedVariable !== named.letter) {
			return {
				kind: 'refus',
				message: `${named.name} s'écrit avec la lettre ${named.letter} : .limite ${named.name} en ${named.letter}=${reading.pointText}.`
			};
		}
		variable = INTERNAL_LETTER;
		shownLetter = named.letter;
	} else {
		const guessed = guessedLetter(ast, typedVariable, reading.pointText);
		if (!guessed.ok) return { kind: 'refus', message: guessed.message };
		variable = guessed.letter;
		shownLetter = guessed.letter;
	}

	const direction: LimitDirection = side ?? 'both';
	const approach = point.kind === 'infinite' ? infinity(point.sign) : point.node;
	const result = safeLimit(ast, variable, approach, direction);
	if (result === null) return { kind: 'commande', input, output: UNKNOWN_LIMIT };

	const pointLatex = pointLatexOf(point, side);
	const pointText = pointTextOf(point, side);

	if (result.status === 'does-not-exist') {
		return noLimit(input, ast, variable, approach, point);
	}
	const value = knownValue(result);
	if (value === null) return { kind: 'commande', input, output: UNKNOWN_LIMIT };

	const shown = shownExpression(context.atelier, typedExpression, ast);
	const bodyLatex =
		named !== null
			? `${named.name}(${shownLetter})`
			: wrapLatex(shown, toLatex(withoutFractionParentheses(shown)));
	const bodyText =
		named !== null ? `${named.name}(${shownLetter})` : wrapText(shown, toCustom(shown));
	return {
		kind: 'commande',
		input,
		output: `lim ${shownLetter}→${pointText} ${bodyText} = ${valueText(value)}`,
		latex: `\\lim\\limits_{${shownLetter}\\to ${pointLatex}} ${bodyLatex} = ${toLatex(value)}`
	};
}

/** Lire le point tapé après `en` : côté, lettre, infini ou nombre. */
function readPoint(
	context: LimitContext,
	typed: string
): { ok: true; value: PointReading; pointText: string } | { ok: false; message: string } {
	let rest = typed;
	let side: 'left' | 'right' | null = null;
	const words = SIDE_WORDS.exec(rest);
	if (words !== null) {
		side = words[1].toLowerCase() === 'droite' ? 'right' : 'left';
		rest = rest.slice(0, words.index).trim();
	}
	let variable: string | null = null;
	const assignment = ASSIGNMENT.exec(rest);
	if (assignment !== null) {
		variable = assignment[1];
		rest = assignment[2].trim();
	}
	const infinite = INFINITY_WRITING.exec(rest.replace(/\s/g, ''));
	if (infinite !== null) {
		if (side !== null) {
			return {
				ok: false,
				message: `À l'infini, pas de côté à préciser : .limite 1/x en ${infinite[1] === '-' ? '-' : '+'}∞.`
			};
		}
		const sign = infinite[1] === '-' ? 'negative' : 'positive';
		return {
			ok: true,
			value: { point: { kind: 'infinite', sign }, side: null, variable },
			pointText: rest
		};
	}
	if (side === null) {
		const signed = SIDE_EXPONENT.exec(rest) ?? SIDE_SUFFIX.exec(rest);
		if (signed !== null) {
			side = signed[2] === '+' ? 'right' : 'left';
			rest = signed[1].trim();
		}
	}
	const invalid = {
		ok: false as const,
		message: `Je n'ai pas su lire le point « ${typed} » : écris un nombre, +∞ ou -∞ (.limite 1/x en 0+, par exemple).`
	};
	if (INFINITY_WRITING.test(rest.replace(/\s/g, ''))) {
		return {
			ok: false,
			message: `À l'infini, pas de côté à préciser : .limite 1/x en +∞.`
		};
	}
	const substituted = context.substitute(rest);
	// Une valeur de l'atelier (`en a`) arrive remplacée entre parenthèses, `(2)`
	let node = substituted === null ? undefined : parseCommandExpression(substituted).ast;
	while (node?.type === 'delimiter') node = node.content;
	if (node === undefined || getVariables(node).size > 0) return invalid;
	return {
		ok: true,
		value: { point: { kind: 'finite', node }, side, variable },
		pointText: rest
	};
}

/**
 * La fonction de l'atelier citée SEULE (`f`, `f(x)`, `f(t)`), avec sa
 * lettre ; sinon `null` : `f(x)+1` n'est pas `f`.
 */
function citedFunction(
	atelier: Atelier,
	typed: string
): { readonly name: string; readonly letter: string } | null {
	const name = /^\s*([^\s(]+?)\s*(?:\(\s*[A-Za-z]\s*\))?\s*$/.exec(typed)?.[1];
	const object = name === undefined ? undefined : atelier.get(name);
	if (name === undefined || object?.kind !== 'function') return null;
	return { name, letter: typedLetterOf(atelier, object) };
}

/**
 * La lettre de l'expression (comme `.évaluer`) : tapée (`en t=1`), sinon x
 * s'il apparaît, sinon la seule lettre, sinon x. Plusieurs lettres sans x :
 * la variable s'écrit après « en ».
 */
function guessedLetter(
	ast: MathNode,
	typed: string | null,
	pointText: string
): { ok: true; letter: string } | { ok: false; message: string } {
	if (typed !== null) return { ok: true, letter: typed };
	const letters = [...getVariables(ast)].sort();
	if (letters.includes(INTERNAL_LETTER) || letters.length === 0) {
		return { ok: true, letter: INTERNAL_LETTER };
	}
	if (letters.length === 1) return { ok: true, letter: letters[0] };
	const listed = letters.map((l) => `« ${l} »`).join(', ');
	const last = letters[letters.length - 1];
	return {
		ok: false,
		message: `Plusieurs lettres (${listed}) : écris la variable après « en », par exemple « .limite … en ${last}=${pointText} ».`
	};
}

/** `evaluateLimit` sans exception : `null` quand le moteur renonce. */
function safeLimit(
	ast: MathNode,
	variable: string,
	approach: MathNode,
	direction: LimitDirection
): LimitResult | null {
	try {
		return evaluateLimit(ast, variable, approach, direction);
	} catch (error) {
		if (error instanceof LimitError) return null;
		throw error;
	}
}

/**
 * La valeur d'une limite que le moteur a CONCLUE, en écriture exacte, sinon
 * `null` : indéterminée, non supportée, approchée — ou un nombre à virgule
 * flottante qu'aucune écriture exacte ne reconnaît (L5).
 */
function knownValue(result: LimitResult): MathNode | null {
	if (result.status !== 'exact' && result.status !== 'infinite') return null;
	if (result.value === null || looksApproximate(result.value)) return null;
	return withEuler(result.value);
}

/** Un nombre décimal à plus de 6 chiffres après la virgule : un flottant, pas une valeur exacte. */
function looksApproximate(value: MathNode): boolean {
	let approximate = false;
	visitAST(value, {
		enterNumber: (node) => {
			if (/\.\d{7,}/.test(node.value)) approximate = true;
		}
	});
	return approximate;
}

/** `exp(1)` → `e`, `exp(u)` → `e^u` : l'écriture du lycée. */
function withEuler(value: MathNode): MathNode {
	return transformAST(value, {
		leaveFunction: (node) => {
			if (node.name !== 'exp' || node.args.length !== 1) return undefined;
			const [argument] = node.args;
			return isNumber(argument) && Number(argument.value) === 1
				? mathConstant('euler')
				: power(mathConstant('euler'), argument);
		}
	});
}

/**
 * Le moteur conclut « pas de limite » : L4, les deux limites latérales quand
 * il les connaît (« à gauche −∞, à droite +∞ »), sinon la conclusion seule.
 */
function noLimit(
	input: string,
	ast: MathNode,
	variable: string,
	approach: MathNode,
	point: LimitPoint
): CalcResult {
	const atLatex = pointLatexOf(point, null);
	const atText = pointTextOf(point, null);
	const left = point.kind === 'finite' ? safeLimit(ast, variable, approach, 'left') : null;
	const right = point.kind === 'finite' ? safeLimit(ast, variable, approach, 'right') : null;
	const leftValue = left === null ? null : knownValue(left);
	const rightValue = right === null ? null : knownValue(right);
	if (leftValue === null || rightValue === null) {
		return {
			kind: 'commande',
			input,
			output: `Pas de limite en ${atText}.`,
			latex: `\\text{Pas de limite en } ${atLatex}`
		};
	}
	return {
		kind: 'commande',
		input,
		output: `Pas de limite en ${atText} : à gauche ${valueText(leftValue)}, à droite ${valueText(rightValue)}.`,
		latex: `\\text{Pas de limite en } ${atLatex} \\text{ : à gauche } ${toLatex(leftValue)} \\text{, à droite } ${toLatex(rightValue)}`
	};
}

/**
 * L'expression montrée : celle TAPÉE (les noms des valeurs gardés), sinon
 * celle calculée. Ses parenthèses restent pour le texte (`(x^2-1)/(x-1)`).
 */
function shownExpression(atelier: Atelier, typed: string, computed: MathNode): MathNode {
	return astOf(typed, 'command', atelier.functionNames) ?? computed;
}

/**
 * `(x^2-1)/(x-1)` : les parenthèses tapées pour la barre de fraction ne
 * s'écrivent pas dans `\dfrac{x^2-1}{x-1}`.
 */
function withoutFractionParentheses(node: MathNode): MathNode {
	const bare = (n: MathNode): MathNode =>
		n.type === 'delimiter' && n.semantic === 'grouping' ? n.content : n;
	return transformAST(node, {
		leaveDivision: (n) => ({ ...n, numerator: bare(n.numerator), denominator: bare(n.denominator) })
	});
}

/** Une somme après `\lim` se met entre parenthèses : `\lim (t^2 + 1)`. */
function wrapLatex(node: MathNode, latex: string): string {
	return isAddition(node) || isSubtraction(node) ? `\\left(${latex}\\right)` : latex;
}

function wrapText(node: MathNode, text: string): string {
	return isAddition(node) || isSubtraction(node) ? `(${text})` : text;
}

/** Le point en indice de `\lim` : `0^+`, `+\infty`, `\frac{1}{2}`. */
function pointLatexOf(point: LimitPoint, side: 'left' | 'right' | null): string {
	if (point.kind === 'infinite') return point.sign === 'positive' ? '+\\infty' : '-\\infty';
	const latex = toLatex(point.node).replace(/\\dfrac/g, '\\frac');
	return side === null ? latex : `${latex}^${side === 'right' ? '+' : '-'}`;
}

/** Le point dans le texte de la ligne : `0+`, `+∞`. */
function pointTextOf(point: LimitPoint, side: 'left' | 'right' | null): string {
	if (point.kind === 'infinite') return point.sign === 'positive' ? '+∞' : '-∞';
	const text = toCustom(point.node);
	return side === null ? text : `${text}${side === 'right' ? '+' : '-'}`;
}

/** Une valeur dans le texte de la ligne : `+∞`, `-∞`, sinon son écriture. */
function valueText(value: MathNode): string {
	if (isInfinity(value)) return value.sign === 'positive' ? '+∞' : '-∞';
	return toCustom(value);
}
