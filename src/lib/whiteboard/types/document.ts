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
export type StrokeToolType = 'pen' | 'marker' | 'highlighter' | 'eraser';

/** Shape types */
export type ShapeType = 'line' | 'rectangle' | 'circle' | 'arrow' | 'pentagon' | 'hexagon' | 'star';

/** Stroke/line style for shapes (like Excalidraw: solid, dashed, dotted) */
export type StrokeStyle = 'solid' | 'dashed' | 'dotted';

/** Stroke style labels for UI */
export const STROKE_STYLE_LABELS: Record<StrokeStyle, string> = {
	solid: 'Plein',
	dashed: 'Tirets',
	dotted: 'Pointillé'
};

/** Sloppiness presets for shapes (like Excalidraw) - controls roughjs roughness */
export type SloppinessPreset = 'architect' | 'artist' | 'cartoonist';

/** Sloppiness preset configuration with roughness value and label */
export const SLOPPINESS_PRESETS: Record<SloppinessPreset, { roughness: number; label: string }> = {
	architect: { roughness: 0, label: 'Architecte' },
	artist: { roughness: 1, label: 'Artiste' },
	cartoonist: { roughness: 2, label: 'Caricaturiste' }
};

/** Get sloppiness preset from roughness value */
export function getSloppinessPreset(roughness: number): SloppinessPreset {
	if (roughness <= 0.5) return 'architect';
	if (roughness <= 1.5) return 'artist';
	return 'cartoonist';
}

/** Fill mode for shapes (includes roughjs styles for sketch mode) */
export type FillMode = 'none' | 'solid' | 'hatched' | 'hachure' | 'crosshatch' | 'zigzag';

/** Fill mode labels for UI */
export const FILL_MODE_LABELS: Record<FillMode, string> = {
	none: 'Sans fond',
	solid: 'Couleur unie',
	hatched: 'Hachuré (lignes)',
	hachure: 'Hachures',
	crosshatch: 'Croisé',
	zigzag: 'Zigzag'
};

/**
 * Get SVG stroke-dasharray value for a stroke style
 * Uses Excalidraw's algorithm:
 * - Dashed: fixed 8px dash, gap scales with strokeWidth (8 + strokeWidth)
 * - Dotted: fixed 1.5px dot, gap scales with strokeWidth (6 + strokeWidth)
 */
export function getStrokeDashArray(style: StrokeStyle, strokeWidth: number): string | undefined {
	switch (style) {
		case 'solid':
			return undefined;
		case 'dashed':
			return `8 ${8 + strokeWidth}`;
		case 'dotted':
			return `1.5 ${6 + strokeWidth}`;
	}
}

// =============================================================================
// Corner Radius (Excalidraw-style adaptive algorithm)
// =============================================================================

/** Default adaptive radius used for large shapes (matches Excalidraw) */
export const DEFAULT_ADAPTIVE_RADIUS = 32;

/** Proportional radius factor for small shapes (matches Excalidraw) */
export const DEFAULT_PROPORTIONAL_RADIUS = 0.25;

/** Cutoff size below which proportional radius is used */
const CUTOFF_SIZE = DEFAULT_ADAPTIVE_RADIUS / DEFAULT_PROPORTIONAL_RADIUS; // 128px

/**
 * Calculate adaptive corner radius like Excalidraw.
 * For small shapes: uses proportional radius (25% of min dimension)
 * For large shapes: uses fixed radius (32px)
 *
 * @param width - Width of the shape
 * @param height - Height of the shape
 * @param hasRoundedCorners - Whether rounded corners are enabled (cornerRadius > 0)
 * @returns The actual corner radius to use for rendering
 */
export function getAdaptiveCornerRadius(
	width: number,
	height: number,
	hasRoundedCorners: boolean
): number {
	if (!hasRoundedCorners) return 0;

	const minDimension = Math.min(Math.abs(width), Math.abs(height));

	// For small shapes, use proportional radius (25% of min dimension)
	if (minDimension <= CUTOFF_SIZE) {
		return minDimension * DEFAULT_PROPORTIONAL_RADIUS;
	}

	// For large shapes, use fixed radius
	return DEFAULT_ADAPTIVE_RADIUS;
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
	/** Stroke style (solid, dashed, dotted), default solid */
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
	/** Optional markdown label centered on the shape (supports math: $x^2$, bold, italic) */
	readonly labelMarkdown?: string;
	/** Seed for deterministic roughjs rendering */
	readonly roughSeed?: number;
	/** Roughness level for roughjs (0 = clean, 1 = sketchy, 2 = very sketchy) */
	readonly roughness?: number;
}

// =============================================================================
// Arrow Types
// =============================================================================

/** Arrow type discriminator for different arrow rendering modes */
export type ArrowType = 'sharp' | 'curved' | 'elbow';

/** Arrow type labels for UI */
export const ARROW_TYPE_LABELS: Record<ArrowType, string> = {
	sharp: 'Flèche droite',
	curved: 'Flèche courbée',
	elbow: 'Flèche coudée'
};

/**
 * Arrowhead style types (like Excalidraw)
 * Used for both start and end of arrows
 */
export type Arrowhead =
	| 'arrow' // Default triangle (current)
	| 'triangle' // Filled triangle
	| 'circle' // Filled circle (for probability trees)
	| 'bar' // Perpendicular line
	| 'diamond' // Diamond shape (flowcharts)
	| 'none'; // No arrowhead

/** Arrowhead labels for UI */
export const ARROWHEAD_LABELS: Record<Arrowhead, string> = {
	arrow: 'Flèche',
	triangle: 'Triangle plein',
	circle: 'Cercle',
	bar: 'Barre',
	diamond: 'Losange',
	none: 'Aucun'
};

/** Default arrowheads for new arrows */
export const DEFAULT_START_ARROWHEAD: Arrowhead | null = null;
export const DEFAULT_END_ARROWHEAD: Arrowhead = 'arrow';

/**
 * Heading direction for elbow arrow routing (Excalidraw-style)
 * Tuple [dx, dy] representing cardinal direction unit vectors
 * Used for determining arrow entry/exit directions from shapes
 */
export type Heading = readonly [1, 0] | readonly [0, 1] | readonly [-1, 0] | readonly [0, -1];

/** Heading constants - cardinal direction unit vectors */
export const HEADING_RIGHT: Heading = [1, 0] as const;
export const HEADING_DOWN: Heading = [0, 1] as const;
export const HEADING_LEFT: Heading = [-1, 0] as const;
export const HEADING_UP: Heading = [0, -1] as const;

/** All headings for iteration */
export const ALL_HEADINGS: readonly Heading[] = [
	HEADING_UP,
	HEADING_RIGHT,
	HEADING_DOWN,
	HEADING_LEFT
] as const;

/** Heading labels for UI (keyed by string representation) */
export const HEADING_LABELS: Record<string, string> = {
	'0,-1': 'Haut',
	'0,1': 'Bas',
	'-1,0': 'Gauche',
	'1,0': 'Droite'
};

/** Convert heading to display label */
export function getHeadingLabel(heading: Heading): string {
	return HEADING_LABELS[`${heading[0]},${heading[1]}`] ?? 'Inconnu';
}

/**
 * @deprecated Use arrowType: 'elbow' with heading system instead
 * Direction of the first segment for elbow arrows
 */
export type ElbowDirection = 'horizontal-first' | 'vertical-first';

/** Elbow direction labels for UI */
export const ELBOW_DIRECTION_LABELS: Record<ElbowDirection, string> = {
	'horizontal-first': "Horizontal d'abord",
	'vertical-first': "Vertical d'abord"
};

/**
 * Waypoint for curved arrows.
 * @deprecated Use points[] array instead. Waypoints are migrated to points.
 * Waypoints define the control points that the curve passes through.
 */
export interface ArrowWaypoint {
	/** Unique identifier for the waypoint */
	readonly id: string;
	/** Position of the waypoint in canvas coordinates */
	readonly position: Point;
}

// =============================================================================
// Binding Types (Arrow-to-Shape connections)
// =============================================================================

/**
 * Anchor point for binding an arrow endpoint to a shape.
 * Uses normalized coordinates (0-1) for position independence.
 */
export interface BindingAnchor {
	/** ID of the target shape element */
	readonly elementId: string;
	/**
	 * Position in normalized coordinates (0-1) within the target's bounding box.
	 * (0,0) = top-left, (1,1) = bottom-right, (0.5, 0.5) = center
	 */
	readonly normalizedPosition: Point;
	/**
	 * Point on the shape perimeter in normalized coordinates.
	 * Different from normalizedPosition as it follows the actual contour.
	 */
	readonly perimeterPoint: Point;
	/** Gap between arrow tip and shape perimeter in pixels (default: 4) */
	readonly gap: number;
}

/**
 * Arrow element with optional bindings to shapes.
 * When bound, the arrow endpoint automatically follows shape transformations.
 *
 * Arrow types:
 * - 'sharp' (default): Straight line from start to end
 * - 'curved': Smooth Bezier curve through waypoints
 * - 'elbow': 90-degree bends (L-shaped path)
 *
 * Data model:
 * - `points[]` is the unified model for all arrow types
 * - `start` and `end` are computed as `points[0]` and `points[n-1]`
 * - For sharp arrows: points = [start, end]
 * - For curved arrows: points = [start, ...waypoints, end]
 * - For elbow arrows: points = [start, ...routedPoints, end]
 */
export interface ArrowElement extends ShapeElement {
	readonly shapeType: 'arrow';
	/** Arrow rendering type: sharp (default), curved, or elbow */
	readonly arrowType?: ArrowType;

	// =========================================================================
	// Unified points[] model (Excalidraw-style)
	// =========================================================================

	/**
	 * Array of points defining the arrow path.
	 * - Sharp: [start, end]
	 * - Curved: [start, ...intermediatePoints, end]
	 * - Elbow: [start, ...routedBendPoints, end]
	 *
	 * When present, this is the source of truth for the arrow geometry.
	 * `start` and `end` should match `points[0]` and `points[n-1]`.
	 */
	readonly points?: readonly Point[];

	// =========================================================================
	// Arrowhead styles (Excalidraw-style)
	// =========================================================================

	/** Arrowhead style at the start of the arrow (null = none) */
	readonly startArrowhead?: Arrowhead | null;
	/** Arrowhead style at the end of the arrow (default: 'arrow') */
	readonly endArrowhead?: Arrowhead | null;

	// =========================================================================
	// Heading system for elbow routing (Excalidraw-style)
	// =========================================================================

	/** Direction the arrow exits from the start point/shape */
	readonly startHeading?: Heading | null;
	/** Direction the arrow enters the end point/shape */
	readonly endHeading?: Heading | null;

	// =========================================================================
	// Bindings
	// =========================================================================

	/** Binding for the start point of the arrow (optional) */
	readonly startBinding?: BindingAnchor | null;
	/** Binding for the end point of the arrow (optional) */
	readonly endBinding?: BindingAnchor | null;

	// =========================================================================
	// Legacy fields (deprecated, kept for migration)
	// =========================================================================

	/**
	 * @deprecated Use points[] array instead
	 * Waypoints for curved arrows (defines the path the curve passes through)
	 */
	readonly waypoints?: readonly ArrowWaypoint[];
	/**
	 * @deprecated Use arrowType: 'elbow' instead
	 * If true, arrow bends at 90 degree angles (elbow arrow)
	 */
	readonly elbowed?: boolean;
	/**
	 * @deprecated Use startHeading/endHeading instead
	 * Direction of first segment for elbow arrows
	 */
	readonly elbowDirection?: ElbowDirection;
}

// =============================================================================
// Arrow Helper Functions
// =============================================================================

/**
 * Get the points array for an arrow element.
 * Handles both new points[] model and legacy start/end + waypoints.
 *
 * @param arrow - The arrow element
 * @returns Array of points defining the arrow path
 */
export function getArrowPoints(arrow: ArrowElement): readonly Point[] {
	// If points[] exists, use it directly
	if (arrow.points && arrow.points.length >= 2) {
		return arrow.points;
	}

	// Legacy: construct from start, waypoints, end
	const waypoints = arrow.waypoints ?? [];
	return [arrow.start, ...waypoints.map((wp) => wp.position), arrow.end];
}

/**
 * Get the start point of an arrow.
 * Works with both points[] model and legacy start property.
 */
export function getArrowStart(arrow: ArrowElement): Point {
	if (arrow.points && arrow.points.length >= 1) {
		return arrow.points[0];
	}
	return arrow.start;
}

/**
 * Get the end point of an arrow.
 * Works with both points[] model and legacy end property.
 */
export function getArrowEnd(arrow: ArrowElement): Point {
	if (arrow.points && arrow.points.length >= 2) {
		return arrow.points[arrow.points.length - 1];
	}
	return arrow.end;
}

/**
 * Get intermediate points (excluding start and end) for an arrow.
 * Useful for curved arrows and elbow routing.
 */
export function getArrowIntermediatePoints(arrow: ArrowElement): readonly Point[] {
	const points = getArrowPoints(arrow);
	if (points.length <= 2) return [];
	return points.slice(1, -1);
}

/**
 * Create an arrow with the unified points[] model.
 * This is the preferred way to create new arrows.
 */
export function createArrowPoints(
	start: Point,
	end: Point,
	intermediatePoints?: readonly Point[]
): readonly Point[] {
	if (intermediatePoints && intermediatePoints.length > 0) {
		return [start, ...intermediatePoints, end];
	}
	return [start, end];
}

/**
 * Get the effective arrowhead at the start.
 * Returns null if not set (meaning no arrowhead at start).
 */
export function getStartArrowhead(arrow: ArrowElement): Arrowhead | null {
	return arrow.startArrowhead ?? null;
}

/**
 * Get the effective arrowhead at the end.
 * Returns 'arrow' by default (standard triangle arrowhead).
 */
export function getEndArrowhead(arrow: ArrowElement): Arrowhead {
	return arrow.endArrowhead ?? 'arrow';
}

/** Text block element - rich text with markdown */
export interface TextBlockElement {
	readonly id: string;
	readonly type: 'textblock';
	readonly position: Point;
	readonly width: number;
	readonly height: number;
	readonly markdownContent: string;
	/** Optional font family for the text block */
	readonly fontFamily?: string;
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
	readonly rotation?: number; // Rotation in degrees (0-360)
}

/** Group element - collection of elements that move/select as one unit */
export interface GroupElement {
	readonly id: string;
	readonly type: 'group';
	readonly children: readonly WhiteboardElement[];
	/** Rotation angle in degrees (0-360), default 0 */
	readonly rotation?: number;
}

/** Union of all element types */
export type WhiteboardElement =
	| StrokeElement
	| ShapeElement
	| TextBlockElement
	| ImageElement
	| GroupElement;

// =============================================================================
// Background Types
// =============================================================================

/** Background style types */
export type BackgroundStyle =
	| 'plain'
	| 'grid'
	| 'ruled'
	| 'dotted'
	| 'triangular'
	| 'triangular-dotted'
	| 'hexagonal'
	| 'hexagonal-dotted';

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
	readonly gridSpacing?: number; // Spacing between lines/dots in pixels (default: 20)
	readonly gridOpacity?: number; // Opacity of grid lines (0-1, default: 0.3)
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
