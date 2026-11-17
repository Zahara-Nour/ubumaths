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
import { nodesEqual } from '../../normal/hash';

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

/** Un angle en degrés : `20 °`. */
function isDegreeAngle(node: MathNode): boolean {
	return isUnit(node) && formatUnit(node.unit, 'original') === '°';
}

/**
 * L'écriture des angles d'une RÉPONSE, d'après la ligne tapée (Q1 de la PR 2c,
 * David, 2026-11-09) : un sin, cos, tan d'un angle tapé en degrés, sans valeur
 * remarquable, se réécrit tel qu'il a été tapé — `cos(20°)`, comme
 * `.simplify cos(20°)x`. Le solveur, lui, calcule en radians : sa réponse dit
 * `cos((π/9) rad)` (registre) ou `cos(π/9)` (étapes de l'Atelier). Tout autre
 * angle mesuré devient un nombre de radians (`radiansInTrigonometry`).
 *
 * Sans degrés tapés : l'identité.
 *
 * @param typed - La ligne lue, valeurs remarquables déjà calculées
 */
export function anglesAsTyped(typed: MathNode): (tree: MathNode) => MathNode {
	const typedAngles = findNodes(
		typed,
		(node) => isTrigonometric(node) && findNodes(node, isDegreeAngle).length > 0
	).flatMap((node) => {
		const opposite = withOppositeAngle(node);
		return [node, ...(opposite === null ? [] : [opposite])].map((angle) => ({
			node: angle,
			radians: radiansInTrigonometry(angle)
		}));
	});
	if (typedAngles.length === 0) return (tree) => tree;
	return (tree) =>
		transformAST(tree, {
			enterFunction: (node) => {
				if (!isTrigonometric(node)) return undefined;
				const radians = radiansInTrigonometry(node);
				const typedAngle = typedAngles.find((angle) => nodesEqual(angle.radians, radians));
				return { node: typedAngle?.node ?? radians, skip: true };
			}
		});
}

/**
 * Le même sin, cos, tan de l'angle OPPOSÉ, quand l'angle tapé est négatif :
 * `sin(-20°)` → `sin(20°)`. Le moteur sort le signe (`sin(-π/9)` → `-sin(π/9)`,
 * `cos(-π/9)` → `cos(π/9)`) : sans lui, la réponse perdait les degrés (revue de
 * la PR 2c). `null` pour un angle positif ou qui n'est pas un nombre de degrés.
 */
function withOppositeAngle(node: MathNode): MathNode | null {
	if (node.type !== 'function' || node.args.length !== 1) return null;
	const [argument] = node.args;
	const angle = argument.type === 'delimiter' ? argument.content : argument;
	if (!isUnit(angle) || !isDegreeAngle(angle)) return null;
	const measure = angle.expression;
	const positive =
		measure.type === 'opposite'
			? measure.operand
			: measure.type === 'number' && measure.value.startsWith('-')
				? mathNumber(measure.value.slice(1))
				: null;
	return positive === null ? null : { ...node, args: [{ ...angle, expression: positive }] };
}
