<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { page, navigating } from '$app/stores';
	import type { LayoutData } from './$types';
	import { Toaster } from '@skeletonlabs/skeleton-svelte';

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

<!-- Loading bar that appears during navigation -->
{#if $navigating}
	<div class="fixed top-0 left-0 right-0 h-1 bg-primary-600 z-[200] animate-pulse shadow-lg"></div>
{/if}

<Toaster
	{toaster}
	classes="card p-4 shadow-lg"
	stateSuccess="bg-green-600 text-white"
	stateError="bg-red-600 text-white"
	stateWarning="bg-orange-600 text-white"
	stateInfo="bg-blue-600 text-white"
/>

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
		<main class="bg-surface-50-950 flex-1 overflow-y-auto {isDashboardRoute ? '' : 'p-6'}">
			{@render children?.()}
		</main>
	</div>
</div>
