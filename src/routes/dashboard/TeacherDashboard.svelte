<!--
	Teacher Dashboard Component
	============================

	This component is rendered when a user with role='teacher' accesses /dashboard.
	It displays teacher-specific information and management tools.

	TEACHER ROLE CAPABILITIES:
	--------------------------
	Teachers can:
	- Create and manage classes
	- Add students to their classes
	- Create custom exercises for their students
	- Create assignments from existing exercises
	- Review student submissions
	- Track student progress across all their classes
	- Generate class performance reports

	RENDERED BY:
	------------
	+page.svelte when data.profile.role === 'teacher'

	RECEIVED DATA:
	--------------
	- data.profile: User's profile with { id, email, full_name, role }
	- Future: Will receive teacher's classes, students, assignments, and submissions

	FUTURE ENHANCEMENTS:
	--------------------
	- Fetch teacher's classes from classes table (where teacher_id = profile.id)
	- Count total students across all classes (join class_members)
	- Show active assignments (where is_published = true)
	- List recent submissions needing review
	- Add quick action buttons that navigate to creation pages
	- Display class performance analytics and charts
-->

<script lang="ts">
	import type { PageData } from './$types';

	// Receive data from parent (+page.svelte)
	// Contains profile with teacher's information
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- WELCOME SECTION -->
	<!-- Personalized greeting for teachers -->
	<div class="bg-secondary-100-900 border border-secondary-200-800 rounded-lg p-6">
		<h2 class="text-xl font-semibold text-secondary-900-50">
			<!-- Use full_name if available, otherwise fallback to 'Teacher' -->
			Welcome, {data.profile.full_name || 'Teacher'}!
		</h2>
		<p class="text-secondary-700-300 mt-2">
			Manage your classes, create assignments, and track student progress.
		</p>
	</div>

	<!-- QUICK STATS SECTION -->
	<!-- Four-column grid showing key teacher metrics -->
	<!-- TODO: Replace hardcoded values with real data from database -->
	<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
		<!-- Stat 1: Total Classes -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Total Classes</h3>
			<!-- TODO: Count classes where teacher_id = data.profile.id -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">3</p>
		</div>

		<!-- Stat 2: Total Students (across all classes) -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Total Students</h3>
			<!-- TODO: Count distinct students in class_members for teacher's classes -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">87</p>
		</div>

		<!-- Stat 3: Active Assignments -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Active Assignments</h3>
			<!-- TODO: Count assignments where created_by = teacher and is_published = true -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">12</p>
		</div>

		<!-- Stat 4: Submissions Needing Review -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Pending Reviews</h3>
			<!-- TODO: Count unreviewed free-response submissions for teacher's assignments -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">24</p>
		</div>
	</div>

	<!-- QUICK ACTIONS SECTION -->
	<!-- Common teacher tasks as quick-access buttons -->
	<div class="bg-surface-100-900 rounded-lg shadow p-6">
		<h3 class="text-lg font-semibold text-surface-900-50 mb-4">Quick Actions</h3>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Action 1: Create new assignment -->
			<button
				class="px-4 py-3 bg-primary-600-400 text-white rounded-lg hover:bg-primary-700-300 font-medium"
			>
				Create Assignment
				<!-- TODO: Link to /dashboard/assignments/create -->
			</button>

			<!-- Action 2: Create new exercise -->
			<button
				class="px-4 py-3 bg-secondary-600-400 text-white rounded-lg hover:bg-secondary-700-300 font-medium"
			>
				Create Exercise
				<!-- TODO: Link to /dashboard/exercises/create -->
			</button>

			<!-- Action 3: Add new class -->
			<button
				class="px-4 py-3 bg-tertiary-600-400 text-white rounded-lg hover:bg-tertiary-700-300 font-medium"
			>
				Add New Class
				<!-- TODO: Link to /dashboard/classes/create -->
			</button>
		</div>
	</div>

	<!-- MY CLASSES SECTION -->
	<!-- Lists all classes owned by this teacher -->
	<div class="bg-surface-100-900 rounded-lg shadow">
		<div class="px-6 py-4 border-b border-surface-200-800">
			<h3 class="text-lg font-semibold text-surface-900-50">My Classes</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query classes table where teacher_id = data.profile.id -->
			<!-- Show: class name, student count, join code, active status -->
			<!-- Each class should link to /dashboard/classes/[id] for management -->
			<p class="text-surface-500-400 text-center py-8">No classes created yet</p>
		</div>
	</div>

	<!-- RECENT SUBMISSIONS SECTION -->
	<!-- Shows recent student submissions that may need review -->
	<div class="bg-surface-100-900 rounded-lg shadow">
		<div class="px-6 py-4 border-b border-surface-200-800">
			<h3 class="text-lg font-semibold text-surface-900-50">Recent Submissions</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query assignment_submissions for teacher's assignments -->
			<!-- Join with students and assignments to show: -->
			<!-- - Student name -->
			<!-- - Assignment name -->
			<!-- - Submission date -->
			<!-- - Score/completion percentage -->
			<!-- - Link to review submission -->
			<p class="text-surface-500-400 text-center py-8">No recent submissions to review</p>
		</div>
	</div>
</div>
