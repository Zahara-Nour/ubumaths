/**
 * Mesurer un angle, au rapporteur (chantier `controles-figure`, lot 6)
 * ===================================================================
 *
 * `verifier: mesure AOB` : l'angle AOB est tracé (ses deux côtés). L'élève pose
 * le rapporteur (geste du lot 5, jamais noté) et tape la mesure en degrés sous
 * la figure. La mesure attendue est CALCULÉE sur la figure : l'auteur ne l'écrit
 * pas. Juste : la mesure exacte. Phase 0 validée par David le 2026-11-03
 * (`docs/wip/controles-figure-progress.md` § 19).
 *
 * `verifier: mesure AOB, rapporteur posé` (lot 8, § 23) : le rapporteur est déjà
 * posé en O, base sur le premier côté nommé, figé (`posedProtractorOf`) ; même juge.
 *
 * @module questions/construction/measure
 */

import type { MeasureCheck } from '$lib/ubumark/types/construction';
import { isInFrame, isStraight, type StraightTrait } from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import type { AngleCorrection } from './angle';
import { protractorFits, protractorRadiusOf, protractorWindowError } from './angle';
import type { FigureShapes } from './symmetry';
import type { Protractor } from './drawing';

/** Écart admis entre la mesure de la figure et un entier (degrés) */
const INTEGER_MEASURE_EPSILON = 0.01;

/** Un côté tracé le long de [OA) : écart admis (relatif) */
const ALONG_EPSILON = 1e-6;

export const missingMeasureFeedback = (name: string) =>
	`Tape la mesure de l’angle ${name}, en degrés.`;
export const measureWrongScaleFeedback = (typed: number, expected: number) =>
	`L’angle mesure ${expected}°, pas ${typed}° : tu as lu la mauvaise graduation du rapporteur.`;
export const wrongMeasureFeedback = (typed: number, expected: number) =>
	`L’angle mesure ${expected}°, pas ${typed}°.`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class MeasureAuthorError extends Error {}

interface MeasureSetting {
	o: Position;
	a: Position;
	b: Position;
	/** Mesure de AOB, en degrés entiers */
	measure: number;
	/** Sens de [OA) vers [OB) : 1 trigonométrique */
	sens: 1 | -1;
	/** Rayon du rapporteur, en unités de la figure (§ 18) */
	radius: number;
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

function nameOf(check: MeasureCheck): string {
	return check.points.join('');
}

/** Mesure à l'auteur : au dixième, virgule */
function tenths(value: number): string {
	return String(Math.round(value * 10) / 10).replace('.', ',');
}

/** Angle AOB en degrés (0..180) */
function angleOf(o: Position, a: Position, b: Position): number {
	const u = { x: a.x - o.x, y: a.y - o.y };
	const v = { x: b.x - o.x, y: b.y - o.y };
	return (Math.atan2(Math.abs(u.x * v.y - u.y * v.x), u.x * v.x + u.y * v.y) * 180) / Math.PI;
}

/**
 * Jusqu'où un trait droit de la figure couvre la demi-droite issue de `o`, de
 * direction unitaire `u` (0 s'il ne part pas de O le long de u)
 */
function reachAlong(trait: StraightTrait, o: Position, u: Position): number {
	const d = { x: trait.b.x - trait.a.x, y: trait.b.y - trait.a.y };
	const length = Math.hypot(d.x, d.y);
	const scale = Math.max(1, Math.abs(o.x), Math.abs(o.y), length);
	const eps = ALONG_EPSILON * scale;
	// Parallèle à u, et passant par O
	if (Math.abs(u.x * d.y - u.y * d.x) / length > ALONG_EPSILON) return 0;
	if (Math.abs(d.x * (o.y - trait.a.y) - d.y * (o.x - trait.a.x)) / length > eps) return 0;
	if (trait.kind === 'line') return Infinity;
	const ta = (trait.a.x - o.x) * u.x + (trait.a.y - o.y) * u.y;
	const tb = (trait.b.x - o.x) * u.x + (trait.b.y - o.y) * u.y;
	if (trait.kind === 'ray') {
		// De a, vers b, jusqu'à l'infini
		if (tb > ta) return ta <= eps ? Infinity : 0;
		return ta >= -eps ? ta : 0;
	}
	if (Math.min(ta, tb) > eps || Math.max(ta, tb) < -eps) return 0;
	return Math.max(ta, tb);
}

/** Sommet, côtés et mesure de l'angle ; erreur d'AUTEUR s'il ne se mesure pas */
function settingOf(
	check: MeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): MeasureSetting {
	const name = nameOf(check);
	const label = `verifier: mesure ${name}`;
	if (!shapes) {
		throw new MeasureAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (mesure)'
		);
	}
	if (shapes.grid) throw new MeasureAuthorError(`${label} : l’angle se mesure sur papier uni`);
	const windowError = protractorWindowError(shapes.window);
	if (windowError) throw new MeasureAuthorError(`${label} : ${windowError}`);
	const [nameA, nameO, nameB] = check.points;
	const [a, o, b] = check.points.map((pointName) => {
		const at = points.get(pointName);
		if (!at) {
			throw new MeasureAuthorError(`${label} : le point ${pointName} n’existe pas dans la figure`);
		}
		return at;
	});
	// Les trois points nommés à l'écran : la case dit « Mesure de l'angle AOB » (revue du lot 6)
	for (const [p, pName] of [
		[a, nameA],
		[o, nameO],
		[b, nameB]
	] as const) {
		if (!shapes.visiblePoints.has(pName)) {
			throw new MeasureAuthorError(
				`${label} : ${pName} n’est pas visible (l’élève doit voir quel angle mesurer)`
			);
		}
		if (shapes.window && !isInFrame(p, shapes.window)) {
			throw new MeasureAuthorError(`${label} : ${pName} est hors de la fenêtre`);
		}
	}
	for (const [p, pName] of [
		[a, nameA],
		[b, nameB]
	] as const) {
		if (distance(p, o) <= ALONG_EPSILON * Math.max(1, Math.abs(o.x), Math.abs(o.y))) {
			throw new MeasureAuthorError(`${label} : ${pName} et ${nameO} sont au même endroit`);
		}
	}
	const exact = angleOf(o, a, b);
	const measure = Math.round(exact);
	if (Math.abs(exact - measure) > INTEGER_MEASURE_EPSILON) {
		throw new MeasureAuthorError(
			`${label} : l’angle ${name} mesure ${tenths(exact)}°, pas un nombre entier de degrés : placer ${nameB} avec rotation(${nameA}, angle=…, centre=${nameO})`
		);
	}
	if (measure < 1 || measure > 179) {
		throw new MeasureAuthorError(`${label} : l’angle ${name} est nul ou plat`);
	}
	// Les deux côtés tracés, au moins jusqu'au bord du rapporteur (sinon rien à lire)
	const radius = protractorRadiusOf(shapes.window);
	const straight = shapes.traits.filter(isStraight);
	const unit = (p: Position) => {
		const length = distance(o, p);
		return { x: (p.x - o.x) / length, y: (p.y - o.y) / length };
	};
	const [ua, ub] = [unit(a), unit(b)];
	for (const [u, pName] of [
		[ua, nameA],
		[ub, nameB]
	] as const) {
		const reach = Math.max(0, ...straight.map((t) => reachAlong(t, o, u)));
		// Un trait qui ne fait que toucher O (venu de l'autre côté) : pas tracé (revue)
		if (reach <= ALONG_EPSILON * Math.max(1, Math.abs(o.x), Math.abs(o.y))) {
			throw new MeasureAuthorError(
				`${label} : le côté [${nameO}${pName}) n’est pas tracé : ajouter demidroite(${nameO}, ${pName})`
			);
		}
		if (reach < radius * (1 - ALONG_EPSILON)) {
			throw new MeasureAuthorError(
				`${label} : le côté [${nameO}${pName}) s’arrête avant le bord du rapporteur : le prolonger (demi-droite)`
			);
		}
	}
	const cross = ua.x * ub.y - ua.y * ub.x;
	const sens: 1 | -1 = cross > 0 ? 1 : -1;
	// Le rapporteur posé sur [OA), corps vers B ; ou sur [OB), corps vers A
	if (
		!protractorFits(o, ua, sens, radius, shapes.window) &&
		!protractorFits(o, ub, sens === 1 ? -1 : 1, radius, shapes.window)
	) {
		throw new MeasureAuthorError(
			`${label} : le rapporteur posé en ${nameO} sort de la figure, sur [${nameO}${nameA}) comme sur [${nameO}${nameB}) : éloigner ${nameO} du bord ou agrandir la fenêtre`
		);
	}
	// Rapporteur déjà posé (lot 8) : sur le premier côté nommé, corps vers l'autre ; l'autre
	// pose tient (sinon refusé ci-dessus) : l'ordre des lettres la choisit
	if (check.posed && !protractorFits(o, ua, sens, radius, shapes.window)) {
		throw new MeasureAuthorError(
			`${label}, rapporteur posé : le rapporteur posé sur [${nameO}${nameA}) sort de la figure ; le poser sur [${nameO}${nameB}) en écrivant « mesure ${nameB}${nameO}${nameA}, rapporteur posé »`
		);
	}
	return { o, a, b, measure, sens, radius };
}

/** L'angle se mesure-t-il ? Erreur d'AUTEUR sinon */
export function assertMeasure(
	check: MeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/** Verdict : la mesure tapée (null : rien de tapé) contre celle de la figure */
export function judgeMeasure(
	check: MeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	typed: number | null
): ConstructionVerdict {
	const { measure } = settingOf(check, points, shapes);
	if (typed === null) {
		return { status: 'incorrect', feedback: missingMeasureFeedback(nameOf(check)) };
	}
	if (typed === measure) return { status: 'correct' };
	if (typed === 180 - measure) {
		return { status: 'incorrect', feedback: measureWrongScaleFeedback(typed, measure) };
	}
	return { status: 'incorrect', feedback: wrongMeasureFeedback(typed, measure) };
}

/**
 * Rapporteur déjà posé (lot 8, § 23) : centre O, base sur le premier côté nommé
 * ([OA) pour `AOB`), corps du côté de B ; null sans `rapporteur posé`, ou si
 * l'angle ne se mesure pas (l'erreur est celle de l'auteur)
 */
export function posedProtractorOf(
	check: MeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): Protractor | null {
	if (!check.posed) return null;
	try {
		const { o, a, sens, radius } = settingOf(check, points, shapes);
		return { center: o, base: a, sens, radius };
	} catch {
		return null;
	}
}

/** Correction : l'arc de l'angle, codé de sa mesure ; null s'il ne se mesure pas */
export function measureCorrection(
	check: MeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): AngleCorrection | null {
	try {
		const { o, a, b, measure, sens } = settingOf(check, points, shapes);
		return { center: o, from: a, to: b, measure, sens };
	} catch {
		return null;
	}
}
