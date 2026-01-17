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
	strokeStyle: z.enum(['solid', 'dashed', 'dotted', 'dashdot']).optional()
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
	strokeStyle: z.enum(['solid', 'dashed', 'dotted', 'dashdot']).optional(),
	fillMode: z.enum(['none', 'solid', 'hatched']).optional(),
	fill: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.optional(),
	fillOpacity: z.number().min(0).max(1).optional(),
	cornerRadius: z.number().min(0).max(100).optional(),
	rotation: z.number().min(0).max(360).optional(),
	labelMarkdown: z.string().max(1000).optional(),
	// Binding fields (only used for arrow shapes)
	startBinding: bindingAnchorSchema.nullable().optional(),
	endBinding: bindingAnchorSchema.nullable().optional(),
	// Elbow arrow fields (only used for arrow shapes)
	elbowed: z.boolean().optional(),
	elbowDirection: z.enum(['horizontal-first', 'vertical-first']).optional()
});

const textBlockElementSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('textblock'),
	position: pointSchema,
	width: z.number().positive().max(10000),
	height: z.number().positive().max(10000),
	markdownContent: z.string().max(100000)
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
	height: z.number().positive().max(10000)
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
	instruments: instrumentsSchema
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
