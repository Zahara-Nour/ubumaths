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
import { containsValue, intersect, isEmpty } from '$lib/mathAST/domain/algebra';
import { formatInterval } from '$lib/mathAST/domain/format';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { expandCommandArgument, substitutedAstOf } from './engine';
import {
	derivativeOf,
	displayName,
	hasObjectNameShape,
	reciprocalName,
	reciprocalOf
} from './names';
import {
	intervalDomainOf,
	intervalText,
	outsideIntervalMessage,
	readInterval,
	splitInterval,
	type CitedInterval
} from './interval';
import { INTERNAL_LETTER, renameVariableIn, typedLetterOf } from './letter';
import { astOf, type Provenance } from './parse';
import { dependsOnMessage } from './types';
import { visitAST } from '$lib/mathAST/visitor';

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

/**
 * ⚠️ `formulas` (composées par `{@html}`) seulement pour un refus `not-bijective`
 * du moteur : ses `$…$` viennent de `toLatex`, jamais d'un texte saisi.
 */
function refused(message: string, formulas = false): ReciprocalOutcome {
	return { ok: false, message, ...(formulas && { formulas: true as const }) };
}

/** Le type d'un objet, dans la phrase de refus (« a est une valeur »). */
const KIND_NAMES = { value: 'une valeur', sequence: 'une suite', list: 'une liste' } as const;

/**
 * La réciproque de la fonction `base` de l'atelier, sur `on` (tapé après
 * « sur ») s'il est donné, sinon sur l'intervalle de f, sinon sur son domaine.
 *
 * ⚠️ `on` est CROISÉ avec l'ensemble de f, recalculé à chaque appel : f définie
 * sur [0 ; +∞[ n'existe pas sur ]−∞ ; 0], et une f redéfinie plus tard n'est
 * jamais écrasée par un intervalle figé (revue de #1328). Vide → refus.
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
	const own = intervalDomainOf(object);
	let domain: Domain | null = own;
	if (on !== undefined) {
		const read = readInterval(on, letter);
		if (!read.ok) return refused(read.message);
		domain = read.domain === null ? own : own === null ? read.domain : intersect(read.domain, own);
		if (domain !== null && isEmpty(domain)) {
			return refused(`${shown} n'est définie que sur ${intervalText(own!)}.`);
		}
		// Réduite à un point : le moteur y verrait une constante (revue de #1328)
		const point = domain === null ? null : singlePoint(domain);
		if (point !== null && read.domain !== null && own !== null) {
			return refused(
				`${shown} n'est définie que sur ${intervalText(own)} : sur ${intervalText(read.domain)}, il ne reste que ${toCustom(point).replace(/-/g, '−')}.`
			);
		}
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
		const formulas = refusal.kind === 'not-bijective' && refusal.message.includes('$');
		if (!withParameters) return refused(refusal.message, formulas);
		// Cas 1 de David : « pour a = 0, f est constante : pas de réciproque »
		return refused(
			refusal.kind === 'constant'
				? `Pour ${valuesText(values)}, ${name} est constante : pas de réciproque.`
				: `Pour ${valuesText(values)} : ${refusal.message}`,
			formulas
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
						? `Calculée avec ${valuesText(values)} ; la carte ${name}⁻¹ suit les curseurs.`
						: `Étapes faites avec ${valuesText(values)} ; la carte ${name}⁻¹ suit les curseurs.`
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
	// `f^-1`, `f^{-1}`, `f^(-1)`, `f⁻¹` : la réciproque de f⁻¹ est f
	const follows = typedReciprocalBase(body);
	if (follows !== null) {
		return { kind: 'refus', message: `La réciproque de ${follows}⁻¹, c'est ${follows}.` };
	}
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
	// Des lettres en plus de la variable (`.réciproque a x + b`) : le refus de
	// toute commande à paramètres, pas « la réciproque de f » qu'il n'a pas tapée
	// (mesuré le 2026-10-14). Avec une carte, `a` a déjà été remplacé.
	const parameters = letters.filter((name) => name !== letter).sort();
	if (parameters.length > 0) return { kind: 'refus', message: dependsOnMessage(parameters) };
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

/**
 * `f^-1`, `f^{-1}`, `f^(-1)`, `f⁻¹` écrits après un nom. Pas `f^-12` ; pas
 * `f(x)^-1`, qui est bien 1/f(x).
 */
const INVERSE_NOTATION =
	/(?<![A-Za-z_\\])([A-Za-z](?:_\d+)?)\s*(?:\^\s*(?:\{\s*-\s*1\s*\}|\(\s*-\s*1\s*\)|-\s*1(?![\d.,]))|⁻¹)/g;

/** `f^{-1}`, la forme rangée (`withReciprocalNotation`), suivie de son argument s'il y en a un. */
const INVERSE_CALL = /(?<![A-Za-z_\\])([A-Za-z](?:_\d+)?)\^\{-1\}(?:\(([^()]*)\))?/g;

/** La fonction dont le texte ENTIER désigne la réciproque (`f^{-1}`, `f⁻¹(x)`), ou `null`. */
export function typedReciprocalBase(text: string): string | null {
	const match = new RegExp(`^${INVERSE_NOTATION.source}\\s*(?:\\(\\s*[A-Za-z]\\s*\\))?$`).exec(
		text.trim()
	);
	return match === null ? null : match[1];
}

/** Une fonction de l'atelier, qui a donc une réciproque à calculer (`f⁻¹`). */
function isAtelierFunction(atelier: Atelier, name: string): boolean {
	return atelier.get(name)?.kind === 'function';
}

/**
 * La saisie où `f^-1`, `f^(-1)`, `f⁻¹` d'une fonction de l'atelier sont écrits
 * `f^{-1}` : la forme que les deux parseurs lisent comme la RÉCIPROQUE de f
 * (`isInverse`), développée à la volée comme `f'` (`engine.ts`, décision (1)
 * de David, 2026-10-13). Ailleurs (`x^-1`, `a^-1` avec a une valeur), rien ne
 * change : une puissance.
 */
export function withReciprocalNotation(atelier: Atelier, text: string): string {
	// Pas un nom à indice : les parseurs lisent `f_1^{-1}` comme une puissance
	// (refusé par `reciprocalRefusalIn`, revue de la PR)
	return text.replace(INVERSE_NOTATION, (whole, name: string) =>
		isAtelierFunction(atelier, name) && !name.includes('_') ? `${name}^{-1}` : whole
	);
}

/**
 * `f^-1(x) = 5x` : f⁻¹ ne se définit pas, comme `f'(x) = 3x` — sans ce refus,
 * la ligne partait en égalité à tester et répondait « false » (revue de la PR).
 */
export function reciprocalDefinitionRefusal(atelier: Atelier, input: string): string | null {
	const match = /^\s*([A-Za-z](?:_\d+)?)\^\{-1\}\s*\(\s*[A-Za-z]\s*\)\s*=/.exec(input);
	if (match === null || !isAtelierFunction(atelier, match[1])) return null;
	const base = match[1];
	return `${base}⁻¹ est la réciproque de ${base} : elle se calcule, elle ne se définit pas. Pour l'obtenir : .réciproque ${base}`;
}

/** La saisie (déjà passée par `withReciprocalNotation`) cite-t-elle une réciproque ? */
export function citesReciprocal(atelier: Atelier, text: string): boolean {
	return [...text.matchAll(INVERSE_CALL)].some(([, name]) => isAtelierFunction(atelier, name));
}

/** Les réciproques citées, avec leur argument (`null` : `f⁻¹` seule). */
function inverseCalls(
	atelier: Atelier,
	text: string
): { readonly base: string; readonly argument: string | null; readonly written: string }[] {
	return [...text.matchAll(INVERSE_CALL)]
		.filter(([, name]) => isAtelierFunction(atelier, name))
		.map(([written, base, argument]) => ({ base, argument: argument ?? null, written }));
}

/** L'ensemble de départ de f⁻¹ calculée, ou `null` (ℝ, ou un ensemble que l'atelier ne relit pas). */
function departureOf(outcome: ReciprocalOutcome): Domain | null {
	if (!outcome.ok || outcome.interval === undefined) return null;
	const read = readInterval(outcome.interval);
	return read.ok ? read.domain : null;
}

/**
 * Le refus d'une saisie qui cite `f⁻¹`, ou `null` : f sans réciproque → le
 * refus de `.réciproque f` (formules comprises) ; `f⁻¹(5)` hors de l'ensemble
 * de départ → le refus de `f(5)` hors de l'intervalle de f.
 */
export function reciprocalRefusalIn(
	atelier: Atelier,
	text: string,
	provenance: Provenance = 'text'
): { readonly message: string; readonly formulas?: true } | null {
	for (const [, name] of text.matchAll(INVERSE_NOTATION)) {
		if (!name.includes('_') || !isAtelierFunction(atelier, name)) continue;
		return {
			message: `${name}⁻¹ ne se cite pas encore dans Calcul (nom à indice) : utilise .réciproque ${name} et sa carte.`
		};
	}
	for (const { base, argument } of inverseArguments(atelier, text, provenance)) {
		const outcome = atelier.reciprocalOutcome(base);
		if (!outcome.ok) {
			return { message: outcome.message, ...(outcome.formulas && { formulas: true as const }) };
		}
		const departure = departureOf(outcome);
		if (departure === null || argument === null) continue;
		const expanded = expandCommandArgument(atelier, argument);
		const value = expanded === null ? null : approxOf(expanded);
		if (value === null || containsValue(departure, value)) continue;
		return {
			message: outsideIntervalMessage(displayName(reciprocalName(base)), argument.trim(), departure)
		};
	}
	return null;
}

/**
 * Les réciproques citées et leur argument, lus sur l'ARBRE (`isInverse`) :
 * `f⁻¹((-1))`, `f^-1 (-1)`, `f⁻¹(g(2))`, `f^{-1}\\left(-1\\right)` échappaient
 * à une regex (revue de la PR). Saisie illisible : la regex, en repli.
 */
function inverseArguments(
	atelier: Atelier,
	text: string,
	provenance: Provenance
): { readonly base: string; readonly argument: string | null }[] {
	const ast = astOf(text, provenance, atelier.functionNames);
	if (ast === null) return inverseCalls(atelier, text);
	const found: { base: string; argument: string | null }[] = [];
	visitAST(ast, {
		enterFunction: (node) => {
			if (node.isInverse !== true || !isAtelierFunction(atelier, node.name)) return;
			found.push({
				base: node.name,
				argument: node.args.length === 0 ? null : toCustom(node.args[0])
			});
		}
	});
	return found;
}

/** La valeur d'un argument sans variable (`5`, `a + 1` une fois a remplacé), ou `null`. */
function approxOf(text: string): number | null {
	const ast = astOf(text);
	if (ast === null || getVariables(ast).size > 0) return null;
	const value = approx(ast);
	return value !== null && Number.isFinite(value) ? value : null;
}

/**
 * L'ensemble sur lequel `.variations` et `.résoudre` étudient une saisie qui
 * cite `f⁻¹` : l'ensemble de départ de f⁻¹ (√(x + 2) → [0 ; +∞[), croisé avec
 * celui des autres fonctions citées (`others`, lu sur la saisie SANS `f⁻¹`,
 * où le `f` de `f⁻¹` n'a rien à faire). `f⁻¹(2x)` : refus `composed`, comme
 * `f(2x)` (lot 2 de l'intervalle).
 */
export function citedReciprocalInterval(
	atelier: Atelier,
	typed: string,
	variable: string,
	others: (typed: string) => CitedInterval | null
): CitedInterval | null {
	const calls = inverseCalls(atelier, typed);
	if (calls.length === 0) return others(typed);
	let cited = others(
		typed.replace(INVERSE_CALL, (written, name: string) =>
			isAtelierFunction(atelier, name) ? '(0)' : written
		)
	);
	if (cited?.kind === 'composed') return cited;
	const unknown = new RegExp(`(?<![A-Za-z_\\\\])${variable}(?![A-Za-z_0-9])`);
	for (const { base, argument, written } of calls) {
		const name = displayName(reciprocalName(base));
		if (argument !== null && argument.trim() !== variable && unknown.test(argument)) {
			return { kind: 'composed', call: written.replace(`${base}^{-1}`, name), name };
		}
		if (argument !== null && argument.trim() !== variable) continue;
		const departure = departureOf(atelier.reciprocalOutcome(base));
		if (departure === null) continue;
		cited =
			cited === null
				? { kind: 'restricted', domain: departure, name }
				: { ...cited, domain: intersect(cited.domain, departure) };
	}
	return cited;
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

/** Le seul point d'un ensemble réduit à `[a ; a]`, ou `null`. */
function singlePoint(domain: Domain): MathNode | null {
	if (domain.kind !== 'interval_set' || domain.intervals.length !== 1) return null;
	const { lower, upper } = domain.intervals[0];
	if (lower.type !== 'closed' || upper.type !== 'closed') return null;
	const a = approx(lower.value);
	const b = approx(upper.value);
	return a !== null && b !== null && Math.abs(a - b) < 1e-12 ? lower.value : null;
}
