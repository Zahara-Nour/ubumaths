import { describe, it, expect } from 'vitest';
import { importIpynb, isValidIpynb, getIpynbMetadata } from './notebook-import';

describe('notebook-import', () => {
	describe('isValidIpynb', () => {
		it('validates a minimal valid notebook', () => {
			const validNotebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: []
			});

			expect(isValidIpynb(validNotebook)).toBe(true);
		});

		it('rejects invalid JSON', () => {
			expect(isValidIpynb('not json')).toBe(false);
		});

		it('rejects missing nbformat', () => {
			const invalid = JSON.stringify({
				cells: []
			});

			expect(isValidIpynb(invalid)).toBe(false);
		});

		it('rejects missing cells array', () => {
			const invalid = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {}
			});

			expect(isValidIpynb(invalid)).toBe(false);
		});

		it('rejects old nbformat versions', () => {
			const invalid = JSON.stringify({
				nbformat: 3,
				nbformat_minor: 0,
				metadata: {},
				cells: []
			});

			expect(isValidIpynb(invalid)).toBe(false);
		});
	});

	describe('getIpynbMetadata', () => {
		it('extracts metadata from notebook', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {
					kernelspec: {
						name: 'python3',
						display_name: 'Python 3',
						language: 'python'
					},
					language_info: {
						name: 'python',
						version: '3.11.0'
					}
				},
				cells: [
					{ cell_type: 'code', source: 'print("hello")', outputs: [] },
					{ cell_type: 'markdown', source: '# Title' },
					{ cell_type: 'code', source: 'x = 1', outputs: [] }
				]
			});

			const metadata = getIpynbMetadata(notebook);

			expect(metadata).toEqual({
				kernel_name: 'Python 3',
				language: 'python',
				cell_count: 3,
				code_cells: 2,
				markdown_cells: 1
			});
		});

		it('handles missing kernel info', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [{ cell_type: 'code', source: '', outputs: [] }]
			});

			const metadata = getIpynbMetadata(notebook);

			expect(metadata.kernel_name).toBe('Unknown');
			expect(metadata.language).toBe('python');
		});

		it('throws error for invalid JSON', () => {
			expect(() => getIpynbMetadata('invalid')).toThrow(/métadonnées/);
		});
	});

	describe('importIpynb', () => {
		it('imports minimal notebook', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'print("hello")',
						execution_count: null,
						outputs: []
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.version).toBe('1.0');
			expect(result.cells).toHaveLength(1);
			expect(result.cells[0].type).toBe('code');
			expect(result.cells[0].source).toBe('print("hello")');
		});

		it('handles source as string array', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: ['print("hello")\n', 'print("world")'],
						outputs: []
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].source).toBe('print("hello")\nprint("world")');
		});

		it('converts markdown cells', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'markdown',
						source: '# Title\n\nSome text'
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].type).toBe('markdown');
			expect(result.cells[0].source).toBe('# Title\n\nSome text');
			expect(result.cells[0].execution_count).toBeNull();
			expect(result.cells[0].outputs).toEqual([]);
		});

		it('skips raw cells', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{ cell_type: 'code', source: 'x = 1', outputs: [] },
					{ cell_type: 'raw', source: 'raw content' },
					{ cell_type: 'code', source: 'y = 2', outputs: [] }
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells).toHaveLength(2);
			expect(result.cells[0].source).toBe('x = 1');
			expect(result.cells[1].source).toBe('y = 2');
		});

		it('ensures at least one cell exists', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: []
			});

			const result = importIpynb(notebook);

			expect(result.cells).toHaveLength(1);
			expect(result.cells[0].type).toBe('code');
			expect(result.cells[0].source).toBe('');
		});

		it('generates unique cell IDs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{ cell_type: 'code', source: 'x = 1', outputs: [] },
					{ cell_type: 'code', source: 'y = 2', outputs: [] }
				]
			});

			const result = importIpynb(notebook);

			const ids = result.cells.map((c) => c.id);
			expect(new Set(ids).size).toBe(2); // All unique
			expect(ids.every((id) => id.length > 0)).toBe(true);
		});

		it('preserves cell IDs from metadata', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'x = 1',
						metadata: { id: 'custom-id-123' },
						outputs: []
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].id).toBe('custom-id-123');
		});

		it('converts stream outputs (string)', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'print("hello")',
						execution_count: 1,
						outputs: [
							{
								output_type: 'stream',
								name: 'stdout',
								text: 'hello\n'
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs).toHaveLength(1);
			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'stream',
				name: 'stdout',
				text: 'hello\n'
			});
		});

		it('converts stream outputs (string array)', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'print("hello")',
						outputs: [
							{
								output_type: 'stream',
								name: 'stdout',
								text: ['hello\n', 'world\n']
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'stream',
				name: 'stdout',
				text: 'hello\nworld\n'
			});
		});

		it('converts error outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: '1/0',
						outputs: [
							{
								output_type: 'error',
								ename: 'ZeroDivisionError',
								evalue: 'division by zero',
								traceback: ['Traceback (most recent call last):', '  File ...']
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'error',
				ename: 'ZeroDivisionError',
				evalue: 'division by zero',
				traceback: ['Traceback (most recent call last):', '  File ...']
			});
		});

		it('converts execute_result outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: '2 + 2',
						execution_count: 1,
						outputs: [
							{
								output_type: 'execute_result',
								execution_count: 1,
								data: {
									'text/plain': '4'
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'execute_result',
				data: {
					'text/plain': '4'
				},
				execution_count: 1
			});
		});

		it('converts display_data outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'display(obj)',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'text/plain': 'Some object',
									'text/html': '<b>HTML</b>'
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'text/plain': 'Some object',
					'text/html': '<b>HTML</b>'
				}
			});
		});

		it('converts PNG image outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'plt.plot([1,2,3])',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'image/png': 'base64encodeddata=='
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'image/png': 'base64encodeddata=='
				}
			});
		});

		it('preserves JPEG image outputs separately', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'display(img)',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'image/jpeg': 'base64jpegdata=='
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'image/jpeg': 'base64jpegdata=='
				}
			});
		});

		it('preserves both PNG and JPEG when both present', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'display(img)',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'image/png': 'base64pngdata==',
									'image/jpeg': 'base64jpegdata=='
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'image/png': 'base64pngdata==',
					'image/jpeg': 'base64jpegdata=='
				}
			});
		});

		it('converts LaTeX outputs to HTML', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'display(Latex(...))',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'text/latex': '$$x^2$$'
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'text/html': '<div class="latex">$$x^2$$</div>'
				}
			});
		});

		it('does not overwrite HTML with LaTeX conversion', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'display(obj)',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'text/html': '<b>Existing HTML</b>',
									'text/latex': '$$x^2$$'
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'text/html': '<b>Existing HTML</b>'
				}
			});
		});

		it('converts JSON outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'data',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'application/json': { key: 'value' }
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'application/json': '{"key":"value"}'
				}
			});
		});

		it('converts Plotly outputs', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'fig.show()',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'application/vnd.plotly.v1+json': {
										data: [],
										layout: {}
									}
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs[0]).toEqual({
				output_type: 'display_data',
				data: {
					'application/json': '{"data":[],"layout":{}}'
				}
			});
		});

		it('handles multiple outputs per cell', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'code',
						outputs: [
							{
								output_type: 'stream',
								name: 'stdout',
								text: 'output1'
							},
							{
								output_type: 'stream',
								name: 'stderr',
								text: 'output2'
							},
							{
								output_type: 'execute_result',
								execution_count: 1,
								data: { 'text/plain': 'result' }
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs).toHaveLength(3);
		});

		it('skips outputs with no supported data types', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'code',
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'application/vnd.jupyter.widget-view+json': { model_id: 'abc' }
								}
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].outputs).toHaveLength(0);
		});

		it('extracts kernel info from metadata', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {
					kernelspec: {
						name: 'python3',
						display_name: 'Python 3 (ipykernel)'
					},
					language_info: {
						name: 'python',
						version: '3.11.5'
					}
				},
				cells: []
			});

			const result = importIpynb(notebook);

			expect(result.metadata.kernel_info).toEqual({
				name: 'python3',
				language: 'python',
				version: '3.11.5'
			});
		});

		it('uses default kernel info when missing', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: []
			});

			const result = importIpynb(notebook);

			expect(result.metadata.kernel_info).toEqual({
				name: 'python3',
				language: 'python',
				version: '3.11'
			});
		});

		it('preserves cell metadata', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {},
				cells: [
					{
						cell_type: 'code',
						source: 'code',
						metadata: {
							collapsed: true,
							tags: ['test', 'example']
						},
						outputs: []
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells[0].metadata).toEqual({
				collapsed: true,
				tags: ['test', 'example']
			});
		});

		it('throws error for invalid format', () => {
			expect(() => importIpynb('invalid')).toThrow(/Format de fichier invalide/);
		});

		it('throws error for malformed JSON', () => {
			expect(() => importIpynb('{ invalid json')).toThrow(/Format de fichier invalide/);
		});

		it('handles Google Colab notebooks', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {
					colab: {
						name: 'My Colab Notebook'
					},
					kernelspec: {
						name: 'python3',
						display_name: 'Python 3'
					}
				},
				cells: [
					{
						cell_type: 'code',
						source: ['print("hello from colab")'],
						outputs: []
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells).toHaveLength(1);
			expect(result.cells[0].source).toBe('print("hello from colab")');
		});

		it('handles real-world Jupyter notebook with complete nbformat 4 structure', () => {
			// This is a realistic notebook structure from Jupyter Lab
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 5,
				metadata: {
					kernelspec: {
						display_name: 'Python 3 (ipykernel)',
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
						version: '3.11.5'
					}
				},
				cells: [
					{
						cell_type: 'markdown',
						id: 'intro-cell',
						metadata: {},
						source: ['# Data Analysis\n', '\n', 'This notebook demonstrates data analysis.']
					},
					{
						cell_type: 'code',
						execution_count: 1,
						id: 'imports-cell',
						metadata: {
							tags: ['imports']
						},
						outputs: [],
						source: [
							'import numpy as np\n',
							'import pandas as pd\n',
							'import matplotlib.pyplot as plt'
						]
					},
					{
						cell_type: 'code',
						execution_count: 2,
						id: 'plot-cell',
						metadata: {},
						outputs: [
							{
								output_type: 'display_data',
								data: {
									'text/plain': ['<Figure size 640x480 with 1 Axes>'],
									'image/png': 'iVBORw0KGgoAAAANSUhEUgAAAoAAAAHg...'
								},
								metadata: {}
							}
						],
						source: ['plt.plot([1, 2, 3])\n', 'plt.show()']
					}
				]
			});

			const result = importIpynb(notebook);

			// Verify structure
			expect(result.version).toBe('1.0');
			expect(result.cells).toHaveLength(3);

			// Verify markdown cell
			expect(result.cells[0].type).toBe('markdown');
			expect(result.cells[0].id).toBe('intro-cell');
			expect(result.cells[0].source).toBe(
				'# Data Analysis\n\nThis notebook demonstrates data analysis.'
			);

			// Verify code cell with metadata
			expect(result.cells[1].type).toBe('code');
			expect(result.cells[1].id).toBe('imports-cell');
			expect(result.cells[1].metadata?.tags).toEqual(['imports']);
			expect(result.cells[1].source).toBe(
				'import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt'
			);

			// Verify plot cell with display output
			expect(result.cells[2].type).toBe('code');
			expect(result.cells[2].execution_count).toBe(2);
			expect(result.cells[2].outputs).toHaveLength(1);
			expect(result.cells[2].outputs[0].output_type).toBe('display_data');

			// Verify kernel info extraction
			expect(result.metadata.kernel_info).toEqual({
				name: 'python3',
				language: 'python',
				version: '3.11.5'
			});
		});

		it('handles complex Colab notebook with GPU runtime and form fields', () => {
			const notebook = JSON.stringify({
				nbformat: 4,
				nbformat_minor: 0,
				metadata: {
					colab: {
						name: 'ML Training.ipynb',
						provenance: [],
						collapsed_sections: [],
						authorship_tag: 'ABX9TyMabc123',
						accelerator: 'GPU'
					},
					kernelspec: {
						name: 'python3',
						display_name: 'Python 3'
					},
					language_info: {
						name: 'python'
					},
					accelerator: 'GPU'
				},
				cells: [
					{
						cell_type: 'code',
						metadata: {
							id: 'params',
							cellView: 'form'
						},
						source: [
							'#@title Training Parameters\n',
							'learning_rate = 0.001 #@param {type:"number"}\n',
							'epochs = 100 #@param {type:"slider", min:10, max:500}'
						],
						execution_count: null,
						outputs: []
					},
					{
						cell_type: 'code',
						metadata: {
							id: 'training',
							colab: {
								base_uri: 'https://localhost:8080/'
							}
						},
						source: ['print(f"Training with lr={learning_rate}")'],
						execution_count: 1,
						outputs: [
							{
								output_type: 'stream',
								name: 'stdout',
								text: ['Training with lr=0.001\n']
							}
						]
					}
				]
			});

			const result = importIpynb(notebook);

			expect(result.cells).toHaveLength(2);

			// Verify Colab form parameters are preserved in source
			expect(result.cells[0].source).toContain('#@title Training Parameters');
			expect(result.cells[0].source).toContain('#@param');

			// Verify metadata is preserved
			expect(result.cells[0].metadata?.cellView).toBe('form');

			// Verify normal execution works
			expect(result.cells[1].execution_count).toBe(1);
			expect(result.cells[1].outputs).toHaveLength(1);
		});
	});
});
