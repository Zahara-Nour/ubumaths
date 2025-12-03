<script lang="ts">
	/**
	 * Grapheur Page
	 *
	 * Interactive graphing calculator for students and teachers.
	 * Features:
	 * - Multiple function plotting with color-coded curves
	 * - Pan and zoom interactions
	 * - Real-time coordinate tracking
	 * - Function editor with MathLive
	 * - localStorage persistence
	 *
	 * Access: Students, Teachers, Admins only
	 */

	import { onMount } from 'svelte';
	import { GrapheurContainer } from '$lib/components/grapheur';
	import { grapheurStore } from '$lib/stores/grapheur.svelte';

	/**
	 * Add a default function on first visit if store is empty
	 */
	onMount(() => {
		// Add a sample function if none exist (for first-time users)
		if (grapheurStore.functions.length === 0) {
			grapheurStore.addFunction('x^2');
		}
	});
</script>

<svelte:head>
	<title>Grapheur - Calculatrice graphique | UbuMaths</title>
	<meta
		name="description"
		content="Calculatrice graphique interactive pour tracer et analyser des fonctions mathématiques"
	/>
</svelte:head>

<div class="grapheur-page">
	<!-- Page Header -->
	<header class="page-header">
		<div class="header-content">
			<div>
				<h1 class="text-2xl font-bold">Grapheur</h1>
				<p class="subtitle text-sm text-muted-foreground">Calculatrice graphique interactive</p>
			</div>

			<!-- Instructions (Desktop Only) -->
			<div class="instructions hidden gap-6 text-xs text-muted-foreground lg:flex">
				<div class="flex items-center gap-2">
					<span class="font-semibold">Glisser-déposer</span>
					<span>Déplacer</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="font-semibold">Molette</span>
					<span>Zoom</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="font-semibold">Survol</span>
					<span>Coordonnées</span>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Grapheur Container -->
	<div class="grapheur-content">
		<GrapheurContainer />
	</div>
</div>

<style>
	/* ==========================================================================
     Page Layout
     ========================================================================== */

	.grapheur-page {
		display: flex;
		flex-direction: column;
		height: calc(100vh - 4rem); /* Account for navbar height */
		padding: 1rem;
		gap: 1rem;
	}

	.page-header {
		flex-shrink: 0;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 2rem;
	}

	.grapheur-content {
		flex: 1;
		min-height: 0; /* Important for flex child overflow */
		overflow: hidden;
	}

	/* ==========================================================================
     Responsive: Mobile
     ========================================================================== */

	@media (max-width: 768px) {
		.grapheur-page {
			padding: 0.5rem;
			gap: 0.75rem;
		}

		.page-header h1 {
			font-size: 1.25rem;
		}

		.subtitle {
			font-size: 0.75rem;
		}
	}
</style>
