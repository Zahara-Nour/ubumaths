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
		<output aria-live="polite" data-testid="cipher-shift">{shift}</output>
		<button type="button" onclick={() => move(1)} aria-label="Avancer d’un rang">+</button>
	</div>

	<div class="alphabets" aria-hidden="true">
		<span>{ALPHABET}</span>
		<span class="shifted">{shiftedAlphabet}</span>
	</div>

	<!-- Un <div>, pas un <p> : `main p` impose sa taille (app.css) -->
	<div class="result">
		<span class="sr-only">Message chiffré :</span>
		<output data-testid="cipher-output">
			{#each ciphered.split('') as letter, i (`${i}-${letter}`)}<span class="letter">{letter}</span
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
		@apply flex flex-col gap-1 text-sm font-medium;
	}
	.field input {
		@apply min-h-11 rounded-lg border-2 border-border bg-background px-3 py-2 text-base font-normal focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	.shift {
		@apply flex items-center gap-2 text-sm font-medium;
	}
	.shift button {
		@apply grid h-11 w-11 place-items-center rounded-lg border-2 border-border bg-background text-lg transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	.shift output {
		@apply w-8 text-center font-mono text-lg tabular-nums;
	}
	.alphabets {
		@apply flex flex-col overflow-x-auto rounded-md bg-muted/60 px-3 py-2 font-mono text-xs tracking-[0.3em] whitespace-nowrap text-muted-foreground;
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
		@apply self-start rounded-sm text-sm font-medium underline decoration-primary decoration-2 underline-offset-4 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none;
	}
	@media (prefers-reduced-motion: reduce) {
		.letter {
			animation: none;
		}
	}
</style>
