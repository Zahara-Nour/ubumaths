/**
 * Constructions v2 — construction animations on top of geometry-core.
 */

// Core
export { ConstructionExecutor } from './core/executor';
export {
	Timeline,
	createInitialTimelineState,
	formatTime,
	formatPlaybackRate
} from './core/timeline.svelte';
export type { TimelineState, TimelineUpdateFn } from './core/timeline.svelte';
export { partialSegment, partialCircle, partialArc, interpolate } from './core/animator';

// Types
export type { InstrumentType, InstrumentState, ConstructionMeta, DirectiveName } from './types';
export { createDefaultInstrumentState } from './types';

// Constants
export {
	DEFAULT_STEP_DURATION,
	DEFAULT_PAUSE_DURATION,
	MS_PER_PIXEL,
	MS_PER_DEGREE,
	MIN_STEP_DURATION,
	MAX_STEP_DURATION
} from './constants';

// Components
export {
	ConstructionPlayer,
	ConstructionCanvas,
	PlayerControls,
	TimelineSlider,
	SpeedControl
} from './components/index';

// Instruments
export { rulerPosition, compassPosition, applyPosition } from './instruments/positioning';
