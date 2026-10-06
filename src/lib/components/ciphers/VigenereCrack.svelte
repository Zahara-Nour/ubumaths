<!--
	Décryptage de Vigenère en trois temps : Kasiski (les répétitions trahissent
	la longueur de la clé), l'indice de coïncidence (qui la confirme), puis un
	César par colonne. La longueur proposée reste modifiable à la main.
-->
<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		FRENCH_IC,
		MAX_KEY_LENGTH,
		RANDOM_IC,
		averageIndexOfCoincidence,
		crackVigenere,
		kasiski,
		suggestKeyLength
	} from '$lib/ciphers/vigenere';
	import { lettersOnly } from '$lib/ciphers/alphabet';

	// Constantes
	const SHOWN_REPEATS = 12;
	const LENGTH_ITEMS = Array.from({ length: MAX_KEY_LENGTH }, (_, i) => ({
		value: String(i + 1),
		label: String(i + 1)
	}));

	// Props
	let { text }: { text: string } = $props();

	// State — pré-rempli une fois : le parent remonte le composant quand le message change
	// svelte-ignore state_referenced_locally
	const suggested = suggestKeyLength(text);
	let lengthValue = $state(String(suggested));

	const letterCount = $derived(lettersOnly(text).length);
	const repeats = $derived(kasiski(text));
	const icRows = $derived(
		Array.from({ length: MAX_KEY_LENGTH }, (_, i) => ({
			length: i + 1,
			ic: averageIndexOfCoincidence(text, i + 1)
		}))
	);
	const cracked = $derived(crackVigenere(text, Number(lengthValue)));

	// Functions
	function formatIc(value: number): string {
		return value.toLocaleString('fr-FR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
	}
</script>

{#if letterCount < 2}
	<p class="text-muted-foreground">Aucune lettre à décrypter.</p>
{:else}
	<div class="flex flex-col gap-8">
		<section class="flex flex-col gap-3" aria-labelledby="kasiski-title">
			<h3 id="kasiski-title" class="font-semibold">1. Kasiski : ce qui se répète</h3>
			<p class="text-sm text-muted-foreground">
				Quand un même morceau de texte tombe sur le même morceau de clé, il est chiffré pareil. Les
				écarts entre deux répétitions sont donc souvent des multiples de la longueur de la clé.
			</p>
			{#if repeats.repeats.length === 0}
				<p class="text-sm">
					Aucune séquence de trois lettres ne se répète : le message est trop court pour Kasiski.
				</p>
			{:else}
				<div class="overflow-x-auto">
					<table class="text-sm" data-testid="kasiski-repeats">
						<thead>
							<tr class="text-left text-muted-foreground">
								<th class="pr-4 font-normal">Séquence</th>
								<th class="pr-4 font-normal">Positions</th>
								<th class="font-normal">Écarts</th>
							</tr>
						</thead>
						<tbody>
							{#each repeats.repeats.slice(0, SHOWN_REPEATS) as repeat (repeat.sequence)}
								<tr>
									<td class="pr-4 font-mono font-bold">{repeat.sequence}</td>
									<td class="pr-4 tabular-nums">{repeat.positions.join(', ')}</td>
									<td class="tabular-nums">{repeat.distances.join(', ')}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				{#if repeats.repeats.length > SHOWN_REPEATS}
					<p class="text-sm text-muted-foreground">
						… et {repeats.repeats.length - SHOWN_REPEATS} autres séquences répétées.
					</p>
				{/if}
				<p class="text-sm">
					PGCD de tous les écarts : <strong>{repeats.gcd}</strong>.
					{#if repeats.gcd === 1}
						Des répétitions dues au hasard le font tomber à 1 : regardez plutôt quelles longueurs
						divisent le plus d’écarts.
					{/if}
				</p>
				<ol class="flex flex-col gap-1 text-sm" data-testid="kasiski-divisors">
					{#each repeats.divisorCounts as { length, count } (length)}
						<li class="grid grid-cols-[6rem_1fr_4rem] items-center gap-2">
							<span>divisible par {length}</span>
							<span
								class="h-2 rounded-sm bg-primary"
								style:width={`${(count / repeats.distanceCount) * 100}%`}
							></span>
							<span class="text-right tabular-nums">{count} / {repeats.distanceCount}</span>
						</li>
					{/each}
				</ol>
			{/if}
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="ic-title">
			<h3 id="ic-title" class="font-semibold">2. L’indice de coïncidence</h3>
			<p class="text-sm text-muted-foreground">
				C’est la probabilité que deux lettres prises au hasard soient identiques : environ
				{formatIc(FRENCH_IC)} en français, {formatIc(RANDOM_IC)} pour des lettres tirées au hasard. On
				découpe le message en colonnes selon la longueur supposée : à la bonne longueur, chaque colonne
				est un simple César et retrouve l’indice du français.
			</p>
			<ol class="flex flex-col gap-1 text-sm" data-testid="ic-rows">
				{#each icRows as row (row.length)}
					<li
						class={[
							'grid grid-cols-[6rem_1fr_4rem] items-center gap-2',
							row.length === suggested && 'font-semibold'
						]}
					>
						<span>longueur {row.length}</span>
						<span
							class={[
								'h-2 rounded-sm',
								row.length === suggested ? 'bg-primary' : 'bg-muted-foreground/40'
							]}
							style:width={`${Math.min(row.ic / FRENCH_IC, 1) * 100}%`}
						></span>
						<span class="text-right tabular-nums">{formatIc(row.ic)}</span>
					</li>
				{/each}
			</ol>
			<p class="text-sm">
				Longueur la plus probable : <strong data-testid="suggested-length">{suggested}</strong> (la plus
				petite qui approche le français ; ses multiples marchent aussi).
			</p>
		</section>

		<section class="flex flex-col gap-3" aria-labelledby="columns-title">
			<h3 id="columns-title" class="font-semibold">3. Un César par colonne</h3>
			<div class="flex items-center gap-3">
				<span class="text-sm font-medium">Longueur de clé</span>
				<MySelect
					type="single"
					bind:value={lengthValue}
					items={LENGTH_ITEMS}
					triggerAriaLabel={`Longueur de clé : ${lengthValue}`}
					fitContent
				/>
			</div>
			<p class="text-sm text-muted-foreground">
				Chaque colonne est cassée comme un César, par les fréquences : son décalage donne une lettre
				de la clé.
			</p>
			<ol class="flex flex-wrap gap-2 font-mono text-sm">
				{#each cracked.columns as column (column.index)}
					<li class="flex flex-col items-center rounded-md border px-2 py-1">
						<span class="text-xs text-muted-foreground">col. {column.index + 1}</span>
						<span class="text-lg font-bold text-primary">{column.letter}</span>
						<span class="text-xs tabular-nums">+{column.shift}</span>
					</li>
				{/each}
			</ol>
			<p>
				Clé proposée : <strong class="font-mono" data-testid="cracked-key">{cracked.key}</strong>
			</p>
			<p
				class="rounded-lg border bg-muted/40 px-3 py-2 font-mono break-words whitespace-pre-wrap"
				data-testid="cracked-text"
			>
				{cracked.text}
			</p>
		</section>
	</div>
{/if}
