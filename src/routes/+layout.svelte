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
	 * - Non-dashboard routes: Header + Sidebar + Content (+ « Infos et confidentialité » button on the home page only)
	 * - Dashboard routes: Handled by dashboard/+layout.svelte (custom header/sidebar)
	 */
	import '../app.css';
	import '../fonts.css'; // Consolidated font imports (optimized loading)

	// Vercel Analytics & Speed Insights (RUM - Real User Monitoring)
	// Loaded via dynamic import in $effect for two reasons:
	// 1. Brave browser blocks these scripts - dynamic import + catch handles this gracefully
	// 2. Avoids adding to the root layout's static dependency chain (see Safari TDZ fix
	//    in +layout.ts for details on WebKit module initialization issues)
	import { browser } from '$app/environment';

	$effect(() => {
		if (!browser) return;
		Promise.all([import('@vercel/analytics'), import('@vercel/speed-insights/sveltekit')])
			.then(([{ inject }, { injectSpeedInsights }]) => {
				inject();
				injectSpeedInsights();
			})
			.catch((e) => {
				console.debug('[Analytics] Failed to initialize:', e);
			});
	});

	import favicon from '$lib/assets/images/favicon.png';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { initializeTemplates } from '$lib/stores/vipCardTemplates.svelte';
	import { page } from '$app/state';
	import { showsInfoButton } from '$lib/utils/footer';
	import InfoPanel from '$lib/components/InfoPanel.svelte';
	import { navigating } from '$app/stores';
	import type { LayoutData } from './$types';
	import { Toaster } from 'svelte-sonner';
	import { ModeWatcher } from 'mode-watcher';
	import SkeletonPage from '$lib/components/skeleton/SkeletonPage.svelte';
	import SkeletonDashboard from '$lib/components/skeleton/SkeletonDashboard.svelte';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import SkeletonForm from '$lib/components/skeleton/SkeletonForm.svelte';
	import { getSkeletonType } from '$lib/utils/skeleton-detector';
	import ModalStackRenderer from '$lib/components/modals/ModalStackRenderer.svelte';
	import { provideReaderGrade } from '$lib/lexicon/reader-grade';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// Niveau de l'élève connecté : lu par les mots cliquables des questions
	provideReaderGrade(() => data.profile?.grade);

	// Check if we're in a dashboard route
	let isDashboardRoute = $derived(page.url.pathname.startsWith('/dashboard'));

	// Check if we're on the whiteboard page (needs full screen, no footer/padding)
	let isWhiteboardRoute = $derived(page.url.pathname.startsWith('/whiteboard'));
	// L'accueil centre Père Ubu dans toute la hauteur disponible : il lui faut une hauteur définie
	let isHomeRoute = $derived(page.url.pathname === '/');

	// Bouton « Infos et confidentialité », qui remplace le pied de page : accueil seulement
	// (`showsInfoButton`, décisions du 2026-10-04 et du 2026-10-06)
	let infoButtonShown = $derived(showsInfoButton(page.url.pathname));

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
		<Header title="Chiphre" user={data.user} profile={data.profile} />
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
				class:h-full={isWhiteboardRoute || isHomeRoute}
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

	<!-- Pied de page réduit au bouton « Infos et confidentialité » : accueil seulement -->
	{#if infoButtonShown}
		<footer class="flex justify-center bg-background py-2">
			<InfoPanel />
		</footer>
	{/if}
</div>
