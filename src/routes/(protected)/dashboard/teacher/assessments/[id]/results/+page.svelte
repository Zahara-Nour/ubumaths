<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, TrendingUp, Users, CheckCircle2, Clock, AlertCircle } from 'lucide-svelte';
	import { getStatusColor, getStatusLabel } from '$lib/types/assessment';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function handleBack() {
		goto('/dashboard/teacher/assessments').then(() => {});
	}

	// Sort results by name
	let sortedResults = $derived(
		[...data.results].sort((a, b) => {
			const nameA = `${a.student_firstname} ${a.student_lastname}`.toLowerCase();
			const nameB = `${b.student_firstname} ${b.student_lastname}`.toLowerCase();
			return nameA.localeCompare(nameB);
		})
	);
</script>

<svelte:head>
	<title>Résultats - {data.assessment.title} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{data.assessment.title}</h1>
			<p class="mt-2 text-muted-foreground">Résultats de l'évaluation</p>
		</div>
	</div>

	<!-- Statistics Cards -->
	{#if data.statistics}
		<div class="mb-8 grid gap-6 md:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Assigné</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.statistics.total_assigned}</div>
					<p class="text-xs text-muted-foreground">élèves</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Terminé</Card.Title>
					<CheckCircle2 class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.statistics.completed}</div>
					<p class="text-xs text-muted-foreground">
						{data.statistics.completion_rate.toFixed(0)}% de complétion
					</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Note Moyenne</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{data.statistics.average_score !== null
							? `${data.statistics.average_score.toFixed(1)}/10`
							: '-'}
					</div>
					{#if data.statistics.average_score !== null}
						<p class="text-xs text-muted-foreground">
							Min: {data.statistics.min_score} | Max: {data.statistics.max_score}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">En Attente</Card.Title>
					<Clock class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{data.statistics.not_started + data.statistics.in_progress}
					</div>
					<p class="text-xs text-muted-foreground">
						{data.statistics.not_started} non commencé, {data.statistics.in_progress} en cours
					</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Results Table -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Détails des Résultats</Card.Title>
			<Card.Description>
				{sortedResults.length} élève{sortedResults.length > 1 ? 's' : ''}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if sortedResults.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<AlertCircle class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p>Aucun résultat disponible</p>
					<p class="mt-2 text-sm">Les résultats apparaîtront une fois l'évaluation assignée</p>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Élève</Table.Head>
							<Table.Head>Classe</Table.Head>
							<Table.Head class="text-center">Statut</Table.Head>
							<Table.Head class="text-center">Tentatives</Table.Head>
							<Table.Head class="text-center">Meilleure Note</Table.Head>
							<Table.Head class="text-center">Dernier Essai</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each sortedResults as result (result.student_user_id)}
							<Table.Row>
								<Table.Cell class="font-medium">
									{result.student_firstname}
									{result.student_lastname}
								</Table.Cell>
								<Table.Cell>
									{result.class_name || '-'}
								</Table.Cell>
								<Table.Cell class="text-center">
									<Badge class={getStatusColor(result.status)}>
										{getStatusLabel(result.status)}
									</Badge>
								</Table.Cell>
								<Table.Cell class="text-center">
									{result.attempts_count}
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if result.best_score !== null}
										<span
											class="font-semibold {result.best_score >= 5
												? 'text-green-600 dark:text-green-400'
												: 'text-red-600 dark:text-red-400'}"
										>
											{result.best_score}/10
										</span>
									{:else}
										<span class="text-muted-foreground">-</span>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center text-sm text-muted-foreground">
									{#if result.last_attempt_at}
										{new Date(result.last_attempt_at).toLocaleDateString('fr-FR')}
									{:else}
										-
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
