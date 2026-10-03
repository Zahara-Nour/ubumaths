/**
 * Condition Evaluator for Generation Guards
 * ==========================================
 *
 * Evaluates boolean conditions against resolved variable values.
 * Used to validate that randomly generated variables satisfy constraints
 * (e.g., 'a*b!=0', 'gcd(a+b,c)=1', 'abs(a) != abs(b)').
 *
 * Pipeline: condition string → parseCustom() → substitute variables → evaluate → boolean
 *
 * Note: We use decimal evaluation on both sides of relations because the default
 * exact mode's areEquivalent() doesn't evaluate function calls (like gcd) before
 * comparing. For generation guards with integer values, decimal mode is sufficient.
 *
 * @module questions/generator/condition-evaluator
 */

import type { ResolvedVariable } from '$lib/ubumark/types/parameterization';
import type { EvalBindings } from '$lib/mathAST/eval/types';
import type { MathNode } from '$lib/mathAST/types';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { substitute } from '$lib/mathAST/eval/substitute';
import { evaluate, evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval/evaluate';
import { isEvalValue } from '$lib/mathAST/eval/types';
import { isRelation, isLogical, isLogicalNot, isBoolean, isDelimiter } from '$lib/mathAST/guards';
import { BARE_PI, braceWrap } from '$lib/ubumark/parameterization/resolver/variable-resolver';

/**
 * Build EvalBindings from resolved variables.
 *
 * Converts ResolvedVariable[] (name/value pairs where value is a string)
 * to the EvalBindings format expected by mathAST's substitute function.
 */
function buildBindings(resolvedVariables: ResolvedVariable[]): EvalBindings {
	const bindings: Record<string, number | string> = {};
	for (const v of resolvedVariables) {
		// Try parsing as a number first for efficiency
		const num = Number(v.value);
		if (!isNaN(num) && isFinite(num)) {
			bindings[v.name] = num;
		} else {
			// Keep as string — substitute will parse it as LaTeX/expression
			bindings[v.name] = v.value;
		}
	}
	return bindings;
}

/**
 * Remplace les noms de variables de plusieurs caractères (`u1`, `q2`, `ab`) par leur valeur
 * avant l'analyse, comme le fait `{{eval:…}}` : parseCustom lirait `u1` comme `u` suivi
 * d'un `1` isolé (erreur), et `ab` comme `a×b`. Un seul passage, noms longs d'abord : une
 * valeur substituée n'est jamais relue. Les lettres seules restent liées par `substitute`.
 */
function substituteLongNames(condition: string, resolvedVariables: ResolvedVariable[]): string {
	const longNames = resolvedVariables
		.map((v) => v.name)
		.filter((name) => name.length > 1)
		.sort((a, b) => b.length - a.length);
	if (longNames.length === 0) return condition;
	const values = new Map(resolvedVariables.map((v) => [v.name, v.value]));
	const regex = new RegExp(`\\b(?:${longNames.join('|')})\\b`, 'g');
	return condition.replace(regex, (name) => braceWrap(values.get(name) ?? name));
}

/**
 * Erreur d'une condition ILLISIBLE (faute de l'auteur) : elle remonte au lieu d'être
 * lue comme « faux », sinon le tirage épuise ses 100 essais sans dire pourquoi.
 */
export class ConditionSyntaxError extends Error {}

/**
 * Ramène les opérateurs qu'un auteur écrit naturellement (à la manière d'un langage de
 * programmation) à la notation du parseur : `==`, `===` → `=` ; `!==`, `<>`, `≠` → `!=`.
 * `<=`, `>=` et `!=` ne sont pas touchés. Sans cela, `gcd(c,d) == 1` était une erreur de
 * syntaxe, avalée en « faux » : la condition n'était jamais satisfaite. `a<-1` = `a < -1`
 * (sans cela, « Unexpected token: <- » : il fallait écrire `a< -1`).
 */
function normalizeConditionOperators(condition: string): string {
	return (
		condition
			.replace(/!==(?!=)/g, '!=')
			.replace(/(?<![<>!=])={2,3}(?!=)/g, '=')
			.replace(/<>/g, '!=')
			.replace(/≠/g, '!=')
			// `a<-1` : « < » puis un nombre négatif, pas la flèche `<-` du parseur (affectation)
			.replace(/<-/g, '< -')
	);
}

/** Mots logiques écrits à la manière de Python (`and`, `or`, `not`), en minuscules ou en majuscules */
const AND_WORD = /\b(?:and|AND)\b/g;
const OR_WORD = /\b(?:or|OR)\b/g;
const NOT_WORD = /\b(?:not|NOT)\b/g;

/**
 * Fin de l'opérande qui commence en `start` : on avance jusqu'au premier `&&`, `||`, `,`
 * ou fermant non apparié, hors parenthèses et accolades.
 */
function operandEnd(text: string, start: number): number {
	let depth = 0;
	for (let k = start; k < text.length; k++) {
		const c = text[k];
		if (c === '(' || c === '{') depth++;
		else if (c === ')' || c === '}') {
			if (depth === 0) return k;
			depth--;
		} else if (depth === 0) {
			const pair = text.slice(k, k + 2);
			if (pair === '&&' || pair === '||' || c === ',') return k;
		}
	}
	return text.length;
}

/**
 * `and` → `&&`, `or` → `||`, `not X` → `!(X)`. Le `not` porte sur toute la comparaison qui
 * suit (`not a = 1` = `!(a = 1)`, comme en Python) : le `!` du parseur, lui, se colle au
 * seul opérande (`!a = 1` se lirait `(!a) = 1`). Sans cette lecture, `or` était lu comme le
 * produit o×r : la condition valait faux sans erreur, et le tirage échouait après 100 essais.
 */
function normalizeLogicalWords(condition: string): string {
	let result = condition.replace(AND_WORD, '&&').replace(OR_WORD, '||');
	// Le dernier `not` d'abord : un `not` englobant enveloppe alors un `!(…)` déjà écrit
	const nots = [...result.matchAll(NOT_WORD)].map((m) => m.index);
	for (let n = nots.length - 1; n >= 0; n--) {
		const at = nots[n];
		const end = operandEnd(result, at + 3);
		const operand = result.slice(at + 3, end).trim();
		if (operand === '') {
			throw new ConditionSyntaxError(`Condition '${condition}' : « not » sans opérande`);
		}
		result = `${result.slice(0, at)}!(${operand})${result.slice(end)}`;
	}
	return result;
}

/** Caractères qui arrêtent l'opérande gauche d'un `%` : opérateur additif, comparaison, logique */
const MODULO_LEFT_STOP = new Set(['+', '-', '=', '<', '>', '!', '&', '|', ',']);

/** Début de l'opérande gauche d'un `%` situé en `at` : le produit qui le précède (`2*a % 4`) */
function moduloLeftStart(text: string, at: number): number {
	let depth = 0;
	for (let k = at - 1; k >= 0; k--) {
		const c = text[k];
		if (c === ')' || c === '}') depth++;
		else if (c === '(' || c === '{') {
			if (depth === 0) return k + 1;
			depth--;
		} else if (depth === 0 && MODULO_LEFT_STOP.has(c)) return k + 1;
	}
	return 0;
}

/** Fin d'un groupe ouvert en `open` (parenthèse ou accolade), fermant compris */
function groupEnd(text: string, open: number): number {
	let depth = 0;
	for (let k = open; k < text.length; k++) {
		if (text[k] === '(' || text[k] === '{') depth++;
		else if (text[k] === ')' || text[k] === '}') {
			depth--;
			if (depth === 0) return k + 1;
		}
	}
	return text.length;
}

/**
 * Fin de l'opérande droit d'un `%` qui commence en `start` : un seul facteur (nombre, nom,
 * appel de fonction, groupe), éventuellement élevé à une puissance. `a % b * c` se lit
 * `mod(a, b) * c`, comme dans un langage de programmation.
 */
function moduloRightEnd(text: string, start: number): number {
	let k = start;
	while (text[k] === ' ') k++;
	if (text[k] === '-') k++;
	if (text[k] === '(' || text[k] === '{') {
		k = groupEnd(text, k);
	} else {
		while (k < text.length && /[\w.\\]/.test(text[k])) k++;
		if (text[k] === '(') k = groupEnd(text, k);
	}
	if (text[k] === '^') return moduloRightEnd(text, k + 1);
	return k;
}

/**
 * `a % 10` → `mod(a, 10)` : le reste, comme dans un langage de programmation. Le parseur lit
 * `%` comme un pourcentage (`a %` = a/100), d'où « Unexpected token » sur `a % 10 != 0`.
 * L'opérande gauche est le produit qui précède (`2*a % 4` = `mod(2*a, 4)`).
 */
function normalizeModulo(condition: string): string {
	let result = condition;
	let at = result.indexOf('%');
	while (at !== -1) {
		const leftStart = moduloLeftStart(result, at);
		const rightEnd = moduloRightEnd(result, at + 1);
		const left = result.slice(leftStart, at).trim();
		const right = result.slice(at + 1, rightEnd).trim();
		if (left === '' || right === '') {
			throw new ConditionSyntaxError(
				`Condition '${condition}' : « % » attend deux opérandes (a % 10, soit mod(a, 10))`
			);
		}
		result = `${result.slice(0, leftStart)}mod(${left}, ${right})${result.slice(rightEnd)}`;
		at = result.indexOf('%');
	}
	return result;
}

/**
 * Écriture d'auteur → notation du parseur : opérateurs (`==`, `<>`), mots logiques, `%`,
 * et `pi` = π comme dans `{{eval:…}}` (sinon `pi` se lisait p×i et `cos(pi/6) >= 0.1`
 * valait faux sans erreur).
 */
function normalizeCondition(condition: string): string {
	return normalizeModulo(
		normalizeLogicalWords(normalizeConditionOperators(condition)).replace(BARE_PI, '\\pi')
	);
}

/** Tolerance for floating-point comparisons */
const EPSILON = 1e-10;

/**
 * Evaluate a relation node by numerically evaluating both sides.
 *
 * Unlike areEquivalent() which does structural comparison, this evaluates
 * both sides to numbers and compares them. This is essential for conditions
 * involving function calls like gcd() and mod() that areEquivalent can't
 * simplify structurally.
 */
function evaluateRelationNumeric(node: MathNode): boolean | undefined {
	if (!isRelation(node)) return undefined;

	try {
		const leftVal = evaluateNodeToApproximatedNumber(node.left);
		const rightVal = evaluateNodeToApproximatedNumber(node.right);

		switch (node.relation) {
			case '=':
				return Math.abs(leftVal - rightVal) < EPSILON;
			case '!=':
				return !(Math.abs(leftVal - rightVal) < EPSILON);
			case '<':
				return leftVal < rightVal - EPSILON;
			case '>':
				return leftVal > rightVal + EPSILON;
			case '<=':
				return leftVal < rightVal + EPSILON;
			case '>=':
				return leftVal > rightVal - EPSILON;
			default:
				return undefined;
		}
	} catch {
		return undefined;
	}
}

/**
 * Evaluate a boolean expression by recursively handling logical operators
 * and using numeric comparison for relations.
 */
function evaluateBooleanNode(node: MathNode): boolean | undefined {
	if (isBoolean(node)) {
		return node.value;
	}

	// `!(a = b)` : la parenthèse enveloppe la relation, qui doit être lue telle quelle
	if (isDelimiter(node) && node.delimiters === 'parentheses') {
		return evaluateBooleanNode(node.content);
	}

	if (isRelation(node)) {
		// `!a = 1` se lit `(!a) = 1` : jamais l'intention de l'auteur, et toujours « faux »
		if (isLogicalNot(node.left) || isLogicalNot(node.right)) {
			throw new ConditionSyntaxError(
				'Négation collée à un opérande : écrire !(a = 1), ou not a = 1, au lieu de !a = 1'
			);
		}
		return evaluateRelationNumeric(node);
	}

	if (isLogical(node)) {
		const left = evaluateBooleanNode(node.left);
		// Short-circuit
		if (node.operator === 'and' && left === false) return false;
		if (node.operator === 'or' && left === true) return true;

		if (left === undefined) return undefined;
		const right = evaluateBooleanNode(node.right);
		if (right === undefined) return undefined;

		if (node.operator === 'and') return left && right;
		if (node.operator === 'or') return left || right;
		return undefined;
	}

	if (isLogicalNot(node)) {
		const operand = evaluateBooleanNode(node.operand);
		if (operand === undefined) return undefined;
		return !operand;
	}

	return undefined;
}

/**
 * Evaluate a single condition string against resolved variables.
 *
 * @param condition - Boolean expression string (e.g., 'a*b!=0')
 * @param bindings - Variable bindings for substitution
 * @returns true if condition is satisfied, false otherwise
 * @throws Error if condition cannot be parsed or evaluated
 */
function evaluateSingleCondition(condition: string, bindings: EvalBindings): boolean {
	// 1. Parse the condition string into a MathAST node
	let ast: MathNode;
	try {
		ast = parseCustom(normalizeCondition(condition));
	} catch (e) {
		throw new ConditionSyntaxError(
			`Condition '${condition}' could not be parsed: ${e instanceof Error ? e.message : String(e)}`
		);
	}

	// 2. Substitute variable values
	const substituted = substitute(ast, bindings);

	// 3. Try our custom numeric boolean evaluation first
	// This handles relations with function calls (gcd, mod, abs) correctly
	const boolResult = evaluateBooleanNode(substituted);
	if (boolResult !== undefined) {
		return boolResult;
	}

	// 4. Fall back to the general evaluate pipeline
	const result = evaluate(substituted);

	if (!isEvalValue(result)) {
		throw new Error(
			`Condition '${condition}' could not be evaluated: ${result.status === 'unevaluable' ? result.reason : 'indeterminate'}`
		);
	}

	if (typeof result.value === 'boolean') {
		return result.value;
	}

	throw new Error(
		`Condition '${condition}' did not evaluate to a boolean (got ${typeof result.value})`
	);
}

/**
 * Évalue UNE condition et laisse remonter l'erreur si elle est illisible
 * (variable absente, syntaxe non convertie). À utiliser quand un « faux »
 * silencieux serait dangereux : le bon choix d'un QCM en dépend.
 */
export function evaluateConditionStrict(
	condition: string,
	resolvedVariables: ResolvedVariable[]
): boolean {
	return evaluateSingleCondition(
		substituteLongNames(condition, resolvedVariables),
		buildBindings(resolvedVariables)
	);
}

/**
 * Evaluate all conditions against resolved variables.
 *
 * All conditions must be true (implicit AND between conditions).
 *
 * @param conditions - Array of condition strings
 * @param resolvedVariables - Resolved variable values to substitute
 * @returns true if ALL conditions are satisfied, false if any fails
 * @throws ConditionSyntaxError si une condition est illisible (faute de l'auteur) ;
 *   une condition lisible mais non évaluable pour ce tirage (division par zéro…)
 *   reste « fausse » : le tirage est rejeté et recommencé.
 */
export function evaluateConditions(
	conditions: string[],
	resolvedVariables: ResolvedVariable[]
): boolean {
	if (conditions.length === 0) return true;

	const bindings = buildBindings(resolvedVariables);

	for (const condition of conditions) {
		try {
			if (!evaluateSingleCondition(substituteLongNames(condition, resolvedVariables), bindings)) {
				return false;
			}
		} catch (e) {
			if (e instanceof ConditionSyntaxError) throw e;
			// Non évaluable pour CE tirage : rejeté, un nouveau tirage est tenté
			return false;
		}
	}

	return true;
}
