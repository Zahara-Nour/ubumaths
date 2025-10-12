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
	import { Button } from '$lib/components/ui/button';

	// Receive data from parent (+page.svelte)
	// Contains profile with admin's information
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- SYSTEM STATS SECTION -->
	<!-- Platform-wide metrics with trend indicators -->
	<!-- TODO: Replace hardcoded values with real database queries -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<!-- Stat 1: Total Users (all roles) -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Utilisateurs Totaux</h3>
			<!-- TODO: Count all records in profiles table -->
			<p class="text-3xl font-bold text-foreground mt-2">342</p>
			<!-- TODO: Compare with count from 7 days ago to show trend -->
			<p class="text-sm text-muted-foreground mt-1">↑ 12 cette semaine</p>
		</div>

		<!-- Stat 2: Active Classes (across all teachers) -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Classes Actives</h3>
			<!-- TODO: Count classes where is_active = true -->
			<p class="text-3xl font-bold text-foreground mt-2">48</p>
			<p class="text-sm text-muted-foreground mt-1">↑ 3 cette semaine</p>
		</div>

		<!-- Stat 3: Total Exercises (platform-wide) -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Exercices Totaux</h3>
			<!-- TODO: Count all records in exercises table -->
			<p class="text-3xl font-bold text-foreground mt-2">1,256</p>
			<p class="text-sm text-muted-foreground mt-1">↑ 45 cette semaine</p>
		</div>

		<!-- Stat 4: System Health Indicator -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">État du Système</h3>
			<!-- TODO: Check database connection, API status, etc. -->
			<p class="text-3xl font-bold text-secondary mt-2">100%</p>
			<p class="text-sm text-muted-foreground mt-1">Tous les systèmes opérationnels</p>
		</div>
	</div>

	<!-- USER MANAGEMENT SECTION -->
	<!-- Overview of users by role with quick add action -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border flex items-center justify-between">
			<h3 class="text-lg font-semibold text-foreground">Gestion des Utilisateurs</h3>
			<!-- Quick action to add new users -->
			<Button>
				Ajouter un Utilisateur
				<!-- TODO: Link to /dashboard/admin/users/create -->
			</Button>
		</div>
		<div class="p-6">
			<!-- User breakdown by role -->
			<!-- TODO: Query profiles table grouped by role -->
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Student count -->
				<div class="border border-border rounded-lg p-4">
					<div class="text-2xl font-bold text-primary">245</div>
					<div class="text-sm text-muted-foreground mt-1">Élèves</div>
					<!-- TODO: SELECT COUNT(*) FROM profiles WHERE role = 'student' -->
				</div>

				<!-- Teacher count -->
				<div class="border border-border rounded-lg p-4">
					<div class="text-2xl font-bold text-secondary">92</div>
					<div class="text-sm text-muted-foreground mt-1">Enseignants</div>
					<!-- TODO: SELECT COUNT(*) FROM profiles WHERE role = 'teacher' -->
				</div>

				<!-- Admin count -->
				<div class="border border-border rounded-lg p-4">
					<div class="text-2xl font-bold text-destructive">5</div>
					<div class="text-sm text-muted-foreground mt-1">Administrateurs</div>
					<!-- TODO: SELECT COUNT(*) FROM profiles WHERE role = 'admin' -->
				</div>
			</div>
		</div>
	</div>

	<!-- SYSTEM SETTINGS SECTION -->
	<!-- Navigation to various admin configuration pages -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Paramètres du Système</h3>
		</div>
		<div class="p-6">
			<div class="space-y-4">
				<!-- Setting 1: Content Management -->
				<button class="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center justify-between">
					<div>
						<div class="font-medium text-foreground">Gestion du Contenu</div>
						<div class="text-sm text-muted-foreground">Gérer les sujets, sous-sujets et exercices</div>
						<!-- TODO: Link to /dashboard/admin/content -->
					</div>
					<span class="text-muted-foreground">→</span>
				</button>

				<!-- Setting 2: Platform Configuration -->
				<button class="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center justify-between">
					<div>
						<div class="font-medium text-foreground">Paramètres de la Plateforme</div>
						<div class="text-sm text-muted-foreground">Configurer les paramètres du système</div>
						<!-- TODO: Link to /dashboard/admin/settings -->
					</div>
					<span class="text-muted-foreground">→</span>
				</button>

				<!-- Setting 3: Analytics & Reports -->
				<button class="w-full text-left px-4 py-3 border border-border rounded-lg hover:bg-accent hover:text-accent-foreground flex items-center justify-between">
					<div>
						<div class="font-medium text-foreground">Rapports & Analyses</div>
						<div class="text-sm text-muted-foreground">Voir l'utilisation et les performances de la plateforme</div>
						<!-- TODO: Link to /dashboard/admin/analytics -->
					</div>
					<span class="text-muted-foreground">→</span>
				</button>
			</div>
		</div>
	</div>

	<!-- RECENT SYSTEM ACTIVITY SECTION -->
	<!-- Audit log of recent admin and system actions -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Activité Récente du Système</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Implement audit logging system -->
			<!-- Show: timestamp, user, action, resource, result -->
			<!-- Examples:
			     - User created: teacher@school.com by admin@school.com
			     - Class deleted: "Math 101" by teacher@school.com
			     - Exercise published: "Quadratic Equations" by teacher@school.com
			     - Settings changed: "Max students per class" by admin@school.com
			-->
			<p class="text-muted-foreground text-center py-8">Aucune activité récente à afficher</p>
		</div>
	</div>
</div>
