/**
 * Inscrit le calcul réel des positions d'un bloc ```construction (effet de
 * bord voulu, cf. `positions.ts`) : interprète la figure avec geometry-core
 * et rend la position de chaque point NOMMÉ.
 *
 * @module questions/construction/positions-setup
 */

import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';
import { ConstructionAuthorError, type Position } from './judge';
import { registerConstructionPositions } from './positions';

function resolvePositions(source: string): Map<string, Position> {
	const node = parseFigureContent(readConstructionHeader(source).figureSource);
	const { scene, errors } = buildFigureScene(node);
	if (!scene) {
		throw new ConstructionAuthorError(
			`Case « figure » : la figure ne se construit pas (${errors.map((e) => e.message).join(' ; ')})`
		);
	}
	const points = new Map<string, Position>();
	for (const element of scene.elements) {
		const position = scene.positions.get(element.id);
		if (position && element.label) points.set(element.label, position);
	}
	return points;
}

registerConstructionPositions(resolvePositions);
