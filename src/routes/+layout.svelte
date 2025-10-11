<script lang="ts">
	import '../app.css';
	// Import Claude AI fonts
	import '@fontsource/inter/400.css';
	import '@fontsource/inter/500.css';
	import '@fontsource/inter/600.css';
	import '@fontsource/inter/700.css';
	import '@fontsource/lora/400.css';
	import '@fontsource/lora/600.css';
	import '@fontsource/lora/700.css';

	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { page } from '$app/stores';
	import { navigating } from '$app/stores';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher } from 'mode-watcher';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Check if we're in a dashboard route
	let isDashboardRoute = $derived($page.url.pathname.startsWith('/dashboard'));

	// Initialize theme and fontSize (this ensures the stores are created and DOM is updated)
	$effect(() => {
		// Access to ensure reactivity
		theme.dark;
		fontSize.size;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Preload links on hover for faster navigation -->
	<meta name="sveltekit:preload-data" content="hover" />
</svelte:head>

<!-- Mode Watcher for automatic dark/light mode syncing -->
<!-- track={true} syncs with system preferences -->
<ModeWatcher track={true} defaultMode="system" />

<!-- Loading bar that appears during navigation -->
{#if $navigating}
	<div class="fixed top-0 left-0 right-0 h-1 bg-primary z-[200] animate-pulse shadow-lg"></div>
{/if}

<!-- Toast notifications -->
<Toaster richColors position="top-right" />

<div class="flex h-screen flex-col">
	<!-- Header - only show on non-dashboard routes -->
	{#if !isDashboardRoute}
		<Header title="UbuMaths" session={data.session} user={data.user} supabase={data.supabase} />
	{/if}

	<!-- Main content area with sidebar -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar - only show on non-dashboard routes, hidden on small/medium screens, visible on large screens -->
		{#if !isDashboardRoute}
			<Sidebar />
		{/if}

		<!-- Main content -->
		<main class="flex-1 overflow-y-auto {isDashboardRoute ? '' : 'p-6'}">
			{@render children?.()}
		</main>
	</div>
</div>
