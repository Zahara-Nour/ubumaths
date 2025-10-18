<!--
	Admin Dashboard Component
	=========================

	This component is rendered when a user with role='admin' accesses /dashboard.
	It provides system-wide oversight and management capabilities.

	ADMIN ROLE CAPABILITIES:
	------------------------
	Administrators have full platform access including:
	- User management (create, edit, delete users; assign roles)
	- View all classes, students, and teachers
	- Manage content (topics, subtopics, exercises)
	- Configure system-wide settings
	- Access platform analytics and reports
	- Monitor system health and activity
	- Override teacher/student permissions when needed

	RENDERED BY:
	------------
	+page.svelte when data.profile.role === 'admin'

	RECEIVED DATA:
	--------------
	- data.profile: User's profile with { id, email, full_name, role }
	- Future: Will receive system statistics and recent activity

	SECURITY CONSIDERATION:
	-----------------------
	Admin access should be carefully controlled. Consider implementing:
	- Two-factor authentication for admin accounts
	- Audit logging for all admin actions
	- IP restrictions for admin access (optional)
	- Regular review of admin account usage

	FUTURE ENHANCEMENTS:
	--------------------
	- Real-time system statistics dashboard
	- User management interface with search and filters
	- Bulk user import/export functionality
	- System configuration panel
	- Analytics and reporting tools
	- Audit log viewer
	- Content moderation tools
-->

<script lang="ts">
	import type { PageData } from './$types';
	// import { Button } from '$lib/components/ui/button'; // Unused - for future features

	// Receive data from parent (+page.svelte)
	// Contains profile with admin's information
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	let { data }: { data: PageData } = $props(); // For future dashboard features
</script>

<div class="space-y-6">
	<!-- SYSTEM STATS SECTION -->
	<!-- Platform-wide metrics with trend indicators -->
	<!-- TODO: Replace hardcoded values with real database queries -->
	<div class="grid grid-cols-1 gap-6 md:grid-cols-4">
		<!-- Stat 4: System Health Indicator -->
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">État du Système</h3>
			<!-- TODO: Check database connection, API status, etc. -->
			<p class="mt-2 text-3xl font-bold text-secondary">100%</p>
			<p class="mt-1 text-sm text-muted-foreground">Tous les systèmes opérationnels</p>
		</div>
	</div>
</div>
