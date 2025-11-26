/**
 * Tutor Components
 * ================
 *
 * AI-powered pedagogical tutor system for UbuMaths.
 * Provides context-aware mathematical tutoring with progressive help levels.
 *
 * COMPONENTS:
 * - TutorChat: Main chat interface with tutor AI
 * - TutorHelpButton: Button that opens tutor in a dialog
 * - TutorWidget: Floating widget for global tutor access
 * - TutorUsageIndicator: Shows remaining quotas
 *
 * FEATURES:
 * - Progressive help (levels 0-7)
 * - Cheat detection and refusal
 * - Grade-level adaptation
 * - Multi-tier rate limiting (exercise, hour, day)
 * - Context-aware tutoring
 *
 * @module components/tutor
 *
 * @example Button in exercise
 * ```svelte
 * import { TutorHelpButton } from '$lib/components/tutor';
 *
 * <TutorHelpButton
 *   exerciseContext={{
 *     exerciseId: '123',
 *     statement: 'Calculer 2 + 3',
 *     topic: 'addition'
 *   }}
 * />
 * ```
 *
 * @example Standalone chat
 * ```svelte
 * import { TutorChat } from '$lib/components/tutor';
 *
 * <TutorChat />
 * ```
 *
 * @example Floating widget
 * ```svelte
 * import { TutorWidget } from '$lib/components/tutor';
 *
 * <TutorWidget />
 * ```
 */

export { default as TutorChat } from './TutorChat.svelte';
export { default as TutorHelpButton } from './TutorHelpButton.svelte';
export { default as TutorWidget } from './TutorWidget.svelte';
export { default as TutorUsageIndicator } from './TutorUsageIndicator.svelte';
