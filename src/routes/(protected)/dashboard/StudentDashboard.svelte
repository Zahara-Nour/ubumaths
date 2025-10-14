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
	import GidouilleDisplay from '$lib/components/GidouilleDisplay.svelte';
	import VipCardsGallery from '$lib/components/VipCardsGallery.svelte';

	// Receive data from parent (+page.svelte)
	// Contains profile with student's information
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- GIDOUILLE DISPLAY -->
	<!-- Fun treasure chest showing student's gidouille balance -->
	<GidouilleDisplay count={data.profile.gidouilles} />

	<!-- VIP CARDS COLLECTION -->
	<!-- Gallery showing all VIP cards (owned and unowned) grouped by rarity -->
	<VipCardsGallery vipCards={data.profile.vip_cards} />

	<!-- QUICK STATS SECTION -->
	<!-- Three-column grid showing key student metrics -->
	<!-- TODO: Replace hardcoded values with real data from database -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<!-- Stat 1: Pending Assignments -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Devoirs à Rendre</h3>
			<!-- TODO: Query assignment_submissions table for incomplete assignments -->
			<p class="text-3xl font-bold text-foreground mt-2">5</p>
		</div>

		<!-- Stat 2: Total Points Earned -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Points Totaux</h3>
			<!-- TODO: Sum points from student_progress table -->
			<p class="text-3xl font-bold text-foreground mt-2">1,250</p>
		</div>

		<!-- Stat 3: Overall Mastery Level -->
		<div class="bg-card rounded-lg shadow p-6">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Niveau de Maîtrise</h3>
			<!-- TODO: Calculate average mastery_level from student_progress -->
			<p class="text-3xl font-bold text-foreground mt-2">78%</p>
		</div>
	</div>

	<!-- RECENT ACTIVITY SECTION -->
	<!-- Shows recent exercise attempts and assignment submissions -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Activité Récente</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query student_attempts table for recent activity -->
			<!-- Show: exercise name, result (correct/incorrect), points, timestamp -->
			<p class="text-muted-foreground text-center py-8">Aucune activité récente à afficher</p>
		</div>
	</div>

	<!-- MY CLASSES SECTION -->
	<!-- Lists classes the student is enrolled in -->
	<div class="bg-card rounded-lg shadow">
		<div class="px-6 py-4 border-b border-border">
			<h3 class="text-lg font-semibold text-foreground">Mes Classes</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Join class_members with classes table to show enrolled classes -->
			<!-- Show: class name, teacher name, join date, active assignments -->
			<p class="text-muted-foreground text-center py-8">Vous n'êtes inscrit à aucune classe pour le moment</p>
		</div>
	</div>
</div>
