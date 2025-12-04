/**
 * Validation schemas for spreadsheet API endpoints
 * Uses Zod for runtime validation of spreadsheet data
 */

import { z } from 'zod';
import {
	cellDataSchema,
	spreadsheetMetadataSchema,
	cellRefStringSchema
} from '$lib/spreadsheet/types';

// =============================================================================
// Spreadsheet Data Schema (for JSONB storage)
// =============================================================================

/**
 * Full spreadsheet data validation (matches the JSONB column in the database)
 * This is more permissive than the frontend schema to handle edge cases
 */
export const spreadsheetDataSchema = z
	.object({
		version: z.literal(1),
		cells: z.record(cellRefStringSchema, cellDataSchema),
		metadata: spreadsheetMetadataSchema
	})
	.strict();

// =============================================================================
// API Request Schemas
// =============================================================================

/**
 * Schema for creating a new spreadsheet
 */
export const createSpreadsheetSchema = z
	.object({
		name: z.string().trim().min(1, 'Le nom est requis').max(255, 'Nom trop long (max 255 chars)'),
		description: z
			.string()
			.max(1000, 'Description trop longue (max 1000 chars)')
			.optional()
			.nullable(),
		data: spreadsheetDataSchema.optional()
	})
	.strict();

/**
 * Schema for updating a spreadsheet
 * All fields are optional (partial update)
 */
export const updateSpreadsheetSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, 'Le nom ne peut pas être vide')
			.max(255, 'Nom trop long (max 255 chars)')
			.optional(),
		description: z
			.string()
			.max(1000, 'Description trop longue (max 1000 chars)')
			.optional()
			.nullable(),
		data: spreadsheetDataSchema.optional()
	})
	.strict();

/**
 * Schema for list query parameters
 */
export const listSpreadsheetsSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20)
});

// =============================================================================
// Type Exports
// =============================================================================

export type CreateSpreadsheetInput = z.infer<typeof createSpreadsheetSchema>;
export type UpdateSpreadsheetInput = z.infer<typeof updateSpreadsheetSchema>;
export type ListSpreadsheetsQuery = z.infer<typeof listSpreadsheetsSchema>;
export type SpreadsheetDataValidated = z.infer<typeof spreadsheetDataSchema>;
