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
				{ href: '/dashboard/users', label: 'Users', icon: '👥' },
				{ href: '/dashboard/classes', label: 'Classes', icon: '🎓' },
				{ href: '/dashboard/settings', label: 'Settings', icon: '⚙️' }
			];
		}
		return commonLinks;
	};
</script>

<!-- Main dashboard container with Skeleton theming -->
<div class="min-h-screen bg-surface-50-950">
	<!-- DASHBOARD HEADER (shared across all dashboard pages) -->
	<header class="bg-surface-100-900 shadow-sm border-b border-surface-200-800">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
			<div class="flex items-center justify-between">
				<!-- Left side: Dashboard title -->
				<div>
					<h1 class="text-2xl font-bold text-surface-900-50">Dashboard</h1>
					<!-- Display user's role (student/teacher/admin) -->
					<!-- This comes from data.profile.role fetched in +layout.server.ts -->
					<p class="text-sm text-surface-500-400 mt-1">
						Role: <span class="capitalize font-medium text-surface-700-300">{data.profile.role}</span>
					</p>
				</div>

				<!-- Right side: User email and navigation -->
				<div class="flex items-center gap-4">
					<!-- Display user's email from profile -->
					<span class="text-sm text-surface-700-300 hidden sm:inline">{data.profile.email}</span>

					<!-- Navigation link back to home page -->
					<a
						href="/"
						class="text-sm text-primary-600-400 hover:text-primary-700-300 font-medium"
					>
						Back to Home
					</a>
				</div>
			</div>
		</div>
	</header>

	<div class="flex">
		<!-- SIDEBAR - Hidden on mobile (lg:block), always visible on desktop -->
		<aside class="hidden lg:block w-64 bg-surface-100-900 border-r border-surface-200-800 min-h-[calc(100vh-73px)]">
			<nav class="p-4 space-y-2">
				{#each getNavLinks(data.profile.role) as link}
					<a
						href={link.href}
						class="flex items-center gap-3 px-4 py-3 rounded-lg text-surface-700-300 hover:bg-surface-200-800 hover:text-surface-900-50 transition-colors"
					>
						<span class="text-xl">{link.icon}</span>
						<span class="font-medium">{link.label}</span>
					</a>
				{/each}
			</nav>
		</aside>

		<!-- DASHBOARD CONTENT AREA -->
		<!-- This is where child routes are rendered -->
		<!-- For /dashboard, this renders +page.svelte which shows role-specific dashboards -->
		<!-- For /dashboard/classes, this would render classes/+page.svelte, etc. -->
		<main class="flex-1 p-4 sm:p-6 lg:p-8">
			<div class="max-w-7xl mx-auto">
				{@render children()}
			</div>
		</main>
	</div>
</div>
