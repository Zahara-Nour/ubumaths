/**
 * Chapter System Components
 *
 * Export all chapter-related components for easy importing.
 * Student components are exported directly, teacher components
 * are exported from the teacher subdirectory.
 *
 * @example
 * // Student components
 * import { ChapterCard, ChapterQuiz, ChecklistSection } from '$lib/components/cours';
 *
 * // Teacher components
 * import { ChapterEditor, ChecklistEditor } from '$lib/components/cours/teacher';
 */

// Student components
export { default as ChapterCard } from './ChapterCard.svelte';
export { default as ChapterQuiz } from './ChapterQuiz.svelte';
export { default as QuizQuestion } from './QuizQuestion.svelte';
export { default as QuizSummary } from './QuizSummary.svelte';
export { default as ChecklistSection } from './ChecklistSection.svelte';
export { default as DocumentCard } from './DocumentCard.svelte';
export { default as ChapterProgressIndicator } from './ChapterProgressIndicator.svelte';
