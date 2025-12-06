/**
 * Browser-side tests for notebook export utilities (requires DOM)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadIpynb } from './notebook-export';
import type { NotebookContent } from '$lib/types/notebook';

describe('downloadIpynb', () => {
	let createElementSpy: ReturnType<typeof vi.spyOn<Document, 'createElement'>>;
	let revokeObjectURLSpy: ReturnType<typeof vi.spyOn<typeof URL, 'revokeObjectURL'>>;

	beforeEach(() => {
		// Mock DOM elements
		const mockLink = {
			href: '',
			download: '',
			style: { display: '' },
			click: vi.fn()
		} as unknown as HTMLAnchorElement;

		createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
		vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
		vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);

		// Mock URL methods
		vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
		revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should create download link with correct filename', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test Notebook',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		downloadIpynb(notebook, 'my-notebook');

		const link = createElementSpy.mock.results[0].value;
		expect(link.download).toBe('my-notebook.ipynb');
	});

	it('should remove .ipynb extension if already present', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		downloadIpynb(notebook, 'my-notebook.ipynb');

		const link = createElementSpy.mock.results[0].value;
		expect(link.download).toBe('my-notebook.ipynb');
	});

	it('should trigger click on link', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		downloadIpynb(notebook, 'test');

		const link = createElementSpy.mock.results[0].value;
		expect(link.click).toHaveBeenCalled();
	});

	it('should cleanup blob URL', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		downloadIpynb(notebook, 'test');

		expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
	});

	it('should append and remove link from DOM', () => {
		const notebook: NotebookContent = {
			version: '1.0',
			metadata: {
				title: 'Test',
				created_at: '2025-01-01T00:00:00Z',
				updated_at: '2025-01-01T00:00:00Z'
			},
			cells: []
		};

		const appendSpy = vi.spyOn(document.body, 'appendChild');
		const removeSpy = vi.spyOn(document.body, 'removeChild');

		downloadIpynb(notebook, 'test');

		expect(appendSpy).toHaveBeenCalled();
		expect(removeSpy).toHaveBeenCalled();
	});
});
