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

/** Start/end positions for instrument movement animation. */
export interface InstrumentMove {
	fromX: number;
	fromY: number;
	fromRotation: number;
	toX: number;
	toY: number;
	toRotation: number;
}

/** Animation state for progressive drawing of elements. */
export interface DrawAnimationState {
	/** IDs of drawable elements currently being drawn (from the current step). */
	animatingIds: Set<string>;
	/** IDs of point elements being created with fade+bump (from the current step). */
	animatingPointIds: Set<string>;
	/** Progress 0-1 within the current step. */
	drawProgress: number;
	/** Instrument types auto-shown for this step (hidden when drawProgress >= 1). */
	autoInstruments: Set<InstrumentType>;
	/** Movement animations for instruments (from previous position to new position). */
	instrumentMoves: Map<InstrumentType, InstrumentMove>;
	/** Progress value (0-1) at which instrument movement ends. */
	movePhaseEnd: number;
	/** Progress value (0-1) at which compass raise ends and actual drawing begins. */
	drawPhaseStart: number;
	/** Progress value (0-1) at which actual drawing ends and compass lower begins. */
	drawPhaseEnd: number;
	/** Progress value (0-1) at which post-draw pause begins. */
	pausePhaseStart: number;
	/** Duration of the instrument move phase in ms (for fixed-ramp easing calculation). */
	moveDurationMs: number;
	/** Previous compass radius in math units (for opening animation). */
	compassPrevRadius: number;
	/** Current compass radius in math units. */
	compassCurRadius: number;
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
