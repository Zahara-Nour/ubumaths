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
	import { page } from '$app/stores';
	import {
		LayoutDashboard,
		GraduationCap,
		Users,
		ClipboardList,
		TrendingUp,
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
		Upload,
		Bug
	} from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import gidouille from '$lib/assets/images/gidouille.png';

	// PROPS RECEIVED FROM PARENT LAYOUT SERVER LOAD:
	// - data: Contains profile from +layout.server.ts
	// - children: The child route component to render (e.g., +page.svelte)
	let { data, children }: { data: LayoutData; children: any } = $props();

	// Navigation links based on role
	const getNavLinks = (role: string) => {
		const commonLinks = [
			{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }
		];

		if (role === 'student') {
			return [
				...commonLinks,
				{ href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList },
				{ href: '/dashboard/classes', label: 'My Classes', icon: GraduationCap },
				{ href: '/dashboard/progress', label: 'Progress', icon: TrendingUp }
			];
		} else if (role === 'teacher') {
			return [
				...commonLinks,
				{ href: '/dashboard/classes', label: 'My Classes', icon: GraduationCap },
				{ href: '/dashboard/students', label: 'Students', icon: Users },
				{ href: '/dashboard/assignments', label: 'Assignments', icon: ClipboardList },
				{ href: '/dashboard/teacher/rewards', label: 'Rewards', icon: Gift }
			];
		} else if (role === 'admin') {
			return [
				...commonLinks,
				{ href: '/dashboard/admin/schools', label: 'Schools', icon: School },
				{ href: '/dashboard/admin/users', label: 'Users', icon: Users },
				{ href: '/dashboard/admin/classes', label: 'Classes', icon: GraduationCap },
				{ href: '/dashboard/admin/debug/database', label: 'Debug', icon: Bug },
				{ href: '/dashboard/settings', label: 'Settings', icon: Settings }
			];
		}
		return commonLinks;
	};

	// Check if a link is active
	function isActive(href: string) {
		// For debug pages, match any /dashboard/admin/debug/* route
		if (href === '/dashboard/admin/debug/database') {
			return $page.url.pathname.startsWith('/dashboard/admin/debug');
		}
		return $page.url.pathname === href;
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

	// Get user avatar URL with fallback based on role and gender
	function getAvatarSrc(): string {
		if (data.profile.avatar_url) {
			return data.profile.avatar_url;
		}
		if (data.user?.user_metadata?.avatar_url) {
			return data.user.user_metadata.avatar_url;
		}
		if (data.profile) {
			return getAvatarFallback(data.profile.role, data.profile.gender);
		}
		return '';
	}
</script>

<svelte:head>
	<!-- Holographic Card CSS -->
	<link rel="stylesheet" href="/css/holo-cards/base.css" />
	<link rel="stylesheet" href="/css/holo-cards/cards.css" />
	<link rel="stylesheet" href="/css/holo-cards/regular-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/cosmos-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/rainbow-holo.css" />
	<link rel="stylesheet" href="/css/holo-cards/secret-rare.css" />
</svelte:head>

<!-- Main dashboard container -->
<div class="min-h-screen bg-background">
	<!-- DASHBOARD HEADER (shared across all dashboard pages) -->
	<header class="border-b shadow-sm {getRoleHeaderColor(data.profile.role)}">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<!-- Left side: Gidouille, Welcome message, and Avatar -->
				<div class="flex items-center gap-4">
					<!-- Gidouille - links to home -->
					<a href="/" class="hover:opacity-80 transition-opacity" aria-label="Back to home">
						<img src={gidouille} alt="Gidouille" class="h-16 w-16" />
					</a>

					<!-- Welcome message -->
					<div>
						<h1 class="text-2xl font-bold text-foreground tracking-tight">
							Welcome, {data.profile.firstname || data.profile.full_name || 'User'}!
						</h1>
						<!-- Display user's role (student/teacher/admin) -->
						<p class="text-sm text-muted-foreground mt-1">
							<span class="capitalize font-medium">{data.profile.role}</span> Dashboard
						</p>
					</div>

					<!-- User Avatar (larger) -->
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="cursor-pointer relative h-16 w-16 rounded-full hover:ring-2 hover:ring-ring transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<Avatar.Root class="h-16 w-16">
								<Avatar.Image src={getAvatarSrc()} alt={data.profile.email || 'User'} />
								<Avatar.Fallback class="text-xl">
									{getAvatarInitials(data.profile?.firstname ?? null, data.profile?.lastname ?? null) || data.profile.email?.charAt(0).toUpperCase() || '?'}
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

				<!-- Right side: Controls -->
				<div class="flex items-center gap-2">
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
		</div>
	</header>

	<div class="flex h-[calc(100vh-73px)]">
		<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
		<div class="bg-card/50 dark:bg-card border-r border-border w-20 shadow-sm">
			<nav class="flex flex-col items-center gap-1 py-4">
				{#each getNavLinks(data.profile.role) as link}
					<a
						href={link.href}
						class="flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-all duration-300 w-16 group {isActive(link.href)
							? 'bg-primary/10 text-primary'
							: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
						title={link.label}
					>
						<svelte:component
							this={link.icon}
							class="w-6 h-6 group-hover:scale-110 transition-transform duration-300"
						/>
						<span class="text-xs text-center leading-tight font-medium">{link.label}</span>
					</a>
				{/each}
			</nav>
		</div>

		<!-- DASHBOARD CONTENT AREA -->
		<!-- This is where child routes are rendered -->
		<!-- For /dashboard, this renders +page.svelte which shows role-specific dashboards -->
		<!-- For /dashboard/classes, this would render classes/+page.svelte, etc. -->
		<main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
			<div class="max-w-7xl mx-auto">
				{@render children()}
			</div>
		</main>
	</div>
</div>
