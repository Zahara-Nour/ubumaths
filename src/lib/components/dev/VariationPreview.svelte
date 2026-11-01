<!--
	@component VariationPreview

	Aperçu d'UNE variation d'un modèle, pour la revue `/dev/modeles` : l'instance est tirée dans
	le navigateur par le vrai générateur (le modèle réduit à cette variation), puis rendue par
	les mêmes onglets que l'aperçu admin (`QuestionPreviewTabs`). « ↻ » tire une nouvelle graine.
	Une variation qui ne se génère pas montre son erreur ici, sans toucher au reste de la page.
-->
<script lang="ts">
	// Imports
	import type { QuestionTemplate } from '$lib/questions/types';
	import { generateInstance } from '$lib/questions/generator/instance-generator';
	import QuestionPreviewTabs from '$lib/components/questions/QuestionPreviewTabs.svelte';
	import { Button } from '$lib/components/ui/button';
	import { RefreshCw } from '@lucide/svelte';

	// Types
	interface Props {
		template: QuestionTemplate;
		variationIndex: number;
	}

	// Constantes

	/** Graine du premier tirage : la page s'ouvre toujours sur les mêmes exemples */
	const FIRST_SEED = 7;

	// Variables
	let { template, variationIndex }: Props = $props();

	let seed = $state(FIRST_SEED);

	const result = $derived.by(() => {
		const variation = template.variations[variationIndex];
		try {
			// Specs retirées : leur `variationIndex` vise le modèle entier, pas cette variation seule
			return generateInstance(
				{ ...template, variations: [variation], testSpecs: undefined },
				seed + variationIndex
			);
		} catch (err) {
			return {
				success: false as const,
				errors: [err instanceof Error ? err.message : 'génération impossible']
			};
		}
	});

	const expected = $derived(
		result.success ? (result.instance.blanks ?? []).map((b) => b.expectedAnswer) : []
	);

	// Functions
	function regenerate() {
		seed = Math.floor(Math.random() * 1000000);
	}
</script>

<section class="space-y-2 rounded-md border p-3">
	<div class="flex items-center justify-between gap-2">
		<div class="text-sm font-semibold" role="heading" aria-level="4">
			Variation {variationIndex + 1}
		</div>
		<div class="flex items-center gap-2">
			<span class="font-mono text-xs text-muted-foreground">graine {seed + variationIndex}</span>
			<Button
				variant="outline"
				size="sm"
				onclick={regenerate}
				aria-label="Régénérer la variation {variationIndex + 1}"
			>
				<RefreshCw class="h-4 w-4" />
			</Button>
		</div>
	</div>

	{#if result.success}
		<QuestionPreviewTabs instance={result.instance} />
		{#if expected.length > 0}
			<p class="text-sm">
				<span class="text-muted-foreground">Réponse attendue :</span>
				{#each expected as answer, i (i)}
					<code class="mr-2 font-mono break-all">{answer}</code>
				{/each}
			</p>
		{/if}
		{#if result.instance.resolvedVariables && result.instance.resolvedVariables.length > 0}
			<p class="font-mono text-xs break-all text-muted-foreground">
				{result.instance.resolvedVariables.map((v) => `${v.name} = ${v.value}`).join(' · ')}
			</p>
		{/if}
	{:else}
		<p class="rounded bg-destructive/10 p-2 text-sm text-destructive">
			Génération impossible : {result.errors.join(' ; ')}
		</p>
	{/if}
</section>
