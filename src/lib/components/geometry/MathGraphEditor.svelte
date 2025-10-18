<script lang="ts">
	/**
	 * MathGraphEditor Component
	 * Full construction editor for geometry exercises
	 * Allows students to construct objects using MathGraph32 tools
	 */

	import { onMount, onDestroy } from 'svelte';
	import { mathGraphService } from '$lib/services/mathgraph-api';
	import type { MathGraphApp, MathGraphTool } from '$lib/types/geometry';

	interface Props {
		figure?: string; // Base64 encoded initial figure
		width?: number;
		height?: number;
		level?: 0 | 1 | 2 | 3;
		allowedTools?: MathGraphTool[];
		enableSave?: boolean;
		enableOpen?: boolean;
		gridVisible?: boolean;
		axisVisible?: boolean;
		onReady?: (app: MathGraphApp) => void;
		onSave?: (figureCode: string) => void;
		onError?: (error: Error) => void;
		onChange?: (app: MathGraphApp) => void; // Called when figure changes
	}

	let {
		figure = '',
		width = 800,
		height = 600,
		level = 1,
		allowedTools = [],
		enableSave = false,
		enableOpen = false,
		gridVisible = true,
		axisVisible = false,
		onReady,
		onSave,
		onError,
		onChange
	}: Props = $props();

	let container: HTMLDivElement;
	let app: MathGraphApp | null = $state(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let svgId = `mtg-editor-${Math.random().toString(36).substr(2, 9)}`;
	let changeDetectionInterval: number | null = null;

	onMount(async () => {
		try {
			loading = true;
			error = null;

			// Initialize MathGraph32 editor
			app = await mathGraphService.initializeEditor(container, {
				width,
				height,
				figure,
				svgId,
				level,
				enableSave,
				enableOpen,
				onSave: handleSave,
				onReady: handleReady
			});

			loading = false;

			// Set up change detection if onChange is provided
			if (onChange && app) {
				setupChangeDetection();
			}
		} catch (err) {
			loading = false;
			const errorMessage = err instanceof Error ? err.message : 'Failed to load MathGraph32 editor';
			error = errorMessage;

			if (onError && err instanceof Error) {
				onError(err);
			}

			console.error('MathGraphEditor error:', err);
		}
	});

	onDestroy(() => {
		if (changeDetectionInterval !== null) {
			clearInterval(changeDetectionInterval);
		}

		if (app) {
			mathGraphService.removeApp(svgId);
			app = null;
		}
	});

	function handleReady() {
		if (onReady && app) {
			onReady(app);
		}
	}

	function handleSave(figCode: string) {
		if (onSave) {
			onSave(figCode);
		}
	}

	function setupChangeDetection() {
		if (!app || !onChange) return;

		let lastObjectCount = app.listApi.longueur();

		changeDetectionInterval = window.setInterval(() => {
			if (!app) return;

			const currentObjectCount = app.listApi.longueur();
			if (currentObjectCount !== lastObjectCount) {
				lastObjectCount = currentObjectCount;
				onChange(app);
			}
		}, 500); // Check every 500ms
	}

	// Reactive update when figure changes
	$effect(() => {
		if (app && figure) {
			app.setFig({ fig: figure }).catch((err) => {
				console.error('Error updating figure:', err);
				error = err instanceof Error ? err.message : 'Failed to update figure';
			});
		}
	});

	// Export app for parent component access
	export function getApp(): MathGraphApp | null {
		return app;
	}

	// Export helper to get current figure state
	export async function getCurrentFigure(): Promise<string> {
		if (!app) {
			throw new Error('Editor not initialized');
		}

		// This would need to be implemented based on MathGraph32's save mechanism
		// For now, return empty string
		return '';
	}
</script>

<div class="mathgraph-editor" class:grid-visible={gridVisible} class:axis-visible={axisVisible}>
	{#if loading}
		<div class="loading-container" style="width: {width}px; height: {height}px;">
			<div class="loading-spinner"></div>
			<p class="text-muted-foreground">Chargement de l'éditeur...</p>
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

	{#if allowedTools.length > 0}
		<div class="tools-info">
			<p class="text-xs text-muted-foreground">Outils autorisés: {allowedTools.join(', ')}</p>
		</div>
	{/if}
</div>

<style>
	.mathgraph-editor {
		position: relative;
		display: inline-block;
	}

	.mathgraph-container {
		position: relative;
		border: 1px solid hsl(var(--border));
		border-radius: 0.5rem;
		overflow: hidden;
		background: hsl(var(--background));
		box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
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

	.tools-info {
		margin-top: 0.5rem;
		padding: 0.5rem;
		background: hsl(var(--muted) / 0.5);
		border-radius: 0.25rem;
	}

	/* Grid styling */
	.mathgraph-editor.grid-visible :global(svg) {
		background-image:
			linear-gradient(hsl(var(--border)) 1px, transparent 1px),
			linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px);
		background-size: 20px 20px;
	}

	/* Axis indicator */
	.mathgraph-editor.axis-visible :global(svg) {
		border: 2px solid hsl(var(--primary) / 0.2);
	}
</style>
