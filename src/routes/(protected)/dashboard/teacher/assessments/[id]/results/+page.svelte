<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import EvaluationResultsTable from '$lib/components/assessments/EvaluationResultsTable.svelte';
	import { ArrowLeft, TrendingUp, Users, CheckCircle2, Clock, AlertCircle } from '@lucide/svelte';
	import { formatGrade, formLabel } from '$lib/types/evaluation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function handleBack() {
		goto('/dashboard/teacher/assessments').then(() => {});
	}
</script>

<svelte:head>
	<title>Résultats - {data.evaluation.series.title} | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{data.evaluation.series.title}</h1>
			<p class="mt-2 text-muted-foreground">
				Résultats de l'évaluation · {formLabel(data.evaluation.form)}
			</p>
		</div>
	</div>

	<!-- Statistics Cards -->
	{#if data.statistics}
		<div class="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
					<Card.Title class="text-sm font-medium">Total Assigné</Card.Title>
					<Users class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">{data.statistics.total_assigned}</div>
					<p class="text-xs text-muted-foreground">{lore.entities.student}s</p>
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
					<Card.Title class="text-sm font-medium">Moyenne des meilleures notes</Card.Title>
					<TrendingUp class="h-4 w-4 text-muted-foreground" />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-bold">
						{data.statistics.average_grade !== null
							? formatGrade(Math.round(data.statistics.average_grade * 10) / 10)
							: '–'}
					</div>
					{#if data.statistics.average_grade !== null}
						<p class="text-xs text-muted-foreground">
							Min : {formatGrade(data.statistics.min_grade)} | Max : {formatGrade(
								data.statistics.max_grade
							)}
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
				{data.results.length}
				{lore.entities.student}{data.results.length > 1 ? 's' : ''}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.results.length === 0}
				<div class="py-12 text-center text-muted-foreground">
					<AlertCircle class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p>Aucun résultat disponible</p>
					<p class="mt-2 text-sm">Les résultats apparaîtront une fois l'évaluation assignée</p>
				</div>
			{:else}
				<EvaluationResultsTable results={data.results} />
			{/if}
		</Card.Content>
	</Card.Root>
</div>
