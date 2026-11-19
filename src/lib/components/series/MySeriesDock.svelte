<script lang="ts">
	/**
	 * Accès à « Ma série » quand la colonne de droite n'a pas la place (< 1 280 px),
	 * PR 4 automaths, phase 0 validée le 2026-11-19 :
	 * - tablette, petit ordinateur : bouton rond fixe (sans pulsation) → panneau à droite ;
	 * - téléphone (< 640 px) : barre fine en bas « Ma série · 3 questions · 2 min 30 »
	 *   → panneau du bas ; série vide → pas de barre.
	 * Le contenu des panneaux est l'aperçu de la colonne (`MySeriesPreview`).
	 */
	import { ChevronUp, ListChecks } from '@lucide/svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import MySeriesPreview from '#lib/components/series/MySeriesPreview.svelte';
	import { questionCart } from '#lib/stores/questionCart.svelte.ts';
	import {
		formatSeriesDuration,
		seriesQuestionCount,
		seriesTotalSeconds
	} from '#lib/questions/series-summary.ts';

	// Constantes

	const DESCRIPTION = 'Questions de ta série, à retirer ou à ouvrir sur la page détaillée.';

	let sideOpen = $state(false);
	let bottomOpen = $state(false);

	let count = $derived(questionCart.totalItems);
	let barLabel = $derived(
		`Ma série · ${seriesQuestionCount(count)} · ${formatSeriesDuration(seriesTotalSeconds(questionCart.allItems))}`
	);
</script>

<!-- Tablette et petit ordinateur : bouton rond, fixe, sans pulsation -->
<button
	type="button"
	onclick={() => (sideOpen = true)}
	class="group fixed right-6 bottom-6 z-50 hidden h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl focus:ring-4 focus:ring-primary/30 focus:outline-none sm:flex xl:hidden"
	aria-label="Voir ma série"
	title="Ma série ({seriesQuestionCount(count)})"
>
	<span class="relative">
		<ListChecks
			class="h-7 w-7 transition-transform duration-300 group-hover:scale-110"
			aria-hidden="true"
		/>
		{#if count > 0}
			<Badge
				variant="destructive"
				class="absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold"
			>
				{count}
			</Badge>
		{/if}
	</span>
</button>

<!-- Téléphone : barre fine en bas, seulement si la série a des questions -->
{#if count > 0}
	<button
		type="button"
		onclick={() => (bottomOpen = true)}
		class="fixed inset-x-0 bottom-0 z-50 flex items-center justify-between gap-2 border-t border-border bg-primary px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-sm font-medium text-primary-foreground shadow-lg sm:hidden"
	>
		<span class="truncate">{barLabel}</span>
		<ChevronUp class="h-4 w-4 shrink-0" aria-hidden="true" />
	</button>
{/if}

<Sheet.Root bind:open={sideOpen}>
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:max-w-sm">
		<Sheet.Header>
			<Sheet.Title>Ma série</Sheet.Title>
			<Sheet.Description class="sr-only">{DESCRIPTION}</Sheet.Description>
		</Sheet.Header>
		<div class="px-4 pb-6">
			<MySeriesPreview showTitle={false} />
		</div>
	</Sheet.Content>
</Sheet.Root>

<Sheet.Root bind:open={bottomOpen}>
	<Sheet.Content side="bottom" class="max-h-[80vh] overflow-y-auto">
		<Sheet.Header>
			<Sheet.Title>Ma série</Sheet.Title>
			<Sheet.Description class="sr-only">{DESCRIPTION}</Sheet.Description>
		</Sheet.Header>
		<div class="px-4 pb-6">
			<MySeriesPreview showTitle={false} />
		</div>
	</Sheet.Content>
</Sheet.Root>
