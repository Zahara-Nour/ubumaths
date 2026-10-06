<!--
	Décryptage du chiffre affine : l'attaque par deux lettres (un système de
	congruences, résolu pas à pas), puis la force brute sur les 312 clés.
	Les hypothèses sont pré-remplies avec les deux lettres les plus fréquentes.
-->
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import { ALPHABET } from '$lib/ciphers/alphabet';
	import { affineBruteForce, affineDecrypt, twoLetterAttack } from '$lib/ciphers/affine';
	import { letterFrequencies } from '$lib/ciphers/frequency';
	import { attempt } from '$lib/ciphers/outcome';
	import { CipherInputError } from '$lib/ciphers/errors';
	import CipherOutput from './CipherOutput.svelte';
	import FrequencyChart from './FrequencyChart.svelte';

	// Constantes
	const LETTER_ITEMS = [...ALPHABET].map((letter) => ({ value: letter, label: letter }));
	const SHOWN_CANDIDATES = 10;
	const PREVIEW_LENGTH = 90;

	// Props
	let { text }: { text: string } = $props();

	// State — pré-rempli une fois : le parent remonte le composant quand le message change
	// svelte-ignore state_referenced_locally
	const ranked = letterFrequencies(text)
		.letters.filter((l) => l.count > 0)
		.sort((a, b) => b.count - a.count);
	let cipher1 = $state(ranked[0]?.letter ?? 'A');
	let plain1 = $state('E');
	let cipher2 = $state(ranked[1]?.letter ?? 'B');
	let plain2 = $state('A');

	const attack = $derived(solve(cipher1, plain1, cipher2, plain2));
	const candidates = $derived(affineBruteForce(text).slice(0, SHOWN_CANDIDATES));

	// Functions
	function solve(c1: string, p1: string, c2: string, p2: string) {
		try {
			return {
				ok: true as const,
				...twoLetterAttack({ cipher: c1, plain: p1 }, { cipher: c2, plain: p2 })
			};
		} catch (e) {
			if (e instanceof CipherInputError) return { ok: false as const, message: e.message };
			throw e;
		}
	}
</script>

<div class="flex flex-col gap-8">
	<FrequencyChart {text} />

	<section class="flex flex-col gap-3" aria-labelledby="affine-attack-title">
		<h3 id="affine-attack-title" class="font-semibold">Attaque par deux lettres</h3>
		<p class="text-sm text-muted-foreground">
			Deux hypothèses suffisent : chacune donne une équation, et deux équations donnent a et b.
		</p>
		<div class="flex flex-wrap items-center gap-x-6 gap-y-3">
			<span class="flex items-center gap-2">
				<MySelect
					type="single"
					bind:value={cipher1}
					items={LETTER_ITEMS}
					triggerAriaLabel={`Première lettre chiffrée : ${cipher1}`}
					fitContent
				/>
				cache
				<MySelect
					type="single"
					bind:value={plain1}
					items={LETTER_ITEMS}
					triggerAriaLabel={`Première lettre claire : ${plain1}`}
					fitContent
				/>
			</span>
			<span class="flex items-center gap-2">
				<MySelect
					type="single"
					bind:value={cipher2}
					items={LETTER_ITEMS}
					triggerAriaLabel={`Seconde lettre chiffrée : ${cipher2}`}
					fitContent
				/>
				cache
				<MySelect
					type="single"
					bind:value={plain2}
					items={LETTER_ITEMS}
					triggerAriaLabel={`Seconde lettre claire : ${plain2}`}
					fitContent
				/>
			</span>
		</div>
		{#if attack.ok}
			<ol class="flex flex-col gap-1 font-mono text-sm" data-testid="affine-attack-steps">
				{#each attack.steps as step, i (i)}
					<li>{step}</li>
				{/each}
			</ol>
			{#if attack.solutions.length === 0}
				<p class="text-sm" data-testid="affine-attack-hint">
					Gardez la première hypothèse et changez la seconde lettre claire : après E, les lettres
					les plus fréquentes du français sont A, S, I, N, T et R.
				</p>
			{:else if attack.solutions.length === 1}
				{@const { a, b } = attack.solutions[0]}
				<CipherOutput
					outcome={attempt(() => affineDecrypt(text, a, b))}
					label={`Message déchiffré avec a = ${a}, b = ${b}`}
					testid="affine-attack-result"
				/>
			{/if}
		{:else}
			<p class="text-sm text-destructive" role="status">{attack.message}</p>
		{/if}
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="affine-brute-title">
		<h3 id="affine-brute-title" class="font-semibold">Force brute : les 312 clés</h3>
		{#if candidates.length === 0}
			<p class="text-muted-foreground">Aucune lettre à décrypter.</p>
		{:else}
			<p class="text-sm text-muted-foreground">
				12 valeurs de a × 26 valeurs de b. Les {SHOWN_CANDIDATES} plus « françaises » :
			</p>
			<ol class="flex flex-col gap-1" data-testid="affine-brute-force">
				{#each candidates as candidate, i (`${candidate.a}-${candidate.b}`)}
					<li
						class={[
							'grid grid-cols-[8rem_1fr] gap-2 rounded-md px-2 py-1 text-sm',
							i === 0 ? 'bg-primary/10 font-semibold' : 'odd:bg-muted/40'
						]}
					>
						<span class="tabular-nums">a = {candidate.a}, b = {candidate.b}</span>
						<span class="font-mono break-words">
							{candidate.text.length > PREVIEW_LENGTH
								? `${candidate.text.slice(0, PREVIEW_LENGTH)}…`
								: candidate.text}
						</span>
					</li>
				{/each}
			</ol>
		{/if}
	</section>
</div>
