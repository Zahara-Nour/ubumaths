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
	import { browser } from '$app/env';
	import { redactAnalyticsEvent } from '#lib/utils/analytics-redact.ts';

	$effect(() => {
		if (!browser) return;
		Promise.all([import('@vercel/analytics'), import('@vercel/speed-insights/sveltekit')])
			.then(([{ inject }, { injectSpeedInsights }]) => {
				// Le jeton d'un lien personnel (carnet de liaison) ne part pas chez Vercel
				inject({ beforeSend: redactAnalyticsEvent });
				injectSpeedInsights({ beforeSend: redactAnalyticsEvent });
			})
			.catch((e) => {
				console.debug('[Analytics] Failed to initialize:', e);
			});
	});

	import favicon from '#lib/assets/images/favicon.png';
	import Header from '#lib/components/Header.svelte';
	import Sidebar from '#lib/components/Sidebar.svelte';
	// Chargés pour leur effet : à leur création, ces réglages s'appliquent à la page
	// (thème, taille du texte, lecture facilitée lus dans le navigateur), sur toutes les pages.
	// Déclarés dans `scripts/side-effect-modules.ts`, sinon le build les élague.
	import '#lib/stores/theme.svelte.ts';
	import '#lib/stores/fontSize.svelte.ts';
	import '#lib/stores/easyReading.svelte.ts';
	import { initializeTemplates } from '#lib/stores/vipCardTemplates.svelte.ts';
	import { page, updated } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { noteWebVitalsRoute } from '#lib/utils/errorMonitoring.ts';
	import { shouldReloadOnNavigate } from '#lib/utils/app-version.ts';
	import { showsInfoButton } from '#lib/utils/footer.ts';
	import InfoPanel from '#lib/components/InfoPanel.svelte';
	import { navigating } from '$app/state';
	import type { LayoutData } from './$types';
	import AppToaster from '#lib/components/AppToaster.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import SkeletonPage from '#lib/components/skeleton/SkeletonPage.svelte';
	import SkeletonDashboard from '#lib/components/skeleton/SkeletonDashboard.svelte';
	import SkeletonList from '#lib/components/skeleton/SkeletonList.svelte';
	import SkeletonForm from '#lib/components/skeleton/SkeletonForm.svelte';
	import { getSkeletonType } from '#lib/utils/skeleton-detector.ts';
	import ModalStackRenderer from '#lib/components/modals/ModalStackRenderer.svelte';
	import MathKeyboardClose from '#lib/components/MathKeyboardClose.svelte';
	import { provideReaderGrade } from '#lib/dictionary/reader-grade.ts';
	import type { Component } from 'svelte';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	// Niveau de l'élève connecté : lu par les mots cliquables des questions
	provideReaderGrade(() => data.profile?.grade);

	// Onglet resté ouvert pendant un déploiement : sur un lien ou Précédent / Suivant, la page
	// suivante se charge en entier avec le nouveau code (jamais sur un `goto` : en pleine activité)
	// Lien : `cancel()` arrête la navigation de Kit (sinon l'ancien code charge la page en parallèle).
	// Précédent / Suivant : surtout pas de `cancel()` (Kit annulerait le déplacement dans
	// l'historique) ; l'adresse a déjà changé, on recharge.
	beforeNavigate(({ willUnload, type, to, cancel }) => {
		if (!to || !shouldReloadOnNavigate({ updated: updated.current, willUnload, type, to })) return;
		if (type === 'popstate') {
			location.reload();
			return;
		}
		cancel();
		location.href = to.url.href;
	});

	// Mesures de performance : la page affichée, par son identifiant de route (jamais son
	// adresse réelle), à l'arrivée et à chaque navigation interne
	afterNavigate(({ to }) => {
		noteWebVitalsRoute(to?.route.id ?? null);
	});

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

	// Palotin de l'élève connecté (maison, écusson, passages : chantier `palotins`).
	// Chargé à la demande : ni le visiteur ni le professeur ne téléchargent son code,
	// et le module d'entrée reste léger (Safari TDZ, cf. +layout.ts).
	let PalotinPresence = $state<Component | null>(null);
	const isStudent = $derived(data.profile?.role === 'student');
	$effect(() => {
		if (!browser || !isStudent || PalotinPresence) return;
		import('#lib/components/buddy/PalotinPresence.svelte')
			.then((module) => (PalotinPresence = module.default))
			.catch((e) => console.debug('[Palotin] Chargement impossible :', e));
	});

	// Bouton « signaler » : serveur de dev seulement. `import.meta.env.DEV` est remplacé par
	// `false` au build, qui n'embarque donc ni le bouton ni l'adresse de sa route
	// (garde : étape « Bouton signaler absent du build » de la CI).
	let SignalerButton = $state<Component<{
		account: { email: string; role: string } | null;
	}> | null>(null);
	const feedbackAccount = $derived(
		data.user?.email && data.profile?.role
			? { email: data.user.email, role: data.profile.role }
			: null
	);
	$effect(() => {
		if (!browser || SignalerButton) return;
		if (import.meta.env.DEV) {
			import('#lib/components/dev/SignalerButton.svelte')
				.then((module) => (SignalerButton = module.default))
				.catch((e) => console.debug('[Signaler] Chargement impossible :', e));
		}
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

<!-- Lien d'évitement (WCAG 2.4.1, D18) : premier élément focusable, hors de l'écran sauf au focus.
     Caché par translation : choisi quand app.css redéfinissait `.sr-only` hors couche, ce qui
     annulait `focus:not-sr-only` (doublon retiré depuis, écart V29).
     L'ancre `contenu-principal` est portée par le <main> ci-dessous, ou, sur le tableau de bord,
     par le <main> de dashboard/+layout.svelte (qui saute aussi son en-tête et sa barre latérale). -->
<a
	href="#contenu-principal"
	class="fixed top-2 left-2 z-[300] -translate-y-[200%] rounded-md bg-background px-4 py-2 font-medium text-foreground shadow-lg ring-2 ring-ring transition-transform focus:translate-y-0"
	>Aller au contenu</a
>

<!-- Mode Watcher for automatic dark/light mode syncing -->
<!-- track={true} syncs with system preferences -->
<ModeWatcher track={true} defaultMode="system" />

<!-- Loading bar that appears during navigation -->
{#if navigating.to}
	<div class="fixed top-0 right-0 left-0 z-[200] h-1 animate-pulse bg-primary shadow-lg"></div>
{/if}

<!-- Toast notifications -->
<AppToaster />

<!-- Modal Stack Renderer - renders modal stack from modalStack store -->
<ModalStackRenderer />

<!-- « Fermer le clavier » au-dessus du clavier virtuel MathLive, tant qu'il est ouvert -->
<MathKeyboardClose />

<!-- Palotin de l'élève : il décide lui-même des pages où il apparaît -->
{#if PalotinPresence && isStudent}
	<PalotinPresence />
{/if}

<!-- Bouton « signaler » : serveur de dev seulement -->
{#if SignalerButton}
	<SignalerButton account={feedbackAccount} />
{/if}

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
			id={isDashboardRoute ? undefined : 'contenu-principal'}
			tabindex="-1"
			class="relative flex-1 focus:outline-none"
			class:overflow-y-auto={!isWhiteboardRoute && !isDashboardRoute}
			class:overflow-hidden={isWhiteboardRoute || isDashboardRoute}
		>
			<!-- Always render children so page can load -->
			<div
				class:opacity-0={navigating.to && !isDashboardRoute}
				class:h-full={isWhiteboardRoute || isHomeRoute}
				class="transition-opacity duration-200"
			>
				{@render children?.()}
			</div>

			<!-- Overlay skeleton during navigation (only for non-dashboard routes) -->
			{#if navigating.to && !isDashboardRoute}
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

	<!-- Pied de page réduit au bouton « Infos et confidentialité » : accueil seulement, dans le
	     coin inférieur droit (centré, il collait à la dépêche du Shtam) -->
	{#if infoButtonShown}
		<footer class="flex justify-end bg-background px-2 py-2">
			<InfoPanel />
		</footer>
	{/if}
</div>
