<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Check } from 'lucide-svelte';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { convertLegacyLatexToMarkdown } from '$lib/utils/latex-syntax-adapter';
	import FlashCard from '$lib/components/questions/FlashCard.svelte';
	import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';

	let {
		template,
		preview
	}: {
		template: QuestionTemplate;
		preview: QuestionInstance;
	} = $props();

	// Modal state
	let isModalOpen = $state(false);

	// Check if category already in cart
	let category = $derived({
		theme: template.theme,
		domain: template.domain,
		subdomain: template.subdomain || null,
		level: template.level
	});
	let isInCart = $derived(questionCart.hasCategory(category));

	/**
	 * Get preview text from statement (ResolvedMarkdown string)
	 * Truncates to 200 chars if needed
	 */
	function getPreviewText(statement: string): string {
		if (!statement) return '';
		// Statement is now a ResolvedMarkdown string
		return statement.length > 200 ? statement.substring(0, 200) + '...' : statement;
	}

	/**
	 * Add category to cart
	 */
	function handleAddToCart(e: MouseEvent) {
		e.stopPropagation(); // Prevent card click
		questionCart.addToCart(category, 1);
	}

	/**
	 * Open modal to view full question
	 */
	function handleCardClick() {
		isModalOpen = true;
	}
</script>

<Dialog.Root bind:open={isModalOpen}>
	<Card.Root
		class="group relative cursor-pointer transition-all duration-200 hover:shadow-lg"
		onclick={handleCardClick}
	>
		<!-- FAB Button overlay -->
		<Button
			size="icon"
			variant={isInCart ? 'default' : 'secondary'}
			class="absolute top-2 right-2 z-10 h-10 w-10 rounded-full shadow-md transition-all duration-200 {isInCart
				? 'bg-primary text-primary-foreground'
				: 'opacity-0 group-hover:opacity-100'}"
			onclick={handleAddToCart}
			disabled={isInCart}
			aria-label={isInCart ? 'Dans le panier' : 'Ajouter au panier'}
		>
			{#if isInCart}
				<Check class="h-5 w-5" />
			{:else}
				<Plus class="h-5 w-5" />
			{/if}
		</Button>

		<Card.Header class="space-y-2 pb-3">
			<!-- Header badges -->
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="outline" class="text-xs">{template.level}</Badge>
			</div>

			<!-- Title -->
			<Card.Title class="">
				<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
			</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-3">
			<!-- Preview statement -->
			<div class="">
				<MarkdownRenderer
					content={convertLegacyLatexToMarkdown(getPreviewText(preview.statement))}
				/>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Modal with QuestionDisplay in flashcard mode -->
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>
					<MarkdownRenderer content={convertLegacyLatexToMarkdown(template.title)} />
				</Dialog.Title>
				<Dialog.Description>
					<div class="mt-2 flex flex-wrap items-center gap-2">
						<Badge variant="outline" class="text-xs">{template.level}</Badge>
						<Badge variant="secondary" class="text-xs">{template.theme}</Badge>
						<Badge variant="secondary" class="text-xs">{template.domain}</Badge>
						{#if template.subdomain}
							<Badge variant="secondary" class="text-xs">{template.subdomain}</Badge>
						{/if}
					</div>
				</Dialog.Description>
			</Dialog.Header>

			<!-- Question Display in read-only mode -->
			<div class="mt-4">
				<FlashCard interactive={false} instance={preview} size="lg" />
			</div>

			<!-- Add to cart button at the bottom -->
			<div class="mt-6 flex justify-end gap-3">
				<Button variant="outline" onclick={() => (isModalOpen = false)}>Fermer</Button>
				<Button onclick={handleAddToCart} disabled={isInCart} class="gap-2">
					{#if isInCart}
						<Check class="h-4 w-4" />
						Dans le panier
					{:else}
						<Plus class="h-4 w-4" />
						Ajouter au panier
					{/if}
				</Button>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
