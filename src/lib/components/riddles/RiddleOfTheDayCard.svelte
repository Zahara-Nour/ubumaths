<!--
	Riddle of the Day Card
	======================
	Special card for displaying the daily riddle with prominent styling
-->

<script lang="ts">
	import type { DbRiddle, DbRiddleAttempt } from '$lib/types/riddle';
	import { getDifficultyLabel, getDifficultyColor, calculateGidouilles } from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Sparkles, Trophy, Calendar, ArrowRight, History } from 'lucide-svelte';
	import { sanitizeHtml } from '$lib/utils/sanitize';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';

	interface Props {
		riddle: DbRiddle;
		assignmentDate: string;
		studentAttempt?: DbRiddleAttempt | null;
		showArchiveLink?: boolean;
	}

	let { riddle, assignmentDate, studentAttempt, showArchiveLink = true }: Props = $props();

	const formattedDate = $derived(
		format(new Date(assignmentDate), 'EEEE d MMMM yyyy', { locale: fr })
	);

	const potentialGidouilles = $derived(
		calculateGidouilles(riddle.difficulty, studentAttempt ? studentAttempt.attempt_number + 1 : 1)
	);

	const isCompleted = $derived(studentAttempt?.is_correct === true);
	const isPending = $derived(studentAttempt?.is_correct === null);
	const hasFailed = $derived(studentAttempt?.is_correct === false);
</script>

<Card.Root class="border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
	<Card.Header>
		<div class="flex flex-col gap-4">
			<!-- Header with star badge -->
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-2">
					<Sparkles class="h-6 w-6 text-yellow-500" />
					<Card.Title class="text-2xl">Énigme du jour</Card.Title>
				</div>
				{#if isCompleted}
					<Badge variant="default" class="bg-green-500">
						<Trophy class="mr-1 h-3 w-3" />
						Réussie !
					</Badge>
				{:else if isPending}
					<Badge variant="secondary">En attente de validation</Badge>
				{:else if hasFailed && studentAttempt}
					<Badge variant="outline">
						{studentAttempt.attempt_number} tentative{studentAttempt.attempt_number > 1 ? 's' : ''}
					</Badge>
				{/if}
			</div>

			<!-- Date -->
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Calendar class="h-4 w-4" />
				<span class="capitalize">{formattedDate}</span>
			</div>
		</div>
	</Card.Header>

	<Card.Content class="space-y-4">
		<!-- Riddle Title -->
		<div>
			<div class="mb-2 flex items-center gap-2">
				<Badge variant="outline">Énigme #{riddle.riddle_number}</Badge>
				<Badge class={getDifficultyColor(riddle.difficulty)}>
					{getDifficultyLabel(riddle.difficulty)}
				</Badge>
				{#if riddle.genre}
					<Badge variant="outline">{riddle.genre}</Badge>
				{/if}
			</div>
			<h3 class="text-xl font-semibold">{riddle.title}</h3>
		</div>

		<!-- Riddle Statement (preview) -->
		<div class="rounded-lg bg-background/50 p-4">
			<div class="prose prose-sm line-clamp-3 max-w-none dark:prose-invert">
				{@html sanitizeHtml(riddle.statement)}
			</div>
		</div>

		<!-- Potential Reward -->
		{#if !isCompleted}
			<div
				class="flex items-center justify-center gap-2 rounded-lg bg-yellow-50 p-3 dark:bg-yellow-950"
			>
				<span class="text-sm font-medium">
					{potentialGidouilles} gidouille{potentialGidouilles > 1 ? 's' : ''} à gagner
				</span>
			</div>
		{:else if studentAttempt}
			<div
				class="flex items-center justify-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-950"
			>
				<Trophy class="h-4 w-4 text-green-600 dark:text-green-400" />
				<span class="text-sm font-medium text-green-600 dark:text-green-400">
					{studentAttempt.gidouilles_awarded} gidouille{studentAttempt.gidouilles_awarded > 1
						? 's'
						: ''} gagnées !
				</span>
			</div>
		{/if}
	</Card.Content>

	<Card.Footer class="flex flex-col gap-2 sm:flex-row">
		{#if !isCompleted}
			<Button href="/dashboard/student/riddles/{riddle.id}" class="flex-1" size="lg">
				{hasFailed || isPending ? 'Réessayer' : "Tenter l'énigme"}
				<ArrowRight class="ml-2 h-4 w-4" />
			</Button>
		{:else}
			<Button href="/dashboard/student/riddles/{riddle.id}" variant="outline" class="flex-1">
				Revoir l'énigme
			</Button>
		{/if}
		{#if showArchiveLink}
			<Button href="/dashboard/student/riddles/archive" variant="ghost" size="lg">
				<History class="mr-2 h-4 w-4" />
				Archives
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
