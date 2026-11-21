<script lang="ts">
	/**
	 * Choix des variations d'une ligne de série (chantier `idees-format`, idée 2)
	 *
	 * Le prof restreint une ligne à certaines variations du modèle (révision
	 * ciblée, différenciation). Une variation n'a pas de nom : elle est montrée
	 * par un exemple de question (Q1), toujours le même. Toutes cochées = pas de
	 * choix (`onchange(undefined)`) ; la dernière case cochée ne se décoche pas.
	 * Un modèle à une seule variation n'affiche rien.
	 */
	import { ListFilter } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '#lib/components/questions/tile-card.ts';
	import { allowedVariations, variationExample } from '#lib/questions/series-draw.ts';
	import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
	import type { QuestionTemplate } from '#lib/questions/types.ts';

	let {
		template,
		selected,
		onchange
	}: {
		template: QuestionTemplate;
		/** Variations choisies ; absent = toutes */
		selected?: readonly number[];
		/** Nouveau choix ; `undefined` = toutes */
		onchange: (variations: number[] | undefined) => void;
	} = $props();

	let open = $state(false);

	let count = $derived(template.variations?.length ?? 0);
	let allowed = $derived(allowedVariations(template, selected));
	let isAll = $derived(allowed.length === count);
	let summary = $derived(
		isAll ? `Toutes les variations (${count})` : `${allowed.length} variations sur ${count}`
	);
	// Exemples calculés à l'ouverture seulement (graine fixe : toujours les mêmes)
	let examples = $derived(
		open
			? Array.from({ length: count }, (_, index) =>
					variationExample(template, index, generateInstance)
				)
			: []
	);

	function toggle(index: number, checked: boolean) {
		const next = checked
			? [...allowed, index].sort((a, b) => a - b)
			: allowed.filter((other) => other !== index);
		if (next.length === 0) return;
		onchange(next.length === count ? undefined : next);
	}
</script>

{#if count > 1}
	<Button
		type="button"
		size="sm"
		variant="ghost"
		class="h-7 justify-start gap-1.5 px-2 text-sm {isAll ? 'text-muted-foreground' : ''}"
		onclick={() => (open = true)}
		data-choix-variations
	>
		<ListFilter class="h-3.5 w-3.5" aria-hidden="true" />
		{summary}
	</Button>

	<Dialog.Root bind:open>
		<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>Variations du modèle</Dialog.Title>
				<Dialog.Description>
					Coche celles à garder dans la série. Chaque variation est montrée par un exemple de
					question.
				</Dialog.Description>
			</Dialog.Header>

			<ul class="grid gap-4 sm:grid-cols-2">
				{#each examples as example, index (index)}
					{@const checked = allowed.includes(index)}
					<li class="flex flex-col gap-2">
						<MyCheckbox
							{checked}
							disabled={checked && allowed.length === 1}
							label="Variation {index + 1}"
							onchange={(value) => toggle(index, value)}
						/>
						{#if example}
							<FlashCard
								instance={example}
								interactive={false}
								size="sm"
								height={TILE_CARD_HEIGHT}
							/>
						{:else}
							<p
								class="rounded-xl border p-6 text-center text-sm text-muted-foreground italic"
								role="status"
							>
								Exemple indisponible
							</p>
						{/if}
					</li>
				{/each}
			</ul>

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Fermer</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}
