<!--
	Student Riddles History Page
	=============================
	Personal history of solved riddles with filters
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { getDifficultyLabel, getDifficultyColor } from '$lib/types/riddle';
	import { calculateBadges, getTierColorClass } from '$lib/utils/riddle-badges';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Progress from '$lib/components/ui/progress';
	import { BookOpen, ArrowLeft, Trophy, Target, Award } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let selectedDifficulty = $state<string>(data.filters.difficulty || 'all');
	let selectedGenre = $state<string>(data.filters.genre || 'all');

	// Difficulty items for MySelect
	const difficultyItems = [
		{ value: 'all', label: 'Toutes' },
		{ value: '1', label: getDifficultyLabel(1) },
		{ value: '2', label: getDifficultyLabel(2) },
		{ value: '3', label: getDifficultyLabel(3) }
	];

	// Genre items for MySelect (dynamically built from data)
	const genreItems = $derived([
		{ value: 'all', label: 'Tous' },
		...data.uniqueGenres.map((genre) => ({ value: genre, label: genre }))
	]);

	function applyFilters() {
		const params = new URLSearchParams();
		if (selectedDifficulty !== 'all') {
			params.set('difficulty', selectedDifficulty);
		}
		if (selectedGenre !== 'all') {
			params.set('genre', selectedGenre);
		}
		goto(`/dashboard/student/riddles/history?${params.toString()}`);
	}

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'd MMMM yyyy', { locale: fr });
	}

	// Calculate badges
	const allBadges = $derived(calculateBadges(data.badgeProgress));
	const earnedBadges = $derived(allBadges.filter((b) => b.earned));
	const inProgressBadges = $derived(
		allBadges.filter((b) => !b.earned && b.progress && b.progress > 0)
	);
</script>

<svelte:head>
	<title>Mon Historique Énigmes - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/student/riddles" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux énigmes
		</Button>

		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<BookOpen class="h-8 w-8 text-primary" />
			Mon Historique
		</h1>
		<p class="mt-2 text-muted-foreground">Toutes les énigmes que tu as résolues</p>
	</div>

	<!-- Summary Stats -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Énigmes réussies</p>
						<p class="mt-1 text-3xl font-bold">{data.summary.totalSuccess}</p>
					</div>
					<Target class="h-10 w-10 text-primary opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Gidouilles gagnées</p>
						<p class="mt-1 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
							{data.summary.totalGidouilles}
						</p>
					</div>
					<Trophy class="h-10 w-10 text-yellow-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="pt-6">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Du 1er coup</p>
						<p class="mt-1 text-3xl font-bold text-green-600 dark:text-green-400">
							{data.summary.firstAttemptCount}
						</p>
					</div>
					<Award class="h-10 w-10 text-green-500 opacity-20" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Badges Section -->
	{#if earnedBadges.length > 0 || inProgressBadges.length > 0}
		<Card.Root class="mb-6">
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Trophy class="h-5 w-5" />
					Mes Badges
				</Card.Title>
				<Card.Description>Récompenses débloquées et progrès en cours</Card.Description>
			</Card.Header>
			<Card.Content>
				<!-- Earned Badges -->
				{#if earnedBadges.length > 0}
					<div class="mb-4">
						<h4 class="mb-3 text-sm font-medium">Badges débloqués</h4>
						<div class="grid gap-3 sm:grid-cols-2">
							{#each earnedBadges as badge (badge.id)}
								<div
									class="flex items-center gap-3 rounded-lg border-2 p-3 {getTierColorClass(
										badge.tier!
									)}"
								>
									<div class="text-3xl">{badge.icon}</div>
									<div class="flex-1">
										<p class="font-medium">{badge.name}</p>
										<p class="text-xs text-muted-foreground">{badge.description}</p>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- In Progress Badges -->
				{#if inProgressBadges.length > 0}
					<div>
						<h4 class="mb-3 text-sm font-medium">En cours de déblocage</h4>
						<div class="space-y-3">
							{#each inProgressBadges.slice(0, 3) as badge (badge.id)}
								<div class="rounded-lg border p-3">
									<div class="mb-2 flex items-center gap-3">
										<div class="text-2xl opacity-50">{badge.icon}</div>
										<div class="flex-1">
											<p class="font-medium">{badge.name}</p>
											<p class="text-xs text-muted-foreground">{badge.description}</p>
										</div>
									</div>
									{#if badge.progress !== undefined && badge.target}
										<div class="space-y-1">
											<div class="flex justify-between text-xs text-muted-foreground">
												<span>{badge.progress} / {badge.target}</span>
												<span>
													{Math.round((badge.progress / badge.target) * 100)}%
												</span>
											</div>
											<Progress.Root value={(badge.progress / badge.target) * 100} />
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Filters -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Filtres</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-4 sm:flex-row">
				<!-- Difficulty Filter -->
				<div class="flex-1 space-y-2">
					<Label>Difficulté</Label>
					<MySelect
						type="single"
						bind:value={selectedDifficulty}
						items={difficultyItems}
						placeholder="Toutes"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						onValueChange={() => applyFilters()}
					/>
				</div>

				<!-- Genre Filter -->
				<div class="flex-1 space-y-2">
					<Label>Genre</Label>
					<MySelect
						type="single"
						bind:value={selectedGenre}
						items={genreItems}
						placeholder="Tous"
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
						onValueChange={() => applyFilters()}
					/>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- History List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Historique des réussites</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.history.length > 0}
				<div class="space-y-3">
					{#each data.history as entry (entry.riddle_id)}
						<div class="rounded-lg border p-4 transition-shadow hover:shadow-md">
							<div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<!-- Riddle Info -->
								<div class="flex-1">
									<div class="mb-2 flex flex-wrap items-center gap-2">
										<Badge variant="outline">Énigme #{entry.riddle_number}</Badge>
										<Badge class={getDifficultyColor(entry.difficulty)}>
											{getDifficultyLabel(entry.difficulty)}
										</Badge>
										{#if entry.genre}
											<Badge variant="outline">{entry.genre}</Badge>
										{/if}
										{#if entry.total_attempts_for_success === 1}
											<Badge variant="default" class="bg-green-500">
												<Award class="mr-1 h-3 w-3" />
												1er coup
											</Badge>
										{/if}
									</div>
									<h3 class="mb-1 font-semibold">{entry.title}</h3>
									<p class="text-sm text-muted-foreground">
										Résolu le {formatDate(entry.first_success_at)}
									</p>
								</div>

								<!-- Stats -->
								<div class="flex gap-6 sm:flex-col sm:gap-2 sm:text-right">
									<div>
										<p class="text-xs text-muted-foreground">Tentatives</p>
										<p class="font-medium">{entry.total_attempts_for_success}</p>
									</div>
									<div>
										<p class="text-xs text-muted-foreground">Gidouilles</p>
										<p class="font-bold text-yellow-600 dark:text-yellow-400">
											{entry.gidouilles_awarded}
										</p>
									</div>
								</div>
							</div>

							<!-- View Button -->
							<div class="mt-3">
								<Button
									href="/dashboard/student/riddles/{entry.riddle_id}"
									variant="outline"
									size="sm"
								>
									Revoir l'énigme
								</Button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="py-8 text-center text-muted-foreground">
					{#if data.filters.difficulty || data.filters.genre}
						Aucune énigme trouvée avec ces filtres.
					{:else}
						Tu n'as pas encore résolu d'énigme. C'est le moment de commencer !
					{/if}
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
