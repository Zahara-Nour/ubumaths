/**
 * @deprecated Import from '$lib/typst/generators' instead of '$lib/worksheets/typst-generator'
 * This file is kept for backward compatibility during migration.
 *
 * Migration guide:
 * - generateWorksheetTypst -> import { generateWorksheetTypst } from '$lib/typst/generators'
 * - generateBatchTypst -> import { generateBatchTypst } from '$lib/typst/generators'
 * - WorksheetGenerator -> import { WorksheetGenerator } from '$lib/typst/generators'
 */

// Re-export everything from new location
export {
	// Class (recommended)
	WorksheetGenerator,
	// Legacy functions (backward compatible)
	generateWorksheetTypst,
	generateBatchTypst
} from '$lib/typst/generators';

// Re-export types
export type { WorksheetGeneratorInput, GenerateTypstParams } from '$lib/typst/generators';

// Log deprecation warning in development
if (import.meta.env.DEV) {
	console.warn(
		'[DEPRECATED] Import from "$lib/typst/generators" instead of "$lib/worksheets/typst-generator"'
	);
}
