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
	import InboxWidget from '$lib/components/student-inbox/InboxWidget.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Target,
		Brain,
		Sparkles,
		CheckCircle2,
		Circle,
		LifeBuoy,
		ChevronRight
	} from '@lucide/svelte';
	// import AchievementsWidget from '$lib/components/game/minesweeper/AchievementsWidget.svelte';
	// import { Button } from '$lib/components/ui/button';
	// import { formatDeadline, isDeadlinePassed, isDeadlineSoon } from '$lib/utils/dates';
	// import { BookOpen, FileText, Calendar, CheckCircle } from '@lucide/svelte';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import { findCurrentPeriod } from '$lib/utils/academic-period';

	// Receive data from parent (+page.svelte)
	// Contains profile with student's information
	let { data }: { data: PageData } = $props();

	// Determine current academic period for warnings
	const currentPeriodId = $derived(
		findCurrentPeriod(data.academicPeriods as Parameters<typeof findCurrentPeriod>[0])
	);

	/**
	 * EFFECT: Auto-fetch student data on mount (side effects: API calls)
	 * Cache stores use SvelteMap for proper reactivity with $derived
	 */
	$effect(() => {
		if (data.user && data.profile) {
			// Fetch rewards (cache-first)
			studentCache.getRewards();
			// Fetch warnings for current period
			if (currentPeriodId) {
				studentCache.getWarnings(currentPeriodId);
			}
		}
	});
</script>

<div class="space-y-6">
	<!-- WORK INBOX WIDGET: urgent assignments (late + this week) -->
	{#if data.inbox}
		<InboxWidget inbox={data.inbox} maxItems={5} />
	{/if}

	<!-- COMPÉTENCES PROGRESS WIDGET (Phase 6) -->
	{#if data.competencesSummary}
		{@const objs = data.competencesSummary.objectives}
		{@const comps = data.competencesSummary.competences}
		<div class="grid gap-3 md:grid-cols-2">
			<!-- Mes objectifs (famille A — knowledge) -->
			<a
				href="/dashboard/student/objectifs"
				class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
			>
				<Card.Root>
					<Card.Content class="p-4">
						<div class="mb-2 flex items-center gap-2">
							<Target class="h-5 w-5 text-primary" />
							<h3 class="font-semibold">Mes objectifs</h3>
							<ChevronRight class="ml-auto h-4 w-4 text-muted-foreground" />
						</div>
						<div class="mb-2 flex items-center gap-3 text-sm">
							<span class="flex items-center gap-1">
								<Sparkles class="h-4 w-4 text-amber-500" />
								<strong>{objs.mastery}</strong>
							</span>
							<span class="flex items-center gap-1">
								<CheckCircle2 class="h-4 w-4 text-green-500" />
								<strong>{objs.atteint}</strong>
							</span>
							<span class="flex items-center gap-1">
								<Circle class="h-4 w-4 fill-orange-500 text-orange-500" />
								<strong>{objs.en_cours}</strong>
							</span>
							<span class="ml-auto text-xs text-muted-foreground">
								{objs.mastery + objs.atteint}/{objs.total} atteints
							</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
							<div class="flex h-full">
								{#if objs.mastery > 0}
									<div
										class="bg-amber-500"
										style="width: {(objs.mastery / objs.total) * 100}%"
									></div>
								{/if}
								{#if objs.atteint > 0}
									<div
										class="bg-green-500"
										style="width: {(objs.atteint / objs.total) * 100}%"
									></div>
								{/if}
								{#if objs.en_cours > 0}
									<div
										class="bg-orange-500"
										style="width: {(objs.en_cours / objs.total) * 100}%"
									></div>
								{/if}
							</div>
						</div>
						{#if objs.remediation > 0}
							<div class="mt-2">
								<Badge variant="destructive" class="gap-1 text-xs">
									<LifeBuoy class="h-3 w-3" />
									{objs.remediation} à remédier
								</Badge>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</a>

			<!-- Mes compétences math (famille B — competence) -->
			<a
				href="/dashboard/student/competences"
				class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
			>
				<Card.Root>
					<Card.Content class="p-4">
						<div class="mb-2 flex items-center gap-2">
							<Brain class="h-5 w-5 text-primary" />
							<h3 class="font-semibold">Mes compétences math</h3>
							<ChevronRight class="ml-auto h-4 w-4 text-muted-foreground" />
						</div>
						{#if comps.with_data === 0}
							<p class="text-sm text-muted-foreground">
								Pas encore d'évaluation famille B. Ton prof commencera bientôt.
							</p>
						{:else}
							<div class="mb-2 flex items-center gap-3 text-sm">
								<span class="flex items-center gap-1">
									<Sparkles class="h-4 w-4 text-amber-500" />
									<strong>{comps.tres_bonne}</strong>
								</span>
								<span class="flex items-center gap-1">
									<CheckCircle2 class="h-4 w-4 text-green-500" />
									<strong>{comps.satisfaisante}</strong>
								</span>
								<span class="flex items-center gap-1">
									<Circle class="h-4 w-4 fill-orange-500 text-orange-500" />
									<strong>{comps.fragile}</strong>
								</span>
								<span class="ml-auto text-xs text-muted-foreground">
									{comps.tres_bonne + comps.satisfaisante}/{comps.total} à niveau
								</span>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div class="flex h-full">
									{#if comps.tres_bonne > 0}
										<div
											class="bg-amber-500"
											style="width: {(comps.tres_bonne / comps.total) * 100}%"
										></div>
									{/if}
									{#if comps.satisfaisante > 0}
										<div
											class="bg-green-500"
											style="width: {(comps.satisfaisante / comps.total) * 100}%"
										></div>
									{/if}
									{#if comps.fragile > 0}
										<div
											class="bg-orange-500"
											style="width: {(comps.fragile / comps.total) * 100}%"
										></div>
									{/if}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</a>
		</div>
	{/if}

	<!-- REWARDS BLOCK -->
	<!--
		Summary of rewards: Gidouilles, VIP Cards, and Riddles
		NOTE: RewardsBlock now derives gidouilles and vipCards from studentCache
		Only riddlesSolved and studentId are passed as props
	-->
	<RewardsBlock
		riddlesSolved={data.riddlesSolved}
		studentId={data.profile.id}
		periodId={currentPeriodId}
	/>

	<!-- SRS REVISIONS SECTION -->
	<!-- Quick access to spaced repetition system -->
	<!-- <div class="rounded-lg bg-card shadow">
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
	</div> -->

	<!-- EXERCISES SECTION -->
	<!-- Recent assigned exercises -->
	<!-- <div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Mes exercices</h3>
				<a href="/dashboard/student/exercises" data-sveltekit-preload-data="hover">
					<Button size="sm">
						<FileText class="mr-2 h-4 w-4" />
						Voir tous les exercices
					</Button>
				</a>
			</div>
		</div>
		<div class="p-6">
			{#if data.recentExercises && data.recentExercises.length > 0}
				<div class="space-y-3">
					{#each data.recentExercises as exercise (exercise.id)}
						{@const assignment = exercise.exercise_assignments?.[0]}
						{@const completion = exercise.exercise_completions?.[0]}
						{@const isCompleted = completion?.completed_at}
						{@const deadline = assignment?.optional_deadline}

						<a
							href="/dashboard/student/exercises/{exercise.id}"
							data-sveltekit-preload-data="hover"
							class="block rounded-lg border bg-muted/20 p-4 transition-all hover:bg-muted/40 hover:shadow-md"
						>
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<h4 class="truncate font-medium">
										{exercise.title || 'Sans titre'}
									</h4>

									{#if exercise.tags && exercise.tags.length > 0}
										<div class="mt-1 flex flex-wrap gap-1">
											{#each exercise.tags.slice(0, 2) as tag, idx (idx)}
												<span class="rounded bg-secondary px-1.5 py-0.5 text-xs">
													{tag}
												</span>
											{/each}
										</div>
									{/if}

									{#if assignment?.notes}
										<p class="mt-2 truncate text-xs text-muted-foreground italic">
											"{assignment.notes}"
										</p>
									{/if}
								</div>

								<div class="flex flex-shrink-0 flex-col items-end gap-1">
									{#if isCompleted}
										<span
											class="flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs text-green-800"
										>
											<CheckCircle class="h-3 w-3" />
											Complété
										</span>
									{:else if completion}
										<span class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
											{completion.view_count} vue{completion.view_count > 1 ? 's' : ''}
										</span>
									{/if}

									{#if deadline}
										<span
											class="flex items-center gap-1 rounded px-2 py-1 text-xs"
											class:bg-red-100={isDeadlinePassed(deadline)}
											class:text-red-800={isDeadlinePassed(deadline)}
											class:bg-orange-100={isDeadlineSoon(deadline)}
											class:text-orange-800={isDeadlineSoon(deadline)}
											class:bg-blue-100={!isDeadlinePassed(deadline) && !isDeadlineSoon(deadline)}
											class:text-blue-800={!isDeadlinePassed(deadline) && !isDeadlineSoon(deadline)}
										>
											<Calendar class="h-3 w-3" />
											{formatDeadline(deadline)}
										</span>
									{/if}
								</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">Aucun exercice assigné pour le moment</p>
			{/if}
		</div>
	</div> -->
	<!-- MINESWEEPER ACHIEVEMENTS SECTION -->
	<!-- Display student's Minesweeper achievements progress -->
	<!-- {#if data.minesweeperAchievements && data.achievementStats}
		<AchievementsWidget achievements={data.minesweeperAchievements} stats={data.achievementStats} />
	{/if} -->
</div>
