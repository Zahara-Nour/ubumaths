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
	import {
		LayoutDashboard,
		GraduationCap,
		Users,
		ClipboardList,
		ShoppingBag,
		// TrendingUp, // Unused - for future features
		School,
		Settings,
		Gift,
		LogOut,
		Sun,
		Moon,
		Minus,
		Plus,
		Maximize,
		Minimize,
		// Upload, // Unused - for future features
		Sparkles,
		Bug,
		MessageCircle,
		BookOpen,
		Lightbulb,
		FileText,
		AlertTriangle
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
	import { activityStore } from '$lib/stores/activity.svelte';
	import { getAvatarInitials, getAvatarUrl } from '$lib/utils/avatar';
	import gidouille from '$lib/assets/images/gidouille.png';
	import NotificationBanner from '$lib/components/notifications/NotificationBanner.svelte';
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
	import SkeletonPage from '$lib/components/skeleton/SkeletonPage.svelte';
	import SkeletonDashboard from '$lib/components/skeleton/SkeletonDashboard.svelte';
	import SkeletonList from '$lib/components/skeleton/SkeletonList.svelte';
	import SkeletonForm from '$lib/components/skeleton/SkeletonForm.svelte';
	import { getSkeletonType } from '$lib/utils/skeleton-detector';
	import TestModeToggle from '$lib/components/teacher/TestModeToggle.svelte';

	import type { ComponentType, Snippet } from 'svelte';

	// PROPS RECEIVED FROM PARENT LAYOUT SERVER LOAD:
	// - data: Contains profile from +layout.server.ts
	// - children: The child route component to render (e.g., +page.svelte)
	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	// Determine which skeleton variant to show based on current route
	let skeletonType = $derived(getSkeletonType(page.url.pathname));

	// Navigation links based on role
	const getNavLinks = (
		role: string,
		pendingVipRequestsCount: number = 0
	): Array<{
		href: string;
		label: string;
		icon: ComponentType;
		badge?: number;
	}> => {
		const commonLinks: Array<{
			href: string;
			label: string;
			icon: ComponentType;
			badge?: number;
		}> = [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];

		if (role === 'student') {
			return [
				...commonLinks,
				{ href: '/dashboard/friends', label: 'Amis', icon: Users },
				{ href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
				{ href: '/dashboard/classes', label: 'My Classes', icon: GraduationCap },
				{ href: '/dashboard/student/assessments', label: 'Évaluations', icon: ClipboardList },
				{ href: '/dashboard/student/devoirs', label: 'Devoirs', icon: BookOpen },
				{ href: '/dashboard/student/materials', label: 'Matériel', icon: FileText },
				{ href: '/dashboard/student/vip-cards/collection', label: 'Collection VIP', icon: Sparkles }
			];
		} else if (role === 'teacher') {
			return [
				...commonLinks,
				{ href: '/dashboard/friends', label: 'Amis', icon: Users },
				{ href: '/dashboard/chat', label: 'Chat', icon: MessageCircle },
				{ href: '/dashboard/teacher/classes', label: 'Classes', icon: GraduationCap },
				{ href: '/dashboard/students', label: 'Students', icon: Users },
				{ href: '/dashboard/teacher/riddles', label: 'Énigmes', icon: Lightbulb },
				{ href: '/dashboard/teacher/exercises', label: 'Exercices', icon: BookOpen },
				{
					href: '/dashboard/teacher/rewards',
					label: 'Rewards',
					icon: Gift,
					badge: pendingVipRequestsCount > 0 ? pendingVipRequestsCount : undefined
				},
				{ href: '/dashboard/teacher/vip-cards', label: 'VIP Cards', icon: Sparkles },
				{ href: '/dashboard/teacher/marketplace', label: 'Marché', icon: ShoppingBag },
				{ href: '/dashboard/teacher/google', label: 'Google Classroom', icon: School },
				{ href: '/dashboard/teacher/warnings', label: 'Avertissements', icon: AlertTriangle }
			];
		} else if (role === 'admin') {
			return [
				...commonLinks,
				{ href: '/dashboard/admin/schools', label: 'Schools', icon: School },
				{ href: '/dashboard/admin/users', label: 'Users', icon: Users },
				{ href: '/dashboard/admin/classes', label: 'Classes', icon: GraduationCap },
				{ href: '/dashboard/admin/questions', label: 'Questions', icon: BookOpen },
				{ href: '/dashboard/admin/vip-cards', label: 'VIP Cards', icon: Sparkles },
				{ href: '/dashboard/admin/docs', label: 'Documentation', icon: FileText },
				{ href: '/dashboard/admin/debug/database', label: 'Debug', icon: Bug },
				{ href: '/dashboard/admin/settings', label: 'Settings', icon: Settings }
			];
		}
		return commonLinks;
	};

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
		<div class="flex h-16 items-center justify-between gap-4 px-4">
			<!-- Left side: Gidouille, Welcome message, and Avatar -->
			<div class="flex items-center gap-4">
				<!-- Gidouille - links to home -->
				<a
					href="/"
					data-sveltekit-preload-data="hover"
					class="transition-opacity hover:opacity-80"
					aria-label="Back to home"
				>
					<img src={gidouille} alt="Gidouille" class="h-8 w-8" />
				</a>

				<!-- Welcome message -->
				<div>
					<h1 class="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
				</div>
			</div>

			<!-- Spacer -->
			<div class="flex-1"></div>

			<!-- Test Mode Toggle (teachers only) -->
			{#if data.profile.role === 'teacher'}
				<TestModeToggle currentUserIsTest={data.profile.is_test} />
			{/if}

			<!-- Right side: Controls -->
			<div class="border-l pl-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="relative h-10 w-10 cursor-pointer rounded-full transition-all hover:ring-2 hover:ring-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						<Avatar.Root class="h-10 w-10">
							<Avatar.Image
								src={getAvatarUrl(
									{
										avatar_url: data.profile.avatar_url,
										role: data.profile.role,
										gender: data.profile.gender
									},
									data.user
								)}
								alt={data.profile.email || 'User'}
							/>
							<Avatar.Fallback class="text-xl">
								{getAvatarInitials(
									data.profile?.firstname ?? null,
									data.profile?.lastname ?? null
								) ||
									data.profile.email?.charAt(0).toUpperCase() ||
									'?'}
							</Avatar.Fallback>
						</Avatar.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-48">
						<DropdownMenu.Label>{data.profile.email}</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item onclick={handleLogout}>
							<LogOut class="mr-2 h-4 w-4" />
							Logout
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
			<div class="flex items-center gap-2 border-l">
				<!-- Font size controls -->
				<div class="flex items-center gap-1">
					<Button
						onclick={() => fontSize.decrease()}
						disabled={!fontSize.canDecrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Decrease font size"
						title="Decrease font size"
					>
						<Minus class="h-5 w-5" />
					</Button>
					<span class="text-sm font-medium">A</span>
					<Button
						onclick={() => fontSize.increase()}
						disabled={!fontSize.canIncrease}
						variant="ghost"
						size="icon-sm"
						aria-label="Increase font size"
						title="Increase font size"
					>
						<Plus class="h-5 w-5" />
					</Button>
				</div>

				<!-- Dark mode toggle -->
				<Button
					onclick={() => theme.toggle()}
					variant="ghost"
					size="icon-sm"
					aria-label="Toggle dark mode"
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
					aria-label="Toggle fullscreen"
					title="Toggle fullscreen"
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

	<div class="flex h-[calc(100vh-73px)]">
		<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
		<div class="w-20 border-r border-border bg-card/50 shadow-sm dark:bg-card">
			<nav class="flex flex-col items-center gap-1 py-4">
				{#each getNavLinks(data.profile.role, data.pendingVipRequestsCount) as link (link.href)}
					<a
						href={link.href}
						class="group relative flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
							link.href
						)
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
						title={link.label}
					>
						<!-- Svelte 5: Components are dynamic by default -->
						<link.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
						<span class="text-center text-xs leading-tight font-medium">{link.label}</span>

						<!-- Badge notification -->
						{#if link.badge && link.badge > 0}
							<span
								class="absolute top-1 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white ring-2 ring-background dark:bg-amber-600"
								aria-label="{link.badge} demandes en attente"
							>
								{link.badge}
							</span>
						{/if}
					</a>
				{/each}

				<!-- Notification Dropdown -->
				<NotificationDropdown />
			</nav>
		</div>

		<!-- DASHBOARD CONTENT AREA -->
		<!-- This is where child routes are rendered -->
		<!-- For /dashboard, this renders +page.svelte which shows role-specific dashboards -->
		<!-- For /dashboard/classes, this would render classes/+page.svelte, etc. -->
		<main class="dashboard-content flex-1 overflow-y-auto bg-background">
			<!-- Notification Banner (sticky at top) -->
			<NotificationBanner />

			<!-- Main content with padding -->
			<div class="relative p-4 sm:p-6 lg:p-8">
				<div class="mx-auto max-w-7xl">
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
</div>
