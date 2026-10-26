<script lang="ts">
	/**
	 * ViewportControls Component
	 *
	 * Provides buttons for viewport manipulation:
	 * - Zoom in (zoom by factor 1.5)
	 * - Zoom out (zoom by factor 0.67 ≈ 1/1.5)
	 * - Reset to default viewport
	 * - Toggle grid visibility
	 * - Export graph as image
	 *
	 * @component
	 */

	import { useGrapheurStore } from '$lib/stores/grapheur-context';

	// L'instance de l'atelier qui nous contient, ou celle par défaut.
	const grapheurStore = useGrapheurStore();
	import { Button } from '$lib/components/ui/button';
	import { ZoomIn, ZoomOut, House, Grid3x3, Maximize2, Minimize2 } from '@lucide/svelte';
	import ExportButton from './ExportButton.svelte';

	// Props
	let {
		svgRef,
		svgWidth,
		svgHeight,
		expanded = false,
		onToggleExpanded
	}: {
		svgRef?: SVGSVGElement;
		svgWidth: number;
		svgHeight: number;
		/** Le graphe occupe-t-il toute la fenêtre ? */
		expanded?: boolean;
		/** Sans lui, pas de bouton « Agrandir le graphe ». */
		onToggleExpanded?: () => void;
	} = $props();

	// ==========================================================================
	// Handlers
	// ==========================================================================

	/**
	 * Zoom in by 50%
	 */
	function handleZoomIn(): void {
		grapheurStore.zoom(1 / 1.5); // factor < 1 = zoom in
	}

	/**
	 * Zoom out by 50%
	 */
	function handleZoomOut(): void {
		grapheurStore.zoom(1.5); // factor > 1 = zoom out
	}

	/**
	 * Reset viewport to default (-10 to 10)
	 */
	function handleReset(): void {
		grapheurStore.resetViewport();
	}

	/**
	 * Toggle grid visibility
	 */
	function handleToggleGrid(): void {
		grapheurStore.toggleGrid();
	}
</script>

<div class="viewport-controls flex gap-2">
	<Button
		variant="outline"
		size="icon"
		onclick={handleZoomIn}
		title="Zoom avant"
		aria-label="Zoom avant"
	>
		<ZoomIn class="h-4 w-4" />
	</Button>

	<Button
		variant="outline"
		size="icon"
		onclick={handleZoomOut}
		title="Zoom arrière"
		aria-label="Zoom arrière"
	>
		<ZoomOut class="h-4 w-4" />
	</Button>

	<Button
		variant="outline"
		size="icon"
		onclick={handleReset}
		title="Réinitialiser la vue"
		aria-label="Réinitialiser la vue"
	>
		<!-- La maison, comme ailleurs : la flèche ⤢ se lisait « plein écran » -->
		<House class="h-4 w-4" />
	</Button>

	<Button
		variant={grapheurStore.showGrid ? 'default' : 'outline'}
		size="icon"
		onclick={handleToggleGrid}
		title={grapheurStore.showGrid ? 'Masquer la grille (G)' : 'Afficher la grille (G)'}
		aria-label={grapheurStore.showGrid ? 'Masquer la grille' : 'Afficher la grille'}
		aria-pressed={grapheurStore.showGrid}
	>
		<Grid3x3 class="h-4 w-4" />
	</Button>

	<ExportButton {svgRef} width={svgWidth} height={svgHeight} />

	{#if onToggleExpanded}
		<Button
			variant="outline"
			size="icon"
			onclick={onToggleExpanded}
			title={expanded ? 'Réduire le graphe (Échap)' : 'Agrandir le graphe'}
			aria-label={expanded ? 'Réduire le graphe' : 'Agrandir le graphe'}
			aria-pressed={expanded}
		>
			{#if expanded}
				<Minimize2 class="h-4 w-4" />
			{:else}
				<Maximize2 class="h-4 w-4" />
			{/if}
		</Button>
	{/if}
</div>

<style>
	.viewport-controls {
		user-select: none;
	}
</style>
