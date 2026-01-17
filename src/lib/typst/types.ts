/**
 * Typst Module - Type Definitions
 * ================================
 *
 * Complete type system for the Typst compilation and generation module.
 * This module provides types for:
 * - Compiler management (WASM-based Typst compiler)
 * - Service orchestration (compilation, caching, concurrency)
 * - Document generation (worksheets, corrections, previews)
 * - AST transpilation (markdown to Typst)
 *
 * @module typst/types
 */

// ============================================================================
// COMPILER TYPES
// ============================================================================

/**
 * Typst compiler instance interface
 *
 * Represents the WASM-based Typst compiler loaded from CDN.
 * Provides methods for configuring and executing compilations.
 *
 * @example Basic usage
 * ```typescript
 * const compiler: TypstCompiler = await getTypstCompiler();
 * const svg = await compiler.svg({ mainContent: typstSource });
 * const pdf = await compiler.pdf({ mainContent: typstSource });
 * ```
 */
export interface TypstCompiler {
	/**
	 * Configure compiler WASM module options
	 * Must be called before first compilation
	 *
	 * @param options - Compiler initialization options
	 */
	setCompilerInitOptions: (options: { getModule: () => string }) => void;

	/**
	 * Configure renderer WASM module options
	 * Must be called before first SVG rendering
	 *
	 * @param options - Renderer initialization options
	 */
	setRendererInitOptions: (options: { getModule: () => string }) => void;

	/**
	 * Compile Typst content to SVG
	 *
	 * @param options - Compilation options with main content
	 * @returns Promise resolving to SVG string
	 */
	svg: (options: { mainContent: string }) => Promise<string>;

	/**
	 * Compile Typst content to PDF
	 *
	 * @param options - Compilation options with main content
	 * @returns Promise resolving to PDF as Uint8Array
	 */
	pdf: (options: { mainContent: string }) => Promise<Uint8Array>;

	/**
	 * Map a virtual file path to binary content (for images, fonts, etc.)
	 *
	 * This creates a shadow file system that Typst can access during compilation.
	 * Use this to provide images that would otherwise require network access.
	 *
	 * @param path - Virtual file path (e.g., '/images/photo.png')
	 * @param content - Binary content as Uint8Array
	 *
	 * @example
	 * ```typescript
	 * const imageData = await fetch(url).then(r => r.arrayBuffer());
	 * typst.mapShadow('/images/photo.png', new Uint8Array(imageData));
	 * ```
	 */
	mapShadow: (path: string, content: Uint8Array) => void;

	/**
	 * Add a text source file to the virtual file system
	 *
	 * @param path - Virtual file path (e.g., '/template.typ')
	 * @param content - Text content
	 */
	addSource: (path: string, content: string) => void;

	/**
	 * Reset/clear all shadow mappings and source files
	 *
	 * Call this after compilation to free memory from mapped files.
	 */
	resetShadow: () => void;
}

/**
 * State of the Typst compiler singleton
 *
 * Tracks loading status, initialization, and errors for the
 * WASM-based Typst compiler instance.
 *
 * @example Checking state before compilation
 * ```typescript
 * const state = getCompilerState();
 * if (state.isLoading) {
 *   showLoadingIndicator();
 * } else if (state.error) {
 *   showError(state.error);
 * } else if (state.isInitialized && state.instance) {
 *   await compile(state.instance);
 * }
 * ```
 */
export interface TypstCompilerState {
	/** The compiler instance, null if not loaded */
	instance: TypstCompiler | null;

	/** Whether the compiler is currently being loaded */
	isLoading: boolean;

	/** Error message if loading/initialization failed */
	error: string | null;

	/** Whether the compiler has been successfully initialized */
	isInitialized: boolean;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

/**
 * Output format for Typst compilation
 *
 * - `pdf`: Binary PDF document (Uint8Array)
 * - `svg`: SVG markup string (for preview)
 * - `typst`: Raw Typst source (for debugging/editing)
 */
export type OutputFormat = 'pdf' | 'svg' | 'typst';

/**
 * Options for a compilation request
 *
 * @example Compile to PDF with cache bypass
 * ```typescript
 * const options: CompileOptions = {
 *   format: 'pdf',
 *   skipCache: true
 * };
 * ```
 */
export interface CompileOptions {
	/** Desired output format */
	format: OutputFormat;

	/** Skip cache lookup and force recompilation */
	skipCache?: boolean;
}

/**
 * Result of a compilation operation
 *
 * @example Successful PDF compilation
 * ```typescript
 * const result: CompileResult = {
 *   success: true,
 *   data: pdfBytes, // Uint8Array
 *   cached: false,
 *   format: 'pdf'
 * };
 * ```
 *
 * @example Failed compilation
 * ```typescript
 * const result: CompileResult = {
 *   success: false,
 *   error: 'Syntax error at line 42: unexpected token',
 *   format: 'pdf'
 * };
 * ```
 */
export interface CompileResult {
	/** Whether compilation succeeded */
	success: boolean;

	/**
	 * Compiled output data
	 * - Uint8Array for PDF format
	 * - string for SVG and Typst formats
	 * Only present if success is true
	 */
	data?: Uint8Array | string;

	/** Error message if compilation failed */
	error?: string;

	/** Whether result was retrieved from cache */
	cached?: boolean;

	/** Format of the output */
	format: OutputFormat;
}

/**
 * State of the Typst service
 *
 * - `idle`: Service created but not initialized
 * - `loading`: Compiler is being loaded
 * - `ready`: Ready to accept compilation requests
 * - `error`: Service encountered an unrecoverable error
 * - `compiling`: Currently processing a compilation
 */
export type ServiceState = 'idle' | 'loading' | 'ready' | 'error' | 'compiling';

/**
 * Configuration for the Typst service
 *
 * @example Custom configuration
 * ```typescript
 * const config: TypstServiceConfig = {
 *   maxConcurrent: 3,
 *   cacheMaxSize: 100,
 *   cacheTTL: 30 * 60 * 1000, // 30 minutes
 *   compileTimeout: 30000 // 30 seconds
 * };
 * ```
 */
export interface TypstServiceConfig {
	/**
	 * Maximum concurrent compilations
	 * Additional requests are queued
	 * @default 2
	 */
	maxConcurrent?: number;

	/**
	 * Maximum number of entries in the cache
	 * Oldest entries are evicted when exceeded
	 * @default 50
	 */
	cacheMaxSize?: number;

	/**
	 * Cache time-to-live in milliseconds
	 * Entries older than this are considered stale
	 * @default 600000 (10 minutes)
	 */
	cacheTTL?: number;

	/**
	 * Compilation timeout in milliseconds
	 * Compilations exceeding this are aborted
	 * @default 60000 (60 seconds)
	 */
	compileTimeout?: number;
}

// ============================================================================
// CACHE TYPES
// ============================================================================

/**
 * Entry in the Typst compilation cache
 *
 * @template T - Type of cached data (Uint8Array for PDF, string for SVG)
 *
 * @example PDF cache entry
 * ```typescript
 * const entry: CacheEntry<Uint8Array> = {
 *   data: pdfBytes,
 *   createdAt: Date.now(),
 *   accessCount: 5,
 *   contentHash: 'sha256:abc123...'
 * };
 * ```
 */
export interface CacheEntry<T> {
	/** Cached compilation result */
	data: T;

	/** Timestamp when entry was created (ms since epoch) */
	createdAt: number;

	/** Number of times this entry has been accessed */
	accessCount: number;

	/** Hash of the source content for cache key matching */
	contentHash: string;
}

/**
 * Statistics about cache usage
 *
 * @example Displaying cache stats
 * ```typescript
 * const stats: CacheStats = {
 *   size: 42,
 *   hits: 156,
 *   misses: 38,
 *   evictions: 12
 * };
 * console.log(`Cache hit rate: ${(stats.hits / (stats.hits + stats.misses) * 100).toFixed(1)}%`);
 * ```
 */
export interface CacheStats {
	/** Current number of entries in cache */
	size: number;

	/** Number of cache hits (successful lookups) */
	hits: number;

	/** Number of cache misses (unsuccessful lookups) */
	misses: number;

	/** Number of entries that were evicted */
	evictions: number;
}

// ============================================================================
// GENERATOR TYPES
// ============================================================================

/**
 * Mode for document generation
 *
 * - `worksheet`: Student worksheet (exercises without solutions)
 * - `correction`: Teacher correction (exercises with solutions)
 * - `preview`: Quick preview mode (simplified formatting)
 */
export type GeneratorMode = 'worksheet' | 'correction' | 'preview';

/**
 * Context for document generation
 *
 * Contains metadata and configuration for generating
 * Typst documents from exercise data.
 *
 * @example Generating student worksheet
 * ```typescript
 * const context: GeneratorContext = {
 *   mode: 'worksheet',
 *   locale: 'fr',
 *   studentName: 'Marie Dupont',
 *   className: '3eme A',
 *   date: new Date()
 * };
 * ```
 */
export interface GeneratorContext {
	/** Generation mode (worksheet, correction, preview) */
	mode: GeneratorMode;

	/** Locale for formatting (e.g., 'fr', 'en') */
	locale: string;

	/** Student name to display on document */
	studentName?: string;

	/** Class name to display on document */
	className?: string;

	/** Date to display on document */
	date?: Date;
}

/**
 * Configuration for document generation
 *
 * Controls layout, formatting, and display options
 * for generated Typst documents.
 *
 * @example Exam configuration
 * ```typescript
 * const config: GeneratorConfig = {
 *   pageLayout: 'A4',
 *   fontSize: 11,
 *   margins: { top: 25, bottom: 25, left: 20, right: 20 },
 *   showPoints: true,
 *   showTitle: true,
 *   showDate: true,
 *   showStudentName: true,
 *   showClass: true,
 *   numberingStyle: 'numeric'
 * };
 * ```
 */
export interface GeneratorConfig {
	/** Page size for the document */
	pageLayout: 'A4' | 'Letter';

	/** Base font size in points */
	fontSize: number;

	/** Page margins in millimeters */
	margins: {
		top: number;
		bottom: number;
		left: number;
		right: number;
	};

	/** Whether to display points for each exercise */
	showPoints?: boolean;

	/** Whether to display the document title */
	showTitle?: boolean;

	/** Whether to display the date */
	showDate?: boolean;

	/** Whether to display student name field */
	showStudentName?: boolean;

	/** Whether to display class name */
	showClass?: boolean;

	/**
	 * Style for numbering exercises
	 * - `numeric`: 1, 2, 3, ...
	 * - `alphabetic`: A, B, C, ...
	 * - `roman`: I, II, III, ...
	 */
	numberingStyle?: 'numeric' | 'alphabetic' | 'roman';
}

/**
 * Result of document generation
 *
 * @example Successful generation
 * ```typescript
 * const result: GenerateResult = {
 *   typstContent: '// Typst document\n#set page...',
 *   metadata: {
 *     generator: 'ubumaths-typst-generator',
 *     generatedAt: new Date(),
 *     pageCount: 3
 *   }
 * };
 * ```
 */
export interface GenerateResult {
	/** Generated Typst source code */
	typstContent: string;

	/** Metadata about the generation */
	metadata: {
		/** Name/version of the generator */
		generator: string;

		/** Timestamp when document was generated */
		generatedAt: Date;

		/** Estimated page count (if calculable) */
		pageCount?: number;
	};
}

// ============================================================================
// TRANSPILER TYPES
// ============================================================================

/**
 * Options for Typst transpilation
 *
 * Controls how markdown AST is converted to Typst source code.
 *
 * @example Full document with title
 * ```typescript
 * const options: TypstTranspilerOptions = {
 *   paperSize: 'a4',
 *   fontSize: 11,
 *   language: 'fr',
 *   imageBasePath: '/static/images',
 *   includeSetup: true,
 *   title: 'Exercices de mathematiques',
 *   author: 'Prof. Dupont'
 * };
 * ```
 *
 * @example Fragment for inclusion
 * ```typescript
 * const options: TypstTranspilerOptions = {
 *   includeSetup: false,
 *   language: 'fr'
 * };
 * ```
 */
export interface TypstTranspilerOptions {
	/**
	 * Paper size (a4, us-letter, etc.)
	 * @default 'a4'
	 */
	paperSize?: string;

	/**
	 * Font size in points
	 * @default 11
	 */
	fontSize?: number;

	/**
	 * Language setting for text formatting
	 * @default 'fr'
	 */
	language?: string;

	/**
	 * Base path for resolving relative image URLs
	 * Images with relative paths will be prefixed with this
	 */
	imageBasePath?: string;

	/**
	 * Whether to include document setup (page, text, par settings)
	 * Set to false when generating fragments to embed in larger documents
	 * @default true
	 */
	includeSetup?: boolean;

	/**
	 * Document title (displayed at top of document)
	 */
	title?: string;

	/**
	 * Document author (displayed below title)
	 */
	author?: string;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

/**
 * Placeholder definition for Typst templates
 *
 * Defines a replaceable value in a Typst template.
 *
 * @example Text placeholder
 * ```typescript
 * const placeholder: TemplatePlaceholder = {
 *   key: 'student_name',
 *   type: 'text',
 *   label: 'Student Name',
 *   defaultValue: ''
 * };
 * ```
 *
 * @example Date placeholder
 * ```typescript
 * const placeholder: TemplatePlaceholder = {
 *   key: 'exam_date',
 *   type: 'date',
 *   label: 'Exam Date',
 *   defaultValue: 'today'
 * };
 * ```
 */
export interface TemplatePlaceholder {
	/** Unique key used in template (e.g., {{key}}) */
	key: string;

	/** Type of placeholder for UI and validation */
	type: 'text' | 'date' | 'number' | 'dynamic';

	/** Human-readable label for UI */
	label?: string;

	/** Default value if not provided */
	defaultValue?: string;

	/** Whether this placeholder is required */
	required?: boolean;
}

/**
 * Typst template definition
 *
 * A reusable template for generating Typst documents.
 * Contains placeholders that are replaced with actual values.
 *
 * @example Exam template
 * ```typescript
 * const template: TypstTemplate = {
 *   id: 'exam-standard',
 *   name: 'Standard Exam Template',
 *   description: 'A4 exam format with header and footer',
 *   content: '#set page(paper: "a4")\n...',
 *   placeholders: [
 *     { key: 'title', type: 'text', label: 'Exam Title' },
 *     { key: 'date', type: 'date', label: 'Exam Date' },
 *     { key: 'exercises', type: 'dynamic', label: 'Exercises Content' }
 *   ],
 *   category: 'exam',
 *   isBuiltIn: true
 * };
 * ```
 */
export interface TypstTemplate {
	/** Unique template identifier */
	id: string;

	/** Template display name */
	name: string;

	/** Template description */
	description?: string;

	/** Typst source code with placeholders */
	content: string;

	/** Placeholder definitions */
	placeholders: TemplatePlaceholder[];

	/** Category for organization (e.g., 'exam', 'worksheet', 'homework') */
	category?: string;

	/** Whether this is a built-in system template */
	isBuiltIn: boolean;
}

// ============================================================================
// BATCH PROCESSING TYPES
// ============================================================================

/**
 * Item in a batch compilation request
 *
 * @example Student worksheet item
 * ```typescript
 * const item: BatchCompileItem = {
 *   id: 'student-123',
 *   content: typstSource,
 *   metadata: {
 *     studentName: 'Marie Dupont',
 *     className: '3eme A'
 *   }
 * };
 * ```
 */
export interface BatchCompileItem {
	/** Unique identifier for this item */
	id: string;

	/** Typst source content to compile */
	content: string;

	/** Optional metadata for tracking */
	metadata?: Record<string, unknown>;
}

/**
 * Result of a batch compilation
 *
 * @example Batch result with some failures
 * ```typescript
 * const result: BatchCompileResult = {
 *   successful: [
 *     { id: 'student-1', data: pdfBytes1 },
 *     { id: 'student-2', data: pdfBytes2 }
 *   ],
 *   failed: [
 *     { id: 'student-3', error: 'Syntax error at line 10' }
 *   ],
 *   totalTime: 5230
 * };
 * ```
 */
export interface BatchCompileResult {
	/** Successfully compiled items */
	successful: Array<{
		id: string;
		data: Uint8Array | string;
	}>;

	/** Failed items with error messages */
	failed: Array<{
		id: string;
		error: string;
	}>;

	/** Total processing time in milliseconds */
	totalTime: number;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Typst compilation error with location information
 *
 * @example Syntax error
 * ```typescript
 * const error: TypstCompileError = {
 *   message: 'unexpected token',
 *   line: 42,
 *   column: 15,
 *   context: '#set page(paper: "invalid")',
 *   severity: 'error'
 * };
 * ```
 */
export interface TypstCompileError {
	/** Error message */
	message: string;

	/** Line number where error occurred (1-based) */
	line?: number;

	/** Column number where error occurred (1-based) */
	column?: number;

	/** Source code context around the error */
	context?: string;

	/** Error severity */
	severity: 'error' | 'warning';
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default configuration for the Typst service
 */
export const DEFAULT_SERVICE_CONFIG: Required<TypstServiceConfig> = {
	maxConcurrent: 2,
	cacheMaxSize: 50,
	cacheTTL: 10 * 60 * 1000, // 10 minutes
	compileTimeout: 60 * 1000 // 60 seconds
} as const;

/**
 * Default configuration for document generation
 */
export const DEFAULT_GENERATOR_CONFIG: GeneratorConfig = {
	pageLayout: 'A4',
	fontSize: 12,
	margins: { top: 20, bottom: 20, left: 15, right: 15 },
	showPoints: true,
	showTitle: true,
	showDate: true,
	showStudentName: true,
	showClass: true,
	numberingStyle: 'numeric'
} as const;

/**
 * Default options for Typst transpilation
 */
export const DEFAULT_TRANSPILER_OPTIONS: Required<TypstTranspilerOptions> = {
	paperSize: 'a4',
	fontSize: 11,
	language: 'fr',
	imageBasePath: '',
	includeSetup: true,
	title: '',
	author: ''
} as const;
