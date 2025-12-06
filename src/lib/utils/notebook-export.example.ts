/**
 * Example usage of notebook export utilities
 * This file is for documentation purposes only
 */

import { exportToIpynb, downloadIpynb } from './notebook-export';
import type { NotebookContent } from '$lib/types/notebook';

// Example 1: Export notebook to JSON string
function example1() {
	const notebook: NotebookContent = {
		version: '1.0',
		metadata: {
			title: 'My Python Notebook',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		},
		cells: [
			{
				id: 'cell-1',
				type: 'markdown',
				source: '# Introduction\nThis is my notebook',
				execution_count: null,
				outputs: [],
				state: 'idle'
			},
			{
				id: 'cell-2',
				type: 'code',
				source: 'print("Hello World")',
				execution_count: 1,
				outputs: [
					{
						output_type: 'stream',
						name: 'stdout',
						text: 'Hello World\n'
					}
				],
				state: 'success'
			}
		]
	};

	// Get Jupyter-formatted JSON
	const ipynbJson = exportToIpynb(notebook);
	console.log(ipynbJson);
}

// Example 2: Download notebook as .ipynb file
function example2(notebook: NotebookContent) {
	// Trigger browser download
	downloadIpynb(notebook, 'my-notebook');
	// Downloads as "my-notebook.ipynb"
}

// Example 3: Upload to server or send via API
async function example3(notebook: NotebookContent) {
	const ipynbJson = exportToIpynb(notebook);

	await fetch('/api/export', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ ipynb: ipynbJson })
	});
}

export { example1, example2, example3 };
