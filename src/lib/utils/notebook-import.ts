/**
 * Jupyter notebook import utility
 * Converts .ipynb files to our internal NotebookContent format
 */

import { z } from 'zod';
import type {
	NotebookContent,
	NotebookCell,
	CellOutput,
	CellType,
	StreamOutput,
	ErrorOutput,
	DisplayOutput
} from '$lib/types/notebook';

// Validation limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CELLS = 1000;
const MAX_CELL_SOURCE_LENGTH = 100 * 1024; // 100KB

// Zod schema for Jupyter notebook validation
const jupyterCellSchema = z.object({
	cell_type: z.enum(['code', 'markdown', 'raw']),
	id: z.string().optional(),
	source: z.union([z.string(), z.array(z.string())]),
	metadata: z.record(z.string(), z.unknown()).optional(),
	execution_count: z.union([z.number(), z.null()]).optional(),
	outputs: z.array(z.unknown()).optional()
});

const jupyterNotebookSchema = z.object({
	nbformat: z.number().int().min(4),
	nbformat_minor: z.number().int().min(0),
	metadata: z.record(z.string(), z.unknown()),
	cells: z.array(jupyterCellSchema).max(MAX_CELLS)
});

// Jupyter notebook format types
interface JupyterNotebook {
	nbformat: number;
	nbformat_minor: number;
	metadata: {
		kernelspec?: {
			name: string;
			display_name: string;
			language?: string;
		};
		language_info?: {
			name: string;
			version?: string;
		};
		colab?: unknown;
	};
	cells: JupyterCell[];
}

interface JupyterCell {
	cell_type: 'code' | 'markdown' | 'raw';
	id?: string;
	source: string | string[];
	metadata?: {
		collapsed?: boolean;
		tags?: string[];
		id?: string;
		[key: string]: unknown;
	};
	execution_count?: number | null;
	outputs?: JupyterOutput[];
}

type JupyterOutput =
	| JupyterStreamOutput
	| JupyterErrorOutput
	| JupyterDisplayOutput
	| JupyterExecuteResultOutput;

interface JupyterStreamOutput {
	output_type: 'stream';
	name: 'stdout' | 'stderr';
	text: string | string[];
}

interface JupyterErrorOutput {
	output_type: 'error';
	ename: string;
	evalue: string;
	traceback: string[];
}

interface JupyterDisplayOutput {
	output_type: 'display_data';
	data: {
		'text/plain'?: string | string[];
		'text/html'?: string | string[];
		'text/latex'?: string | string[];
		'image/png'?: string;
		'image/jpeg'?: string;
		'application/json'?: unknown;
		'application/vnd.plotly.v1+json'?: unknown;
		[key: string]: unknown;
	};
	metadata?: unknown;
}

interface JupyterExecuteResultOutput {
	output_type: 'execute_result';
	execution_count: number;
	data: {
		'text/plain'?: string | string[];
		'text/html'?: string | string[];
		'text/latex'?: string | string[];
		'image/png'?: string;
		'image/jpeg'?: string;
		'application/json'?: unknown;
		'application/vnd.plotly.v1+json'?: unknown;
		[key: string]: unknown;
	};
	metadata?: unknown;
}

/**
 * Normalizes source field (string or string[]) to a single string
 */
function normalizeSource(source: string | string[]): string {
	if (Array.isArray(source)) {
		return source.join('');
	}
	return source;
}

/**
 * Normalizes text field (string or string[]) to a single string
 */
function normalizeText(text: string | string[]): string {
	if (Array.isArray(text)) {
		return text.join('');
	}
	return text;
}

/**
 * Converts Jupyter outputs to our internal format
 */
function convertOutputs(outputs: JupyterOutput[] | undefined): CellOutput[] {
	if (!outputs) return [];

	const converted: CellOutput[] = [];

	for (const output of outputs) {
		if (output.output_type === 'stream') {
			const streamOutput: StreamOutput = {
				output_type: 'stream',
				name: output.name,
				text: normalizeText(output.text)
			};
			converted.push(streamOutput);
		} else if (output.output_type === 'error') {
			const errorOutput: ErrorOutput = {
				output_type: 'error',
				ename: output.ename,
				evalue: output.evalue,
				traceback: output.traceback
			};
			converted.push(errorOutput);
		} else if (output.output_type === 'display_data' || output.output_type === 'execute_result') {
			const displayData: DisplayOutput['data'] = {};

			// Map text/plain
			if (output.data['text/plain']) {
				displayData['text/plain'] = normalizeText(output.data['text/plain']);
			}

			// Map text/html
			if (output.data['text/html']) {
				displayData['text/html'] = normalizeText(output.data['text/html']);
			}

			// Map images (PNG and JPEG separately)
			if (output.data['image/png']) {
				displayData['image/png'] = output.data['image/png'] as string;
			}
			if (output.data['image/jpeg']) {
				displayData['image/jpeg'] = output.data['image/jpeg'] as string;
			}

			// Map LaTeX (convert to HTML only if text/html doesn't already exist)
			if (output.data['text/latex'] && !displayData['text/html']) {
				const latex = normalizeText(output.data['text/latex']);
				displayData['text/html'] = `<div class="latex">${latex}</div>`;
			}

			// Map JSON (including Plotly)
			if (output.data['application/json']) {
				displayData['application/json'] = JSON.stringify(output.data['application/json']);
			} else if (output.data['application/vnd.plotly.v1+json']) {
				displayData['application/json'] = JSON.stringify(
					output.data['application/vnd.plotly.v1+json']
				);
			}

			const displayOutput: DisplayOutput = {
				output_type: output.output_type === 'execute_result' ? 'execute_result' : 'display_data',
				data: displayData
			};

			if (output.output_type === 'execute_result') {
				displayOutput.execution_count = output.execution_count;
			}

			// Only add if we have at least one supported data type
			if (Object.keys(displayData).length > 0) {
				converted.push(displayOutput);
			}
		}
		// Skip other output types (widgets, etc.)
	}

	return converted;
}

/**
 * Converts Jupyter cell to our internal format
 */
function convertCell(jupyterCell: JupyterCell): NotebookCell | null {
	// Skip raw cells
	if (jupyterCell.cell_type === 'raw') {
		return null;
	}

	// Normalize and validate source length
	const source = normalizeSource(jupyterCell.source);
	if (source.length > MAX_CELL_SOURCE_LENGTH) {
		throw new Error(
			`Une cellule dépasse la taille maximale autorisée (${Math.round(source.length / 1024)}KB). Maximum : 100KB par cellule.`
		);
	}

	// Map cell type
	const cellType: CellType = jupyterCell.cell_type === 'markdown' ? 'markdown' : 'code';

	// Prefer cell-level ID over metadata ID (Jupyter nbformat 4.5+ uses cell-level id)
	const cellId = jupyterCell.id || jupyterCell.metadata?.id || crypto.randomUUID();

	// Preserve all metadata (not just collapsed and tags)
	const metadata: NotebookCell['metadata'] = jupyterCell.metadata
		? { ...jupyterCell.metadata }
		: undefined;

	const cell: NotebookCell = {
		id: cellId,
		type: cellType,
		source: source, // Use the already-normalized and validated source
		execution_count: cellType === 'code' ? jupyterCell.execution_count || null : null,
		outputs: cellType === 'code' ? convertOutputs(jupyterCell.outputs) : [],
		state: 'idle',
		metadata
	};

	return cell;
}

/**
 * Validates if the content is a valid Jupyter notebook
 */
export function isValidIpynb(fileContent: string): boolean {
	try {
		const parsed = JSON.parse(fileContent) as Partial<JupyterNotebook>;

		// Check required fields
		if (typeof parsed.nbformat !== 'number') return false;
		if (!Array.isArray(parsed.cells)) return false;

		// Check nbformat version (support v4+)
		if (parsed.nbformat < 4) return false;

		return true;
	} catch {
		return false;
	}
}

/**
 * Extracts metadata from Jupyter notebook without full conversion
 */
export function getIpynbMetadata(fileContent: string): {
	kernel_name: string;
	language: string;
	cell_count: number;
	code_cells: number;
	markdown_cells: number;
} {
	try {
		const notebook = JSON.parse(fileContent) as JupyterNotebook;

		const kernel_name = notebook.metadata.kernelspec?.display_name || 'Unknown';
		const language = notebook.metadata.language_info?.name || 'python';

		const code_cells = notebook.cells.filter((c) => c.cell_type === 'code').length;
		const markdown_cells = notebook.cells.filter((c) => c.cell_type === 'markdown').length;

		return {
			kernel_name,
			language,
			cell_count: notebook.cells.length,
			code_cells,
			markdown_cells
		};
	} catch (error) {
		throw new Error(
			`Impossible d'extraire les métadonnées : ${error instanceof Error ? error.message : 'erreur inconnue'}`
		);
	}
}

/**
 * Main import function: converts Jupyter .ipynb to our NotebookContent format
 */
export function importIpynb(fileContent: string): NotebookContent {
	// Check file size limit (10MB)
	const fileSizeBytes = new Blob([fileContent]).size;
	if (fileSizeBytes > MAX_FILE_SIZE) {
		throw new Error(
			`Le fichier est trop volumineux (${Math.round(fileSizeBytes / 1024 / 1024)}MB). Taille maximale autorisée : 10MB.`
		);
	}

	// Validate format
	if (!isValidIpynb(fileContent)) {
		throw new Error(
			'Format de fichier invalide. Le fichier doit être un notebook Jupyter valide (.ipynb).'
		);
	}

	let notebook: JupyterNotebook;
	try {
		notebook = JSON.parse(fileContent) as JupyterNotebook;
	} catch (error) {
		throw new Error(
			`Erreur lors de la lecture du fichier : ${error instanceof Error ? error.message : 'erreur inconnue'}`
		);
	}

	// Validate with Zod schema
	const validation = jupyterNotebookSchema.safeParse(notebook);
	if (!validation.success) {
		const issue = validation.error.issues[0];
		throw new Error(`Validation du notebook échouée : ${issue.path.join('.')} - ${issue.message}`);
	}

	// Convert cells (skip raw cells)
	const cells: NotebookCell[] = [];
	for (const jupyterCell of notebook.cells) {
		const converted = convertCell(jupyterCell);
		if (converted) {
			cells.push(converted);
		}
	}

	// Ensure at least one cell exists
	if (cells.length === 0) {
		cells.push({
			id: crypto.randomUUID(),
			type: 'code',
			source: '',
			execution_count: null,
			outputs: [],
			state: 'idle'
		});
	}

	// Extract kernel info
	const kernelInfo = {
		name: notebook.metadata.kernelspec?.name || 'python3',
		language: notebook.metadata.language_info?.name || 'python',
		version: notebook.metadata.language_info?.version || '3.11'
	};

	const now = new Date().toISOString();

	const notebookContent: NotebookContent = {
		version: '1.0',
		metadata: {
			title: 'Notebook importé',
			created_at: now,
			updated_at: now,
			kernel_info: kernelInfo
		},
		cells
	};

	return notebookContent;
}
