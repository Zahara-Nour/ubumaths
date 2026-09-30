<!--
	EvaluationCard — une évaluation (sa série, sa forme, ses réglages).

	Props :
	- evaluation : évaluation avec sa série
	- variant : 'teacher' | 'student'
	- assignmentData : tentatives de l'élève (vue élève)
	- onEdit, onPublish, onAssign, onViewResults (prof) ; onStart, onViewResults (élève)
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		FileEdit,
		Users,
		BarChart3,
		Play,
		CheckCircle2,
		Clock,
		AlertCircle,
		Calendar,
		Send,
		Timer
	} from '@lucide/svelte';
	import type { AssignmentWithDetails, EvaluationWithSeries } from '$lib/types/evaluation';
	import {
		countSeriesQuestions,
		formatGrade,
		formLabel,
		getAttemptsRemaining,
		getStatusColor,
		getStatusLabel
	} from '$lib/types/evaluation';
	import { formatDeadline } from '$lib/utils/dates';

	interface Props {
		evaluation: EvaluationWithSeries;
		variant: 'teacher' | 'student';
		assignmentData?: AssignmentWithDetails;
		onEdit?: () => void;
		onPublish?: () => void;
		onAssign?: () => void;
		onViewResults?: () => void;
		onStart?: () => void;
	}

	let {
		evaluation,
		variant,
		assignmentData,
		onEdit,
		onPublish,
		onAssign,
		onViewResults,
		onStart
	}: Props = $props();

	let questionsCount = $derived(countSeriesQuestions(evaluation.series.categories));

	let attemptsRemaining = $derived(
		assignmentData && evaluation.max_attempts !== null
			? getAttemptsRemaining(assignmentData.attempts_count, evaluation.max_attempts)
			: null
	);

	let deadlineFormatted = $derived(formatDeadline(evaluation.deadline));
	let statusColor = $derived(assignmentData ? getStatusColor(assignmentData.status) : '');
	let statusLabel = $derived(assignmentData ? getStatusLabel(assignmentData.status) : '');

	/** « Course aux nombres · 7 min » ou « Entraînement » */
	let formText = $derived(
		evaluation.form === 'course' && evaluation.time_limit
			? `${formLabel(evaluation.form)} · ${Math.round(evaluation.time_limit / 60)} min`
			: formLabel(evaluation.form)
	);

	let statusBadgeColor = $derived.by(() => {
		switch (evaluation.status) {
			case 'draft':
				return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
			case 'published':
				return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
			case 'archived':
				return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
		}
	});
</script>

<Card.Root class="transition-shadow hover:shadow-lg">
	<Card.Header>
		<div class="mb-2 flex flex-wrap items-center gap-2">
			{#if variant === 'teacher'}
				<Badge class={statusBadgeColor}>
					{evaluation.status === 'draft'
						? 'Brouillon'
						: evaluation.status === 'published'
							? 'Publiée'
							: 'Archivée'}
				</Badge>
			{:else if assignmentData}
				<Badge class={statusColor}>{statusLabel}</Badge>
			{/if}
			<Badge variant="outline">{evaluation.series.grade}</Badge>
			<Badge variant="secondary" data-testid="evaluation-form">
				<Timer class="mr-1 h-3 w-3" />
				{formText}
			</Badge>
		</div>
		<Card.Title class="text-xl">{evaluation.series.title}</Card.Title>
		{#if evaluation.series.description}
			<Card.Description class="mt-2">{evaluation.series.description}</Card.Description>
		{/if}
	</Card.Header>

	<Card.Content>
		{#if variant === 'student' && assignmentData && assignmentData.best_grade !== null}
			<div class="mb-3 rounded-lg bg-primary/10 p-4 text-center">
				<div class="text-3xl font-bold text-primary" data-testid="best-grade">
					{formatGrade(assignmentData.best_grade)}
				</div>
				<div class="text-sm text-muted-foreground">Meilleure note</div>
			</div>
		{/if}

		<div class="space-y-2 text-sm text-muted-foreground">
			<div class="flex items-center gap-2">
				<FileEdit class="h-4 w-4" />
				<span>{questionsCount} question{questionsCount > 1 ? 's' : ''}</span>
			</div>

			{#if evaluation.deadline}
				<div class="flex items-center gap-2">
					{#if variant === 'teacher'}
						<Calendar class="h-4 w-4" />
						<span>Échéance : {new Date(evaluation.deadline).toLocaleDateString('fr-FR')}</span>
					{:else}
						<Clock class="h-4 w-4" />
						<span>{deadlineFormatted}</span>
					{/if}
				</div>
			{/if}

			{#if variant === 'teacher' && evaluation.max_attempts}
				<div class="flex items-center gap-2">
					<AlertCircle class="h-4 w-4" />
					<span>
						{evaluation.max_attempts} tentative{evaluation.max_attempts > 1 ? 's' : ''} max
					</span>
				</div>
			{/if}

			{#if variant === 'student' && assignmentData}
				<div class="flex items-center gap-2">
					<CheckCircle2 class="h-4 w-4" />
					<span>
						{assignmentData.attempts_count} tentative{assignmentData.attempts_count > 1 ? 's' : ''}
					</span>
					{#if attemptsRemaining !== null}
						<span class="text-xs">
							({attemptsRemaining} restante{attemptsRemaining > 1 ? 's' : ''})
						</span>
					{/if}
				</div>
			{/if}
		</div>
	</Card.Content>

	<Card.Footer class="flex flex-wrap gap-2">
		{#if variant === 'teacher'}
			{#if evaluation.status === 'draft'}
				{#if onEdit}
					<Button variant="outline" size="sm" onclick={onEdit}>
						<FileEdit class="mr-2 h-4 w-4" />
						Modifier
					</Button>
				{/if}
				{#if onPublish}
					<Button size="sm" onclick={onPublish}>
						<Send class="mr-2 h-4 w-4" />
						Publier
					</Button>
				{/if}
			{/if}
			{#if evaluation.status === 'published'}
				{#if onAssign}
					<Button variant="outline" size="sm" onclick={onAssign}>
						<Users class="mr-2 h-4 w-4" />
						Assigner
					</Button>
				{/if}
				{#if onViewResults}
					<Button variant="outline" size="sm" onclick={onViewResults}>
						<BarChart3 class="mr-2 h-4 w-4" />
						Résultats
					</Button>
				{/if}
			{/if}
		{:else if assignmentData}
			{#if assignmentData.status === 'not_started' || assignmentData.status === 'in_progress'}
				{#if onStart}
					<Button class="w-full" onclick={onStart}>
						<Play class="mr-2 h-4 w-4" />
						{assignmentData.status === 'not_started' ? 'Commencer' : 'Reprendre'}
					</Button>
				{/if}
			{:else if assignmentData.status === 'completed'}
				{#if onViewResults}
					<Button variant="outline" class="w-full" onclick={onViewResults}>
						<BarChart3 class="mr-2 h-4 w-4" />
						Voir les résultats
					</Button>
				{/if}
			{:else if assignmentData.status === 'expired'}
				<Button disabled class="w-full">
					<AlertCircle class="mr-2 h-4 w-4" />
					Expiré
				</Button>
			{/if}
		{/if}
	</Card.Footer>
</Card.Root>
