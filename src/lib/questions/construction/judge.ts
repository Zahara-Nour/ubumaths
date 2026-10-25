/**
 * Juge d'une case « figure » (bloc ```construction)
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

import type { ConstructionCheck, DroiteParCheck } from '$lib/ubumark/types/construction';
import { parseConstructionAnswer, type DrawnLine } from './answer';

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
	check: ConstructionCheck,
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
	others: readonly ConstructionCheck[],
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

/**
 * Verdict d'une réponse : chaque vérification prend SA droite parmi celles
 * tracées ; une droite qu'aucune vérification ne prend est de trop.
 */
export function judgeConstruction(
	checks: readonly ConstructionCheck[],
	points: ReadonlyMap<string, Position>,
	answer: string
): ConstructionVerdict {
	const lines = parseConstructionAnswer(answer);
	if (lines === null) return { status: 'incorrect' };
	if (lines.length === 0) return { status: 'empty' };

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
