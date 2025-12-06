/**
 * Tests for notebook export utilities (server-side tests only)
 * Browser tests (downloadIpynb) are in notebook-export.svelte.test.ts
 */

import { describe, it, expect } from 'vitest';
import { exportToIpynb } from './notebook-export';
import { importIpynb } from './notebook-import';
import type { NotebookContent } from '$lib/types/notebook';

describe('exportToIpynb', () => {
	it('should export basic notebook with code cell', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test Notebook',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
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

		const result = JSON.parse(exportToIpynb(notebook));

		expect(result.nbformat).toBe(4);
		expect(result.nbformat_minor).toBe(5);
		expect(result.metadata.kernelspec.language).toBe('python');
		expect(result.metadata.language_info.name).toBe('python');
		expect(result.cells).toHaveLength(1);

		const cell = result.cells[0];
		expect(cell.cell_type).toBe('code');
		expect(cell.source).toEqual(['print("Hello World")']);
		expect(cell.execution_count).toBe(1);
		expect(cell.outputs).toHaveLength(1);
		expect(cell.outputs[0].output_type).toBe('stream');
		expect(cell.outputs[0].name).toBe('stdout');
		expect(cell.outputs[0].text).toEqual(['Hello World\n']);
	});

	it('should handle multiline code source', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'x = 1\ny = 2\nprint(x + y)',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.cells[0].source).toEqual(['x = 1\n', 'y = 2\n', 'print(x + y)']);
	});

	it('should handle markdown cells', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'markdown',
					source: '# Title\nSome **markdown** text',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const cell = result.cells[0];

		expect(cell.cell_type).toBe('markdown');
		expect(cell.source).toEqual(['# Title\n', 'Some **markdown** text']);
		expect(cell.outputs).toBeUndefined(); // Markdown cells don't have outputs
	});

	it('should handle error outputs', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: '1/0',
					execution_count: 1,
					outputs: [
						{
							output_type: 'error',
							ename: 'ZeroDivisionError',
							evalue: 'division by zero',
							traceback: [
								'Traceback (most recent call last):',
								'  File "<stdin>", line 1, in <module>',
								'ZeroDivisionError: division by zero'
							]
						}
					],
					state: 'error'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const output = result.cells[0].outputs[0];

		expect(output.output_type).toBe('error');
		expect(output.ename).toBe('ZeroDivisionError');
		expect(output.evalue).toBe('division by zero');
		expect(output.traceback).toHaveLength(3);
	});

	it('should handle execute_result outputs', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: '2 + 2',
					execution_count: 1,
					outputs: [
						{
							output_type: 'execute_result',
							data: {
								'text/plain': '4'
							},
							execution_count: 1
						}
					],
					state: 'success'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const output = result.cells[0].outputs[0];

		expect(output.output_type).toBe('execute_result');
		expect(output.data['text/plain']).toBe('4');
		expect(output.execution_count).toBe(1);
		expect(output.metadata).toEqual({});
	});

	it('should handle display_data outputs', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'import matplotlib.pyplot as plt',
					execution_count: 1,
					outputs: [
						{
							output_type: 'display_data',
							data: {
								'text/plain': '<Figure size 640x480>',
								'image/png': 'iVBORw0KGgoAAAANSUhEUg...'
							}
						}
					],
					state: 'success'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const output = result.cells[0].outputs[0];

		expect(output.output_type).toBe('display_data');
		expect(output.data['text/plain']).toBe('<Figure size 640x480>');
		expect(output.data['image/png']).toBe('iVBORw0KGgoAAAANSUhEUg...');
		expect(output.metadata).toEqual({});
	});

	it('should handle multiple outputs in single cell', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'print("A")\nprint("B")',
					execution_count: 1,
					outputs: [
						{
							output_type: 'stream',
							name: 'stdout',
							text: 'A\n'
						},
						{
							output_type: 'stream',
							name: 'stdout',
							text: 'B\n'
						}
					],
					state: 'success'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.cells[0].outputs).toHaveLength(2);
	});

	it('should handle stderr stream', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'import sys\nprint("error", file=sys.stderr)',
					execution_count: 1,
					outputs: [
						{
							output_type: 'stream',
							name: 'stderr',
							text: 'error\n'
						}
					],
					state: 'success'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const output = result.cells[0].outputs[0];

		expect(output.name).toBe('stderr');
	});

	it('should handle empty source', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.cells[0].source).toEqual([]);
	});

	it('should handle null execution_count', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'x = 1',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.cells[0].execution_count).toBeNull();
	});

	it('should preserve cell metadata', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'x = 1',
					execution_count: null,
					outputs: [],
					state: 'idle',
					metadata: {
						collapsed: true,
						tags: ['important', 'test']
					}
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.cells[0].metadata).toEqual({
			collapsed: true,
			tags: ['important', 'test']
		});
	});

	it('should use custom kernel version if provided', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				kernel_info: {
					name: 'python3',
					language: 'python',
					version: '3.12.1'
				}
			},
			cells: []
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.metadata.language_info.version).toBe('3.12.1');
	});

	it('should use default Python version if not provided', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		const result = JSON.parse(exportToIpynb(notebook));
		expect(result.metadata.language_info.version).toBe('3.11.0');
	});

	it('should handle execute_result without execution_count', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: '42',
					execution_count: 1,
					outputs: [
						{
							output_type: 'execute_result',
							data: {
								'text/plain': '42'
							}
						}
					],
					state: 'success'
				}
			]
		};

		const result = JSON.parse(exportToIpynb(notebook));
		const output = result.cells[0].outputs[0];

		expect(output.execution_count).toBe(0);
	});

	it('should produce valid JSON', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'print("test")',
					execution_count: 1,
					outputs: [],
					state: 'success'
				}
			]
		};

		const json = exportToIpynb(notebook);
		expect(() => JSON.parse(json)).not.toThrow();
	});
});

describe('Round-trip tests (import → export → re-import)', () => {
	it('should preserve content through export-import cycle', () => {
		const original: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Round-trip Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z',
				kernel_info: {
					name: 'python3',
					language: 'python',
					version: '3.11.5'
				}
			},
			cells: [
				{
					id: 'cell-1',
					type: 'markdown',
					source: '# Title\n\nSome text',
					execution_count: null,
					outputs: [],
					state: 'idle'
				},
				{
					id: 'cell-2',
					type: 'code',
					source: 'x = 1\ny = 2\nprint(x + y)',
					execution_count: 1,
					outputs: [
						{
							output_type: 'stream',
							name: 'stdout',
							text: '3\n'
						}
					],
					state: 'success'
				}
			]
		};

		// Export to .ipynb format
		const exported = exportToIpynb(original);

		// Re-import
		const reimported = importIpynb(exported);

		// Verify cells match
		expect(reimported.cells).toHaveLength(2);

		// Verify markdown cell
		expect(reimported.cells[0].type).toBe('markdown');
		expect(reimported.cells[0].source).toBe('# Title\n\nSome text');

		// Verify code cell
		expect(reimported.cells[1].type).toBe('code');
		expect(reimported.cells[1].source).toBe('x = 1\ny = 2\nprint(x + y)');
		expect(reimported.cells[1].execution_count).toBe(1);
		expect(reimported.cells[1].outputs).toHaveLength(1);
		expect(reimported.cells[1].outputs[0]).toEqual({
			output_type: 'stream',
			name: 'stdout',
			text: '3\n'
		});

		// Verify kernel info
		expect(reimported.metadata.kernel_info?.version).toBe('3.11.5');
	});

	it('should preserve all output types through round-trip', () => {
		const original: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Output Types Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'various outputs',
					execution_count: 1,
					outputs: [
						{
							output_type: 'stream',
							name: 'stdout',
							text: 'stdout output\n'
						},
						{
							output_type: 'stream',
							name: 'stderr',
							text: 'stderr output\n'
						},
						{
							output_type: 'execute_result',
							data: {
								'text/plain': '42'
							},
							execution_count: 1
						},
						{
							output_type: 'display_data',
							data: {
								'text/html': '<b>HTML</b>',
								'image/png': 'base64data=='
							}
						},
						{
							output_type: 'error',
							ename: 'ValueError',
							evalue: 'test error',
							traceback: ['Traceback...', 'ValueError: test error']
						}
					],
					state: 'error'
				}
			]
		};

		const exported = exportToIpynb(original);
		const reimported = importIpynb(exported);

		expect(reimported.cells[0].outputs).toHaveLength(5);

		// Verify each output type
		expect(reimported.cells[0].outputs[0]).toEqual({
			output_type: 'stream',
			name: 'stdout',
			text: 'stdout output\n'
		});

		expect(reimported.cells[0].outputs[1]).toEqual({
			output_type: 'stream',
			name: 'stderr',
			text: 'stderr output\n'
		});

		expect(reimported.cells[0].outputs[2]).toMatchObject({
			output_type: 'execute_result',
			data: {
				'text/plain': '42'
			},
			execution_count: 1
		});

		expect(reimported.cells[0].outputs[3]).toMatchObject({
			output_type: 'display_data',
			data: {
				'text/html': '<b>HTML</b>',
				'image/png': 'base64data=='
			}
		});

		expect(reimported.cells[0].outputs[4]).toEqual({
			output_type: 'error',
			ename: 'ValueError',
			evalue: 'test error',
			traceback: ['Traceback...', 'ValueError: test error']
		});
	});

	it('should preserve metadata through round-trip', () => {
		const original: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Metadata Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'code',
					execution_count: null,
					outputs: [],
					state: 'idle',
					metadata: {
						collapsed: true,
						tags: ['important', 'test']
					}
				}
			]
		};

		const exported = exportToIpynb(original);
		const reimported = importIpynb(exported);

		expect(reimported.cells[0].metadata).toEqual({
			collapsed: true,
			tags: ['important', 'test']
		});
	});

	it('should handle empty cells in round-trip', () => {
		const original: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Empty Cells Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle'
				},
				{
					id: 'cell-2',
					type: 'markdown',
					source: '',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const exported = exportToIpynb(original);
		const reimported = importIpynb(exported);

		expect(reimported.cells).toHaveLength(2);
		expect(reimported.cells[0].source).toBe('');
		expect(reimported.cells[1].source).toBe('');
	});

	it('should handle trailing newlines correctly in round-trip', () => {
		const original: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Newlines Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: [
				{
					id: 'cell-1',
					type: 'code',
					source: 'line1\nline2\nline3\n',
					execution_count: null,
					outputs: [],
					state: 'idle'
				}
			]
		};

		const exported = exportToIpynb(original);
		const reimported = importIpynb(exported);

		// Should preserve trailing newline
		expect(reimported.cells[0].source).toBe('line1\nline2\nline3\n');
	});

	it('should handle real Jupyter notebook through round-trip', () => {
		const jupyterNotebook = JSON.stringify({
			nbformat: 4,
			nbformat_minor: 5,
			metadata: {
				kernelspec: {
					display_name: 'Python 3 (ipykernel)',
					language: 'python',
					name: 'python3'
				},
				language_info: {
					name: 'python',
					version: '3.11.5'
				}
			},
			cells: [
				{
					cell_type: 'code',
					execution_count: 1,
					metadata: {
						tags: ['parameters']
					},
					outputs: [
						{
							output_type: 'execute_result',
							execution_count: 1,
							data: {
								'text/plain': ['[1, 2, 3]']
							}
						}
					],
					source: ['data = [1, 2, 3]\n', 'data']
				}
			]
		});

		// Import real notebook
		const imported = importIpynb(jupyterNotebook);

		// Export it back
		const exported = exportToIpynb(imported);

		// Re-import
		const reimported = importIpynb(exported);

		// Verify content integrity
		expect(reimported.cells[0].source).toBe('data = [1, 2, 3]\ndata');
		expect(reimported.cells[0].execution_count).toBe(1);
		expect(reimported.cells[0].metadata?.tags).toEqual(['parameters']);
		expect(reimported.cells[0].outputs[0].output_type).toBe('execute_result');
	});

	it('should preserve multiple MIME types in display outputs through round-trip', () => {
		// Start with a Jupyter notebook (like what we'd import)
		const jupyterNotebook = JSON.stringify({
			nbformat: 4,
			nbformat_minor: 5,
			metadata: {
				kernelspec: {
					name: 'python3',
					display_name: 'Python 3'
				}
			},
			cells: [
				{
					cell_type: 'code',
					source: 'display(rich_object)',
					execution_count: 1,
					outputs: [
						{
							output_type: 'display_data',
							data: {
								'text/plain': 'Plain text representation',
								'text/html': '<div>HTML representation</div>',
								'image/png': 'base64imagedata==',
								'application/json': { key: 'value' }
							},
							metadata: {}
						}
					]
				}
			]
		});

		// Import → Export → Re-import
		const imported = importIpynb(jupyterNotebook);
		const exported = exportToIpynb(imported);
		const reimported = importIpynb(exported);

		const output = reimported.cells[0].outputs[0] as {
			output_type: string;
			data: Record<string, string>;
		};

		expect(output.data['text/plain']).toBe('Plain text representation');
		expect(output.data['text/html']).toBe('<div>HTML representation</div>');
		expect(output.data['image/png']).toBe('base64imagedata==');
		expect(output.data['application/json']).toBe('{"key":"value"}');
	});
});
