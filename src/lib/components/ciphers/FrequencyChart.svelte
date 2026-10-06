<!--
	Fréquences des lettres du message, face à celles du français. César et la
	substitution déplacent les barres sans changer leurs hauteurs : c'est par
	là qu'on les casse.
-->
<script lang="ts">
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { FRENCH_FREQUENCIES, formatPercent, letterFrequencies } from '$lib/ciphers/frequency';

	// Props
	let { text }: { text: string } = $props();

	// State
	let sorted = $state(true);

	const frequencies = $derived(letterFrequencies(text));
	const rows = $derived(
		sorted ? [...frequencies.letters].sort((a, b) => b.count - a.count) : frequencies.letters
	);
	const scale = $derived(
		Math.max(FRENCH_FREQUENCIES.E, ...frequencies.letters.map((l) => l.percent))
	);
	// Clin d'œil : Bosse-de-Nage ne dit que « ha ha »
	const onlyHaHa = $derived(
		frequencies.total >= 4 &&
			frequencies.letters.every((l) => l.count === 0 || l.letter === 'H' || l.letter === 'A')
	);
</script>

<section class="flex flex-col gap-3" aria-labelledby="frequency-title">
	<div class="flex flex-wrap items-baseline justify-between gap-2">
		<h3 id="frequency-title" class="font-semibold">Fréquences des lettres</h3>
		<MyCheckbox bind:checked={sorted} label="Trier de la plus fréquente à la moins fréquente" />
	</div>
	{#if frequencies.total === 0}
		<p class="text-muted-foreground">Aucune lettre à compter.</p>
	{:else}
		<p class="text-sm text-muted-foreground">
			{frequencies.total} lettre{frequencies.total > 1 ? 's' : ''} comptée{frequencies.total > 1
				? 's'
				: ''}.
			<span class="inline-block h-2 w-4 rounded-sm bg-primary align-middle"></span> le message ·
			<span class="inline-block h-2 w-4 rounded-sm bg-muted-foreground/40 align-middle"></span> le français
		</p>
		{#if onlyHaHa}
			<p class="text-sm italic" data-testid="bosse-de-nage">
				Ha ha. Bosse-de-Nage, gouverneur du Glitchistan, vous salue : il n'a que deux lettres.
			</p>
		{/if}
		<ol class="grid gap-1 sm:grid-cols-2 sm:gap-x-8" data-testid="frequency-rows">
			{#each rows as row (row.letter)}
				<li
					class="grid grid-cols-[1.25rem_1fr_3.5rem] items-center gap-2"
					aria-label={`${row.letter} : ${formatPercent(row.percent)} du message, ${formatPercent(FRENCH_FREQUENCIES[row.letter])} en français`}
				>
					<span class="font-mono font-bold">{row.letter}</span>
					<span class="flex flex-col gap-0.5" aria-hidden="true">
						<span
							class="h-2.5 rounded-sm bg-primary"
							style:width={`${(row.percent / scale) * 100}%`}
						></span>
						<span
							class="h-1.5 rounded-sm bg-muted-foreground/40"
							style:width={`${(FRENCH_FREQUENCIES[row.letter] / scale) * 100}%`}
						></span>
					</span>
					<span class="text-right text-sm tabular-nums" aria-hidden="true"
						>{formatPercent(row.percent)}</span
					>
				</li>
			{/each}
		</ol>
	{/if}
</section>
