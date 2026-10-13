/**
 * Atelier — la réciproque d'une fonction de l'atelier
 *
 * Lot 3 de `docs/wip/atelier-reciproque-phase0.md` (R1-R4, Q5 = (b)) : le
 * moteur (`computeReciprocal`, `mathAST/reciprocal/`) calcule, l'atelier lui
 * passe f (noms remplacés), son intervalle et sa lettre, puis range la réponse
 * dans la carte `f⁻¹` — formule, et ensemble de départ comme `interval`.
 *
 * **Paramètres** (décision de David, cas 1) : f cite des valeurs de l'atelier
 * (`f(x) = a x + b`, curseurs). La réciproque est JUGÉE avec leurs valeurs
 * actuelles (bijectivité, ensembles, branche), et ÉCRITE avec leurs lettres
 * quand le solveur sait résoudre `y = a x + b` et que sa solution coïncide,
 * valeurs remplacées, avec la réciproque jugée (`(x − b)/a`). Sinon la formule
 * garde les nombres : juste, mais elle ne suit plus le curseur qu'au recalcul.
 *
 * @module atelier/reciprocal
 */

import type { Atelier } from './atelier.svelte';
import type { CalcResult } from './calcul';
import type { MathNode } from '$lib/mathAST/types';
import type { Domain } from '$lib/mathAST/domain/types';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { computeReciprocal, type ReciprocalResult } from '$lib/mathAST/reciprocal';
import { approx } from '$lib/mathAST/reciprocal/image';
import { textbookWriting } from '$lib/mathAST/reciprocal/writing';
import { solve } from '$lib/mathAST/solve/solve';
import { isSolverFailure } from '$lib/mathAST/solve/types';
import { equals, variable as variableNode } from '$lib/mathAST/factory';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { formatInterval } from '$lib/mathAST/domain/format';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { expandCommandArgument, substitutedAstOf } from './engine';
import { derivativeOf, displayName, hasObjectNameShape, reciprocalOf } from './names';
import { intervalDomainOf, readInterval, splitInterval } from './interval';
import { INTERNAL_LETTER, renameVariableIn, typedLetterOf } from './letter';
import { astOf } from './parse';

// =============================================================================
// Types
// =============================================================================

/** La ligne de Calcul : la réponse (formule et ensembles), les étapes, une note. */
export interface ReciprocalLine {
	readonly answer: string;
	readonly steps: readonly RenderedStep[];
	readonly note?: string;
}

/** La réciproque calculée pour la carte `f⁻¹`, ou le refus en français. */
export type ReciprocalOutcome =
	| {
			readonly ok: true;
			/** La formule en x, en notation texte (provenance `text`). */
			readonly definition: string;
			/** L'ensemble de départ f(I), relisible par `readInterval` ; absent pour ℝ. */
			readonly interval?: string;
			readonly line: ReciprocalLine;
	  }
	| {
			readonly ok: false;
			readonly message: string;
			/** Le message cite des formules en `$…$` (réciproques par morceau). */
			readonly formulas?: true;
	  };

// =============================================================================
// Constantes
// =============================================================================

/** Lettres possibles pour le second membre de `y = f(x)` quand f garde ses paramètres. */
const SECOND_MEMBER_LETTERS = ['y', 'u', 'w', 'z', 'v', 's'];

/** Points où la formule à lettres doit rendre la même valeur que la réciproque jugée. */
const CHECK_POINTS = [-3.7, -1.3, -0.4, 0.35, 1.2, 2.6, 7.9, 23];

const TOLERANCE = 1e-7;

/** Au-delà, le plus ancien calcul est oublié (un curseur en produit un par cran). */
const CACHE_SIZE = 64;

/**
 * Les calculs déjà faits : `recomputeAll` refait la carte `f⁻¹` à chaque
 * mutation de l'atelier, et `computeReciprocal` (variations, solveur) n'est
 * pas gratuit. La clé contient tout ce dont dépend le résultat.
 */
const cache = new Map<string, ReciprocalOutcome>();

// =============================================================================
// Fonctions
// =============================================================================

/** Ce que rend le moteur, mis en cache. */
function cached(key: string, compute: () => ReciprocalOutcome): ReciprocalOutcome {
	const known = cache.get(key);
	if (known !== undefined) return known;
	const fresh = compute();
	if (cache.size >= CACHE_SIZE) cache.delete(cache.keys().next().value as string);
	cache.set(key, fresh);
	return fresh;
}

function refused(message: string): ReciprocalOutcome {
	return { ok: false, message, ...(message.includes('$') && { formulas: true as const }) };
}

/** Le type d'un objet, dans la phrase de refus (« a est une valeur »). */
const KIND_NAMES = { value: 'une valeur', sequence: 'une suite', list: 'une liste' } as const;

/**
 * La réciproque de la fonction `base` de l'atelier, sur `on` (tapé après
 * « sur ») s'il est donné, sinon sur l'intervalle de f, sinon sur son domaine.
 *
 * ⚠️ `on` REMPLACE l'intervalle de f (le plus simple : c'est ce que l'élève
 * vient d'écrire) ; il n'est pas croisé avec lui.
 */
export function reciprocalOfFunction(
	atelier: Atelier,
	base: string,
	on?: string
): ReciprocalOutcome {
	const object = atelier.get(base);
	if (object === undefined) return refused(`« ${base} » n'existe pas dans l'atelier.`);
	const shown = displayName(base);
	if (object.kind !== 'function') {
		return refused(
			`Seule une fonction a une réciproque : « ${shown} » est ${KIND_NAMES[object.kind]}.`
		);
	}
	const owner = reciprocalOf(base);
	if (owner !== null) return refused(`La réciproque de ${shown}, c'est ${owner}.`);
	if (derivativeOf(base) !== null) {
		return refused(
			`${shown} suit sa fonction : pas de carte réciproque pour une dérivée. Tape .réciproque suivi de sa formule.`
		);
	}
	if (object.status !== 'ok') {
		return refused(
			object.definition.trim() === ''
				? `« ${shown} » est vide : il n'y a rien à inverser.`
				: (object.message ?? `« ${shown} » ne se lit pas : il faut la corriger d'abord.`)
		);
	}

	const letter = typedLetterOf(atelier, object);
	let domain: Domain | null;
	if (on !== undefined) {
		const read = readInterval(on, letter);
		if (!read.ok) return refused(read.message);
		domain = read.domain;
	} else {
		domain = intervalDomainOf(object);
	}

	const numeric = substitutedAstOf(atelier, base);
	const lettered = substitutedAstOf(atelier, base, { keepValues: true });
	if (!numeric.ok) return refused(numeric.message);
	if (!lettered.ok) return refused(lettered.message);
	const parameters = [...getVariables(lettered.ast)].filter((v) => v !== INTERNAL_LETTER).sort();
	const values = parameterValues(atelier, parameters);

	const key = [
		toCustom(numeric.ast),
		toCustom(lettered.ast),
		domain === null ? '' : formatInterval(domain),
		letter,
		shown,
		JSON.stringify(values)
	].join('|');
	return cached(key, () => {
		const result = computeReciprocal(inLetter(numeric.ast, letter), {
			variable: letter,
			name: shown,
			...(domain !== null && { interval: domain })
		});
		return outcomeOf(result, { lettered: lettered.ast, values, letter, name: shown });
	});
}

/** Les valeurs actuelles des paramètres cités par f (`a = 2`). */
function parameterValues(atelier: Atelier, parameters: readonly string[]): Record<string, number> {
	const values: Record<string, number> = {};
	for (const name of parameters) {
		const read = substitutedAstOf(atelier, name);
		const value = read.ok ? approx(read.ast) : null;
		if (value !== null) values[name] = value;
	}
	return values;
}

/** L'arbre de f, rangé en x, écrit dans la lettre de l'élève. */
function inLetter(ast: MathNode, letter: string): MathNode {
	return letter === INTERNAL_LETTER ? ast : renameVariableIn(ast, INTERNAL_LETTER, letter);
}

/** `a = 0,5` : la valeur d'un paramètre dans un message. */
function valueText(name: string, value: number): string {
	return `${name} = ${String(Number(value.toPrecision(12))).replace('.', ',')}`;
}

/** `a = 2 et b = 3` */
function valuesText(values: Readonly<Record<string, number>>): string {
	const parts = Object.entries(values).map(([name, value]) => valueText(name, value));
	return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} et ${parts.at(-1)}`;
}

function outcomeOf(
	result: ReciprocalResult,
	context: {
		readonly lettered: MathNode;
		readonly values: Readonly<Record<string, number>>;
		readonly letter: string;
		readonly name: string;
	}
): ReciprocalOutcome {
	const { lettered, values, letter, name } = context;
	const withParameters = Object.keys(values).length > 0;
	if (!result.ok) {
		const { refusal } = result;
		if (!withParameters) return refused(refusal.message);
		// Cas 1 de David : « pour a = 0, f est constante : pas de réciproque »
		return refused(
			refusal.kind === 'constant'
				? `Pour ${valuesText(values)}, ${name} est constante : pas de réciproque.`
				: `Pour ${valuesText(values)} : ${refusal.message}`
		);
	}

	const numericFormula =
		letter === INTERNAL_LETTER
			? result.expression
			: renameVariableIn(result.expression, letter, INTERNAL_LETTER);
	const formula = withParameters
		? (letteredFormula(lettered, numericFormula, result.departure, values) ?? numericFormula)
		: numericFormula;

	const departure = formatInterval(result.departure);
	const read = readInterval(departure);
	const [solveStep, renameStep, setsStep] = result.steps;
	const shownFormula = inLetter(formula, letter);
	const renamed =
		formula === numericFormula
			? renameStep?.expressionLatex
			: `${name}^{-1}\\left( ${letter} \\right) = ${toLatex(shownFormula)}`;
	const answer = [renamed, setsStep?.expressionLatex]
		.filter((l) => l !== undefined)
		.join(',\\quad ');
	return {
		ok: true,
		definition: toCustom(formula),
		// `ℝ` ne restreint rien ; un ensemble illisible (borne par conditions) non
		// plus : la courbe se trace alors entière, comme pour une fonction
		...(read.ok && read.domain !== null && { interval: departure }),
		line: {
			answer,
			steps: [solveStep, renameStep, setsStep].filter((s) => s !== undefined),
			...(withParameters && {
				note:
					formula === numericFormula
						? `Calculée avec ${valuesText(values)}.`
						: `Étapes faites avec ${valuesText(values)} ; la carte ${name}⁻¹ garde les lettres et suit les curseurs.`
			})
		}
	};
}

/**
 * La réciproque écrite avec les lettres des paramètres (`(x − b)/a`), ou
 * `null` : le solveur ne sait pas résoudre `y = f(x)` avec ses lettres, ou
 * aucune de ses solutions ne rend, valeurs remplacées, la réciproque jugée.
 */
function letteredFormula(
	lettered: MathNode,
	numeric: MathNode,
	departure: Domain,
	values: Readonly<Record<string, number>>
): MathNode | null {
	const used = getVariables(lettered);
	const y = SECOND_MEMBER_LETTERS.find((l) => !used.has(l) && !(l in values));
	if (y === undefined) return null;
	let solutions;
	try {
		const solved = solve(equals(variableNode(y), lettered), { variable: INTERNAL_LETTER });
		if (isSolverFailure(solved) || solved.periodicSolutions) return null;
		solutions = solved.solutions;
	} catch {
		return null;
	}
	const at = (node: MathNode, t: number) => approx(substitute(node, { [INTERNAL_LETTER]: t }));
	const points = CHECK_POINTS.filter((t) => {
		if (!containsValue(departure, t)) return false;
		const expected = at(numeric, t);
		return expected !== null && Number.isFinite(expected);
	});
	if (points.length < 2) return null;
	for (const solution of solutions) {
		const candidate = substitute(textbookWriting(solution.value, y), {
			[y]: variableNode(INTERNAL_LETTER)
		});
		const valued = substitute(candidate, values);
		const agrees = points.every((t) => {
			const [got, expected] = [at(valued, t), at(numeric, t)];
			return (
				got !== null &&
				expected !== null &&
				Math.abs(got - expected) <= TOLERANCE * Math.max(1, Math.abs(expected))
			);
		});
		if (agrees) return candidate;
	}
	return null;
}

/**
 * `.réciproque f [sur I]` et `.réciproque 2x+3 [sur I]` dans Calcul.
 *
 * Sur une fonction de l'atelier, crée (ou met à jour) la carte `f⁻¹`, comme le
 * bouton « Réciproque ». Sur une expression, la ligne seule : aucune carte.
 *
 * @param prepare - la mise au propre de Calcul (virgule décimale, π)
 */
export function reciprocalCommand(
	atelier: Atelier,
	input: string,
	typedArgument: string,
	prepare: (text: string) => string
): CalcResult {
	const { body, written } = splitInterval(typedArgument.trim(), 'detect');
	if (body === '') {
		return {
			kind: 'refus',
			message: 'Écris la fonction après la commande : .réciproque f, ou .réciproque f sur [0;+∞[.'
		};
	}
	const on = written ?? undefined;
	const target = /^([A-Za-z](?:_\d+)?'*)\s*(?:\(\s*[A-Za-z]\s*\))?$/.exec(body)?.[1];
	if (target !== undefined && atelier.get(target) !== undefined) {
		return reciprocalResult(atelier, target, on, input);
	}
	// Un nom d'objet qui n'existe pas (`g`) : jamais lu comme l'expression `g`
	if (target !== undefined && hasObjectNameShape(target.replace(/'+$/, ''))) {
		return { kind: 'refus', message: `« ${target} » n'existe pas dans l'atelier.` };
	}

	// Une expression : la ligne seule, dans sa lettre (x, sinon la seule qu'elle cite)
	const expanded = expandCommandArgument(atelier, prepare(body));
	const ast = expanded === null ? null : astOf(expanded, 'text', atelier.functionNames);
	if (ast === null) return { kind: 'refus', message: `Je n'ai pas su lire « ${body} ».` };
	const letters = [...getVariables(ast)];
	const letter = letters.includes(INTERNAL_LETTER)
		? INTERNAL_LETTER
		: letters.length === 1
			? letters[0]
			: INTERNAL_LETTER;
	let domain: Domain | null = null;
	if (on !== undefined) {
		const read = readInterval(on, letter);
		if (!read.ok) return { kind: 'refus', message: read.message };
		domain = read.domain;
	}
	const result = computeReciprocal(ast, {
		variable: letter,
		...(domain !== null && { interval: domain })
	});
	const outcome = outcomeOf(result, { lettered: ast, values: {}, letter, name: 'f' });
	return calcResultOf(outcome, input, null);
}

/**
 * La réciproque d'une fonction de l'atelier, carte comprise, en ligne de
 * Calcul. Partagée par `.réciproque f` et le bouton « Réciproque » : les deux
 * disent la même chose.
 */
export function reciprocalResult(
	atelier: Atelier,
	base: string,
	on: string | undefined,
	input: string
): CalcResult {
	const created = atelier.createReciprocal(base, on);
	if (!created.ok) {
		return {
			kind: 'refus',
			message: created.message,
			...('formulas' in created && created.formulas === true && { formulas: true as const })
		};
	}
	const note =
		created.existed === 'same'
			? `${displayName(created.object.name)} existe déjà.`
			: created.existed === 'updated'
				? `${displayName(created.object.name)} mise à jour.`
				: null;
	return calcResultOf(created.outcome, input, note);
}

function calcResultOf(outcome: ReciprocalOutcome, input: string, note: string | null): CalcResult {
	if (!outcome.ok) {
		return {
			kind: 'refus',
			message: outcome.message,
			...(outcome.formulas === true && { formulas: true as const })
		};
	}
	const notes = [outcome.line.note, note].filter((n): n is string => n !== undefined && n !== null);
	return {
		kind: 'commande',
		input,
		output: outcome.definition,
		latex: outcome.line.answer,
		steps: outcome.line.steps,
		...(notes.length > 0 && { note: notes.join(' ') })
	};
}

/** Un morceau d'un message : du texte, ou une formule LaTeX (entre `$…$`). */
export interface MessagePart {
	readonly math: boolean;
	readonly text: string;
}

/**
 * Un refus de réciproque coupé en texte et formules (`$f^{-1}(x) = \sqrt{x}$`),
 * pour que la vue compose les formules. Un `$` sans son pair reste du texte.
 */
export function messageParts(message: string): MessagePart[] {
	const parts: MessagePart[] = [];
	const pattern = /\$([^$]+)\$/g;
	let last = 0;
	for (const match of message.matchAll(pattern)) {
		if (match.index > last) parts.push({ math: false, text: message.slice(last, match.index) });
		parts.push({ math: true, text: match[1] });
		last = match.index + match[0].length;
	}
	if (last < message.length) parts.push({ math: false, text: message.slice(last) });
	return parts;
}
