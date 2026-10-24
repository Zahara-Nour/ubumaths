<!--
	Diaporama (`/dev/diaporama`)
	============================

	Banc d'essai de `$lib/slides`. Fusion des trois anciennes pages publiques
	`/slides/demo` (plein écran), `/slides/demo-embedded` (dans un cadre, taille
	réglable) et `/slides/test-transitions` : les diapositives sont écrites une
	fois (`DemoDeck`), seul l'affichage change.

	Pas de `+layout@` pour sortir de la mise en page : il sauterait le
	`+layout.server.ts` de `/dev`, donc la garde en navigation côté client. Le
	plein écran est un conteneur fixe par-dessus la page.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import DemoDeck from './DemoDeck.svelte';
	import TransitionsDeck from './TransitionsDeck.svelte';

	// Types
	type Mode = 'cadre' | 'plein-ecran' | 'transitions';

	interface FrameSize {
		name: string;
		width: number;
		height: number;
	}

	// Constantes
	const MODES: { value: Mode; label: string }[] = [
		{ value: 'cadre', label: 'Dans un cadre' },
		{ value: 'plein-ecran', label: 'Plein écran' },
		{ value: 'transitions', label: 'Transitions' }
	];

	const FRAME_SIZES: FrameSize[] = [
		{ name: 'Petit', width: 640, height: 360 },
		{ name: 'Moyen', width: 800, height: 450 },
		{ name: 'Grand', width: 1024, height: 576 },
		{ name: 'HD', width: 1280, height: 720 }
	];

	// Variables
	let mode = $state<Mode>('cadre');
	let frameSize = $state<FrameSize>(FRAME_SIZES[1]);
</script>

<svelte:head>
	<title>Diaporama · Pages de dev</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="container mx-auto space-y-6 px-4 py-8">
	<header class="space-y-2">
		<h1 class="text-3xl font-bold">Diaporama</h1>
		<p class="text-muted-foreground">
			Les diapositives de démonstration de <code>$lib/slides</code>, en plein écran ou dans un cadre
			de taille réglable, et une diapositive par transition.
		</p>
	</header>

	<div class="flex flex-wrap gap-2" role="group" aria-label="Affichage">
		{#each MODES as option (option.value)}
			<Button
				variant={mode === option.value ? 'default' : 'outline'}
				onclick={() => (mode = option.value)}
			>
				{option.label}
			</Button>
		{/each}
	</div>

	{#if mode !== 'plein-ecran'}
		<div class="flex flex-wrap gap-2" role="group" aria-label="Taille du cadre">
			{#each FRAME_SIZES as size (size.name)}
				<Button
					size="sm"
					variant={frameSize === size ? 'secondary' : 'ghost'}
					onclick={() => (frameSize = size)}
				>
					{size.name} ({size.width}×{size.height})
				</Button>
			{/each}
		</div>

		<div class="overflow-x-auto">
			<div
				class="frame"
				style="width: {frameSize.width}px; height: {frameSize.height}px;"
				data-testid="cadre-diaporama"
			>
				{#if mode === 'cadre'}
					<DemoDeck config={{ fullscreen: false, minScale: 0.5 }} />
				{:else}
					<TransitionsDeck />
				{/if}
			</div>
		</div>
	{/if}
</div>

{#if mode === 'plein-ecran'}
	<div class="fullscreen">
		<DemoDeck />
		<Button class="close-button" variant="secondary" size="sm" onclick={() => (mode = 'cadre')}>
			Quitter le plein écran
		</Button>
	</div>
{/if}

<style>
	.frame {
		position: relative;
		overflow: hidden;
		background: #000;
		border-radius: 8px;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
	}

	.fullscreen {
		position: fixed;
		inset: 0;
		z-index: 50;
		background: #000;
	}

	.fullscreen :global(.close-button) {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		z-index: 1000;
	}
</style>
