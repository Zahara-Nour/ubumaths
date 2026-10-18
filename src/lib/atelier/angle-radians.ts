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
 * ⚠️ Seulement l'arbre SUBSTITUÉ d'un objet de l'atelier (`engine.substitutedTree`) :
 * `cos(90[°])` tapé à la main dans une fonction reste la limite de main.
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
	return transformAST(ast, {
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
			return { node: simplifyExact({ ...node, args }), skip: true };
		}
	});
}
