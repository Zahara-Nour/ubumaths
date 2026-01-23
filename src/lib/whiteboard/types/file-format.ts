/**
 * Whiteboard File Format Schema
 *
 * Zod validation schemas for the .ubw file format.
 * All imported files must pass validation before being loaded.
 *
 * @module whiteboard/types/file-format
 */

import { z } from 'zod';
import { UBW_FILE_VERSION, PAGE_FORMATS } from './document';

// =============================================================================
// Point Schema
// =============================================================================

export const pointSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite(),
	pressure: z.number().min(0).max(1).optional()
});

// =============================================================================
// Binding Schemas
// =============================================================================

/** Point schema for normalized coordinates (typically 0-1 range, but can exceed for external points) */
const normalizedPointSchema = z.object({
	x: z.number().finite(),
	y: z.number().finite()
});

/** Schema for binding anchor - connects arrow endpoints to shapes */
export const bindingAnchorSchema = z.object({
	elementId: z.string().uuid(),
	normalizedPosition: normalizedPointSchema,
	perimeterPoint: normalizedPointSchema,
	gap: z.number().min(0).max(50).default(4)
});

/** Schema for arrow waypoints (used in curved arrows) */
export const arrowWaypointSchema = z.object({
	id: z.string().uuid(),
	position: pointSchema
});

/** Schema for arrowhead types (Excalidraw-style) */
export const arrowheadSchema = z.enum(['arrow', 'triangle', 'circle', 'bar', 'diamond', 'none']);

/** Schema for heading directions (for elbow arrow routing) - Excalidraw-style tuples */
export const headingSchema = z.union([
	z.tuple([z.literal(1), z.literal(0)]), // RIGHT
	z.tuple([z.literal(0), z.literal(1)]), // DOWN
	z.tuple([z.literal(-1), z.literal(0)]), // LEFT
	z.tuple([z.literal(0), z.literal(-1)]) // UP
]);

// =============================================================================
// Element Schemas
// =============================================================================

const strokeElementSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('stroke'),
	toolType: z.enum(['pen', 'marker', 'highlighter', 'eraser']),
	points: z.array(pointSchema).min(1).max(50000),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	width: z.number().positive().max(100),
	opacity: z.number().min(0).max(1),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional()
});

const shapeElementSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('shape'),
	shapeType: z.enum(['line', 'rectangle', 'circle', 'arrow', 'pentagon', 'hexagon', 'star']),
	start: pointSchema,
	end: pointSchema,
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	strokeWidth: z.number().positive().max(50),
	opacity: z.number().min(0).max(1).optional(),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
	fillMode: z.enum(['none', 'solid', 'hatched', 'hachure', 'crosshatch', 'zigzag']).optional(),
	fill: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	fillOpacity: z.number().min(0).max(1).optional(),
	cornerRadius: z.number().min(0).max(100).optional(),
	rotation: z.number().min(0).max(360).optional(),
	labelMarkdown: z.string().max(1000).optional(),
	// Arrow type fields (only used for arrow shapes)
	arrowType: z.enum(['sharp', 'curved', 'elbow']).optional(),
	// Unified points[] model (Excalidraw-style)
	points: z.array(pointSchema).min(2).max(100).optional(),
	// Arrowhead styles (Excalidraw-style)
	startArrowhead: arrowheadSchema.nullable().optional(),
	endArrowhead: arrowheadSchema.nullable().optional(),
	// Heading directions for elbow routing (Excalidraw-style)
	startHeading: headingSchema.nullable().optional(),
	endHeading: headingSchema.nullable().optional(),
	// Binding fields (only used for arrow shapes)
	startBinding: bindingAnchorSchema.nullable().optional(),
	endBinding: bindingAnchorSchema.nullable().optional(),
	// Legacy: waypoints (deprecated, use points[] instead)
	waypoints: z.array(arrowWaypointSchema).max(50).optional(),
	// Legacy: elbow arrow fields - deprecated, use arrowType instead
	elbowed: z.boolean().optional(),
	elbowDirection: z.enum(['horizontal-first', 'vertical-first']).optional(),
	// Roughjs rendering fields
	roughSeed: z.number().int().positive().optional(),
	roughness: z.number().min(0).max(3).optional()
});

const textBlockElementSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('textblock'),
	position: pointSchema,
	width: z.number().positive().max(10000),
	height: z.number().positive().max(10000),
	markdownContent: z.string().max(100000),
	fontFamily: z.string().max(100).optional()
});

const imageElementSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('image'),
	position: pointSchema,
	width: z.number().positive().max(10000),
	height: z.number().positive().max(10000),
	src: z.string().max(10_000_000), // Max ~10MB base64
	originalFilename: z.string().max(255).optional(),
	rotation: z.number().min(0).max(360).optional()
});

export const elementSchema = z.discriminatedUnion('type', [
	strokeElementSchema,
	shapeElementSchema,
	textBlockElementSchema,
	imageElementSchema
]);

// =============================================================================
// Annotation Schemas
// =============================================================================

/** Stamp types for annotations */
const stampTypeSchema = z.enum([
	'✓',
	'✗',
	'?',
	'!',
	'A',
	'B',
	'C',
	'D',
	'E',
	'F',
	'1',
	'2',
	'3',
	'4',
	'5',
	'6',
	'★',
	'♥',
	'👍',
	'👎',
	'💡',
	'⚠️'
]);

/** Annotation stroke tool types */
const annotationStrokeToolTypeSchema = z.enum(['pen', 'marker', 'highlighter']);

/** Annotation shape types (subset of shape types) */
const annotationShapeTypeSchema = z.enum(['line', 'rectangle', 'circle', 'arrow']);

/** Base fields for all annotations */
const annotationBaseSchema = z.object({
	id: z.string().uuid(),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	opacity: z.number().min(0).max(1),
	createdAt: z.number().int().positive(),
	sketch: z.boolean()
});

/** Annotation stroke element */
const annotationStrokeSchema = annotationBaseSchema.extend({
	type: z.literal('stroke'),
	points: z.array(pointSchema).min(1).max(50000),
	width: z.number().positive().max(100),
	toolType: annotationStrokeToolTypeSchema,
	strokeStyle: z.enum(['solid', 'dashed', 'dotted'])
});

/** Annotation shape element */
const annotationShapeSchema = annotationBaseSchema.extend({
	type: z.literal('shape'),
	shapeType: annotationShapeTypeSchema,
	start: pointSchema,
	end: pointSchema,
	strokeWidth: z.number().positive().max(50),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']),
	fillMode: z.enum(['none', 'solid', 'hatched', 'hachure', 'crosshatch', 'zigzag']),
	fill: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	rotation: z.number().min(0).max(360).optional()
});

/** Annotation stamp element */
const annotationStampSchema = annotationBaseSchema.extend({
	type: z.literal('stamp'),
	stampType: stampTypeSchema,
	position: pointSchema,
	size: z.number().positive().max(200),
	rotation: z.number().min(0).max(360),
	fill: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	fillOpacity: z.number().min(0).max(1).optional()
});

/** Union of all annotation types */
export const annotationElementSchema = z.discriminatedUnion('type', [
	annotationStrokeSchema,
	annotationShapeSchema,
	annotationStampSchema
]);

// =============================================================================
// Background Schemas
// =============================================================================

const backgroundImageSchema = z.object({
	type: z.literal('image'),
	src: z.string().max(10_000_000),
	width: z.number().positive(),
	height: z.number().positive()
});

const backgroundPdfSchema = z.object({
	type: z.literal('pdf'),
	pdfData: z.string().max(50_000_000), // Max ~50MB for PDF
	pageIndex: z.number().int().min(0),
	totalPages: z.number().int().positive(),
	width: z.number().positive(),
	height: z.number().positive()
});

const backgroundPlainSchema = z.object({
	type: z.literal('plain'),
	style: z.enum([
		'plain',
		'grid',
		'ruled',
		'dotted',
		'triangular',
		'triangular-dotted',
		'hexagonal',
		'hexagonal-dotted'
	]),
	color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
	gridSpacing: z.number().min(5).max(100).optional(),
	gridOpacity: z.number().min(0).max(1).optional()
});

const backgroundSchema = z.discriminatedUnion('type', [
	backgroundImageSchema,
	backgroundPdfSchema,
	backgroundPlainSchema
]);

// =============================================================================
// Instrument Schemas
// =============================================================================

const instrumentTypeSchema = z.enum(['ruler', 'protractor', 'setSquare']);

const instrumentStateSchema = z.object({
	type: instrumentTypeSchema,
	visible: z.boolean(),
	x: z.number().finite(),
	y: z.number().finite(),
	rotation: z.number().finite()
});

const instrumentsSchema = z.object({
	ruler: instrumentStateSchema,
	protractor: instrumentStateSchema,
	setSquare: instrumentStateSchema
});

// =============================================================================
// Page Schema
// =============================================================================

const pageSchema = z.object({
	id: z.string().uuid(),
	elements: z.array(elementSchema).max(5000),
	background: backgroundSchema,
	width: z.number().positive().max(10000),
	height: z.number().positive().max(10000),
	/** Original width before expansion (for scaling at export). Undefined = not expanded. */
	originalWidth: z.number().positive().max(10000).optional(),
	/** Original height before expansion (for scaling at export). Undefined = not expanded. */
	originalHeight: z.number().positive().max(10000).optional(),
	/** Annotations on this page (overlay layer) */
	annotations: z.array(annotationElementSchema).max(1000).optional()
});

// =============================================================================
// Document Schema
// =============================================================================

export const whiteboardDocumentSchema = z.object({
	id: z.string().uuid(),
	version: z.literal(UBW_FILE_VERSION),
	title: z.string().min(1).max(200),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
	pages: z.array(pageSchema).min(1).max(100),
	currentPageIndex: z.number().int().min(0),
	instruments: instrumentsSchema,
	/** Default template for new pages (optional) */
	defaultTemplate: z.unknown().optional(),
	/** Global visibility toggle for annotations (default: true) */
	annotationsVisible: z.boolean().optional()
});

// Refine to ensure currentPageIndex is within bounds
export const whiteboardDocumentSchemaStrict = whiteboardDocumentSchema.refine(
	(doc) => doc.currentPageIndex < doc.pages.length,
	{
		message: 'currentPageIndex must be less than the number of pages',
		path: ['currentPageIndex']
	}
);

// =============================================================================
// Type Exports
// =============================================================================

export type ValidatedWhiteboardDocument = z.infer<typeof whiteboardDocumentSchema>;
export type ValidatedPage = z.infer<typeof pageSchema>;
export type ValidatedElement = z.infer<typeof elementSchema>;

// =============================================================================
// Validation Functions
// =============================================================================

export interface ValidationResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Validate and parse a whiteboard document from JSON
 */
export function validateDocument(json: unknown): ValidationResult<ValidatedWhiteboardDocument> {
	const result = whiteboardDocumentSchemaStrict.safeParse(json);

	if (result.success) {
		return { success: true, data: result.data };
	}

	// Format error message
	const firstError = result.error.issues[0];
	const path = firstError?.path.join('.') || 'document';
	const message = firstError?.message || 'Validation failed';

	return {
		success: false,
		error: `Invalid .ubw file: ${path} - ${message}`
	};
}

/**
 * Check if a version is compatible with current format
 */
export function isVersionCompatible(version: number): boolean {
	return version === UBW_FILE_VERSION;
}

/**
 * Get available page formats for UI
 */
export function getPageFormats(): Array<{
	key: string;
	label: string;
	width: number;
	height: number;
}> {
	return Object.entries(PAGE_FORMATS).map(([key, value]) => ({
		key,
		...value
	}));
}
