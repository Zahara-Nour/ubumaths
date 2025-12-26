<script lang="ts">
	/**
	 * AnswerPrompt - Modal/inline component for answering a question
	 *
	 * Shows the question in French, reminds player of their secret number,
	 * and provides Yes/No buttons to answer.
	 */

	import { Button } from '$lib/components/ui/button';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { QUESTION_INFO, type QuestionType } from '$lib/types/guess-who';
	import { cn } from '$lib/utils';
	import { Loader2 } from 'lucide-svelte';

	interface Props {
		question: { type: QuestionType; param?: number };
		mySecretNumber: number;
		onAnswer: (answer: boolean) => void;
		timer: number;
		isSubmitting?: boolean;
		class?: string;
	}

	let {
		question,
		mySecretNumber,
		onAnswer,
		timer,
		isSubmitting = false,
		class: className = ''
	}: Props = $props();

	// Format the question text in French
	const questionText = $derived.by(() => {
		const info = QUESTION_INFO.find((q) => q.type === question.type);
		if (!info) return question.type;

		let text = info.labelFr;
		if (question.param !== undefined) {
			text = text.replace('...', String(question.param));
		}

		return text;
	});

	// Timer visual state
	const timerColor = $derived.by(() => {
		if (timer > 30) return 'text-green-600 dark:text-green-400';
		if (timer > 10) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-destructive';
	});

	const shouldPulse = $derived(timer <= 10);

	function handleYes() {
		if (!isSubmitting) onAnswer(true);
	}

	function handleNo() {
		if (!isSubmitting) onAnswer(false);
	}
</script>

<div class={cn('answer-prompt', className)}>
	<Card class="border-orange-500 bg-orange-50 p-6 dark:bg-orange-950/30">
		<!-- Header -->
		<div class="mb-4 text-center">
			<Badge
				variant="secondary"
				class="mb-2 bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200"
			>
				Question de votre adversaire
			</Badge>
			<h2 class="text-xl font-bold text-foreground">Repondez a la question !</h2>
		</div>

		<!-- Timer -->
		<div class="mb-4 flex justify-center">
			<span
				class={cn(
					'font-mono text-3xl font-bold transition-colors',
					timerColor,
					shouldPulse && 'animate-pulse'
				)}
			>
				{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
			</span>
		</div>

		<Separator class="my-4" />

		<!-- Secret number reminder -->
		<div class="mb-4 rounded-lg bg-background p-4 text-center">
			<p class="text-sm text-muted-foreground">Votre nombre secret est :</p>
			<p class="text-4xl font-bold text-primary">{mySecretNumber}</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Repondez honnetement en fonction de ce nombre
			</p>
		</div>

		<!-- Question display -->
		<div class="mb-6 rounded-lg bg-background p-4">
			<p class="text-center text-lg font-semibold text-foreground">
				{questionText}
			</p>
		</div>

		<!-- Answer buttons -->
		<div class="flex gap-4">
			<Button
				onclick={handleYes}
				disabled={isSubmitting}
				class="flex-1 bg-green-600 py-6 text-lg font-bold text-white hover:bg-green-700"
				size="lg"
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-5 w-5 animate-spin" />
				{/if}
				Oui
			</Button>
			<Button
				onclick={handleNo}
				disabled={isSubmitting}
				class="flex-1 bg-red-600 py-6 text-lg font-bold text-white hover:bg-red-700"
				size="lg"
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-5 w-5 animate-spin" />
				{/if}
				Non
			</Button>
		</div>

		<!-- Help text -->
		<p class="mt-4 text-center text-xs text-muted-foreground">
			Attention : si vous mentez, votre adversaire gagne un tour bonus !
		</p>
	</Card>
</div>

<style>
	.answer-prompt {
		width: 100%;
		max-width: 500px;
		margin: 0 auto;
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	.animate-pulse {
		animation: pulse 1s ease-in-out infinite;
	}
</style>
