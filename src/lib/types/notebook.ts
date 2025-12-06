/**
 * TypeScript types for Python notebooks with multi-cell execution
 * Jupyter-compatible output format
 */

// Cell types
export type CellType = 'code' | 'markdown';
export type CellExecutionState = 'idle' | 'running' | 'success' | 'error';

// Cell output types (Jupyter-compatible)
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

export interface DisplayOutput {
	output_type: 'display_data' | 'execute_result';
	data: {
		'text/plain'?: string;
		'text/html'?: string;
		'image/png'?: string;
		'image/jpeg'?: string;
		'application/json'?: string;
	};
	execution_count?: number;
}

export type CellOutput = StreamOutput | ErrorOutput | DisplayOutput;

// Notebook cell
export interface NotebookCell {
	id: string;
	type: CellType;
	source: string;
	execution_count: number | null;
	outputs: CellOutput[];
	state: CellExecutionState;
	metadata?: {
		collapsed?: boolean;
		tags?: string[];
		[key: string]: unknown; // Allow additional metadata fields (e.g., Colab-specific)
	};
}

// Full notebook
export interface NotebookMetadata {
	title: string;
	created_at: string;
	updated_at: string;
	kernel_info?: {
		name: string;
		language: string;
		version: string;
	};
}

export interface NotebookContent {
	version: '1.0';
	metadata: NotebookMetadata;
	cells: NotebookCell[];
}

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

// API request/response types
export interface CreateNotebookRequest {
	title: string;
	description?: string;
	is_public?: boolean;
}

export interface UpdateNotebookRequest {
	title?: string;
	description?: string;
	content?: NotebookContent;
	is_public?: boolean;
}

export interface ShareNotebookRequest {
	is_public: boolean;
}

// Cell manipulation types
export type CellDirection = 'up' | 'down';

export interface AddCellOptions {
	type: CellType;
	index?: number;
	source?: string;
}

// Execution result types
export interface CellExecutionResult {
	cell_id: string;
	execution_count: number;
	outputs: CellOutput[];
	state: CellExecutionState;
	duration_ms?: number;
}

export interface NotebookExecutionResult {
	notebook_id: string;
	cells_executed: number;
	cells_succeeded: number;
	cells_failed: number;
	total_duration_ms: number;
	results: CellExecutionResult[];
}
