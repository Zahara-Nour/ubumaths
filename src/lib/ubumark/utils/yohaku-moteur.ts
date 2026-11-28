/**
 * Bloc ```yohaku — moteur
 * =======================
 *
 * Lecture d'une case (syntaxe maison pour l'auteur, comme les formules d'un modèle ; LaTeX
 * MathLive pour l'élève) et calcul des totaux d'une ligne ou d'une colonne : somme ou produit
 * développé réduit (`expandedForm`, le moteur de `.développer`).
 *
 * Le calcul d'un total jugé est construit en ARBRE (`add` / `multiply`) puis écrit : une case
 * d'élève n'est jamais collée telle quelle dans un texte LaTeX (une `\right)` glissée dans une
 * case ouvrait la parenthèse suivante, revue du 2026-11-28).
 *
 * @module ubumark/utils/yohaku-moteur
 */

import { parseCustomSafe } from '#lib/mathAST/parser/custom/index.ts';
import { parseLatexSafe } from '#lib/mathAST/parser/index.ts';
import { toCustom } from '#lib/mathAST/custom-generator.ts';
import { toLatex } from '#lib/mathAST/latex-generator.ts';
import { expandedForm } from '#lib/mathAST/pedagogical-simplify/expand.ts';
import { add, multiply } from '#lib/mathAST/factory.ts';
import { isRelation } from '#lib/mathAST/guards.ts';
import type { MathNode } from '#lib/mathAST/types.ts';
import { cleanCoefficientsAst } from '#lib/questions/clean-coefficients.ts';
import type { YohakuOperation } from '../types/yohaku';

// ============================================================================
// TYPES
// ============================================================================

export interface CaseLue {
	node: MathNode;
	/** Syntaxe maison nettoyée (`x - 3`) */
	source: string;
	/** LaTeX, virgule décimale (`2{,}5`) */
	latex: string;
}

/** Pourquoi une case ne se lit pas */
export type CaseRefusee = 'illisible' | 'relation';

// ============================================================================
// ÉCRITURE
// ============================================================================

/** Virgule décimale française dans un LaTeX écrit par mathAST (`5.5` → `5{,}5`) */
export function virguleDecimale(latex: string): string {
	return latex.replace(/(\d)\.(\d)/g, '$1{,}$2');
}

const ecrire = (node: MathNode): CaseLue => ({
	node,
	source: toCustom(node),
	latex: virguleDecimale(toLatex(node))
});

// ============================================================================
// LECTURE
// ============================================================================

/**
 * Une case de l'auteur (syntaxe maison), nettoyée (`1x+-3` → `x - 3`). La virgule décimale
 * est acceptée (`2,5`). Une relation (`x = 2`) n'est pas une case.
 */
export function lireCase(texte: string): CaseLue | CaseRefusee {
	const lu = parseCustomSafe(texte.trim().replace(/(\d),(\d)/g, '$1.$2'));
	if (!lu.ast || lu.errors.length > 0) return 'illisible';
	if (isRelation(lu.ast)) return 'relation';
	return ecrire(cleanCoefficientsAst(lu.ast));
}

/** Une case de l'élève (LaTeX de MathLive) ; null si elle est vide, illisible ou une relation */
export function lireCaseEleve(latex: string): MathNode | null {
	if (latex.trim() === '') return null;
	const lu = parseLatexSafe(latex);
	if (!lu.ast || lu.errors.length > 0 || isRelation(lu.ast)) return null;
	return lu.ast;
}

// ============================================================================
// TOTAUX
// ============================================================================

/** Le calcul d'un total, en arbre : `a + b` ou `a × b` */
export function calcul(operation: YohakuOperation, a: MathNode, b: MathNode): MathNode {
	return operation === 'somme' ? add(a, b) : multiply(a, b, 'implicit');
}

/** Le total de deux cases : leur somme ou leur produit, développé et réduit */
export function total(operation: YohakuOperation, a: MathNode, b: MathNode): CaseLue {
	return ecrire(expandedForm(calcul(operation, a, b)));
}

/** Le calcul d'un total, en LaTeX écrit depuis l'arbre, pour le juge */
export function calculLatex(operation: YohakuOperation, a: MathNode, b: MathNode): string {
	return toLatex(calcul(operation, a, b));
}
