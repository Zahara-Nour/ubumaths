<!--
	@component ParcoursRow

	Une rangée du parcours d'une série (`/dev/modeles`) : à gauche le rang, le titre, les
	répétitions et la durée, le statut et le verdict ; à droite une carte élève par variation,
	côte à côte (la rangée défile de côté au-delà de la largeur) ; dessous, le verdict +
	commentaire. Sur écran étroit, les cartes passent sous le titre.
-->
<script lang="ts">
	// Imports
	import { resolve } from '$app/paths';
	import type { QuestionTemplateRow } from '#lib/types/question-template.ts';
	import { toQuestionTemplate } from '#lib/types/question-template.ts';
	import type { TemplateReview } from '#lib/questions/template-review.ts';
	import { formatSeriesDuration, VERDICT_LABELS } from '#lib/questions/template-review.ts';
	import type { PreviewTab } from '#lib/components/questions/QuestionPreviewTabs.svelte';
	import VariationPreview from '#lib/components/dev/VariationPreview.svelte';
	import ReviewVerdictForm from '#lib/components/dev/ReviewVerdictForm.svelte';
	import LazyMount from '#lib/components/dev/LazyMount.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { TriangleAlert } from '@lucide/svelte';

	// Types
	interface Props {
		row: QuestionTemplateRow;
		review: TemplateReview | null;
		alerts: string[];
		/** Rang dans la série (1, 2…) ; absent hors de la série */
		rank?: number;
		/** Répétitions et durée (secondes) dans la série ; absent hors de la série */
		seriesLine?: { quantity: number; delay: number } | null;
		/** Codes des points tagués (montrés hors de la série) */
		pointCodes?: string[];
		tab: PreviewTab;
		firstSeed: number;
		/** Clé de la rangée (un modèle peut figurer deux fois dans une série) : id d'ancre unique */
		anchor: string;
	}

	// Variables
	let {
		row,
		review,
		alerts,
		rank,
		seriesLine = null,
		pointCodes = [],
		tab,
		firstSeed,
		anchor
	}: Props = $props();

	const template = $derived(toQuestionTemplate(row));
	const count = $derived(template.variations.length);
</script>

<article class="rounded-lg border bg-card p-3" id="parcours-{anchor}">
	<div class="flex flex-col gap-3 lg:flex-row">
		<header class="space-y-1.5 lg:w-56 lg:shrink-0">
			<p class="font-semibold break-words">
				{#if rank !== undefined}<span class="mr-1 text-muted-foreground">{rank}.</span>{/if}
				{row.title}
			</p>
			<div class="flex flex-wrap items-center gap-1.5 text-xs">
				{#if seriesLine}
					<Badge variant="secondary">
						× {seriesLine.quantity} · {formatSeriesDuration(seriesLine.delay)}
					</Badge>
				{/if}
				<Badge variant={row.status === 'published' ? 'default' : 'outline'}>
					{row.status === 'published' ? 'Publié' : 'Brouillon'}
				</Badge>
				<span class="verdict" data-verdict={review?.verdict ?? 'none'}>
					{review ? VERDICT_LABELS[review.verdict] : 'Sans verdict'}
				</span>
			</div>
			<p class="text-xs text-muted-foreground">
				{count} variation{count > 1 ? 's' : ''}{pointCodes.length > 0
					? ` · ${pointCodes.join(', ')}`
					: ''}
			</p>
			{#if alerts.length > 0}
				<p class="flex items-start gap-1 text-xs text-warning">
					<TriangleAlert class="mt-0.5 h-3.5 w-3.5 shrink-0" />
					{alerts.join(' · ')}
				</p>
			{/if}
			<a
				class="block text-xs underline"
				href={resolve('/(protected)/dashboard/admin/questions/[id]/preview', { id: row.id })}
				>Fiche complète</a
			>
		</header>

		<div class="min-w-0 flex-1">
			<LazyMount>
				<ul
					class="tray flex gap-3 overflow-x-auto rounded-md p-3"
					aria-label="Variations de « {row.title} »"
				>
					{#each template.variations as _variation, i (i)}
						<li class="w-[min(24rem,80vw)] shrink-0">
							<VariationPreview {template} variationIndex={i} {firstSeed} {tab} compact />
						</li>
					{/each}
				</ul>
			</LazyMount>
		</div>
	</div>

	<div class="mt-3 border-t pt-3">
		<ReviewVerdictForm templateId={row.id} {review} compact />
	</div>
</article>

<style>
	/* Plateau des cartes, plus sombre que la rangée : la carte élève (fond `card`, comme la
	   rangée) s'en détache, en clair comme en sombre */
	.tray {
		background: light-dark(
			color-mix(in oklab, var(--color-background) 94%, black),
			color-mix(in oklab, var(--color-background) 70%, black)
		);
	}
	.verdict {
		border-radius: 9999px;
		padding: 0.05rem 0.5rem;
		font-weight: 600;
		border: 1px solid var(--color-border);
	}
	.verdict[data-verdict='valide'] {
		background: color-mix(in oklab, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}
	.verdict[data-verdict='a_revoir'] {
		background: color-mix(in oklab, var(--color-warning) 15%, transparent);
		color: var(--color-warning);
	}
	.verdict[data-verdict='none'] {
		color: var(--color-muted-foreground);
	}
</style>
