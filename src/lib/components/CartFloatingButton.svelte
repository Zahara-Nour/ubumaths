<script lang="ts">
	import { ShoppingCart } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { questionCart } from '$lib/stores/questionCart.svelte';
	import { goto } from '$app/navigation';

	// Reactive values from store
	let totalItems = $derived(questionCart.totalItems);
	let hasItems = $derived(totalItems > 0);

	/**
	 * Navigate to cart page
	 */
	function handleClick() {
		goto('/automaths/panier');
	}
</script>

<!-- Floating Action Button -->
<button
	onclick={handleClick}
	class="group fixed right-6 bottom-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl focus:ring-4 focus:ring-primary/30 focus:outline-none {hasItems
		? 'animate-pulse'
		: ''}"
	aria-label="Voir le panier"
	title="Voir le panier ({totalItems} {totalItems === 1 ? 'question' : 'questions'})"
>
	<!-- Shopping cart icon -->
	<div class="relative">
		<ShoppingCart class="h-7 w-7 transition-transform duration-300 group-hover:scale-110" />

		<!-- Badge with item count -->
		{#if hasItems}
			<Badge
				variant="destructive"
				class="animate-in fade-in zoom-in absolute -top-2 -right-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold"
			>
				{totalItems}
			</Badge>
		{/if}
	</div>
</button>

<style>
	/* Pulse animation for non-empty cart */
	.animate-pulse {
		animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.85;
		}
	}
</style>
