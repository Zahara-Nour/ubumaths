<!--
	Une figure de la vitrine `/demo/geometrie` : titre, texte, figure manipulable,
	script replié. La figure se monte dans le navigateur seulement (le titre et le
	texte sont rendus par le serveur) et se réduit à la largeur disponible : la
	toile de `GeometryCanvas` a une largeur fixe, l'échelle suit la réduction.
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import * as Card from '$lib/components/ui/card';
	import { runDsl } from '$lib/geometry-core/dsl';
	import type { DemoFigure } from './figures';

	// Types
	interface Props {
		figure: DemoFigure;
	}

	// Variables
	let { figure }: Props = $props();

	let containerWidth = $state(0);
	const scale = $derived(containerWidth > 0 ? Math.min(1, containerWidth / figure.width) : 1);
	const built = $derived(browser ? runDsl(figure.dsl).figure : null);
</script>

<Card.Root class="overflow-hidden">
	<Card.Header class="pb-2">
		<h3 class="text-lg font-semibold">{figure.title}</h3>
		<Card.Description>{figure.text}</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-3">
		<div
			class="w-full"
			bind:clientWidth={containerWidth}
			style:min-height="{Math.round(figure.height * scale)}px"
		>
			{#if built && containerWidth > 0}
				<GeometryCanvas
					figure={built}
					width={Math.round(figure.width * scale)}
					height={Math.round(figure.height * scale)}
					pixelsPerUnit={figure.pixelsPerUnit * scale}
				/>
			{/if}
		</div>
		<details class="rounded-md border bg-muted/50">
			<summary class="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground">
				Voir le script
			</summary>
			<pre class="max-h-80 overflow-auto px-3 pb-3 font-mono text-[13px] leading-relaxed"><code
					>{figure.dsl.trim()}</code
				></pre>
		</details>
	</Card.Content>
</Card.Root>
