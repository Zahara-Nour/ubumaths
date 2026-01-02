<!--
	Tournament Details & Management
	=================================
	View tournament details, standings, and manage tournament lifecycle.
-->

<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { ArrowLeft, Users, Trophy, RefreshCw, XCircle, AlertTriangle } from 'lucide-svelte';
	import { DIFFICULTY_LABELS, type TournamentStatus } from '$lib/types/minesweeper';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isRefreshing = $state(false);
	let isCancelling = $state(false);
	let showCancelDialog = $state(false);

	// Show toast when tournament was just auto-finalized
	$effect(() => {
		if (data.justFinalized) {
			const podiumCount = data.standings.filter(
				(s) => s.position <= data.tournament.podium_places
			).length;
			toaster.success(
				`Tournoi finalise ! ${podiumCount} recompense${podiumCount > 1 ? 's' : ''} distribuee${podiumCount > 1 ? 's' : ''}`
			);
		}
	});

	async function handleBack() {
		await goto('/dashboard/teacher/minesweeper/tournaments');
	}

	async function handleRefresh() {
		isRefreshing = true;
		try {
			await invalidateAll();
			toaster.success('Classement actualise');
		} catch (err) {
			console.error('Failed to refresh:', err);
			toaster.error("Erreur lors de l'actualisation");
		} finally {
			isRefreshing = false;
		}
	}

	async function handleCancel() {
		isCancelling = true;
		try {
			const response = await fetch(`/api/games/minesweeper/tournaments/${data.tournament.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Erreur lors de l'annulation");
			}

			toaster.success('Tournoi annule');
			showCancelDialog = false;
			await invalidateAll();
		} catch (err) {
			console.error('Failed to cancel tournament:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'annulation");
		} finally {
			isCancelling = false;
		}
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

	function getMedalEmoji(position: number): string {
		switch (position) {
			case 1:
				return '1er';
			case 2:
				return '2e';
			case 3:
				return '3e';
			default:
				return `${position}e`;
		}
	}

	function getMedalClass(position: number): string {
		switch (position) {
			case 1:
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			case 2:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
			case 3:
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	// Determine actual tournament state based on dates (more accurate than status field)
	let isEnded = $derived(
		new Date(data.tournament.end_date) < new Date() || data.tournament.status === 'completed'
	);
	let isStarted = $derived(new Date(data.tournament.start_date) <= new Date());
	let isCancelled = $derived(data.tournament.status === 'cancelled');

	// Actual status for display (based on dates, not just DB status)
	let actualStatus = $derived.by((): TournamentStatus => {
		if (isCancelled) return 'cancelled';
		if (isEnded) return 'completed';
		if (isStarted) return 'active';
		return 'scheduled';
	});

	// Can cancel if not yet ended and not cancelled
	let canCancel = $derived(!isEnded && !isCancelled);

	// Time remaining for active tournaments
	let timeRemaining = $derived.by(() => {
		if (isEnded) return null;
		const endDate = new Date(data.tournament.end_date);
		const now = new Date();
		const seconds = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / 1000));

		const days = Math.floor(seconds / 86400);
		const hours = Math.floor((seconds % 86400) / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);

		if (days > 0) return `${days}j ${hours}h`;
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	});
</script>

<svelte:head>
	<title>{data.tournament.name} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-start justify-between">
		<div class="flex items-start gap-4">
			<Button variant="ghost" size="icon" onclick={handleBack}>
				<ArrowLeft class="h-5 w-5" />
			</Button>
			<div>
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold tracking-tight">{data.tournament.name}</h1>
					<Badge
						class="{getStatusBadgeClass(actualStatus)} {isEnded ? 'px-4 py-1.5 text-base' : ''}"
					>
						{#if isEnded}🏁{/if}
						{getStatusLabel(actualStatus)}
					</Badge>
				</div>
				{#if data.tournament.description}
					<p class="mt-2 text-muted-foreground">{data.tournament.description}</p>
				{/if}
			</div>
		</div>

		{#if canCancel}
			<Button variant="destructive" onclick={() => (showCancelDialog = true)}>
				<XCircle class="mr-2 h-4 w-4" />
				Annuler
			</Button>
		{/if}
	</div>

	<!-- Tournament Info Card (simplified like student view) -->
	<Card.Root class="mb-8 p-6">
		<div class="flex flex-wrap items-center justify-between gap-6">
			<div class="space-y-3">
				<!-- Status / Time remaining -->
				<div class="flex items-center gap-2 text-sm">
					<span aria-hidden="true">{isEnded ? '🏁' : '⏳'}</span>
					{#if isEnded}
						<span class="font-semibold text-muted-foreground">Tournoi termine</span>
					{:else}
						<span>Temps restant : <strong>{timeRemaining}</strong></span>
					{/if}
				</div>

				<!-- Parameters -->
				<div class="flex items-center gap-2 text-sm text-muted-foreground">
					<span aria-hidden="true">⚙️</span>
					<span
						>{DIFFICULTY_LABELS[data.tournament.difficulty]} · Top {data.tournament.top_x_games} parties</span
					>
				</div>

				<!-- Podium rewards (inline with emojis) -->
				<div class="flex flex-wrap items-center gap-3 text-sm">
					{#each Object.entries(data.tournament.podium_rewards || {}) as [place, reward] (place)}
						<div class="flex items-center gap-1">
							{#if place === '1'}
								<span>🥇</span>
							{:else if place === '2'}
								<span>🥈</span>
							{:else if place === '3'}
								<span>🥉</span>
							{:else}
								<span>#{place}</span>
							{/if}
							<span class="font-bold text-amber-500">{reward}</span>
						</div>
					{/each}
					<span class="text-muted-foreground">gidouilles</span>
				</div>
			</div>

			<!-- Participants count -->
			<div class="rounded-lg bg-muted/50 p-4 text-center">
				<p class="text-sm text-muted-foreground">Participants</p>
				<p class="text-3xl font-bold text-foreground">{data.totalParticipants}</p>
			</div>
		</div>
	</Card.Root>

	<!-- Leaderboard -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="flex items-center gap-2">
					<Trophy class="h-5 w-5" />
					{isEnded ? 'Classement final' : 'Classement'}
				</Card.Title>
				{#if !isEnded}
					<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
						<RefreshCw class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
						Actualiser
					</Button>
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if data.standings.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<Users class="mx-auto mb-4 h-12 w-12 opacity-50" />
					<p>Aucun participant pour le moment</p>
					<p class="mt-2 text-sm">Les resultats apparaitront ici des que des eleves joueront</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-16">Rang</Table.Head>
							<Table.Head>Joueur</Table.Head>
							<Table.Head class="text-right">Score moyen</Table.Head>
							{#if isEnded}
								<Table.Head class="text-right">Recompense</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.standings as standing (standing.student_id)}
							<Table.Row
								class={standing.position <= data.tournament.podium_places ? 'bg-muted/50' : ''}
							>
								<Table.Cell>
									<span
										class="inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold {getMedalClass(
											standing.position
										)}"
									>
										{getMedalEmoji(standing.position)}
									</span>
								</Table.Cell>
								<Table.Cell class="font-medium">
									{standing.firstname}
									{standing.lastname}
								</Table.Cell>
								<Table.Cell class="text-right font-mono">
									{Math.round(standing.average_score)} pts
								</Table.Cell>
								{#if isEnded}
									<Table.Cell class="text-right">
										{#if standing.position <= data.tournament.podium_places}
											<Badge variant="outline" class="bg-yellow-50 dark:bg-yellow-950">
												{data.tournament.podium_rewards?.[String(standing.position)] || 0} gidouilles
											</Badge>
										{:else}
											<span class="text-muted-foreground">-</span>
										{/if}
									</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Cancel Dialog -->
<Dialog.Root bind:open={showCancelDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Annuler le tournoi</Dialog.Title>
			<Dialog.Description>
				Etes-vous sur de vouloir annuler ce tournoi ? Cette action est irreversible.
			</Dialog.Description>
		</Dialog.Header>

		<Alert.Root variant="destructive">
			<AlertTriangle class="h-4 w-4" />
			<Alert.Title>Attention</Alert.Title>
			<Alert.Description>
				Les parties deja jouees seront conservees mais aucune recompense ne sera distribuee.
			</Alert.Description>
		</Alert.Root>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => (showCancelDialog = false)} disabled={isCancelling}>
				Retour
			</Button>
			<Button variant="destructive" onclick={handleCancel} disabled={isCancelling}>
				{isCancelling ? 'Annulation...' : "Confirmer l'annulation"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
