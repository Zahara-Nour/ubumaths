<script lang="ts">
	/**
	 * Root Layout Component
	 * =====================
	 *
	 * This is the root layout that wraps all pages in the application.
	 *
	 * PERFORMANCE OPTIMIZATIONS:
	 * - Fonts loaded from separate CSS file (fonts.css) for better Vite optimization
	 * - Dashboard-specific CSS loaded conditionally in dashboard layout
	 * - Minimal imports to reduce initial bundle size
	 *
	 * LAYOUT STRUCTURE:
	 * - Non-dashboard routes: Header + Sidebar + Content + Footer
	 * - Dashboard routes: Handled by dashboard/+layout.svelte (custom header/sidebar)
	 */
	import '../app.css';
	import '../fonts.css'; // Consolidated font imports (optimized loading)

	import favicon from '$lib/assets/images/favicon.png';
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
	import { getVersion } from '$lib/utils/version';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// Check if we're in a dashboard route
	let isDashboardRoute = $derived($page.url.pathname.startsWith('/dashboard'));

	// Initialize theme and fontSize stores (ensures DOM updates on mode/size changes)
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
	<div class="fixed top-0 right-0 left-0 z-[200] h-1 animate-pulse bg-primary shadow-lg"></div>
{/if}

<!-- Toast notifications -->
<!-- gap={12} adds spacing between toasts to prevent overlap -->
<!-- offset="16px" adds padding from screen edge -->
<Toaster richColors position="top-right" expand={true} visibleToasts={5} gap={12} offset="16px" />

<div class="flex h-screen flex-col">
	<!-- Header - only show on non-dashboard routes -->
	{#if !isDashboardRoute}
		<Header
			title="UbuMaths"
			session={data.session}
			user={data.user}
			profile={data.profile}
			supabase={data.supabase}
		/>
	{/if}

	<!-- Main content area with sidebar -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar - only show on non-dashboard routes, hidden on small/medium screens, visible on large screens -->
		{#if !isDashboardRoute}
			<Sidebar />
		{/if}

		<!-- Main content -->
		<main class="flex-1 overflow-y-auto" class:p-6={!isDashboardRoute}>
			{@render children?.()}
		</main>
	</div>

	<!-- Footer - only show on non-dashboard routes -->
	{#if !isDashboardRoute}
		<footer class="border-t border-border bg-background py-4">
			<div
				class="container mx-auto flex items-center justify-between px-4 text-sm text-muted-foreground"
			>
				<p>&copy; {new Date().getFullYear()} UbuMaths. Tous droits réservés.</p>
				<p class="text-xs">{getVersion()}</p>
			</div>
		</footer>
	{/if}
</div>
