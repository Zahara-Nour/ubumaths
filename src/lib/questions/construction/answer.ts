/**
 * Réponse d'une case « figure » (bloc ```figure-a-completer)
 * ====================================================
 *
 * Ce que l'élève a tracé, écrit en coordonnées : `droite(x1;y1;x2;y2)` ou
 * `segment(x1;y1;x2;y2)` (par ses deux bouts), `point(x;y)` (outil point,
 * chantier `controles-figure` lot 2a), `cercle(cx;cy;x;y)` (compas : le centre
 * et un point du cercle, lot 2b), `report(cx;cy;ax;ay;bx;by)` (report de
 * longueur : le centre, puis les deux points de l'écartement, lot 4), les objets séparés par `|`. Entrée de l'élève : bornée (longueur, nombre
 * d'objets, valeurs finies et modérées) avant toute lecture ; illisible → null.
 *
 * @module questions/construction/answer
 */

import { z } from 'zod';

/**
 * Plafonds : au-delà, la réponse est illisible (jamais jugée). 2 000 caractères :
 * ceux de l'envoi (`MAX_ANSWER_LENGTH`, `submission.ts`) ; les traits des
 * instruments sont en pleine précision (~90 caractères chacun).
 */
export const CONSTRUCTION_ANSWER_LIMITS = {
	chars: 2_000,
	objects: 20,
	coordinate: 1e6
} as const;

/** Deux points plus proches que ça : la même position (droite indéfinie) */
const SAME_POINT_EPSILON = 1e-9;

const NUMBER = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
const LINE_REGEX = new RegExp(
	`^(droite|segment)\\(\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*\\)$`
);
const POINT_REGEX = new RegExp(`^point\\(\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*\\)$`);
const CIRCLE_REGEX = new RegExp(
	`^cercle\\(\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*\\)$`
);

const REPORT_REGEX = new RegExp(
	`^report\\(${Array.from({ length: 6 }, () => `\\s*(${NUMBER})\\s*`).join(';')}\\)$`
);

const coordinate = z
	.number()
	.finite()
	.min(-CONSTRUCTION_ANSWER_LIMITS.coordinate)
	.max(CONSTRUCTION_ANSWER_LIMITS.coordinate);

const drawnLineSchema = z
	.object({
		kind: z.enum(['droite', 'segment']),
		x1: coordinate,
		y1: coordinate,
		x2: coordinate,
		y2: coordinate
	})
	.refine((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1) > SAME_POINT_EPSILON);

/** Droite (par deux de ses points) ou segment (par ses deux bouts) tracé par l'élève */
export type DrawnLine = z.infer<typeof drawnLineSchema>;

const drawnPointSchema = z.object({ kind: z.literal('point'), x: coordinate, y: coordinate });

/** Point placé par l'élève (outil point) */
export type DrawnPoint = z.infer<typeof drawnPointSchema>;

const drawnCircleSchema = z
	.object({
		kind: z.literal('cercle'),
		cx: coordinate,
		cy: coordinate,
		x: coordinate,
		y: coordinate
	})
	.refine((c) => Math.hypot(c.x - c.cx, c.y - c.cy) > SAME_POINT_EPSILON);

/** Cercle tracé au compas : son centre et un de ses points */
export type DrawnCircle = z.infer<typeof drawnCircleSchema>;

const drawnReportSchema = z
	.object({
		kind: z.literal('report'),
		cx: coordinate,
		cy: coordinate,
		ax: coordinate,
		ay: coordinate,
		bx: coordinate,
		by: coordinate
	})
	.refine((r) => Math.hypot(r.bx - r.ax, r.by - r.ay) > SAME_POINT_EPSILON);

/**
 * Report de longueur : cercle centré en (cx ; cy), de rayon l'écartement entre
 * (ax ; ay) et (bx ; by) — gardé pour juger si l'écartement est construit
 */
export type DrawnReport = z.infer<typeof drawnReportSchema>;

/** Ce que l'élève a tracé ou placé */
export type DrawnObject = DrawnLine | DrawnPoint | DrawnCircle | DrawnReport;

export function isDrawnLine(object: DrawnObject): object is DrawnLine {
	return object.kind === 'droite' || object.kind === 'segment';
}

export function isDrawnCircle(object: DrawnObject): object is DrawnCircle {
	return object.kind === 'cercle';
}

export function isDrawnReport(object: DrawnObject): object is DrawnReport {
	return object.kind === 'report';
}

export function isDrawnPoint(object: DrawnObject): object is DrawnPoint {
	return object.kind === 'point';
}

/** Un objet de la réponse ; null s'il est illisible */
function parseObject(part: string): DrawnObject | null {
	const point = POINT_REGEX.exec(part);
	if (point) {
		const parsed = drawnPointSchema.safeParse({
			kind: 'point',
			x: Number(point[1]),
			y: Number(point[2])
		});
		return parsed.success ? parsed.data : null;
	}
	const report = REPORT_REGEX.exec(part);
	if (report) {
		const [cx, cy, ax, ay, bx, by] = report.slice(1).map(Number);
		const parsed = drawnReportSchema.safeParse({ kind: 'report', cx, cy, ax, ay, bx, by });
		return parsed.success ? parsed.data : null;
	}
	const circle = CIRCLE_REGEX.exec(part);
	if (circle) {
		const parsed = drawnCircleSchema.safeParse({
			kind: 'cercle',
			cx: Number(circle[1]),
			cy: Number(circle[2]),
			x: Number(circle[3]),
			y: Number(circle[4])
		});
		return parsed.success ? parsed.data : null;
	}
	const match = LINE_REGEX.exec(part);
	if (!match) return null;
	const parsed = drawnLineSchema.safeParse({
		kind: match[1],
		x1: Number(match[2]),
		y1: Number(match[3]),
		x2: Number(match[4]),
		y2: Number(match[5])
	});
	return parsed.success ? parsed.data : null;
}

/** Objets tracés ; `[]` si rien ; null si la réponse est illisible */
export function parseConstructionAnswer(answer: string): DrawnObject[] | null {
	if (answer.length > CONSTRUCTION_ANSWER_LIMITS.chars) return null;
	const trimmed = answer.trim();
	if (trimmed === '') return [];
	const parts = trimmed.split('|');
	if (parts.length > CONSTRUCTION_ANSWER_LIMITS.objects) return null;
	const objects: DrawnObject[] = [];
	for (const part of parts) {
		const object = parseObject(part.trim());
		if (!object) return null;
		objects.push(object);
	}
	return objects;
}

/** Écrire ce que l'élève a tracé (écran de l'élève, tests) */
export function serializeConstructionAnswer(objects: readonly DrawnObject[]): string {
	return objects
		.map((o) => {
			if (isDrawnLine(o)) return `${o.kind}(${o.x1};${o.y1};${o.x2};${o.y2})`;
			if (isDrawnCircle(o)) return `cercle(${o.cx};${o.cy};${o.x};${o.y})`;
			if (isDrawnReport(o)) return `report(${o.cx};${o.cy};${o.ax};${o.ay};${o.bx};${o.by})`;
			return `point(${o.x};${o.y})`;
		})
		.join('|');
}
