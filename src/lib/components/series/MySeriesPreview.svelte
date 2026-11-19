<script lang="ts">
	/**
	 * Aperçu de « Ma série » dans le catalogue Automaths (PR 4, phase 0 validée
	 * le 2026-11-19) : nombre de questions, durée totale, chaque question avec
	 * ses répétitions et une croix qui la retire. Aucun réglage : durées,
	 * répétitions, PDF et lancement restent sur la page détaillée (« Ouvrir ma série »).
	 * Utilisé par la colonne (grand écran) et par les panneaux (tablette, téléphone).
	 */
	import { resolve } from '$app/paths';
	import { X } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { MarkdownRenderer } from '#lib/components/markdown/index.ts';
	import { convertLegacyLatexToMarkdown } from '#lib/utils/latex-syntax-adapter.ts';
	import { questionCart } from '#lib/stores/questionCart.svelte.ts';
	import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
	import {
		formatSeriesDuration,
		seriesQuestionCount,
		seriesTotalSeconds
	} from '#lib/questions/series-summary.ts';

	let {
		showTitle = true
	}: {
		/** Faux dans un panneau, qui porte déjà le titre « Ma série » */
		showTitle?: boolean;
	} = $props();

	// Dans l'ordre d'ajout ; un modèle absent de la liste lue garde une ligne
	let lines = $derived(
		questionCart.allItems.map((item) => ({
			item,
			template: questionTemplatesCache.getTemplateById(item.templateId)
		}))
	);
	let summary = $derived(
		`${seriesQuestionCount(lines.length)} · environ ${formatSeriesDuration(seriesTotalSeconds(questionCart.allItems))}`
	);
</script>

<div class="space-y-4">
	{#if showTitle}
		<h2 class="text-lg font-semibold">Ma série</h2>
	{/if}

	{#if lines.length === 0}
		<p class="text-sm text-muted-foreground">
			Ta série est vide : ajoute des questions avec « Ajouter ».
		</p>
	{:else}
		<p class="text-sm text-muted-foreground">{summary}</p>

		<ul class="divide-y divide-border rounded-md border border-border">
			{#each lines as { item, template } (item.templateId)}
				{@const title = template?.title ?? 'Question indisponible'}
				<li class="flex items-start gap-2 px-3 py-2">
					<div class="series-line-title min-w-0 flex-1">
						<MarkdownRenderer content={convertLegacyLatexToMarkdown(title)} />
						{#if template?.description}
							<div class="series-line-description">
								<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.description)} />
							</div>
						{/if}
					</div>
					<span class="shrink-0 pt-0.5 text-sm text-muted-foreground tabular-nums"
						>×{item.quantity}</span
					>
					<button
						type="button"
						class="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
						aria-label={`Retirer « ${title} »`}
						title="Retirer de ma série"
						onclick={() => questionCart.removeFromCart(item.templateId)}
					>
						<X class="h-4 w-4" aria-hidden="true" />
					</button>
				</li>
			{/each}
		</ul>

		<Button href={resolve('automaths/panier')} class="w-full">Ouvrir ma série</Button>
	{/if}
</div>

<style>
	/*
	 * `app.css` impose `main p { font-size: …1rem… !important }` (réglage « A − / + ») :
	 * ces règles, plus précises, gardent la mise à l'échelle par --font-scale.
	 */
	.series-line-title :global(p) {
		margin: 0;
		font-size: calc(0.875rem * var(--font-scale, 1)) !important;
		line-height: calc(1.25rem * var(--font-scale, 1)) !important;
	}

	.series-line-description :global(p) {
		font-size: calc(0.75rem * var(--font-scale, 1)) !important;
		line-height: calc(1rem * var(--font-scale, 1)) !important;
		color: var(--color-muted-foreground) !important;
	}
</style>
