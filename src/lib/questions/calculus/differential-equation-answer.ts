/**
 * Réponse « solution-ed » : une solution d'équation différentielle dans UNE case
 * ===========================================================================
 *
 * Case marquée `answerKind: 'solution-ed'`, champs `equation` (1er ordre, en
 * `y'`, `y` et `x`), `solutionMode`, `variable` (défaut `x`), `function`
 * (défaut `y`), `initial` (facultatif, mode `une`). Spécification validée par
 * David le 2026-10-04 :
 *
 * - verdict par SUBSTITUTION : y ← réponse, y' ← sa dérivée (mathAST
 *   `differentiate`) ; les deux membres doivent être équivalents
 *   (`areEquivalent`), identité en x — jamais une comparaison au texte attendu ;
 * - une lettre libre ≠ variable (`C`, `K`, `\lambda`…) est une constante : la
 *   réponse doit être solution pour TROIS valeurs de chaque constante ;
 * - mode `generale` : la réponse doit en plus dépendre d'une constante (les
 *   trois valeurs donnent trois fonctions distinctes) ; une solution sans
 *   constante est fausse, avec un message ;
 * - mode `une` (défaut) : toute solution est juste ; condition initiale
 *   `y(0)=4` facultative, que la réponse doit vérifier ;
 * - rien d'écrit → `empty` ; illisible → `incorrect`, jamais d'exception.
 *
 * @module questions/calculus/differential-equation-answer
 */

import type { MathNode } from '$lib/mathAST/types';
import type { CalculusBlankFields, SolutionMode } from '$lib/questions/types';
import { getVariables, substitute } from '$lib/mathAST/eval/substitute';
import {
	type CalculusVerdict,
	type ExpectedCheck,
	DEFAULT_VARIABLE,
	constantNames,
	derivative,
	equivalent,
	nearlyEqual,
	numericValue,
	readExpression
} from './calculus-reading';

// Types
type SolutionSpec = Pick<
	CalculusBlankFields,
	'equation' | 'solutionMode' | 'variable' | 'function' | 'initial'
>;

/** Équation lue : ses deux membres, où `derivativeName` tient lieu de y' */
interface ReadEquation {
	left: MathNode;
	right: MathNode;
	derivativeName: string;
}

/** Condition initiale lue : y(x0) = y0 */
interface InitialCondition {
	at: MathNode;
	value: MathNode;
}

type ReadSpec =
	| {
			ok: true;
			variable: string;
			functionName: string;
			mode: SolutionMode;
			initial: InitialCondition | null;
	  }
	| { ok: false; error: string };

// Constantes

/** Messages figés (français, tutoiement) */
export const DIFFERENTIAL_EQUATION_FEEDBACK = {
	particular: "C'est une solution particulière : il manque la constante."
} as const;

/** Fonction inconnue par défaut */
const DEFAULT_FUNCTION = 'y';

/** Valeurs données aux constantes (trois, ni 0 ni 1 seuls) */
const CONSTANT_TRIAL_VALUES = [2, -1, 3];

/** Lettres candidates pour tenir lieu de y' (une lettre absente de tout le reste) */
const DERIVATIVE_PLACEHOLDERS = ['Z', 'W', 'Q', 'V', 'U', 'R', 'S'];

/** Lettres que l'équation peut contenir en plus de y, y' et x */
const EQUATION_CONSTANTS = new Set(['e', 'pi']);

// Functions

/** Échappe une lettre pour une expression régulière (lettre seule : rien à faire) */
function letter(name: string): string {
	return name.replace(/[^A-Za-z]/g, '');
}

/** Une lettre absente de tous les textes, `null` si aucune */
function freePlaceholder(texts: readonly string[]): string | null {
	return DERIVATIVE_PLACEHOLDERS.find((name) => texts.every((t) => !t.includes(name))) ?? null;
}

/**
 * Équation écrite par l'auteur : `y'` (ou `y'(x)`, `y^{\prime}`) remplacée par
 * une lettre neutre, `y(x)` par `y`. `null` si illisible, sans `y'`, du 2d
 * ordre ou contenant une lettre inconnue.
 */
function readEquation(
	equation: string,
	variable: string,
	functionName: string,
	avoid: readonly string[]
): ReadEquation | null {
	const derivativeName = freePlaceholder([equation, ...avoid]);
	if (!derivativeName) return null;
	const y = letter(functionName);
	const x = letter(variable);
	const derivativeRegex = new RegExp(
		`${y}\\s*(?:'|\\^\\{?\\\\prime\\}?)(?:\\s*\\(\\s*${x}\\s*\\))?`,
		'g'
	);
	const text = equation
		.replace(derivativeRegex, ` ${derivativeName} `)
		.replace(new RegExp(`${y}\\s*\\(\\s*${x}\\s*\\)`, 'g'), y);
	// 2d ordre (`y''` laisse une apostrophe) ou autre écriture inconnue
	if (/'|\\prime/.test(text)) return null;
	const sides = text.split('=');
	if (sides.length !== 2) return null;
	const left = readExpression(sides[0]);
	const right = readExpression(sides[1]);
	if (!left || !right) return null;
	const names = new Set([...getVariables(left), ...getVariables(right)]);
	if (!names.has(derivativeName)) return null;
	const allowed = new Set([derivativeName, y, x, ...EQUATION_CONSTANTS]);
	if ([...names].some((name) => !allowed.has(name))) return null;
	return { left, right, derivativeName };
}

/** `y(0)=4` → { at: 0, value: 4 } ; `null` si illisible */
function readInitial(initial: string, functionName: string): InitialCondition | null {
	const match = new RegExp(`^\\s*${letter(functionName)}\\s*\\((.+?)\\)\\s*=(.+)$`).exec(initial);
	if (!match) return null;
	const at = readExpression(match[1]);
	const value = readExpression(match[2]);
	if (!at || !value || getVariables(at).size > 0 || getVariables(value).size > 0) return null;
	return { at, value };
}

function readSpec(spec: SolutionSpec): ReadSpec {
	if (!spec.equation?.trim()) return { ok: false, error: 'équation absente' };
	const variable = spec.variable ?? DEFAULT_VARIABLE;
	const functionName = spec.function ?? DEFAULT_FUNCTION;
	if (!readEquation(spec.equation, variable, functionName, [])) {
		return {
			ok: false,
			error: `équation illisible ou qui n'est pas du 1er ordre « ${spec.equation} »`
		};
	}
	const mode = spec.solutionMode ?? 'une';
	if (!spec.initial?.trim()) return { ok: true, variable, functionName, mode, initial: null };
	if (mode === 'generale') {
		return { ok: false, error: 'condition initiale en mode « generale » (mode « une » seulement)' };
	}
	const initial = readInitial(spec.initial, functionName);
	if (!initial) return { ok: false, error: `condition initiale illisible « ${spec.initial} »` };
	return { ok: true, variable, functionName, mode, initial };
}

/** Valeur numérique d'une expression constante */
function constantValue(node: MathNode): number | null {
	return numericValue(node, {});
}

/** `candidate` (sans constante libre) vérifie l'équation, et la condition initiale */
function isSolution(
	candidate: MathNode,
	equation: ReadEquation,
	read: Extract<ReadSpec, { ok: true }>
): boolean {
	const candidateDerivative = derivative(candidate, read.variable);
	if (!candidateDerivative) return false;
	const bindings = {
		[read.functionName]: candidate,
		[equation.derivativeName]: candidateDerivative
	};
	const left = substitute(equation.left, bindings, { maxIterations: 1 });
	const right = substitute(equation.right, bindings, { maxIterations: 1 });
	if (!equivalent(left, right)) return false;
	if (!read.initial) return true;
	const at = constantValue(read.initial.at);
	const expected = constantValue(read.initial.value);
	if (at === null || expected === null) return false;
	const value = numericValue(candidate, { [read.variable]: at });
	return value !== null && nearlyEqual(value, expected);
}

/** La réponse avec chaque constante remplacée par chacune des valeurs d'essai */
function instances(answer: MathNode, constants: readonly string[]): MathNode[] {
	if (constants.length === 0) return [answer];
	return CONSTANT_TRIAL_VALUES.map((value) =>
		substitute(answer, Object.fromEntries(constants.map((name) => [name, value])), {
			maxIterations: 1
		})
	);
}

/** Les fonctions obtenues sont deux à deux distinctes : la constante compte */
function dependsOnConstant(candidates: readonly MathNode[]): boolean {
	if (candidates.length < 2) return false;
	for (let i = 0; i < candidates.length; i++) {
		for (let j = i + 1; j < candidates.length; j++) {
			if (equivalent(candidates[i], candidates[j])) return false;
		}
	}
	return true;
}

function judge(
	answer: string,
	spec: SolutionSpec,
	read: Extract<ReadSpec, { ok: true }>
): CalculusVerdict {
	const node = readExpression(answer);
	if (!node) return { status: 'incorrect' };
	// La fonction inconnue elle-même dans la réponse : pas une expression de x
	if (getVariables(node).has(read.functionName)) return { status: 'incorrect' };
	const equation = readEquation(spec.equation ?? '', read.variable, read.functionName, [answer]);
	if (!equation) return { status: 'incorrect' };

	const candidates = instances(node, constantNames(node, read.variable));
	if (!candidates.every((candidate) => isSolution(candidate, equation, read))) {
		return { status: 'incorrect' };
	}
	if (read.mode === 'generale' && !dependsOnConstant(candidates)) {
		return { status: 'incorrect', feedback: DIFFERENTIAL_EQUATION_FEEDBACK.particular };
	}
	return { status: 'correct' };
}

/**
 * Verdict d'une case « solution-ed ».
 *
 * @param answer - réponse de l'élève (LaTeX de MathLive)
 * @param spec - champs de la case : `equation`, `solutionMode`, `variable`, `function`, `initial`
 */
export function judgeDifferentialEquationAnswer(
	answer: string,
	spec: SolutionSpec
): CalculusVerdict {
	if (!answer.trim()) return { status: 'empty' };
	const read = readSpec(spec);
	return read.ok ? judge(answer, spec, read) : { status: 'incorrect' };
}

/**
 * Réponse attendue écrite par l'auteur : une solution (générale en mode
 * `generale`) de l'équation. Sert aux specs de test (une attendue fausse est
 * une erreur du MODÈLE, pas de l'élève).
 */
export function readExpectedSolution(expected: string, spec: SolutionSpec): ExpectedCheck {
	const read = readSpec(spec);
	if (!read.ok) return read;
	if (!readExpression(expected)) return { ok: false, error: 'réponse attendue illisible' };
	const verdict = judge(expected, spec, read);
	if (verdict.status === 'correct') return { ok: true };
	return {
		ok: false,
		error: verdict.feedback
			? `solution sans constante en mode « generale » de ${spec.equation}`
			: `ce n'est pas une solution de ${spec.equation}`
	};
}
