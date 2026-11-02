/**
 * Juge d'une case « figure » (bloc ```figure-a-completer)
 * =================================================
 *
 * On juge le RÉSULTAT par des positions, jamais par des identifiants : une
 * droite tracée depuis deux points quelconques qui passe par A et B est la
 * droite (AB). Tout-ou-rien ; le message est celui de la première vérification
 * ratée (verdict du conseil, `docs/wip/geometrie-validation-progress.md` § 2).
 *
 * Pur : les positions des points de la figure sont données par l'appelant
 * (registre `positions.ts`).
 *
 * @module questions/construction/judge
 */

import type {
	ConstructionCheck,
	DroiteParCheck,
	PolygonCheck
} from '$lib/ubumark/types/construction';
import { isDrawnLine, parseConstructionAnswer, type DrawnLine } from './answer';
import {
	PointAuthorError,
	assertPoints,
	isPointCheck,
	judgePoints,
	type ExpectedPoints
} from './point';
import { PolygonAuthorError, givenVertices, judgePolygon } from './polygon';
import { SymmetryAuthorError, assertSymmetry, judgeSymmetry, type FigureShapes } from './symmetry';

export {
	EXTRA_SEGMENT_FEEDBACK,
	NOT_A_SQUARE_FEEDBACK,
	NOT_CLOSED_FEEDBACK,
	NOT_ON_GRID_LINES_FEEDBACK,
	OVERSHOOT_FEEDBACK,
	PROLONGED_RECTANGLE_SIDES_FEEDBACK,
	PROLONGED_SIDE_FEEDBACK
} from './polygon';

export interface Position {
	x: number;
	y: number;
}

export interface ConstructionVerdict {
	status: 'correct' | 'incorrect' | 'empty';
	feedback?: string;
}

/** Erreur de l'AUTEUR (vérification impossible) : jamais un verdict pour l'élève */
export class ConstructionAuthorError extends Error {}

/**
 * Tolérance relative à la position du POINT de la figure (jamais aux points
 * tracés, que l'élève choisit) : les points aimantés arrivent exacts, au calcul
 * flottant près.
 */
const ON_LINE_EPSILON = 1e-9;

export const EXTRA_LINE_FEEDBACK = 'Tu as tracé une droite de trop.';

function passesThrough(line: DrawnLine, p: Position): boolean {
	const dx = line.x2 - line.x1;
	const dy = line.y2 - line.y1;
	const cross = dx * (p.y - line.y1) - dy * (p.x - line.x1);
	const scale = Math.max(1, Math.abs(p.x), Math.abs(p.y));
	return Math.abs(cross) / Math.hypot(dx, dy) <= ON_LINE_EPSILON * scale;
}

function positionOf(points: ReadonlyMap<string, Position>, name: string): Position {
	const position = points.get(name);
	if (!position) {
		throw new ConstructionAuthorError(`verifier: le point ${name} n’existe pas dans la figure`);
	}
	return position;
}

function satisfies(
	line: DrawnLine,
	check: DroiteParCheck,
	points: ReadonlyMap<string, Position>
): boolean {
	return (
		passesThrough(line, positionOf(points, check.points[0])) &&
		passesThrough(line, positionOf(points, check.points[1]))
	);
}

/** Pourquoi la droite la plus proche du but ne convient pas */
function droiteParFeedback(
	check: DroiteParCheck,
	unused: DrawnLine[],
	others: readonly DroiteParCheck[],
	points: ReadonlyMap<string, Position>
): string {
	const [a, b] = check.points;
	// Une droite qui satisfait une AUTRE vérification n'est pas celle que l'élève a ratée
	const candidates = unused.filter((l) => !others.some((other) => satisfies(l, other, points)));
	if (candidates.length === 0) return `Il manque la droite qui passe par ${a} et ${b}.`;
	const pa = positionOf(points, a);
	const pb = positionOf(points, b);
	// La droite qui touche au moins un des deux points, sinon la première
	const line =
		candidates.find((l) => passesThrough(l, pa) || passesThrough(l, pb)) ?? candidates[0];
	const throughA = passesThrough(line, pa);
	const throughB = passesThrough(line, pb);
	if (!throughA && !throughB) {
		return `Ta droite ne passe ni par le point ${a}, ni par le point ${b}.`;
	}
	const [kept, missed] = throughA ? [a, b] : [b, a];
	const other = [...points.keys()].find(
		(name) => name !== a && name !== b && passesThrough(line, positionOf(points, name))
	);
	return other
		? `Ta droite passe par ${kept} et ${other}, pas par ${missed}.`
		: `Ta droite ne passe pas par le point ${missed}.`;
}

function isPolygonCheck(check: ConstructionCheck): check is PolygonCheck {
	return check.kind === 'carre' || check.kind === 'rectangle';
}

/** Erreur d'auteur d'un module de vérification → celle du juge ; le reste passe */
function asAuthorError(error: unknown): unknown {
	if (
		error instanceof PolygonAuthorError ||
		error instanceof SymmetryAuthorError ||
		error instanceof PointAuthorError
	) {
		return new ConstructionAuthorError(error.message);
	}
	return error;
}

/**
 * Les vérifications sont-elles faisables sur cette figure ? Erreur d'AUTEUR
 * sinon (point inconnu, sommets confondus…) : `check-template` l'appelle à
 * chaque tirage, pour ne pas l'apprendre au premier élève. `shapes` : les
 * traits de la figure (vérification `symetrique`) ; `expected` : les points
 * attendus (vérification `point`).
 */
export function assertConstructionChecks(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	shapes?: FigureShapes,
	expected?: ExpectedPoints
): void {
	const pointChecks = checks.filter(isPointCheck);
	if (pointChecks.length > 0) {
		try {
			assertPoints(pointChecks, expected, points, shapes);
		} catch (error) {
			throw asAuthorError(error);
		}
	}
	for (const check of checks) {
		if (check.kind === 'point') continue;
		if (check.kind === 'symetrique') {
			try {
				assertSymmetry(check, points, shapes);
			} catch (error) {
				throw asAuthorError(error);
			}
			continue;
		}
		if (!isPolygonCheck(check)) {
			// Deux points confondus : toute droite par l'un passerait pour juste
			const [a, b] = check.points.map((name) => positionOf(points, name));
			const scale = Math.max(1, Math.abs(a.x), Math.abs(a.y));
			if (Math.hypot(a.x - b.x, a.y - b.y) <= ON_LINE_EPSILON * scale) {
				throw new ConstructionAuthorError(
					`verifier: droite_par ${check.points.join(' ; ')} : ${check.points[0]} et ${check.points[1]} sont au même endroit`
				);
			}
			continue;
		}
		try {
			givenVertices(check, points);
		} catch (error) {
			throw asAuthorError(error);
		}
	}
}

/**
 * Verdict d'une réponse. Droites : chaque vérification prend SA droite parmi
 * celles tracées ; une droite qu'aucune vérification ne prend est de trop.
 * Carré / rectangle (une seule vérification, garantie par le parseur) :
 * `polygon.ts` ; symétrique (seul aussi) : `symmetry.ts`, avec les traits de
 * la figure (`shapes`) ; points à placer : `point.ts`, avec les points
 * attendus (`expected`).
 */
export function judgeConstruction(
	allChecks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	answer: string,
	shapes?: FigureShapes,
	expected?: ExpectedPoints
): ConstructionVerdict {
	const objects = parseConstructionAnswer(answer);
	if (objects === null) return { status: 'incorrect' };
	if (objects.length === 0) return { status: 'empty' };

	const pointChecks = allChecks.filter(isPointCheck);
	if (pointChecks.length > 0) {
		try {
			return judgePoints(pointChecks, expected, points, shapes, objects);
		} catch (error) {
			throw asAuthorError(error);
		}
	}
	// Un point placé sans outil point : réponse forgée
	const lines = objects.filter(isDrawnLine);
	if (lines.length !== objects.length) return { status: 'incorrect' };

	const symmetry = allChecks.find((c) => c.kind === 'symetrique');
	if (symmetry) {
		try {
			return judgeSymmetry(symmetry, points, shapes, lines);
		} catch (error) {
			throw asAuthorError(error);
		}
	}
	const polygon = allChecks.find(isPolygonCheck);
	if (polygon) {
		try {
			return judgePolygon(polygon, points, lines);
		} catch (error) {
			throw asAuthorError(error);
		}
	}
	const checks = allChecks.filter((c): c is DroiteParCheck => c.kind === 'droite_par');
	if (lines.some((l) => l.kind !== 'droite')) return { status: 'incorrect' };

	const unused = [...lines];
	for (const check of checks) {
		const index = unused.findIndex((l) => satisfies(l, check, points));
		if (index === -1) {
			const others = checks.filter((other) => other !== check);
			return { status: 'incorrect', feedback: droiteParFeedback(check, unused, others, points) };
		}
		unused.splice(index, 1);
	}
	if (unused.length > 0) return { status: 'incorrect', feedback: EXTRA_LINE_FEEDBACK };
	return { status: 'correct' };
}
