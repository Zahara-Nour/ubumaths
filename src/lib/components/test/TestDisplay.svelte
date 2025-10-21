<!--
	TestDisplay Component
	=====================
	Display/Revision mode - questions slideshow

	Features:
	- Questions display one by one with countdown based on delay
	- Pause/Play controls (FAB style)
	- Progress bar showing current question number
	- Auto-advance to next question when timer completes
	- At the end: choice to review all questions or see corrections

	Props:
	- session: TestSession - Active test session
	- onBack: () => void - Callback to return to cart
-->

<script lang="ts">
	import type { TestSession, TestAnswerResult } from '$lib/types/test';
	import type { CartItem } from '$lib/stores/questionCart.svelte';
	import TestTimer from './TestTimer.svelte';
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import { Pause, Play, ArrowLeft, Eye, BookOpen } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		session: TestSession;
		onBack: () => void;
	}

	let { session, onBack }: Props = $props();

	// State
	let currentIndex = $state(0);
	let isPaused = $state(false);
	let isCompleted = $state(false);
	let showReviewMode = $state<'all' | 'corrections' | null>(null);
	let timerKey = $state(0); // Key to force timer remount

	// Build a map of instance index to delay
	// Each CartItem may have multiple instances (quantity > 1)
	let instanceDelays = $derived(() => {
		const delays: number[] = [];
		for (const item of session.categories) {
			for (let i = 0; i < item.quantity; i++) {
				delays.push(item.delay);
			}
		}
		return delays;
	});

	// Derived values
	let currentInstance = $derived(session.instances[currentIndex]);
	let currentDelay = $derived(instanceDelays()[currentIndex] || 20);
	let progressPercentage = $derived(((currentIndex + 1) / session.instances.length) * 100);

	/**
	 * Handle timer completion - advance to next question
	 */
	function handleTimerComplete() {
		if (currentIndex < session.instances.length - 1) {
			currentIndex += 1;
			timerKey += 1; // Force timer remount with new duration
		} else {
			// Test completed
			isCompleted = true;
		}
	}

	/**
	 * Toggle pause/play
	 */
	function handleTogglePause() {
		isPaused = !isPaused;
	}

	/**
	 * Handle review all questions
	 */
	function handleReviewAll() {
		showReviewMode = 'all';
	}

	/**
	 * Handle show corrections
	 */
	function handleShowCorrections() {
		showReviewMode = 'corrections';
	}

	/**
	 * Handle back to question list
	 */
	function handleBackToQuestions() {
		showReviewMode = null;
	}
</script>

{#if !isCompleted && !showReviewMode}
	<!-- Display mode: show current question -->
	<div class="space-y-6">
		<!-- Header with progress -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Button variant="ghost" size="icon" onclick={onBack}>
						<ArrowLeft class="h-5 w-5" />
					</Button>
					<div>
						<h1 class="text-2xl font-bold">Mode Révision</h1>
						<p class="text-sm text-muted-foreground">
							Question {currentIndex + 1} sur {session.instances.length}
						</p>
					</div>
				</div>

				<!-- Timer - key ensures remount when question changes -->
				{#key timerKey}
					<TestTimer
						duration={currentDelay}
						{isPaused}
						size="md"
						onComplete={handleTimerComplete}
					/>
				{/key}
			</div>

			<!-- Progress bar -->
			<Progress value={progressPercentage} class="h-2" />
		</div>

		<!-- Question card -->
		<Card.Root class="relative">
			<Card.Header>
				<Card.Title>Énoncé</Card.Title>
			</Card.Header>

			<Card.Content class="space-y-4">
				<!-- Statement -->
				<div class="rounded-lg border bg-card p-6">
					{#each currentInstance.statement as field}
						{#if field.type === 'text'}
							<MathDisplay text={field.content} />
						{:else if field.type === 'image'}
							<img
								src={field.url}
								alt={field.alt || 'Question image'}
								class="my-4 max-w-full rounded-lg"
							/>
						{/if}
					{/each}
				</div>

				<!-- Hint -->
				<p class="text-center text-sm text-muted-foreground">
					{#if isPaused}
						Le minuteur est en pause
					{:else}
						Question suivante dans <span class="font-semibold">{currentDelay}</span> secondes
					{/if}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Floating Pause/Play button -->
		<button
			onclick={handleTogglePause}
			class="fixed right-8 bottom-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
			aria-label={isPaused ? 'Reprendre' : 'Pause'}
		>
			{#if isPaused}
				<Play class="h-8 w-8" />
			{:else}
				<Pause class="h-8 w-8" />
			{/if}
		</button>
	</div>
{:else if isCompleted && !showReviewMode}
	<!-- Completion screen: choose review mode -->
	<div class="mx-auto max-w-2xl space-y-6">
		<div class="text-center">
			<h1 class="text-3xl font-bold">Test terminé !</h1>
			<p class="mt-2 text-muted-foreground">
				Vous avez parcouru les {session.instances.length} questions.
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<!-- Review all -->
			<button onclick={handleReviewAll}>
				<Card.Root
					class="h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg"
				>
					<Card.Header>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-blue-100 p-3 dark:bg-blue-950">
								<Eye class="h-6 w-6 text-blue-600 dark:text-blue-400" />
							</div>
							<Card.Title>Revoir tout</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">
							Parcourez toutes les questions (énoncés uniquement) sur une seule page.
						</p>
					</Card.Content>
				</Card.Root>
			</button>

			<!-- Show corrections -->
			<button onclick={handleShowCorrections}>
				<Card.Root
					class="h-full cursor-pointer transition-all hover:border-primary hover:shadow-lg"
				>
					<Card.Header>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-green-100 p-3 dark:bg-green-950">
								<BookOpen class="h-6 w-6 text-green-600 dark:text-green-400" />
							</div>
							<Card.Title>Voir corrections</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">
							Affichez les réponses et explications détaillées pour chaque question.
						</p>
					</Card.Content>
				</Card.Root>
			</button>
		</div>

		<div class="text-center">
			<Button variant="outline" onclick={onBack}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Retour au panier
			</Button>
		</div>
	</div>
{:else if showReviewMode === 'all'}
	<!-- Review all questions (statements only) -->
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="icon" onclick={handleBackToQuestions}>
					<ArrowLeft class="h-5 w-5" />
				</Button>
				<div>
					<h1 class="text-2xl font-bold">Toutes les questions</h1>
					<p class="text-sm text-muted-foreground">{session.instances.length} questions</p>
				</div>
			</div>
		</div>

		<div class="space-y-4">
			{#each session.instances as instance, index}
				<Card.Root>
					<Card.Header>
						<Card.Title>Question {index + 1}</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border bg-muted/30 p-4">
							{#each instance.statement as field}
								{#if field.type === 'text'}
									<MathDisplay text={field.content} />
								{:else if field.type === 'image'}
									<img
										src={field.url}
										alt={field.alt || 'Question image'}
										class="my-4 max-w-full rounded-lg"
									/>
								{/if}
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<div class="text-center">
			<Button onclick={handleBackToQuestions}>Retour</Button>
		</div>
	</div>
{:else if showReviewMode === 'corrections'}
	<!-- Show corrections for all questions -->
	<div class="space-y-6">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<Button variant="ghost" size="icon" onclick={handleBackToQuestions}>
					<ArrowLeft class="h-5 w-5" />
				</Button>
				<div>
					<h1 class="text-2xl font-bold">Corrections</h1>
					<p class="text-sm text-muted-foreground">{session.instances.length} questions</p>
				</div>
			</div>
		</div>

		<div class="space-y-6">
			{#each session.instances as instance, index}
				<Card.Root>
					<Card.Header>
						<Card.Title>Question {index + 1}</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Statement -->
						<div>
							<h3 class="mb-2 font-semibold">Énoncé</h3>
							<div class="rounded-lg border bg-muted/30 p-4">
								{#each instance.statement as field}
									{#if field.type === 'text'}
										<MathDisplay text={field.content} />
									{:else if field.type === 'image'}
										<img
											src={field.url}
											alt={field.alt || 'Question image'}
											class="my-4 max-w-full rounded-lg"
										/>
									{/if}
								{/each}
							</div>
						</div>

						<!-- Answer -->
						<div>
							<h3 class="mb-2 font-semibold">Réponse</h3>
							<div class="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-950">
								{#if Array.isArray(instance.answer)}
									<ul class="space-y-1">
										{#each instance.answer as ans}
											<li><MathDisplay text={String(ans)} /></li>
										{/each}
									</ul>
								{:else}
									<MathDisplay text={String(instance.answer)} />
								{/if}
							</div>
						</div>

						<!-- Correction -->
						{#if instance.correction && instance.correction.length > 0}
							<div>
								<h3 class="mb-2 font-semibold">Explication</h3>
								<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
									{#each instance.correction as field}
										{#if field.type === 'text'}
											<MathDisplay text={field.content} />
										{:else if field.type === 'image'}
											<img
												src={field.url}
												alt={field.alt || 'Correction image'}
												class="my-2 max-w-full rounded-lg"
											/>
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<div class="text-center">
			<Button onclick={handleBackToQuestions}>Retour</Button>
		</div>
	</div>
{/if}
