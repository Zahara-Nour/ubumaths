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

	// PROPS RECEIVED FROM PARENT LAYOUT SERVER LOAD:
	// - data: Contains profile from +layout.server.ts
	// - children: The child route component to render (e.g., +page.svelte)
	let { data, children }: { data: LayoutData; children: any } = $props();

	// Navigation links based on role
	const getNavLinks = (role: string) => {
		const commonLinks = [
			{ href: '/dashboard', label: 'Dashboard', icon: '📊' }
		];

		if (role === 'student') {
			return [
				...commonLinks,
				{ href: '/dashboard/assignments', label: 'Assignments', icon: '📝' },
				{ href: '/dashboard/classes', label: 'My Classes', icon: '🎓' },
				{ href: '/dashboard/progress', label: 'Progress', icon: '📈' }
			];
		} else if (role === 'teacher') {
			return [
				...commonLinks,
				{ href: '/dashboard/classes', label: 'My Classes', icon: '🎓' },
				{ href: '/dashboard/students', label: 'Students', icon: '👥' },
				{ href: '/dashboard/assignments', label: 'Assignments', icon: '📝' }
			];
		} else if (role === 'admin') {
			return [
				...commonLinks,
				{ href: '/dashboard/admin/schools', label: 'Schools', icon: '🏫' },
				{ href: '/dashboard/admin/users', label: 'Users', icon: '👥' },
				{ href: '/dashboard/classes', label: 'Classes', icon: '🎓' },
				{ href: '/dashboard/settings', label: 'Settings', icon: '⚙️' }
			];
		}
		return commonLinks;
	};

	// Check if a link is active
	function isActive(href: string) {
		return $page.url.pathname === href;
	}
</script>

<!-- Main dashboard container -->
<div class="min-h-screen bg-background">
	<!-- DASHBOARD HEADER (shared across all dashboard pages) -->
	<header class="bg-background border-b border-border shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<!-- Left side: Dashboard title -->
				<div>
					<h1 class="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
					<!-- Display user's role (student/teacher/admin) -->
					<!-- This comes from data.profile.role fetched in +layout.server.ts -->
					<p class="text-sm text-muted-foreground mt-1">
						Role: <span class="capitalize font-medium text-primary">{data.profile.role}</span>
					</p>
				</div>

				<!-- Right side: User email and navigation -->
				<div class="flex items-center gap-4">
					<!-- Display user's email from profile -->
					<span class="text-sm text-foreground hidden sm:inline">{data.profile.email}</span>

					<!-- Navigation link back to home page -->
					<a
						href="/"
						class="text-sm text-primary hover:text-primary/90 font-medium transition-colors duration-300"
					>
						Back to Home
					</a>
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
						<span class="text-2xl group-hover:scale-110 transition-transform duration-300">{link.icon}</span>
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
