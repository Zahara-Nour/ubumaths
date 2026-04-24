/**
 * Constructions v2 — construction animations on top of geometry-core.
 */

export { ConstructionExecutor } from './core/executor';
export type { InstrumentType, InstrumentState, ConstructionMeta, DirectiveName } from './types';
export { createDefaultInstrumentState } from './types';
export {
	DEFAULT_STEP_DURATION,
	DEFAULT_PAUSE_DURATION,
	MS_PER_PIXEL,
	MS_PER_DEGREE,
	MIN_STEP_DURATION,
	MAX_STEP_DURATION
} from './constants';
