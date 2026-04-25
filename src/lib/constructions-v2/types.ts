/**
 * Types for the constructions-v2 module.
 */

/** Supported instrument types. */
export type InstrumentType = 'ruler' | 'compass' | 'protractor' | 'setSquare' | 'pencil';

/** Runtime state of a virtual instrument. */
export interface InstrumentState {
	type: InstrumentType;
	visible: boolean;
	x: number;
	y: number;
	rotation: number;
	scale: number;
	opacity: number;
	/** Compass-specific: opening radius. */
	compassRadius?: number;
	/** 3D tilt for compass raise/lower animation. */
	rotateX?: number;
}

/** Metadata for a construction script. */
export interface ConstructionMeta {
	title?: string;
	description?: string;
	canvasWidth?: number;
	canvasHeight?: number;
}

/** Known directive names. */
export type DirectiveName =
	| 'pause'
	| 'instrument'
	| 'instruction'
	| 'vitesse'
	| 'cacher'
	| 'montrer';

/** Animation state for progressive drawing of elements. */
export interface DrawAnimationState {
	/** IDs of elements currently being drawn (from the current step). */
	animatingIds: Set<string>;
	/** Progress 0-1 within the current step. */
	drawProgress: number;
}

/** Drawable element types that should be animated. */
export const DRAWABLE_TYPES = new Set([
	'segment',
	'arcByAngles',
	'arcByPoints',
	'circleByRadius',
	'circleByPoint'
]);

/** Default instrument state factory. */
export function createDefaultInstrumentState(type: InstrumentType): InstrumentState {
	return {
		type,
		visible: false,
		x: 0,
		y: 0,
		rotation: 0,
		scale: 1,
		opacity: 1,
		...(type === 'compass' ? { compassRadius: 100, rotateX: 0 } : {})
	};
}
