<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Zap, Lock } from 'lucide-svelte';

	// Props
	let { inventoryId, context = 'manual' } = $props<{
		inventoryId: string;
		context?: string;
	}>();

	// State
	let isUsing = $state(false);

	// Find the item in inventory
	let item = $derived(shopStore.inventory.find((i) => i.id === inventoryId));

	// Check if can use
	let canUse = $derived(
		item &&
			!item.locked_for_listing_id &&
			!item.locked_for_trade_id &&
			(!item.uses_remaining || item.uses_remaining > 0)
	);

	// Handle use
	async function handleUse() {
		if (!canUse) return;

		isUsing = true;
		await shopStore.useItem(inventoryId, context);
		isUsing = false;
	}
</script>

<Button
	onclick={handleUse}
	disabled={!canUse || isUsing || shopStore.isLoading.use}
	size="sm"
	variant="default"
	class="flex-1"
>
	{#if isUsing || shopStore.isLoading.use}
		<span class="mr-2 animate-spin">⏳</span>
		Utilisation...
	{:else if !canUse}
		<Lock class="mr-2 h-3 w-3" />
		Verrouillé
	{:else}
		<Zap class="mr-2 h-3 w-3" />
		Utiliser
		{#if item?.uses_remaining}
			({item.uses_remaining})
		{/if}
	{/if}
</Button>
