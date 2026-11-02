/**
 * Point à placer sur le cercle trigonométrique — crans, réponse, juge, correction
 * ===============================================================================
 *
 * L'élève pose des points nommés sur le cercle d'un bloc ```trig
 * (`placer: M = 2*pi/3 ; N = -pi/4`, chantier `docs/wip/cercle-trotteuse-progress.md`
 * § 4 et § 6). Un point se pose toujours sur un CRAN (aimant) : un multiple de
 * π/12, 24 crans par tour, qui couvrent π/6, π/4, π/3 et leurs associés.
 *
 * La réponse d'une case (un point) est le cran, de 0 à 23 (`'8'` pour 2π/3) ;
 * la réponse attendue est la mesure principale du point, dans ]−π ; π], écrite
 * en LaTeX (`\frac{2\pi}{3}`) : c'est elle que lit le prof. Le juge compare les
 * crans, donc modulo 2π (`13*pi/6` ↔ π/6).
 *
 * Calcul pur, sans Svelte : l'écran (aimant, clavier) et le générateur
 * (réponse attendue) s'en servent.
 *
 * @module ubumark/utils/trig-placer
 */

import { toPrincipalLabel } from '../parser/trig-circle-parser';

// Constantes

/** Nombre de crans par tour : un tous les π/12 (décision 5) */
export const TRIG_PLACER_STEPS = 24;

/** Largeur (et hauteur) du dessin du cercle, en unités du SVG */
export const TRIG_SVG_SIZE = 320;
/** Rayon du cercle, en unités du SVG */
export const TRIG_RADIUS = 120;

const STEP = (2 * Math.PI) / TRIG_PLACER_STEPS;
/** Écart toléré entre un angle et son cran (calculs en virgule flottante) */
const TOLERANCE = 1e-9;

/** Réponse d'une case : le cran, en chiffres */
const ANSWER_REGEX = /^\s*(\d{1,2})\s*$/;

/**
 * Mesure en LaTeX, telle qu'écrite par `toPrincipalLabel` : `0`, `\pi`,
 * `-\frac{\pi}{4}`, `\frac{2\pi}{3}`
 */
const LATEX_REGEX = /^(-?)(?:\\frac\{(\d*)\\pi\}\{(\d+)\}|(\d*)\\pi|(0))$/;

// Functions

/** Ramène un rang de cran dans [0 ; 24[ */
function wrap(step: number): number {
	return ((step % TRIG_PLACER_STEPS) + TRIG_PLACER_STEPS) % TRIG_PLACER_STEPS;
}

/** Le cran d'un angle multiple de π/12, modulo 2π ; null s'il tombe entre deux crans */
export function stepOfRadians(radians: number): number | null {
	const exact = radians / STEP;
	const k = Math.round(exact);
	if (Math.abs(exact - k) > TOLERANCE * Math.max(1, Math.abs(exact))) return null;
	return wrap(k);
}

/** Aimant : le cran le plus proche d'un angle quelconque */
export function nearestStep(radians: number): number {
	return wrap(Math.round(radians / STEP));
}

/** L'angle d'un cran, dans [0 ; 2π[ */
export function stepRadians(step: number): number {
	return wrap(step) * STEP;
}

/** Clavier, boutons : `delta` crans depuis `from`, en faisant le tour */
export function moveStep(from: number, delta: number): number {
	return wrap(from + delta);
}

/** Réponse d'une case : le cran écrit (`'8'`) */
export function stepAnswer(step: number): string {
	return String(wrap(step));
}

/** Le cran d'une réponse écrite par `stepAnswer` ; null si vide ou illisible */
export function readStepAnswer(answer: string): number | null {
	const match = ANSWER_REGEX.exec(answer);
	if (!match) return null;
	const step = Number(match[1]);
	return step < TRIG_PLACER_STEPS ? step : null;
}

/** Mesure principale d'un cran : l'étiquette de `toPrincipalLabel` */
function principalOf(step: number) {
	return toPrincipalLabel({ expression: '', radians: stepRadians(step) });
}

/** Réponse attendue : la mesure principale du cran, en LaTeX (`\frac{2\pi}{3}`) */
export function expectedStepAnswer(step: number): string {
	return principalOf(step).latex ?? '0';
}

/** Mesure principale écrite pour l'élève : `3π/4`, `−π/4` (vrai signe moins) */
export function principalText(step: number): string {
	return principalOf(step).expression.replace('-', '−');
}

/** Le cran d'une mesure écrite par `expectedStepAnswer` ; null si illisible */
export function stepOfLatex(latex: string): number | null {
	const match = LATEX_REGEX.exec(latex.trim());
	if (!match) return null;
	if (match[5] !== undefined) return 0;
	const sign = match[1] === '-' ? -1 : 1;
	const fraction = match[3] !== undefined;
	const numerator = Number((fraction ? match[2] : match[4]) || '1');
	const denominator = fraction ? Number(match[3]) : 1;
	return stepOfRadians((sign * numerator * Math.PI) / denominator);
}

/** Le point de l'élève (`answer`, un cran) est-il sur l'angle attendu (`expected`) ? */
export function isPlacedAngleCorrect(answer: string, expected: string): boolean {
	const placed = readStepAnswer(answer);
	const target = stepOfLatex(expected);
	return placed !== null && target !== null && placed === target;
}

/**
 * La phrase de la correction pour un point : null s'il est juste ; « Tu n’as pas
 * placé M. » ; « Ton point M est sur 3π/4. » (mesure principale, décision 7)
 */
export function placedAngleMistake(name: string, answer: string, expected: string): string | null {
	if (isPlacedAngleCorrect(answer, expected)) return null;
	const placed = readStepAnswer(answer);
	if (placed === null) return `Tu n’as pas placé ${name}.`;
	return `Ton point ${name} est sur ${principalText(placed)}.`;
}
