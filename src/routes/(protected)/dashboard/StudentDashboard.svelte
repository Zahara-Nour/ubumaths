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
	import { Button } from '$lib/components/ui/button';
	import { BookOpen } from 'lucide-svelte';

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
	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Stat 1: Pending Assignments -->
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Devoirs à Rendre</h3>
			<!-- TODO: Query assignment_submissions table for incomplete assignments -->
			<p class="mt-2 text-3xl font-bold text-foreground">5</p>
		</div>

		<!-- Stat 2: Total Points Earned -->
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Points Totaux</h3>
			<!-- TODO: Sum points from student_progress table -->
			<p class="mt-2 text-3xl font-bold text-foreground">1,250</p>
		</div>

		<!-- Stat 3: Overall Mastery Level -->
		<div class="rounded-lg bg-card p-6 shadow">
			<h3 class="text-sm font-medium text-muted-foreground uppercase">Niveau de Maîtrise</h3>
			<!-- TODO: Calculate average mastery_level from student_progress -->
			<p class="mt-2 text-3xl font-bold text-foreground">78%</p>
		</div>
	</div>

	<!-- SRS REVISIONS SECTION -->
	<!-- Quick access to spaced repetition system -->
	<div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Révisions Espacées (SRS)</h3>
				<a href="/dashboard/revisions">
					<Button size="sm">
						<BookOpen class="mr-2 h-4 w-4" />
						Voir mes decks
					</Button>
				</a>
			</div>
		</div>
		<div class="p-6">
			<p class="text-muted-foreground">
				Système de révision espacée pour mémoriser durablement vos concepts mathématiques.
			</p>
			<div class="mt-4 grid gap-3 md:grid-cols-3">
				<div class="rounded-lg border bg-muted/20 p-4">
					<p class="text-sm font-medium text-muted-foreground">Decks</p>
					<p class="mt-1 text-2xl font-bold">-</p>
				</div>
				<div class="rounded-lg border bg-primary/10 p-4">
					<p class="text-sm font-medium text-muted-foreground">À réviser aujourd'hui</p>
					<p class="mt-1 text-2xl font-bold text-primary">-</p>
				</div>
				<div class="rounded-lg border bg-muted/20 p-4">
					<p class="text-sm font-medium text-muted-foreground">Cartes maîtrisées</p>
					<p class="mt-1 text-2xl font-bold">-</p>
				</div>
			</div>
		</div>
	</div>

	<!-- RECENT ACTIVITY SECTION -->
	<!-- Shows recent exercise attempts and assignment submissions -->
	<div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<h3 class="text-lg font-semibold text-foreground">Activité Récente</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Query student_attempts table for recent activity -->
			<!-- Show: exercise name, result (correct/incorrect), points, timestamp -->
			<p class="py-8 text-center text-muted-foreground">Aucune activité récente à afficher</p>
		</div>
	</div>

	<!-- MY CLASSES SECTION -->
	<!-- Lists classes the student is enrolled in -->
	<div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<h3 class="text-lg font-semibold text-foreground">Mes Classes</h3>
		</div>
		<div class="p-6">
			<!-- TODO: Join class_members with classes table to show enrolled classes -->
			<!-- Show: class name, teacher name, join date, active assignments -->
			<p class="py-8 text-center text-muted-foreground">
				Vous n'êtes inscrit à aucune classe pour le moment
			</p>
		</div>
	</div>
</div>
