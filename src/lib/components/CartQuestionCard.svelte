<script lang="ts">
	/**
	 * Tuile d'une catégorie du panier (panier Automaths, création d'évaluation)
	 *
	 * Décision de David (2026-09-29) : la tuile EST la flash-card de la question
	 * (non interactive, avec son bouton de retournement), sous l'intitulé
	 * « Thème / Domaine ». En dessous : la durée et le nombre de répétitions,
	 * toujours visibles ; leurs boutons − / + n'apparaissent qu'au survol (ou au
	 * focus clavier, ou toujours sur écran tactile). Un clic sur la tuile ne fait
	 * rien : tout est déjà dans la flash-card.
	 */
	import { Button } from '$lib/components/ui/button';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { TILE_CARD_HEIGHT } from '$lib/components/questions/tile-card';
	import { Clock, Minus, Plus, Repeat } from '@lucide/svelte';
	import type { CartItem, QuestionCategory } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance } from '$lib/questions/types';

	// Bornes et pas de la durée (secondes)
	const DELAY_STEP = 5;
	const DELAY_MIN = 5;
	const DELAY_MAX = 300;
	const QUANTITY_MAX = 99;

	// Boutons révélés au survol, au focus clavier, et toujours sur écran tactile
	const revealOnHover =
		'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

	let {
		item,
		instance,
		onIncrementQuantity,
		onDecrementQuantity,
		onUpdateDelay
	}: {
		item: CartItem;
		instance?: QuestionInstance;
		onIncrementQuantity: (category: QuestionCategory) => void;
		onDecrementQuantity: (category: QuestionCategory) => void;
		onUpdateDelay: (category: QuestionCategory, delay: number) => void;
	} = $props();

	function handleIncrementDelay() {
		const newDelay = item.delay + DELAY_STEP;
		if (newDelay <= DELAY_MAX) onUpdateDelay(item.category, newDelay);
	}

	function handleDecrementDelay() {
		const newDelay = item.delay - DELAY_STEP;
		if (newDelay >= DELAY_MIN) onUpdateDelay(item.category, newDelay);
	}
</script>

<div class="group flex flex-col gap-3">
	<!-- Intitulé -->
	<p class="text-sm font-medium">
		{item.category.theme}
		<span class="text-muted-foreground"> / {item.category.domain}</span>
	</p>

	<!-- La flash-card elle-même -->
	{#if instance}
		<FlashCard {instance} interactive={false} size="sm" height={TILE_CARD_HEIGHT} />
	{:else}
		<div
			class="rounded-xl border p-6 text-center text-sm text-muted-foreground italic"
			role="status"
		>
			Aperçu indisponible
		</div>
	{/if}

	<!-- Réglages : valeurs toujours visibles, boutons au survol -->
	<div class="flex items-center justify-between gap-2">
		<!-- Durée -->
		<div class="flex items-center gap-1 rounded-full bg-muted px-2 py-1 shadow-sm">
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6 {revealOnHover}"
				onclick={handleDecrementDelay}
				disabled={item.delay <= DELAY_MIN}
				aria-label="Diminuer la durée"
			>
				<Minus class="h-3 w-3" />
			</Button>
			<span class="flex items-center gap-1 text-sm font-medium" title="Durée par question">
				<Clock class="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
				{item.delay} s
			</span>
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6 {revealOnHover}"
				onclick={handleIncrementDelay}
				disabled={item.delay >= DELAY_MAX}
				aria-label="Augmenter la durée"
			>
				<Plus class="h-3 w-3" />
			</Button>
		</div>

		<!-- Répétitions -->
		<div class="flex items-center gap-1 rounded-full bg-primary px-2 py-1 shadow-md">
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20 {revealOnHover}"
				onclick={() => onDecrementQuantity(item.category)}
				aria-label="Diminuer le nombre de répétitions"
			>
				<Minus class="h-3 w-3" />
			</Button>
			<span
				class="flex min-w-[2.5rem] items-center justify-center gap-1 font-bold text-primary-foreground"
				title="Nombre de répétitions"
			>
				<Repeat class="h-3.5 w-3.5" aria-hidden="true" />
				{item.quantity}
			</span>
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20 {revealOnHover}"
				onclick={() => onIncrementQuantity(item.category)}
				disabled={item.quantity >= QUANTITY_MAX}
				aria-label="Augmenter le nombre de répétitions"
			>
				<Plus class="h-3 w-3" />
			</Button>
		</div>
	</div>
</div>
