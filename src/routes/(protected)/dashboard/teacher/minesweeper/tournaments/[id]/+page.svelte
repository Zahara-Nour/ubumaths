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
	import {
		ArrowLeft,
		Calendar,
		Users,
		Trophy,
		Clock,
		RefreshCw,
		XCircle,
		CheckCircle2,
		AlertTriangle,
		Medal
	} from 'lucide-svelte';
	import { DIFFICULTY_LABELS, type TournamentStatus } from '$lib/types/minesweeper';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let isRefreshing = $state(false);
	let isCancelling = $state(false);
	let isFinalizing = $state(false);
	let showCancelDialog = $state(false);
	let showFinalizeDialog = $state(false);

	function handleBack() {
		goto('/dashboard/teacher/minesweeper/tournaments').then(() => {});
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

	async function handleFinalize() {
		isFinalizing = true;
		try {
			const response = await fetch(
				`/api/games/minesweeper/tournaments/${data.tournament.id}/finalize`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ force_early: true })
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Erreur lors de la finalisation');
			}

			const result = await response.json();
			toaster.success(`Tournoi finalise ! ${result.podium?.length || 0} recompenses distribuees`);
			showFinalizeDialog = false;
			await invalidateAll();
		} catch (err) {
			console.error('Failed to finalize tournament:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la finalisation');
		} finally {
			isFinalizing = false;
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

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
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

	// Can cancel if scheduled or active
	let canCancel = $derived(
		data.tournament.status === 'scheduled' || data.tournament.status === 'active'
	);

	// Can finalize if active
	let canFinalize = $derived(data.tournament.status === 'active');

	// Get total rewards to distribute
	let totalRewards = $derived(
		Object.values(data.tournament.podium_rewards || {}).reduce((sum, v) => sum + (v || 0), 0)
	);
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
					<Badge class={getStatusBadgeClass(data.tournament.status)}>
						{getStatusLabel(data.tournament.status)}
					</Badge>
				</div>
				{#if data.tournament.description}
					<p class="mt-2 text-muted-foreground">{data.tournament.description}</p>
				{/if}
			</div>
		</div>

		<div class="flex gap-2">
			{#if canFinalize}
				<Button variant="outline" onclick={() => (showFinalizeDialog = true)}>
					<CheckCircle2 class="mr-2 h-4 w-4" />
					Finaliser
				</Button>
			{/if}
			{#if canCancel}
				<Button variant="destructive" onclick={() => (showCancelDialog = true)}>
					<XCircle class="mr-2 h-4 w-4" />
					Annuler
				</Button>
			{/if}
		</div>
	</div>

	<!-- Info Cards -->
	<div class="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-primary/10 p-3">
					<Calendar class="h-6 w-6 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Periode</p>
					<p class="font-semibold">{formatDate(data.tournament.start_date).split(' a ')[0]}</p>
					<p class="text-sm text-muted-foreground">
						au {formatDate(data.tournament.end_date).split(' a ')[0]}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-primary/10 p-3">
					<Users class="h-6 w-6 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Participants</p>
					<p class="text-2xl font-bold">{data.totalParticipants}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-primary/10 p-3">
					<Clock class="h-6 w-6 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Parametres</p>
					<p class="font-semibold">{DIFFICULTY_LABELS[data.tournament.difficulty]}</p>
					<p class="text-sm text-muted-foreground">Top {data.tournament.top_x_games} parties</p>
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Content class="flex items-center gap-4 pt-6">
				<div class="rounded-full bg-primary/10 p-3">
					<Trophy class="h-6 w-6 text-primary" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Recompenses</p>
					<p class="text-2xl font-bold">{totalRewards}</p>
					<p class="text-sm text-muted-foreground">gidouilles au total</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Podium Configuration -->
	<Card.Root class="mb-8">
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Medal class="h-5 w-5" />
				Configuration du podium
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-wrap gap-4">
				{#each Array.from({ length: data.tournament.podium_places }) as _, i (i)}
					{@const place = i + 1}
					{@const reward = data.tournament.podium_rewards?.[String(place)] || 0}
					<div class="flex items-center gap-2 rounded-lg border p-3">
						<span
							class="flex h-8 w-8 items-center justify-center rounded-full font-bold {getMedalClass(
								place
							)}"
						>
							{place}
						</span>
						<span class="font-medium">{reward} gidouilles</span>
					</div>
				{/each}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Leaderboard -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<Card.Title class="flex items-center gap-2">
					<Trophy class="h-5 w-5" />
					Classement
				</Card.Title>
				<Button variant="outline" size="sm" onclick={handleRefresh} disabled={isRefreshing}>
					<RefreshCw class="mr-2 h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
					Actualiser
				</Button>
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
							<Table.Head class="text-right">Parties gagnees</Table.Head>
							<Table.Head class="text-right">Temps moyen</Table.Head>
							{#if data.tournament.status === 'completed'}
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
								<Table.Cell class="text-right">{standing.games_won}</Table.Cell>
								<Table.Cell class="text-right">{formatTime(standing.average_time)}</Table.Cell>
								{#if data.tournament.status === 'completed'}
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

<!-- Finalize Dialog -->
<Dialog.Root bind:open={showFinalizeDialog}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Finaliser le tournoi</Dialog.Title>
			<Dialog.Description>
				Terminer le tournoi maintenant et distribuer les recompenses aux gagnants.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<Alert.Root>
				<Trophy class="h-4 w-4" />
				<Alert.Title>Distribution des recompenses</Alert.Title>
				<Alert.Description>
					{data.tournament.podium_places} joueur{data.tournament.podium_places > 1 ? 's' : ''} recevront
					un total de {totalRewards} gidouilles.
				</Alert.Description>
			</Alert.Root>

			{#if data.standings.length < data.tournament.podium_places}
				<Alert.Root variant="destructive">
					<AlertTriangle class="h-4 w-4" />
					<Alert.Title>Participants insuffisants</Alert.Title>
					<Alert.Description>
						Il n'y a que {data.standings.length} participant{data.standings.length > 1 ? 's' : ''} pour
						{data.tournament.podium_places} places sur le podium.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => (showFinalizeDialog = false)}
				disabled={isFinalizing}
			>
				Retour
			</Button>
			<Button onclick={handleFinalize} disabled={isFinalizing}>
				{isFinalizing ? 'Finalisation...' : 'Confirmer la finalisation'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
