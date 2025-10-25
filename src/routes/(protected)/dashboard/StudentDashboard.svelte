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
	import RewardsBlock from '$lib/components/RewardsBlock.svelte';
	import { Button } from '$lib/components/ui/button';
	import { BookOpen } from 'lucide-svelte';

	// Receive data from parent (+page.svelte)
	// Contains profile with student's information
	let { data }: { data: PageData } = $props();
</script>

<div class="space-y-6">
	<!-- REWARDS BLOCK -->
	<!-- Summary of rewards: Gidouilles, VIP Cards, and Riddles -->
	<RewardsBlock
		gidouilles={data.profile.gidouilles}
		vipCards={data.profile.vip_cards}
		riddlesSolved={data.riddlesSolved}
	/>

	<!-- SRS REVISIONS SECTION -->
	<!-- Quick access to spaced repetition system -->
	<div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Révisions Espacées (SRS)</h3>
				<a href="/dashboard/revisions" data-sveltekit-preload-data="hover">
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
</div>
