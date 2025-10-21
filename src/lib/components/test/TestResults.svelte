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
	import MathDisplay from '$lib/components/MathDisplay.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, RotateCw, Check, X, Clock, TrendingUp } from 'lucide-svelte';
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
	<Card.Root>
		<Card.Header>
			<Card.Title>Détail des réponses</Card.Title>
			<Card.Description>Cliquez sur une question pour voir la correction</Card.Description>
		</Card.Header>
		<Card.Content>
			<Accordion.Root multiple class="w-full">
				{#each result.answers as answerResult, index}
					<Accordion.Item value={`question-${index}`}>
						<Accordion.Trigger class="hover:no-underline">
							<div class="flex w-full items-center justify-between pr-4 text-left">
								<span class="font-medium">Question {index + 1}</span>
								<Badge variant={answerResult.isCorrect ? 'default' : 'destructive'}>
									{#if answerResult.isCorrect}
										<Check class="mr-1 h-3 w-3" />
										Correct
									{:else}
										<X class="mr-1 h-3 w-3" />
										Incorrect
									{/if}
								</Badge>
							</div>
						</Accordion.Trigger>
						<Accordion.Content>
							<div class="space-y-4 pt-4">
								<!-- Statement -->
								<div>
									<h4 class="mb-2 font-semibold">Énoncé</h4>
									<div class="rounded-lg border bg-muted/30 p-4">
										{#each answerResult.instance.statement as field}
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

								<!-- User answer (if exists) -->
								{#if answerResult.userAnswer}
									<div>
										<h4 class="mb-2 font-semibold">Votre réponse</h4>
										<div
											class={cn(
												'rounded-lg border-2 p-4',
												answerResult.isCorrect
													? 'border-green-600 bg-green-100 dark:bg-green-950'
													: 'border-red-600 bg-red-100 dark:bg-red-950'
											)}
										>
											{#if Array.isArray(answerResult.userAnswer.value)}
												<ul class="space-y-1">
													{#each answerResult.userAnswer.value as val}
														<li><MathDisplay text={String(val)} /></li>
													{/each}
												</ul>
											{:else}
												<MathDisplay text={String(answerResult.userAnswer.value)} />
											{/if}
										</div>
									</div>
								{/if}

								<!-- Correct answer -->
								<div>
									<h4 class="mb-2 font-semibold">Réponse correcte</h4>
									<div
										class="rounded-lg border-2 border-green-600 bg-green-100 p-4 dark:bg-green-950"
									>
										{#if Array.isArray(answerResult.instance.answer)}
											<ul class="space-y-1">
												{#each answerResult.instance.answer as ans}
													<li><MathDisplay text={String(ans)} /></li>
												{/each}
											</ul>
										{:else}
											<MathDisplay text={String(answerResult.instance.answer)} />
										{/if}
									</div>
								</div>

								<!-- Correction/Explanation -->
								{#if answerResult.instance.correction && answerResult.instance.correction.length > 0}
									<div>
										<h4 class="mb-2 font-semibold">Explication</h4>
										<div class="space-y-2 rounded-lg border bg-muted/50 p-4">
											{#each answerResult.instance.correction as field}
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

								<!-- Stats -->
								{#if answerResult.timeSpent || answerResult.attempts}
									<div class="flex gap-4 text-sm text-muted-foreground">
										{#if answerResult.timeSpent}
											<span>Temps : {answerResult.timeSpent}s</span>
										{/if}
										{#if answerResult.attempts}
											<span>Tentatives : {answerResult.attempts}</span>
										{/if}
									</div>
								{/if}
							</div>
						</Accordion.Content>
					</Accordion.Item>
				{/each}
			</Accordion.Root>
		</Card.Content>
	</Card.Root>

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
