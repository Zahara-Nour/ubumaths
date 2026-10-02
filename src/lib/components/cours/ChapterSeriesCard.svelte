<!--
	ChapterSeriesCard
	=================

	Une série du chapitre, vue par l'élève (S6) : le titre de la série est le
	lien, qui la lance dans la forme choisie par le professeur (Q124 a) —
	flash-cards ou entraînement — sans note ni évaluation.

	Le lien est calculé côté serveur depuis la série ACTUELLE (Q125) ; s'il
	manque (composition illisible), on le dit au lieu d'afficher un lien mort.
	Il porte sa requête (`?categories=…&mode=…`) : d'où le transtypage vers la
	route, comme dans `Header.svelte`.

	@module components/cours/ChapterSeriesCard
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Layers } from '@lucide/svelte';
	import type { ChapterSeries } from '$lib/types/chapters';

	interface Props {
		series: ChapterSeries;
	}

	let { series }: Props = $props();

	const FORM_LABELS: Record<ChapterSeries['form'], string> = {
		flash: 'Flash-cards',
		interactive: 'Entraînement'
	};

	let title = $derived(series.title ?? 'Série');
	let questions = $derived(
		`${series.questionCount} question${series.questionCount > 1 ? 's' : ''}`
	);
</script>

<Card.Root class="transition-shadow hover:shadow-md">
	<Card.Content class="flex items-center gap-3 p-4">
		<Layers class="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
		<div class="min-w-0 flex-1">
			{#if series.launchHref}
				<a
					href={resolve(series.launchHref as '/automaths/test')}
					class="font-medium underline-offset-4 hover:underline"
				>
					{title}
				</a>
			{:else}
				<span class="font-medium">{title}</span>
				<span class="block text-sm text-muted-foreground">
					Cette série ne peut pas être lancée pour l’instant.
				</span>
			{/if}
			<span class="block text-sm text-muted-foreground">{questions}</span>
		</div>
		<Badge variant="secondary" class="shrink-0">{FORM_LABELS[series.form]}</Badge>
	</Card.Content>
</Card.Root>
