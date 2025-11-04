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
	import { toaster as _toaster } from '$lib/stores/toaster.svelte';
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher } from 'mode-watcher';
	import { getVersion } from '$lib/utils/version';
	import SkeletonPage from '$lib/components/skeleton/SkeletonPage.svelte';
	import SkeletonDashboard from '$lib/components/skeleton/SkeletonDashboard.svelte';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import SkeletonForm from '$lib/components/skeleton/SkeletonForm.svelte';
	import { getSkeletonType } from '$lib/utils/skeleton-detector';
	import ModalStackRenderer from '$lib/components/modals/ModalStackRenderer.svelte';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// Check if we're in a dashboard route
	let isDashboardRoute = $derived(page.url.pathname.startsWith('/dashboard'));

	// Determine which skeleton variant to show based on current route
	let skeletonType = $derived(getSkeletonType(page.url.pathname));

	// Initialize theme and fontSize stores (ensures DOM updates on mode/size changes)
	$effect(() => {
		// Access to ensure reactivity
		void theme.dark;
		void fontSize.size;
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

<!-- Modal Stack Renderer - renders modal stack from modalStack store -->
<ModalStackRenderer />

<div class="flex h-screen flex-col">
	<!-- Header - only show on non-dashboard routes -->
	{#if !isDashboardRoute}
		<Header title="UbuMaths" user={data.user} profile={data.profile} />
	{/if}

	<!-- Main content area with sidebar -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar - only show on non-dashboard routes, hidden on small/medium screens, visible on large screens -->
		{#if !isDashboardRoute}
			<Sidebar />
		{/if}

		<!-- Main content -->
		<main class="relative flex-1 overflow-y-auto" class:p-6={!isDashboardRoute}>
			<!-- Always render children so page can load -->
			<div
				class:opacity-0={$navigating && !isDashboardRoute}
				class="transition-opacity duration-200"
			>
				{@render children?.()}
			</div>

			<!-- Overlay skeleton during navigation (only for non-dashboard routes) -->
			{#if $navigating && !isDashboardRoute}
				<div class="absolute inset-0 bg-background p-6">
					{#if skeletonType === 'dashboard'}
						<SkeletonDashboard />
					{:else if skeletonType === 'list'}
						<SkeletonList />
					{:else if skeletonType === 'form'}
						<SkeletonForm />
					{:else}
						<SkeletonPage />
					{/if}
				</div>
			{/if}
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
