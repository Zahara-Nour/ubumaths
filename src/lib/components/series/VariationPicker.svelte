<script lang="ts">
	/**
	 * Choix des variations d'une ligne de série (chantier `idees-format`, idée 2)
	 *
	 * Le prof restreint une ligne à certaines variations du modèle (révision
	 * ciblée, différenciation). Une variation n'a pas de nom : elle est montrée
	 * par un exemple de question (Q1), toujours le même. Toutes cochées = pas de
	 * choix (`onchange(undefined)`) ; la dernière case cochée ne se décoche pas.
	 *
	 * Idée 4 (PR 4) : avec `onchoicechange`, une case « En QCM » sous chaque
	 * variation dont la question peut se poser en QCM (une seule case, à erreurs
	 * prévues, sans veto de l'auteur ; l'exemple tiré tranche). Retirer une
	 * variation retire aussi son QCM. Un modèle à une seule variation n'affiche
	 * rien, sauf si elle peut se poser en QCM.
	 */
	import { ListFilter } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import FlashCard from '#lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '#lib/components/questions/tile-card.ts';
	import { allowedVariations, variationExample } from '#lib/questions/series-draw.ts';
	import { canBeChoice, mayBeChoice } from '#lib/questions/choice-from-errors.ts';
	import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
	import type { QuestionTemplate } from '#lib/questions/types.ts';

	let {
		template,
		selected,
		onchange,
		choiceSelected,
		onchoicechange
	}: {
		template: QuestionTemplate;
		/** Variations choisies ; absent = toutes */
		selected?: readonly number[];
		/** Nouveau choix ; `undefined` = toutes */
		onchange: (variations: number[] | undefined) => void;
		/** Variations en QCM (idée 4) ; absent = aucune */
		choiceSelected?: readonly number[];
		/** Nouvelles variations en QCM ; `undefined` = aucune. Absent : pas de case « En QCM » */
		onchoicechange?: (choiceVariations: number[] | undefined) => void;
	} = $props();

	let open = $state(false);

	let count = $derived(template.variations?.length ?? 0);
	let allowed = $derived(allowedVariations(template, selected));
	let isAll = $derived(allowed.length === count);
	// Variations qui PEUVENT se poser en QCM, d'après le modèle seul (sans tirage)
	let mayChoose = $derived(
		onchoicechange
			? (template.variations ?? []).flatMap((variation, index) =>
					mayBeChoice(variation) ? [index] : []
				)
			: []
	);
	// Celles dont l'exemple tiré se pose VRAIMENT en QCM : le type de case, un bloc
	// d'opération ne se savent qu'au tirage. Exemples calculés pour ces seules variations
	let choosable = $derived(
		mayChoose.filter((index) => {
			const example = variationExample(template, index, generateInstance);
			return example !== null && canBeChoice(example);
		})
	);
	// En QCM et encore permises (une variation retirée ne compte plus)
	let inChoice = $derived(
		(choiceSelected ?? []).filter((index) => allowed.includes(index) && choosable.includes(index))
	);
	let summary = $derived(summaryOf(count, allowed.length, inChoice.length));
	// Exemples calculés à l'ouverture seulement (graine fixe : toujours les mêmes)
	let examples = $derived(
		open
			? Array.from({ length: count }, (_, index) =>
					variationExample(template, index, generateInstance)
				)
			: []
	);

	function summaryOf(total: number, kept: number, choices: number): string {
		if (total === 1) return choices > 0 ? 'Réponse en QCM' : 'Réponse en saisie';
		const base =
			kept === total ? `Toutes les variations (${total})` : `${kept} variations sur ${total}`;
		return choices > 0 ? `${base} · ${choices} en QCM` : base;
	}

	function toggle(index: number, checked: boolean) {
		const next = checked
			? [...allowed, index].sort((a, b) => a - b)
			: allowed.filter((other) => other !== index);
		if (next.length === 0) return;
		// Variation retirée : son QCM part avec elle (choix enregistré, même hors de l'affichage)
		if (!checked && choiceSelected?.includes(index)) {
			const kept = inChoice.filter((other) => other !== index);
			onchoicechange?.(kept.length > 0 ? kept : undefined);
		}
		onchange(next.length === count ? undefined : next);
	}

	function toggleChoice(index: number, checked: boolean) {
		const next = checked
			? [...inChoice, index].sort((a, b) => a - b)
			: inChoice.filter((other) => other !== index);
		onchoicechange?.(next.length > 0 ? next : undefined);
	}
</script>

{#if count > 1 || choosable.length > 0}
	<Button
		type="button"
		size="sm"
		variant="ghost"
		class="h-7 justify-start gap-1.5 px-2 text-sm {isAll && inChoice.length === 0
			? 'text-muted-foreground'
			: ''}"
		onclick={() => (open = true)}
		data-choix-variations
	>
		<ListFilter class="h-3.5 w-3.5" aria-hidden="true" />
		{summary}
	</Button>

	<Dialog.Root bind:open>
		<Dialog.Content class="max-h-[85vh] max-w-3xl overflow-y-auto">
			<Dialog.Header>
				<Dialog.Title>{count > 1 ? 'Variations du modèle' : 'Réponse en QCM'}</Dialog.Title>
				<Dialog.Description>
					{#if count > 1}
						Coche celles à garder dans la série. Chaque variation est montrée par un exemple de
						question.
					{/if}
					{#if choosable.length > 0}
						« En QCM » : l'élève choisit entre la bonne réponse et les erreurs prévues (en
						Flash-cards, ou si un tirage ne le permet pas, la question reste en saisie).
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<ul class="grid gap-4 sm:grid-cols-2">
				{#each examples as example, index (index)}
					{@const checked = allowed.includes(index)}
					<li class="flex flex-col gap-2">
						<div class="flex flex-wrap items-center gap-x-4 gap-y-1">
							{#if count > 1}
								<MyCheckbox
									{checked}
									disabled={checked && allowed.length === 1}
									label="Variation {index + 1}"
									onchange={(value) => toggle(index, value)}
								/>
							{/if}
							{#if choosable.includes(index)}
								<MyCheckbox
									checked={inChoice.includes(index)}
									disabled={!checked}
									label="En QCM"
									aria-label="Variation {index + 1} en QCM"
									onchange={(value) => toggleChoice(index, value)}
								/>
							{/if}
						</div>
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
