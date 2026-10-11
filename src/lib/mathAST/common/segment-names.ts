/**
 * Longueurs et noms de figure dans le calcul : le nom d'une longueur (`AB`, et `BA`
 * pour la même longueur), sa forme canonique, et le refus d'un nom de figure (`ABC`)
 * au calcul et à la correction (décision Q-A du 2026-10-11).
 *
 * Séparé de `point-names.ts` (écriture seule, sans dépendance) pour ne pas créer de
 * cycle d'imports avec les générateurs.
 *
 * @module mathAST/common/segment-names
 */

import type { FigureNameNode, MathNode, SegmentLengthNode } from '../types';
import { segmentLength, variable } from '../factory';
import { isFigureName, isSegmentLength } from '../guards';
import { findNodes, mapNode } from '../transforms';
import { formatPointNames } from './point-names';

/** Le nom écrit d'une longueur : `AB`, `BA`, `A'B'`. */
export function segmentName(node: SegmentLengthNode): string {
	return formatPointNames(node.points);
}

/**
 * La longueur porte-t-elle ce nom, dans un ordre ou dans l'autre ? `AB` et `BA`
 * désignent la même longueur (décision Q2 du 2026-10-11).
 */
export function segmentHasName(node: SegmentLengthNode, name: string): boolean {
	const [from, to] = node.points;
	return segmentName(node) === name || formatPointNames([to, from]) === name;
}

/**
 * La valeur d'une longueur dans des liaisons : sous son nom écrit, sinon sous le nom
 * inverse (`AB` ou `BA`). `undefined` si aucune.
 */
export function segmentBinding<T>(
	node: SegmentLengthNode,
	bindings: Readonly<Record<string, T>>
): T | undefined {
	const [from, to] = node.points;
	const written = segmentName(node);
	if (Object.hasOwn(bindings, written)) return bindings[written];
	const reversed = formatPointNames([to, from]);
	if (Object.hasOwn(bindings, reversed)) return bindings[reversed];
	return undefined;
}

/**
 * Le nom sous lequel une table connaît la longueur : son nom écrit, sinon le nom
 * inverse (`AB` ou `BA`) ; le nom écrit si la table ne connaît ni l'un ni l'autre.
 */
export function segmentNameIn(
	node: SegmentLengthNode,
	known: { has(name: string): boolean } | undefined
): string {
	const written = segmentName(node);
	if (!known || known.has(written)) return written;
	const [from, to] = node.points;
	const reversed = formatPointNames([to, from]);
	return known.has(reversed) ? reversed : written;
}

/**
 * La même longueur, ses points dans l'ordre canonique (`BA` → `AB`) : pour comparer
 * deux écritures dont l'ordre des points est libre.
 */
export function canonicalSegment(node: SegmentLengthNode): SegmentLengthNode {
	const [from, to] = node.points;
	if (formatPointNames([from]) <= formatPointNames([to])) return node;
	return segmentLength(to, from, node.metadata);
}

/** « On ne connaît pas la valeur de la longueur AB. » : une longueur sans valeur. */
export function unknownSegmentMessage(node: SegmentLengthNode): string {
	return `On ne connaît pas la valeur de la longueur ${segmentName(node)}.`;
}

/**
 * Pourquoi l'expression ne peut pas être évaluée à cause d'un point nommé : un nom de
 * figure (refus, Q-A), sinon une longueur sans valeur. `null` s'il n'y en a pas.
 */
export function pointNamesEvaluationRefusal(node: MathNode): string | null {
	const figure = figureNameRefusal(node);
	if (figure) return figure;
	const [segment] = findNodes(node, isSegmentLength);
	return segment ? unknownSegmentMessage(segment) : null;
}

/** Le premier nom de figure d'une expression, s'il y en a un. */
function findFigureName(node: MathNode): FigureNameNode | null {
	const found = findNodes(node, isFigureName);
	return found[0] ?? null;
}

/**
 * Pourquoi l'expression est refusée au calcul et à la correction : elle contient un
 * nom de figure (`ABC`), qui n'est pas une longueur (décision Q-A). `null` sinon.
 * « ABC n'est pas une longueur : une longueur se nomme avec deux points (AB). Pour un
 * produit, écris A×B×C. »
 */
export function figureNameRefusal(node: MathNode): string | null {
	const figure = findFigureName(node);
	if (!figure) return null;
	const [first, second] = figure.points;
	const pair = first && second ? formatPointNames([first, second]) : '';
	const product = figure.points.map((point) => formatPointNames([point])).join('×');
	return `${formatPointNames(figure.points)} n’est pas une longueur : une longueur se nomme avec deux points (${pair}). Pour un produit, écris ${product}.`;
}

/**
 * La longueur nommée `name` (écrite `AB` ou `BA`) remplacée par la variable `name` :
 * pour résoudre une équation en `AB` avec les solveurs, qui cherchent une variable.
 * Les autres longueurs restent des longueurs.
 */
export function segmentAsVariable(node: MathNode, name: string): MathNode {
	return mapNode(node, (n) => (isSegmentLength(n) && segmentHasName(n, name) ? variable(name) : n));
}

/** L'expression contient-elle une longueur nommée `name` (`AB` ou `BA`) ? */
export function containsSegmentNamed(node: MathNode, name: string): boolean {
	return findNodes(node, (n) => isSegmentLength(n) && segmentHasName(n, name)).length > 0;
}
