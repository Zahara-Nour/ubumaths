<!--
	RiddleCard Component
	====================
	Displays math riddles/enigmas with optional interactive mode

	Features:
	- Display mode: Show riddle statement with metadata
	- Interactive mode: Answer validation and submission
	- Rich text support for statement
	- Image support
	- Genre and difficulty badges
	- Correction visibility (teacher only)

	Props:
	- riddle: DbRiddle - The riddle data
	- mode: 'display' | 'interactive' - Display only or allow interaction
	- showCorrection: boolean - Show correction (teachers only)
	- onSubmit: (answer) => void - Callback for answer submission
	- size: 'sm' | 'md' | 'lg' - Card size
	- studentAttempt?: DbRiddleAttempt - Student's latest attempt (if any)
-->

<script lang="ts">
	import type { DbRiddle, DbRiddleAttempt } from '$lib/types/riddle';
	import {
		getDifficultyLabel,
		getDifficultyColor,
		calculateGidouilles,
		getAttemptStatusLabel,
		getAttemptStatusColor,
		formatAttemptNumber
	} from '$lib/types/riddle';
	import { validateRiddleAnswer, isAnswerComplete } from '$lib/utils/riddle-validator';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import RiddleNumericalInput from '$lib/components/riddles/inputs/RiddleNumericalInput.svelte';
	import RiddleTextInput from '$lib/components/riddles/inputs/RiddleTextInput.svelte';
	import RiddleQcmInput from '$lib/components/riddles/inputs/RiddleQcmInput.svelte';
	import RiddleMathInput from '$lib/components/riddles/inputs/RiddleMathInput.svelte';
	import RiddleManualInput from '$lib/components/riddles/inputs/RiddleManualInput.svelte';
	import { cn } from '$lib/utils';
	import { MarkdownRenderer } from '$lib/components/markdown';
	import { Send, CheckCircle2, XCircle, Clock } from 'lucide-svelte';

	// Props
	interface Props {
		riddle: DbRiddle;
		mode?: 'display' | 'interactive';
		showCorrection?: boolean;
		onSubmit?: (answer: unknown) => void;
		size?: 'sm' | 'md' | 'lg';
		studentAttempt?: DbRiddleAttempt | null;
		loading?: boolean;
	}

	let {
		riddle,
		mode = 'display',
		showCorrection = false,
		onSubmit,
		size = 'md',
		studentAttempt = null,
		loading = false
	}: Props = $props();

	// ============================================================================
	// STATE MANAGEMENT
	// ============================================================================

	// Answer state based on type
	let numericalAnswer = $state<string | number>('');
	let textAnswer = $state('');
	let qcmSelectedIndices = $state<number[]>([]);
	let mathAnswer = $state('');
	let manualAnswer = $state('');

	// Submission state
	let isSubmitted = $state(false);
	let validationResult = $state<{ isCorrect: boolean; message?: string } | null>(null);

	// Calculate next attempt number
	const nextAttemptNumber = $derived((studentAttempt?.attempt_number || 0) + 1);
	const potentialGidouilles = $derived(calculateGidouilles(riddle.difficulty, nextAttemptNumber));

	// ============================================================================
	// DERIVED STATE
	// ============================================================================

	const hasAnswer = $derived(riddle.answer !== null);
	const answerType = $derived(riddle.answer?.type);

	const canSubmit = $derived.by(() => {
		if (!mode || mode !== 'interactive' || isSubmitted || loading) return false;

		let answer: unknown;
		switch (answerType) {
			case 'numerical':
				answer = numericalAnswer;
				break;
			case 'text':
				answer = textAnswer;
				break;
			case 'qcm':
				answer = qcmSelectedIndices;
				break;
			case 'math':
				answer = mathAnswer;
				break;
			default:
				// Manual validation
				answer = manualAnswer;
				break;
		}

		return isAnswerComplete(answer, answerType || 'text');
	});

	// ============================================================================
	// HANDLERS
	// ============================================================================

	function handleSubmit() {
		if (!canSubmit) return;

		let answer: unknown;

		switch (answerType) {
			case 'numerical':
				answer = parseFloat(String(numericalAnswer));
				break;
			case 'text':
				answer = textAnswer.trim();
				break;
			case 'qcm':
				answer = riddle.answer?.options?.multipleAnswers
					? qcmSelectedIndices
					: qcmSelectedIndices[0];
				break;
			case 'math':
				answer = mathAnswer.trim();
				break;
			default:
				// Manual validation
				answer = manualAnswer.trim();
				break;
		}

		// Client-side validation (if automatic)
		if (hasAnswer) {
			validationResult = validateRiddleAnswer(answer, riddle.answer);
		}

		isSubmitted = true;
		onSubmit?.(answer);
	}

	// ============================================================================
	// SIZE CLASSES
	// ============================================================================

	const sizeClasses = {
		sm: 'max-w-md',
		md: 'max-w-2xl',
		lg: 'max-w-4xl'
	};
</script>

<!-- Riddle Display Component -->
<div class={cn('riddle-card-wrapper mx-auto w-full', sizeClasses[size])}>
	<Card.Root class="h-full">
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex flex-wrap items-center gap-2">
					<Card.Title>Énigme #{riddle.riddle_number}</Card.Title>
					{#if riddle.genre}
						<Badge variant="outline" class="text-xs">{riddle.genre}</Badge>
					{/if}
				</div>
				<Badge class={getDifficultyColor(riddle.difficulty)}>
					{getDifficultyLabel(riddle.difficulty)}
				</Badge>
			</div>
			{#if riddle.title}
				<Card.Description class="text-base font-semibold">{riddle.title}</Card.Description>
			{/if}

			<!-- Student Attempt Info -->
			{#if studentAttempt}
				<div class="mt-2 flex flex-wrap items-center gap-2">
					<Badge class={getAttemptStatusColor(studentAttempt.is_correct)}>
						{getAttemptStatusLabel(studentAttempt.is_correct)}
					</Badge>
					<Badge variant="outline">
						{formatAttemptNumber(studentAttempt.attempt_number)} tentative
					</Badge>
					{#if studentAttempt.gidouilles_awarded > 0}
						<Badge variant="outline" class="bg-yellow-50 dark:bg-yellow-950">
							+{studentAttempt.gidouilles_awarded} gidouilles
						</Badge>
					{/if}
				</div>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-6">
			<!-- Riddle Statement -->
			<div class="statement-section">
				<h3 class="mb-3 text-lg font-semibold">Énoncé</h3>
				<div class="statement-content rounded-lg border bg-card p-4">
					<!-- Rich text content -->
					<div class="prose max-w-none dark:prose-invert">
						<MarkdownRenderer content={riddle.statement} />
					</div>

					<!-- Image if present -->
					{#if riddle.image_url}
						<img
							src={riddle.image_url}
							alt="Illustration de l'énigme"
							class="my-4 max-w-full rounded-lg"
						/>
					{/if}
				</div>
			</div>

			<!-- Answer Section (Interactive Mode) -->
			{#if mode === 'interactive' && !isSubmitted}
				<div class="answer-section">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-lg font-semibold">Votre réponse</h3>
						<Badge variant="outline" class="bg-green-50 dark:bg-green-950">
							+{potentialGidouilles} gidouilles si correct
						</Badge>
					</div>

					<!-- Type-specific inputs -->
					{#if answerType === 'numerical'}
						<RiddleNumericalInput bind:value={numericalAnswer} onSubmit={handleSubmit} />
					{:else if answerType === 'text'}
						<RiddleTextInput bind:value={textAnswer} onSubmit={handleSubmit} />
					{:else if answerType === 'qcm'}
						<RiddleQcmInput
							choices={riddle.answer?.options?.choices || []}
							bind:selectedIndices={qcmSelectedIndices}
							multipleAnswers={riddle.answer?.options?.multipleAnswers}
						/>
					{:else if answerType === 'math'}
						<RiddleMathInput bind:value={mathAnswer} onSubmit={handleSubmit} />
					{:else}
						<!-- Manual validation -->
						<RiddleManualInput bind:value={manualAnswer} />
					{/if}

					<!-- Submit Button -->
					<div class="mt-4 flex justify-center">
						<Button onclick={handleSubmit} disabled={!canSubmit || loading} size="lg">
							<Send class="mr-2 h-4 w-4" />
							{loading
								? 'Envoi en cours...'
								: hasAnswer
									? 'Valider ma réponse'
									: 'Demander validation'}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Validation Result (After Submission with Automatic Validation) -->
			{#if isSubmitted && validationResult}
				<div
					class={cn(
						'result-section rounded-lg border-2 p-4',
						validationResult.isCorrect
							? 'border-green-500 bg-green-50 dark:bg-green-950'
							: 'border-red-500 bg-red-50 dark:bg-red-950'
					)}
				>
					<div class="flex items-center gap-3">
						{#if validationResult.isCorrect}
							<CheckCircle2 class="h-8 w-8 text-green-600 dark:text-green-400" />
							<div>
								<p class="font-semibold text-green-700 dark:text-green-300">
									Bravo ! Réponse correcte !
								</p>
								<p class="text-sm text-green-600 dark:text-green-400">
									Vous avez gagné {potentialGidouilles} gidouilles
								</p>
							</div>
						{:else}
							<XCircle class="h-8 w-8 text-red-600 dark:text-red-400" />
							<div>
								<p class="font-semibold text-red-700 dark:text-red-300">Réponse incorrecte</p>
								<p class="text-sm text-red-600 dark:text-red-400">
									Vous pouvez réessayer (récompense réduite)
								</p>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Pending Manual Validation -->
			{#if isSubmitted && !validationResult}
				<div
					class="result-section rounded-lg border-2 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950"
				>
					<div class="flex items-center gap-3">
						<Clock class="h-8 w-8 text-blue-600 dark:text-blue-400" />
						<div>
							<p class="font-semibold text-blue-700 dark:text-blue-300">En attente de validation</p>
							<p class="text-sm text-blue-600 dark:text-blue-400">
								Votre professeur validera votre réponse prochainement
							</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Correction Section (Teachers Only) -->
			{#if showCorrection}
				<div class="correction-section">
					<h3 class="mb-3 text-lg font-semibold text-primary">
						Correction (visible professeur uniquement)
					</h3>
					<div
						class="correction-content rounded-lg border border-primary/30 bg-primary/5 p-4 dark:bg-primary/10"
					>
						<div class="prose max-w-none dark:prose-invert">
							<MarkdownRenderer content={riddle.correction} />
						</div>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* ============================================================================
	 * CONTENT SECTIONS
	 * ============================================================================ */

	.statement-section,
	.answer-section,
	.correction-section,
	.result-section {
		animation: fadeIn 0.3s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* ============================================================================
	 * RICH TEXT STYLING
	 * ============================================================================ */

	.prose :global(math-inline) {
		display: inline-block;
		margin: 0 2px;
	}

	.prose :global(math-display) {
		display: block;
		margin: 1rem 0;
		text-align: center;
	}

	/* ============================================================================
	 * FONT SCALING
	 * ============================================================================ */

	.riddle-card-wrapper {
		font-size: calc(1rem * var(--font-scale, 1));
	}
</style>
