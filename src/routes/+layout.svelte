<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Initialize theme and fontSize (this ensures the stores are created and DOM is updated)
	$effect(() => {
		// Access to ensure reactivity
		theme.dark;
		fontSize.size;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="flex h-screen flex-col">
	<!-- Header -->
	<Header title="UbuMaths" session={data.session} user={data.user} supabase={data.supabase} />

	<!-- Main content area with sidebar -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar - hidden on small/medium screens, visible on large screens -->
		<Sidebar />

		<!-- Main content -->
		<main class="bg-surface-50-950 flex-1 overflow-y-auto p-6">
			{@render children?.()}
		</main>
	</div>
</div>
