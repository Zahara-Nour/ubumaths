/**
 * @deprecated Import from '$lib/typst' instead of '$lib/worksheets/typst-compiler'
 * This file is kept for backward compatibility during migration.
 */

// Re-export everything from new location
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
} from '$lib/typst/compiler';

export type { TypstCompiler, TypstCompilerState } from '$lib/typst/compiler';

// Log deprecation warning in development
if (import.meta.env.DEV) {
	console.warn('[DEPRECATED] Import from "$lib/typst" instead of "$lib/worksheets/typst-compiler"');
}
