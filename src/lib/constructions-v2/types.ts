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
