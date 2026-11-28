/**
 * Figure composée : plusieurs constructions dans une même figure (outil n° 45)
 * ===========================================================================
 *
 * Chantier `outil-equerre-uni`, phase 0 validée par David le 2026-11-28
 * (`docs/wip/outil-equerre-uni-progress.md` § 3). Plusieurs `verifier:` de familles
 * différentes (`isCompositeFigure`) font un programme de construction : chaque ligne
 * est une étape, jugée dans l'ordre par son juge habituel, comme si elle était seule
 * dans la figure, avec les outils de `outils:` qui lui servent.
 *
 * Points construits : une étape juste nomme ses points — le bout B de
 * `segment AB = 6 cm`, les sommets C et D du carré coté, le point placé. Ils sont
 * ajoutés à la figure de l'étape suivante (`B = point(x, y)`) : aux positions de
 * l'élève pour le juger, à celles de la correction pour la garde de l'auteur et le
 * dessin de la correction.
 *
 * Verdict : celui de la PREMIÈRE étape fausse, « Étape n : … » (décision 3). Chaque
 * juge ne reçoit que les objets qu'il sait lire ; les traits des autres étapes ne sont
 * ni « de trop » ni « forgés ». Forgé : un objet dont l'outil n'est pas dans `outils:`.
 *
 * @module questions/construction/composite
 */

import {
	centeredCircleOf,
	compositeFamilyOf,
	compositeStepTools,
	isRuledPolygonCheck,
	rulerMidpointOf,
	type ConstructionCheck,
	type ConstructionTool,
	type SegmentThroughCheck
} from '#lib/ubumark/types/construction.ts';
import { parseConstructionAnswer, type DrawnLine, type DrawnObject } from './answer';
import { judgeCircles } from './circle';
import {
	ConstructionAuthorError,
	asAuthorError,
	assertConstructionChecks,
	type ConstructionVerdict,
	type Position
} from './judge';
import { judgePoints, type ExpectedPoints } from './point';
import { coveringPiece, mergeSegments, tolerance } from './polygon';
import { constructionExpected, constructionPositions, constructionShapes } from './positions';
import { judgeRuledPolygon, ruledPolygonCorners, ruledPolygonSolution } from './ruled-polygon';
import { judgeSegmentLength, segmentLengthEnd, segmentLengthSolution } from './segment-length';
import type { FigureShapes } from './symmetry';

export const segmentThroughMissingFeedback = (points: readonly string[]) =>
	`Trace le segment [${points.join('')}].`;

/** « Étape 2 : … » */
export const stepFeedback = (index: number, feedback: string) => `Étape ${index + 1} : ${feedback}`;

/** Les objets que trace chaque outil */
const TOOL_OBJECTS: Record<ConstructionTool, readonly DrawnObject['kind'][]> = {
	droite: ['droite'],
	equerre: ['droite'],
	segment: ['segment'],
	point: ['point'],
	compas: ['cercle'],
	report: ['report'],
	rapporteur: ['repere'],
	regle: ['regle']
};

/** Une étape, avec la figure où elle se juge (points construits avant elle compris) */
export interface CompositeStep {
	check: ConstructionCheck;
	/** Rang de l'étape (0 = la première) */
	index: number;
	/** Le bloc de l'étape : sa seule vérification, ses outils, les points construits avant */
	source: string;
	points: ReadonlyMap<string, Position>;
	shapes: FigureShapes;
	expected: ExpectedPoints;
}

/** Un nombre écrit pour le langage des figures (sans notation exponentielle) */
function numberText(value: number): string {
	const rounded = Number(value.toFixed(9));
	return Object.is(rounded, -0) ? '0' : String(rounded);
}

/**
 * Le bloc d'une étape : l'en-tête sans les autres `verifier:`, `outils:` réduit aux
 * outils de l'étape, et les points construits avant elle ajoutés à la fin de la figure
 */
export function stepSource(
	source: string,
	check: ConstructionCheck,
	tools: readonly ConstructionTool[],
	built: readonly [string, Position][]
): string {
	const lines = source.split('\n');
	const separator = lines.findIndex((l) => /^\s*---\s*$/.test(l));
	const headerEnd = separator === -1 ? lines.length : separator;
	const header = lines.slice(0, headerEnd).flatMap((line, i) => {
		if (/^\s*(verifier|vérifier)\s*:/i.test(line)) return i === check.line - 1 ? [line] : [];
		if (/^\s*outils\s*:/i.test(line)) return [`outils: ${tools.join(', ')}`];
		return [line];
	});
	const body = lines.slice(headerEnd);
	const points = built.map(
		([name, p]) => `${name} = point(${numberText(p.x)}, ${numberText(p.y)})`
	);
	return [...header, ...body, ...points].join('\n');
}

function stepAt(
	source: string,
	check: ConstructionCheck,
	index: number,
	tools: readonly ConstructionTool[],
	built: readonly [string, Position][]
): CompositeStep {
	const own = stepSource(source, check, compositeStepTools(check, tools), built);
	return {
		check,
		index,
		source: own,
		points: constructionPositions(own),
		shapes: constructionShapes(own),
		expected: constructionExpected(own)
	};
}

/** Les objets qu'un juge sait lire (les autres sont ceux d'autres étapes) */
function objectsFor(check: ConstructionCheck, objects: readonly DrawnObject[]): DrawnObject[] {
	const keep = (...kinds: DrawnObject['kind'][]) => objects.filter((o) => kinds.includes(o.kind));
	if (check.kind === 'segment') return keep('segment', 'regle');
	if (check.kind === 'segment_par') return keep('segment');
	if (isRuledPolygonCheck(check)) return keep('segment', 'droite', 'regle');
	if (check.kind === 'cercle') {
		return centeredCircleOf(check.expression)?.kind === 'longueur'
			? keep('cercle', 'regle')
			: keep('droite', 'cercle', 'report');
	}
	// Point : tous les traits construisent (croisements) ; la règle pour un milieu marqué
	return objects.filter(
		(o) => o.kind !== 'repere' && (o.kind !== 'regle' || rulerMidpointOf(check) !== null)
	);
}

/** `segment [AC]` : un segment tracé (ou des segments bout à bout) joint A et C */
function judgeSegmentThrough(
	check: SegmentThroughCheck,
	points: ReadonlyMap<string, Position>,
	objects: readonly DrawnObject[]
): ConstructionVerdict {
	const [a, c] = check.points.map((name) => points.get(name));
	if (!a || !c) {
		throw new ConstructionAuthorError(
			`segment [${check.points.join('')}] : un des points n’existe pas dans la figure`
		);
	}
	const drawn = objects
		.filter((o): o is DrawnLine => o.kind === 'segment')
		.map((s) => ({ a: { x: s.x1, y: s.y1 }, b: { x: s.x2, y: s.y2 } }));
	const eps = tolerance(a, c);
	const covered = coveringPiece({ a, b: c }, mergeSegments(drawn, eps), eps) !== null;
	return covered
		? { status: 'correct' }
		: { status: 'incorrect', feedback: segmentThroughMissingFeedback(check.points) };
}

/** Verdict d'une étape, sur les objets que son juge sait lire */
function judgeStep(step: CompositeStep, objects: readonly DrawnObject[]): ConstructionVerdict {
	const { check, points, shapes, expected } = step;
	const own = objectsFor(check, objects);
	try {
		if (check.kind === 'segment') return judgeSegmentLength(check, points, shapes, own);
		if (check.kind === 'segment_par') return judgeSegmentThrough(check, points, own);
		if (isRuledPolygonCheck(check)) {
			return judgeRuledPolygon(check, points, shapes, own, { composite: true });
		}
		if (check.kind === 'cercle') {
			return judgeCircles([check], expected, points, shapes, own, { composite: true });
		}
		if (check.kind === 'point') {
			return judgePoints([check], expected, points, shapes, own, { composite: true });
		}
	} catch (error) {
		throw asAuthorError(error);
	}
	throw new ConstructionAuthorError(
		`${check.kind} ne se mêle pas à une figure composée (garanti par le parseur)`
	);
}

/** Les points qu'une étape juste construit, d'après la figure de l'ÉLÈVE */
function drawnPoints(step: CompositeStep, objects: readonly DrawnObject[]): [string, Position][] {
	const { check, points, shapes, expected } = step;
	const own = objectsFor(check, objects);
	if (check.kind === 'segment') {
		const end = segmentLengthEnd(check, points, shapes, own);
		return end ? [[check.end, end]] : [];
	}
	if (isRuledPolygonCheck(check)) {
		const corners = ruledPolygonCorners(check, points, shapes, own);
		return corners
			? [
					[check.points[2], corners.c],
					[check.points[3], corners.d]
				]
			: [];
	}
	if (check.kind === 'point') {
		const at = expected.positions.get(check.name);
		return at ? [[check.name, at]] : [];
	}
	return [];
}

/**
 * Les points qu'une étape construit dans la CORRECTION (la figure juste, du côté où
 * l'élève a tracé : `drawn`) ; garde de l'auteur et dessin de la correction
 */
function solutionPoints(step: CompositeStep, drawn: readonly DrawnObject[]): [string, Position][] {
	const { check, points, shapes, expected } = step;
	if (check.kind === 'segment') {
		const [line] = segmentLengthSolution(check, points, shapes, drawn);
		return line ? [[check.end, { x: line.x2, y: line.y2 }]] : [];
	}
	if (isRuledPolygonCheck(check)) {
		const [bc, cd] = ruledPolygonSolution(check, points, shapes, drawn);
		if (!bc || !cd) return [];
		return [
			[check.points[2], { x: bc.x2, y: bc.y2 }],
			[check.points[3], { x: cd.x2, y: cd.y2 }]
		];
	}
	if (check.kind === 'point') {
		const at = expected.positions.get(check.name);
		return at ? [[check.name, at]] : [];
	}
	return [];
}

/**
 * Les étapes de la correction, chacune avec sa figure (points de la correction des
 * étapes d'avant) ; `drawn` : la figure de l'élève, pour prendre son côté
 */
export function compositeSteps(
	checks: readonly ConstructionCheck[],
	source: string,
	tools: readonly ConstructionTool[],
	drawn: readonly DrawnObject[] = []
): CompositeStep[] {
	const built: [string, Position][] = [];
	return checks.map((check, index) => {
		const step = stepAt(source, check, index, tools, built);
		built.push(...solutionPoints(step, drawn));
		return step;
	});
}

/** Garde de l'auteur : chaque étape, sur la figure de la correction ; « Étape n : … » */
export function assertComposite(
	checks: readonly ConstructionCheck[],
	source: string,
	tools: readonly ConstructionTool[]
): void {
	const built: [string, Position][] = [];
	checks.forEach((check, index) => {
		const step = stepAt(source, check, index, tools, built);
		try {
			if (check.kind === 'segment_par') {
				const missing = check.points.find((name) => !step.points.has(name));
				if (missing) {
					throw new ConstructionAuthorError(
						`segment [${check.points.join('')}] : le point ${missing} n’existe pas (ni dans la figure, ni construit à une étape d’avant)`
					);
				}
			} else {
				assertConstructionChecks([check], step.points, step.shapes, step.expected);
			}
		} catch (error) {
			if (error instanceof ConstructionAuthorError) {
				throw new ConstructionAuthorError(stepFeedback(index, error.message));
			}
			throw error;
		}
		built.push(...solutionPoints(step, []));
	});
}

/** Verdict d'une figure composée : la première étape fausse, ou juste */
export function judgeComposite(
	checks: readonly ConstructionCheck[],
	source: string,
	tools: readonly ConstructionTool[],
	answer: string
): ConstructionVerdict {
	const objects = parseConstructionAnswer(answer);
	if (objects === null) return { status: 'incorrect' };
	if (objects.length === 0) return { status: 'empty' };
	// Un objet sans son outil dans outils: : réponse forgée
	const allowed = new Set(tools.flatMap((t) => TOOL_OBJECTS[t]));
	if (objects.some((o) => !allowed.has(o.kind))) return { status: 'incorrect' };
	const built: [string, Position][] = [];
	for (const [index, check] of checks.entries()) {
		if (!compositeFamilyOf(check)) return { status: 'incorrect' };
		const step = stepAt(source, check, index, tools, built);
		const verdict = judgeStep(step, objects);
		if (verdict.status !== 'correct') {
			return {
				status: 'incorrect',
				...(verdict.feedback && { feedback: stepFeedback(index, verdict.feedback) })
			};
		}
		built.push(...drawnPoints(step, objects));
	}
	return { status: 'correct' };
}
