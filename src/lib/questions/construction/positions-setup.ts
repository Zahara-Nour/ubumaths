/**
 * Inscrit le calcul réel des positions d'un bloc ```figure-a-completer (effet de
 * bord voulu, cf. `positions.ts`) : interprète la figure avec geometry-core
 * et rend la position de chaque point NOMMÉ.
 *
 * @module questions/construction/positions-setup
 */

import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { buildFigureScene, type FigureScene } from '$lib/ubumark/utils/figure-scene';
import { isPointElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { ConstructionAuthorError, type Position } from './judge';
import { registerConstructionPositions } from './positions';

/** Position de chaque point NOMMÉ d'une scène (le nom affiché : A, B…) */
export function namedPointPositions(scene: FigureScene): Map<string, Position> {
	const points = new Map<string, Position>();
	for (const element of scene.elements) {
		const position = scene.positions.get(element.id);
		if (position && element.label) points.set(element.label, position);
	}
	return points;
}

/**
 * Position de chaque point NOMMÉ, visibles ou non : les sommets d'un côté
 * donné sont invisibles au CP (aucune lettre, CP-060), le juge les connaît.
 */
export function allNamedPointPositions(scene: FigureScene): Map<string, Position> {
	const points = new Map<string, Position>();
	for (const element of scene.figure.getAllElements()) {
		if (!isPointElement(element) || !element.label) continue;
		const position = scene.figure.getPosition(element.id);
		if (!position) continue;
		const x = geoToNumber(position.x);
		const y = geoToNumber(position.y);
		if (Number.isFinite(x) && Number.isFinite(y)) points.set(element.label, { x, y });
	}
	return points;
}

function resolvePositions(source: string): Map<string, Position> {
	const node = parseFigureContent(readConstructionHeader(source).figureSource);
	const { scene, errors } = buildFigureScene(node);
	if (!scene) {
		throw new ConstructionAuthorError(
			`Case « figure » : la figure ne se construit pas (${errors.map((e) => e.message).join(' ; ')})`
		);
	}
	return allNamedPointPositions(scene);
}

registerConstructionPositions(resolvePositions);
