<!--
	@component VariationPreview

	Aperçu d'UNE variation d'un modèle, pour la revue `/dev/modeles` : l'instance est tirée dans
	le navigateur par le vrai générateur (le modèle réduit à cette variation), puis rendue par
	les mêmes onglets que l'aperçu admin (`QuestionPreviewTabs`). « ↻ » tire une nouvelle graine.
	Une variation qui ne se génère pas montre son erreur ici, sans toucher au reste de la page.
	`compact` (parcours d'une série) : carte seule, rendu choisi par le parent (`tab`), sans les
	valeurs des variables.
-->
<script lang="ts">
	// Imports
	import type { QuestionTemplate } from '#lib/questions/types.ts';
	import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
	import QuestionPreviewTabs, {
		type PreviewTab
	} from '#lib/components/questions/QuestionPreviewTabs.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { RefreshCw } from '@lucide/svelte';

	// Types
	interface Props {
		template: QuestionTemplate;
		variationIndex: number;
		/** Graine du premier tirage (le parent la change pour tout retirer d'un coup) */
		firstSeed?: number;
		/** Carte seule, rendu imposé : le parcours d'une série */
		compact?: boolean;
		tab?: PreviewTab;
	}

	// Constantes

	/** Graine du premier tirage : la page s'ouvre toujours sur les mêmes exemples */
	const FIRST_SEED = 7;

	// Variables
	let { template, variationIndex, firstSeed = FIRST_SEED, compact = false, tab }: Props = $props();

	// Repart de la graine du parent quand elle change ; « ↻ » la remplace ici seulement
	let seed = $derived(firstSeed);

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

<section class={compact ? 'space-y-2' : 'space-y-2 rounded-md border p-3'}>
	<div class="flex items-center justify-between gap-2">
		<div
			class={compact ? 'text-xs font-semibold text-muted-foreground' : 'text-sm font-semibold'}
			role="heading"
			aria-level="4"
		>
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
		{#if compact}
			<QuestionPreviewTabs instance={result.instance} {tab} bare />
		{:else}
			<QuestionPreviewTabs instance={result.instance} />
		{/if}
		{#if expected.length > 0}
			<p class="text-sm">
				<span class="text-muted-foreground">Réponse attendue :</span>
				{#each expected as answer, i (i)}
					<code class="mr-2 font-mono break-all">{answer}</code>
				{/each}
			</p>
		{/if}
		{#if !compact && result.instance.resolvedVariables && result.instance.resolvedVariables.length > 0}
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
