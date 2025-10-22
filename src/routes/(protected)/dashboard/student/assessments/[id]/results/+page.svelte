<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, TrendingUp, Target, Clock, Calendar } from 'lucide-svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function handleBack() {
		goto('/dashboard/student/assessments');
	}

	// Calculate stats
	let bestScore = $derived(
		data.attempts.length > 0
			? Math.max(...data.attempts.map((a) => a.score || 0))
			: null
	);

	let averageScore = $derived(
		data.attempts.length > 0
			? data.attempts.reduce((sum, a) => sum + (a.score || 0), 0) / data.attempts.length
			: null
	);

	let totalQuestions = $derived(
		data.attempts.length > 0 ? data.attempts[0].total_questions : null
	);

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '-';
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}min ${secs}s`;
	}
</script>

<svelte:head>
	<title>Mes Résultats - {data.assignment.assessment.title} | UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<!-- Header -->
	<div class="flex items-center gap-4 mb-8">
		<Button variant="ghost" size="icon" onclick={handleBack}>
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{data.assignment.assessment.title}</h1>
			<p class="text-muted-foreground mt-2">Mes résultats</p>
		</div>
	</div>

	<!-- Stats Cards -->
	<div class="grid gap-6 md:grid-cols-4 mb-8">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Meilleure Note</Card.Title>
				<TrendingUp class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{bestScore !== null ? `${bestScore}/10` : '-'}
				</div>
				{#if bestScore !== null && totalQuestions}
					<p class="text-xs text-muted-foreground">
						{Math.round((bestScore / 10) * 100)}%
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Note Moyenne</Card.Title>
				<Target class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{averageScore !== null ? `${averageScore.toFixed(1)}/10` : '-'}
				</div>
				{#if averageScore !== null}
					<p class="text-xs text-muted-foreground">
						{Math.round((averageScore / 10) * 100)}%
					</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Tentatives</Card.Title>
				<Calendar class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.attempts.length}</div>
				{#if data.assignment.assessment.settings.max_attempts}
					<p class="text-xs text-muted-foreground">
						sur {data.assignment.assessment.settings.max_attempts} max
					</p>
				{:else}
					<p class="text-xs text-muted-foreground">illimitées</p>
				{/if}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Questions</Card.Title>
				<Clock class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalQuestions || '-'}</div>
				<p class="text-xs text-muted-foreground">au total</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Attempts History -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Historique des Tentatives</Card.Title>
			<Card.Description>
				{data.attempts.length} tentative{data.attempts.length > 1 ? 's' : ''}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.attempts.length === 0}
				<div class="text-center py-12 text-muted-foreground">
					<p>Aucune tentative pour le moment</p>
					<Button onclick={handleBack} class="mt-4">
						Commencer l'évaluation
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head class="text-center">Note</Table.Head>
							<Table.Head class="text-center">Questions</Table.Head>
							<Table.Head class="text-center">Durée</Table.Head>
							<Table.Head class="text-center">Statut</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.attempts as attempt, index (attempt.id)}
							<Table.Row>
								<Table.Cell>
									{new Date(attempt.created_at).toLocaleString('fr-FR')}
									{#if index === 0}
										<Badge variant="outline" class="ml-2">Plus récent</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									<span
										class="font-semibold text-lg {attempt.score >= 5
											? 'text-green-600 dark:text-green-400'
											: 'text-red-600 dark:text-red-400'}"
									>
										{attempt.score}/10
									</span>
								</Table.Cell>
								<Table.Cell class="text-center">
									{attempt.correct_answers}/{attempt.total_questions}
								</Table.Cell>
								<Table.Cell class="text-center">
									{formatDuration(attempt.duration)}
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if attempt.completed_at}
										<Badge variant="secondary">Terminé</Badge>
									{:else}
										<Badge variant="outline">En cours</Badge>
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
