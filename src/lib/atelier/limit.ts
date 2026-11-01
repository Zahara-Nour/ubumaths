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
 * Le calcul est celui de `evaluateLimit` (`mathAST/limits`). « Comment ? »
 * (PR 3) : les étapes de `pedagogical-limits`, seulement quand elles
 * concluent la réponse de la ligne (`limit-steps.ts`).
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
import { infinity, mathConstant, number, opposite, power } from '$lib/mathAST/factory';
import {
	isAddition,
	isInfinity,
	isMathConstant,
	isNumber,
	isOpposite,
	isSubtraction
} from '$lib/mathAST/guards';
import type { Domain } from '$lib/mathAST/domain/types';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { toLatex } from '$lib/mathAST/latex-generator';
import { toCustom } from '$lib/mathAST/custom-generator';
import { transformAST, visitAST } from '$lib/mathAST/visitor';
import {
	findUnknownFunctionCall,
	unknownFunctionMessage
} from '$lib/mathAST/parser/custom/tokenizer';
import { bareFunctionMessage, bareFunctionName } from '$lib/mathAST/cli/core/variable-argument';
import { astOf } from './parse';
import { listCitedMessage } from './list-cited';
import {
	citedIntervalDomain,
	composedMessage,
	intervalDomainOf,
	intervalText,
	outsideIntervalMessage,
	type CitedInterval
} from './interval';
import { INTERNAL_LETTER, typedLetterOf } from './letter';
import { lettersText } from './types';
import { limitSteps, type LimitQuestion as StepsQuestion, type LimitSteps } from './limit-steps';
import type { LimitAnswer } from './limit-steps-check';

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

/**
 * Un opérande de fraction qui se lit seul, sans parenthèses : un nombre, une
 * lettre, une parenthèse, un appel (`sqrt(x+1)`), éventuellement à une
 * puissance (`(x-1)^2`, `e^x`, `x^(n+1)`).
 */
const POWER_ATOM =
	/^(?:\d+(?:\.\d+)?|[A-Za-zπ]|\([^()]*\)|[A-Za-z]+\([^()]*\))(?:\^(?:\d+|[A-Za-z]|\([^()]*\)))?$/;

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
	const { atelier } = context;
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
	const { point, variable: typedVariable } = reading.value;
	let side = reading.value.side;

	const unknownCall = findUnknownFunctionCall(typedExpression);
	if (unknownCall !== null) return { kind: 'refus', message: unknownFunctionMessage(unknownCall) };
	// `ln x` sans parenthèses se lisait l·n·x (« lim l n x = 0 ») : refus, comme
	// `.dériver` et les autres commandes (décision de David du 2026-10-06)
	const bare = bareFunctionName(typedExpression);
	if (bare !== null) return { kind: 'refus', message: bareFunctionMessage(bare) };
	// Une liste citée comme un nombre : la règle des cartes (`listCitedMessage`)
	const typedAst = astOf(typedExpression, 'command', atelier.functionNames);
	const listed =
		typedAst === null ? null : listCitedMessage(atelier.objects, getVariables(typedAst));
	if (listed !== null) return { kind: 'refus', message: listed };

	// L6 : une fonction (ou une suite) de l'atelier citée seule garde son nom
	const cited = citedObject(atelier, typedExpression);
	if (cited?.kind === 'refused') return { kind: 'refus', message: cited.message };

	const substituted = context.substitute(
		cited === null ? withSequenceCalls(atelier, typedExpression) : cited.bare
	);
	const ast = substituted === null ? undefined : parseCommandExpression(substituted).ast;
	if (ast === undefined) return { kind: 'refus', message: context.unreadable };

	let variable: string;
	let shownLetter: string;
	if (cited !== null) {
		if (typedVariable !== null && typedVariable !== cited.letter) {
			return {
				kind: 'refus',
				message: `${cited.name} s'écrit avec la lettre ${cited.letter} : .limite ${cited.name} en ${cited.letter}=${reading.pointText}.`
			};
		}
		variable = cited.variable;
		shownLetter = cited.letter;
	} else {
		const guessed = guessedLetter(ast, typedVariable, reading.pointText, typedExpression);
		if (!guessed.ok) return { kind: 'refus', message: guessed.message };
		variable = guessed.letter;
		shownLetter = guessed.letter;
	}

	// Une suite n'a de limite qu'en +∞, citée seule ou dans une expression (`2u_n`)
	const sequence =
		cited?.kind === 'sequence' ? cited.name : citedSequence(atelier, typedExpression);
	if (sequence !== null && !(point.kind === 'infinite' && point.sign === 'positive')) {
		const example = cited === null ? typedExpression : sequence;
		return {
			kind: 'refus',
			message: `${sequence} est une suite : sa limite se cherche en +∞ (.limite ${example} en +∞).`
		};
	}

	// I4 : l'ensemble choisi d'une fonction (`f(x) = x^2 sur [0;+∞[`), comme
	// `.évaluer` et `.intégrer` ; un bord se prend du côté intérieur
	const restricted = restrictedDomain(atelier, cited, typedExpression, shownLetter);
	if (restricted?.kind === 'composed') {
		return { kind: 'refus', message: composedMessage(restricted) };
	}
	if (restricted !== null) {
		const guarded = sideWithin(restricted, point, side, reading.pointText);
		if (!guarded.ok) return { kind: 'refus', message: guarded.message };
		side = guarded.side;
	}

	const direction: LimitDirection = side ?? 'both';
	const approach = point.kind === 'infinite' ? infinity(point.sign) : point.node;
	const result = safeLimit(ast, variable, approach, direction);
	if (result === null) return { kind: 'commande', input, output: unknownLimit(ast, variable) };

	// « Comment ? » : les étapes portent sur l'expression, dans la lettre de
	// l'élève ; une fonction ou une suite citée seule garde son nom
	const body = shownBody(cited, typedAst ?? ast, shownLetter);
	const question: StepsQuestion = {
		expression: ast,
		variable,
		letter: shownLetter,
		approach,
		direction,
		subject: cited === null ? null : body.latex.replace(/\\left|\\right/g, '')
	};
	const explain = (answer: LimitAnswer): LimitSteps | null => limitSteps(question, answer);

	if (result.status === 'does-not-exist') {
		const subject = cited?.kind === 'function' ? cited.name : null;
		const typedSide = reading.value.side;
		const limitQuestion = { ast, variable, approach };
		return noLimit(input, result, subject, limitQuestion, point, side, typedSide, explain);
	}
	const value = knownValue(result);
	if (value === null) return { kind: 'commande', input, output: unknownLimit(ast, variable) };
	// R1 : sans côté tapé, une fonction définie d'un seul côté (ln x en 0) l'écrit : x → 0⁺
	const impliedSide = side === null ? (result.definedSide ?? null) : null;
	if (impliedSide !== null) side = impliedSide;

	const explained = explain({ kind: 'value', value, impliedSide });
	return {
		kind: 'commande',
		input,
		output: `lim ${shownLetter}→${pointTextOf(point, side)} ${body.text} = ${valueText(value)}`,
		latex: `\\lim\\limits_{${shownLetter}\\to ${pointLatexOf(point, side)}} ${body.latex} = ${toLatex(value)}`,
		...stepsField(explained)
	};
}

/** Les étapes et leur résumé, quand il y en a — sinon rien, pas de clé `undefined`. */
function stepsField(explained: LimitSteps | null): Partial<LimitSteps> {
	if (explained === null) return {};
	return explained.summary === undefined
		? { steps: explained.steps }
		: { steps: explained.steps, summary: explained.summary };
}

/** Lire le point tapé après `en` : côté, lettre, infini ou nombre. */
function readPoint(
	context: LimitContext,
	typed: string
): { ok: true; value: PointReading; pointText: string } | { ok: false; message: string } {
	// Le point tel que tapé, côté compris, sans la lettre (`x=0+` → `0+`)
	const shownPoint = typed.replace(/^[A-Za-z]\s*=\s*/, '');
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
			pointText: shownPoint
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
	// `1/2` tapé en ligne s'écrit en fraction (`\frac{1}{2}`, pas `1 / 2`)
	node = transformAST(node, {
		leaveDivision: (n) => {
			const fraction = { ...n, displayStyle: 'fraction' as const };
			// `-1/2` se lit (−1)/2 : écrit −½, le signe devant la fraction
			if (isOpposite(n.numerator)) return opposite({ ...fraction, numerator: n.numerator.operand });
			if (isNumber(n.numerator) && n.numerator.value.startsWith('-')) {
				return opposite({ ...fraction, numerator: number(n.numerator.value.slice(1)) });
			}
			return fraction;
		}
	});
	return {
		ok: true,
		value: { point: { kind: 'finite', node }, side, variable },
		pointText: shownPoint
	};
}

/** Ce que `.limite` cite seul : une fonction ou une suite de l'atelier. */
type CitedObject =
	| {
			readonly kind: 'function' | 'sequence';
			/** Le nom montré : `f`, `f'`, `u`. */
			readonly name: string;
			/** Ce qu'on remplace par l'expression RANGÉE : `f`, `f'`, `u`. */
			readonly bare: string;
			/** La lettre de l'élève, à l'affichage : `t` pour f(t) = 1/t, `n`. */
			readonly letter: string;
			/** La lettre du calcul : x pour une fonction (rangée en x), n pour une suite. */
			readonly variable: string;
			/** Le nom de la fonction dont vient l'ensemble choisi (`f` pour `f'`). */
			readonly base: string;
	  }
	| { readonly kind: 'refused'; readonly message: string };

/** `f`, `f'`, `f(t)`, `u_n`, `u(n)` : un nom, ses primes, un appel ou un indice. */
const CITED_ALONE = /^([A-Za-z](?:_\d+)?)(['′]*)\s*(?:\(([^()]*)\)|_\{?\s*([A-Za-z])\s*\}?)?$/;

/**
 * La fonction ou la suite de l'atelier citée SEULE, sinon `null` (`f(x)+1`
 * est une expression).
 *
 * Une fonction se lit `f`, `f'` ou `f(<sa lettre>)` : son expression RANGÉE
 * (en x) est calculée en x, et montrée dans sa lettre — `f(t)` avec
 * f(t) = 1/t donne `\lim_{t\to 0^+} f(t)`. Un autre argument (`f(t)` quand
 * f s'écrit en x, `f(2x)`) n'est pas « f seule » : `null`, l'expression se
 * calcule substituée, dans sa lettre — et `citedIntervalDomain` refuse la
 * composée d'une fonction à ensemble choisi. Une suite se lit `u`, `u_n` ou
 * `u(n)`, calculée en n.
 */
function citedObject(atelier: Atelier, typed: string): CitedObject | null {
	const match = CITED_ALONE.exec(typed.trim());
	if (match === null) return null;
	const [, base, primeMarks, argument, index] = match;
	const object = atelier.get(base);
	const primes = "'".repeat(primeMarks.length);
	const name = `${base}${primes}`;
	if (object?.kind === 'function' && index === undefined) {
		const letter = typedLetterOf(atelier, object);
		const call = argument?.trim();
		// Un autre argument (`f(t)` avec f en x, `f(2x)`) : une expression, calculée
		// substituée dans SA lettre ; une composée d'une fonction à ensemble y est refusée
		if (call !== undefined && call !== letter) return null;
		return { kind: 'function', name, bare: name, letter, variable: INTERNAL_LETTER, base };
	}
	if (object?.kind === 'sequence' && primes === '') {
		const letter = typedLetterOf(atelier, object);
		const written = (argument ?? index)?.trim();
		if (written !== undefined && written !== letter) return null;
		if (object.mode === 'recurrence') {
			return {
				kind: 'refused',
				message: `${base} est une suite récurrente : .limite ne sait pas encore en calculer la limite.`
			};
		}
		return { kind: 'sequence', name, bare: base, letter, variable: letter, base };
	}
	return null;
}

/**
 * L'ensemble choisi des fonctions citées (I4), ou `null` : celui de la
 * fonction citée seule, sinon celui des fonctions de l'expression
 * (`citedIntervalDomain` — une composée y est refusée).
 */
function restrictedDomain(
	atelier: Atelier,
	cited: CitedObject | null,
	typed: string,
	letter: string
): CitedInterval | null {
	const get = (name: string) => atelier.get(name);
	if (cited?.kind === 'function') {
		const domain = intervalDomainOf(get(cited.base));
		return domain === null
			? null
			: { kind: 'restricted', domain, name: cited.name, conditions: [] };
	}
	if (cited !== null) return null;
	return citedIntervalDomain(get, typed, letter);
}

/**
 * Le point est-il au bord ou dans l'ensemble choisi ? Le côté, s'il n'est
 * pas tapé, devient le côté intérieur d'un bord (`en 0` sur [0 ; +∞[ → 0⁺) ;
 * un côté tapé hors de l'ensemble, un point loin de lui : refus.
 */
function sideWithin(
	cited: { readonly domain: Domain; readonly name: string },
	point: LimitPoint,
	side: 'left' | 'right' | null,
	pointText: string
): { ok: true; side: 'left' | 'right' | null } | { ok: false; message: string } {
	const set = intervalText(cited.domain);
	if (point.kind === 'infinite') {
		// Un grand nombre du bon signe : un ensemble borné de ce côté ne le contient pas
		const far = point.sign === 'positive' ? 1e12 : -1e12;
		return containsValue(cited.domain, far)
			? { ok: true, side }
			: {
					ok: false,
					message: `${cited.name} n'est pas définie au voisinage de ${pointText} : son ensemble de définition est ${set}.`
				};
	}
	let at: number;
	try {
		at = evaluateNodeToApproximatedNumber(point.node);
	} catch {
		return { ok: true, side };
	}
	const step = 1e-9 * Math.max(1, Math.abs(at));
	const leftIn = containsValue(cited.domain, at - step);
	const rightIn = containsValue(cited.domain, at + step);
	const shown = pointTextOf(point, null);
	if (!leftIn && !rightIn) {
		return { ok: false, message: outsideIntervalMessage(cited.name, shown, cited.domain) };
	}
	if ((side === 'left' && !leftIn) || (side === 'right' && !rightIn)) {
		const where = side === 'left' ? 'à gauche' : 'à droite';
		return {
			ok: false,
			message: `${cited.name} n'est pas définie ${where} de ${shown} : son ensemble de définition est ${set}.`
		};
	}
	if (side !== null || (leftIn && rightIn)) return { ok: true, side };
	return { ok: true, side: leftIn ? 'left' : 'right' };
}

/** Ce qui suit `\lim` : `f(t)`, `f'(x)`, `u_n`, sinon l'expression tapée. */
function shownBody(
	cited: CitedObject | null,
	expression: MathNode,
	letter: string
): { readonly latex: string; readonly text: string } {
	if (cited?.kind === 'function') {
		const call = `${cited.name}(${letter})`;
		return { latex: call, text: call };
	}
	if (cited?.kind === 'sequence') {
		const sub = cited.name.includes('_') ? `(${cited.name})_${letter}` : `${cited.name}_${letter}`;
		return { latex: sub.replace(/[()]/g, (p) => (p === '(' ? '\\left(' : '\\right)')), text: sub };
	}
	return {
		latex: wrapLatex(expression, toLatex(withoutFractionParentheses(expression))),
		text: wrapText(expression, readableText(expression))
	};
}

/** Le nom de la première suite de l'atelier que cite l'expression tapée (`u_k + 1`), sinon `null`. */
function citedSequence(atelier: Atelier, typed: string): string | null {
	for (const object of atelier.objects) {
		if (object.kind !== 'sequence') continue;
		if (new RegExp(`(?<![A-Za-z_\\\\])${object.name}(?![A-Za-z0-9])`).test(typed))
			return object.name;
	}
	return null;
}

/**
 * `u_n`, `u_{k}` d'une suite de l'atelier → `u(n)`, `u(k)` : la substitution
 * compose un APPEL (`(1/k)`), alors que `u_n` deviendrait `(1/n)_n`, un
 * indice illisible (`.limite u_n + 1 en +∞`).
 */
function withSequenceCalls(atelier: Atelier, typed: string): string {
	let text = typed;
	for (const object of atelier.objects) {
		if (object.kind !== 'sequence') continue;
		const indexed = new RegExp(`(?<![A-Za-z_\\\\])${object.name}_\\{?\\s*([A-Za-z])\\s*\\}?`, 'g');
		text = text.replace(indexed, `${object.name}($1)`);
	}
	return text;
}

/**
 * La lettre de l'expression (comme `.évaluer`) : tapée (`en t=1`), sinon x
 * s'il apparaît, sinon la seule lettre, sinon x. Plusieurs lettres sans x :
 * la variable s'écrit après « en ».
 */
function guessedLetter(
	ast: MathNode,
	typed: string | null,
	pointText: string,
	typedExpression: string
): { ok: true; letter: string } | { ok: false; message: string } {
	const letters = [...getVariables(ast)].sort();
	// La lettre tapée (`en x=0`) absente d'une expression qui en a d'autres :
	// la limite rendrait l'expression elle-même (`f(t)` → 1/t), refus
	if (typed !== null && letters.length > 0 && !letters.includes(typed)) {
		const own = letters.includes(INTERNAL_LETTER) ? INTERNAL_LETTER : letters[letters.length - 1];
		return {
			ok: false,
			message: `L'expression s'écrit avec ${own} : .limite ${typedExpression} en ${own}=${pointText}.`
		};
	}
	if (typed !== null) return { ok: true, letter: typed };
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

/**
 * « Je ne sais pas » : une lettre autre que la variable (k, λ) peut en être
 * la cause — le moteur ne devine plus son signe (e^{−kx} en +∞ rendait +∞,
 * chantier limites-parametres) ; on la nomme.
 */
function unknownLimit(ast: MathNode, variable: string): string {
	const parameters = [...getVariables(ast)].filter((name) => name !== variable).sort();
	if (parameters.length === 0) return UNKNOWN_LIMIT;
	return `Je ne sais pas calculer cette limite : elle peut dépendre du signe de ${lettersText(parameters)}.`;
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

/** Ce qu'il faut pour recalculer les limites latérales (L4). */
interface LimitQuestion {
	readonly ast: MathNode;
	readonly variable: string;
	readonly approach: MathNode;
}

/**
 * Le moteur conclut « pas de limite ». La raison qu'il donne : hors du
 * domaine (R2, « l'expression n'est pas définie au voisinage de -1 » ; avec
 * un côté tapé, Q1, « … à droite de 0 »), oscillation (R3) ; sinon L4, les deux limites latérales quand il les
 * connaît (« à gauche −∞, à droite +∞ »), sinon la conclusion seule.
 * `subject` : le nom d'une fonction de l'atelier citée seule, sinon `null`
 * (« l'expression »).
 */
function noLimit(
	input: string,
	result: LimitResult,
	subject: string | null,
	question: LimitQuestion,
	point: LimitPoint,
	side: 'left' | 'right' | null,
	typedSide: 'left' | 'right' | null,
	explain: (answer: LimitAnswer) => LimitSteps | null
): CalcResult {
	const { ast, variable, approach } = question;
	const atLatex = pointLatexOf(point, side);
	const atText = pointTextOf(point, side);
	const who = subject ?? "l'expression";
	// Le nom d'une fonction s'écrit en mathématiques (`f_1`), hors de `\text`
	const clause = (words: string): string =>
		subject === null
			? `\\text{ : l'expression ${words}}`
			: `\\text{ : } ${subject.replace(/_(\d{2,})/, '_{$1}')} \\text{ ${words}}`;
	// Q1 (David, 2026-10-14) : la raison s'écrit aussi avec un côté tapé ;
	// hors du domaine, elle dit alors de quel côté (« à droite de 0 »)
	const reason = result.noLimitReason;
	if (reason === 'outside-domain' && typedSide !== null) {
		const where = typedSide === 'right' ? 'à droite de' : 'à gauche de';
		return {
			kind: 'commande',
			input,
			output: `Pas de limite en ${atText} : ${who} n'est pas définie ${where} ${pointTextOf(point, null)}.`,
			latex: `\\text{Pas de limite en } ${atLatex} ${clause(`n'est pas définie ${where} `)} ${pointLatexOf(point, null)}`
		};
	}
	if (reason === 'outside-domain') {
		return {
			kind: 'commande',
			input,
			output: `Pas de limite en ${atText} : ${who} n'est pas définie au voisinage de ${atText}.`,
			latex: `\\text{Pas de limite en } ${atLatex} ${clause("n'est pas définie au voisinage de ")} ${atLatex}`
		};
	}
	if (reason === 'oscillation') {
		return {
			kind: 'commande',
			input,
			output: `Pas de limite en ${atText} : ${who} oscille sans se rapprocher d'aucune valeur.`,
			latex: `\\text{Pas de limite en } ${atLatex} ${clause("oscille sans se rapprocher d'aucune valeur")}`
		};
	}
	// Un côté tapé : sa conclusion seule ; sinon les deux côtés (L4)
	const sides = point.kind === 'finite' && side === null;
	const left = sides ? safeLimit(ast, variable, approach, 'left') : null;
	const right = sides ? safeLimit(ast, variable, approach, 'right') : null;
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
		latex: `\\text{Pas de limite en } ${atLatex} \\text{ : à gauche } ${toLatex(leftValue)} \\text{, à droite } ${toLatex(rightValue)}`,
		// Seul « pas de limite » expliqué : les deux côtés, que la ligne écrit
		...stepsField(explain({ kind: 'sides', left: leftValue, right: rightValue }))
	};
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

/**
 * Le point en indice de `\lim` : `0^+`, `+\infty`, `\frac{1}{2}`. Avec un
 * côté, un point qui n'est pas un nombre seul se met entre accolades, en
 * petite fraction : `{\tfrac{3}{4}}^-` (`\frac34^-` se lirait 3/4⁻).
 */
function pointLatexOf(point: LimitPoint, side: 'left' | 'right' | null): string {
	if (point.kind === 'infinite') return point.sign === 'positive' ? '+\\infty' : '-\\infty';
	const latex = toLatex(point.node);
	if (side === null) return latex.replace(/\\dfrac/g, '\\frac');
	const mark = side === 'right' ? '+' : '-';
	return isPlainPoint(point.node)
		? `${latex}^${mark}`
		: `{${latex.replace(/\\dfrac/g, '\\tfrac')}}^${mark}`;
}

/** Le point dans le texte de la ligne : `0+`, `+∞`. */
function pointTextOf(point: LimitPoint, side: 'left' | 'right' | null): string {
	if (point.kind === 'infinite') return point.sign === 'positive' ? '+∞' : '-∞';
	const text = withPiSymbol(toCustom(point.node));
	return side === null ? text : `${text}${side === 'right' ? '+' : '-'}`;
}

/** Un nombre ou une constante, signés : `0^+`, `-1^+`, `\pi^+` sans accolades. */
function isPlainPoint(node: MathNode): boolean {
	const bare = isOpposite(node) ? node.operand : node;
	return isNumber(bare) || isMathConstant(bare);
}

/** Le texte de la ligne écrit π, pas `\pi`. */
function withPiSymbol(text: string): string {
	return text.replace(/\\pi(?![A-Za-z])/g, 'π');
}

/** Une valeur dans le texte de la ligne : `+∞`, `-∞`, sinon son écriture. */
function valueText(value: MathNode): string {
	if (isInfinity(value)) return value.sign === 'positive' ? '+∞' : '-∞';
	return withPiSymbol(readableText(value));
}

/**
 * Le texte d'une expression, lisible à l'export : une division en `/`
 * (`toCustom` écrit `:/` une division en ligne, `e^{1:/x}`), un exposant de
 * plus d'un caractère entre parenthèses (`e^(1/x)`, `e^(-x)`).
 */
function readableText(node: MathNode): string {
	const fractions = transformAST(node, {
		leaveDivision: (n) => ({ ...n, displayStyle: 'fraction' as const })
	});
	let text = toCustom(fractions);
	// Des accolades les plus intérieures vers l'extérieur : `e^{2x}` → `e^(2x)`,
	// `{e^x}/{x^2}` → `e^x/x^2`, `1/{2x}` → `1/(2x)`
	for (let previous = ''; previous !== text;) {
		previous = text;
		text = text.replace(/\^\{([^{}]*)\}/g, (_whole, exponent: string) =>
			exponent.length === 1 ? `^${exponent}` : `^(${exponent})`
		);
		text = text.replace(/\{([^{}]*)\}/g, (_whole, operand: string) =>
			POWER_ATOM.test(operand) ? operand : `(${operand})`
		);
	}
	return text;
}
