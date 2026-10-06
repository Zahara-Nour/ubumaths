<!--
	Décryptage de Hill : l'attaque à clair connu (M = C·P⁻¹, pas à pas), puis
	l'attaque ligne par ligne, qui casse chaque ligne de M⁻¹ séparément.
-->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { lettersOnly } from '$lib/ciphers/alphabet';
	import { CipherInputError } from '$lib/ciphers/errors';
	import {
		formatMatrix,
		hillDecrypt,
		hillRowAttack,
		knownPlaintextAttack
	} from '$lib/ciphers/hill';
	import { attempt } from '$lib/ciphers/outcome';
	import CipherOutput from './CipherOutput.svelte';

	// Props
	let { text, knownStart = '' }: { text: string; knownStart?: string } = $props();

	// State — valeur initiale seulement : le visiteur la change ensuite
	// svelte-ignore state_referenced_locally
	let known = $state(knownStart);

	const cipherStart = $derived(lettersOnly(text).slice(0, 4));
	const attack = $derived(solve(cipherStart, known));
	const rows = $derived(hillRowAttack(text));

	// Functions
	function solve(cipher: string, plain: string) {
		try {
			return { ok: true as const, ...knownPlaintextAttack(cipher, plain) };
		} catch (e) {
			if (e instanceof CipherInputError) return { ok: false as const, message: e.message };
			throw e;
		}
	}
</script>

<div class="flex flex-col gap-8">
	<section class="flex flex-col gap-3" aria-labelledby="hill-known-title">
		<h3 id="hill-known-title" class="font-semibold">Attaque à clair connu</h3>
		<p class="text-sm text-muted-foreground">
			Si l’on devine les 4 premières lettres du message clair, on connaît deux paires et leurs
			images : C = M·P, donc M = C·P⁻¹.
		</p>
		<div class="flex flex-wrap items-end gap-4">
			<div class="flex flex-col gap-1">
				<Label for="hill-known">Début supposé du texte en clair (4 lettres)</Label>
				<Input id="hill-known" bind:value={known} class="w-40 font-mono uppercase" />
			</div>
			<p class="text-sm">
				Début du message chiffré : <strong class="font-mono">{cipherStart}</strong>
			</p>
		</div>
		{#if attack.ok}
			<ol class="flex flex-col gap-1 font-mono text-sm" data-testid="hill-known-steps">
				{#each attack.steps as step, i (i)}
					<li>{step}</li>
				{/each}
			</ol>
			{#if attack.key}
				{@const key = attack.key}
				<CipherOutput
					outcome={attempt(() => hillDecrypt(text, key))}
					label={`Message déchiffré avec M = ${formatMatrix(key)}`}
					testid="hill-known-result"
				/>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground" role="status">{attack.message}</p>
		{/if}
	</section>

	<section class="flex flex-col gap-3" aria-labelledby="hill-rows-title">
		<h3 id="hill-rows-title" class="font-semibold">Attaque ligne par ligne</h3>
		<p class="text-sm text-muted-foreground">
			Chaque ligne (u, v) de M⁻¹ donne à elle seule une lettre claire sur deux : u × c₁ + v × c₂. On
			essaie les 676 lignes possibles et on garde celles qui donnent les lettres les plus «
			françaises ». Ce seul classement de 676 essais sert pour les deux lignes, au lieu de 26⁴ = 456
			976 matrices : c’est le point faible de Hill.
		</p>
		{#if rows === null}
			<p class="text-muted-foreground">Il faut au moins deux paires de lettres.</p>
		{:else}
			<ol class="flex flex-col gap-1 text-sm" data-testid="hill-row-candidates">
				{#each rows.candidates as candidate, i (`${candidate.u}-${candidate.v}`)}
					<li
						class={[
							'grid grid-cols-[8rem_1fr] gap-2 rounded-md px-2 py-1',
							i < 2 ? 'bg-primary/10 font-semibold' : 'odd:bg-muted/40'
						]}
					>
						<span class="font-mono">({candidate.u}, {candidate.v})</span>
						<span class="tabular-nums">écart au français : {Math.round(candidate.score)}</span>
					</li>
				{/each}
			</ol>
			<p class="text-sm">
				Les deux meilleures lignes forment M⁻¹ = <strong class="font-mono"
					>{formatMatrix(rows.inverse)}</strong
				>
				; leur ordre se décide par les paires de lettres fréquentes du français (ES, LE, DE…). Donc M
				=
				<strong class="font-mono" data-testid="hill-row-key">{formatMatrix(rows.key)}</strong>.
			</p>
			<p
				class="rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
				data-testid="hill-row-text"
			>
				{rows.text}
			</p>
		{/if}
	</section>
</div>
