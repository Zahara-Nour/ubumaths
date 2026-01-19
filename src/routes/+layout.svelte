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

	// Vercel Analytics & Speed Insights (RUM - Real User Monitoring)
	import { inject } from '@vercel/analytics';
	import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

	inject(); // Web Analytics
	injectSpeedInsights(); // Speed Insights (Core Web Vitals)

	import favicon from '$lib/assets/images/favicon.png';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { initializeTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
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

	// Check if we're on the whiteboard page (needs full screen, no footer/padding)
	let isWhiteboardRoute = $derived(page.url.pathname.startsWith('/whiteboard'));

	// Determine which skeleton variant to show based on current route
	let skeletonType = $derived(getSkeletonType(page.url.pathname));

	// Initialize theme and fontSize stores (ensures DOM updates on mode/size changes)
	$effect(() => {
		// Access to ensure reactivity
		void theme.dark;
		void fontSize.size;
	});

	// Initialize VIP card templates store from server data
	$effect(() => {
		if (data.vipCardTemplates && data.vipCardTemplates.length > 0) {
			initializeTemplates(data.vipCardTemplates);
			console.log(
				`🎴 [ROOT LAYOUT] Initialized ${data.vipCardTemplates.length} VIP card templates`
			);
		}
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
			<Sidebar profile={data.profile} />
		{/if}

		<!-- Main content -->
		<!-- NOTE: Dashboard routes handle their own scroll via dashboard-content -->
		<main
			class="relative flex-1"
			class:overflow-y-auto={!isWhiteboardRoute && !isDashboardRoute}
			class:overflow-hidden={isWhiteboardRoute || isDashboardRoute}
		>
			<!-- Always render children so page can load -->
			<div
				class:opacity-0={$navigating && !isDashboardRoute}
				class:h-full={isWhiteboardRoute}
				class="transition-opacity duration-200"
			>
				{@render children?.()}
			</div>

			<!-- Overlay skeleton during navigation (only for non-dashboard routes) -->
			{#if $navigating && !isDashboardRoute}
				<div class="absolute inset-0 bg-background">
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

	<!-- Footer - only show on non-dashboard and non-whiteboard routes -->
	{#if !isDashboardRoute && !isWhiteboardRoute}
		<footer class="border-t border-border bg-background py-4">
			<div
				class="container mx-auto flex flex-col items-center justify-between gap-2 px-4 text-sm text-muted-foreground sm:flex-row"
			>
				<p>&copy; {new Date().getFullYear()} UbuMaths. Tous droits reserves.</p>
				<nav class="flex items-center gap-4">
					<a href={resolve('/legal/confidentialite')} class="hover:text-foreground hover:underline">
						Confidentialite
					</a>
					<a href={resolve('/legal/cgu')} class="hover:text-foreground hover:underline"> CGU </a>
					<a
						href={resolve('/legal/mentions-legales')}
						class="hover:text-foreground hover:underline"
					>
						Mentions legales
					</a>
					<span class="text-xs">{getVersion()}</span>
				</nav>
			</div>
		</footer>
	{/if}
</div>
