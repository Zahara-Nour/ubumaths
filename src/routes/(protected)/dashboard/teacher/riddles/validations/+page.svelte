<!--
	Teacher Riddle Validations Page
	================================
	List of pending manual validations for teacher's riddles
-->

<script lang="ts">
	import type { PageData } from './$types';
	import {
		getDifficultyLabel,
		getDifficultyColor,
		formatAttemptNumber,
		calculateGidouilles
	} from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Clock, FileCheck, User } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();

	function formatTimeAgo(dateString: string) {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
	}
</script>

<svelte:head>
	<title>Validations en attente - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-6xl p-4 sm:p-6">
	<!-- Header -->
	<div class="mb-6">
		<h1 class="flex items-center gap-2 text-3xl font-bold">
			<FileCheck class="h-8 w-8 text-primary" />
			Validations en attente
		</h1>
		<p class="mt-2 text-muted-foreground">Réponses d'élèves nécessitant votre validation</p>
	</div>

	<!-- Stats Card -->
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<div class="flex items-center gap-4">
				<Clock class="h-10 w-10 text-yellow-500" />
				<div>
					<div class="text-3xl font-bold">{data.pendingValidations.length}</div>
					<p class="text-sm text-muted-foreground">
						Validation{data.pendingValidations.length > 1 ? 's' : ''} en attente
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Pending Validations List -->
	{#if data.pendingValidations.length === 0}
		<Card.Root class="border-dashed">
			<Card.Content class="flex flex-col items-center justify-center gap-4 py-12">
				<FileCheck class="h-16 w-16 text-muted-foreground/50" />
				<div class="text-center">
					<h3 class="text-lg font-semibold">Aucune validation en attente</h3>
					<p class="mt-1 text-sm text-muted-foreground">Toutes les réponses ont été validées !</p>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.pendingValidations as attempt (attempt.id)}
				<Card.Root class="transition-shadow hover:shadow-md">
					<Card.Header>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<!-- Student Info -->
							<div class="flex items-start gap-3">
								<Avatar.Root>
									<Avatar.Image src={attempt.student.avatar_url} alt="Avatar élève" />
									<Avatar.Fallback>
										<User class="h-4 w-4" />
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="flex-1">
									<Card.Title class="text-lg">
										{attempt.student.firstname || ''}
										{attempt.student.lastname || ''}
									</Card.Title>
									<Card.Description>
										Énigme #{attempt.riddle.riddle_number}: {attempt.riddle.title}
									</Card.Description>
								</div>
							</div>

							<!-- Riddle Badges -->
							<div class="flex flex-wrap gap-2">
								<Badge class={getDifficultyColor(attempt.riddle.difficulty)}>
									{getDifficultyLabel(attempt.riddle.difficulty)}
								</Badge>
								{#if attempt.riddle.genre}
									<Badge variant="outline">{attempt.riddle.genre}</Badge>
								{/if}
							</div>
						</div>
					</Card.Header>

					<Card.Content class="space-y-3">
						<!-- Attempt Info -->
						<div class="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
							<div class="flex items-center gap-1">
								<Clock class="h-4 w-4" />
								<span>{formatTimeAgo(attempt.created_at)}</span>
							</div>
							<span>•</span>
							<div>
								{formatAttemptNumber(attempt.attempt_number)} tentative
							</div>
							<span>•</span>
							<div>
								{calculateGidouilles(attempt.riddle.difficulty, attempt.attempt_number)} gidouilles si
								validé
							</div>
						</div>

						<!-- Student Answer Preview -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Réponse de l'élève
							</p>
							<div class="prose prose-sm line-clamp-3 max-w-none dark:prose-invert">
								{#if attempt.submitted_answer?.value}
									{typeof attempt.submitted_answer.value === 'string'
										? attempt.submitted_answer.value
										: JSON.stringify(attempt.submitted_answer.value)}
								{:else}
									<span class="text-muted-foreground italic">Aucune réponse</span>
								{/if}
							</div>
						</div>
					</Card.Content>

					<Card.Footer>
						<Button
							href="/dashboard/teacher/riddles/validations/{attempt.id}"
							class="w-full sm:w-auto"
						>
							<FileCheck class="mr-2 h-4 w-4" />
							Voir et valider
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
