/**
 * Notation combinatoire non calculée (`\binom{32}{5}`, `6!`, `\frac{10!}{7!}`)
 *
 * Option de case `acceptCombinatorialNotation` (2026-10-05) : au bac, en
 * dénombrement, `\binom{32}{5}` est une réponse acceptée. Sans l'option, ces
 * écritures sont jugées comme `10\times9\times8` (calcul non effectué).
 *
 * Une écriture est « combinatoire » si elle ne contient que des nombres, des
 * opérations (+ − × ÷, fraction, puissance, parenthèses) et AU MOINS une
 * factorielle ou un coefficient binomial. La VALEUR est jugée ailleurs, avant.
 *
 * @module questions/combinatorial-notation
 */

import { parseLatexSafe } from '$lib/mathAST/parser';
import { findNodes } from '$lib/mathAST/transforms';
import { isFunction } from '$lib/mathAST/guards';
import type { MathNode } from '$lib/mathAST/types';

/** Fonctions de la notation : `n!` et `\binom{n}{k}` (cf. parser/factorial-notation) */
const COMBINATORIAL_FUNCTIONS: ReadonlySet<string> = new Set(['factorial', 'binom']);

/** Nœuds admis autour : nombres et opérations arithmétiques */
const ARITHMETIC_NODE_TYPES: ReadonlySet<MathNode['type']> = new Set<MathNode['type']>([
	'number',
	'addition',
	'subtraction',
	'multiplication',
	'division',
	'opposite',
	'positive',
	'delimiter',
	'superscript'
]);

function isCombinatorialFunction(node: MathNode): boolean {
	return isFunction(node) && COMBINATORIAL_FUNCTIONS.has(node.name);
}

/** `\binom{32}{5}`, `6!`, `\frac{30!}{3!27!}`… : vrai ; `720`, `10\times9\times8`, `n!` : faux */
export function isCombinatorialNotationLatex(latex: string): boolean {
	const parsed = parseLatexSafe(latex.trim());
	if (!parsed.ast || parsed.errors.length > 0) return false;
	const root = parsed.ast;
	if (findNodes(root, isCombinatorialFunction).length === 0) return false;
	const foreign = findNodes(
		root,
		(node) => !isCombinatorialFunction(node) && !ARITHMETIC_NODE_TYPES.has(node.type)
	);
	return foreign.length === 0;
}
