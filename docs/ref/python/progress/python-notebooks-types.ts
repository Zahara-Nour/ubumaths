// TypeScript types for python_notebooks tables
// Add these to: src/lib/types/database.ts

// ============================================================================
// Database Types
// ============================================================================

export interface PythonNotebook {
	id: string;
	title: string;
	description: string | null;
	content: NotebookContent;
	author_id: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
}

export interface PythonNotebookAssignment {
	id: string;
	notebook_id: string;
	class_id: string;
	shared_by: string;
	readonly: boolean;
	created_at: string;
}

// ============================================================================
// Content Structure Types
// ============================================================================

export interface NotebookContent {
	version: string;
	metadata: NotebookMetadata;
	cells: NotebookCell[];
}

export interface NotebookMetadata {
	title: string;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// Cell Types
// ============================================================================

export type NotebookCell = CodeCell | MarkdownCell;

export interface CodeCell {
	id: string;
	type: 'code';
	source: string;
	execution_count: number;
	outputs: CellOutput[];
	state: CellState;
}

export interface MarkdownCell {
	id: string;
	type: 'markdown';
	source: string;
}

export type CellState = 'idle' | 'running' | 'success' | 'error';

// ============================================================================
// Output Types
// ============================================================================

export type CellOutput = StreamOutput | ErrorOutput | ExecuteResultOutput;

export interface StreamOutput {
	output_type: 'stream';
	name: 'stdout' | 'stderr';
	text: string;
}

export interface ErrorOutput {
	output_type: 'error';
	ename: string;
	evalue: string;
	traceback: string[];
}

export interface ExecuteResultOutput {
	output_type: 'execute_result';
	data: {
		'text/plain': string;
		// Future: Add 'text/html', 'image/png', etc.
	};
}

// ============================================================================
// Zod Validation Schemas
// ============================================================================
// Add these to: src/lib/server/validation/notebooks.ts

import { z } from 'zod';

// Output schemas
export const streamOutputSchema = z.object({
	output_type: z.literal('stream'),
	name: z.enum(['stdout', 'stderr']),
	text: z.string()
});

export const errorOutputSchema = z.object({
	output_type: z.literal('error'),
	ename: z.string(),
	evalue: z.string(),
	traceback: z.array(z.string())
});

export const executeResultOutputSchema = z.object({
	output_type: z.literal('execute_result'),
	data: z.object({
		'text/plain': z.string()
	})
});

export const cellOutputSchema = z.discriminatedUnion('output_type', [
	streamOutputSchema,
	errorOutputSchema,
	executeResultOutputSchema
]);

// Cell schemas
export const codeCellSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('code'),
	source: z.string(),
	execution_count: z.number().int().nonnegative(),
	outputs: z.array(cellOutputSchema),
	state: z.enum(['idle', 'running', 'success', 'error'])
});

export const markdownCellSchema = z.object({
	id: z.string().uuid(),
	type: z.literal('markdown'),
	source: z.string()
});

export const notebookCellSchema = z.discriminatedUnion('type', [
	codeCellSchema,
	markdownCellSchema
]);

// Metadata schema
export const notebookMetadataSchema = z.object({
	title: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Content schema
export const notebookContentSchema = z.object({
	version: z.string(),
	metadata: notebookMetadataSchema,
	cells: z.array(notebookCellSchema)
});

// API request/response schemas
export const createNotebookSchema = z.object({
	title: z.string().min(1).max(200),
	description: z.string().max(1000).optional(),
	content: notebookContentSchema,
	is_public: z.boolean().default(false)
});

export const updateNotebookSchema = z.object({
	title: z.string().min(1).max(200).optional(),
	description: z.string().max(1000).optional().nullable(),
	content: notebookContentSchema.optional(),
	is_public: z.boolean().optional()
});

export const assignNotebookSchema = z.object({
	notebook_id: z.string().uuid(),
	class_id: z.string().uuid(),
	readonly: z.boolean().default(true)
});

export const updateAssignmentSchema = z.object({
	readonly: z.boolean()
});

// ============================================================================
// Helper Types for Frontend
// ============================================================================

// Notebook with populated author info
export interface NotebookWithAuthor extends PythonNotebook {
	author: {
		id: string;
		full_name: string;
		avatar_url: string | null;
	};
}

// Assignment with notebook and class info
export interface NotebookAssignmentWithDetails extends PythonNotebookAssignment {
	notebook: NotebookWithAuthor;
	class: {
		id: string;
		name: string;
		class_level: string;
	};
}

// Student view of assigned notebook
export interface StudentNotebookView {
	notebook: PythonNotebook;
	assignment: {
		id: string;
		readonly: boolean;
		created_at: string;
	};
	teacher: {
		id: string;
		full_name: string;
	};
}

// ============================================================================
// Example Usage
// ============================================================================

/*
// Creating a notebook
const newNotebook: Omit<PythonNotebook, 'id' | 'created_at' | 'updated_at'> = {
  title: 'Introduction to Python',
  description: 'Basic Python concepts',
  content: {
    version: '1.0',
    metadata: {
      title: 'Introduction to Python',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    cells: [
      {
        id: crypto.randomUUID(),
        type: 'markdown',
        source: '# Welcome to Python\n\nLet\'s start with basics.'
      },
      {
        id: crypto.randomUUID(),
        type: 'code',
        source: 'print("Hello, World!")',
        execution_count: 0,
        outputs: [],
        state: 'idle'
      }
    ]
  },
  author_id: userId,
  is_public: false
};

// Assigning to class
const assignment: Omit<PythonNotebookAssignment, 'id' | 'created_at'> = {
  notebook_id: notebookId,
  class_id: classId,
  shared_by: teacherId,
  readonly: true
};
*/
