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

/** Fixed duration of ease-in / ease-out ramp for instrument movement, in ms. */
export const INSTRUMENT_RAMP_MS = 300;

/** Speed multiplier for instrument movement relative to drawing speed.
 *  Instruments move this many times faster than the drawing trace. */
export const INSTRUMENT_MOVE_SPEED_FACTOR = 3;
