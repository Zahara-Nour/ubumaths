<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import TournamentCard from '$lib/components/game/minesweeper/TournamentCard.svelte';
	import type { PageData } from './$types';

	// Props
	let { data }: { data: PageData } = $props();

	// State
	let tournaments = $state(data.tournaments);

	// Derived state
	let activeTournaments = $derived(tournaments.filter((t) => t.status === 'active'));
	let upcomingTournaments = $derived(tournaments.filter((t) => t.status === 'scheduled'));
	let completedTournaments = $derived(tournaments.filter((t) => t.status === 'completed'));
</script>

<svelte:head>
	<title>Tournois - Demineur | UbuMaths</title>
	<meta
		name="description"
		content="Participez aux tournois de demineur et affrontez d'autres joueurs"
	/>
</svelte:head>

<div class="space-y-8 pb-8">
	<!-- Header -->
	<div class="space-y-4">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Tournois</h1>
				<p class="mt-1 text-muted-foreground">
					Affrontez d'autres joueurs et gagnez des recompenses !
				</p>
			</div>
			<a href="/dashboard/student/minesweeper/daily">
				<Button variant="outline">Defi quotidien</Button>
			</a>
		</div>
	</div>

	<Separator />

	<!-- Active Tournaments -->
	<div class="space-y-4">
		<h2 class="text-2xl font-bold text-foreground">
			Tournois en cours
			{#if activeTournaments.length > 0}
				<span class="ml-2 text-lg font-normal text-muted-foreground">
					({activeTournaments.length})
				</span>
			{/if}
		</h2>

		{#if activeTournaments.length === 0}
			<Card class="p-12 text-center">
				<span class="mb-4 block text-4xl">🎮</span>
				<p class="text-lg text-muted-foreground">Aucun tournoi en cours pour le moment</p>
				<p class="mt-2 text-sm text-muted-foreground">
					Revenez plus tard ou jouez au defi quotidien en attendant !
				</p>
				<a href="/dashboard/student/minesweeper/daily" class="mt-4 inline-block">
					<Button variant="default">Jouer au defi quotidien</Button>
				</a>
			</Card>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each activeTournaments as tournament (tournament.id)}
					<TournamentCard {tournament} />
				{/each}
			</div>
		{/if}
	</div>

	<!-- Upcoming Tournaments (if any) -->
	{#if upcomingTournaments.length > 0}
		<Separator />

		<div class="space-y-4">
			<h2 class="text-2xl font-bold text-foreground">
				Tournois a venir
				<span class="ml-2 text-lg font-normal text-muted-foreground">
					({upcomingTournaments.length})
				</span>
			</h2>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each upcomingTournaments as tournament (tournament.id)}
					<TournamentCard {tournament} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Completed Tournaments (if any) -->
	{#if completedTournaments.length > 0}
		<Separator />

		<div class="space-y-4">
			<h2 class="text-2xl font-bold text-foreground">
				Tournois termines
				<span class="ml-2 text-lg font-normal text-muted-foreground">
					({completedTournaments.length})
				</span>
			</h2>

			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each completedTournaments as tournament (tournament.id)}
					<TournamentCard {tournament} />
				{/each}
			</div>
		</div>
	{/if}

	<!-- Navigation -->
	<Separator />

	<div class="flex flex-wrap gap-3">
		<a href="/dashboard/student/minesweeper/daily">
			<Button variant="outline">Defi quotidien</Button>
		</a>
		<a href="/dashboard/student/minesweeper/stats">
			<Button variant="outline">Mes statistiques</Button>
		</a>
		<a href="/games/minesweeper">
			<Button variant="outline">Jeu libre</Button>
		</a>
	</div>
</div>
