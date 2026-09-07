// Types
export type {
	Point,
	Viewport,
	ViewportMetrics,
	SampledCurve,
	LineStyle,
	LineWidthOption,
	ViewportInput
} from './types';
export { LINE_STYLES, LINE_WIDTHS, LINE_STYLE_DASHARRAY, viewportSchema } from './types';

// Sampling
export type { ParametricSampleResult } from './sampler';
export {
	DEFAULT_NUM_POINTS,
	isAsymptote,
	sampleFunction,
	sampleFunctionAdaptive,
	sampleWithDerivative,
	sampleParametric2D,
	sampleAtPoints
} from './sampler';

// Grid
export type { GridStep } from './grid';
export { computeGridStep } from './grid';

// Viewport operations
export type { CoordinateTransformer } from './viewport';
export {
	DEFAULT_VIEWPORT,
	createTransformer,
	panViewport,
	zoomViewport,
	resetViewport,
	createViewport,
	getViewportMetrics,
	isValidViewport,
	clampViewport,
	fitViewport
} from './viewport';
