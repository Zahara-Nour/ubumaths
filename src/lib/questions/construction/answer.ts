/**
 * Réponse d'une case « figure » (bloc ```figure-a-completer)
 * ====================================================
 *
 * Ce que l'élève a tracé, écrit en coordonnées : `droite(x1;y1;x2;y2)`, les
 * objets séparés par `|`. Entrée de l'élève : bornée (longueur, nombre
 * d'objets, valeurs finies et modérées) avant toute lecture ; illisible → null.
 *
 * @module questions/construction/answer
 */

import { z } from 'zod';

/** Plafonds : au-delà, la réponse est illisible (jamais jugée) */
export const CONSTRUCTION_ANSWER_LIMITS = {
	chars: 1_000,
	objects: 20,
	coordinate: 1e6
} as const;

/** Deux points plus proches que ça : la même position (droite indéfinie) */
const SAME_POINT_EPSILON = 1e-9;

const NUMBER = String.raw`-?\d+(?:\.\d+)?(?:e[+-]?\d+)?`;
const LINE_REGEX = new RegExp(
	`^droite\\(\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*;\\s*(${NUMBER})\\s*\\)$`
);

const coordinate = z
	.number()
	.finite()
	.min(-CONSTRUCTION_ANSWER_LIMITS.coordinate)
	.max(CONSTRUCTION_ANSWER_LIMITS.coordinate);

const drawnLineSchema = z
	.object({
		kind: z.literal('droite'),
		x1: coordinate,
		y1: coordinate,
		x2: coordinate,
		y2: coordinate
	})
	.refine((l) => Math.hypot(l.x2 - l.x1, l.y2 - l.y1) > SAME_POINT_EPSILON);

/** Droite tracée par l'élève, par deux de ses points */
export type DrawnLine = z.infer<typeof drawnLineSchema>;

/** Objets tracés ; `[]` si rien ; null si la réponse est illisible */
export function parseConstructionAnswer(answer: string): DrawnLine[] | null {
	if (answer.length > CONSTRUCTION_ANSWER_LIMITS.chars) return null;
	const trimmed = answer.trim();
	if (trimmed === '') return [];
	const parts = trimmed.split('|');
	if (parts.length > CONSTRUCTION_ANSWER_LIMITS.objects) return null;
	const lines: DrawnLine[] = [];
	for (const part of parts) {
		const match = LINE_REGEX.exec(part.trim());
		if (!match) return null;
		const parsed = drawnLineSchema.safeParse({
			kind: 'droite',
			x1: Number(match[1]),
			y1: Number(match[2]),
			x2: Number(match[3]),
			y2: Number(match[4])
		});
		if (!parsed.success) return null;
		lines.push(parsed.data);
	}
	return lines;
}

/** Écrire ce que l'élève a tracé (écran de l'élève, tests) */
export function serializeConstructionAnswer(lines: readonly DrawnLine[]): string {
	return lines.map((l) => `droite(${l.x1};${l.y1};${l.x2};${l.y2})`).join('|');
}
