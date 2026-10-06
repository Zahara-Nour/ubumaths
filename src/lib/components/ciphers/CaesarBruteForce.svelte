<!--
	Force brute contre César : il n'y a que 26 clés, on les essaie toutes et on
	classe les résultats par ressemblance avec le français.
-->
<script lang="ts">
	import { lettersOnly } from '$lib/ciphers/alphabet';
	import { caesarBruteForce } from '$lib/ciphers/frequency';

	// Constantes
	/** En dessous, le classement par fréquences devient peu fiable */
	const RELIABLE_LENGTH = 40;
	const PREVIEW_LENGTH = 120;

	// Props
	let { text }: { text: string } = $props();

	const candidates = $derived(caesarBruteForce(text));
	const shortText = $derived(lettersOnly(text).length < RELIABLE_LENGTH);
</script>

<section class="flex flex-col gap-3" aria-labelledby="brute-force-title">
	<h3 id="brute-force-title" class="font-semibold">Essayer les 26 décalages</h3>
	{#if candidates.length === 0}
		<p class="text-muted-foreground">Aucune lettre à décrypter.</p>
	{:else}
		<p class="text-sm text-muted-foreground">
			Classés du plus au moins « français », d'après les fréquences des lettres.
			{#if shortText}
				<strong>Message court :</strong> le classement peut se tromper. Plus le message est long, plus
				la Mère Ubu a raison.
			{/if}
		</p>
		<ol class="flex flex-col gap-1" data-testid="brute-force">
			{#each candidates as candidate, i (candidate.shift)}
				<li
					class={[
						'grid grid-cols-[7rem_1fr] gap-2 rounded-md px-2 py-1 text-sm',
						i === 0 ? 'bg-primary/10 font-semibold' : 'odd:bg-muted/40'
					]}
				>
					<span class="tabular-nums">
						Décalage {candidate.shift}
						{#if i === 0}<span class="sr-only"> (le plus français)</span>{/if}
					</span>
					<span class="font-mono break-all">
						{candidate.text.length > PREVIEW_LENGTH
							? `${candidate.text.slice(0, PREVIEW_LENGTH)}…`
							: candidate.text}
					</span>
				</li>
			{/each}
		</ol>
	{/if}
</section>
