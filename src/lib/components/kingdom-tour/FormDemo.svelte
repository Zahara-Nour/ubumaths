<script lang="ts">
	/**
	 * « La forme compte » : quatre réponses au même exercice, et ce que le correcteur en
	 * dit. Les verdicts, remarques et points sont ceux du vrai correcteur (`form-demo.test.ts`).
	 * Aucun moteur de calcul n'est chargé : tout est écrit d'avance.
	 */
	import { FORM_DEMO } from '$lib/kingdom-tour/tour';

	let selected = $state(0);
	const answer = $derived(FORM_DEMO.answers[selected]);

	/** Les lettres en italique, comme au tableau */
	function parts(expression: string): { text: string; letter: boolean }[] {
		return expression.split(/([a-z])/).map((text) => ({ text, letter: /^[a-z]$/.test(text) }));
	}
</script>

{#snippet math(expression: string)}
	<span class="math"
		>{#each parts(expression) as part, i (i)}{#if part.letter}<i>{part.text}</i
				>{:else}{part.text}{/if}{/each}</span
	>
{/snippet}

<div class="demo" data-testid="form-demo">
	<p class="prompt">
		{FORM_DEMO.prompt}
		{@render math(FORM_DEMO.expression)}
	</p>

	<div class="choices" role="group" aria-label="Quatre réponses possibles">
		{#each FORM_DEMO.answers as choice, i (choice.latex)}
			<button
				type="button"
				class="choice"
				data-status={choice.status}
				aria-pressed={selected === i}
				onclick={() => (selected = i)}
			>
				{@render math(choice.display)}
			</button>
		{/each}
	</div>

	<div class="verdict" data-status={answer.status} aria-live="polite">
		<div class="verdict-head">
			<strong>{answer.verdict}</strong>
			<span class="points">{answer.points}</span>
		</div>
		<span class="remark">{answer.remark}</span>
	</div>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.demo {
		@apply flex flex-col gap-4;
	}
	.prompt {
		@apply font-medium;
	}
	.math {
		font-family: 'Lora', Georgia, serif;
		@apply text-lg whitespace-nowrap;
	}
	.choices {
		@apply grid grid-cols-2 gap-2;
	}
	.choice {
		@apply min-h-11 rounded-lg border-2 border-border bg-background px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	.choice[aria-pressed='true'] {
		@apply border-primary bg-primary/10 shadow-sm;
	}
	.verdict {
		@apply flex flex-col gap-1 rounded-lg border-l-4 bg-muted/60 px-4 py-3;
		border-left-color: var(--tone);
	}
	.verdict[data-status='correct'] {
		--tone: var(--color-success);
	}
	.verdict[data-status='unoptimal_form'] {
		--tone: var(--color-accent);
	}
	.verdict[data-status='bad_form'] {
		--tone: var(--color-warning);
	}
	.verdict[data-status='incorrect'] {
		--tone: var(--color-destructive);
	}
	.verdict-head {
		@apply flex items-baseline justify-between gap-3;
	}
	.verdict strong {
		font-family: 'Lora', Georgia, serif;
		@apply text-lg;
	}
	.points {
		@apply rounded-full px-2 py-0.5 text-sm font-semibold text-foreground;
		background-color: color-mix(in srgb, var(--tone) 30%, transparent);
	}
	.remark {
		@apply text-sm text-muted-foreground;
	}
	@media (prefers-reduced-motion: reduce) {
		.choice {
			@apply transition-none hover:translate-y-0;
		}
	}
</style>
