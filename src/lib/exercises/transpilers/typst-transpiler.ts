/**
 * @deprecated Import from '$lib/typst' instead of '$lib/exercises/transpilers/typst-transpiler'
 * This file is kept for backward compatibility during migration.
 */

// Re-export everything from new location
export {
	transpileToTypst,
	escapeTypst,
	escapeTypstBrackets,
	resolveImagePath,
	markdownToTypst,
	transpileImage
} from '$lib/typst/transpiler';

// Log deprecation warning in development
if (import.meta.env.DEV) {
	console.warn(
		'[DEPRECATED] Import from "$lib/typst" instead of "$lib/exercises/transpilers/typst-transpiler"'
	);
}
