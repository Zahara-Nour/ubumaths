<!--
	Teacher Minesweeper Tournaments List
	=====================================
	List of teacher's tournaments with filtering by status.
-->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Plus, Calendar, Users, Trophy, Clock } from 'lucide-svelte';
	import { DIFFICULTY_LABELS, type TournamentStatus } from '$lib/types/minesweeper';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Filter tournaments by status
	let scheduled = $derived(data.tournaments.filter((t) => t.status === 'scheduled'));
	let active = $derived(data.tournaments.filter((t) => t.status === 'active'));
	let completed = $derived(data.tournaments.filter((t) => t.status === 'completed'));
	let cancelled = $derived(data.tournaments.filter((t) => t.status === 'cancelled'));

	function handleCreateNew() {
		goto('/dashboard/teacher/minesweeper/tournaments/new').then(() => {});
	}

	function handleViewDetails(tournamentId: string) {
		goto(`/dashboard/teacher/minesweeper/tournaments/${tournamentId}`).then(() => {});
	}

	function getStatusBadgeClass(status: TournamentStatus): string {
		switch (status) {
			case 'scheduled':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'active':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'completed':
				return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
			case 'cancelled':
				return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
			default:
				return '';
		}
	}

	function getStatusLabel(status: TournamentStatus): string {
		switch (status) {
			case 'scheduled':
				return 'Planifie';
			case 'active':
				return 'En cours';
			case 'completed':
				return 'Termine';
			case 'cancelled':
				return 'Annule';
			default:
				return status;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatDateRange(startDate: string, endDate: string): string {
		return `${formatDate(startDate)} - ${formatDate(endDate)}`;
	}
</script>

<svelte:head>
	<title>Tournois Demineur | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Tournois Demineur</h1>
			<p class="mt-2 text-muted-foreground">Creez et gerez vos tournois de demineur</p>
		</div>
		<Button onclick={handleCreateNew}>
			<Plus class="mr-2 h-4 w-4" />
			Nouveau tournoi
		</Button>
	</div>

	<!-- Tabs -->
	<Tabs.Root value="active" class="space-y-6">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="active">
				En cours
				{#if active.length > 0}
					<span class="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs dark:bg-green-900">
						{active.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="scheduled">
				Planifies
				{#if scheduled.length > 0}
					<span class="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs dark:bg-blue-900">
						{scheduled.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="completed">
				Termines
				{#if completed.length > 0}
					<span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800">
						{completed.length}
					</span>
				{/if}
			</Tabs.Trigger>
			<Tabs.Trigger value="cancelled">
				Annules
				{#if cancelled.length > 0}
					<span class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs dark:bg-red-900">
						{cancelled.length}
					</span>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Active Tab -->
		<Tabs.Content value="active" class="space-y-4">
			{#if active.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<Trophy class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucun tournoi en cours</p>
					<p class="mt-2 text-sm">Les tournois actifs apparaitront ici</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each active as tournament (tournament.id)}
						<Card.Root
							class="cursor-pointer transition-shadow hover:shadow-lg"
							onclick={() => handleViewDetails(tournament.id)}
						>
							<Card.Header>
								<div class="flex items-start justify-between">
									<div>
										<Card.Title class="text-lg">{tournament.name}</Card.Title>
										<Card.Description class="mt-1">
											{DIFFICULTY_LABELS[tournament.difficulty]}
										</Card.Description>
									</div>
									<Badge class={getStatusBadgeClass(tournament.status)}>
										{getStatusLabel(tournament.status)}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar class="h-4 w-4" />
									<span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
								</div>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Users class="h-4 w-4" />
									<span
										>{tournament.participant_count} participant{tournament.participant_count !== 1
											? 's'
											: ''}</span
									>
								</div>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock class="h-4 w-4" />
									<span>Top {tournament.top_x_games} parties</span>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Scheduled Tab -->
		<Tabs.Content value="scheduled" class="space-y-4">
			{#if scheduled.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<Calendar class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucun tournoi planifie</p>
					<p class="mt-2 text-sm">Creez un tournoi pour commencer</p>
					<Button onclick={handleCreateNew} class="mt-4">
						<Plus class="mr-2 h-4 w-4" />
						Creer un tournoi
					</Button>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each scheduled as tournament (tournament.id)}
						<Card.Root
							class="cursor-pointer transition-shadow hover:shadow-lg"
							onclick={() => handleViewDetails(tournament.id)}
						>
							<Card.Header>
								<div class="flex items-start justify-between">
									<div>
										<Card.Title class="text-lg">{tournament.name}</Card.Title>
										<Card.Description class="mt-1">
											{DIFFICULTY_LABELS[tournament.difficulty]}
										</Card.Description>
									</div>
									<Badge class={getStatusBadgeClass(tournament.status)}>
										{getStatusLabel(tournament.status)}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar class="h-4 w-4" />
									<span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
								</div>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock class="h-4 w-4" />
									<span>Top {tournament.top_x_games} parties</span>
								</div>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Trophy class="h-4 w-4" />
									<span
										>{tournament.podium_places} place{tournament.podium_places > 1 ? 's' : ''} au podium</span
									>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Completed Tab -->
		<Tabs.Content value="completed" class="space-y-4">
			{#if completed.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<Trophy class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucun tournoi termine</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each completed as tournament (tournament.id)}
						<Card.Root
							class="cursor-pointer transition-shadow hover:shadow-lg"
							onclick={() => handleViewDetails(tournament.id)}
						>
							<Card.Header>
								<div class="flex items-start justify-between">
									<div>
										<Card.Title class="text-lg">{tournament.name}</Card.Title>
										<Card.Description class="mt-1">
											{DIFFICULTY_LABELS[tournament.difficulty]}
										</Card.Description>
									</div>
									<Badge class={getStatusBadgeClass(tournament.status)}>
										{getStatusLabel(tournament.status)}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar class="h-4 w-4" />
									<span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
								</div>
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Users class="h-4 w-4" />
									<span
										>{tournament.participant_count} participant{tournament.participant_count !== 1
											? 's'
											: ''}</span
									>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>

		<!-- Cancelled Tab -->
		<Tabs.Content value="cancelled" class="space-y-4">
			{#if cancelled.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<p>Aucun tournoi annule</p>
				</div>
			{:else}
				<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each cancelled as tournament (tournament.id)}
						<Card.Root class="opacity-60">
							<Card.Header>
								<div class="flex items-start justify-between">
									<div>
										<Card.Title class="text-lg">{tournament.name}</Card.Title>
										<Card.Description class="mt-1">
											{DIFFICULTY_LABELS[tournament.difficulty]}
										</Card.Description>
									</div>
									<Badge class={getStatusBadgeClass(tournament.status)}>
										{getStatusLabel(tournament.status)}
									</Badge>
								</div>
							</Card.Header>
							<Card.Content class="space-y-3">
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar class="h-4 w-4" />
									<span>{formatDateRange(tournament.start_date, tournament.end_date)}</span>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>
