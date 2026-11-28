/**
 * Bloc ```yohaku — moteur
 * =======================
 *
 * Lecture d'une case (syntaxe maison, comme les formules d'un modèle) et calcul des totals
 * d'une ligne ou d'une colonne : somme ou produit développé réduit (`expandedForm`, le moteur
 * de `.développer`).
 *
 * @module ubumark/utils/yohaku-moteur
 */

import { parseCustomSafe } from '#lib/mathAST/parser/custom/index.ts';
import { toCustom } from '#lib/mathAST/custom-generator.ts';
import { toLatex } from '#lib/mathAST/latex-generator.ts';
import { expandedForm } from '#lib/mathAST/pedagogical-simplify/expand.ts';
import { add, multiply } from '#lib/mathAST/factory.ts';
import type { MathNode } from '#lib/mathAST/types.ts';
import { cleanCoefficientsAst } from '#lib/questions/clean-coefficients.ts';
import type { YohakuOperation } from '../types/yohaku';

/** Une case lue : sa formule nettoyée (`1x+-3` → `x - 3`) ; null si illisible */
export function lireCase(texte: string): { node: MathNode; source: string; latex: string } | null {
	const lu = parseCustomSafe(texte.trim());
	if (!lu.ast || lu.errors.length > 0) return null;
	const node = cleanCoefficientsAst(lu.ast);
	return { node, source: toCustom(node), latex: toLatex(node) };
}

/** Le total de deux cases : leur somme ou leur produit, développé et réduit, en LaTeX */
export function total(operation: YohakuOperation, a: MathNode, b: MathNode): string {
	const brut = operation === 'somme' ? add(a, b) : multiply(a, b, 'implicit');
	return toLatex(expandedForm(brut));
}

/** Le calcul d'un total, en LaTeX, pour le juge : `\left(a\right)\left(b\right)` */
export function calculLatex(operation: YohakuOperation, a: string, b: string): string {
	const pa = `\\left(${a}\\right)`;
	const pb = `\\left(${b}\\right)`;
	return operation === 'somme' ? `${pa}+${pb}` : `${pa}${pb}`;
}
