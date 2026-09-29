<script lang="ts">
	/**
	 * Tuile d'une catégorie du panier (panier Automaths, création d'évaluation)
	 *
	 * Toujours visibles : titre, aperçu de l'énoncé, durée, nombre de répétitions.
	 * Au survol (ou au focus clavier, ou toujours sur écran tactile) : seulement
	 * les boutons − / + de la durée et des répétitions.
	 * Clic sur la tuile : la question en grand, comme dans la grille Automaths.
	 */
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import { Clock, Minus, Plus, Repeat } from '@lucide/svelte';
	import type { CartItem, QuestionCategory } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

	// Bornes et pas de la durée (secondes)
	const DELAY_STEP = 5;
	const DELAY_MIN = 5;
	const DELAY_MAX = 300;
	const QUANTITY_MAX = 99;
	const PREVIEW_MAX_LENGTH = 200;

	// Boutons révélés au survol, au focus clavier, et toujours sur écran tactile
	const revealOnHover =
		'opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100';

	let {
		item,
		template,
		instance,
		onIncrementQuantity,
		onDecrementQuantity,
		onUpdateDelay
	}: {
		item: CartItem;
		template?: QuestionTemplate;
		instance?: QuestionInstance;
		onIncrementQuantity: (category: QuestionCategory) => void;
		onDecrementQuantity: (category: QuestionCategory) => void;
		onUpdateDelay: (category: QuestionCategory, delay: number) => void;
	} = $props();

	let isModalOpen = $state(false);

	// L'énoncé est une chaîne Markdown résolue, tronquée pour la tuile
	let previewText = $derived.by(() => {
		const statement = instance?.statement ?? '';
		return statement.length > PREVIEW_MAX_LENGTH
			? statement.substring(0, PREVIEW_MAX_LENGTH) + '...'
			: statement;
	});

	function handleIncrementDelay() {
		const newDelay = item.delay + DELAY_STEP;
		if (newDelay <= DELAY_MAX) onUpdateDelay(item.category, newDelay);
	}

	function handleDecrementDelay() {
		const newDelay = item.delay - DELAY_STEP;
		if (newDelay >= DELAY_MIN) onUpdateDelay(item.category, newDelay);
	}

	function handleCardKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			isModalOpen = true;
		}
	}
</script>

<div class="group relative">
	<Card.Root
		class="h-full cursor-pointer pb-14 transition-all duration-200 hover:shadow-lg"
		role="button"
		tabindex={0}
		aria-label="Voir la question : {item.category.domain}{item.category.subdomain
			? ` / ${item.category.subdomain}`
			: ''}"
		onclick={() => (isModalOpen = true)}
		onkeydown={handleCardKeydown}
	>
		<Card.Header class="space-y-2 pb-3">
			<Card.Title class="text-lg">
				{item.category.domain}
				{#if item.category.subdomain}
					<span class="text-muted-foreground"> / {item.category.subdomain}</span>
				{/if}
			</Card.Title>
		</Card.Header>

		<Card.Content>
			{#if instance}
				<div class="text-sm">
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(previewText)} flashMode />
				</div>
			{:else}
				<div class="text-sm text-muted-foreground italic">Aperçu indisponible</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Réglages : valeurs toujours visibles, boutons au survol. Hors de la carte
	     cliquable, pour qu'un clic sur un bouton n'ouvre pas l'aperçu. -->
	<div class="absolute inset-x-3 bottom-3 z-10 flex items-center justify-between gap-2">
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

<!-- La question en grand, comme dans la grille Automaths -->
<Dialog.Root bind:open={isModalOpen}>
	<!-- Dialog.Content porte déjà son portail et son voile -->
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>
				{#if template}
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
				{:else}
					{item.category.domain}
				{/if}
			</Dialog.Title>
			<Dialog.Description>
				<span class="mt-2 flex flex-wrap items-center gap-2">
					<Badge variant="outline" class="text-xs">{item.category.level}</Badge>
					<Badge variant="secondary" class="text-xs">{item.category.theme}</Badge>
					<Badge variant="secondary" class="text-xs">{item.category.domain}</Badge>
					{#if item.category.subdomain}
						<Badge variant="secondary" class="text-xs">{item.category.subdomain}</Badge>
					{/if}
					<Badge variant="outline" class="text-xs">{item.delay} s</Badge>
					<Badge variant="outline" class="text-xs">× {item.quantity}</Badge>
				</span>
			</Dialog.Description>
		</Dialog.Header>

		<div class="mt-4">
			{#if instance}
				<FlashCard interactive={false} {instance} size="lg" />
			{:else}
				<p class="text-sm text-muted-foreground italic">Aperçu indisponible</p>
			{/if}
		</div>

		<div class="mt-6 flex justify-end">
			<Button variant="outline" onclick={() => (isModalOpen = false)}>Fermer</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
