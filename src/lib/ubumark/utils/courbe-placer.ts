/**
 * Repère à points à placer — nœuds, réponse, juge, correction
 * ===========================================================
 *
 * L'élève pose des points dans le repère d'un bloc ```courbe (`placer: A=(2 ; 3)`,
 * chantier `docs/wip/points-repere-progress.md` § 3, lot 1). Un point se pose
 * toujours sur un NŒUD de la grille (aimant) : intersection d'une ligne
 * verticale et d'une ligne horizontale, multiples du pas de chaque axe (le pas
 * de `grille:`, sinon le pas automatique de la scène), dans la fenêtre.
 *
 * La réponse d'une case (un point) s'écrit `x;y` en point décimal (`1.5;-0.5`)
 * par `pointAnswer`, la même fonction pour la réponse attendue et pour celle de
 * l'élève ; le juge (`isPlacedPointCorrect`) compare les nombres.
 *
 * Calcul pur, sans Svelte : l'écran (aimant, clavier) et le générateur
 * (réponse attendue) s'en servent.
 *
 * @module ubumark/utils/courbe-placer
 */

import type { CourbeSpec } from '../types/courbe';
import { courbeGridSteps, multiples } from './courbe-scene';
import { decimalString } from './number-line-placer';

export { courbeGridSteps };

// Types

/** Ce qu'il faut du bloc pour connaître ses nœuds */
export type CourbeGridSpec = Pick<CourbeSpec, 'window' | 'grid' | 'size'>;

/** Un point du repère, en coordonnées mathématiques */
export interface CourbePlacedPoint {
	x: number;
	y: number;
}

// Constantes

/** Écart relatif toléré entre deux nombres égaux (calculs en virgule flottante) */
const RELATIVE_TOLERANCE = 1e-9;

/** Réponse d'une case : deux décimaux à point, séparés par « ; » */
const ANSWER_REGEX = /^\s*(-?\d+(?:\.\d+)?)\s*;\s*(-?\d+(?:\.\d+)?)\s*$/;

const NOTHING_PLACED = 'Tu n’as rien placé.';
const SWAPPED = 'tu as échangé l’abscisse et l’ordonnée';

// Functions

function tolerance(scale: number): number {
	return RELATIVE_TOLERANCE * Math.max(1, Math.abs(scale));
}

/** Retire le bruit flottant (0.30000000000000004 → 0.3) et le -0 */
function clean(value: number): number {
	const rounded = Number(value.toPrecision(12));
	return Object.is(rounded, -0) ? 0 : rounded;
}

/** Rangs extrêmes des multiples du pas dans [min ; max] */
function rankRange(step: number, min: number, max: number): { first: number; last: number } {
	return {
		first: Math.ceil(min / step - RELATIVE_TOLERANCE),
		last: Math.floor(max / step + RELATIVE_TOLERANCE)
	};
}

/** Le multiple du pas le plus proche d'une valeur, ramené dans [min ; max] */
function nearestMultiple(step: number, min: number, max: number, value: number): number {
	const { first, last } = rankRange(step, min, max);
	const k = Math.max(first, Math.min(last, Math.round(value / step)));
	return clean(k * step);
}

/** La valeur est-elle un multiple du pas (au bruit flottant près) ? */
function isMultiple(value: number, step: number): boolean {
	const k = Math.round(value / step);
	return Math.abs(k * step - value) <= tolerance(step);
}

/**
 * Abscisses et ordonnées des nœuds : les lignes de la grille, comme la scène
 * les dessine (`buildCourbeScene(…).grid.xs` / `.ys`)
 */
export function gridNodeValues(spec: CourbeGridSpec): { xs: number[]; ys: number[] } {
	const steps = courbeGridSteps(spec);
	const w = spec.window;
	return { xs: multiples(steps.x, w.xMin, w.xMax), ys: multiples(steps.y, w.yMin, w.yMax) };
}

/** Le point est-il dans la fenêtre (bords compris) ? */
export function isInWindow(spec: CourbeGridSpec, x: number, y: number): boolean {
	const w = spec.window;
	const tx = tolerance(w.xMax - w.xMin);
	const ty = tolerance(w.yMax - w.yMin);
	return x >= w.xMin - tx && x <= w.xMax + tx && y >= w.yMin - ty && y <= w.yMax + ty;
}

/** Le point est-il un nœud de la grille, dans la fenêtre ? */
export function isGridNode(spec: CourbeGridSpec, x: number, y: number): boolean {
	if (!Number.isFinite(x) || !Number.isFinite(y) || !isInWindow(spec, x, y)) return false;
	const steps = courbeGridSteps(spec);
	return isMultiple(x, steps.x) && isMultiple(y, steps.y);
}

/** Aimant : le nœud le plus proche d'une position, ramené dans la fenêtre */
export function nearestNode(spec: CourbeGridSpec, x: number, y: number): CourbePlacedPoint {
	const steps = courbeGridSteps(spec);
	const w = spec.window;
	return {
		x: nearestMultiple(steps.x, w.xMin, w.xMax, x),
		y: nearestMultiple(steps.y, w.yMin, w.yMax, y)
	};
}

/** Clavier : `dx`, `dy` crans de grille depuis un nœud, sans sortir de la fenêtre */
export function moveByStep(
	spec: CourbeGridSpec,
	from: CourbePlacedPoint,
	dx: number,
	dy: number
): CourbePlacedPoint {
	const steps = courbeGridSteps(spec);
	return nearestNode(spec, from.x + dx * steps.x, from.y + dy * steps.y);
}

/** Touche Début : l'origine si c'est un nœud de la fenêtre, sinon le nœud du coin bas-gauche */
export function startNode(spec: CourbeGridSpec): CourbePlacedPoint {
	if (isGridNode(spec, 0, 0)) return { x: 0, y: 0 };
	return nearestNode(spec, spec.window.xMin, spec.window.yMin);
}

/** Réponse d'une case : `2;3`, `1.5;-0.5` (point décimal, jamais d'exposant) */
export function pointAnswer(x: number, y: number): string {
	return `${decimalString(x)};${decimalString(y)}`;
}

/** Le point d'une réponse écrite par `pointAnswer` ; null si vide ou illisible */
export function readPointAnswer(answer: string): CourbePlacedPoint | null {
	const match = ANSWER_REGEX.exec(answer);
	if (!match) return null;
	return { x: Number(match[1]), y: Number(match[2]) };
}

function sameNumber(a: number, b: number): boolean {
	return Math.abs(a - b) <= tolerance(Math.max(Math.abs(a), Math.abs(b)));
}

function samePoint(a: CourbePlacedPoint, b: CourbePlacedPoint): boolean {
	return sameNumber(a.x, b.x) && sameNumber(a.y, b.y);
}

/** Le point de l'élève (`answer`) est-il le point attendu (`expected`) ? */
export function isPlacedPointCorrect(answer: string, expected: string): boolean {
	const placed = readPointAnswer(answer);
	const target = readPointAnswer(expected);
	return placed !== null && target !== null && samePoint(placed, target);
}

/** Coordonnées écrites pour l'élève : `(1,5 ; -0,5)` */
export function pointText(x: number, y: number): string {
	const french = (value: number) => decimalString(value).replace('.', ',');
	return `(${french(x)} ; ${french(y)})`;
}

/**
 * La phrase de la correction pour un point (`name`, vide pour un point seul sans
 * nom) : null s'il est juste ; « Tu n’as pas placé C. », « Tu as placé A en
 * (3 ; 1). », et quand abscisse et ordonnée sont échangées : « Tu as placé A en
 * (3 ; 2) : tu as échangé l’abscisse et l’ordonnée. »
 */
export function placedPointMistake(name: string, answer: string, expected: string): string | null {
	if (isPlacedPointCorrect(answer, expected)) return null;
	const placed = readPointAnswer(answer);
	if (placed === null) return name === '' ? NOTHING_PLACED : `Tu n’as pas placé ${name}.`;
	const where = `Tu as placé ${name === '' ? 'le point' : name} en ${pointText(placed.x, placed.y)}`;
	const target = readPointAnswer(expected);
	const swapped = target !== null && samePoint(placed, { x: target.y, y: target.x });
	return swapped ? `${where} : ${SWAPPED}.` : `${where}.`;
}
