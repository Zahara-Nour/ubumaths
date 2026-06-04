/**
 * TypeScript types for Python notebooks with multi-cell execution
 * Jupyter-compatible output format
 */

// Cell types
export type CellType = 'code' | 'markdown' | 'checkpoint';
export type CellExecutionState = 'idle' | 'running' | 'success' | 'error';

// Checkpoint cell modes — V1 supports three validation strategies
export type CheckpointMode = 'assert' | 'unit_test' | 'variable_check';

// Checkpoint config — discriminated union on `mode`
export type CheckpointConfig =
	| {
			mode: 'assert';
			/** Python code containing one or more `assert` statements. */
			code: string;
	  }
	| {
			mode: 'unit_test';
			function_name: string;
			test_cases: Array<{
				args: unknown[];
				expected: unknown;
			}>;
			/** Optional numeric tolerance for float comparisons. */
			tolerance?: {
				eps_abs: number;
				eps_rel: number;
			};
	  }
	| {
			mode: 'variable_check';
			/** Map of variable name → expected value. Read from the notebook's persistent namespace. */
			expected_vars: Record<string, unknown>;
			/** Optional numeric tolerance for float comparisons. */
			tolerance?: {
				eps_abs: number;
				eps_rel: number;
			};
	  };

// Latest checkpoint run status (from python_notebook_checkpoint_runs)
export type CheckpointStatus = 'passed' | 'failed';

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

// Notebook cell — discriminated by `type`
// Code and markdown cells share the original shape (back-compat).
// Checkpoint cells carry a CheckpointConfig + an optional title for the teacher dashboard.
export interface BaseNotebookCell {
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

export interface CheckpointCell extends BaseNotebookCell {
	type: 'checkpoint';
	/** Discriminated config — what the checkpoint actually verifies. */
	checkpoint: CheckpointConfig;
	/** Short human-readable title shown in the teacher dashboard (e.g. "Étape 1 : moyenne"). */
	title?: string;
	/**
	 * Plain-text hint shown to the student after a couple of failed attempts.
	 * Stored on the cell (not in `checkpoint`) so it doesn't bloat the
	 * validation payload that round-trips with every Vérifier click.
	 */
	hint?: string;
}

export type NotebookCell = BaseNotebookCell | CheckpointCell;

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
	/** Required for `type: 'checkpoint'` — initial validation config. */
	checkpoint?: CheckpointConfig;
	/** Optional human-readable title shown in the teacher dashboard. */
	title?: string;
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
