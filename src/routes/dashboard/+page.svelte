<!--
	Dashboard Main Page Component
	==============================

	This is the ROLE-BASED ROUTING COMPONENT for the dashboard.
	It receives the user's profile (with role) and renders the appropriate
	dashboard view based on their role.

	ROLE-BASED DASHBOARD PATTERN:
	------------------------------
	This component acts as a "router" that selects which dashboard to show:

	┌─────────────────────────────────────────────┐
	│         User accesses /dashboard           │
	└─────────────────┬───────────────────────────┘
	                  │
	                  ▼
	┌─────────────────────────────────────────────┐
	│   +layout.server.ts (authenticates user,    │
	│        fetches profile with role)           │
	└─────────────────┬───────────────────────────┘
	                  │
	                  ▼
	┌─────────────────────────────────────────────┐
	│   +page.svelte (THIS FILE - checks role)    │
	└─────────────────┬───────────────────────────┘
	                  │
	        ┌─────────┼─────────┐
	        ▼         ▼         ▼
	    Student   Teacher    Admin
	   Dashboard Dashboard Dashboard

	THREE ROLE TYPES:
	-----------------
	1. STUDENT ROLE
	   - View their own progress and assignments
	   - See classes they're enrolled in
	   - Track mastery levels and points
	   → Renders: StudentDashboard.svelte

	2. TEACHER ROLE
	   - Manage classes and students
	   - Create and review assignments
	   - View student progress across classes
	   → Renders: TeacherDashboard.svelte

	3. ADMIN ROLE
	   - Full system access
	   - User management
	   - Platform settings and analytics
	   → Renders: AdminDashboard.svelte

	ERROR HANDLING:
	---------------
	If profile.role contains an unexpected value (not student/teacher/admin),
	we show an error message asking the user to contact an administrator.
	This should never happen in production if database constraints are correct.

	DATA FLOW:
	----------
	- data.profile comes from +page.server.ts
	- data.profile.role determines which component to render
	- We pass the entire {data} object to each dashboard component
	- Each dashboard can access data.profile for user info
-->

<script lang="ts">
	import type { PageData } from './$types';
	// Import all three role-specific dashboard components
	import StudentDashboard from './StudentDashboard.svelte';
	import TeacherDashboard from './TeacherDashboard.svelte';
	import AdminDashboard from './AdminDashboard.svelte';

	// Receive data from +page.server.ts
	// data.profile contains: { id, email, full_name, role, created_at, updated_at }
	let { data }: { data: PageData } = $props();
</script>

<!-- Set page title for browser tab -->
<svelte:head>
	<title>Dashboard - UbuMaths</title>
</svelte:head>

<!--
	ROLE-BASED RENDERING:
	This if/else block acts as a "switch" statement for roles.
	Only ONE of these components will render based on data.profile.role.
-->

<!-- STUDENT DASHBOARD -->
{#if data.profile.role === 'student'}
	<!-- Student sees: assignments, progress, classes, mastery level -->
	<StudentDashboard {data} />

<!-- TEACHER DASHBOARD -->
{:else if data.profile.role === 'teacher'}
	<!-- Teacher sees: their classes, students, assignments, quick actions -->
	<TeacherDashboard {data} />

<!-- ADMIN DASHBOARD -->
{:else if data.profile.role === 'admin'}
	<!-- Admin sees: system stats, user management, platform settings -->
	<AdminDashboard {data} />

<!-- ERROR STATE: Unknown role -->
{:else}
	<!-- This should never happen if database constraints are correct -->
	<!-- If it does, it indicates a data integrity issue -->
	<div class="bg-error-100-900 border border-error-200-800 rounded-lg p-6">
		<h2 class="text-lg font-semibold text-error-900-50">Unknown Role</h2>
		<p class="text-error-700-300 mt-2">
			Your account has an unrecognized role:
			<code class="font-mono bg-error-200-800 px-2 py-1 rounded">{data.profile.role}</code>
		</p>
		<p class="text-error-600-400 text-sm mt-2">Please contact an administrator.</p>
	</div>
{/if}
