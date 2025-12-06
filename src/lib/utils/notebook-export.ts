/**
 * Notebook export utilities for converting internal format to Jupyter .ipynb format
 * Generates Jupyter-compatible notebooks for download and external use
 */

import type { NotebookContent, NotebookCell, CellOutput } from '$lib/types/notebook';

/**
 * Jupyter notebook format types (nbformat v4)
 */
interface JupyterNotebook {
	nbformat: 4;
	nbformat_minor: 5;
	metadata: {
		kernelspec: {
			display_name: string;
			language: string;
			name: string;
		};
		language_info: {
			codemirror_mode: {
				name: string;
				version: number;
			};
			file_extension: string;
			mimetype: string;
			name: string;
			nbconvert_exporter: string;
			pygments_lexer: string;
			version: string;
		};
	};
	cells: JupyterCell[];
}

interface JupyterCell {
	cell_type: 'code' | 'markdown';
	source: string[];
	metadata: Record<string, unknown>;
	execution_count: number | null;
	outputs?: JupyterOutput[];
}

type JupyterOutput =
	| {
			output_type: 'stream';
			name: 'stdout' | 'stderr';
			text: string[];
	  }
	| {
			output_type: 'error';
			ename: string;
			evalue: string;
			traceback: string[];
	  }
	| {
			output_type: 'execute_result';
			data: Record<string, string | string[] | unknown>;
			execution_count: number;
			metadata: Record<string, unknown>;
	  }
	| {
			output_type: 'display_data';
			data: Record<string, string | string[] | unknown>;
			metadata: Record<string, unknown>;
	  };

/**
 * Convert a single line of text to an array of lines (Jupyter format)
 * Preserves line breaks and adds them back as array elements
 */
function textToLines(text: string): string[] {
	if (!text) return [];
	const lines = text.split('\n');
	// Add newlines back except for the last line
	// Filter out empty last line if text ended with \n
	const result = lines.map((line, i) => (i < lines.length - 1 ? line + '\n' : line));
	// Remove empty last element if it exists (from trailing newline)
	if (result[result.length - 1] === '') {
		result.pop();
	}
	return result;
}

/**
 * Convert internal cell output to Jupyter output format
 */
function convertOutput(output: CellOutput): JupyterOutput {
	switch (output.output_type) {
		case 'stream':
			return {
				output_type: 'stream',
				name: output.name,
				text: textToLines(output.text)
			};

		case 'error':
			return {
				output_type: 'error',
				ename: output.ename,
				evalue: output.evalue,
				traceback: output.traceback
			};

		case 'execute_result':
		case 'display_data': {
			// Parse JSON strings back to objects for application/json MIME type
			const data: Record<string, string | string[] | unknown> = { ...output.data };
			if (typeof data['application/json'] === 'string') {
				try {
					data['application/json'] = JSON.parse(data['application/json']);
				} catch {
					// If parsing fails, keep as string
				}
			}

			if (output.output_type === 'execute_result') {
				return {
					output_type: 'execute_result',
					data,
					execution_count: output.execution_count ?? 0,
					metadata: {}
				};
			} else {
				return {
					output_type: 'display_data',
					data,
					metadata: {}
				};
			}
		}
	}
}

/**
 * Convert internal notebook cell to Jupyter cell format
 */
function convertCell(cell: NotebookCell): JupyterCell {
	const jupyterCell: JupyterCell = {
		cell_type: cell.type,
		source: textToLines(cell.source),
		metadata: cell.metadata ?? {},
		execution_count: cell.execution_count
	};

	// Only code cells have outputs
	if (cell.type === 'code') {
		jupyterCell.outputs = cell.outputs.map(convertOutput);
	}

	return jupyterCell;
}

/**
 * Export internal notebook format to Jupyter .ipynb format
 *
 * @param notebook - Internal notebook content
 * @returns JSON string of Jupyter notebook
 */
export function exportToIpynb(notebook: NotebookContent): string {
	const jupyterNotebook: JupyterNotebook = {
		nbformat: 4,
		nbformat_minor: 5,
		metadata: {
			kernelspec: {
				display_name: 'Python 3 (UbuMaths)',
				language: 'python',
				name: 'python3'
			},
			language_info: {
				codemirror_mode: {
					name: 'ipython',
					version: 3
				},
				file_extension: '.py',
				mimetype: 'text/x-python',
				name: 'python',
				nbconvert_exporter: 'python',
				pygments_lexer: 'ipython3',
				version: notebook.metadata.kernel_info?.version ?? '3.11.0'
			}
		},
		cells: notebook.cells.map(convertCell)
	};

	// Pretty print JSON with 2-space indentation (Jupyter standard)
	return JSON.stringify(jupyterNotebook, null, 2);
}

/**
 * Trigger browser download of notebook as .ipynb file
 *
 * @param notebook - Internal notebook content
 * @param filename - Filename without extension (e.g., "my-notebook")
 */
export function downloadIpynb(notebook: NotebookContent, filename: string): void {
	// Ensure filename doesn't already have .ipynb extension
	const cleanFilename = filename.replace(/\.ipynb$/, '');
	const ipynbContent = exportToIpynb(notebook);

	// Create blob and download link
	const blob = new Blob([ipynbContent], { type: 'application/x-ipynb+json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');

	link.href = url;
	link.download = `${cleanFilename}.ipynb`;
	link.style.display = 'none';

	// Trigger download
	document.body.appendChild(link);
	link.click();

	// Cleanup
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
