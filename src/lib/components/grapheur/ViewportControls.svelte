<script lang="ts">
	/**
	 * ViewportControls Component
	 *
	 * Provides buttons for viewport manipulation:
	 * - Zoom in (zoom by factor 1.5)
	 * - Zoom out (zoom by factor 0.67 ≈ 1/1.5)
	 * - Reset to default viewport
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from 'lucide-svelte';

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
		<Maximize2 class="h-4 w-4" />
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
</div>

<style>
	.viewport-controls {
		user-select: none;
	}
</style>
