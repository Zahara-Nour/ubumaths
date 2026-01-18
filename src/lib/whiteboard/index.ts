/**
 * Whiteboard Module
 *
 * Interactive whiteboard for educational math content.
 *
 * @module whiteboard
 */

// Types
export type {
	WhiteboardDocument,
	Page,
	WhiteboardElement,
	StrokeElement,
	ShapeElement,
	TextBlockElement,
	ImageElement,
	PageBackground,
	BackgroundImage,
	BackgroundPdf,
	BackgroundPlain,
	BackgroundStyle,
	Point,
	StrokeToolType,
	ShapeType,
	PageFormatKey,
	InstrumentType,
	InstrumentState,
	FillMode,
	StrokeStyle,
	SloppinessPreset
} from './types/document';

export {
	createEmptyDocument,
	createEmptyPage,
	createDefaultInstruments,
	PAGE_FORMATS,
	DEFAULT_PAGE_FORMAT,
	UBW_FILE_VERSION,
	DEFAULT_INSTRUMENTS,
	INSTRUMENT_LABELS,
	FILL_MODE_LABELS,
	STROKE_STYLE_LABELS,
	SLOPPINESS_PRESETS,
	getSloppinessPreset
} from './types/document';

// File format validation
export type { ValidatedWhiteboardDocument, ValidationResult } from './types/file-format';

export { validateDocument, isVersionCompatible, getPageFormats } from './types/file-format';

// Serialization
export {
	serialize,
	deserialize,
	serializeToBlob,
	deserializeFromFile,
	generateFilename,
	downloadDocument,
	UBW_MIME_TYPE,
	UBW_EXTENSION
} from './core/serialization';

// History
export type { HistoryManager } from './core/history.svelte';
export { createHistoryManager } from './core/history.svelte';

// Store
export type {
	Tool,
	DrawingTool,
	ShapeTool,
	ActionTool,
	InstrumentTool,
	ToolSettings
} from './stores/whiteboard.svelte';
export { whiteboardStore } from './stores/whiteboard.svelte';

// Stroke smoothing
export type { SmoothingOptions, BoundingBox } from './core/stroke-smoothing';
export {
	smoothStroke,
	getToolOptions,
	pointsToSvgPath,
	getBoundingBox,
	doStrokesIntersect
} from './core/stroke-smoothing';

// Shapes
export type { ShapeOptions, ShapeRenderProps, ShapeBounds } from './core/shapes';
export {
	createShapeElement,
	getShapeSvgProps,
	calculateShapeBounds,
	isPointInShapeBounds,
	getPolygonVertices,
	getStarVertices
} from './core/shapes';

// Rough renderer (for hand-drawn style shapes - all shapes use roughjs)
export type { RoughRenderResult } from './core/rough-renderer';
export { renderRoughShape, renderRoughShapeToSvgString } from './core/rough-renderer';

// Components
export { default as Whiteboard } from './components/Whiteboard.svelte';
export { default as WhiteboardCanvas } from './components/WhiteboardCanvas.svelte';
export { default as WhiteboardToolbar } from './components/WhiteboardToolbar.svelte';
export { default as InstrumentLayer } from './components/InstrumentLayer.svelte';
