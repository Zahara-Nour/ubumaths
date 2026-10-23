/**
 * Constants for construction animations.
 */

/** Default animation duration for geometric steps (ms). */
export const DEFAULT_STEP_DURATION = 500;

/** Default pause duration for @pause without argument (ms). */
export const DEFAULT_PAUSE_DURATION = 300;

/** Animation speed: milliseconds per pixel traveled. */
export const MS_PER_PIXEL = 8;

/** Animation speed: milliseconds per degree rotated. */
export const MS_PER_DEGREE = 20;

/** Minimum step duration (ms). */
export const MIN_STEP_DURATION = 1000;

/** Maximum step duration (ms). */
export const MAX_STEP_DURATION = 5000;

/** Automatic pause after drawing, in ms. */
export const AUTO_PAUSE_BETWEEN_STEPS = 500;

/** Pause de lecture par caractère de consigne (≈ 15 caractères lus par seconde), en ms. */
export const READING_MS_PER_CHAR = 60;

/** Pause de lecture maximale après une sous-étape, en ms. */
export const MAX_READING_PAUSE = 4000;

/** Fixed duration of ease-in / ease-out ramp for instrument movement, in ms. */
export const INSTRUMENT_RAMP_MS = 300;

/** Speed multiplier for instrument movement relative to drawing speed.
 *  Instruments move this many times faster than the drawing trace. */
export const INSTRUMENT_MOVE_SPEED_FACTOR = 3;

/** Duration of compass raise animation (before drawing), in ms. */
export const COMPASS_RAISE_MS = 400;

/** Duration of compass lower animation (after drawing), in ms. */
export const COMPASS_LOWER_MS = 400;

/**
 * Écartement du compas qu'on vient de prendre (première utilisation), en unités math :
 * il s'ouvre de là jusqu'à l'écartement voulu pendant son déplacement.
 */
export const COMPASS_CLOSED_OPENING = 0.5;

/**
 * Rayon extérieur du rapporteur, en unités math (156 px à 40 px/u) : dessin
 * de `Protractor.svelte` et repère de `bissectrice @mesure`.
 */
export const PROTRACTOR_RADIUS = 156 / 40;
