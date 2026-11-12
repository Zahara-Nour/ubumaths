/**
 * Mesurer un segment, à la règle graduée (n° 26 de `outils-manquants.md`)
 * ======================================================================
 *
 * `verifier: mesure AB` : le segment [AB] est tracé. L'élève pose la règle
 * graduée (geste du chantier `regle-graduee`, jamais noté) et tape la longueur
 * sous la figure, en cm entiers (`mesure AB en mm` : en mm entiers). La longueur
 * attendue est CALCULÉE sur la figure (1 unité = 1 cm, ADR 0036) : l'auteur ne
 * l'écrit pas. Juste : la longueur exacte. Comme `mesure AOB` (`measure.ts`)
 * pour l'angle. Phase 0 validée par David le 2026-11-12
 * (`docs/wip/amelioration-progress.md` § N° 26), CP-035, CE1-044.
 *
 * @module questions/construction/segment-measure
 */

import type { SegmentMeasureCheck } from '$lib/ubumark/types/construction';
import type { DrawnObject, DrawnRegle } from './answer';
import { isInFrame, isStraight, rulerDirection, type StraightTrait } from './instruments';
import type { ConstructionVerdict, Position } from './judge';
import { RULER_MAX_LENGTH, rulerLengthOf } from './segment-length';
import type { FigureShapes } from './symmetry';

/** Écart admis (relatif) : longueur entière, point sur un trait */
const EPSILON = 1e-6;

/**
 * Règle qui longe [AB] (message « le 0 doit être sur A ») : A et B à moins de
 * 3 mm de son bord ; le 0 « sur » un bout à moins d'un demi-millimètre
 */
const ALONG_RULER = 0.3;
const ZERO_AT_END = 0.05;

type Unit = SegmentMeasureCheck['unit'];

export const missingSegmentMeasureFeedback = (name: string, unit: Unit) =>
	`Tape la longueur du segment [${name}], en ${unit}.`;
export const wrongSegmentMeasureFeedback = (
	name: string,
	typed: number,
	expected: number,
	unit: Unit
) => `Le segment [${name}] mesure ${expected} ${unit}, pas ${typed} ${unit}.`;
export const segmentMeasureZeroFeedback = (
	name: string,
	typed: number,
	expected: number,
	unit: Unit,
	/** Le bout où mettre le 0 : celui le plus près du 0 de la règle posée (A par défaut) */
	at: string = name.charAt(0)
) =>
	`Le 0 de la règle doit être sur ${at} : ${wrongSegmentMeasureFeedback(name, typed, expected, unit).replace(/^L/, 'l')}`;

/** Erreur de l'AUTEUR, levée sous le nom de la classe du juge par l'appelant */
export class SegmentMeasureAuthorError extends Error {}

interface SegmentMeasureSetting {
	a: Position;
	b: Position;
	/** Longueur de [AB] dans l'unité de la case (entière) */
	expected: number;
}

const distance = (p: Position, q: Position) => Math.hypot(p.x - q.x, p.y - q.y);

function nameOf(check: SegmentMeasureCheck): string {
	return check.points.join('');
}

/** Le trait droit porte-t-il tout [AB] (A et B dessus, entre ses bouts) ? */
function carries(trait: StraightTrait, a: Position, b: Position): boolean {
	const d = { x: trait.b.x - trait.a.x, y: trait.b.y - trait.a.y };
	const length = Math.hypot(d.x, d.y);
	if (length === 0) return false;
	const eps = EPSILON * Math.max(1, Math.abs(a.x), Math.abs(a.y), Math.abs(b.x), Math.abs(b.y));
	const param = (p: Position) => {
		const cross = (d.x * (p.y - trait.a.y) - d.y * (p.x - trait.a.x)) / length;
		if (Math.abs(cross) > eps) return null;
		return ((p.x - trait.a.x) * d.x + (p.y - trait.a.y) * d.y) / (length * length);
	};
	const [ta, tb] = [param(a), param(b)];
	if (ta === null || tb === null) return false;
	const slack = eps / length;
	if (trait.kind === 'line') return true;
	if (trait.kind === 'ray') return ta >= -slack && tb >= -slack;
	return Math.min(ta, tb) >= -slack && Math.max(ta, tb) <= 1 + slack;
}

/** Bouts, longueur attendue ; erreur d'AUTEUR si le segment ne se mesure pas */
function settingOf(
	check: SegmentMeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): SegmentMeasureSetting {
	const name = nameOf(check);
	const label = `verifier: mesure ${name}${check.unit === 'mm' ? ' en mm' : ''}`;
	if (!shapes) {
		throw new SegmentMeasureAuthorError(
			'Case « figure » : traits de la figure non fournis au juge (segment à mesurer)'
		);
	}
	if (shapes.grid) {
		throw new SegmentMeasureAuthorError(`${label} : la règle graduée sert sur papier uni`);
	}
	const { window } = shapes;
	if (!window) {
		throw new SegmentMeasureAuthorError(
			`${label} : écrire la fenêtre (fenetre:) : la règle se règle sur elle`
		);
	}
	const [a, b] = check.points.map((pointName) => {
		const at = points.get(pointName);
		if (!at) {
			throw new SegmentMeasureAuthorError(
				`${label} : le point ${pointName} n’existe pas dans la figure`
			);
		}
		if (!shapes.visiblePoints.has(pointName)) {
			throw new SegmentMeasureAuthorError(
				`${label} : ${pointName} n’est pas visible (l’élève doit voir quel segment mesurer)`
			);
		}
		if (!isInFrame(at, window)) {
			throw new SegmentMeasureAuthorError(`${label} : ${pointName} est hors de la fenêtre`);
		}
		return at;
	});
	if (!shapes.traits.filter(isStraight).some((trait) => carries(trait, a, b))) {
		throw new SegmentMeasureAuthorError(
			`${label} : le segment [${name}] n’est pas tracé : ajouter segment(${check.points[0]}, ${check.points[1]})`
		);
	}
	const mm = distance(a, b) * 10;
	const expectedMm = Math.round(mm);
	const perUnit = check.unit === 'cm' ? 10 : 1;
	if (Math.abs(mm - expectedMm) > EPSILON * Math.max(1, mm) || expectedMm % perUnit !== 0) {
		const shown = String(Math.round(mm * 10) / 100).replace('.', ',');
		throw new SegmentMeasureAuthorError(
			check.unit === 'cm'
				? `${label} : [${name}] mesure ${shown} cm, pas un nombre entier de cm : déplacer ${check.points[1]}, ou écrire « mesure ${name} en mm »`
				: `${label} : [${name}] mesure ${shown} cm, pas un nombre entier de mm : déplacer ${check.points[1]}`
		);
	}
	if (expectedMm === 0) {
		throw new SegmentMeasureAuthorError(
			`${label} : ${check.points.join(' et ')} sont au même endroit`
		);
	}
	const rulerLength = rulerLengthOf(window);
	if (expectedMm > rulerLength * 10) {
		throw new SegmentMeasureAuthorError(
			`${label} : [${name}] est plus long que la règle (${rulerLength} cm : le plus grand côté de la fenêtre, ${RULER_MAX_LENGTH} cm au plus) ; agrandir la fenêtre`
		);
	}
	return { a, b, expected: expectedMm / perUnit };
}

/** Le segment se mesure-t-il ? Erreur d'AUTEUR sinon */
export function assertSegmentMeasure(
	check: SegmentMeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): void {
	settingOf(check, points, shapes);
}

/**
 * Lecture de l'élève avec la règle posée le long de [AB] sans son 0 sur un bout :
 * la graduation du bout le plus loin, dans l'unité de la case ; null si la
 * règle ne longe pas [AB], ou si son 0 est sur un bout
 */
function misplacedZeroReading(ruler: DrawnRegle, a: Position, b: Position, unit: Unit) {
	const u = rulerDirection(ruler);
	const along = (p: Position) => (p.x - ruler.ox) * u.x + (p.y - ruler.oy) * u.y;
	const across = (p: Position) => Math.abs((p.y - ruler.oy) * u.x - (p.x - ruler.ox) * u.y);
	if (across(a) > ALONG_RULER || across(b) > ALONG_RULER) return null;
	const [ta, tb] = [along(a), along(b)];
	const [near, far] = ta <= tb ? [ta, tb] : [tb, ta];
	if (near < -ZERO_AT_END || Math.abs(near) <= ZERO_AT_END) return null;
	// Le bout le plus près du 0 : celui où l'élève devait le mettre (revue : posée depuis B)
	return { reading: unit === 'cm' ? far : far * 10, fromA: ta <= tb };
}

/**
 * Verdict : la longueur tapée (null : rien de tapé) contre celle de la figure ;
 * `drawn` : les règles posées (jamais notées, la dernière sert au message)
 */
export function judgeSegmentMeasure(
	check: SegmentMeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined,
	drawn: readonly DrawnObject[],
	typed: number | null
): ConstructionVerdict {
	const { a, b, expected } = settingOf(check, points, shapes);
	const name = nameOf(check);
	if (typed === null) {
		return { status: 'incorrect', feedback: missingSegmentMeasureFeedback(name, check.unit) };
	}
	if (typed === expected) return { status: 'correct' };
	const ruler = drawn.filter((o): o is DrawnRegle => o.kind === 'regle').at(-1);
	const misplaced = ruler ? misplacedZeroReading(ruler, a, b, check.unit) : null;
	if (misplaced !== null && Math.abs(typed - misplaced.reading) <= 0.5) {
		const at = misplaced.fromA ? check.points[0] : check.points[1];
		return {
			status: 'incorrect',
			feedback: segmentMeasureZeroFeedback(name, typed, expected, check.unit, at)
		};
	}
	return {
		status: 'incorrect',
		feedback: wrongSegmentMeasureFeedback(name, typed, expected, check.unit)
	};
}

/** Correction : la règle posée au 0 en A, le long de [AB] ; null s'il ne se mesure pas */
export function segmentMeasureRuler(
	check: SegmentMeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): DrawnRegle | null {
	try {
		const { a, b } = settingOf(check, points, shapes);
		return { kind: 'regle', ox: a.x, oy: a.y, bx: b.x, by: b.y, sens: 1 };
	} catch {
		return null;
	}
}

/** Correction : la longueur écrite le long de [AB] ; null s'il ne se mesure pas */
export function segmentMeasureCorrection(
	check: SegmentMeasureCheck,
	points: ReadonlyMap<string, Position>,
	shapes: FigureShapes | undefined
): { from: Position; to: Position; text: string } | null {
	try {
		const { a, b, expected } = settingOf(check, points, shapes);
		return { from: a, to: b, text: `${expected} ${check.unit}` };
	} catch {
		return null;
	}
}
