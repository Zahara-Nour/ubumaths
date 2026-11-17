/**
 * Atelier — un angle mesuré, réduit en NOMBRE de radians dans un sin, cos, tan
 * (géométrie, lot 2, revue de la PR 2).
 *
 * Le moteur n'évalue pas `cos` d'une GRANDEUR dans le corps d'une fonction :
 * `g(x) = cos(R)·x` avec `R = 90 °` rendait `cos((π/2)[rad])` non calculé, et
 * `.variations g` annonçait « décroissante ». Dans l'arbre que reçoit le moteur,
 * l'unité d'un angle pris par un sin, un cos, une tan est retirée : `90 °` devient
 * `π/2`, `(π/2) rad` devient `π/2` — exact.
 *
 * Deux entrées : l'arbre SUBSTITUÉ d'un objet de l'atelier (`engine.substitutedTree`,
 * angle mesuré ou écrit à la main : `h(x) = cos(90°)·x`), et l'argument d'une
 * commande, qui va au moteur en texte (`radiansInText` : `.résoudre h(x)=1`,
 * `.évaluer cos(60°)*x en x=2` — PR « 60° », 2026-10-19). Une variable en degrés
 * (`cos(x°)`) devient `cos(πx/180)`, exact : le Graphe trace cet arbre.
 *
 * @module atelier/angle-radians
 */

import type { MathNode } from '$lib/mathAST/types';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { withRadiansInTrigonometry } from '$lib/mathAST/cli/core/angle-radians';
import { astOf } from './parse';

// La réduction sur l'arbre vit dans le registre depuis le 2026-11-03 (`registre-reference`)
export { radiansInTrigonometry } from '$lib/mathAST/cli/core/angle-radians';

/** Une unité d'angle écrite : `[°]`, `[rad]`, `\unit{°}`. */
const ANGLE_UNIT_WRITTEN = /\[(?:°|rad)\]|\\unit\s*\{(?:°|rad)\}/;

/**
 * Le même passage sur l'argument d'une commande, qui va au moteur en TEXTE
 * (`.évaluer cos(60°)*x en x=2`, `.résoudre h(x)=1` avec h(x) = cos(60°)·x) :
 * le moteur ne calcule pas le cosinus d'une grandeur (`2cos((π/3)[rad])`).
 * Le texte tel quel s'il n'a pas d'angle dans un sin, cos, tan.
 */
export function radiansInText(text: string, functionNames?: readonly string[]): string {
	if (!ANGLE_UNIT_WRITTEN.test(text)) return text;
	const ast = astOf(text, 'url', functionNames);
	if (ast === null) return text;
	const result = withRadiansInTrigonometry(ast);
	return result.changed ? toCustom(result.ast) : text;
}

/**
 * Le même passage sur le LaTeX d'une RÉPONSE du moteur : `.évaluer sin(x) en
 * x=30°` rend `\sin\left( \dfrac{\pi}{6}~\unit{rad} \right)` (revue). Le
 * LaTeX et le texte recalculés, ou `null` s'il n'y a rien à changer.
 */
export function radiansInLatex(
	latex: string
): { readonly latex: string; readonly text: string; readonly ast: MathNode } | null {
	if (!ANGLE_UNIT_WRITTEN.test(latex)) return null;
	const ast = parseLatexSafe(latex).ast;
	if (ast === null || ast === undefined) return null;
	const result = withRadiansInTrigonometry(ast);
	return result.changed
		? { latex: toLatex(result.ast), text: toCustom(result.ast), ast: result.ast }
		: null;
}
