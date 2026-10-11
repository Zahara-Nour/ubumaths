<script lang="ts">
	/**
	 * « La forme compte » : quatre réponses au même exercice, et ce que le correcteur en
	 * dit. Les verdicts, remarques et points sont ceux du vrai correcteur (`form-demo.test.ts`).
	 * Aucun moteur de calcul n'est chargé : tout est écrit d'avance.
	 *
	 * Une seule réponse choisie parmi quatre : un groupe de boutons radio (flèches pour se
	 * déplacer, une seule tabulation pour entrer dans le groupe).
	 */
	import { FORM_DEMO } from '$lib/kingdom-tour/tour';

	let selected = $state(0);
	let buttons: HTMLButtonElement[] = $state([]);
	const answer = $derived(FORM_DEMO.answers[selected]);

	/** Les lettres en italique, comme au tableau */
	function parts(expression: string): { text: string; letter: boolean }[] {
		return expression.split(/([a-z])/).map((text) => ({ text, letter: /^[a-z]$/.test(text) }));
	}

	/** Flèches : réponse précédente ou suivante, en boucle, comme un groupe radio natif */
	function onkeydown(event: KeyboardEvent) {
		const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
		if (!step) return;
		event.preventDefault();
		const count = FORM_DEMO.answers.length;
		selected = (selected + step + count) % count;
		buttons[selected]?.focus();
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

	<div class="choices" role="radiogroup" aria-label="Quatre réponses possibles" tabindex="-1">
		{#each FORM_DEMO.answers as choice, i (choice.latex)}
			<button
				bind:this={buttons[i]}
				type="button"
				role="radio"
				class="choice"
				aria-checked={selected === i}
				tabindex={selected === i ? 0 : -1}
				onclick={() => (selected = i)}
				{onkeydown}
			>
				{@render math(choice.display)}
			</button>
		{/each}
	</div>

	<div class="verdict" data-status={answer.status} aria-live="polite" aria-atomic="true">
		<div class="verdict-head">
			<strong>{answer.verdict}</strong>
			<span class="points">{answer.points}</span>
		</div>
		<p class="remark">{answer.remark}</p>
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
		font-size: calc(1.125rem * var(--font-scale, 1));
	}
	/* Une colonne sur les écrans très étroits : à 320 px, deux colonnes débordaient */
	.choices {
		@apply grid grid-cols-1 gap-2 min-[400px]:grid-cols-2;
	}
	/* Bordures à ≥ 3:1 du fond (la bordure du thème est à 1,3:1) ; focus en couleur du texte */
	.choice {
		@apply min-h-11 min-w-0 rounded-lg border-2 border-foreground/50 bg-card px-3 py-2 transition-all hover:-translate-y-0.5 hover:border-foreground focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
	}
	/* Choisie : fond plein, lisible sans dépendre d'une nuance de couleur */
	.choice[aria-checked='true'] {
		@apply border-foreground bg-primary text-primary-foreground shadow-sm;
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
		font-size: calc(1.125rem * var(--font-scale, 1));
	}
	.points {
		@apply rounded-full px-2 py-0.5 font-semibold text-foreground;
		font-size: calc(0.875rem * var(--font-scale, 1));
		background-color: color-mix(in srgb, var(--tone) 30%, transparent);
	}
	/* `main p` impose 1rem : une classe l'emporte, en gardant l'échelle A−/A+ */
	.remark {
		@apply text-foreground/80;
		font-size: calc(0.875rem * var(--font-scale, 1)) !important;
		line-height: 1.45 !important;
	}
	@media (prefers-reduced-motion: reduce) {
		.choice {
			@apply transition-none hover:translate-y-0;
		}
	}
</style>
