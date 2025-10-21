<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import { Plus, Minus } from 'lucide-svelte';
	import type { CartItem, QuestionCategory } from '$lib/stores/questionCart.svelte';
	import type { QuestionInstance } from '$lib/questions/types';

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

	/**
	 * Get preview text from statement
	 */
	function getPreviewText(): string {
		if (!instance || !instance.statement || !Array.isArray(instance.statement)) {
			return '';
		}

		const textFields = instance.statement.filter((field) => field.type === 'text');
		if (textFields.length === 0) return '';

		// Join all text content, truncate to 200 chars
		const fullText = textFields.map((f) => f.content).join(' ');
		return fullText.length > 200 ? fullText.substring(0, 200) + '...' : fullText;
	}

	/**
	 * Increment delay by 5 seconds
	 */
	function handleIncrementDelay() {
		const currentDelay = item.delay;
		const newDelay = currentDelay + 5;
		if (newDelay <= 300) {
			onUpdateDelay(item.category, newDelay);
		}
	}

	/**
	 * Decrement delay by 5 seconds
	 */
	function handleDecrementDelay() {
		const currentDelay = item.delay;
		const newDelay = currentDelay - 5;
		if (newDelay >= 5) {
			onUpdateDelay(item.category, newDelay);
		}
	}
</script>

<div class="group relative">
	<Card.Root class="transition-all duration-200">
		<Card.Header class="space-y-2 pb-3">
			<!-- Category title -->
			<Card.Title class="text-lg">
				{item.category.domain}
				{#if item.category.subdomain}
					<span class="text-muted-foreground"> / {item.category.subdomain}</span>
				{/if}
			</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-3">
			<!-- Preview statement -->
			{#if instance}
				<div class="text-sm">
					<MathDisplay text={getPreviewText()} />
				</div>
			{:else}
				<div class="text-sm text-muted-foreground italic">Chargement...</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Compact controls badge (bottom right) -->
	<div class="absolute right-3 bottom-3 z-10 flex items-center gap-1">
		<!-- Delay controls - visible on hover -->
		<div
			class="flex items-center gap-1 rounded-full bg-background/95 px-2 py-1.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
		>
			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6"
				onclick={handleDecrementDelay}
				disabled={item.delay <= 5}
				aria-label="Diminuer le délai"
			>
				<Minus class="h-3 w-3" />
			</Button>

			<Button
				size="icon"
				variant="ghost"
				class="h-6 w-6"
				onclick={handleIncrementDelay}
				disabled={item.delay >= 300}
				aria-label="Augmenter le délai"
			>
				<Plus class="h-3 w-3" />
			</Button>
			<span class="text-xs font-medium">{item.delay}s</span>
		</div>

		<!-- Quantity badge - always visible -->
		<Button
			size="icon"
			variant="ghost"
			class="h-6 w-6 text-primary-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-primary-foreground/20"
			onclick={() => onDecrementQuantity(item.category)}
			aria-label="Diminuer la quantité"
		>
			<Minus class="h-3 w-3" />
		</Button>
		<div class="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 shadow-md">
			<span class="min-w-[1.5rem] text-center font-bold text-primary-foreground">
				{item.quantity}
			</span>
		</div>
		<Button
			size="icon"
			variant="ghost"
			class="h-6 w-6 text-primary-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-primary-foreground/20"
			onclick={() => onIncrementQuantity(item.category)}
			disabled={item.quantity >= 99}
			aria-label="Augmenter la quantité"
		>
			<Plus class="h-3 w-3" />
		</Button>
	</div>
</div>
