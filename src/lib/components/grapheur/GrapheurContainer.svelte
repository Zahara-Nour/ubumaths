<!--
GrapheurContainer Component

Main container that composes all grapheur components into a complete graphing calculator UI.
Features:
- Responsive layout (desktop: sidebar + graph, mobile: stacked)
- Function panel in sidebar
- Graph with overlay controls
- Coordinate display

@component
@example
```svelte
<GrapheurContainer />
<GrapheurContainer class="custom-height" />
```
-->

<script lang="ts">
	import GraphSVG from './GraphSVG.svelte';
	import FunctionPanel from './FunctionPanel.svelte';
	import ViewportControls from './ViewportControls.svelte';
	import CoordinatesDisplay from './CoordinatesDisplay.svelte';
	import KeyboardHandler from './KeyboardHandler.svelte';

	/**
	 * Optional CSS class for container customization
	 */
	let {
		class: className = ''
	}: {
		class?: string;
	} = $props();

	// ==========================================================================
	// Export Support
	// ==========================================================================

	/** Reference to SVG element for export */
	let svgRef: SVGSVGElement | undefined = $state();

	/** SVG dimensions for export */
	let svgWidth = $state(0);
	let svgHeight = $state(0);

	/**
	 * Callback when SVG element is ready for export
	 */
	function handleSvgReady(svg: SVGSVGElement, width: number, height: number): void {
		svgRef = svg;
		svgWidth = width;
		svgHeight = height;
	}
</script>

<div class="grapheur-container {className}">
	<!-- Sidebar: Function List -->
	<aside class="grapheur-sidebar">
		<FunctionPanel />
	</aside>

	<!-- Main Graph Area -->
	<main class="grapheur-main">
		<div class="graph-wrapper">
			<!-- Interactive SVG Graph -->
			<GraphSVG onSvgReady={handleSvgReady} />

			<!-- Overlay: Viewport Controls (top-right) -->
			<div class="graph-controls">
				<ViewportControls {svgRef} {svgWidth} {svgHeight} />
			</div>

			<!-- Overlay: Coordinate Display (bottom-left) -->
			<div class="graph-coordinates">
				<CoordinatesDisplay />
			</div>
		</div>
	</main>

	<!-- Keyboard shortcuts handler -->
	<KeyboardHandler />
</div>

<style>
	/* ==========================================================================
     Layout
     ========================================================================== */

	.grapheur-container {
		display: grid;
		grid-template-columns: 350px 1fr;
		gap: 1rem;
		height: 100%;
		min-height: 500px;
	}

	.grapheur-sidebar {
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.grapheur-main {
		position: relative;
		min-height: 400px;
		overflow: hidden;
	}

	.graph-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
	}

	/* ==========================================================================
     Overlay Controls
     ========================================================================== */

	.graph-controls {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		pointer-events: auto;
	}

	.graph-coordinates {
		position: absolute;
		bottom: 1rem;
		left: 1rem;
		z-index: 10;
		pointer-events: none;
	}

	/* ==========================================================================
     Responsive: Mobile (Stack Vertically)
     ========================================================================== */

	@media (max-width: 768px) {
		.grapheur-container {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr auto;
			gap: 0.75rem;
		}

		/* Graph first, then function panel */
		.grapheur-main {
			order: 1;
			min-height: 400px;
		}

		.grapheur-sidebar {
			order: 2;
			max-height: 300px;
			overflow-y: auto;
		}

		/* Adjust overlay positions for smaller screens */
		.graph-controls {
			top: 0.5rem;
			right: 0.5rem;
		}

		.graph-coordinates {
			bottom: 0.5rem;
			left: 0.5rem;
			font-size: 0.75rem;
		}
	}

	/* ==========================================================================
     Responsive: Tablet
     ========================================================================== */

	@media (min-width: 769px) and (max-width: 1024px) {
		.grapheur-container {
			grid-template-columns: 300px 1fr;
		}
	}
</style>
