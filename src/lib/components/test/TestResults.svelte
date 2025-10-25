<!--
	TestResults Component
	=====================
	Display test results with score and corrections

	Features:
	- Score display (on 10 scale) with color coding
	- Statistics (time, average, percentage)
	- List of questions with accordion for corrections
	- Status badges (✓ Correct / ✗ Incorrect)
	- Buttons: Restart, Back to cart

	Props:
	- result: TestResult - Test result data
	- onRestart: () => void - Callback to restart test
	- onBackToCart: () => void - Callback to return to cart
-->

<script lang="ts">
	import type { TestResult } from '$lib/types/test';
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, RotateCw, Clock, TrendingUp } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		result: TestResult;
		onRestart: () => void;
		onBackToCart: () => void;
	}

	let { result, onRestart, onBackToCart }: Props = $props();

	// Derived values
	let scoreColor = $derived(
		result.score >= 8
			? 'text-green-600 dark:text-green-400'
			: result.score >= 5
				? 'text-yellow-600 dark:text-yellow-400'
				: 'text-red-600 dark:text-red-400'
	);

	let scoreBgColor = $derived(
		result.score >= 8
			? 'bg-green-100 dark:bg-green-950'
			: result.score >= 5
				? 'bg-yellow-100 dark:bg-yellow-950'
				: 'bg-red-100 dark:bg-red-950'
	);

	let timeDisplay = $derived(() => {
		const minutes = Math.floor(result.timeSpent / 60);
		const seconds = result.timeSpent % 60;
		return minutes > 0 ? `${minutes}min ${seconds}s` : `${seconds}s`;
	});

	let averageTimeDisplay = $derived(() => {
		const seconds = Math.round(result.averageTime);
		return `${seconds}s`;
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="text-center">
		<h1 class="text-3xl font-bold">Résultats du test</h1>
		<p class="mt-2 text-muted-foreground">
			{result.mode === 'interactive' ? 'Mode Quiz' : 'Course aux nombres'}
		</p>
	</div>

	<!-- Score card (hero) -->
	<Card.Root class={cn('border-2', scoreBgColor)}>
		<Card.Content class="py-8">
			<div class="text-center">
				<div class={cn('mb-4 text-6xl font-bold', scoreColor)}>{result.score}/10</div>

				<div class="space-y-2">
					<p class="text-lg">
						<span class="font-semibold">{result.correctAnswers}</span> sur
						<span class="font-semibold">{result.totalQuestions}</span> bonnes réponses
					</p>
					<p class="text-muted-foreground">({Math.round(result.scorePercentage)}%)</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Statistics -->
	<div class="grid gap-4 sm:grid-cols-2">
		<!-- Time spent -->
		<Card.Root>
			<Card.Content class="flex items-center gap-4 p-6">
				<div class="rounded-lg bg-blue-100 p-3 dark:bg-blue-950">
					<Clock class="h-6 w-6 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Temps total</p>
					<p class="text-2xl font-bold">{timeDisplay()}</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Average time -->
		<Card.Root>
			<Card.Content class="flex items-center gap-4 p-6">
				<div class="rounded-lg bg-purple-100 p-3 dark:bg-purple-950">
					<TrendingUp class="h-6 w-6 text-purple-600 dark:text-purple-400" />
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Temps moyen</p>
					<p class="text-2xl font-bold">{averageTimeDisplay()}/question</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Questions and corrections -->
	<div>
		<div class="mb-4">
			<h2 class="text-2xl font-bold">Détail des réponses</h2>
			<p class="text-sm text-muted-foreground">
				Cliquez sur le bouton de rotation pour voir la correction détaillée
			</p>
		</div>

		<!-- Grid of correction cards -->
		<div class="grid gap-6 lg:grid-cols-2">
			{#each result.answers as answerResult, index (index)}
				<CorrectionCard {answerResult} questionNumber={index + 1} size="md" />
			{/each}
		</div>
	</div>

	<!-- Actions -->
	<div class="flex flex-col gap-4 sm:flex-row sm:justify-center">
		<Button variant="outline" onclick={onBackToCart}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour au panier
		</Button>
		<Button onclick={onRestart}>
			<RotateCw class="mr-2 h-4 w-4" />
			Recommencer avec de nouvelles questions
		</Button>
	</div>
</div>
