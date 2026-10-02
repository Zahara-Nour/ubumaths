<!--
	EvaluationResults Component
	===========================
	Fin d'une évaluation notée (chantier 5, E19) : la note sur 20 et « x/n
	questions », puis la correction de chaque question avec SES points. Tout vient
	du SERVEUR (verdict, points, note, corrections, statut de chaque case — lot 2
	du résultat attendu) : rien n'est recalculé ici.

	Props:
	- result: EvaluationSubmitResponse - réponse de l'envoi
	- title?: string - titre de l'évaluation
-->

<script lang="ts">
	import type { EvaluationSubmitResponse } from '$lib/types/evaluation-attempt';
	import type { TestAnswerResult } from '$lib/types/test';
	import { formatGrade } from '$lib/types/evaluation';
	import CorrectionCard from '$lib/components/questions/CorrectionCard.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Clock } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	interface Props {
		result: EvaluationSubmitResponse;
		title?: string;
	}

	let { result, title }: Props = $props();

	const gradeColor = $derived(
		result.grade >= 14
			? 'text-green-600 dark:text-green-400'
			: result.grade >= 10
				? 'text-yellow-600 dark:text-yellow-400'
				: 'text-red-600 dark:text-red-400'
	);

	// Ce que `CorrectionCard` sait afficher : la réponse au format AnswerData
	const answerResults = $derived(
		result.questions.map<TestAnswerResult>((question, index) => ({
			index,
			instance: question.instance,
			isCorrect: question.isCorrect,
			userAnswer: question.answer
				? {
						value: question.answer.choiceIndexes ?? question.answer.values ?? [],
						isCorrect: question.isCorrect,
						timeSpent: 0,
						attempts: 1,
						submittedAt: ''
					}
				: undefined
		}))
	);

	function pointsLabel(points: number): string {
		return points === 1 ? '1 point' : points === 0.5 ? '½ point' : '0 point';
	}

	function pointsVariant(points: number): 'default' | 'secondary' | 'destructive' {
		return points === 1 ? 'default' : points === 0.5 ? 'secondary' : 'destructive';
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h1 class="text-3xl font-bold">Évaluation terminée</h1>
		{#if title}
			<p class="mt-2 text-muted-foreground">{title}</p>
		{/if}
	</div>

	<Card.Root class="border-2">
		<Card.Content class="space-y-2 py-8 text-center">
			<div class={cn('text-6xl font-bold', gradeColor)} data-testid="evaluation-grade">
				{formatGrade(result.grade)}
			</div>
			<p class="text-lg" data-testid="evaluation-questions-count">
				<span class="font-semibold">{result.correctCount}/{result.totalQuestions}</span>
				questions
			</p>
			<p class="text-sm text-muted-foreground">
				{result.pointsEarned.toLocaleString('fr-FR')} point{result.pointsEarned > 1 ? 's' : ''} sur {result.totalQuestions}
			</p>
			{#if result.late}
				<p class="flex items-center justify-center gap-2 text-sm text-destructive" role="alert">
					<Clock class="h-4 w-4" aria-hidden="true" />
					Ta copie est arrivée après la fin du temps : aucune réponse n'a pu être comptée.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>

	<div>
		<h2 class="mb-4 text-2xl font-bold">Correction</h2>
		<div class="grid gap-6 lg:grid-cols-2">
			{#each answerResults as answerResult, index (index)}
				<div class="space-y-2">
					<Badge
						variant={pointsVariant(result.questions[index].points)}
						data-testid="question-points"
					>
						{pointsLabel(result.questions[index].points)}
					</Badge>
					<CorrectionCard
						{answerResult}
						verdict={result.questions[index].detail}
						questionNumber={index + 1}
						size="md"
					/>
				</div>
			{/each}
		</div>
	</div>

	<div class="flex justify-center">
		<Button href="/dashboard/student/assessments">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Mes évaluations
		</Button>
	</div>
</div>
