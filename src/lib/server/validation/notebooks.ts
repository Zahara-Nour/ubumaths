/**
 * Zod validation schemas for notebook operations
 * All user input must be validated with these schemas
 */

import { z } from 'zod';

// Cell output schemas (Jupyter-compatible)
const streamOutputSchema = z.object({
	output_type: z.literal('stream'),
	name: z.enum(['stdout', 'stderr']),
	text: z.string()
});

const errorOutputSchema = z.object({
	output_type: z.literal('error'),
	ename: z.string(),
	evalue: z.string(),
	traceback: z.array(z.string())
});

const displayOutputSchema = z.object({
	output_type: z.enum(['display_data', 'execute_result']),
	data: z.object({
		'text/plain': z.string().optional(),
		'text/html': z.string().optional(),
		'image/png': z.string().optional(),
		'application/json': z.string().optional()
	}),
	execution_count: z.number().int().nonnegative().optional()
});

const cellOutputSchema = z.discriminatedUnion('output_type', [
	streamOutputSchema,
	errorOutputSchema,
	displayOutputSchema
]);

// Cell schema
const notebookCellSchema = z.object({
	id: z.string().uuid(),
	type: z.enum(['code', 'markdown']),
	source: z.string().max(50000), // 50KB limit per cell
	execution_count: z.number().int().nonnegative().nullable(),
	outputs: z.array(cellOutputSchema).max(100), // Max 100 outputs per cell
	state: z.enum(['idle', 'running', 'success', 'error']),
	metadata: z
		.object({
			collapsed: z.boolean().optional(),
			tags: z.array(z.string().max(50)).max(20).optional()
		})
		.optional()
});

// Notebook metadata schema
const notebookMetadataSchema = z.object({
	title: z.string().min(1).max(200),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	kernel_info: z
		.object({
			name: z.string(),
			language: z.string(),
			version: z.string()
		})
		.optional()
});

// Notebook content schema
export const notebookContentSchema = z.object({
	version: z.literal('1.0'),
	metadata: notebookMetadataSchema,
	cells: z.array(notebookCellSchema).max(200) // Max 200 cells per notebook
});

// Full notebook schema
export const notebookSchema = z.object({
	id: z.string().uuid(),
	title: z.string().min(1).max(200),
	description: z.string().max(1000).nullable(),
	content: notebookContentSchema,
	author_id: z.string().uuid(),
	is_public: z.boolean(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Create notebook request schema
export const createNotebookSchema = z.object({
	title: z.string().min(1).max(200).trim(),
	description: z.string().max(1000).trim().optional(),
	is_public: z.boolean().default(false)
});

// Update notebook request schema
export const updateNotebookSchema = z.object({
	title: z.string().min(1).max(200).trim().optional(),
	description: z.string().max(1000).trim().nullable().optional(),
	content: notebookContentSchema.optional(),
	is_public: z.boolean().optional()
});

// Share notebook request schema
export const shareNotebookSchema = z.object({
	is_public: z.boolean()
});

// Execute cell request schema
export const executeCellSchema = z.object({
	cell_id: z.string().uuid(),
	source: z.string().max(50000)
});

// Execute all cells request schema
export const executeAllCellsSchema = z.object({
	notebook_id: z.string().uuid(),
	cells: z
		.array(
			z.object({
				id: z.string().uuid(),
				source: z.string().max(50000)
			})
		)
		.max(200)
});

// Add cell request schema
export const addCellSchema = z.object({
	type: z.enum(['code', 'markdown']),
	index: z.number().int().nonnegative().max(200).optional(),
	source: z.string().max(50000).default('')
});

// Update cell source schema
export const updateCellSourceSchema = z.object({
	cell_id: z.string().uuid(),
	source: z.string().max(50000)
});

// Move cell schema
export const moveCellSchema = z.object({
	cell_id: z.string().uuid(),
	direction: z.enum(['up', 'down'])
});

// Delete cell schema
export const deleteCellSchema = z.object({
	cell_id: z.string().uuid()
});

// Export cell schema for external use
export { notebookCellSchema };
