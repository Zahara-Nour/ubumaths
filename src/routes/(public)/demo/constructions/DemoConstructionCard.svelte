<!--
	Une construction de la vitrine `/demo/constructions` : titre, texte, lecteur
	(lecture, vitesse, frise, sans édition), script replié. Le lecteur se monte dans
	le navigateur seulement (le titre et le texte sont rendus par le serveur) et
	s'ouvre sur la figure finie : « Jouer » repart du début. Sa toile a une taille
	fixe : elle seule se réduit à la largeur disponible (`zoom`), les boutons gardent
	leur taille.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import ConstructionPlayer from '$lib/constructions-v2/components/ConstructionPlayer.svelte';
	import * as Card from '$lib/components/ui/card';
	import { PLAYER_HEIGHT, PLAYER_WIDTH, type DemoConstruction } from './constructions';

	// Types
	interface Props {
		construction: DemoConstruction;
	}

	// Variables
	let { construction }: Props = $props();

	let containerWidth = $state(0);
	const zoom = $derived(containerWidth > 0 ? Math.min(1, containerWidth / PLAYER_WIDTH) : 1);
</script>

<Card.Root class="overflow-hidden">
	<Card.Header class="pb-2">
		<!-- `main h2` impose sa taille en !important : le titre de carte reprend la main -->
		<h2 class="text-[calc(1.125rem*var(--font-scale))]! leading-snug! font-semibold">
			{construction.title}
		</h2>
		<Card.Description>{construction.text}</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div
			class="w-full"
			bind:clientWidth={containerWidth}
			style:min-height="{Math.round(PLAYER_HEIGHT * zoom)}px"
		>
			{#if browser && containerWidth > 0}
				<div class="demo-player" style:--canvas-zoom={zoom}>
					<ConstructionPlayer
						script={construction.dsl}
						width={PLAYER_WIDTH}
						height={PLAYER_HEIGHT}
						showGrid={false}
						seekToEnd
					/>
				</div>
			{/if}
		</div>
		<details class="rounded-md border bg-muted/50">
			<summary class="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground">
				Voir le script
			</summary>
			<pre class="max-h-80 overflow-auto px-3 pb-3 font-mono text-[13px] leading-relaxed"><code
					>{construction.dsl.trim()}</code
				></pre>
		</details>
	</Card.Content>
</Card.Root>

<style>
	.demo-player :global(.construction-canvas) {
		zoom: var(--canvas-zoom);
	}
</style>
