<script lang="ts">
	/**
	 * Le Cabinet Noir en direct : un message, un décalage, et le chiffre de César qui
	 * tourne sous les yeux. Le vrai module du Cabinet Noir (`caesarEncrypt`), sans l'établi.
	 */
	import { resolve } from '$app/paths';
	import { ALPHABET } from '$lib/ciphers/alphabet';
	import { caesarEncrypt } from '$lib/ciphers/caesar';

	// Constantes

	const MAX_LENGTH = 40;

	// Variables

	let message = $state('Père Ubu');
	let shift = $state(3);

	const ciphered = $derived(caesarEncrypt(message, shift).text);
	const shiftedAlphabet = $derived(caesarEncrypt(ALPHABET, shift).text);

	// Functions

	/** Décalage entre 1 et 25 : 0 et 26 ne cachent rien */
	function move(step: number) {
		shift = ((shift - 1 + step + 25) % 25) + 1;
	}
</script>

<div class="demo" data-testid="cipher-demo">
	<label class="field">
		<span>Ton message</span>
		<input
			type="text"
			bind:value={message}
			maxlength={MAX_LENGTH}
			autocomplete="off"
			spellcheck="false"
		/>
	</label>

	<div class="shift" role="group" aria-labelledby="cipher-shift-label">
		<span id="cipher-shift-label">Décalage</span>
		<button type="button" onclick={() => move(-1)} aria-label="Reculer d’un rang">−</button>
		<output aria-live="polite" aria-atomic="true"
			><span class="sr-only">Décalage :</span>
			<span data-testid="cipher-shift">{shift}</span></output
		>
		<button type="button" onclick={() => move(1)} aria-label="Avancer d’un rang">+</button>
	</div>

	<div class="alphabets" aria-hidden="true">
		<span>{ALPHABET}</span>
		<span class="shifted">{shiftedAlphabet}</span>
	</div>

	<!-- Un <div>, pas un <p> : `main p` impose sa taille (app.css) -->
	<div class="result">
		<!-- Pas d'annonce à chaque frappe (une <output> est une région live) : le résultat se lit
		     à la demande, sous son nom. Array.from : un émoji reste un seul caractère. -->
		<output data-testid="cipher-output" aria-live="off" aria-label="Message chiffré : {ciphered}">
			{#each Array.from(ciphered) as letter, i (`${i}-${letter}`)}<span
					class="letter"
					aria-hidden="true">{letter}</span
				>{/each}
		</output>
	</div>

	<a href={resolve('/(public)/chiffrement/cesar')} class="more">
		Ouvrir l’établi de César, avec chaque calcul <span aria-hidden="true">→</span>
	</a>
</div>

<style lang="postcss">
	@reference "../../../app.css";

	.demo {
		@apply flex flex-col gap-4;
	}
	.field {
		@apply flex flex-col gap-1 font-medium;
		font-size: calc(0.875rem * var(--font-scale, 1));
	}
	.field input {
		@apply min-h-11 rounded-lg border-2 border-foreground/50 bg-card px-3 py-2 text-base font-normal focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
	}
	.shift {
		@apply flex items-center gap-2 text-sm font-medium;
	}
	.shift button {
		@apply grid h-11 w-11 place-items-center rounded-lg border-2 border-foreground/50 bg-card text-lg transition-colors hover:border-foreground focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:outline-none;
	}
	.shift output {
		@apply w-8 text-center font-mono text-lg tabular-nums;
	}
	.alphabets {
		@apply flex flex-col overflow-x-auto rounded-md bg-muted/60 px-3 py-2 font-mono text-xs tracking-[0.3em] whitespace-nowrap text-foreground/75;
	}
	.alphabets .shifted {
		@apply text-foreground;
	}
	.result {
		@apply min-h-12 rounded-lg bg-foreground px-4 py-3 font-mono text-xl tracking-widest break-all text-background;
	}
	.letter {
		@apply inline-block whitespace-pre;
		animation: tourne 0.35s ease-out;
	}
	@keyframes tourne {
		from {
			transform: rotateX(90deg);
			opacity: 0;
		}
	}
	.more {
		@apply inline-flex min-h-11 items-center self-start rounded-sm font-medium underline decoration-primary decoration-2 underline-offset-4 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:outline-none;
		font-size: calc(0.875rem * var(--font-scale, 1));
	}
	@media (prefers-reduced-motion: reduce) {
		.letter {
			animation: none;
		}
	}
</style>
