<!--
	Student Dashboard Component
	============================

	This component is rendered when a user with role='student' accesses /dashboard.
	It displays student-specific information and features.

	STUDENT ROLE CAPABILITIES:
	--------------------------
	Students can:
	- View their pending assignments
	- Track their total points earned
	- Monitor their mastery level across topics
	- See recent activity (exercise attempts, submissions)
	- View classes they're enrolled in

	RENDERED BY:
	------------
	+page.svelte when data.profile.role === 'student'

	RECEIVED DATA:
	--------------
	- data.profile: User's profile with { id, email, full_name, role }
	- Future: Will receive real assignment, progress, and class data

	FUTURE ENHANCEMENTS:
	--------------------
	- Fetch real assignment data from database
	- Display actual student progress from student_progress table
	- Show real class enrollment from class_members table
	- Add interactive charts for progress visualization
	- Link to individual assignments and exercises
-->

<script lang="ts">
	import type { PageData } from './$types';

	// Receive data from parent (+page.svelte)
	// Contains profile with student's information
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- WELCOME SECTION -->
	<!-- Personalized greeting using full_name from profile -->
	<div class="bg-primary-100-900 border border-primary-200-800 rounded-lg p-6">
		<h2 class="text-xl font-semibold text-primary-900-50">
			<!-- Use full_name if available, otherwise fallback to 'Student' -->
			Welcome, {data.profile.full_name || 'Student'}!
		</h2>
		<p class="text-primary-700-300 mt-2">
			Track your progress, complete assignments, and improve your math skills.
		</p>
	</div>

	<!-- QUICK STATS SECTION -->
	<!-- Three-column grid showing key student metrics -->
	<!-- TODO: Replace hardcoded values with real data from database -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Stat 1: Pending Assignments -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Assignments Due</h3>
			<!-- TODO: Query assignment_submissions table for incomplete assignments -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">5</p>
		</div>

		<!-- Stat 2: Total Points Earned -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Total Points</h3>
			<!-- TODO: Sum points from student_progress table -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">1,250</p>
		</div>

		<!-- Stat 3: Overall Mastery Level -->
		<div class="bg-surface-100-900 rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-surface-500-400 uppercase">Mastery Level</h3>
			<!-- TODO: Calculate average mastery_level from student_progress -->
			<p class="text-3xl font-bold text-surface-900-50 mt-2">78%</p>
		</div>
	</div>

	<!-- RECENT ACTIVITY SECTION -->
	<!-- Shows recent exercise attempts and assignment submissions -->
	<div class="bg-surface-100-900 rounded-lg shadow">
		<div class="px-6 py-4 border-b border-surface-200-800">
			<h3 class="text-lg font-semibold text-surface-900-50">Recent Activity</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query student_attempts table for recent activity -->
			<!-- Show: exercise name, result (correct/incorrect), points, timestamp -->
			<p class="text-surface-500-400 text-center py-8">No recent activity to display</p>
		</div>
	</div>

	<!-- MY CLASSES SECTION -->
	<!-- Lists classes the student is enrolled in -->
	<div class="bg-surface-100-900 rounded-lg shadow">
		<div class="px-6 py-4 border-b border-surface-200-800">
			<h3 class="text-lg font-semibold text-surface-900-50">My Classes</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Join class_members with classes table to show enrolled classes -->
			<!-- Show: class name, teacher name, join date, active assignments -->
			<p class="text-surface-500-400 text-center py-8">You are not enrolled in any classes yet</p>
		</div>
	</div>
</div>
