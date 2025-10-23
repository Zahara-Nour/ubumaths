<!--
	Student Riddles Archive Page
	=============================
	View past riddles of the day
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { getDifficultyLabel, getDifficultyColor } from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { History, ArrowLeft, Trophy, XCircle, Clock } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();

	function formatDate(dateString: string) {
		return format(new Date(dateString), 'EEEE d MMMM yyyy', { locale: fr });
	}

	function getStatusIcon(attempt: any) {
		if (!attempt) return Clock;
		if (attempt.is_correct === true) return Trophy;
		if (attempt.is_correct === false) return XCircle;
		return Clock;
	}

	function getStatusColor(attempt: any) {
		if (!attempt) return 'text-muted-foreground';
		if (attempt.is_correct === true) return 'text-green-600 dark:text-green-400';
		if (attempt.is_correct === false) return 'text-red-600 dark:text-red-400';
		return 'text-yellow-600 dark:text-yellow-400';
	}

	function getStatusText(attempt: any) {
		if (!attempt) return 'Non tentée';
		if (attempt.is_correct === true) return `Réussie (${attempt.gidouilles_awarded} gidouilles)`;
		if (attempt.is_correct === false)
			return `${attempt.attempt_number} tentative${attempt.attempt_number > 1 ? 's' : ''}`;
		return 'En attente de validation';
	}
</script>

<svelte:head>
	<title>Archive Énigmes du Jour - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/student/riddles" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux énigmes
		</Button>

		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<History class="h-8 w-8 text-primary" />
			Archive des Énigmes du Jour
		</h1>
		<p class="mt-2 text-muted-foreground">Toutes les énigmes du jour passées</p>
	</div>

	<!-- Archive List -->
	{#if data.archive.length > 0}
		<div class="space-y-4">
			{#each data.archive as entry (entry.id)}
				{@const StatusIcon = getStatusIcon(entry.studentAttempt)}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<!-- Riddle Info -->
							<div class="flex-1">
								<div class="mb-2 flex items-center gap-2">
									<Badge variant="outline">Énigme #{entry.riddle.riddle_number}</Badge>
									<Badge class={getDifficultyColor(entry.riddle.difficulty)}>
										{getDifficultyLabel(entry.riddle.difficulty)}
									</Badge>
									{#if entry.riddle.genre}
										<Badge variant="outline">{entry.riddle.genre}</Badge>
									{/if}
								</div>
								<Card.Title class="text-xl">{entry.riddle.title}</Card.Title>
								<Card.Description class="capitalize">
									{formatDate(entry.assignment_date)}
								</Card.Description>
							</div>

							<!-- Status Badge -->
							<div class="flex items-center gap-2">
								<StatusIcon class={`h-5 w-5 ${getStatusColor(entry.studentAttempt)}`} />
								<span class={`text-sm font-medium ${getStatusColor(entry.studentAttempt)}`}>
									{getStatusText(entry.studentAttempt)}
								</span>
							</div>
						</div>
					</Card.Header>

					<Card.Footer>
						<Button href="/dashboard/student/riddles/{entry.riddle.id}" variant="outline">
							{entry.studentAttempt?.is_correct === true ? 'Revoir' : 'Tenter'}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
				<History class="h-16 w-16 text-muted-foreground/50" />
				<div class="text-center">
					<h3 class="text-lg font-semibold">Aucune énigme archivée</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Les énigmes du jour passées apparaîtront ici
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}
</div>
