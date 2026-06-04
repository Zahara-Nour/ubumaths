/**
 * Typst Generators - Central Export
 * ==================================
 *
 * Export all generator classes and legacy functions.
 *
 * @module typst/generators
 */

// Base generator class
export { BaseTypstGenerator } from './base-generator';

// Worksheet generator
export {
	WorksheetGenerator,
	generateWorksheetTypst,
	generateBatchTypst
} from './worksheet-generator';

// Types
export type { WorksheetGeneratorInput, GenerateTypstParams } from './worksheet-generator';

// Notebook generator
export {
	NotebookGenerator,
	generateNotebookTypst,
	extractInlineImages,
	DEFAULT_NOTEBOOK_EXPORT_OPTIONS
} from './notebook-generator';

export type {
	NotebookGeneratorInput,
	NotebookExportOptions,
	InlineImageMap
} from './notebook-generator';
