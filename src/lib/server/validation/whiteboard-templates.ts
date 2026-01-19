/**
 * Whiteboard templates validation schemas
 *
 * Zod schemas for validating whiteboard template API requests.
 *
 * @module server/validation/whiteboard-templates
 */

import { z } from 'zod';
import { uuidSchema } from './common';

// =============================================================================
// Constants
// =============================================================================

/** Valid template categories (must match PostgreSQL enum) */
const TEMPLATE_CATEGORIES = ['geometry', 'algebra', 'graphs', 'grids', 'blank'] as const;

/** Valid background styles */
const BACKGROUND_STYLES = [
	'plain',
	'grid',
	'ruled',
	'dotted',
	'triangular',
	'triangular-dotted',
	'hexagonal',
	'hexagonal-dotted'
] as const;

// =============================================================================
// Page Data Schemas
// =============================================================================

/**
 * Schema for a 2D point
 */
const pointSchema = z.object({
	x: z.number(),
	y: z.number(),
	pressure: z.number().optional()
});

/**
 * Schema for stroke elements
 */
const strokeElementSchema = z.object({
	id: z.string(),
	type: z.literal('stroke'),
	toolType: z.enum(['pen', 'marker', 'highlighter', 'eraser']),
	points: z.array(pointSchema),
	color: z.string(),
	width: z.number().positive(),
	opacity: z.number().min(0).max(1),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
	rotation: z.number().optional()
});

/**
 * Schema for shape elements
 */
const shapeElementSchema = z.object({
	id: z.string(),
	type: z.literal('shape'),
	shapeType: z.enum(['line', 'rectangle', 'circle', 'arrow', 'pentagon', 'hexagon', 'star']),
	start: pointSchema,
	end: pointSchema,
	color: z.string(),
	strokeWidth: z.number().positive(),
	opacity: z.number().min(0).max(1),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
	fillMode: z.enum(['none', 'solid', 'hatched', 'hachure', 'crosshatch', 'zigzag']).optional(),
	fill: z.string().optional(),
	fillOpacity: z.number().min(0).max(1).optional(),
	cornerRadius: z.number().min(0).optional(),
	rotation: z.number().optional(),
	labelMarkdown: z.string().optional(),
	roughSeed: z.number().optional(),
	roughness: z.number().optional()
});

/**
 * Schema for text block elements
 */
const textBlockElementSchema = z.object({
	id: z.string(),
	type: z.literal('textblock'),
	position: pointSchema,
	width: z.number().positive(),
	height: z.number().positive(),
	content: z.string(),
	rotation: z.number().optional()
});

/**
 * Schema for image elements
 */
const imageElementSchema = z.object({
	id: z.string(),
	type: z.literal('image'),
	src: z.string(),
	position: pointSchema,
	width: z.number().positive(),
	height: z.number().positive(),
	rotation: z.number().optional()
});

/**
 * Schema for arrow elements (more complex)
 */
const arrowElementSchema = z.object({
	id: z.string(),
	type: z.literal('arrow'),
	arrowType: z.enum(['sharp', 'curved', 'elbow']).optional(),
	points: z.array(pointSchema),
	color: z.string(),
	strokeWidth: z.number().positive(),
	opacity: z.number().min(0).max(1),
	strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
	startArrowhead: z
		.enum(['arrow', 'triangle', 'circle', 'bar', 'diamond', 'none'])
		.nullable()
		.optional(),
	endArrowhead: z.enum(['arrow', 'triangle', 'circle', 'bar', 'diamond', 'none']).optional()
});

/**
 * Union schema for all element types
 * Using discriminatedUnion for better error messages
 */
const whiteboardElementSchema = z.discriminatedUnion('type', [
	strokeElementSchema,
	shapeElementSchema,
	textBlockElementSchema,
	imageElementSchema,
	arrowElementSchema
]);

/**
 * Schema for plain background
 */
const backgroundPlainSchema = z.object({
	type: z.literal('plain'),
	style: z.enum(BACKGROUND_STYLES),
	color: z.string(),
	gridSpacing: z.number().positive().optional(),
	gridOpacity: z.number().min(0).max(1).optional()
});

/**
 * Schema for image background
 */
const backgroundImageSchema = z.object({
	type: z.literal('image'),
	src: z.string(),
	width: z.number().positive(),
	height: z.number().positive()
});

/**
 * Schema for PDF background
 */
const backgroundPdfSchema = z.object({
	type: z.literal('pdf'),
	pdfData: z.string(),
	pageIndex: z.number().int().min(0),
	totalPages: z.number().int().positive(),
	width: z.number().positive(),
	height: z.number().positive()
});

/**
 * Union schema for background types
 */
const pageBackgroundSchema = z.discriminatedUnion('type', [
	backgroundPlainSchema,
	backgroundImageSchema,
	backgroundPdfSchema
]);

/**
 * Schema for template page data
 */
export const templatePageDataSchema = z.object({
	elements: z.array(whiteboardElementSchema).max(1000, "Trop d'elements (max 1000)"),
	background: pageBackgroundSchema,
	width: z.number().positive().max(10000, 'Largeur trop grande (max 10000px)'),
	height: z.number().positive().max(10000, 'Hauteur trop grande (max 10000px)')
});

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Schema for template category
 */
export const templateCategorySchema = z.enum(TEMPLATE_CATEGORIES);

/**
 * Schema for creating a whiteboard template
 * POST /api/whiteboard/templates
 */
export const createWhiteboardTemplateSchema = z.object({
	name: z.string().trim().min(1, 'Nom requis').max(100, 'Nom trop long (max 100 caracteres)'),
	description: z
		.string()
		.max(500, 'Description trop longue (max 500 caracteres)')
		.nullable()
		.optional(),
	category: templateCategorySchema,
	pageData: templatePageDataSchema,
	thumbnail: z.string().max(500000, 'Thumbnail trop grand').nullable().optional()
});

/**
 * Schema for listing whiteboard templates
 * GET /api/whiteboard/templates
 */
export const listWhiteboardTemplatesQuerySchema = z.object({
	category: templateCategorySchema.optional()
});

/**
 * Schema for template ID parameter
 * Used in /api/whiteboard/templates/[id] routes
 */
export const templateIdParamSchema = z.object({
	id: uuidSchema
});

// =============================================================================
// Type Exports
// =============================================================================

export type CreateWhiteboardTemplateInput = z.infer<typeof createWhiteboardTemplateSchema>;
export type ListWhiteboardTemplatesQuery = z.infer<typeof listWhiteboardTemplatesQuerySchema>;
export type TemplatePageData = z.infer<typeof templatePageDataSchema>;
