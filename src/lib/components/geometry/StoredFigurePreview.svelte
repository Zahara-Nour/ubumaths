<!--
	Figure stockée (ADR 0027) rendue à partir du résultat de son script.

	La toile est interactive, curseurs compris ; une erreur du script s'affiche à
	la place de la toile, avec son numéro de ligne. La toile est recréée à chaque
	nouveau résultat (`{#key}`) : un script modifié est une autre figure.
-->
<script lang="ts">
	import GeometryCanvas from '$lib/components/geometry/GeometryCanvas.svelte';
	import type { FigureScriptResult } from '$lib/utils/geometry-figure-script';

	interface Props {
		/** `null` tant que le script n'a pas été exécuté (rendu serveur, premier passage) */
		result: FigureScriptResult | null;
		width?: number;
		height?: number;
	}

	let { result, width = 520, height = 520 }: Props = $props();
</script>

<div class="max-w-full overflow-auto">
	{#if result === null}
		<div
			class="flex items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground"
			style:width="{width}px"
			style:height="{height}px"
		>
			Chargement de la figure…
		</div>
	{:else if result.ok}
		{#key result.figure}
			<GeometryCanvas figure={result.figure} {width} {height} />
		{/key}
	{:else}
		<div
			role="alert"
			class="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm whitespace-pre-wrap text-destructive"
		>
			{result.message}
		</div>
	{/if}
</div>
