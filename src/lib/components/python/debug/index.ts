/**
 * Python Debug UI Components
 *
 * Components for the step-by-step Python debugger interface.
 * Provides toolbar, variables panel, call stack, and loop indicators.
 *
 * @example
 * ```svelte
 * <script>
 *   import { DebugToolbar, DebugPanel } from '$lib/components/python/debug';
 * </script>
 *
 * <DebugToolbar
 *   onRun={handleRun}
 *   onStep={handleStep}
 *   onStop={handleStop}
 * />
 * <DebugPanel />
 * ```
 */

export { default as DebugToolbar } from './DebugToolbar.svelte';
export { default as VariablesPanel } from './VariablesPanel.svelte';
export { default as CallStackPanel } from './CallStackPanel.svelte';
export { default as LoopIndicator } from './LoopIndicator.svelte';
export { default as DebugPanel } from './DebugPanel.svelte';
