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
import { isUnit } from '$lib/mathAST/guards';
import { format as formatUnit } from '$lib/mathAST/units';
import {
	divide,
	multiply,
	number as mathNumber,
	parentheses,
	piConstant
} from '$lib/mathAST/factory';
import { transformAST } from '$lib/mathAST/visitor';
import { simplifyExact } from '$lib/geometry-core/compute/geo-arithmetic';
import { toCustom } from '$lib/mathAST/custom-generator';
import { toLatex } from '$lib/mathAST/latex-generator';
import { parseLatexSafe } from '$lib/mathAST/parser';
import { astOf } from './parse';

/** Les fonctions qui prennent un angle et rendent un nombre. */
const TRIGONOMETRIC = new Set(['sin', 'cos', 'tan']);

/** Une grandeur d'angle en nombre de radians, ou `null` si ce n'en est pas une. */
function radiansOf(node: MathNode): MathNode | null {
	if (!isUnit(node)) return null;
	const symbol = formatUnit(node.unit, 'original');
	if (symbol === 'rad') return simplifyExact(node.expression);
	if (symbol === '°') {
		return simplifyExact(
			divide(multiply(node.expression, piConstant(), 'implicit'), mathNumber('180'), 'fraction')
		);
	}
	return null;
}

/** Retirer l'unité des angles DANS un sin, cos, tan : `cos(90 °)` → `cos(π/2)`. */
export function radiansInTrigonometry(ast: MathNode): MathNode {
	return converted(ast).ast;
}

/** `radiansInTrigonometry`, et si quelque chose a changé. */
function converted(ast: MathNode): { readonly ast: MathNode; readonly changed: boolean } {
	let changedSomewhere = false;
	const result = transformAST(ast, {
		enterFunction: (node) => {
			if (!TRIGONOMETRIC.has(node.name)) return undefined;
			let changed = false;
			const args = node.args.map((arg) =>
				transformAST(arg, {
					enterUnit: (unit) => {
						const radians = radiansOf(unit);
						if (radians === null) return undefined;
						changed = true;
						return { node: parentheses(radians), skip: true };
					}
				})
			);
			// Rien d'autre ne change : un sin(x) sans angle mesuré reste tel quel
			if (!changed) return undefined;
			changedSomewhere = true;
			return { node: simplifyExact({ ...node, args }), skip: true };
		}
	});
	return { ast: result, changed: changedSomewhere };
}

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
	const result = converted(ast);
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
	const result = converted(ast);
	return result.changed
		? { latex: toLatex(result.ast), text: toCustom(result.ast), ast: result.ast }
		: null;
}
