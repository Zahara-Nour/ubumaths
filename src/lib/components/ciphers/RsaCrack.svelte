<!--
	Décrypter RSA sans la clé privée : factoriser n par divisions successives,
	recalculer φ(n) puis d. Et la démonstration que RSA lettre par lettre
	n'est qu'une substitution.
-->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { CipherInputError } from '$lib/ciphers/errors';
	import { rsaCrack, rsaLetterTable } from '$lib/ciphers/rsa';

	// Constantes
	/** Au-delà, la factorisation par divisions successives n'est plus « de poche » */
	const MAX_N = 1_000_000;

	// Props
	let { text, initialN, initialE }: { text: string; initialN: number; initialE: number } = $props();

	// State — valeurs initiales seulement : le visiteur les change ensuite
	// svelte-ignore state_referenced_locally
	let n = $state<number | null>(initialN);
	// svelte-ignore state_referenced_locally
	let e = $state<number | null>(initialE);

	const crack = $derived(solve(text, n, e));
	// Seulement pour une clé valide : avec e = 0 ou e < 0, la table ne montrerait rien de RSA
	const letterTable = $derived(
		crack.ok && n !== null && e !== null ? rsaLetterTable({ n, e }) : []
	);

	// Functions
	function solve(code: string, modulus: number | null, exponent: number | null) {
		if (
			modulus === null ||
			exponent === null ||
			!Number.isInteger(modulus) ||
			!Number.isInteger(exponent)
		) {
			return { ok: false as const, message: 'Entrez n et e, deux nombres entiers.' };
		}
		if (modulus > MAX_N) {
			return {
				ok: false as const,
				message: `Pour rester « de poche », n ne dépasse pas ${MAX_N.toLocaleString('fr-FR')}.`
			};
		}
		try {
			return { ok: true as const, ...rsaCrack(code, modulus, exponent) };
		} catch (error) {
			if (error instanceof CipherInputError) return { ok: false as const, message: error.message };
			throw error;
		}
	}
</script>

<div class="flex flex-col gap-8">
	<section class="flex flex-col gap-3" aria-labelledby="rsa-crack-title">
		<h3 id="rsa-crack-title" class="font-semibold">Factoriser n</h3>
		<p class="text-sm text-muted-foreground">
			La clé publique (n, e) est connue de tous. Qui sait écrire n = p × q peut recalculer φ(n),
			puis d : toute la sécurité de RSA repose sur la difficulté de factoriser n.
		</p>
		<div class="flex flex-wrap gap-4">
			<div class="flex flex-col gap-1">
				<Label for="rsa-crack-n">n (clé publique)</Label>
				<Input id="rsa-crack-n" type="number" min={4} max={MAX_N} bind:value={n} class="w-36" />
			</div>
			<div class="flex flex-col gap-1">
				<Label for="rsa-crack-e">e (clé publique)</Label>
				<Input id="rsa-crack-e" type="number" min={3} bind:value={e} class="w-28" />
			</div>
		</div>
		{#if crack.ok}
			<ol class="flex flex-col gap-1 font-mono text-sm" data-testid="rsa-crack-steps">
				{#each crack.steps as step, i (i)}
					<li>{step}</li>
				{/each}
			</ol>
			<p
				class="rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
				data-testid="rsa-crack-text"
			>
				{crack.text}
			</p>
			<p class="text-sm text-muted-foreground">
				Ici, quelques divisions suffisent. Les vraies clés RSA ont un n de plus de 600 chiffres :
				aucun ordinateur ne sait aujourd’hui le factoriser en un temps raisonnable.
			</p>
		{:else}
			<p class="text-sm text-destructive" role="status">{crack.message}</p>
		{/if}
	</section>

	{#if letterTable.length > 0}
		<section class="flex flex-col gap-3" aria-labelledby="rsa-letters-title">
			<h3 id="rsa-letters-title" class="font-semibold">Et si l’on chiffrait lettre par lettre ?</h3>
			<p class="text-sm text-muted-foreground">
				Avec la même clé publique, chaque lettre aurait toujours la même image : RSA deviendrait une
				simple substitution, que l’analyse de fréquences casse en quelques minutes. A et B ne
				bougeraient même pas, car 0 et 1 restent eux-mêmes à toute puissance. D’où les blocs de deux
				lettres.
			</p>
			<ul
				class="grid grid-cols-3 gap-1 font-mono text-sm sm:grid-cols-6"
				data-testid="rsa-letter-table"
			>
				{#each letterTable as row (row.letter)}
					<li class="rounded border px-2 py-1">{row.letter} → {row.c}</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>
