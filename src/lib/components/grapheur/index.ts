/**
 * Grapheur Components
 *
 * Centralized exports for all graphing calculator components.
 * Import from this file for cleaner imports in pages/layouts.
 *
 * @module components/grapheur
 *
 * @example
 * ```typescript
 * import { GraphSVG, FunctionPanel, ViewportControls, GrapheurContainer } from '$lib/components/grapheur';
 * ```
 */

// Main container
export { default as GrapheurContainer } from './GrapheurContainer.svelte';

// Core rendering components
export { default as GraphSVG } from './GraphSVG.svelte';
export { default as AxisLines } from './AxisLines.svelte';
export { default as GridLines } from './GridLines.svelte';
export { default as FunctionCurve } from './FunctionCurve.svelte';

// UI components
export { default as FunctionPanel } from './FunctionPanel.svelte';
export { default as FunctionInput } from './FunctionInput.svelte';
export { default as ColorPicker } from './ColorPicker.svelte';
export { default as ViewportControls } from './ViewportControls.svelte';
export { default as CoordinatesDisplay } from './CoordinatesDisplay.svelte';
export { default as KeyboardHandler } from './KeyboardHandler.svelte';
export { default as CurveHover } from './CurveHover.svelte';
export { default as IntersectionPoints } from './IntersectionPoints.svelte';
