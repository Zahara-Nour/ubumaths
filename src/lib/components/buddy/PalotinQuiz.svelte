<!--
	PalotinQuiz
	=============
	Full-screen overlay quiz for choosing a Palotin companion.
	Flow: title → 4 questions → result → choice → confirmation → POST to API.
-->

<script lang="ts">
	import type { PalotinType } from '$lib/config/buddy-messages';
	import type { BuddyQuizAnswer } from '$lib/types/buddy';
	import { QUIZ_QUESTIONS } from '$lib/config/buddy-quiz';
	import { scoreQuiz } from '$lib/utils/buddy-xp';
	import { studentCache } from '$lib/stores/studentDashboardCache.svelte';
	import PalotinQuizQuestion from './PalotinQuizQuestion.svelte';
	import PalotinResult from './PalotinResult.svelte';
	import BuddyAvatar from './BuddyAvatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		onComplete: () => void;
	}

	let { onComplete }: Props = $props();

	type QuizStep = 'intro' | 'question' | 'result';

	let step = $state<QuizStep>('intro');
	let currentQuestion = $state(0);
	let answers = $state<BuddyQuizAnswer[]>([]);
	let quizResult = $state<{ suggested: PalotinType; scores: Record<PalotinType, number> } | null>(
		null
	);
	let isSubmitting = $state(false);

	function startQuiz() {
		step = 'question';
		currentQuestion = 0;
		answers = [];
	}

	function handleAnswer(answerIndex: number) {
		const question = QUIZ_QUESTIONS[currentQuestion];
		const palotin = question.answers[answerIndex].palotin;

		answers = [...answers, { question: currentQuestion, palotin }];

		if (currentQuestion < QUIZ_QUESTIONS.length - 1) {
			currentQuestion += 1;
		} else {
			// Quiz complete — calculate result
			quizResult = scoreQuiz(answers);
			step = 'result';
		}
	}

	async function handleChoose(palotin: PalotinType) {
		if (isSubmitting) return;
		isSubmitting = true;

		try {
			const response = await fetch('/api/student/buddy', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ palotinType: palotin })
			});

			if (!response.ok) {
				const data = await response.json().catch(() => ({}));
				throw new Error(data.message || 'Erreur lors du choix');
			}

			const { buddy } = await response.json();
			studentCache.hydrateBuddy(buddy);
			toaster.success(
				`${palotin.charAt(0).toUpperCase() + palotin.slice(1)} est ton nouveau compagnon !`
			);
			onComplete();
		} catch (err) {
			console.error('❌ [PalotinQuiz] Error choosing palotin:', err);
			toaster.error('Erreur lors du choix du Palotin');
			isSubmitting = false;
		}
	}
</script>

<!-- Full-screen overlay -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
	transition:fade={{ duration: 300 }}
>
	<div class="w-full max-w-2xl">
		{#if step === 'intro'}
			<div class="flex flex-col items-center gap-6 px-4" in:fade={{ duration: 200 }}>
				<h1 class="text-center text-2xl font-bold md:text-3xl">Choisis ton Palotin !</h1>
				<p class="max-w-md text-center text-muted-foreground">
					Un Palotin est un compagnon qui t'accompagne dans tes maths. Reponds a 4 questions pour
					decouvrir lequel te correspond le mieux.
				</p>

				<!-- 3 silhouettes -->
				<div class="flex gap-6">
					<BuddyAvatar palotin="giron" expression="neutral" size="sm" />
					<BuddyAvatar palotin="pile" expression="neutral" size="sm" />
					<BuddyAvatar palotin="cotice" expression="neutral" size="sm" />
				</div>

				<Button size="lg" onclick={startQuiz}>C'est parti !</Button>
			</div>
		{:else if step === 'question'}
			<PalotinQuizQuestion
				question={QUIZ_QUESTIONS[currentQuestion]}
				questionNumber={currentQuestion + 1}
				totalQuestions={QUIZ_QUESTIONS.length}
				onAnswer={handleAnswer}
			/>
		{:else if step === 'result' && quizResult}
			<PalotinResult
				suggested={quizResult.suggested}
				scores={quizResult.scores}
				onChoose={handleChoose}
			/>
		{/if}
	</div>
</div>
