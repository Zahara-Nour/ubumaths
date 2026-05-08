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
 *   onStep={handleStep}
 *   onStop={handleStop}
 * />
 * <DebugPanel />
 * ```
 */

export { default as DebugToolbar } from './DebugToolbar.svelte';
export { default as VariablesPanel } from './VariablesPanel.svelte';
export { default as VariablesHistory } from './VariablesHistory.svelte';
export { default as CallStackPanel } from './CallStackPanel.svelte';
export { default as LoopIndicator } from './LoopIndicator.svelte';
export { default as DebugPanel } from './DebugPanel.svelte';
export { default as FramesPanel } from './FramesPanel.svelte';
export { default as HeapPanel } from './HeapPanel.svelte';
export { default as MemoryDiagramView } from './MemoryDiagramView.svelte';
