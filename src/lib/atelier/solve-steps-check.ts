/**
 * Atelier — le garde-fou des étapes de résolution
 *
 * La conclusion des étapes est vérifiée AVANT d'être montrée. Mesuré le
 * 2026-10-08 : `(2x-4)=0` concluait `x = 0` (le moteur : x = 2). Le défaut est
 * corrigé à sa cause (`pedagogical-solve`, `prepareLinearRelation`), mais un
 * générateur d'étapes qui conclut faux le fait EN SILENCE : un affichage faux
 * est pire que pas d'étapes. Ce module refuse toute conclusion que les nombres
 * démentent ; `solveSteps` se replie alors sur la réponse du moteur.
 *
 * @module atelier/solve-steps-check
 */

import type { EquationStep } from '$lib/mathAST/pedagogical-solve';
import type { MathNode, RelationNode } from '$lib/mathAST/types';
import { solve } from '$lib/mathAST/solve';
import { solveInequality } from '$lib/mathAST/solve/inequality';
import { containsValue } from '$lib/mathAST/domain/algebra';
import { compile } from '$lib/mathAST/eval/compile';

// =============================================================================
// Constantes
// =============================================================================

/** Tolérance relative des comparaisons numériques. */
const EPS = 1e-7;

/** Les conclusions d'inéquation qui lisent le domaine de `solveInequality`. */
const DOMAIN_CONCLUSIONS: ReadonlySet<string> = new Set([
	'inequality-conclude-quadratic',
	'inequality-conclude-rational',
	'inequality-conclude-from-isolated-square'
]);

// =============================================================================
// Évaluation numérique
// =============================================================================

function evalAt(node: MathNode, variable: string, value: number): number {
	try {
		return compile(node)({ [variable]: value });
	} catch {
		return NaN;
	}
}

/** La relation est-elle vraie en `value` ? `null` hors domaine de définition. */
function holdsAt(rel: RelationNode, variable: string, value: number): boolean | null {
	const left = evalAt(rel.left, variable, value);
	const right = evalAt(rel.right, variable, value);
	if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
	const diff = left - right;
	const tolerance = EPS * Math.max(1, Math.abs(left), Math.abs(right));
	switch (rel.relation) {
		case '=':
			return Math.abs(diff) <= tolerance;
		case '<':
			return diff < -tolerance;
		case '>':
			return diff > tolerance;
		case '<=':
			return diff <= tolerance;
		case '>=':
			return diff >= -tolerance;
		default:
			return null;
	}
}

/** Deux ensembles finis de réels sont-ils égaux, à la tolérance près ? */
function sameSet(a: readonly number[], b: readonly number[]): boolean {
	const near = (u: number, v: number) => Math.abs(u - v) <= EPS * Math.max(1, Math.abs(u));
	return a.every((u) => b.some((v) => near(u, v))) && b.every((v) => a.some((u) => near(u, v)));
}

// =============================================================================
// Équations
// =============================================================================

/** Les solutions que la dernière étape annonce, ou `null` si elle ne conclut pas. */
function concludedSolutions(last: EquationStep): readonly MathNode[] | null {
	const op = last.operation;
	if (op?.kind === 'read-solution') return [op.value];
	if (op?.kind === 'read-solutions') return op.solutions;
	if (op?.kind === 'no-real-solution') return [];
	return null;
}

/** L'ensemble des solutions réelles selon le moteur, ou `null` s'il n'est pas fini. */
function engineSolutions(equation: RelationNode, variable: string): readonly number[] | null {
	try {
		const result = solve(equation, { variable });
		if (result.status === 'no-solution' || result.status === 'no-real-solution') return [];
		if (result.status !== 'unique' && result.status !== 'multiple') return null;
		return result.solutions.map((s) => s.approximate ?? evalAt(s.value, variable, 0));
	} catch {
		return null;
	}
}

function equationAgrees(equation: RelationNode, variable: string, last: EquationStep): boolean {
	const concluded = concludedSolutions(last);
	if (concluded === null) return false;
	const values = concluded.map((node) => evalAt(node, variable, 0));
	// Chaque solution annoncée vérifie l'équation…
	if (!values.every((v) => holdsAt(equation, variable, v) === true)) return false;
	// … et aucune ne manque : l'ensemble est celui du moteur.
	const engine = engineSolutions(equation, variable);
	return engine !== null && sameSet(values, engine);
}

// =============================================================================
// Inéquations
// =============================================================================

/** Les points où comparer : une grille, plus les bornes et leurs voisins immédiats. */
function samplePoints(bounds: readonly number[]): number[] {
	const points: number[] = [];
	for (let x = -20; x <= 20; x += 0.37) points.push(x);
	for (const b of [...bounds, -2, -1, 0, 1, 2]) points.push(b, b - 1e-3, b + 1e-3);
	return points;
}

function inequalityAgrees(inequality: RelationNode, variable: string, last: EquationStep): boolean {
	let member: (x: number) => boolean | null;
	let bounds: number[] = [];
	const final = last.after;
	if (final.left.type === 'variable' && final.left.name === variable) {
		// Premier degré : la conclusion est la forme résolue `x < c`
		member = (x) => holdsAt(final, variable, x);
		const c = evalAt(final.right, variable, 0);
		if (Number.isFinite(c)) bounds = [c];
	} else if (DOMAIN_CONCLUSIONS.has(last.rule)) {
		// Second degré, rationnelle : la conclusion lit `solveInequality`
		try {
			const domain = solveInequality(inequality).solution;
			member = (x) => containsValue(domain, x);
		} catch {
			return false;
		}
	} else {
		return false;
	}
	return samplePoints(bounds).every((x) => {
		const truth = holdsAt(inequality, variable, x);
		return truth === null || member(x) === truth;
	});
}

// =============================================================================
// Point d'entrée
// =============================================================================

/**
 * La dernière étape conclut-elle ce que les nombres confirment ?
 *
 * - **Équation** : chaque solution annoncée vérifie l'équation par
 *   substitution, ET l'ensemble annoncé est celui du moteur (`solve`) — une
 *   racine oubliée est un désaccord.
 * - **Inéquation** : sur une grille (bornes et voisins compris), la conclusion
 *   est vraie exactement là où l'inéquation l'est.
 *
 * Tout cas non vérifiable (moteur en échec, conclusion illisible) rend
 * `false` : dans le doute, pas d'étapes.
 */
export function conclusionAgrees(
	relation: RelationNode,
	variable: string,
	last: EquationStep
): boolean {
	return relation.relation === '='
		? equationAgrees(relation, variable, last)
		: inequalityAgrees(relation, variable, last);
}
