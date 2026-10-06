<script lang="ts">
	import MySelect from '$lib/components/MySelect.svelte';
	import CipherWorkbench from '$lib/components/ciphers/CipherWorkbench.svelte';
	import { attempt } from '$lib/ciphers/outcome';
	import { scytaleCandidates, scytaleDecrypt, scytaleEncrypt } from '$lib/ciphers/scytale';
	import SeoHead from '$lib/seo/SeoHead.svelte';

	// Constantes
	const PLAIN = 'Attaque à l’aube par le flanc gauche';
	const TURN_ITEMS = Array.from({ length: 11 }, (_, i) => ({
		value: String(i + 2),
		label: String(i + 2)
	}));

	// State
	let turnsValue = $state('4');
	const turns = $derived(Number(turnsValue));
</script>

<SeoHead
	title="La scytale spartiate : chiffre par transposition — Chiphre"
	description="La scytale pas à pas : enrouler une bande sur un bâton, écrire le message, dérouler. Un chiffre par transposition, et comment le décrypter en essayant tous les bâtons."
/>

<header class="flex flex-col gap-3">
	<h1 class="text-3xl font-bold">La scytale</h1>
	<p>
		Plutarque raconte que les Spartiates enroulaient une bande de cuir autour d’un bâton, la
		<em>scytale</em>, puis écrivaient leur message le long du bâton. Déroulée, la bande ne montre
		qu’une suite de lettres sans queue ni tête. Seul un bâton de même diamètre la remet en ordre.
	</p>
	<p>
		Ici, la clé est le nombre de lettres qui tiennent sur un tour de bâton. Les lettres ne sont pas
		remplacées : seul leur <strong>ordre</strong> change. C’est un chiffre par
		<strong>transposition</strong>.
	</p>
</header>

<CipherWorkbench
	encrypt={(text) => attempt(() => ({ text: scytaleEncrypt(text, turns).text, steps: [] }))}
	decrypt={(text) => attempt(() => ({ text: scytaleDecrypt(text, turns).text, steps: [] }))}
	initialPlain={PLAIN}
	initialCipher={scytaleEncrypt(PLAIN, 4).text}
	initialCrack={scytaleEncrypt(PLAIN, 5).text}
>
	{#snippet keyControls()}
		<div class="flex items-center gap-3">
			<span class="text-sm font-medium">Lettres par tour</span>
			<MySelect
				type="single"
				bind:value={turnsValue}
				items={TURN_ITEMS}
				triggerAriaLabel={`Lettres par tour : ${turnsValue}`}
				fitContent
			/>
		</div>
	{/snippet}
	{#snippet extra({ mode, text })}
		{@const result = mode === 'encrypt' ? scytaleEncrypt(text, turns) : scytaleDecrypt(text, turns)}
		{#if result.unchanged}
			<p class="text-sm text-destructive" role="alert">
				Le bâton a autant de faces que le message a de lettres : rien ne bouge. Choisissez moins de
				lettres par tour.
			</p>
		{:else if result.rows.length > 0}
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium"
					>Le message écrit le long du bâton, une ligne par face</span
				>
				<ol class="flex flex-col gap-1 overflow-x-auto font-mono" data-testid="scytale-rows">
					{#each result.rows as row, i (i)}
						<li class="flex gap-1">
							{#each row as letter, j (j)}
								<span
									class="flex size-7 shrink-0 items-center justify-center rounded border bg-card"
									>{letter}</span
								>
							{/each}
						</li>
					{/each}
				</ol>
				<span class="text-sm text-muted-foreground">
					La bande déroulée se lit colonne par colonne : une lettre de chaque ligne à chaque tour.
				</span>
			</div>
		{/if}
	{/snippet}
	{#snippet crack(text)}
		<p class="text-sm">
			Une transposition garde toutes les lettres : leurs fréquences sont celles du français, ce qui
			trahit tout de suite la méthode. Il ne reste qu’à essayer les bâtons un par un.
		</p>
		{@const candidates = scytaleCandidates(text)}
		{#if candidates.length === 0}
			<p class="text-muted-foreground">Il faut au moins trois lettres.</p>
		{:else}
			<ol class="flex flex-col gap-1" data-testid="scytale-candidates">
				{#each candidates as candidate (candidate.lettersPerTurn)}
					<li class="grid grid-cols-[8rem_1fr] gap-2 rounded-md px-2 py-1 text-sm odd:bg-muted/40">
						<span class="tabular-nums">{candidate.lettersPerTurn} par tour</span>
						<span class="font-mono break-all">{candidate.text}</span>
					</li>
				{/each}
			</ol>
		{/if}
	{/snippet}
</CipherWorkbench>
