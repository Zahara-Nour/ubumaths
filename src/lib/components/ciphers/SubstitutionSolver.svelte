<!--
	Décryptage manuel d'une substitution : l'élève compare les fréquences, puis
	propose « cette lettre chiffrée cache un E » et voit le message se révéler.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { lettersOnly } from '$lib/ciphers/alphabet';
	import { letterFrequencies } from '$lib/ciphers/frequency';
	import { applyGuesses, guessConflicts } from '$lib/ciphers/solver';
	import FrequencyChart from './FrequencyChart.svelte';

	// Props
	let { text }: { text: string } = $props();

	// State
	let guesses = $state<Record<string, string>>({});

	const present = $derived(
		letterFrequencies(text)
			.letters.filter((l) => l.count > 0)
			.sort((a, b) => b.count - a.count)
	);
	const revealed = $derived(applyGuesses(text, guesses));
	const conflicts = $derived(guessConflicts(guesses));

	// Functions
	function setGuess(cipherLetter: string, event: Event & { currentTarget: HTMLInputElement }) {
		const value = lettersOnly(event.currentTarget.value).slice(-1);
		event.currentTarget.value = value;
		const next = { ...guesses };
		if (value) next[cipherLetter] = value;
		else delete next[cipherLetter];
		guesses = next;
	}
</script>

<div class="flex flex-col gap-6">
	<FrequencyChart {text} />

	{#if present.length > 0}
		<section class="flex flex-col gap-3" aria-labelledby="solver-title">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<h3 id="solver-title" class="font-semibold">Vos hypothèses</h3>
				<Button variant="ghost" size="sm" onclick={() => (guesses = {})}>Tout effacer</Button>
			</div>
			<p class="text-sm text-muted-foreground">
				Sous chaque lettre chiffrée (la plus fréquente d'abord), écrivez la lettre claire qu'elle
				cache selon vous.
			</p>
			<div class="flex flex-wrap gap-2">
				{#each present as { letter, count } (letter)}
					<label class="flex w-12 flex-col items-center gap-1 font-mono">
						<span class="font-bold">{letter}</span>
						<span class="text-xs text-muted-foreground">×{count}</span>
						<Input
							class="h-9 w-10 px-0 text-center uppercase"
							value={guesses[letter] ?? ''}
							oninput={(event) => setGuess(letter, event)}
							aria-label={`Lettre claire cachée par ${letter}`}
							maxlength={2}
						/>
					</label>
				{/each}
			</div>
			{#if conflicts.length > 0}
				<p class="text-sm text-destructive" role="alert">
					{conflicts.length > 1 ? 'Les lettres' : 'La lettre'}
					{conflicts.join(', ')}
					{conflicts.length > 1 ? 'sont proposées' : 'est proposée'} pour plusieurs lettres chiffrées
					: impossible dans une substitution.
				</p>
			{/if}
			<p
				class="rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
				data-testid="solver-revealed"
			>
				{#each revealed as c, i (i)}<span
						class={c.guessed ? 'font-bold text-primary' : 'text-muted-foreground'}>{c.char}</span
					>{/each}
			</p>
		</section>
	{/if}
</div>
