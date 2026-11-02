/**
 * Inscrit le calcul réel des positions d'un bloc ```figure-a-completer (effet de
 * bord voulu, cf. `positions.ts`) : interprète la figure avec geometry-core
 * et rend la position de chaque point NOMMÉ, et les traits de la figure.
 *
 * @module questions/construction/positions-setup
 */

import { parseFigureContent } from '$lib/ubumark/parser/figure-parser';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { buildFigureScene, type FigureScene } from '$lib/ubumark/utils/figure-scene';
import { isPointElement, type GeoElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { ConstructionAuthorError, type Position } from './judge';
import { registerConstructionPositions, type ConstructionGeometry } from './positions';
import type { ExpectedPoints } from './point';
import type { FigureLine, FigureSegment, FigureShapes } from './symmetry';
import type { FigureHeader } from '$lib/ubumark/types/figure';
import type { ConstructionCheck } from '$lib/ubumark/types/construction';

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

/** Bouts d'un objet droit (segment, droite, demi-droite) ; null pour le reste */
function straightEnds(element: GeoElement): [string, string] | null {
	if (element.type === 'segment') return [element.startId, element.endId];
	if (element.type === 'line') return [element.point1Id, element.point2Id];
	if (element.type === 'ray') return [element.originId, element.throughId];
	return null;
}

/**
 * Traits de la figure de départ (vérification `symetrique`) : segments et côtés
 * des polygones VISIBLES ; objets droits nommés (axes possibles), visibles ou
 * non ; quadrillage et fenêtre de l'en-tête.
 */
export function figureShapes(scene: FigureScene, header: FigureHeader): FigureShapes {
	const position = (id: string): Position | null => {
		const p = scene.figure.getPosition(id);
		if (!p) return null;
		const x = geoToNumber(p.x);
		const y = geoToNumber(p.y);
		return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
	};
	const label = (id: string) => scene.figure.getElementById(id)?.label || null;
	const segments: FigureSegment[] = [];
	const addSegment = (owner: string, from: string, to: string) => {
		const a = position(from);
		const b = position(to);
		if (a && b) segments.push({ a, b, ends: [label(from), label(to)], owner });
	};
	for (const element of scene.elements) {
		if (element.type === 'segment') addSegment(element.id, element.startId, element.endId);
		if (element.type === 'polygon') {
			const ids = element.dependsOn;
			ids.forEach((id, i) => addSegment(element.id, id, ids[(i + 1) % ids.length]));
		}
	}
	const lines = new Map<string, FigureLine>();
	for (const element of scene.figure.getAllElements()) {
		const ends = straightEnds(element);
		if (!ends) continue;
		const a = position(ends[0]);
		const b = position(ends[1]);
		if (!a || !b) continue;
		const line = { a, b, owner: element.id };
		lines.set(element.id, line);
		if (element.label) lines.set(element.label, line);
	}
	return { segments, lines, grid: header.grid, window: header.window };
}

/**
 * Nom interne du point attendu dans la figure calculée à part : le nom écrit
 * (A') n'est pas un nom du langage des figures, qui n'a pas de prime
 */
const EXPECTED_NAME = 'zzPointAttendu';

/**
 * Points des vérifications `point A' = <expression>` : chaque expression est
 * ajoutée à la fin du script, sous un nom interne, dans une figure calculée à
 * part (jamais celle que voit l'élève, ni ses points d'aimantation).
 */
export function expectedPoints(
	figureSource: string,
	checks: readonly ConstructionCheck[]
): ExpectedPoints {
	const positions = new Map<string, Position>();
	const errors = new Map<string, string>();
	for (const check of checks) {
		if (check.kind !== 'point') continue;
		const node = parseFigureContent(`${figureSource}\n${EXPECTED_NAME} = ${check.expression}`);
		const { scene, errors: sceneErrors } = buildFigureScene(node);
		const position = scene ? allNamedPointPositions(scene).get(EXPECTED_NAME) : undefined;
		if (position) {
			positions.set(check.name, position);
			continue;
		}
		const messages = [...node.errors, ...sceneErrors].map((e) => e.message);
		// Sans erreur : l'expression se calcule, mais ce n'est pas un point (le juge le dit)
		if (messages.length > 0) {
			errors.set(check.name, `l’expression ne se calcule pas (${messages.join(' ; ')})`);
		}
	}
	return { positions, errors };
}

function resolveGeometry(source: string): ConstructionGeometry {
	const { figureSource, spec } = readConstructionHeader(source);
	const node = parseFigureContent(figureSource);
	const { scene, errors } = buildFigureScene(node);
	if (!scene) {
		throw new ConstructionAuthorError(
			`Case « figure » : la figure ne se construit pas (${errors.map((e) => e.message).join(' ; ')})`
		);
	}
	return {
		points: allNamedPointPositions(scene),
		shapes: figureShapes(scene, node.header),
		expected: expectedPoints(figureSource, spec.checks)
	};
}

/** Dernière figure calculée : le juge lit points et traits du même bloc à la suite */
let last: { source: string; geometry: ConstructionGeometry } | null = null;

function resolveCached(source: string): ConstructionGeometry {
	if (last?.source !== source) last = { source, geometry: resolveGeometry(source) };
	return last.geometry;
}

registerConstructionPositions(resolveCached);
