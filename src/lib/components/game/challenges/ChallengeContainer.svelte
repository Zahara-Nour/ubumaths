<script lang="ts">
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	import { onMount } from 'svelte'; // For future challenge initialization
	import type { ChallengeInstance } from '$lib/types/game';
	import { interpolateQuestion } from '$lib/utils/game/challenge-variables';
	import { sanitizeHtml } from '$lib/utils/sanitize';
	import { Button } from '$lib/components/ui/button';
	import ChallengeTimer from './ChallengeTimer.svelte';
	import ChallengeInput from './ChallengeInput.svelte';

	interface Props {
		instance: ChallengeInstance;
		onsubmit: (answer: string | number, timeTaken: number) => void;
		ontimeout?: () => void;
		showHint?: boolean;
	}

	let { instance, onsubmit, ontimeout, showHint = true }: Props = $props();

	let timeRemaining = $state(instance.challenge.timer);
	let timerActive = $state(true);
	let answered = $state(false);
	let hintVisible = $state(false);

	// Interpolated question HTML
	const questionHtml = $derived(
		interpolateQuestion(instance.challenge.question, instance.variables)
	);

	// Time taken calculation
	const timeTaken = $derived(instance.challenge.timer - timeRemaining);

	function handleSubmit(answer: string | number) {
		if (answered) return;

		answered = true;
		timerActive = false;

		onsubmit(answer, timeTaken);
	}

	function handleTimeout() {
		if (answered) return;

		answered = true;
		timerActive = false;

		if (ontimeout) {
			ontimeout();
		} else {
			// Default: submit null answer on timeout
			onsubmit(null, instance.challenge.timer);
		}
	}

	function toggleHint() {
		hintVisible = !hintVisible;
	}
</script>

<div
	class="challenge-container mx-auto max-w-3xl space-y-6 rounded-lg border border-border bg-card p-6"
>
	<!-- Timer -->
	<ChallengeTimer
		bind:timeRemaining
		totalTime={instance.challenge.timer}
		active={timerActive}
		ontimeout={handleTimeout}
	/>

	<!-- Challenge Question -->
	<div class="challenge-question rounded-md bg-muted p-6">
		<div class="prose prose-sm max-w-none dark:prose-invert">
			{@html sanitizeHtml(questionHtml)}
		</div>
	</div>

	<!-- Challenge Input -->
	{#if !answered}
		<ChallengeInput onsubmit={handleSubmit} disabled={!timerActive} />
	{/if}

	<!-- Hint Section -->
	{#if showHint && instance.challenge.hint}
		<div class="hint-section">
			{#if !hintVisible}
				<Button onclick={toggleHint} variant="outline" size="sm">💡 Afficher l'indice</Button>
			{:else}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium">Indice :</span>
						<Button onclick={toggleHint} variant="ghost" size="sm">Masquer</Button>
					</div>
					<div class="rounded-md border border-border bg-muted/50 p-4 text-sm">
						{@html sanitizeHtml(instance.challenge.hint)}
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Challenge Info -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>Difficulté : {instance.challenge.difficulty}/5</span>
		<span>Type : {instance.challenge.category}</span>
		<span>Élément : {instance.challenge.element}</span>
	</div>
</div>

<style>
	.challenge-question :global(p) {
		margin-bottom: 0.5rem;
	}

	.challenge-question :global(strong) {
		color: hsl(var(--primary));
	}
</style>
