/**
 * Un angle mesuré, réduit en NOMBRE de radians dans un sin, cos, tan : `cos(90 °)`
 * devient `cos(π/2)`, `cos((π/2) rad)` aussi — exact.
 *
 * Le moteur n'évalue pas `cos` d'une GRANDEUR hors d'un calcul tapé seul :
 * `.simplify cos(420°)` rendait `cos(420 °)`, et dans l'Atelier `g(x) = cos(R)·x`
 * avec `R = 90 °` restait `cos((π/2)[rad])` (géométrie, lot 2). Une variable en
 * degrés (`cos(x°)`) devient `cos(πx/180)`.
 *
 * Descendu de l'Atelier (`atelier/angle-radians.ts`, qui garde les passages en
 * texte et en LaTeX) dans le registre le 2026-11-03, chantier `registre-reference`.
 *
 * @module mathAST/cli/core/angle-radians
 */

import type { MathNode } from '../../types';
import { isUnit } from '../../guards';
import { format as formatUnit } from '../../units';
import { divide, multiply, number as mathNumber, parentheses, piConstant } from '../../factory';
import { transformAST } from '../../visitor';
import { findNodes } from '../../transforms';
import { simplifyExact } from '$lib/geometry-core/compute/geo-arithmetic';

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
	return withRadiansInTrigonometry(ast).ast;
}

/** `radiansInTrigonometry`, et si quelque chose a changé. */
export function withRadiansInTrigonometry(ast: MathNode): {
	readonly ast: MathNode;
	readonly changed: boolean;
} {
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

/**
 * Les valeurs remarquables seulement : un sin, cos, tan d'un angle mesuré est
 * remplacé par sa valeur quand elle est exacte (`cos(420°)` → 1/2), et garde
 * sinon son angle tel qu'écrit (`cos(20°)` reste en degrés — règle de
 * l'Atelier, chantier valeurs-remarquables). C'est ce que fait une commande du
 * registre (`.simplify cos(420°)`), sans changer l'écriture d'un angle quelconque.
 */
export function remarkableValuesInTrigonometry(ast: MathNode): MathNode {
	return transformAST(ast, {
		enterFunction: (node) => {
			if (!TRIGONOMETRIC.has(node.name)) return undefined;
			const result = withRadiansInTrigonometry(node);
			if (!result.changed) return undefined;
			// Encore un sin, cos, tan : pas de valeur exacte pour celui-ci, l'angle reste
			// écrit ; on descend dans ses arguments, où un sin, cos, tan imbriqué peut en
			// avoir une (`sin(cos(60°))` → `sin(1/2)`, revue de la PR 3)
			const remaining = findNodes(result.ast, isTrigonometric);
			return remaining.length > 0 ? undefined : { node: result.ast, skip: true };
		}
	});
}

/** Un appel à sin, cos ou tan. */
function isTrigonometric(node: MathNode): boolean {
	return node.type === 'function' && TRIGONOMETRIC.has(node.name);
}
