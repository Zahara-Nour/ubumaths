/**
 * Chapter System Components
 *
 * Export all chapter-related components for easy importing.
 * Student components are exported directly, teacher components
 * are exported from the teacher subdirectory.
 *
 * @example
 * // Student components
 *
 * // Teacher components
 * import { ChapterSectionsEditor } from '$lib/components/cours/teacher';
 */

// Student components
export { default as ChapterCard } from './ChapterCard.svelte';
export { default as ChapterEmptyState } from './ChapterEmptyState.svelte';
export { default as ChecklistSection } from './ChecklistSection.svelte';
export { default as DocumentCard } from './DocumentCard.svelte';
export { default as ChapterProgressIndicator } from './ChapterProgressIndicator.svelte';
