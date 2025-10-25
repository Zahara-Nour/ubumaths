<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { formatAnswer } from '$lib/utils/game/challenge-variables';

	interface Props {
		success: boolean;
		studentAnswer: string | number;
		correctAnswer: string | number;
		timeTaken: number; // milliseconds
		oncontinue?: () => void;
	}

	let { success, studentAnswer, correctAnswer, timeTaken, oncontinue }: Props = $props();

	const formattedStudentAnswer = $derived(formatAnswer(studentAnswer));
	const formattedCorrectAnswer = $derived(formatAnswer(correctAnswer));
	const timeSeconds = $derived((timeTaken / 1000).toFixed(1));
</script>

<div
	class="challenge-result mx-auto max-w-2xl space-y-6 rounded-lg border p-8 text-center {success
		? 'border-green-500 bg-green-50 dark:bg-green-950/20'
		: 'border-red-500 bg-red-50 dark:bg-red-950/20'}"
>
	<!-- Result Icon & Message -->
	<div class="space-y-2">
		{#if success}
			<div class="text-6xl">✅</div>
			<h2 class="text-2xl font-bold text-green-600 dark:text-green-400">Bonne réponse !</h2>
			<p class="text-green-700 dark:text-green-300">Excellent travail !</p>
		{:else}
			<div class="text-6xl">❌</div>
			<h2 class="text-2xl font-bold text-red-600 dark:text-red-400">Mauvaise réponse</h2>
			<p class="text-red-700 dark:text-red-300">Pas de souci, tu feras mieux la prochaine fois !</p>
		{/if}
	</div>

	<!-- Answer Comparison -->
	<div class="space-y-3 rounded-md bg-background p-4">
		<div class="flex items-center justify-between">
			<span class="text-sm text-muted-foreground">Ta réponse :</span>
			<span class="font-mono text-lg font-bold {success ? 'text-green-600' : 'text-red-600'}">
				{formattedStudentAnswer}
			</span>
		</div>

		{#if !success}
			<div class="flex items-center justify-between">
				<span class="text-sm text-muted-foreground">Bonne réponse :</span>
				<span class="font-mono text-lg font-bold text-green-600">
					{formattedCorrectAnswer}
				</span>
			</div>
		{/if}

		<div class="flex items-center justify-between">
			<span class="text-sm text-muted-foreground">Temps :</span>
			<span class="font-mono text-lg font-medium">
				{timeSeconds}s
			</span>
		</div>
	</div>

	<!-- Continue Button -->
	{#if oncontinue}
		<Button onclick={oncontinue} size="lg" class="w-full">Continuer</Button>
	{/if}
</div>
