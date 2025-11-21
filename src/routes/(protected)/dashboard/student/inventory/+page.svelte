<script lang="ts">
	import { shopStore } from '$lib/stores/shop.svelte';
	import InventoryPanel from '$lib/components/inventory/InventoryPanel.svelte';

	// Props from server
	let { data } = $props();

	// Initialize store
	$effect(() => {
		if (data.supabase && data.user) {
			shopStore.init(data.supabase, data.user.id);
		}

		return () => {
			shopStore.cleanup();
		};
	});
</script>

<svelte:head>
	<title>Mon Inventaire - Ubumaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-6">
	<InventoryPanel />
</div>
