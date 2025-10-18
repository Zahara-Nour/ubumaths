<script lang="ts">
	/**
	 * MathGraphViewer Component
	 * Read-only player for displaying MathGraph32 figures
	 * Students can view and interact (drag points) but not construct new objects
	 */

	import { onMount, onDestroy } from 'svelte';
	import { mathGraphService } from '$lib/services/mathgraph-api';
	import type { MathGraphApp } from '$lib/types/geometry';

	interface Props {
		figure?: string; // Base64 encoded figure
		width?: number;
		height?: number;
		interactive?: boolean;
		displayMeasures?: boolean;
		level?: 0 | 1 | 2 | 3;
		gridVisible?: boolean;
		onReady?: (app: MathGraphApp) => void;
		onError?: (error: Error) => void;
	}

	let {
		figure = '',
		width = 800,
		height = 600,
		interactive = true,
		displayMeasures = true,
		level = 1,
		gridVisible = true,
		onReady,
		onError
	}: Props = $props();

	let container: HTMLDivElement;
	let app: MathGraphApp | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let svgId = `mtg-viewer-${Math.random().toString(36).substr(2, 9)}`;

	onMount(async () => {
		try {
			loading = true;
			error = null;

			// Initialize MathGraph32 player
			app = await mathGraphService.initializePlayer(container, {
				width,
				height,
				figure,
				svgId,
				level,
				interactive,
				displayMeasures
			});

			loading = false;

			// Call ready callback
			if (onReady && app) {
				onReady(app);
			}
		} catch (err) {
			loading = false;
			const errorMessage = err instanceof Error ? err.message : 'Failed to load MathGraph32';
			error = errorMessage;

			if (onError && err instanceof Error) {
				onError(err);
			}

			console.error('MathGraphViewer error:', err);
		}
	});

	onDestroy(() => {
		if (app) {
			// Clean up
			mathGraphService.removeApp(svgId);
			app = null;
		}
	});

	// Reactive update when figure changes
	$effect(() => {
		if (app && figure) {
			app.setFig({ fig: figure }).catch((err) => {
				console.error('Error updating figure:', err);
				error = err instanceof Error ? err.message : 'Failed to update figure';
			});
		}
	});
</script>

<div class="mathgraph-viewer" class:grid-visible={gridVisible}>
	{#if loading}
		<div class="loading-container" style="width: {width}px; height: {height}px;">
			<div class="loading-spinner"></div>
			<p class="text-muted-foreground">Chargement de MathGraph32...</p>
		</div>
	{:else if error}
		<div class="error-container" style="width: {width}px; height: {height}px;">
			<div class="error-icon">⚠️</div>
			<p class="font-semibold text-destructive">Erreur de chargement</p>
			<p class="text-sm text-muted-foreground">{error}</p>
		</div>
	{:else}
		<div
			bind:this={container}
			class="mathgraph-container"
			style="width: {width}px; height: {height}px;"
		></div>
	{/if}
</div>

<style>
	.mathgraph-viewer {
		position: relative;
		display: inline-block;
	}

	.mathgraph-container {
		position: relative;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		overflow: hidden;
		background: hsl(var(--background));
	}

	.loading-container,
	.error-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		background: hsl(var(--muted) / 0.3);
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 4px solid hsl(var(--muted));
		border-top-color: hsl(var(--primary));
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-icon {
		font-size: 3rem;
	}

	/* Grid styling */
	.mathgraph-viewer.grid-visible :global(svg) {
		background-image:
			linear-gradient(hsl(var(--border)) 1px, transparent 1px),
			linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px);
		background-size: 20px 20px;
	}
</style>
