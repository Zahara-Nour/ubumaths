<!--
	Dashboard Shared Layout Component
	===================================

	This component provides the SHARED LAYOUT for all dashboard routes.
	It wraps all /dashboard/* pages with consistent header and container.

	ROLE-BASED DASHBOARD INTEGRATION:
	----------------------------------
	- Receives `data.profile` from +layout.server.ts (contains user role)
	- Displays user's role and email in the header
	- All role-specific dashboards (Student/Teacher/Admin) are rendered as children

	DATA FLOW:
	----------
	+layout.server.ts (fetches profile)
	        ↓
	+layout.svelte (this file - receives data.profile, renders header)
	        ↓
	{@render children()} renders child routes:
	        ↓
	+page.svelte (main dashboard - selects role-specific view)
	        ↓
	StudentDashboard.svelte | TeacherDashboard.svelte | AdminDashboard.svelte

	SHARED FEATURES:
	----------------
	- Consistent header across all dashboard pages
	- Shows current user's role (student/teacher/admin)
	- Shows user email
	- Back to Home navigation link
	- Responsive container for dashboard content
-->

<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { navigating } from '$app/stores';
	import { Sun, Moon, Minus, Plus, Maximize, Minimize, Menu } from 'lucide-svelte';
	import { getNavLinks, getZoneTitle } from '$lib/config/dashboard-nav';
	import { Button } from '$lib/components/ui/button';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import gidouille from '$lib/assets/images/gidouille.png';
	import NotificationBanner from '$lib/components/notifications/NotificationBanner.svelte';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
	import SkeletonPage from '$lib/components/skeleton/SkeletonPage.svelte';
	import SkeletonDashboard from '$lib/components/skeleton/SkeletonDashboard.svelte';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import SkeletonForm from '$lib/components/skeleton/SkeletonForm.svelte';
	import { getSkeletonType } from '$lib/utils/skeleton-detector';
	import TestModeToggle from '$lib/components/teacher/TestModeToggle.svelte';
	import MobileNavDrawer, { type NavItem } from '$lib/components/navigation/MobileNavDrawer.svelte';
	import BugReportFAB from '$lib/components/bug-reports/BugReportFAB.svelte';
	import BugReportDialog from '$lib/components/bug-reports/BugReportDialog.svelte';
	import FreezeReportPrompt from '$lib/components/bug-reports/FreezeReportPrompt.svelte';
	import {
		setFreezePromptCallback,
		setAutoReportCallback,
		getFreezeDetectionContext
	} from '$lib/utils/freezeDetection';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { bugReportsConfigStore } from '$lib/stores/bugReportsConfig.svelte';

	import type { Snippet } from 'svelte';

	// PROPS RECEIVED FROM PARENT LAYOUT SERVER LOAD:
	// - data: Contains profile from +layout.server.ts
	// - children: The child route component to render (e.g., +page.svelte)
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Determine which skeleton variant to show based on current route
	let skeletonType = $derived(getSkeletonType(page.url.pathname));

	// Full-width routes (no padding/max-width constraints)
	let isFullWidthRoute = $derived(page.url.pathname.includes('/marketplace/trade/'));

	// Mobile menu state
	let mobileMenuOpen = $state(false);

	// Bug report dialog state
	let bugReportDialogOpen = $state(false);

	// Freeze prompt state
	let freezePromptOpen = $state(false);
	let freezePromptDuration = $state(0);

	// Navigation links — extracted to $lib/config/dashboard-nav.ts for testability
	let allLinks = $derived(
		getNavLinks(data.profile.role, data.pendingVipRequestsCount, data.marketplaceEnabled)
	);
	let mainLinks = $derived(allLinks.filter((l) => !l.footer));
	let footerLinks = $derived(allLinks.filter((l) => l.footer));

	// Check if a link is active
	function isActive(href: string) {
		// For debug pages, match any /dashboard/admin/debug/* route
		if (href === '/dashboard/admin/debug/database') {
			return page.url.pathname.startsWith('/dashboard/admin/debug');
		}
		// For docs pages, match any /dashboard/admin/docs/* route
		if (href === '/dashboard/admin/docs') {
			return page.url.pathname.startsWith('/dashboard/admin/docs');
		}
		// For contenu pages (templates, exercices, enigmes, worksheets)
		if (href === '/dashboard/teacher/contenu') {
			return page.url.pathname.startsWith('/dashboard/teacher/contenu');
		}
		// For gamification pages (rewards, vip-cards, marketplace)
		if (href === '/dashboard/teacher/gamification') {
			return page.url.pathname.startsWith('/dashboard/teacher/gamification');
		}
		// For moderation pages, match any /dashboard/teacher/moderation/* route
		if (href === '/dashboard/teacher/moderation') {
			return page.url.pathname.startsWith('/dashboard/teacher/moderation');
		}
		// For "Mon travail", highlight on the inbox page itself AND on any
		// downstream page the inbox links to (worksheets is the only one whose
		// student-facing list lives under /dashboard/student/*).
		if (href === '/dashboard/student/work') {
			return (
				page.url.pathname.startsWith('/dashboard/student/work') ||
				page.url.pathname.startsWith('/dashboard/student/worksheets')
			);
		}
		// For bug reports page, match /dashboard/bug-reports
		if (href === '/dashboard/bug-reports') {
			return page.url.pathname.startsWith('/dashboard/bug-reports');
		}
		// For admin bug reports page
		if (href === '/dashboard/admin/bug-reports') {
			return page.url.pathname.startsWith('/dashboard/admin/bug-reports');
		}
		return page.url.pathname === href;
	}

	// Get role-specific background color
	function getRoleHeaderColor(role: string) {
		if (role === 'student') return 'bg-primary/10 border-primary/20';
		if (role === 'teacher') return 'bg-secondary/10 border-secondary/20';
		if (role === 'admin') return 'bg-destructive/10 border-destructive/20';
		return 'bg-background';
	}

	// Fullscreen state
	let isFullscreen = $state(false);

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen();
			isFullscreen = true;
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
				isFullscreen = false;
			}
		}
	}

	// Listen for fullscreen changes
	$effect(() => {
		const handleFullscreenChange = () => {
			isFullscreen = !!document.fullscreenElement;
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
		};
	});

	// Handle logout
	async function handleLogout() {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/logout';
		document.body.appendChild(form);
		form.submit();
	}

	// Fetch initial activity data when dashboard loads
	// This fetches both notifications AND messages counts in a single request
	// Only fetch if we have a valid profile (user is authenticated)
	let hasInitialized = $state(false);
	$effect(() => {
		// Guard: Only run once on initial mount with valid profile
		// This prevents 401 errors during hydration and stops repeated calls
		if (!data.profile?.id || hasInitialized) {
			return;
		}

		// Mark as initialized to prevent re-runs
		hasInitialized = true;

		// Fetch initial notifications details (full data for banner/dropdown)
		notificationStore.fetchUnread();

		// Fetch initial activity counts (notifications + messages)
		// No automatic polling - counters update on user actions only
		activityStore.refresh();

		// Load bug reports configuration
		bugReportsConfigStore.load();

		// Start real-time notifications
		if (data.supabase && data.user) {
			notificationsRealtimeManager.init(data.supabase, data.user.id);
			notificationsRealtimeManager.startListening();
		}
	});

	// Cleanup real-time subscriptions on unmount
	$effect(() => {
		return () => {
			notificationsRealtimeManager.stopListening();
		};
	});

	// Set up freeze detection callbacks
	// Callbacks check config flags before executing
	$effect(() => {
		// Callback for freeze prompt (> 15s)
		// Only shows prompt if freeze detection AND freeze prompt are enabled
		setFreezePromptCallback((duration) => {
			if (
				!bugReportsConfigStore.freezeDetectionEnabled ||
				!bugReportsConfigStore.freezePromptEnabled
			) {
				return;
			}
			freezePromptDuration = duration;
			freezePromptOpen = true;
		});

		// Callback for auto report (> 30s)
		// Only sends auto report if freeze detection AND auto report are enabled
		setAutoReportCallback(async (duration) => {
			if (
				!bugReportsConfigStore.freezeDetectionEnabled ||
				!bugReportsConfigStore.autoReportEnabled
			) {
				return;
			}
			try {
				const context = getFreezeDetectionContext();
				const response = await fetch('/api/bug-reports', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						category: 'bug',
						severity: 'critical',
						title: `Application bloquée pendant ${(duration / 1000).toFixed(1)} secondes`,
						description: `Rapport automatique : L'application a cessé de répondre pendant ${(duration / 1000).toFixed(1)} secondes.\n\nCe rapport a été généré automatiquement par le système de détection de freeze.`,
						pageUrl: typeof window !== 'undefined' ? window.location.href : '',
						userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
						viewportSize:
							typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
						sessionContext: {
							...context,
							capturedAt: new Date().toISOString(),
							freezeDuration: duration
						},
						autoGenerated: true
					})
				});

				if (response.ok) {
					toaster.info('Un rapport de freeze a été envoyé automatiquement');
				}
			} catch (err) {
				console.error('[Freeze Detection] Auto report failed:', err);
			}
		});
	});
</script>

<svelte:head>
	<!--
		Holographic Card CSS - Conditional Loading
		===========================================

		These stylesheets are only loaded for dashboard routes to improve
		performance on public pages (login, games, etc.)

		PERFORMANCE IMPACT:
		- 6 CSS files totaling ~25KB
		- Not needed on public routes
		- Browser caches after first dashboard visit

		CONDITIONAL LOADING:
		- Check typeof document !== 'undefined' ensures client-side only
		- Prevents SSR errors and unnecessary server-side processing
	-->
	{#if typeof document !== 'undefined'}
		<link rel="stylesheet" href="/css/holo-cards/base.css" />
		<link rel="stylesheet" href="/css/holo-cards/cards.css" />
		<link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
		<link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
		<link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
		<link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
	{/if}
</svelte:head>

<!-- Main dashboard container -->
<div class="min-h-screen bg-background">
	<!-- DASHBOARD HEADER (shared across all dashboard pages) -->
	<header class="border-b border-border shadow-sm {getRoleHeaderColor(data.profile.role)}">
		<div class="flex h-16 items-center justify-between gap-2 px-4 md:gap-4">
			<!-- Left side: Hamburger (mobile), Gidouille, Title -->
			<div class="flex items-center gap-2 md:gap-4">
				<!-- Hamburger menu - mobile only -->
				<Button
					variant="ghost"
					size="icon"
					class="md:hidden"
					onclick={() => (mobileMenuOpen = true)}
					aria-label="Ouvrir le menu"
				>
					<Menu class="h-6 w-6" />
				</Button>

				<!-- Gidouille - links to home -->
				<a
					href="/"
					data-sveltekit-preload-data="hover"
					class="transition-opacity hover:opacity-80"
					aria-label="Retour à l'accueil"
				>
					<img src={gidouille} alt="Gidouille" class="h-8 w-8" />
				</a>

				<!-- Zone title - hidden on very small screens -->
				<div class="hidden sm:block">
					<h1 class="text-2xl font-bold tracking-tight text-foreground">
						{getZoneTitle(data.profile.role)}
					</h1>
				</div>
			</div>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Test Mode Toggle (teachers only) - hidden on mobile -->
			{#if data.profile.role === 'teacher'}
				<div class="hidden md:block">
					<TestModeToggle currentUserIsTest={data.profile.is_test} />
				</div>
			{/if}

			<!-- Right side: Avatar links directly to /dashboard/profile (Mon profil).
				 Dropdown was removed in Phase 3; logout / GDPR / preferences now live
				 on the profile page and in the mobile hamburger drawer. -->
			<div class="border-l pl-2">
				<a
					href="/dashboard/profile"
					class="relative block h-10 w-10 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					aria-label="Mon profil"
				>
					<UserAvatar
						avatar_url={data.profile.avatar_url}
						role={data.profile.role}
						firstname={data.profile.firstname}
						lastname={data.profile.lastname}
						class="h-10 w-10"
					/>
				</a>
			</div>

			<!-- Desktop controls - hidden on mobile -->
			<div class="hidden items-center gap-2 border-l md:flex">
				<!-- Font size controls -->
				<div class="flex items-center gap-1">
					<Button
						onclick={() => fontSize.decrease()}
						disabled={!fontSize.canDecrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Réduire la taille du texte"
						title="Réduire la taille du texte"
					>
						<Minus class="h-5 w-5" />
					</Button>
					<span class="text-sm font-medium">A</span>
					<Button
						onclick={() => fontSize.increase()}
						disabled={!fontSize.canIncrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Augmenter la taille du texte"
						title="Augmenter la taille du texte"
					>
						<Plus class="h-5 w-5" />
					</Button>
				</div>

				<!-- Dark mode toggle -->
				<Button
					onclick={() => theme.toggle()}
					variant="ghost"
					size="icon-sm"
					aria-label="Basculer le mode sombre"
				>
					{#if theme.dark}
						<Sun class="h-6 w-6" />
					{:else}
						<Moon class="h-6 w-6" />
					{/if}
				</Button>

				<!-- Fullscreen toggle -->
				<Button
					onclick={toggleFullscreen}
					variant="ghost"
					size="icon-sm"
					aria-label="Basculer le plein écran"
					title="Basculer le plein écran"
				>
					{#if isFullscreen}
						<Minimize class="h-6 w-6" />
					{:else}
						<Maximize class="h-6 w-6" />
					{/if}
				</Button>
			</div>
		</div>
	</header>

	<div class="flex h-[calc(100vh-65px)] md:h-[calc(100vh-73px)]">
		<!-- RAIL SIDEBAR - Vertical icon navigation (hidden on mobile) -->
		<!-- overflow-y-auto allows scrolling when many nav items exceed viewport height -->
		<div
			class="hidden w-20 overflow-y-auto border-r border-border bg-card/50 shadow-sm md:block dark:bg-card"
		>
			{#snippet linkBody(link: (typeof allLinks)[number])}
				<link.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
				<span class="text-center text-xs leading-tight font-medium">{link.label}</span>
				{#if link.badge && link.badge > 0}
					<span
						class="absolute top-1 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background dark:bg-amber-600"
						aria-label="{link.badge} demandes en attente"
					>
						{link.badge}
					</span>
				{/if}
			{/snippet}

			<nav class="flex flex-col items-center gap-1 py-4" aria-label="Navigation principale">
				{#each mainLinks as link (link.href)}
					<a
						href={link.href}
						class="group relative flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
							link.href
						)
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
						title={link.label}
					>
						{@render linkBody(link)}
					</a>
				{/each}

				<!-- Notification Dropdown -->
				<NotificationDropdown />

				{#if footerLinks.length > 0}
					<hr class="my-2 w-10 border-t border-border" />
					{#each footerLinks as link (link.href)}
						{#if link.logout}
							<button
								type="button"
								onclick={handleLogout}
								class="group relative flex w-16 cursor-pointer flex-col items-center gap-1 rounded-lg px-2 py-3 text-muted-foreground transition-all duration-300 hover:bg-muted/60 hover:text-foreground"
								title={link.label}
							>
								{@render linkBody(link)}
							</button>
						{:else}
							<a
								href={link.href}
								class="group relative flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
									link.href
								)
									? 'bg-primary/10 text-primary'
									: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
								title={link.label}
							>
								{@render linkBody(link)}
							</a>
						{/if}
					{/each}
				{/if}
			</nav>
		</div>

		<!-- DASHBOARD CONTENT AREA -->
		<!-- This is where child routes are rendered -->
		<!-- For /dashboard, this renders +page.svelte which shows role-specific dashboards -->
		<!-- For /dashboard/classes, this would render classes/+page.svelte, etc. -->
		<!-- NOTE: min-h-0 is required for overflow-y-auto to work in a flex container -->
		<main class="dashboard-content min-h-0 flex-1 overflow-y-auto bg-background">
			<!-- Notification Banner (sticky at top) -->
			{#if !isFullWidthRoute}
				<NotificationBanner />
			{/if}

			<!-- Main content with padding (disabled for full-width routes like trade board) -->
			<div class="relative {isFullWidthRoute ? 'p-2' : 'p-4 sm:p-6 lg:p-8'}">
				<div class={isFullWidthRoute ? 'w-full' : 'mx-auto max-w-4xl'}>
					<!-- Always render children so page can load -->
					<div class:opacity-0={$navigating} class="transition-opacity duration-200">
						{@render children()}
					</div>

					<!-- Overlay skeleton during navigation -->
					{#if $navigating}
						<div class="absolute inset-0 bg-background p-4 sm:p-6 lg:p-8">
							<div class="mx-auto max-w-7xl">
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
						</div>
					{/if}
				</div>
			</div>
		</main>
	</div>

	<!-- Mobile Navigation Drawer -->
	<MobileNavDrawer
		bind:open={mobileMenuOpen}
		items={allLinks as NavItem[]}
		{isActive}
		onLogout={handleLogout}
		showSettings
	/>
</div>

<!-- Bug Report FAB (visible on all dashboard pages, if enabled) -->
{#if bugReportsConfigStore.fabEnabled}
	<BugReportFAB onclick={() => (bugReportDialogOpen = true)} />
{/if}

<!-- Bug Report Dialog -->
<BugReportDialog
	bind:open={bugReportDialogOpen}
	onOpenChange={(open) => (bugReportDialogOpen = open)}
/>

<!-- Freeze Report Prompt -->
<FreezeReportPrompt
	bind:open={freezePromptOpen}
	freezeDuration={freezePromptDuration}
	onOpenChange={(open) => (freezePromptOpen = open)}
/>
