<!--
	AssessmentCard Component
	========================
	Card component for displaying assessment info

	Props:
	- assessment: Assessment data
	- variant: 'teacher' | 'student' - Changes display and actions
	- assignmentData: Optional assignment data for student view
	- onEdit: Callback for edit action (teacher)
	- onAssign: Callback for assign action (teacher)
	- onView Results: Callback for viewing results (teacher)
	- onStart: Callback for starting assessment (student)
	- onViewResults: Callback for viewing results (student)
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
		Calendar
	} from 'lucide-svelte';
	import type { DbAssessment } from '$lib/types/assessment';
	import type { AssignmentWithDetails } from '$lib/types/assessment';
	import {
		formatDeadline,
		getStatusColor,
		getStatusLabel,
		getAttemptsRemaining
	} from '$lib/types/assessment';

	interface Props {
		assessment: DbAssessment;
		variant: 'teacher' | 'student';
		assignmentData?: AssignmentWithDetails;
		onEdit?: () => void;
		onAssign?: () => void;
		onViewResults?: () => void;
		onStart?: () => void;
	}

	let {
		assessment,
		variant,
		assignmentData,
		onEdit,
		onAssign,
		onViewResults,
		onStart
	}: Props = $props();

	// Derived values for student view
	let attemptsRemaining = $derived(
		assignmentData && assessment.settings.max_attempts !== null
			? getAttemptsRemaining(
					assignmentData.attempts_count,
					assessment.settings.max_attempts
				)
			: null
	);

	let deadlineFormatted = $derived(formatDeadline(assessment.settings.deadline));

	let statusColor = $derived(
		assignmentData ? getStatusColor(assignmentData.status) : ''
	);

	let statusLabel = $derived(
		assignmentData ? getStatusLabel(assignmentData.status) : ''
	);

	// Teacher-specific badges
	let statusBadgeColor = $derived.by(() => {
		switch (assessment.status) {
			case 'draft':
				return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
			case 'published':
				return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
			case 'archived':
				return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
		}
	});
</script>

{#if variant === 'teacher'}
	<!-- Teacher View -->
	<Card.Root class="hover:shadow-lg transition-shadow">
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						<Badge class={statusBadgeColor}>
							{assessment.status === 'draft' ? 'Brouillon' : assessment.status === 'published' ? 'Publiée' : 'Archivée'}
						</Badge>
						<Badge variant="outline">{assessment.grade}</Badge>
					</div>
					<Card.Title class="text-xl">{assessment.title}</Card.Title>
					{#if assessment.description}
						<Card.Description class="mt-2">{assessment.description}</Card.Description>
					{/if}
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<div class="space-y-2 text-sm text-muted-foreground">
				<div class="flex items-center gap-2">
					<FileEdit class="h-4 w-4" />
					<span>{assessment.categories.length} catégorie{assessment.categories.length > 1 ? 's' : ''}</span>
				</div>

				{#if assessment.settings.deadline}
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4" />
						<span>Échéance: {new Date(assessment.settings.deadline).toLocaleDateString('fr-FR')}</span>
					</div>
				{/if}

				{#if assessment.settings.max_attempts}
					<div class="flex items-center gap-2">
						<AlertCircle class="h-4 w-4" />
						<span>{assessment.settings.max_attempts} tentative{assessment.settings.max_attempts > 1 ? 's' : ''} max</span>
					</div>
				{/if}
			</div>
		</Card.Content>

		<Card.Footer class="flex gap-2">
			{#if assessment.status === 'draft' && onEdit}
				<Button variant="outline" size="sm" onclick={onEdit}>
					<FileEdit class="h-4 w-4 mr-2" />
					Modifier
				</Button>
			{/if}

			{#if assessment.status === 'published'}
				{#if onAssign}
					<Button variant="outline" size="sm" onclick={onAssign}>
						<Users class="h-4 w-4 mr-2" />
						Assigner
					</Button>
				{/if}

				{#if onViewResults}
					<Button variant="outline" size="sm" onclick={onViewResults}>
						<BarChart3 class="h-4 w-4 mr-2" />
						Résultats
					</Button>
				{/if}
			{/if}
		</Card.Footer>
	</Card.Root>
{:else}
	<!-- Student View -->
	<Card.Root class="hover:shadow-lg transition-shadow">
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<div class="flex items-center gap-2 mb-2">
						{#if assignmentData}
							<Badge class={statusColor}>{statusLabel}</Badge>
						{/if}
						<Badge variant="outline">{assessment.grade}</Badge>
					</div>
					<Card.Title class="text-xl">{assessment.title}</Card.Title>
					{#if assessment.description}
						<Card.Description class="mt-2">{assessment.description}</Card.Description>
					{/if}
				</div>
			</div>
		</Card.Header>

		<Card.Content>
			<div class="space-y-3">
				<!-- Score display if completed -->
				{#if assignmentData && assignmentData.best_score !== null}
					<div class="rounded-lg bg-primary/10 p-4 text-center">
						<div class="text-3xl font-bold text-primary">{assignmentData.best_score}/10</div>
						<div class="text-sm text-muted-foreground">Meilleure note</div>
					</div>
				{/if}

				<!-- Info -->
				<div class="space-y-2 text-sm text-muted-foreground">
					{#if assessment.settings.deadline}
						<div class="flex items-center gap-2">
							<Clock class="h-4 w-4" />
							<span>{deadlineFormatted}</span>
						</div>
					{/if}

					{#if assignmentData}
						<div class="flex items-center gap-2">
							<CheckCircle2 class="h-4 w-4" />
							<span>{assignmentData.attempts_count} tentative{assignmentData.attempts_count > 1 ? 's' : ''}</span>
							{#if attemptsRemaining !== null}
								<span class="text-xs">({attemptsRemaining} restante{attemptsRemaining > 1 ? 's' : ''})</span>
							{/if}
						</div>
					{/if}

					<div class="flex items-center gap-2">
						<FileEdit class="h-4 w-4" />
						<span>
							{assessment.categories.reduce((sum, cat) => sum + cat.quantity, 0)} question{assessment.categories.reduce((sum, cat) => sum + cat.quantity, 0) > 1 ? 's' : ''}
						</span>
					</div>
				</div>
			</div>
		</Card.Content>

		<Card.Footer>
			{#if assignmentData}
				{#if assignmentData.status === 'not_started' || assignmentData.status === 'in_progress'}
					{#if onStart}
						<Button class="w-full" onclick={onStart}>
							<Play class="h-4 w-4 mr-2" />
							{assignmentData.status === 'not_started' ? 'Commencer' : 'Reprendre'}
						</Button>
					{/if}
				{:else if assignmentData.status === 'completed'}
					{#if onViewResults}
						<Button variant="outline" class="w-full" onclick={onViewResults}>
							<BarChart3 class="h-4 w-4 mr-2" />
							Voir les résultats
						</Button>
					{/if}
				{:else if assignmentData.status === 'expired'}
					<Button disabled class="w-full">
						<AlertCircle class="h-4 w-4 mr-2" />
						Expiré
					</Button>
				{/if}
			{/if}
		</Card.Footer>
	</Card.Root>
{/if}
