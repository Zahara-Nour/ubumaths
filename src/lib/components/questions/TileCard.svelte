<script lang="ts">
	/**
	 * Flash-card d'une tuile (catalogue Automaths, Ma série), sous une ligne fine
	 *
	 * Phase 0 validée par David (2026-11-26, chantier `automaths`) : à gauche le
	 * badge des niveaux du modèle (« CM1–CM2 », « CM1 · 6e ») ; à droite
	 * « ‹ 2/5 › » quand le modèle a au moins deux variations. Les flèches
	 * changent seulement l'exemple affiché : rien ne change dans la série. Un
	 * exemple de variation est toujours le même (graine fixe, `variationExample`).
	 * Bouton de retournement plus petit dans les tuiles (32 px) ; la carte de
	 * l'élève garde le sien.
	 */
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import { allowedVariations, variationExample } from '#lib/questions/series-draw.ts';
	import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
	import { formatGradeBadge } from '#lib/utils/grade-badge.ts';
	import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';

	let {
		template,
		preview,
		variations,
		height
	}: {
		template: QuestionTemplate;
		/** Exemple montré d'abord (aperçu du modèle ou de la ligne de série) */
		preview: QuestionInstance;
		/** Variations permises (choix du prof dans Ma série) ; absent = toutes */
		variations?: readonly number[];
		height: string;
	} = $props();

	// Variation choisie aux flèches ; null = celle de l'aperçu
	let chosen = $state<number | null>(null);

	let gradeBadge = $derived(formatGradeBadge(template.grades ?? []));
	let list = $derived(allowedVariations(template, variations));
	// Aperçu d'une variation que le prof n'a pas gardée → première variation gardée
	let previewIndex = $derived(
		preview.selectedVariationIndex !== undefined && list.includes(preview.selectedVariationIndex)
			? preview.selectedVariationIndex
			: list[0]
	);
	// Choix qui n'est plus permis (variations changées) → retour à l'aperçu
	let current = $derived(chosen !== null && list.includes(chosen) ? chosen : previewIndex);
	let position = $derived(Math.max(0, list.indexOf(current)));
	let shown = $derived(
		current === preview.selectedVariationIndex
			? preview
			: variationExample(template, current, generateInstance)
	);

	function step(delta: number) {
		chosen = list[(position + delta + list.length) % list.length];
	}
</script>

<div class="flex flex-col gap-1">
	<div class="flex min-h-6 items-center justify-between gap-2 text-xs text-muted-foreground">
		<span title="Niveaux" data-tile-grades>{gradeBadge}</span>
		{#if list.length >= 2}
			<div class="flex items-center" data-tile-variations>
				<button
					type="button"
					class="variation-arrow"
					onclick={() => step(-1)}
					aria-label="Variation précédente"
				>
					<ChevronLeft class="h-4 w-4" aria-hidden="true" />
				</button>
				<span class="tabular-nums" aria-live="polite">
					<span class="sr-only">Variation </span>{position + 1}/{list.length}
				</span>
				<button
					type="button"
					class="variation-arrow"
					onclick={() => step(1)}
					aria-label="Variation suivante"
				>
					<ChevronRight class="h-4 w-4" aria-hidden="true" />
				</button>
			</div>
		{/if}
	</div>

	{#if shown}
		<FlashCard instance={shown} interactive={false} size="sm" {height} compactFlip />
	{:else}
		<div
			class="rounded-xl border p-6 text-center text-sm text-muted-foreground italic"
			role="status"
		>
			Aperçu indisponible
		</div>
	{/if}
</div>

<style>
	.variation-arrow {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		color: inherit;
	}

	/* Zone de clic de 40 px (au doigt) sans grossir la ligne fine */
	.variation-arrow::before {
		content: '';
		position: absolute;
		inset: -0.5rem;
	}

	.variation-arrow:hover {
		background: var(--color-muted);
		color: var(--color-foreground);
	}

	.variation-arrow:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}
</style>
