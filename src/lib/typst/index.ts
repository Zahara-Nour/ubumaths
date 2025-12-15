/**
 * Typst Module - Central Export Point
 * ====================================
 *
 * Centralized module for all Typst-related functionality:
 * - Compiler management (WASM-based Typst compiler)
 * - Compilation service (caching, concurrency, error handling)
 * - Document generators (worksheets, corrections)
 * - AST transpiler (markdown to Typst)
 * - Templates (built-in and custom)
 *
 * @module typst
 *
 * @example Basic usage
 * ```typescript
 * import { compileToSvg, compileToPdf } from '$lib/typst';
 *
 * const svg = await compileToSvg(typstContent);
 * const pdf = await compileToPdf(typstContent);
 * ```
 *
 * @example Using types
 * ```typescript
 * import type { TypstCompiler, CompileResult, GeneratorConfig } from '$lib/typst';
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

// Export all types from the types module
export type {
	// Compiler types
	TypstCompiler,
	TypstCompilerState,
	// Service types
	OutputFormat,
	CompileOptions,
	CompileResult,
	ServiceState,
	TypstServiceConfig,
	// Cache types
	CacheEntry,
	CacheStats,
	// Generator types
	GeneratorMode,
	GeneratorContext,
	GeneratorConfig,
	GenerateResult,
	// Transpiler types
	TypstTranspilerOptions,
	// Template types
	TemplatePlaceholder,
	TypstTemplate,
	// Batch types
	BatchCompileItem,
	BatchCompileResult,
	// Error types
	TypstCompileError
} from './types';

// Export constants
export {
	DEFAULT_SERVICE_CONFIG,
	DEFAULT_GENERATOR_CONFIG,
	DEFAULT_TRANSPILER_OPTIONS
} from './types';

// ============================================================================
// COMPILER
// ============================================================================

export {
	getTypstCompiler,
	compileToSvg,
	compileToPdf,
	getCompilerState,
	isCompilerReady,
	isCompilerLoading,
	getCompilerError,
	resetCompilerState,
	cleanupCompiler
} from './compiler';

// ============================================================================
// CACHE
// ============================================================================

export { TypstCache, createTypstCache } from './cache';

// ============================================================================
// SERVICE
// ============================================================================

export { TypstService, getTypstService, PRIORITY } from './service';

// ============================================================================
// GENERATORS
// ============================================================================

export {
	// Base class
	BaseTypstGenerator,
	// Worksheet generator
	WorksheetGenerator,
	generateWorksheetTypst,
	generateBatchTypst
} from './generators';

export type { WorksheetGeneratorInput, GenerateTypstParams } from './generators';

// ============================================================================
// UTILS
// ============================================================================

export {
	// Number formatting
	formatNumber,
	toRoman,
	// Date formatting
	formatDateFR,
	// Label utilities
	getTypeLabel,
	// Re-exported from transpiler
	escapeTypst,
	escapeTypstBrackets
} from './utils';

// ============================================================================
// TRANSPILER (re-exported from custom-markdown/generators)
// ============================================================================

export {
	generateTypst as transpileToTypst,
	resolveTypstImagePath as resolveImagePath,
	markdownToTypst,
	transpileImage
} from '$lib/custom-markdown/generators';

// ============================================================================
// TEMPLATES
// ============================================================================

export {
	// Individual template constants
	STANDARD_TEMPLATE,
	ASSESSMENT_TEMPLATE,
	EXAM_TEMPLATE,
	HOMEWORK_TEMPLATE,
	QUIZ_TEMPLATE,
	MINIMAL_TEMPLATE,
	MODERN_TEMPLATE,
	TWO_COLUMNS_TEMPLATE,
	LANDSCAPE_TEMPLATE,
	MAGAZINE_TEMPLATE,
	SCIENTIFIC_TEMPLATE,
	// Template collections
	DEFAULT_TEMPLATES,
	DEFAULT_TEMPLATE_IDS,
	COMMON_PLACEHOLDERS,
	SAMPLE_PREVIEW_DATA,
	// Utility functions
	getDefaultTemplate,
	getDefaultTemplatesByType,
	renderTemplate
} from './templates';

export type { DefaultTemplate } from './templates';
