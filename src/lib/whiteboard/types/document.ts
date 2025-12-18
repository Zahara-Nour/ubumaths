/**
 * Whiteboard Document Types
 *
 * Core type definitions for the whiteboard feature.
 * All types are immutable (readonly) for predictable state management.
 *
 * @module whiteboard/types/document
 */

// =============================================================================
// Constants
// =============================================================================

/** Current file format version */
export const UBW_FILE_VERSION = 1 as const;

/** Page format presets with dimensions in pixels at 96 DPI */
export const PAGE_FORMATS = {
	/** A4 Portrait (210mm × 297mm) */
	A4: { width: 794, height: 1123, label: 'A4' },
	/** A4 Landscape */
	A4_LANDSCAPE: { width: 1123, height: 794, label: 'A4 Paysage' },
	/** A3 Portrait (297mm × 420mm) */
	A3: { width: 1123, height: 1587, label: 'A3' },
	/** A3 Landscape */
	A3_LANDSCAPE: { width: 1587, height: 1123, label: 'A3 Paysage' },
	/** 16:9 Widescreen (1920×1080) */
	WIDESCREEN_16_9: { width: 1920, height: 1080, label: '16:9' },
	/** 4:3 Standard (1024×768) */
	STANDARD_4_3: { width: 1024, height: 768, label: '4:3' }
} as const;

export type PageFormatKey = keyof typeof PAGE_FORMATS;

/** Default page format */
export const DEFAULT_PAGE_FORMAT: PageFormatKey = 'A4';

// =============================================================================
// Point Types
// =============================================================================

/** A 2D point with optional pressure data from stylus */
export interface Point {
	readonly x: number;
	readonly y: number;
	readonly pressure?: number;
}

// =============================================================================
// Element Types
// =============================================================================

/** Tool types for strokes */
export type StrokeToolType = 'pen' | 'highlighter' | 'eraser';

/** Shape types */
export type ShapeType = 'line' | 'rectangle' | 'circle' | 'arrow' | 'pentagon' | 'hexagon' | 'star';

/** Stroke/line style for shapes */
export type StrokeStyle = 'solid' | 'dashed' | 'dotted' | 'dashdot';

/** Stroke style labels for UI */
export const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
	solid: 'Plein',
	dashed: 'Tirets',
	dotted: 'Pointillé',
	dashdot: 'Mixte'
};

/** Fill mode for shapes */
export type FillMode = 'none' | 'solid' | 'hatched';

/** Fill mode labels for UI */
export const FILL_MODE_LABELS: Record<FillMode, string> = {
	none: 'Sans fond',
	solid: 'Couleur unie',
	hatched: 'Hachuré'
};

/**
 * Get SVG stroke-dasharray value for a stroke style
 * Values are relative to stroke width for consistent appearance
 */
export function getStrokeDashArray(style: StrokeStyle, strokeWidth: number): string | undefined {
	switch (style) {
		case 'solid':
			return undefined;
		case 'dashed':
			return `${strokeWidth * 4} ${strokeWidth * 2}`;
		case 'dotted':
			return `${strokeWidth} ${strokeWidth * 2}`;
		case 'dashdot':
			return `${strokeWidth * 4} ${strokeWidth * 2} ${strokeWidth} ${strokeWidth * 2}`;
	}
}

/** Stroke element - freehand drawing */
export interface StrokeElement {
	readonly id: string;
	readonly type: 'stroke';
	readonly toolType: StrokeToolType;
	readonly points: readonly Point[];
	readonly color: string;
	readonly width: number;
	readonly opacity: number;
	/** Stroke style (solid, dashed, dotted, dashdot), default solid */
	readonly strokeStyle?: StrokeStyle;
	/** Rotation angle in degrees (0-360), default 0 */
	readonly rotation?: number;
}

/** Shape element - geometric shapes */
export interface ShapeElement {
	readonly id: string;
	readonly type: 'shape';
	readonly shapeType: ShapeType;
	readonly start: Point;
	readonly end: Point;
	readonly color: string;
	readonly strokeWidth: number;
	readonly opacity: number;
	readonly strokeStyle?: StrokeStyle;
	/** Fill mode: none (transparent), solid (color), hatched (diagonal lines) */
	readonly fillMode?: FillMode;
	readonly fill?: string;
	readonly fillOpacity?: number;
	/** Corner radius for rounded corners (0 = sharp corners), default 0 */
	readonly cornerRadius?: number;
	/** Rotation angle in degrees (0-360), default 0 */
	readonly rotation?: number;
}

/** Text block element - rich text with markdown */
export interface TextBlockElement {
	readonly id: string;
	readonly type: 'textblock';
	readonly position: Point;
	readonly width: number;
	readonly height: number;
	readonly markdownContent: string;
}

/** Image element */
export interface ImageElement {
	readonly id: string;
	readonly type: 'image';
	readonly position: Point;
	readonly width: number;
	readonly height: number;
	readonly src: string; // Data URL or blob URL
	readonly originalFilename?: string;
}

/** Union of all element types */
export type WhiteboardElement = StrokeElement | ShapeElement | TextBlockElement | ImageElement;

// =============================================================================
// Background Types
// =============================================================================

/** Background style types */
export type BackgroundStyle = 'plain' | 'grid' | 'ruled' | 'dotted';

/** Image background */
export interface BackgroundImage {
	readonly type: 'image';
	readonly src: string;
	readonly width: number;
	readonly height: number;
}

/** PDF page as background */
export interface BackgroundPdf {
	readonly type: 'pdf';
	readonly pdfData: string; // Base64 encoded
	readonly pageIndex: number;
	readonly totalPages: number;
	readonly width: number;
	readonly height: number;
}

/** Plain/styled background */
export interface BackgroundPlain {
	readonly type: 'plain';
	readonly style: BackgroundStyle;
	readonly color: string;
}

/** Union of background types */
export type PageBackground = BackgroundImage | BackgroundPdf | BackgroundPlain;

// =============================================================================
// Instrument Types
// =============================================================================

/** Instrument types available in the whiteboard */
export type InstrumentType = 'ruler' | 'protractor' | 'setSquare';

/** State for a single instrument */
export interface InstrumentState {
	readonly type: InstrumentType;
	readonly visible: boolean;
	readonly x: number;
	readonly y: number;
	readonly rotation: number;
}

/** Default instrument configurations */
export const DEFAULT_INSTRUMENTS: Record<InstrumentType, Omit<InstrumentState, 'type'>> = {
	ruler: { visible: false, x: 100, y: 300, rotation: 0 },
	protractor: { visible: false, x: 300, y: 300, rotation: 0 },
	setSquare: { visible: false, x: 200, y: 200, rotation: 0 }
};

/** Instrument display labels */
export const INSTRUMENT_LABELS: Record<InstrumentType, string> = {
	ruler: 'Règle',
	protractor: 'Rapporteur',
	setSquare: 'Équerre'
};

/** Create default instruments state */
export function createDefaultInstruments(): Record<InstrumentType, InstrumentState> {
	return {
		ruler: { type: 'ruler', ...DEFAULT_INSTRUMENTS.ruler },
		protractor: { type: 'protractor', ...DEFAULT_INSTRUMENTS.protractor },
		setSquare: { type: 'setSquare', ...DEFAULT_INSTRUMENTS.setSquare }
	};
}

// =============================================================================
// Page & Document Types
// =============================================================================

/** A single page in the whiteboard document */
export interface Page {
	readonly id: string;
	readonly elements: readonly WhiteboardElement[];
	readonly background: PageBackground;
	readonly width: number;
	readonly height: number;
}

/** Complete whiteboard document */
export interface WhiteboardDocument {
	readonly id: string;
	readonly version: typeof UBW_FILE_VERSION;
	readonly title: string;
	readonly createdAt: string;
	readonly updatedAt: string;
	readonly pages: readonly Page[];
	readonly currentPageIndex: number;
	/** Instrument state (persisted across sessions) */
	readonly instruments: Record<InstrumentType, InstrumentState>;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new empty page with the specified format
 */
export function createEmptyPage(format: PageFormatKey = DEFAULT_PAGE_FORMAT): Page {
	const { width, height } = PAGE_FORMATS[format];
	return {
		id: crypto.randomUUID(),
		elements: [],
		background: {
			type: 'plain',
			style: 'plain',
			color: '#ffffff'
		},
		width,
		height
	};
}

/**
 * Create a new empty document with a single page
 */
export function createEmptyDocument(
	title: string = 'Sans titre',
	format: PageFormatKey = DEFAULT_PAGE_FORMAT
): WhiteboardDocument {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		version: UBW_FILE_VERSION,
		title,
		createdAt: now,
		updatedAt: now,
		pages: [createEmptyPage(format)],
		currentPageIndex: 0,
		instruments: createDefaultInstruments()
	};
}
