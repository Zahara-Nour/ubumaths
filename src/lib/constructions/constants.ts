/**
 * Construction Constants - Default values and configuration constants
 *
 * This module provides sensible defaults for geometric construction
 * rendering. All values are designed to work well at typical screen
 * resolutions and provide good visual clarity.
 *
 * @module constructions/constants
 */

// =============================================================================
// SVG Constants
// =============================================================================

/**
 * SVG namespace URI for creating SVG elements
 */
export const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * XLink namespace URI for SVG links
 */
export const XLINK_NS = 'http://www.w3.org/1999/xlink';

// =============================================================================
// Default Colors
// =============================================================================

/**
 * Default color palette for constructions
 *
 * These colors are designed to be distinguishable, accessible,
 * and work well on both light and dark backgrounds.
 */
export const DEFAULT_COLORS = {
	/** Primary construction color (dark blue) */
	primary: '#1e40af',

	/** Secondary construction color (red) */
	secondary: '#dc2626',

	/** Tertiary construction color (green) */
	tertiary: '#16a34a',

	/** Highlight color (orange) */
	highlight: '#ea580c',

	/** Auxiliary/helper construction color (gray) */
	auxiliary: '#6b7280',

	/** Canvas background color */
	background: '#ffffff',

	/** Grid line color */
	grid: '#e5e7eb',

	/** Text color */
	text: '#1f2937',

	/** Instrument color (ruler, compass, etc.) */
	instrument: '#374151',

	/** Point fill color */
	pointFill: '#3b82f6',

	/** Point stroke color */
	pointStroke: '#1d4ed8'
} as const;

/**
 * Array of colors to cycle through for multiple objects
 */
export const COLOR_CYCLE = [
	DEFAULT_COLORS.primary,
	DEFAULT_COLORS.secondary,
	DEFAULT_COLORS.tertiary,
	DEFAULT_COLORS.highlight,
	'#7c3aed', // violet
	'#0891b2', // cyan
	'#c026d3', // fuchsia
	'#ca8a04' // yellow-600
] as const;

// =============================================================================
// Default Styles
// =============================================================================

/**
 * Default line width in pixels
 */
export const DEFAULT_LINE_WIDTH = 2;

/**
 * Default point radius in pixels
 */
export const DEFAULT_POINT_RADIUS = 4;

/**
 * Default font size for labels in pixels
 */
export const DEFAULT_FONT_SIZE = 14;

/**
 * Default font family for text elements
 */
export const DEFAULT_FONT_FAMILY = 'system-ui, -apple-system, sans-serif';

/**
 * Default opacity (fully opaque)
 */
export const DEFAULT_OPACITY = 1;

/**
 * Default dash pattern for dashed lines
 */
export const DASH_PATTERN_DASHED = '8,4';

/**
 * Default dash pattern for dotted lines
 */
export const DASH_PATTERN_DOTTED = '2,4';

/**
 * Complete default style object for geometric objects
 */
export const DEFAULT_STYLE = {
	color: DEFAULT_COLORS.primary,
	lineWidth: DEFAULT_LINE_WIDTH,
	lineStyle: 'solid' as const,
	opacity: DEFAULT_OPACITY
} as const;

// =============================================================================
// Default Canvas Configuration
// =============================================================================

/**
 * Default canvas width in pixels
 */
export const DEFAULT_CANVAS_WIDTH = 800;

/**
 * Default canvas height in pixels
 */
export const DEFAULT_CANVAS_HEIGHT = 600;

/**
 * Default grid spacing in pixels
 */
export const DEFAULT_GRID_SPACING = 20;

/**
 * Default canvas configuration
 */
export const DEFAULT_CANVAS_CONFIG = {
	width: DEFAULT_CANVAS_WIDTH,
	height: DEFAULT_CANVAS_HEIGHT,
	backgroundColor: DEFAULT_COLORS.background,
	showGrid: false,
	gridSpacing: DEFAULT_GRID_SPACING,
	gridColor: DEFAULT_COLORS.grid
} as const;

// =============================================================================
// Animation Defaults
// =============================================================================

/**
 * Default animation duration in milliseconds
 */
export const DEFAULT_ANIMATION_DURATION = 500;

/**
 * Default pause duration between steps in milliseconds
 */
export const DEFAULT_PAUSE_DURATION = 300;

/**
 * Default easing function name
 */
export const DEFAULT_EASING = 'easeInOut' as const;

/**
 * Animation frame interval target (60 FPS)
 */
export const ANIMATION_FRAME_INTERVAL = 1000 / 60;

/**
 * Minimum animation duration to avoid jarring movements
 */
export const MIN_ANIMATION_DURATION = 100;

/**
 * Maximum animation duration cap
 */
export const MAX_ANIMATION_DURATION = 5000;

// =============================================================================
// Instrument Defaults
// =============================================================================

/**
 * Default ruler length in pixels
 */
export const DEFAULT_RULER_LENGTH = 500;

/**
 * Default ruler width (height) in pixels
 */
export const DEFAULT_RULER_WIDTH = 40;

/**
 * Default protractor radius in pixels
 */
export const DEFAULT_PROTRACTOR_RADIUS = 150;

/**
 * Default compass initial opening (radius) in pixels
 */
export const DEFAULT_COMPASS_RADIUS = 100;

/**
 * Default set square size in pixels
 */
export const DEFAULT_SET_SQUARE_SIZE = 200;

/**
 * Default instrument configuration
 */
export const DEFAULT_INSTRUMENT_CONFIG = {
	ruler: {
		length: DEFAULT_RULER_LENGTH,
		width: DEFAULT_RULER_WIDTH,
		color: 'rgba(200, 200, 200, 0.8)',
		markingsColor: DEFAULT_COLORS.text
	},
	compass: {
		radius: DEFAULT_COMPASS_RADIUS,
		color: DEFAULT_COLORS.instrument,
		pencilColor: DEFAULT_COLORS.primary
	},
	protractor: {
		radius: DEFAULT_PROTRACTOR_RADIUS,
		color: 'rgba(200, 200, 200, 0.8)',
		markingsColor: DEFAULT_COLORS.text
	},
	setSquare: {
		size: DEFAULT_SET_SQUARE_SIZE,
		color: 'rgba(200, 200, 200, 0.8)',
		markingsColor: DEFAULT_COLORS.text
	}
} as const;

// =============================================================================
// Geometry Constants
// =============================================================================

/**
 * Degrees to radians conversion factor
 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Radians to degrees conversion factor
 */
export const RAD_TO_DEG = 180 / Math.PI;

/**
 * Tolerance for floating-point comparisons
 */
export const EPSILON = 1e-10;

/**
 * Default angle mark radius in pixels
 */
export const DEFAULT_ANGLE_MARK_RADIUS = 20;

/**
 * Right angle marker size in pixels
 */
export const RIGHT_ANGLE_SIZE = 10;

// =============================================================================
// Z-Index Layers
// =============================================================================

/**
 * Z-index values for layering elements
 *
 * Higher values appear on top of lower values.
 */
export const Z_INDEX = {
	/** Canvas background */
	background: 0,

	/** Grid lines */
	grid: 1,

	/** Filled shapes (polygons, filled circles) */
	fills: 10,

	/** Lines, segments, circles (outlines) */
	strokes: 20,

	/** Points */
	points: 30,

	/** Labels and text */
	labels: 40,

	/** Instruments (ruler, compass, etc.) */
	instruments: 100,

	/** UI overlays */
	overlay: 200
} as const;

// =============================================================================
// Script Format
// =============================================================================

/**
 * Current construction script format version
 *
 * Increment when making breaking changes to the script format.
 */
export const SCRIPT_VERSION = 1;

/**
 * Supported script versions for backwards compatibility
 */
export const SUPPORTED_VERSIONS = [1] as const;

// =============================================================================
// Limits and Constraints
// =============================================================================

/**
 * Maximum number of objects allowed in a single construction
 */
export const MAX_OBJECTS = 500;

/**
 * Maximum number of steps in a construction script
 */
export const MAX_STEPS = 1000;

/**
 * Maximum parameter value for numeric parameters
 */
export const MAX_PARAM_VALUE = 10000;

/**
 * Minimum parameter value for numeric parameters
 */
export const MIN_PARAM_VALUE = -10000;

/**
 * Maximum coordinate value
 */
export const MAX_COORDINATE = 10000;

/**
 * Minimum coordinate value
 */
export const MIN_COORDINATE = -10000;

/**
 * Maximum animation duration in milliseconds
 */
export const MAX_DURATION_MS = 30000;

// =============================================================================
// Expression Patterns
// =============================================================================

/**
 * Regex pattern for parameter references in expressions
 *
 * Matches: $paramName, $objectId.x, $objectId.y
 */
export const PARAM_REF_PATTERN = /\$([a-zA-Z][a-zA-Z0-9_]*)(?:\.(x|y))?/g;

/**
 * Regex pattern for validating object identifiers
 */
export const OBJECT_ID_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

/**
 * Regex pattern for validating parameter names
 */
export const PARAM_NAME_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;
