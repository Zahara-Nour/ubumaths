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
import { isCircle, isPointElement, type GeoElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { circleToSVG } from '$lib/geometry-core/rendering/svg-primitives';
import { createTransformer } from '$lib/geometry-core/viewport/viewport';
import type { Trait } from './instruments';
import { ConstructionAuthorError, type Position } from './judge';
import { registerConstructionPositions, type ConstructionGeometry } from './positions';
import type { ExpectedCircle, ExpectedLine, ExpectedPoints } from './point';
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
 * Centre et rayon d'un cercle de la figure, relus du rendu (même calcul que le
 * dessin), à l'échelle 1 ; null pour un autre objet
 */
function circleOf(element: GeoElement, scene: FigureScene): ExpectedCircle | null {
	if (!isCircle(element)) return null;
	const { xMin, xMax, yMin, yMax } = scene.viewport;
	const transformer = createTransformer(scene.viewport, xMax - xMin, yMax - yMin);
	const svg = circleToSVG(element.id, scene.figure, transformer);
	if (!svg) return null;
	const center = transformer.svgToMath(svg.cx, svg.cy);
	const radius = svg.r;
	if (!Number.isFinite(center.x) || !Number.isFinite(center.y) || !(radius > 0)) return null;
	return { center, radius };
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
	const traits: Trait[] = segments.map(({ a, b }) => ({ kind: 'segment', a, b }));
	for (const element of scene.elements) {
		if (element.type === 'line' || element.type === 'ray') {
			const [from, to] = straightEnds(element) as [string, string];
			const a = position(from);
			const b = position(to);
			if (a && b) traits.push({ kind: element.type, a, b });
			continue;
		}
		const circle = circleOf(element, scene);
		if (circle) traits.push({ kind: 'circle', ...circle });
	}
	const lines = new Map<string, FigureLine>();
	for (const element of scene.figure.getAllElements()) {
		const ends = straightEnds(element);
		if (!ends) continue;
		const a = position(ends[0]);
		const b = position(ends[1]);
		if (!a || !b) continue;
		const line: FigureLine = {
			kind: element.type === 'ray' ? 'ray' : element.type === 'line' ? 'line' : 'segment',
			a,
			b,
			owner: element.id,
			visible: scene.elements.some((e) => e.id === element.id)
		};
		lines.set(element.id, line);
		if (element.label) lines.set(element.label, line);
	}
	const visiblePoints = new Set(namedPointPositions(scene).keys());
	return { segments, lines, traits, visiblePoints, grid: header.grid, window: header.window };
}

/**
 * Nom interne du point attendu dans la figure calculée à part : le nom écrit
 * (A') n'est pas un nom du langage des figures, qui n'a pas de prime
 */
const EXPECTED_NAME = 'zzPointAttendu';

/**
 * Points des vérifications `point A' = <expression>` et droites des
 * vérifications `droite m = <expression>` (lot 3), cercles des vérifications
 * `cercle c = <expression>` (lot 3b) : chaque expression est
 * ajoutée à la fin du script, sous un nom interne, dans une figure calculée à
 * part (jamais celle que voit l'élève, ni ses points d'aimantation).
 */
export function expectedPoints(
	figureSource: string,
	checks: readonly ConstructionCheck[]
): ExpectedPoints {
	const positions = new Map<string, Position>();
	const lines = new Map<string, ExpectedLine>();
	const circles = new Map<string, ExpectedCircle>();
	const errors = new Map<string, string>();
	for (const check of checks) {
		if (check.kind !== 'point' && check.kind !== 'droite' && check.kind !== 'cercle') continue;
		const node = parseFigureContent(`${figureSource}\n${EXPECTED_NAME} = ${check.expression}`);
		const { scene, errors: sceneErrors } = buildFigureScene(node);
		if (check.kind === 'point') {
			const position = scene ? allNamedPointPositions(scene).get(EXPECTED_NAME) : undefined;
			if (position) {
				positions.set(check.name, position);
				continue;
			}
		} else if (scene && check.kind === 'droite') {
			const line = expectedLine(scene);
			if (line) {
				lines.set(check.name, line);
				continue;
			}
		} else if (scene) {
			// `cercle(O, rayon=distance(D, E))` : la distance intérieure porte aussi le nom
			// interne ; on prend l'élément qui est un cercle (n° 19)
			const circle =
				scene.figure
					.getAllElements()
					.filter((e) => e.label === EXPECTED_NAME)
					.map((e) => circleOf(e, scene))
					.find((c) => c !== null) ?? null;
			if (circle) {
				circles.set(check.name, circle);
				continue;
			}
		}
		const messages = [...node.errors, ...sceneErrors].map((e) => e.message);
		// Sans erreur : l'expression se calcule, mais ce n'est pas un point / une droite / un cercle (le juge le dit)
		if (messages.length > 0) {
			errors.set(check.name, `l’expression ne se calcule pas (${messages.join(' ; ')})`);
		}
	}
	return { positions, lines, circles, errors };
}

/** La droite (entière) que donne l'expression, par deux de ses points ; null sinon */
function expectedLine(scene: FigureScene): ExpectedLine | null {
	const element = scene.figure.getAllElements().find((e) => e.label === EXPECTED_NAME);
	if (!element || element.type !== 'line') return null;
	const ends = straightEnds(element);
	if (!ends) return null;
	const [a, b] = ends.map((id) => {
		const p = scene.figure.getPosition(id);
		return p ? { x: geoToNumber(p.x), y: geoToNumber(p.y) } : null;
	});
	if (!a || !b || ![a.x, a.y, b.x, b.y].every(Number.isFinite)) return null;
	return { a, b };
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
