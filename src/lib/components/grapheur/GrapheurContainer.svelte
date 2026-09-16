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
	import { provideGrapheurStore } from '$lib/stores/grapheur-context';
	import { grapheurStore, type GrapheurStore } from '$lib/stores/grapheur.svelte';

	/**
	 * Optional CSS class for container customization
	 */
	let {
		class: className = '',
		store,
		panel = true
	}: {
		class?: string;
		/**
		 * Afficher le panneau de fonctions.
		 *
		 * `false` quand un autre panneau tient déjà ce rôle — dans l'atelier,
		 * c'est « Mes objets ». Deux listes de fonctions côte à côte posent la
		 * question de savoir laquelle fait foi, et l'élève y perd sa saisie : ce
		 * qu'il tape dans l'une est réécrit par l'autre.
		 */
		panel?: boolean;
		/**
		 * L'instance de grapheur à piloter.
		 *
		 * Sans elle, c'est le singleton — donc `/grapheur` et `/calc` gardent
		 * l'état partagé qu'ils ont toujours eu. Un atelier qui veut le sien
		 * passe la sienne.
		 */
		store?: GrapheurStore;
	} = $props();

	// Donné aux composants descendants, qui le lisent par `useGrapheurStore()`.
	//
	// Capture volontaire de la valeur initiale : `setContext` ne peut être appelé
	// qu'à l'initialisation d'un composant, donc changer `store` après le montage
	// n'aurait de toute façon aucun effet. Pour piloter une autre instance, il
	// faut remonter le conteneur — `{#key}` fait très bien l'affaire.
	// svelte-ignore state_referenced_locally
	provideGrapheurStore(store ?? grapheurStore);

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

<div class="grapheur-container {className}" class:sans-panneau={!panel}>
	<!-- Sidebar: Function List -->
	{#if panel}
		<aside class="grapheur-sidebar">
			<FunctionPanel />
		</aside>
	{/if}

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

	.grapheur-container.sans-panneau {
		grid-template-columns: 1fr;
	}

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
		.grapheur-container.sans-panneau {
			grid-template-columns: 1fr;
		}

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
		.grapheur-container.sans-panneau {
			grid-template-columns: 1fr;
		}

		.grapheur-container {
			grid-template-columns: 300px 1fr;
		}
	}
</style>
