/**
 * Example usage of notebook-import utility
 *
 * This file demonstrates how to use the Jupyter notebook import functions
 */

import { importIpynb, isValidIpynb, getIpynbMetadata } from './notebook-import';
import type { NotebookContent } from '$lib/types/notebook';

// Example 1: Validate before importing
export function importNotebookFile(fileContent: string): NotebookContent | null {
	// Check if valid
	if (!isValidIpynb(fileContent)) {
		console.error('Invalid notebook format');
		return null;
	}

	// Get metadata to preview
	const metadata = getIpynbMetadata(fileContent);
	console.log(
		`Importing ${metadata.code_cells} code cells and ${metadata.markdown_cells} markdown cells`
	);

	// Import
	try {
		const notebook = importIpynb(fileContent);
		return notebook;
	} catch (error) {
		console.error('Import failed:', error);
		return null;
	}
}

// Example 2: Handle file upload
export async function handleNotebookUpload(file: File): Promise<NotebookContent | null> {
	// Read file
	const content = await file.text();

	// Validate
	if (!isValidIpynb(content)) {
		throw new Error("Le fichier n'est pas un notebook Jupyter valide");
	}

	// Check metadata
	const metadata = getIpynbMetadata(content);
	if (metadata.language !== 'python') {
		throw new Error(`Seuls les notebooks Python sont supportés (détecté: ${metadata.language})`);
	}

	// Import
	const notebook = importIpynb(content);

	// Optionally update title based on filename
	notebook.metadata.title = file.name.replace('.ipynb', '');

	return notebook;
}

// Example 3: Preview before import
export function getNotebookPreview(fileContent: string) {
	if (!isValidIpynb(fileContent)) {
		return null;
	}

	const metadata = getIpynbMetadata(fileContent);

	return {
		kernel: metadata.kernel_name,
		language: metadata.language,
		totalCells: metadata.cell_count,
		codeCells: metadata.code_cells,
		markdownCells: metadata.markdown_cells,
		canImport: metadata.language === 'python'
	};
}

// Example 4: Batch import
export function importMultipleNotebooks(files: string[]): NotebookContent[] {
	const results: NotebookContent[] = [];

	for (const fileContent of files) {
		try {
			if (isValidIpynb(fileContent)) {
				const notebook = importIpynb(fileContent);
				results.push(notebook);
			}
		} catch (error) {
			console.error('Failed to import notebook:', error);
		}
	}

	return results;
}
